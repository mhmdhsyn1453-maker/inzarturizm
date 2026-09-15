import React, { createContext, useContext, useState, useEffect } from 'react';
import { DEFAULT_USERS } from '../data/defaultTariffData';
import { syncService } from '../services/syncService';
import { notificationService } from '../services/notificationService';
import { supabase, isSupabaseConfigured } from '../services/supabaseClient';
import { verifyTOTPToken } from '../utils/totp';

const AuthContext = createContext();

// XSS Sanitizer
function sanitizeInput(str) {
  if (typeof str !== 'string') return '';
  return str.replace(/[<>'"&]/g, (char) => {
    switch (char) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case "'": return '&#39;';
      case '"': return '&quot;';
      case '&': return '&amp;';
      default: return char;
    }
  }).trim();
}

export async function hashPassword(plainText, saltHex = null) {
  if (!plainText) return '';
  try {
    const encoder = new TextEncoder();
    const passwordBuffer = encoder.encode(String(plainText).trim());
    
    let salt;
    if (saltHex) {
      const match = saltHex.match(/.{1,2}/g) || [];
      salt = new Uint8Array(match.map(byte => parseInt(byte, 16)));
    } else {
      salt = new Uint8Array(16);
      window.crypto.getRandomValues(salt);
    }
    const currentSaltHex = Array.from(salt, b => b.toString(16).padStart(2, '0')).join('');

    const keyMaterial = await window.crypto.subtle.importKey(
      'raw',
      passwordBuffer,
      { name: 'PBKDF2' },
      false,
      ['deriveBits']
    );

    const derivedBits = await window.crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      256
    );

    const hashHex = Array.from(new Uint8Array(derivedBits), b => b.toString(16).padStart(2, '0')).join('');
    return `pbkdf2:100000:${currentSaltHex}:${hashHex}`;
  } catch (e) {
    const encoder = new TextEncoder();
    const data = encoder.encode(String(plainText).trim());
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
    return 'sha256:' + Array.from(new Uint8Array(hashBuffer), b => b.toString(16).padStart(2, '0')).join('');
  }
}

export async function verifyPassword(inputPassword, storedPasswordOrHash) {
  if (!storedPasswordOrHash || !inputPassword) return false;
  const trimmedInput = String(inputPassword).trim();
  const trimmedStored = String(storedPasswordOrHash).trim();

  // 1. PBKDF2 Hash Format: pbkdf2:100000:saltHex:hashHex
  if (trimmedStored.startsWith('pbkdf2:')) {
    const parts = trimmedStored.split(':');
    if (parts.length === 4) {
      const saltHex = parts[2];
      const computed = await hashPassword(trimmedInput, saltHex);
      return computed === trimmedStored;
    }
  }

  // 2. Legacy SHA-256 Hash Format: sha256:hashHex
  if (trimmedStored.startsWith('sha256:')) {
    const encoder = new TextEncoder();
    const data = encoder.encode(trimmedInput);
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
    const computedSha = 'sha256:' + Array.from(new Uint8Array(hashBuffer), b => b.toString(16).padStart(2, '0')).join('');
    return computedSha === trimmedStored;
  }

  // 3. Legacy Plaintext fallback
  return trimmedStored === trimmedInput;
}

export function generateSecureSessionToken() {
  try {
    const array = new Uint8Array(24);
    window.crypto.getRandomValues(array);
    return 'tkn_' + Array.from(array, b => b.toString(16).padStart(2, '0')).join('') + Date.now().toString(36);
  } catch (e) {
    return 'tkn_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
  }
}

