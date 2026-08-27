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

export function AuthProvider({ children }) {
  const [users, setUsers] = useState(() => syncService.getUsers());
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('inzar_auth_user');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return null;
  });

  // Listen to remote Supabase sync updates
  useEffect(() => {
    const unsubscribe = syncService.subscribe((event) => {
      if (event.type === 'USERS_UPDATED' || event.type === 'STORAGE_CHANGE') {
        setUsers(syncService.getUsers());
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('inzar_auth_user', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('inzar_auth_user');
    }
  }, [currentUser]);

  const login = async (inputIdentifier, password, commit = true, skip2FACheck = false) => {
    const trimmedInput = inputIdentifier.trim().toLowerCase();
    const trimmedPass = password.trim();

    // 1. Try local memory/localStorage matching first
    let user = users.find(u => {
      const uMatch = u.username.toLowerCase() === trimmedInput || 
                     (u.email && u.email.toLowerCase() === trimmedInput) ||
                     (u.email && u.email.toLowerCase().startsWith(trimmedInput + '@'));
      const pMatch = String(u.password || '').trim() === trimmedPass;
      return uMatch && pMatch;
    });

    // 2. If not matched locally, query Supabase profiles table directly
    if (!user && isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .ilike('username', trimmedInput)
          .maybeSingle();

        if (data && !error) {
          if (String(data.password || '').trim() === trimmedPass) {
            user = {
              id: data.id,
              username: data.username,
              password: data.password,
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
      password: user.password,
      name: user.name,
      role: (user.role || 'STAFF').toUpperCase(),
      city: user.city || 'İstanbul',
      branch: user.branch || (user.role?.toUpperCase() === 'ADMIN' ? 'Genel Merkez' : 'Fatih Şubesi'),
      phone: user.phone || '',
      email: user.email || `${user.username}@inzarturizm.com`,
      avatar: user.avatar || '',
      avatarImage: user.avatarImage || null,
      twoFactorEnabled: Boolean(user.twoFactorEnabled),
      twoFactorSecret: user.twoFactorSecret || null,
      twoFactorBackupCodes: user.twoFactorBackupCodes || [],
      lastLogin: new Date().toISOString(),
      sessionToken: 'tkn_' + Math.random().toString(36).substring(2) + Date.now().toString(36)
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
      password: tempUser.password,
      name: tempUser.name,
      role: (tempUser.role || 'STAFF').toUpperCase(),
      city: tempUser.city || 'İstanbul',
      branch: tempUser.branch || (tempUser.role?.toUpperCase() === 'ADMIN' ? 'Genel Merkez' : 'Fatih Şubesi'),
      phone: tempUser.phone || '',
      email: tempUser.email || `${tempUser.username}@inzarturizm.com`,
      avatar: tempUser.avatar || '',
      avatarImage: tempUser.avatarImage || null,
      twoFactorEnabled: true,
      twoFactorSecret: tempUser.twoFactorSecret,
      twoFactorBackupCodes: tempUser.twoFactorBackupCodes || [],
      lastLogin: new Date().toISOString(),
      sessionToken: 'tkn_' + Math.random().toString(36).substring(2) + Date.now().toString(36)
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

  const addStaff = (newStaff) => {
    const roleUpper = (newStaff.role || 'STAFF').toUpperCase();
    const cleanUsername = sanitizeInput(newStaff.username).toLowerCase();
    const email = sanitizeInput(newStaff.email || `${cleanUsername}@inzarturizm.com`).toLowerCase();

    const created = {
      id: 'staff_' + Date.now(),
      username: cleanUsername,
      password: newStaff.password ? newStaff.password.trim() : '123',
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

  const updateStaff = (staffId, updatedFields) => {
    const target = users.find(u => u.id === staffId);
    const updated = users.map(u => {
      if (u.id === staffId) {
        return {
          ...u,
          ...updatedFields,
          username: updatedFields.username ? sanitizeInput(updatedFields.username).toLowerCase() : u.username,
          email: updatedFields.email ? sanitizeInput(updatedFields.email).toLowerCase() : u.email,
          name: updatedFields.name ? sanitizeInput(updatedFields.name) : u.name,
          role: updatedFields.role ? updatedFields.role.toUpperCase() : u.role
        };
      }
      return u;
    });

    setUsers(updated);
    syncService.saveUsers(updated);

    if (isSupabaseConfigured && supabase) {
      const updatedUser = updated.find(u => u.id === staffId);
      if (updatedUser) {
        supabase.from('profiles').upsert({
          id: updatedUser.id,
          username: updatedUser.username,
          password: updatedUser.password,
          name: updatedUser.name,
          role: updatedUser.role,
          city: updatedUser.city,
          branch: updatedUser.branch,
          phone: updatedUser.phone,
          avatar_image: updatedUser.avatarImage,
          is_active: updatedUser.isActive !== false,
          two_factor_enabled: Boolean(updatedUser.twoFactorEnabled),
          two_factor_secret: updatedUser.twoFactorSecret || null,
          two_factor_backup_codes: updatedUser.twoFactorBackupCodes || [],
          updated_at: new Date().toISOString()
        }).then();
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

  const isAdmin = currentUser?.role?.toUpperCase() === 'ADMIN';

  return (
    <AuthContext.Provider value={{
      currentUser,
      isAdmin,
      users,
      login,
      verify2FAAndLogin,
      logout,
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
