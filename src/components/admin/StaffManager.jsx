import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useModal } from '../../context/ModalContext';
import CustomSelect from '../common/CustomSelect';
import { 
  Users, 
  UserPlus, 
  Trash2, 
  Lock, 
  Key, 
  Phone, 
  Mail, 
  ShieldCheck, 
  UserCheck, 
  CheckCircle2, 
  XCircle, 
  Sparkles, 
  Search,
  ArrowLeft,
  MapPin,
  Building2,
  Calendar,
  Clock,
  FileText,
  DollarSign,
  AlertTriangle,
  PauseCircle,
  PlayCircle,
  Save,
  Check,
  Crown,
  User,
  Camera,
  Eye,
  EyeOff,
  Copy
} from 'lucide-react';
import confetti from 'canvas-confetti';

export default function StaffManager() {
  const { users, currentUser, addStaff, updateStaff, deleteStaff, toggleStaffStatus } = useAuth();
  const { savedQuotes } = useData();
  const { showConfirm, showAlert } = useModal();

  const [viewMode, setViewMode] = useState('list'); // 'list' | 'create' | 'detail'
  const [selectedStaffId, setSelectedStaffId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [visiblePasswords, setVisiblePasswords] = useState({});

  const togglePasswordVisibility = (userId, e) => {
    if (e) e.stopPropagation();
    setVisiblePasswords(prev => ({ ...prev, [userId]: !prev[userId] }));
  };

  const copyPasswordToClipboard = (password, e) => {
    if (e) e.stopPropagation();
    navigator.clipboard.writeText(password || '');
    showAlert({ title: 'Kopyalandı', message: 'Kullanıcı şifresi panoya kopyalandı.', type: 'success' });
  };

  // Create Form State
  const [createForm, setCreateForm] = useState({
    name: '',
    username: '',
    password: '',
    role: 'STAFF',
    city: 'İstanbul',
    branch: 'Fatih Şubesi',
    phone: '',
    email: '',
    avatar: ''
  });

  // Selected Staff for Detail
  const selectedStaff = users.find(u => u.id === selectedStaffId);
  const [editForm, setEditForm] = useState(null);

  const filteredUsers = users.filter(u => {
    const term = searchTerm.toLowerCase();
    return (
      (u.name && u.name.toLowerCase().includes(term)) ||
      (u.username && u.username.toLowerCase().includes(term)) ||
      (u.branch && u.branch.toLowerCase().includes(term)) ||
      (u.city && u.city.toLowerCase().includes(term))
    );
  });

  // Open Detail View
  const handleOpenDetail = (user) => {
    setSelectedStaffId(user.id);
    setEditForm({
      name: user.name || '',
      username: user.username || '',
      role: (user.role || 'STAFF').toUpperCase(),
      city: user.city || 'İstanbul',
      branch: user.branch || 'Merkez Şube',
      phone: user.phone || '',
      email: user.email || '',
      avatar: user.avatar || '',
      password: ''
    });
    setViewMode('detail');
  };

  // Submit New Staff
  const handleCreateSubmit = (e) => {
    e.preventDefault();
    if (!createForm.name.trim() || !createForm.username.trim() || !createForm.password.trim()) {
      showAlert({ title: 'Eksik Bilgi', message: 'Lütfen zorunlu alanları doldurunuz.', type: 'error' });
      return;
    }

    addStaff(createForm);
    setViewMode('list');
    setCreateForm({
      name: '',
      username: '',
      password: '',
      role: 'STAFF',
      city: 'İstanbul',
      branch: 'Fatih Şubesi',
      phone: '',
      email: '',
      avatar: ''
    });

    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.6 }
    });
  };

  // Save Edit in Detail
  const handleSaveEdit = (e) => {
    e.preventDefault();
    if (!editForm.name.trim() || !editForm.username.trim()) return;

    const payload = {
      name: editForm.name.trim(),
      username: editForm.username.trim(),
      role: editForm.role,
      city: editForm.city.trim(),
      branch: editForm.branch.trim(),
      phone: editForm.phone.trim(),
      email: editForm.email.trim(),
      avatar: editForm.avatar
    };

    if (editForm.password && editForm.password.trim()) {
      payload.password = editForm.password.trim();
    }

    updateStaff(selectedStaffId, payload);
    showAlert({ title: 'Başarılı', message: 'Kullanıcı bilgileri ve yetkileri güncellendi.', type: 'success' });
  };

  // Toggle Suspend / Active
  const handleToggleSuspend = async (user) => {
    const isCurrentlyActive = user.isActive !== false;
    const confirmed = await showConfirm({
      title: isCurrentlyActive ? 'Yetkiyi Duraklat (Askıya Al)' : 'Yetkiyi Aktif Et',
      message: `${user.name} kullanıcısının sisteme giriş yetkisini ${isCurrentlyActive ? 'DURAKLATMAK' : 'TEKRAR AKTİF ETMEK'} istediğinize emin misiniz?`,
      details: isCurrentlyActive ? 'Yetkisi duraklatılan personel sisteme giriş yapamayacaktır.' : 'Personel giriş yapabilecek ve teklif oluşturabilecektir.',
      confirmText: isCurrentlyActive ? 'Evet, Duraklat' : 'Evet, Aktif Et',
      cancelText: 'Vazgeç',
      confirmVariant: isCurrentlyActive ? 'amber' : 'emerald'
    });

    if (confirmed) {
      toggleStaffStatus(user.id);
    }
  };

  // Delete Staff
  const handleDeleteUser = async (user) => {
    const confirmed = await showConfirm({
      title: 'Personel Hesabını Kalıcı Olarak Sil',
      message: `"${user.name}" (@${user.username}) kullanıcısını sistemden ve bulut veritabanından kalıcı olarak silmek istediğinize emin misiniz?`,
      details: '⚠️ DİKKAT: Bu işlem geri alınamaz! Kullanıcının hesabı, şifresi ve yetkileri Supabase veritabanından tamamen silinecektir.',
      confirmText: 'Evet, Kalıcı Olarak Sil',
      cancelText: 'Vazgeç',
      confirmVariant: 'danger'
    });

    if (confirmed) {
      deleteStaff(user.id);
      if (viewMode === 'detail') setViewMode('list');
      showAlert({ title: 'Personel Silindi', message: `"${user.name}" kullanıcısı başarıyla silindi.`, type: 'success' });
    }
  };

  // Staff specific quotes
  const staffQuotes = selectedStaff ? savedQuotes.filter(q => q.createdById === selectedStaff.id || q.createdByName === selectedStaff.name) : [];
  const staffApproved = staffQuotes.filter(q => q.status === 'approved' || q.status === 'approved_revised');
  const staffVolumeUSD = staffQuotes.reduce((acc, q) => acc + (q.finalPriceUSD * (q.paxCount || 1)), 0);

  return (
    <div className="space-y-6 pb-20">
      
      {/* ══════════════════════════════════════════════════════════════
          1. VIEW: CREATE NEW STAFF / ADMIN FULL-PAGE
         ══════════════════════════════════════════════════════════════ */}
      {viewMode === 'create' && (
        <div className="space-y-6 animate-fade-scale">
          <div className="pearl-card rounded-3xl p-6 sm:p-8 bg-gradient-to-r from-emerald-900 via-emerald-850 to-emerald-950 text-white shadow-xl flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className="p-2.5 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/20 text-white transition-all cursor-pointer"
                title="Geri Dön"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div>
                <h2 className="text-2xl font-black font-display text-white">Yeni Personel / Yönetici Tanımla</h2>
                <p className="text-xs text-emerald-200">Sistem yetkisi ve şube ataması yaparak yeni kullanıcı oluşturun.</p>
              </div>
            </div>
          </div>

          <div className="pearl-card rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm">
            <form onSubmit={handleCreateSubmit} className="space-y-6">
              
              {/* Role Selection */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <label className="block text-xs font-black text-slate-800 uppercase tracking-wider">
                  Kullanıcı Rolü & Yetki Düzeyi
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setCreateForm({ ...createForm, role: 'STAFF', avatar: '' })}
                    className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                      createForm.role === 'STAFF'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-950 ring-2 ring-emerald-500/20 shadow-xs'
                        : 'border-slate-200 bg-white hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2 font-bold text-xs">
                        <User className="h-4 w-4 text-emerald-700" />
                        <span>Satış & Teklif Personeli</span>
                      </div>
                      {createForm.role === 'STAFF' && <CheckCircle2 className="h-4 w-4 text-emerald-600" />}
                    </div>
                    <p className="text-[11px] text-slate-500">Teklif oluşturabilir, resmi teklif mektubu hazırlayabilir ve duyuruları görebilir.</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCreateForm({ ...createForm, role: 'ADMIN', avatar: '' })}
                    className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                      createForm.role === 'ADMIN'
                        ? 'border-amber-500 bg-amber-50 text-amber-950 ring-2 ring-amber-500/20 shadow-xs'
                        : 'border-slate-200 bg-white hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2 font-bold text-xs">
                        <Crown className="h-4 w-4 text-amber-600" />
                        <span>Genel Merkez Yöneticisi (Admin)</span>
                      </div>
                      {createForm.role === 'ADMIN' && <CheckCircle2 className="h-4 w-4 text-amber-600" />}
                    </div>
                    <p className="text-[11px] text-slate-500">Tam yetkilidir; otel fiyatlarını, personelleri ve sirkülerleri yönetebilir.</p>
                  </button>
                </div>
              </div>

              {/* Basic Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Ad Soyad *</label>
                  <input
                    type="text"
                    required
                    placeholder="Örn: Salih Çelik"
                    value={createForm.name}
                    onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-900 focus:bg-white focus:border-emerald-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Kullanıcı Adı (Giriş İçin) *</label>
                  <input
                    type="text"
                    required
                    placeholder="Örn: salih"
                    value={createForm.username}
                    onChange={(e) => setCreateForm({ ...createForm, username: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-mono font-bold text-slate-900 focus:bg-white focus:border-emerald-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Giriş Şifresi *</label>
                  <input
                    type="password"
                    required
                    placeholder="Şifre belirleyin..."
                    value={createForm.password}
                    onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-mono font-bold text-slate-900 focus:bg-white focus:border-emerald-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Şehir / İl</label>
                  <input
                    type="text"
                    placeholder="Örn: İstanbul / Bursa / Konya"
                    value={createForm.city}
                    onChange={(e) => setCreateForm({ ...createForm, city: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-900 focus:bg-white focus:border-emerald-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Şube / Birim</label>
                  <input
                    type="text"
                    placeholder="Örn: Üsküdar Şubesi"
                    value={createForm.branch}
                    onChange={(e) => setCreateForm({ ...createForm, branch: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-900 focus:bg-white focus:border-emerald-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Telefon Numarası</label>
                  <input
                    type="tel"
                    placeholder="+90 5XX XXX XX XX"
                    value={createForm.phone}
                    onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-900 focus:bg-white focus:border-emerald-600 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  className="rounded-2xl px-5 py-3 text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Vazgeç
                </button>

                <button
                  type="submit"
                  className="flex items-center gap-2 rounded-2xl bg-emerald-600 hover:bg-emerald-700 px-6 py-3 text-xs font-black text-white shadow-lg shadow-emerald-600/25 transition-all cursor-pointer"
                >
                  <UserPlus className="h-4 w-4" />
                  <span>Kullanıcıyı Kaydet ve Yetkilendir</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          2. VIEW: IN-DEPTH STAFF DETAIL & ACTIVITY PAGE
         ══════════════════════════════════════════════════════════════ */}
      {viewMode === 'detail' && selectedStaff && (
        <div className="space-y-6 animate-fade-scale">
          {/* Header Banner */}
          <div className="pearl-card rounded-3xl p-6 sm:p-8 bg-gradient-to-r from-emerald-900 via-emerald-850 to-emerald-950 text-white shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  className="p-2.5 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/20 text-white transition-all cursor-pointer"
                  title="Listeye Dön"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
                <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-white/10 backdrop-blur-md border border-white/20 text-3xl shadow-inner overflow-hidden">
                  {selectedStaff.avatarImage ? (
                    <img src={selectedStaff.avatarImage} alt={selectedStaff.name} className="h-full w-full object-cover" />
                  ) : selectedStaff.role === 'ADMIN' ? (
                    <Crown className="h-8 w-8 text-amber-300" />
                  ) : (
                    <User className="h-8 w-8 text-emerald-200" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      selectedStaff.role === 'ADMIN'
                        ? 'bg-amber-400 text-slate-950'
                        : 'bg-emerald-700 text-emerald-100'
                    }`}>
                      {selectedStaff.role === 'ADMIN' ? 'Genel Merkez Yöneticisi' : 'Satış Personeli'}
                    </span>
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      selectedStaff.isActive !== false
                        ? 'bg-emerald-400/20 text-emerald-300 border border-emerald-400/40'
                        : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                    }`}>
                      {selectedStaff.isActive !== false ? '● Aktif' : 'Duraklatıldı'}
                    </span>
                  </div>
                  <h2 className="text-2xl font-black font-display text-white">
                    {selectedStaff.name}
                  </h2>
                  <p className="text-xs text-emerald-200">
                    @{selectedStaff.username} • {selectedStaff.city || 'İstanbul'} / {selectedStaff.branch || 'Merkez'}
                  </p>
                </div>
              </div>

              {/* Actions: Suspend / Delete */}
              <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={() => handleToggleSuspend(selectedStaff)}
                  className={`flex items-center gap-1.5 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                    selectedStaff.isActive !== false
                      ? 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-400/40'
                      : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black shadow-md'
                  }`}
                >
                  {selectedStaff.isActive !== false ? <PauseCircle className="h-4 w-4" /> : <PlayCircle className="h-4 w-4" />}
                  <span>{selectedStaff.isActive !== false ? 'Yetkiyi Duraklat' : 'Yetkiyi Aktif Et'}</span>
                </button>

                {selectedStaff.id !== currentUser.id && (
                  <button
                    type="button"
                    onClick={() => handleDeleteUser(selectedStaff)}
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-rose-600/80 hover:bg-rose-600 text-white text-xs font-bold border border-rose-500 transition-all cursor-pointer"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span>Personeli Sil</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Performance Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="pearl-card rounded-3xl p-5 border border-slate-200/90 shadow-2xs space-y-1">
              <div className="text-xs font-semibold text-slate-500 flex items-center justify-between">
                <span>Personelin Verdiği Teklifler</span>
                <FileText className="h-4 w-4 text-emerald-600" />
              </div>
              <div className="text-2xl font-black font-mono text-slate-900">
                {staffQuotes.length} <span className="text-xs font-sans text-slate-400 font-medium">Adet</span>
              </div>
              <div className="text-[11px] text-slate-400">Bu kullanıcı tarafından oluşturulan teklif sayısı</div>
            </div>

            <div className="pearl-card rounded-3xl p-5 border border-emerald-200 bg-emerald-50/40 shadow-2xs space-y-1">
              <div className="text-xs font-semibold text-emerald-800 flex items-center justify-between">
                <span>Onaylanan / Satışa Dönen</span>
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              </div>
              <div className="text-2xl font-black font-mono text-emerald-900">
                {staffApproved.length} <span className="text-xs font-sans text-emerald-700 font-medium">Kabul Edildi</span>
              </div>
              <div className="text-[11px] text-emerald-600 font-medium">Müşterinin onayladığı kesinleşen teklifler</div>
            </div>

            <div className="pearl-card rounded-3xl p-5 border border-amber-200 bg-amber-50/40 shadow-2xs space-y-1">
              <div className="text-xs font-semibold text-amber-900 flex items-center justify-between">
                <span>Oluşturulan Teklif Hacmi</span>
                <DollarSign className="h-4 w-4 text-amber-600" />
              </div>
              <div className="text-2xl font-black font-mono text-amber-950">
                ${staffVolumeUSD.toLocaleString()} <span className="text-xs font-sans text-amber-800 font-medium">USD</span>
              </div>
              <div className="text-[11px] text-amber-700 font-medium">Tüm tekliflerin parasal büyüklüğü</div>
            </div>
          </div>

          {/* Edit Form & Staff Quotes List */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left 6: Edit Form */}
            <div className="lg:col-span-6 pearl-card rounded-3xl p-6 sm:p-7 border border-slate-200/90 shadow-sm space-y-4">
              <h3 className="text-base font-bold text-slate-900 font-display border-b border-slate-100 pb-3">
                Kullanıcı Bilgilerini & Şifresini Düzenle
              </h3>

              <form onSubmit={handleSaveEdit} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Ad Soyad</label>
                    <input
                      type="text"
                      required
                      value={editForm.name}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:bg-white focus:border-emerald-600 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Kullanıcı Adı</label>
                    <input
                      type="text"
                      required
                      value={editForm.username}
                      onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:bg-white focus:border-emerald-600 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Yetki Rolü</label>
                    <CustomSelect
                      value={editForm.role}
                      onChange={(val) => setEditForm({ ...editForm, role: val })}
                      options={[
                        { id: 'STAFF', label: 'Satış Personeli' },
                        { id: 'ADMIN', label: 'Genel Merkez Yöneticisi' },
                      ]}
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Şehir / İl</label>
                    <input
                      type="text"
                      value={editForm.city}
                      onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:bg-white focus:border-emerald-600 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Şube / Birim</label>
                    <input
                      type="text"
                      value={editForm.branch}
                      onChange={(e) => setEditForm({ ...editForm, branch: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:bg-white focus:border-emerald-600 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Telefon</label>
                    <input
                      type="tel"
                      value={editForm.phone}
                      onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:bg-white focus:border-emerald-600 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-[11px] font-bold text-slate-800 flex items-center gap-1.5">
                      <Lock className="h-3.5 w-3.5 text-emerald-700" />
                      <span>Kullanıcının Mevcut Aktif Şifresi (Genel Merkez Görünümü)</span>
                    </label>
                    <button
                      type="button"
                      onClick={(e) => togglePasswordVisibility(selectedStaff.id, e)}
                      className="flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:text-emerald-900 bg-white border border-slate-200 px-2.5 py-1 rounded-xl shadow-3xs cursor-pointer"
                    >
                      {visiblePasswords[selectedStaff.id] ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      <span>{visiblePasswords[selectedStaff.id] ? 'Gizle' : 'Şifreyi Gör'}</span>
                    </button>
                  </div>
                  <div className="flex items-center justify-between bg-white border border-slate-200 rounded-xl px-3.5 py-2">
                    <span className="font-mono text-sm font-bold text-slate-900 tracking-wider">
                      {visiblePasswords[selectedStaff.id] ? (selectedStaff.password || 'Inzar2026!') : '••••••••••••'}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => copyPasswordToClipboard(selectedStaff.password || 'Inzar2026!', e)}
                      className="p-1.5 text-slate-400 hover:text-emerald-700 transition-colors cursor-pointer"
                      title="Şifreyi Kopyala"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-amber-50/60 border border-amber-200 space-y-1.5">
                  <label className="block text-[11px] font-bold text-amber-900 flex items-center gap-1.5">
                    <Key className="h-3.5 w-3.5 text-amber-600" />
                    <span>Şifreyi Değiştir / Yenile (İsteğe Bağlı)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Yeni bir şifre girin..."
                    value={editForm.password}
                    onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                    className="w-full bg-white border border-amber-300 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:border-emerald-600 focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 hover:bg-emerald-700 py-3 text-xs font-black text-white shadow-md shadow-emerald-600/25 transition-all cursor-pointer"
                >
                  <Save className="h-4 w-4" />
                  <span>Değişiklikleri Kaydet</span>
                </button>
              </form>
            </div>

            {/* Right 6: Staff Quotes List */}
            <div className="lg:col-span-6 pearl-card rounded-3xl p-6 sm:p-7 border border-slate-200/90 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-base font-bold text-slate-900 font-display">
                  Personelin Verdiği Teklifler ({staffQuotes.length})
                </h3>
                <span className="text-xs text-slate-400 font-medium">Son Hareketler</span>
              </div>

              {staffQuotes.length === 0 ? (
                <div className="py-12 text-center text-slate-400 space-y-2">
                  <FileText className="h-10 w-10 mx-auto text-slate-300" />
                  <p className="text-xs">Bu personelin henüz kayıtlı teklifi bulunmuyor.</p>
                </div>
              ) : (
                <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
                  {staffQuotes.map((q) => (
                    <div key={q.id} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-bold text-slate-900">{q.customerName || 'Misafir'}</h4>
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                            q.status === 'approved' || q.status === 'approved_revised'
                              ? 'bg-emerald-100 text-emerald-900'
                              : q.status === 'revised'
                              ? 'bg-amber-100 text-amber-900'
                              : 'bg-slate-200 text-slate-700'
                          }`}>
                            {q.statusLabel || q.status}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {q.packageName} • {q.paxCount} Kişi • {q.durationDays} Gün • <strong className="text-slate-900">${q.finalPriceUSD}</strong>
                        </div>
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono text-right">
                        {new Date(q.createdAt).toLocaleDateString('tr-TR')}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          3. VIEW: STAFF LIST TABLE (ADMIN OVERVIEW)
         ══════════════════════════════════════════════════════════════ */}
      {viewMode === 'list' && (
        <div className="space-y-6 animate-fade-scale">
          {/* Header Banner */}
          <div className="pearl-card rounded-3xl p-6 sm:p-8 bg-gradient-to-r from-emerald-900 via-emerald-850 to-emerald-950 text-white shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-800/80 px-3 py-0.5 text-[11px] font-bold text-emerald-200 border border-emerald-700/60 mb-1">
                <ShieldCheck className="h-3.5 w-3.5 text-amber-400" />
                <span>GENEL MERKEZ YÖNETİM KONTROL PANELİ</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black font-display text-white">
                Personel & Yetki Yönetimi
              </h2>
              <p className="text-xs text-emerald-200/90 max-w-xl">
                Tüm şube ve genel merkez personellerini listeleyebilir, şifrelerini görüntüleyebilir veya yeni personel tanımlayabilirsiniz.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setViewMode('create')}
              className="flex items-center gap-2 rounded-2xl bg-amber-400 hover:bg-amber-300 px-5 py-3 text-xs font-black text-slate-950 shadow-lg shadow-amber-400/20 transition-all cursor-pointer shrink-0"
            >
              <UserPlus className="h-4 w-4" />
              <span>Yeni Personel Tanımla</span>
            </button>
          </div>

          {/* List Card */}
          <div className="pearl-card rounded-3xl p-6 sm:p-7 border border-slate-200/90 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 font-display">Kayıtlı Kullanıcılar</h3>
                <p className="text-xs text-slate-500">Sistemde kayıtlı toplam <strong>{users.length}</strong> kullanıcı bulunmaktadır.</p>
              </div>

              {/* Search Box */}
              <div className="relative w-full sm:w-72">
                <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  placeholder="İsim, kullanıcı adı veya şube ara..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-10 pr-4 py-2 text-xs font-semibold text-slate-900 focus:bg-white focus:border-emerald-600 focus:outline-none"
                />
              </div>
            </div>

            {filteredUsers.length === 0 ? (
              <div className="py-12 text-center text-slate-400">
                <Users className="h-10 w-10 mx-auto text-slate-300 mb-2" />
                <p className="text-xs">Arama kriterlerine uygun kullanıcı bulunamadı.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-200/80 text-slate-500 font-bold uppercase tracking-wider bg-slate-50/70">
                    <tr>
                      <th className="py-3 px-4 rounded-l-xl">Kullanıcı</th>
                      <th className="py-3 px-4">Şehir / Şube</th>
                      <th className="py-3 px-4">Yetki Rolü</th>
                      <th className="py-3 px-4">Giriş Şifresi</th>
                      <th className="py-3 px-4">İletişim</th>
                      <th className="py-3 px-4">Durum</th>
                      <th className="py-3 px-4 text-right rounded-r-xl">İşlemler</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredUsers.map((user) => {
                      const isAdminRole = user.role?.toUpperCase() === 'ADMIN';

                      return (
                        <tr 
                          key={user.id} 
                          onClick={() => handleOpenDetail(user)}
                          className="hover:bg-emerald-50/40 transition-colors cursor-pointer group"
                        >
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              <div className={`flex h-9 w-9 items-center justify-center rounded-xl text-base font-bold shadow-xs overflow-hidden ${
                                isAdminRole ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                              }`}>
                                {user.avatarImage ? (
                                  <img src={user.avatarImage} alt={user.name} className="h-full w-full object-cover" />
                                ) : isAdminRole ? (
                                  <Crown className="h-4 w-4 text-amber-600" />
                                ) : (
                                  <User className="h-4 w-4 text-emerald-700" />
                                )}
                              </div>
                              <div>
                                <div className="font-bold text-slate-900 group-hover:text-emerald-800 transition-colors flex items-center gap-1.5">
                                  <span>{user.name}</span>
                                  {user.id === currentUser.id && (
                                    <span className="text-[9px] font-bold bg-slate-200 text-slate-700 px-1.5 py-0.2 rounded">Siz</span>
                                  )}
                                </div>
                                <div className="text-[11px] text-slate-400 font-mono">@{user.username}</div>
                              </div>
                            </div>
                          </td>

                          <td className="py-3.5 px-4 text-slate-700 font-semibold">
                            <div>{user.city || 'İstanbul'}</div>
                            <div className="text-[10px] text-slate-400 font-normal">{user.branch || 'Genel Merkez'}</div>
                          </td>

                          <td className="py-3.5 px-4">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                              isAdminRole
                                ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                            }`}>
                              {isAdminRole ? 'Genel Merkez' : 'Satış Personeli'}
                            </span>
                          </td>

                          {/* Şifre Görüntüleme & Kopyalama Sütunu */}
                          <td className="py-3.5 px-4" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200/90 rounded-xl px-2.5 py-1 w-fit">
                              <span className="font-mono text-xs font-bold text-slate-800 tracking-wider">
                                {visiblePasswords[user.id] ? (user.password || 'Inzar2026!') : '••••••••'}
                              </span>
                              <button
                                type="button"
                                onClick={(e) => togglePasswordVisibility(user.id, e)}
                                className="p-1 text-slate-400 hover:text-emerald-700 transition-colors cursor-pointer"
                                title={visiblePasswords[user.id] ? "Şifreyi Gizle" : "Şifreyi Göster"}
                              >
                                {visiblePasswords[user.id] ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                              </button>
                              <button
                                type="button"
                                onClick={(e) => copyPasswordToClipboard(user.password || 'Inzar2026!', e)}
                                className="p-1 text-slate-400 hover:text-emerald-700 transition-colors cursor-pointer"
                                title="Şifreyi Kopyala"
                              >
                                <Copy className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>

                          <td className="py-3.5 px-4 text-slate-600 text-[11px]">
                            <div>{user.phone || '-'}</div>
                            <div className="text-[10px] text-slate-400">{user.email || '-'}</div>
                          </td>

                          <td className="py-3.5 px-4">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              user.isActive !== false
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-rose-50 text-rose-700 border border-rose-200'
                            }`}>
                              {user.isActive !== false ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                              <span>{user.isActive !== false ? 'Aktif' : 'Duraklatıldı'}</span>
                            </span>
                          </td>

                          <td className="py-3.5 px-4 text-right">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenDetail(user);
                              }}
                              className="rounded-xl px-3 py-1.5 bg-slate-100 hover:bg-emerald-600 hover:text-white text-slate-700 font-bold text-[11px] transition-all cursor-pointer shadow-3xs"
                            >
                              Detay & Düzenle ➔
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
