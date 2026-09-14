import React, { createContext, useContext, useState, useEffect } from 'react';
import { DEFAULT_USERS } from '../data/defaultTariffData';
import { syncService } from '../services/syncService';
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

  const login = async (inputIdentifier, password, commit = true, skip2FACheck = false) => {
    const trimmedInput = inputIdentifier.trim().toLowerCase();
    const trimmedPass = password.trim();

    // 1. Try local memory/localStorage matching first
    let user = null;
    for (const u of users) {
      const uMatch = u.username.toLowerCase() === trimmedInput || 
                     (u.email && u.email.toLowerCase() === trimmedInput) ||
                     (u.email && u.email.toLowerCase().startsWith(trimmedInput + '@'));
      if (uMatch) {
        const isMatch = await verifyPassword(trimmedPass, u.password);
        if (isMatch) {
          user = { ...u };
          // Auto-upgrade legacy password to secure PBKDF2 hash
          if (user.password && !user.password.startsWith('pbkdf2:')) {
            const secureHash = await hashPassword(trimmedPass);
            user.password = secureHash;
            const updatedUsers = users.map(item => item.id === user.id ? { ...item, password: secureHash } : item);
            setUsers(updatedUsers);
            syncService.saveUsers(updatedUsers);
          }
          break;
        }
      }
    }

    // 2. If not matched locally, query Supabase profiles table directly
    if (!user && isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .ilike('username', trimmedInput)
          .maybeSingle();

        if (data && !error) {
          const isMatch = await verifyPassword(trimmedPass, data.password);
          if (isMatch) {
            let passwordToStore = data.password;
            if (!passwordToStore || !passwordToStore.startsWith('pbkdf2:')) {
              passwordToStore = await hashPassword(trimmedPass);
              // Update hash in Supabase profiles
              supabase.from('profiles').update({ 
                password: passwordToStore,
                updated_at: new Date().toISOString()
              }).eq('id', data.id).then();
            }

            user = {
              id: data.id,
              username: data.username,
              password: passwordToStore,
              name: data.name,
              role: (data.role || 'STAFF').toUpperCase(),
              city: data.city || 'İstanbul',
              branch: data.branch || 'Genel Merkez',
              phone: data.phone || '',
              avatarImage: data.avatar_image || null,
              isActive: data.is_active !== false,
              twoFactorEnabled: Boolean(data.two_factor_enabled),
              twoFactorSecret: data.two_factor_secret || null,
              twoFactorBackupCodes: data.two_factor_backup_codes || [],
              readAnnouncements: Array.isArray(data.read_announcements) ? data.read_announcements : [],
              lastLogin: new Date().toISOString()
            };

            // Merge user into local state & storage
            const updatedList = [user, ...users.filter(u => u.username.toLowerCase() !== trimmedInput)];
            setUsers(updatedList);
            syncService.saveUsers(updatedList);
          }
        }
      } catch (err) {
        console.warn('Supabase live auth check failed, using local cache:', err);
      }
    }

    if (!user) {
      return { success: false, message: 'Kullanıcı adı veya şifre hatalı!' };
    }

    if (user.isActive === false) {
      return { success: false, message: 'Bu kullanıcı hesabı merkez tarafından askıya alınmıştır/pasiftir!' };
    }

    // Check if user has Google Authenticator 2FA Enabled
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
      // update last login on user model
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
    let isValid = false;
    let usedBackupCode = false;

    // 1. Try TOTP code first
    if (/^\d{6}$/.test(cleanInput)) {
      isValid = await verifyTOTPToken(tempUser.twoFactorSecret, cleanInput);
    }

    // 2. Try Backup Codes if not matched
    if (!isValid && Array.isArray(tempUser.twoFactorBackupCodes)) {
      const backupIndex = tempUser.twoFactorBackupCodes.findIndex(
        b => b.toUpperCase().replace(/\s|-/g, '') === cleanInput.replace(/\s|-/g, '')
      );
      if (backupIndex >= 0) {
        isValid = true;
        usedBackupCode = true;
        // Consume backup code
        const updatedBackupCodes = tempUser.twoFactorBackupCodes.filter((_, idx) => idx !== backupIndex);
        tempUser.twoFactorBackupCodes = updatedBackupCodes;
        const updatedUsers = users.map(u => u.id === tempUser.id ? { ...u, twoFactorBackupCodes: updatedBackupCodes } : u);
        setUsers(updatedUsers);
        syncService.saveUsers(updatedUsers);
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
      const randBytes = new Uint8Array(4);
      window.crypto.getRandomValues(randBytes);
      const randNum = ((randBytes[0] << 24) | (randBytes[1] << 16) | (randBytes[2] << 8) | randBytes[3]) >>> 0;
      rawPassword = `Inzar@${(randNum % 900000) + 100000}!`;
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
    if (fieldsToApply.password && !fieldsToApply.password.startsWith('pbkdf2:')) {
      fieldsToApply.password = await hashPassword(fieldsToApply.password);
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
          password: updatedUser.password,
          name: updatedUser.name,
          role: updatedUser.role,
          city: updatedUser.city,
          branch: updatedUser.branch,
          phone: updatedUser.phone,
          email: updatedUser.email || `${updatedUser.username}@inzarturizm.com`,
          avatar_image: updatedUser.avatarImage,
          is_active: updatedUser.isActive !== false,
          two_factor_enabled: Boolean(updatedUser.twoFactorEnabled),
          two_factor_secret: updatedUser.twoFactorSecret || null,
          two_factor_backup_codes: updatedUser.twoFactorBackupCodes || [],
          updated_at: new Date().toISOString()
        };
        if (isUuid) {
          profilePayload.id = updatedUser.id;
        }

        supabase.from('profiles').upsert(profilePayload, { onConflict: 'username' }).then(({ error }) => {
          if (error) console.error('[Supabase updateStaff profile upsert error]:', error);
        });
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
      action: 'USER_UPDATED',
      user: currentUser?.name || 'Genel Merkez',
      details: `${target?.name || staffId} kullanıcısının bilgileri/yetkileri güncellendi.`,
      timestamp: new Date().toISOString()
    });
    return updated;
  };

  const deleteStaff = (staffId) => {
    const target = users.find(u => u.id === staffId);
    const updated = users.filter(u => u.id !== staffId);
    setUsers(updated);
    syncService.deleteUser(staffId, target?.username, target?.email);
    syncService.addAuditLog({
      action: 'STAFF_DELETED',
      user: currentUser?.name || 'Genel Merkez',
      details: `Kullanıcı hesabı silindi: ${target?.name || staffId} (@${target?.username || ''})`,
      timestamp: new Date().toISOString()
    });
  };

  const toggleStaffStatus = (staffId) => {
    const target = users.find(u => u.id === staffId);
    const willBeActive = target?.isActive === false;
    const updated = users.map(u => u.id === staffId ? { ...u, isActive: willBeActive } : u);
    setUsers(updated);
    syncService.saveUsers(updated);

    syncService.addAuditLog({
      action: willBeActive ? 'STAFF_ACTIVATED' : 'STAFF_SUSPENDED',
      user: currentUser?.name || 'Genel Merkez',
      details: `${target?.name} kullanıcısının yetkisi ${willBeActive ? 'AKTİF EDİLDİ' : 'DURAKLATILDI (ASKIYA ALINDI)'}.`,
      timestamp: new Date().toISOString()
    });
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

    // 1. Fetch current user's stored password from Supabase
    let storedPass = null;
    if (isSupabaseConfigured && supabase) {
      try {
        let query = supabase.from('profiles').select('id, password');
        if (currentUser.id && currentUser.id.includes('-')) {
          query = query.eq('id', currentUser.id);
        } else {
          query = query.eq('username', currentUser.username);
        }
        const { data, error } = await query.maybeSingle();
        if (!error && data?.password) {
          storedPass = data.password;
        }
      } catch (e) {}
    }

    // Fallback: check in-memory or DEFAULT_USERS
    if (!storedPass) {
      const found = users.find(u => (currentUser.id && u.id === currentUser.id) || (currentUser.username && u.username === currentUser.username)) ||
                    DEFAULT_USERS.find(u => (currentUser.id && u.id === currentUser.id) || (currentUser.username && u.username === currentUser.username));
      storedPass = found?.password;
    }

    if (!storedPass) {
      return { success: false, message: 'Kullanıcı hesabı doğrulanamadı.' };
    }

    // 2. Verify old password using verifyPassword (handles pbkdf2, sha256, and plaintext)
    const isMatch = await verifyPassword(cleanOld, storedPass);
    if (!isMatch) {
      return { success: false, message: 'Girdiğiniz mevcut (eski) şifre doğru değil.' };
    }

    // 3. Hash new password with PBKDF2 (100,000 rounds + 16-byte random salt)
    const newPbkdf2Hash = await hashPassword(cleanNew);

    // 4. Update in Supabase profiles
    if (isSupabaseConfigured && supabase) {
      try {
        let updateQuery = supabase.from('profiles').update({
          password: newPbkdf2Hash,
          updated_at: new Date().toISOString()
        });
        if (currentUser.id && currentUser.id.includes('-')) {
          updateQuery = updateQuery.eq('id', currentUser.id);
        } else {
          updateQuery = updateQuery.eq('username', currentUser.username);
        }
        const { error: upErr } = await updateQuery;
        if (upErr) {
          console.error('Supabase password change error:', upErr);
          return { success: false, message: 'Veritabanı güncelleme hatası: ' + upErr.message };
        }
      } catch (err) {
        return { success: false, message: 'Bağlantı hatası oluştu.' };
      }
    }

    // 5. Update local users list if present
    const updatedUsers = users.map(u => {
      if ((currentUser.id && u.id === currentUser.id) || (currentUser.username && u.username === currentUser.username)) {
        return { ...u, password: newPbkdf2Hash };
      }
      return u;
    });
    setUsers(updatedUsers);

    syncService.addAuditLog({
      action: 'USER_UPDATED',
      user: currentUser.name || currentUser.username,
      details: `${currentUser.name || currentUser.username} hesap şifresini başarıyla değiştirdi.`,
      timestamp: new Date().toISOString()
    });

    return { success: true, message: 'Şifreniz başarıyla güncellendi.' };
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