export function AuthProvider({ children }) {
  const [users, setUsers] = useState(() => syncService.getUsers());
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('inzar_auth_user');
      if (saved) {
        const parsed = JSON.parse(saved);
        // Security: strip sensitive fields if present from legacy sessions
        delete parsed.password;
        delete parsed.twoFactorSecret;
        delete parsed.twoFactorBackupCodes;
        return parsed;
      }
    } catch (e) {}
    return null;
  });

  // Listen to remote Supabase sync updates
  useEffect(() => {
    const unsubscribe = syncService.subscribe((event) => {
      if (event.type === 'USERS_UPDATED' || event.type === 'STORAGE_CHANGE') {
        const freshUsers = syncService.getUsers();
        setUsers(freshUsers);
        if (currentUser?.id || currentUser?.username) {
          const freshMe = freshUsers.find(u => (currentUser.id && u.id === currentUser.id) || (currentUser.username && u.username === currentUser.username));
          if (freshMe) {
            setCurrentUser(prev => {
              const merged = { ...prev, ...freshMe };
              delete merged.password;
              delete merged.twoFactorSecret;
              delete merged.twoFactorBackupCodes;
              return merged;
            });
          }
        }
      }
    });
    return () => unsubscribe();
  }, [currentUser?.id, currentUser?.username]);

  useEffect(() => {
    notificationService.setCurrentUser(currentUser);
    if (currentUser) {
      const safeSession = { ...currentUser };
      delete safeSession.password;
      delete safeSession.twoFactorSecret;
      delete safeSession.twoFactorBackupCodes;
      localStorage.setItem('inzar_auth_user', JSON.stringify(safeSession));
    } else {
      localStorage.removeItem('inzar_auth_user');
    }
  }, [currentUser]);

  const login = async (inputIdentifier, password, commit = true, skip2FACheck = false, totpCode = null) => {
    const trimmedInput = inputIdentifier.trim().toLowerCase();
    const trimmedPass = password.trim();

    let user = null;

    // 1. Primary: Server-Side Authentication via Supabase Edge Function (auth-service)
    if (isSupabaseConfigured && supabase) {
      try {
        const { data: edgeRes, error: edgeErr } = await supabase.functions.invoke('auth-service', {
          body: {
            action: 'login',
            username: trimmedInput,
            password: trimmedPass,
            totpCode: totpCode || null
          }
        });

        if (!edgeErr && edgeRes) {
          if (edgeRes.requires2FA) {
            return {
              success: true,
              requires2FA: true,
              tempUser: edgeRes.tempUser
            };
          }
          if (edgeRes.success && edgeRes.user) {
            user = edgeRes.user;
          } else if (edgeRes.message) {
            return { success: false, message: edgeRes.message };
          }
        }
      } catch (edgeError) {
        console.warn('Edge Function auth-service error, falling back to cached auth:', edgeError);
      }
    }

    // 2. Secondary Fallback: Cached memory / local users (offline mode)
    if (!user) {
      for (const u of users) {
        const uMatch = u.username.toLowerCase() === trimmedInput || 
                       (u.email && u.email.toLowerCase() === trimmedInput) ||
                       (u.email && u.email.toLowerCase().startsWith(trimmedInput + '@'));
        if (uMatch && u.password) {
          const isMatch = await verifyPassword(trimmedPass, u.password);
          if (isMatch) {
            user = { ...u };
            break;
          }
        }
      }
    }

    if (!user) {
      return { success: false, message: 'Kullanıcı adı veya şifre hatalı!' };
    }

    if (user.isActive === false) {
      return { success: false, message: 'Bu kullanıcı hesabı merkez tarafından askıya alınmıştır/pasiftir!' };
    }

    // Check if user has Google Authenticator 2FA Enabled (offline fallback check)
    if (!skip2FACheck && user.twoFactorEnabled && user.twoFactorSecret) {
      return { 
        success: true, 
        requires2FA: true, 
        tempUser: user 
      };
    }

    const sessionUser = {
      id: user.id,
      username: user.username,
      name: user.name,
      role: (user.role || 'STAFF').toUpperCase(),
      city: user.city || 'İstanbul',
      branch: user.branch || (user.role?.toUpperCase() === 'ADMIN' ? 'Genel Merkez' : 'Fatih Şubesi'),
      phone: user.phone || '',
      email: user.email || `${user.username}@inzarturizm.com`,
      avatar: user.avatar || '',
      avatarImage: user.avatarImage || null,
      twoFactorEnabled: Boolean(user.twoFactorEnabled),
      lastLogin: new Date().toISOString(),
      sessionToken: generateSecureSessionToken()
    };

    if (commit) {
      setCurrentUser(sessionUser);
      const updatedUsers = users.map(u => u.id === user.id ? { ...u, lastLogin: new Date().toISOString() } : u);
      setUsers(updatedUsers);
      syncService.saveUsers(updatedUsers);

      syncService.addAuditLog({
        action: 'USER_LOGIN',
        user: user.name,
        details: `${user.name} (@${user.username}) sisteme güvenli giriş yaptı.`,
        timestamp: new Date().toISOString()
      });
    }

    return { success: true, user: sessionUser };
  };

  const verify2FAAndLogin = async (tempUser, codeOrBackupCode, commit = true) => {
    if (!tempUser || !codeOrBackupCode) {
      return { success: false, message: 'Doğrulama kodu boş bırakılamaz.' };
    }

    const cleanInput = String(codeOrBackupCode).trim().toUpperCase();

    // 1. Primary: Server-Side 2FA Verification via Supabase Edge Function
    if (isSupabaseConfigured && supabase) {
      try {
        const { data: edgeRes, error: edgeErr } = await supabase.functions.invoke('auth-service', {
          body: {
            action: 'verify-2fa',
            userId: tempUser.id || tempUser.username,
            totpCode: cleanInput
          }
        });

        if (!edgeErr && edgeRes && edgeRes.success && edgeRes.user) {
          const sessionUser = {
            id: edgeRes.user.id,
            username: edgeRes.user.username,
            name: edgeRes.user.name,
            role: (edgeRes.user.role || 'STAFF').toUpperCase(),
            city: edgeRes.user.city || 'İstanbul',
            branch: edgeRes.user.branch || 'Genel Merkez',
            phone: edgeRes.user.phone || '',
            email: edgeRes.user.email || `${edgeRes.user.username}@inzarturizm.com`,
            avatar: edgeRes.user.avatar || '',
            avatarImage: edgeRes.user.avatarImage || null,
            twoFactorEnabled: true,
            lastLogin: new Date().toISOString(),
            sessionToken: generateSecureSessionToken()
          };

          if (commit) {
            setCurrentUser(sessionUser);
            syncService.addAuditLog({
              action: 'USER_LOGIN_2FA',
              user: sessionUser.name,
              details: `${sessionUser.name} (@${sessionUser.username}) 2FA doğrulaması ile sisteme güvenli giriş yaptı.`,
              timestamp: new Date().toISOString()
            });
          }

          return { success: true, user: sessionUser };
        } else if (edgeRes && edgeRes.message) {
          return { success: false, message: edgeRes.message };
        }
      } catch (err) {
        console.warn('Edge Function verify-2fa fallback:', err);
      }
    }

    // 2. Offline fallback: local 2FA verification if secret is available
    let isValid = false;
    if (tempUser.twoFactorSecret) {
      if (/^\d{6}$/.test(cleanInput)) {
        isValid = await verifyTOTPToken(tempUser.twoFactorSecret, cleanInput);
      }
      if (!isValid && Array.isArray(tempUser.twoFactorBackupCodes)) {
        const backupIndex = tempUser.twoFactorBackupCodes.findIndex(
          b => b.toUpperCase().replace(/\s|-/g, '') === cleanInput.replace(/\s|-/g, '')
        );
        if (backupIndex >= 0) {
          isValid = true;
        }
      }
    }

    if (!isValid) {
      return { success: false, message: 'Girdiğiniz 6 haneli kod veya kurtarma kodu hatalı!' };
    }

    const sessionUser = {
      id: tempUser.id,
      username: tempUser.username,
      name: tempUser.name,
      role: (tempUser.role || 'STAFF').toUpperCase(),
      city: tempUser.city || 'İstanbul',
      branch: tempUser.branch || (tempUser.role?.toUpperCase() === 'ADMIN' ? 'Genel Merkez' : 'Fatih Şubesi'),
      phone: tempUser.phone || '',
      email: tempUser.email || `${tempUser.username}@inzarturizm.com`,
      avatar: tempUser.avatar || '',
      avatarImage: tempUser.avatarImage || null,
      twoFactorEnabled: true,
      lastLogin: new Date().toISOString(),
      sessionToken: generateSecureSessionToken()
    };

    if (commit) {
      setCurrentUser(sessionUser);
      const updatedUsers = users.map(u => u.id === tempUser.id ? { ...u, lastLogin: new Date().toISOString() } : u);
      setUsers(updatedUsers);
      syncService.saveUsers(updatedUsers);

      syncService.addAuditLog({
        action: 'USER_LOGIN_2FA',
        user: tempUser.name,
        details: `${tempUser.name} (@${tempUser.username}) Google Authenticator 2FA ile güvenli giriş yaptı${usedBackupCode ? ' (Kurtarma Kodu Kullanıldı)' : ''}.`,
        timestamp: new Date().toISOString()
      });
    }

    return { success: true, user: sessionUser };
  };

  const logout = () => {
    if (currentUser) {
      syncService.addAuditLog({
        action: 'USER_LOGOUT',
        user: currentUser.name,
        details: `${currentUser.name} sistemden güvenle çıkış yaptı.`,
        timestamp: new Date().toISOString()
      });
    }
    setCurrentUser(null);
  };

  const addStaff = async (newStaff) => {
    const roleUpper = (newStaff.role || 'STAFF').toUpperCase();
    const cleanUsername = sanitizeInput(newStaff.username).toLowerCase();
    const email = sanitizeInput(newStaff.email || `${cleanUsername}@inzarturizm.com`).toLowerCase();
    let rawPassword = newStaff.password?.trim();
    if (!rawPassword) {
      const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%*';
      const randBytes = new Uint8Array(8);
      window.crypto.getRandomValues(randBytes);
      let randStr = '';
      for (let i = 0; i < randBytes.length; i++) {
        randStr += chars[randBytes[i] % chars.length];
      }
      rawPassword = `Inzar@${randStr}!`;
    }
    const finalPassword = (rawPassword.startsWith('pbkdf2:') || rawPassword.startsWith('sha256:')) ? rawPassword : await hashPassword(rawPassword);

    const created = {
      id: 'staff_' + Date.now(),
      username: cleanUsername,
      password: finalPassword,
      name: sanitizeInput(newStaff.name),
      role: roleUpper,
      city: sanitizeInput(newStaff.city || 'İstanbul'),
      branch: sanitizeInput(newStaff.branch || (roleUpper === 'ADMIN' ? 'Genel Merkez' : 'Merkez Şube')),
      phone: sanitizeInput(newStaff.phone || ''),
      email: email,
      avatar: newStaff.avatar || '',
      isActive: true,
      createdAt: new Date().toISOString().split('T')[0],
      lastLogin: null
    };
    const updated = [...users, created];
    setUsers(updated);
    syncService.saveUsers(updated);

    syncService.addAuditLog({
      action: roleUpper === 'ADMIN' ? 'ADMIN_CREATED' : 'STAFF_CREATED',
      user: currentUser?.name || 'Genel Merkez',
      details: `${roleUpper === 'ADMIN' ? 'Genel Merkez Yöneticisi' : 'Personel'} hesabı tanımlandı: ${created.name} (${created.email})`,
      timestamp: new Date().toISOString()
    });
    return created;
  };

  const updateStaff = async (staffId, updatedFields) => {
    let fieldsToApply = { ...updatedFields };

    // 1. Şifre değiştiriliyorsa PBKDF2 ile hash'le
    if (fieldsToApply.password && !fieldsToApply.password.startsWith('pbkdf2:')) {
      fieldsToApply.password = await hashPassword(fieldsToApply.password);
    }

    // 2. 2FA sıfırlanıyorsa Edge Function çağır
    if (fieldsToApply.twoFactorSecret === null && fieldsToApply.twoFactorEnabled === false && isSupabaseConfigured && supabase) {
      try {
        await supabase.functions.invoke('auth-service', {
          body: {
            action: 'reset-2fa',
            adminUserId: currentUser?.id || currentUser?.username || 'merkez',
            targetUserId: staffId
          }
        });
      } catch (e) {
        console.warn('[Edge Function reset-2fa error]:', e);
      }
    }

    const target = users.find(u => u.id === staffId);
    const updated = users.map(u => {
      if (u.id === staffId) {
        return {
          ...u,
          ...fieldsToApply,
          username: fieldsToApply.username ? sanitizeInput(fieldsToApply.username).toLowerCase() : u.username,
          email: fieldsToApply.email ? sanitizeInput(fieldsToApply.email).toLowerCase() : u.email,
          name: fieldsToApply.name ? sanitizeInput(fieldsToApply.name) : u.name,
          role: fieldsToApply.role ? fieldsToApply.role.toUpperCase() : u.role
        };
      }
      return u;
    });

    setUsers(updated);
    syncService.saveUsers(updated);

    if (isSupabaseConfigured && supabase) {
      const updatedUser = updated.find(u => u.id === staffId);
      if (updatedUser) {
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(updatedUser.id);
        const profilePayload = {
          username: updatedUser.username,
          name: updatedUser.name,
          role: updatedUser.role,
          city: updatedUser.city,
          branch: updatedUser.branch,
          phone: updatedUser.phone,
          email: updatedUser.email || `${updatedUser.username}@inzarturizm.com`,
          avatar_image: updatedUser.avatarImage,
          is_active: updatedUser.isActive !== false,
          two_factor_enabled: Boolean(updatedUser.twoFactorEnabled),
          read_announcements: Array.isArray(updatedUser.readAnnouncements) ? updatedUser.readAnnouncements : [],
          updated_at: new Date().toISOString()
        };

        // 🛡️ ZORUNLU: Şifre Supabase tablosuna mutlaka kaydedilmeli!
        if (updatedUser.password) {
          profilePayload.password = updatedUser.password;
        }

        if (isUuid) {
          profilePayload.id = updatedUser.id;
        }

        try {
          const { error: upsertErr } = await supabase.from('profiles').upsert(profilePayload, { onConflict: 'username' });
          if (upsertErr) {
            console.warn('[Supabase updateStaff upsert fallback]:', upsertErr);
            if (updatedUser.id) {
              await supabase.from('profiles').update(profilePayload).eq('id', updatedUser.id);
            } else if (updatedUser.username) {
              await supabase.from('profiles').update(profilePayload).eq('username', updatedUser.username);
            }
          }
        } catch (dbErr) {
          console.error('[Supabase updateStaff exception]:', dbErr);
        }
      }
    }

    if (currentUser && currentUser.id === staffId) {
      setCurrentUser(prev => ({
        ...prev,
        ...updatedFields,
        role: updatedFields.role ? updatedFields.role.toUpperCase() : prev.role
      }));
    }

    syncService.addAuditLog({
      action: fieldsToApply.password ? 'PASSWORD_RESET' : 'USER_UPDATED',
      user: currentUser?.name || 'Genel Merkez',
      details: `${target?.name || staffId} kullanıcısının ${fieldsToApply.password ? 'şifresi' : 'bilgileri/yetkileri'} güncellendi.`,
      timestamp: new Date().toISOString()
    });
    return updated;
  };

  const deleteStaff = (staffId) => {
    const target = users.find(u => u.id === staffId);
    const updated = users.filter(u => u.id !== staffId);
    setUsers(updated);
    syncService.saveUsers(updated);
    syncService.deleteUser(staffId, target?.username, target?.email);

    syncService.addAuditLog({
      action: 'USER_DELETED',
      user: currentUser?.name || 'Genel Merkez',
      details: `${target?.name || staffId} kullanıcısı sistemden silindi.`,
      timestamp: new Date().toISOString()
    });
  };

  const toggleStaffStatus = (staffId) => {
    const target = users.find(u => u.id === staffId);
    if (!target) return;
    const newStatus = target.isActive === false ? true : false;
    updateStaff(staffId, { isActive: newStatus });
  };

  const changePassword = async (oldPassword, newPassword) => {
    if (!currentUser?.id && !currentUser?.username) {
      return { success: false, message: 'Oturum bilgisi bulunamadı!' };
    }
    const cleanOld = String(oldPassword || '').trim();
    const cleanNew = String(newPassword || '').trim();

    if (!cleanOld) {
      return { success: false, message: 'Mevcut (eski) şifrenizi giriniz.' };
    }
    if (!cleanNew || cleanNew.length < 6) {
      return { success: false, message: 'Yeni şifreniz en az 6 karakter olmalıdır.' };
    }

    // 1. Primary: Secure Server-Side Password Change via Supabase Edge Function
    if (isSupabaseConfigured && supabase) {
      try {
        const { data: edgeRes, error: edgeErr } = await supabase.functions.invoke('auth-service', {
          body: {
            action: 'change-password',
            userId: currentUser.id || currentUser.username,
            oldPassword: cleanOld,
            newPassword: cleanNew
          }
        });

        if (!edgeErr && edgeRes) {
          if (edgeRes.success) {
            syncService.addAuditLog({
              action: 'PASSWORD_CHANGED',
              user: currentUser.name,
              details: `${currentUser.name} (@${currentUser.username}) şifresini başarıyla güncelledi.`
            });
            return { success: true, message: edgeRes.message || 'Şifreniz başarıyla değiştirildi.' };
          } else if (edgeRes.message) {
            return { success: false, message: edgeRes.message };
          }
        }
      } catch (err) {
        console.warn('Edge Function changePassword error:', err);
      }
    }

    return { success: false, message: 'Şifre güncellenirken bir hata oluştu.' };
  };

  const isAdmin = currentUser?.role?.toUpperCase() === 'ADMIN';

  return (
    <AuthContext.Provider value={{
      currentUser,
      isAdmin,
      users,
      login,
      verify2FAAndLogin,
      logout,
      changePassword,
      addStaff,
      updateStaff,
      deleteStaff,
      toggleStaffStatus
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
