import React, { useState, useEffect, useRef } from 'react';
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
import { formatPhoneNumber } from '../../utils/phoneUtils';
import ImageCropModal from '../common/ImageCropModal';
import ImageLightboxModal from '../common/ImageLightboxModal';

export default function StaffManager() {
  const { users, currentUser, addStaff, updateStaff, deleteStaff, toggleStaffStatus } = useAuth();
  const { savedQuotes } = useData();
  const { showConfirm, showAlert } = useModal();

  const [viewMode, setViewMode] = useState(() => {
    try {
      return sessionStorage.getItem('inzar_staff_view_mode') || 'list';
    } catch { return 'list'; }
  }); // 'list' | 'create' | 'detail'
  
  const [selectedStaffId, setSelectedStaffId] = useState(() => {
    try {
      return sessionStorage.getItem('inzar_staff_selected_id') || null;
    } catch { return null; }
  });
  
  const [searchTerm, setSearchTerm] = useState('');
  const [visiblePasswords, setVisiblePasswords] = useState({});

  // Modals state
  const [lightboxState, setLightboxState] = useState({
    isOpen: false,
    imageSrc: null,
    userName: '',
    userRole: '',
    userBranch: ''
  });
  const [cropState, setCropState] = useState({
    isOpen: false,
    imageSrc: null,
    target: null // 'create' | 'edit'
  });

  const fileInputCreateRef = useRef(null);
  const fileInputEditRef = useRef(null);

  useEffect(() => {
    try {
      sessionStorage.setItem('inzar_staff_view_mode', viewMode);
      if (selectedStaffId) {
        sessionStorage.setItem('inzar_staff_selected_id', selectedStaffId);
      }
    } catch {}
  }, [viewMode, selectedStaffId]);

  const togglePasswordVisibility = (userId, e) => {
    if (e) e.stopPropagation();
    setVisiblePasswords(prev => ({ ...prev, [userId]: !prev[userId] }));
  };

  const copyPasswordToClipboard = (password, e) => {
    if (e) e.stopPropagation();
    navigator.clipboard.writeText(password || '');
    showAlert({ title: 'Kopyalandı', message: 'Kullanıcı şifresi panoya kopyalandı.', type: 'success' });
  };

  // Create Form State with persistence
  const [createForm, setCreateForm] = useState(() => {
    try {
      const draft = sessionStorage.getItem('inzar_draft_staff_form');
      if (draft) return JSON.parse(draft);
    } catch {}
    return {
      name: '',
      username: '',
      password: '',
      role: 'STAFF',
      city: 'İstanbul',
      branch: 'Fatih Şubesi',
      phone: '',
      email: '',
      avatar: ''
    };
  });

  useEffect(() => {
    try {
      sessionStorage.setItem('inzar_draft_staff_form', JSON.stringify(createForm));
    } catch {}
  }, [createForm]);

  // Selected Staff for Detail
  const selectedStaff = users.find(u => u.id === selectedStaffId);
  const [editForm, setEditForm] = useState(() => {
    if (!selectedStaff) return null;
    return {
      name: selectedStaff.name || '',
      username: selectedStaff.username || '',
      role: (selectedStaff.role || 'STAFF').toUpperCase(),
      city: selectedStaff.city || 'İstanbul',
      branch: selectedStaff.branch || 'Merkez Şube',
      phone: selectedStaff.phone ? formatPhoneNumber(selectedStaff.phone) : '',
      email: selectedStaff.email || '',
      avatar: selectedStaff.avatar || selectedStaff.avatarImage || '',
      password: ''
    };
  });

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
      phone: user.phone ? formatPhoneNumber(user.phone) : '',
      email: user.email || '',
      avatar: user.avatar || user.avatarImage || '',
      password: ''
    });
    setViewMode('detail');
  };

  // Image Selection Handlers
  const handleSelectImageFor = (e, target) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showAlert({ title: 'Geçersiz Dosya', message: 'Lütfen geçerli bir görsel dosyası seçiniz.', type: 'error' });
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setCropState({
        isOpen: true,
        imageSrc: event.target?.result,
        target
      });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleConfirmCrop = (croppedBase64) => {
    if (cropState.target === 'create') {
      setCreateForm(prev => ({ ...prev, avatar: croppedBase64 }));
    } else if (cropState.target === 'edit') {
      setEditForm(prev => ({ ...prev, avatar: croppedBase64 }));
    }
  };

  const handleOpenLightbox = (user, e) => {
    if (e) e.stopPropagation();
    const imgSrc = user.avatarImage || user.avatar;
    if (!imgSrc) return;

    setLightboxState({
      isOpen: true,
      imageSrc: imgSrc,
      userName: user.name,
      userRole: user.role === 'ADMIN' ? 'Genel Merkez Yöneticisi' : 'Satış Personeli',
      userBranch: `${user.city || 'İstanbul'} / ${user.branch || 'Şube'}`
    });
  };

  // Submit New Staff
  const handleCreateSubmit = (e) => {
    e.preventDefault();
    if (!createForm.name.trim() || !createForm.username.trim() || !createForm.password.trim()) {
      showAlert({ title: 'Eksik Bilgi', message: 'Lütfen zorunlu alanları doldurunuz.', type: 'error' });
      return;
    }

    addStaff({
      ...createForm,
      avatarImage: createForm.avatar
    });
    sessionStorage.removeItem('inzar_draft_staff_form');
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

              {/* Avatar Upload in Create Form */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div 
                    onClick={() => createForm.avatar && handleOpenLightbox({ name: createForm.name || 'Yeni Kullanıcı', avatar: createForm.avatar, role: createForm.role, city: createForm.city, branch: createForm.branch })}
                    className={`h-16 w-16 rounded-2xl bg-white border-2 border-emerald-500/40 flex items-center justify-center overflow-hidden shadow-xs shrink-0 ${createForm.avatar ? 'cursor-pointer hover:scale-105 transition-all' : ''}`}
                    title={createForm.avatar ? 'Fotoğrafı büyütmek için tıklayın' : undefined}
                  >
                    {createForm.avatar ? (
                      <img src={createForm.avatar} alt="Seçilen Fotoğraf" className="h-full w-full object-cover" />
                    ) : createForm.role === 'ADMIN' ? (
                      <Crown className="h-7 w-7 text-amber-500" />
                    ) : (
                      <User className="h-7 w-7 text-emerald-700" />
                    )}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">Profil Fotoğrafı (İsteğe Bağlı)</h4>
                    <p className="text-[11px] text-slate-500">Seçtiğiniz fotoğrafı dilediğiniz gibi kırpıp yakınlaştırabilirsiniz.</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    ref={fileInputCreateRef}
                    accept="image/*"
                    onChange={(e) => handleSelectImageFor(e, 'create')}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputCreateRef.current?.click()}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white hover:bg-emerald-50 border border-slate-300 hover:border-emerald-500 text-xs font-bold text-slate-800 transition-all cursor-pointer shadow-3xs"
                  >
                    <Camera className="h-3.5 w-3.5 text-emerald-600" />
                    <span>Fotoğraf Seç & Kırp</span>
                  </button>
                  {createForm.avatar && (
                    <button
                      type="button"
                      onClick={() => setCreateForm(prev => ({ ...prev, avatar: '' }))}
                      className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold cursor-pointer"
                      title="Fotoğrafı Kaldır"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
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
                    onChange={(e) => setCreateForm({ ...createForm, phone: formatPhoneNumber(e.target.value) })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-900 focus:bg-white focus:border-emerald-600 focus:outline-none font-mono"
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
                      onChange={(e) => setEditForm({ ...editForm, phone: formatPhoneNumber(e.target.value) })}
                      placeholder="+90 5XX XXX XX XX"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:bg-white focus:border-emerald-600 focus:outline-none font-mono"
                    />
                  </div>
                </div>

                {/* Avatar upload in edit form */}
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/90 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div 
                      onClick={() => editForm.avatar && handleOpenLightbox({ name: editForm.name, avatar: editForm.avatar, role: editForm.role, city: editForm.city, branch: editForm.branch })}
                      className={`h-12 w-12 rounded-xl bg-white border border-emerald-400 flex items-center justify-center overflow-hidden shrink-0 shadow-3xs ${editForm.avatar ? 'cursor-pointer hover:scale-105 transition-all' : ''}`}
                      title={editForm.avatar ? 'Fotoğrafı büyütmek için tıklayın' : undefined}
                    >
                      {editForm.avatar ? (
                        <img src={editForm.avatar} alt={editForm.name} className="h-full w-full object-cover" />
                      ) : (
                        <User className="h-6 w-6 text-emerald-700" />
                      )}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900">Profil Fotoğrafı</div>
                      <div className="text-[10px] text-slate-500">Değiştirmek için fotoğraf seçip kırpın.</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <input
                      type="file"
                      ref={fileInputEditRef}
                      accept="image/*"
                      onChange={(e) => handleSelectImageFor(e, 'edit')}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputEditRef.current?.click()}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white hover:bg-emerald-50 border border-slate-300 hover:border-emerald-500 text-xs font-bold text-slate-800 transition-all cursor-pointer shadow-3xs"
                    >
                      <Camera className="h-3.5 w-3.5 text-emerald-600" />
                      <span>Seç & Kırp</span>
                    </button>
                    {editForm.avatar && (
                      <button
                        type="button"
                        onClick={() => setEditForm(prev => ({ ...prev, avatar: '' }))}
                        className="p-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 cursor-pointer"
                        title="Fotoğrafı Kaldır"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
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
              <div className="py-12 text-center text-slate-400 space-y-2">
                <Users className="h-10 w-10 mx-auto text-slate-300" />
                <p className="text-xs font-bold text-slate-600">Arama kriterlerine uygun kullanıcı bulunamadı.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredUsers.map((user) => {
                  const isAdminRole = user.role?.toUpperCase() === 'ADMIN';

                  return (
                    <div
                      key={user.id}
                      onClick={() => handleOpenDetail(user)}
                      className="pearl-card rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-slate-200/90 shadow-2xs hover:shadow-lg hover:border-emerald-400 bg-white/95 backdrop-blur-sm cursor-pointer group relative overflow-hidden transition-all duration-300 hover:scale-[1.008]"
                    >
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        
                        {/* Sol Kısım: Avatar, İsim, Kullanıcı Adı ve Rol Rozeti */}
                        <div className="flex items-start sm:items-center gap-3.5 min-w-[260px]">
                          <div
                            onClick={(e) => handleOpenLightbox(user, e)}
                            className={`flex h-12 w-12 items-center justify-center rounded-2xl text-base font-black shadow-xs shrink-0 overflow-hidden transition-all duration-300 ${
                              user.avatarImage || user.avatar ? 'cursor-pointer hover:scale-110 hover:ring-2 hover:ring-emerald-500' : ''
                            } ${
                              isAdminRole ? 'bg-gradient-to-br from-amber-100 to-amber-50 text-amber-900 border border-amber-300' : 'bg-gradient-to-br from-emerald-100 to-emerald-50 text-emerald-900 border border-emerald-300'
                            }`}
                            title={user.avatarImage || user.avatar ? 'Fotoğrafı büyütmek için tıklayın' : undefined}
                          >
                            {user.avatarImage || user.avatar ? (
                              <img src={user.avatarImage || user.avatar} alt={user.name} className="h-full w-full object-cover" />
                            ) : isAdminRole ? (
                              <Crown className="h-6 w-6 text-amber-600" />
                            ) : (
                              <User className="h-6 w-6 text-emerald-700" />
                            )}
                          </div>

                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-extrabold text-sm text-slate-900 group-hover:text-emerald-900 transition-colors">
                                {user.name}
                              </h4>
                              {user.id === currentUser.id && (
                                <span className="text-[9px] font-extrabold bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full">Siz</span>
                              )}
                              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold shadow-3xs ${
                                isAdminRole
                                  ? 'bg-amber-100 text-amber-950 border border-amber-300'
                                  : 'bg-emerald-100 text-emerald-950 border border-emerald-300'
                              }`}>
                                {isAdminRole ? <Crown className="h-2.5 w-2.5 text-amber-700" /> : <User className="h-2.5 w-2.5 text-emerald-700" />}
                                <span>{isAdminRole ? 'Genel Merkez' : 'Satış Personeli'}</span>
                              </span>
                            </div>

                            <div className="text-[11px] text-slate-400 font-mono flex items-center gap-1.5">
                              <span>@{user.username}</span>
                            </div>
                          </div>
                        </div>

                        {/* Orta Kısım: Şube, İletişim, Şifre ve Durum Rozetleri */}
                        <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs">
                          {/* Şube Rozeti */}
                          <div className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200/80 font-bold text-slate-800 flex items-center gap-1.5 shadow-3xs">
                            <MapPin className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                            <span>{user.city || 'İstanbul'}</span>
                            <span className="text-slate-300">•</span>
                            <span className="text-slate-600 font-medium">{user.branch || 'Genel Merkez'}</span>
                          </div>

                          {/* İletişim */}
                          {user.phone && (
                            <div className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200/80 text-slate-700 flex items-center gap-1.5 shadow-3xs font-mono text-xs font-semibold">
                              <Phone className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                              <span>{user.phone}</span>
                            </div>
                          )}

                          {/* Şifre Rozeti */}
                          <div 
                            className="flex items-center gap-1.5 bg-slate-50 border border-slate-200/90 rounded-xl px-2.5 py-1 shadow-3xs" 
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Lock className="h-3 w-3 text-slate-400" />
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

                          {/* Durum Rozeti */}
                          <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-bold shadow-3xs ${
                            user.isActive !== false
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}>
                            {user.isActive !== false ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                            <span>{user.isActive !== false ? 'Aktif' : 'Duraklatıldı'}</span>
                          </span>
                        </div>

                        {/* Sağ Kısım: Detay & Düzenle Butonu */}
                        <div className="flex items-center justify-end gap-2 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenDetail(user);
                            }}
                            className="rounded-full px-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs transition-all cursor-pointer shadow-2xs hover:scale-105 flex items-center gap-1.5"
                          >
                            <span>Detay & Düzenle</span>
                            <span className="font-mono">➔</span>
                          </button>
                        </div>

                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 🖼️ Image Lightbox Modal */}
      <ImageLightboxModal
        isOpen={lightboxState.isOpen}
        imageSrc={lightboxState.imageSrc}
        userName={lightboxState.userName}
        userRole={lightboxState.userRole}
        userBranch={lightboxState.userBranch}
        onClose={() => setLightboxState(prev => ({ ...prev, isOpen: false }))}
      />

      {/* ✂️ Image Cropper Modal */}
      <ImageCropModal
        isOpen={cropState.isOpen}
        imageSrc={cropState.imageSrc}
        onClose={() => setCropState({ isOpen: false, imageSrc: null, target: null })}
        onConfirmCrop={handleConfirmCrop}
        title="Personel Fotoğrafını Kırp ve Hizala"
      />
    </div>
  );
}
