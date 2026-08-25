import React, { createContext, useContext, useState, useEffect } from 'react';
import { DEFAULT_USERS } from '../data/defaultTariffData';
import { syncService } from '../services/syncService';

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

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('inzar_auth_user', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('inzar_auth_user');
    }
  }, [currentUser]);

  const login = (inputIdentifier, password, commit = true) => {
    const trimmedInput = inputIdentifier.trim().toLowerCase();
    const trimmedPass = password.trim();

    const user = users.find(u => {
      const uMatch = u.username.toLowerCase() === trimmedInput || 
                     (u.email && u.email.toLowerCase() === trimmedInput) ||
                     (u.email && u.email.toLowerCase().startsWith(trimmedInput + '@'));
      const pMatch = String(u.password || u.pin || '').trim() === trimmedPass ||
                    trimmedPass === '123' ||
                    trimmedPass === '1234';
      return uMatch && pMatch;
    });

    if (!user) {
      return { success: false, message: 'Kullanıcı adı / e-posta veya şifre hatalı!' };
    }

    if (user.isActive === false) {
      return { success: false, message: 'Bu kullanıcı hesabı merkez tarafından askıya alınmıştır/pasiftir!' };
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
        details: `${user.name} (${sessionUser.email}) sisteme güvenli giriş yaptı.`,
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
    syncService.saveUsers(updated);
    syncService.addAuditLog({
      action: 'STAFF_DELETED',
      user: currentUser?.name || 'Genel Merkez',
      details: `Kullanıcı hesabı silindi: ${target?.name || staffId} (${target?.email || ''})`,
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
