import React, { useState, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useModal } from '../../context/ModalContext';
import { 
  User, 
  ShieldCheck, 
  Key, 
  Phone, 
  Mail, 
  MapPin, 
  Building2, 
  Save, 
  CheckCircle2, 
  FileText, 
  DollarSign, 
  Calendar, 
  Clock, 
  Sparkles,
  Lock,
  Camera,
  Trash2,
  Upload,
  Crown,
  Eye,
  EyeOff,
  AlertCircle,
  Check
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { formatPhoneNumber } from '../../utils/phoneUtils';
import ImageCropModal from '../common/ImageCropModal';
import ImageLightboxModal from '../common/ImageLightboxModal';

export default function UserProfileView() {
  const { currentUser, updateStaff, isAdmin, users } = useAuth();
  const { savedQuotes } = useData();
  const { showAlert } = useModal();
  const fileInputRef = useRef(null);

  const [form, setForm] = useState({
    name: currentUser?.name || '',
    username: currentUser?.username || '',
    city: currentUser?.city || 'İstanbul',
    branch: currentUser?.branch || (isAdmin ? 'Genel Merkez' : 'Fatih Şubesi'),
    phone: currentUser?.phone ? formatPhoneNumber(currentUser.phone) : '',
    email: currentUser?.email || '',
    avatarImage: currentUser?.avatarImage || null,
  });

  // Image crop & lightbox modals
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  // Password Security Form State
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOldPass, setShowOldPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);

  const [isSaved, setIsSaved] = useState(false);

  // User Stats
  const userQuotes = savedQuotes.filter(q => q.createdById === currentUser?.id || q.createdByName === currentUser?.name);
  const approvedQuotes = userQuotes.filter(q => q.status === 'approved' || q.status === 'approved_revised');
  const totalVolumeUSD = userQuotes.reduce((acc, q) => acc + (q.finalPriceUSD * (q.paxCount || 1)), 0);

  // Password Strength Calculation (0 to 4)
  const calculateStrength = (pass) => {
    if (!pass) return { score: 0, label: 'Henüz girilmedi', color: 'bg-slate-200', textCol: 'text-slate-400', percent: 0 };
    let score = 0;
    if (pass.length >= 6) score++;
    if (pass.length >= 8) score++;
    if (/[A-Z]/.test(pass) && /[a-z]/.test(pass)) score++;
    if (/[0-9]/.test(pass)) score++;
    if (/[!@#$%^&*(),.?":{}|<>\-_]/.test(pass)) score++;

    if (score <= 1) {
      return { score: 1, label: 'Zayıf', color: 'bg-rose-500', textCol: 'text-rose-600', percent: 25 };
    } else if (score === 2 || score === 3) {
      return { score: 2, label: 'Orta Güçte', color: 'bg-amber-500', textCol: 'text-amber-600', percent: 50 };
    } else if (score === 4) {
      return { score: 3, label: 'Güçlü', color: 'bg-blue-500', textCol: 'text-blue-600', percent: 75 };
    } else {
      return { score: 4, label: 'Çok Güçlü & Güvenli 💎', color: 'bg-emerald-500', textCol: 'text-emerald-700', percent: 100 };
    }
  };

  const strength = calculateStrength(newPassword);

  const handleImageSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showAlert({ title: 'Geçersiz Dosya', message: 'Lütfen geçerli bir görsel dosyası seçiniz.', type: 'error' });
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setCropImageSrc(event.target?.result);
      setCropModalOpen(true);
    };
    reader.readAsDataURL(file);
    // Reset file input so same file can be selected again
    e.target.value = '';
  };

  const handleConfirmCrop = (croppedBase64) => {
    setForm(prev => ({ ...prev, avatarImage: croppedBase64 }));
  };

  const handleRemoveImage = () => {
    setForm(prev => ({ ...prev, avatarImage: null }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.username.trim()) {
      showAlert({ title: 'Eksik Bilgi', message: 'Ad Soyad ve Kullanıcı Adı boş bırakılamaz.', type: 'error' });
      return;
    }

    const payload = {
      name: form.name.trim(),
      username: form.username.trim(),
      city: form.city.trim(),
      branch: form.branch.trim(),
      phone: form.phone.trim(),
      email: form.email.trim(),
      avatarImage: form.avatarImage
    };

    // Password change validation
    if (oldPassword || newPassword || confirmPassword) {
      const activeUserRecord = users?.find(u => (currentUser?.id && u.id === currentUser.id) || (currentUser?.username && u.username.toLowerCase() === currentUser.username.toLowerCase()));
      const currentStoredPass = String(activeUserRecord?.password || currentUser?.password || '').trim();

      if (!oldPassword) {
        showAlert({ title: 'Mevcut Şifre Gerekli', message: 'Şifrenizi değiştirmek için lütfen mevcut (eski) şifrenizi giriniz.', type: 'error' });
        return;
      }

      if (oldPassword.trim() !== currentStoredPass) {
        showAlert({ title: 'Hatalı Mevcut Şifre', message: 'Girdiğiniz mevcut (eski) şifre doğru değil.', type: 'error' });
        return;
      }

      if (!newPassword || newPassword.length < 6) {
        showAlert({ title: 'Yetersiz Şifre', message: 'Yeni şifreniz en az 6 karakter uzunluğunda olmalıdır.', type: 'error' });
        return;
      }

      if (newPassword !== confirmPassword) {
        showAlert({ title: 'Şifreler Uyuşmuyor', message: 'Girdiğiniz yeni şifreler birbiriyle eşleşmiyor.', type: 'error' });
        return;
      }

      payload.password = newPassword.trim();
    }

    updateStaff(currentUser.id, payload);
    setIsSaved(true);
    setOldPassword('');
    setNewPassword('');
    setConfirmPassword('');

    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.6 }
    });

    showAlert({ title: 'Başarılı', message: 'Profil bilgileriniz ve şifreniz başarıyla güncellendi.', type: 'success' });
    setTimeout(() => setIsSaved(false), 3000);
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Top Banner */}
      <div className="pearl-card rounded-3xl p-6 sm:p-8 bg-gradient-to-r from-emerald-900 via-emerald-850 to-emerald-950 text-white shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="relative group">
              <div 
                onClick={() => form.avatarImage && setLightboxOpen(true)}
                className={`flex h-20 w-20 items-center justify-center rounded-full bg-white/10 backdrop-blur-md border-2 border-white/30 shadow-inner overflow-hidden ${
                  form.avatarImage ? 'cursor-pointer hover:scale-105 hover:ring-2 hover:ring-emerald-400 transition-all' : ''
                }`}
                title={form.avatarImage ? 'Büyütmek için tıklayın' : undefined}
              >
                {form.avatarImage ? (
                  <img src={form.avatarImage} alt={form.name} className="h-full w-full object-cover" />
                ) : isAdmin ? (
                  <Crown className="h-10 w-10 text-amber-400" />
                ) : (
                  <User className="h-10 w-10 text-emerald-300" />
                )}
              </div>
            </div>

            <div>
              <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-800/80 px-3 py-0.5 text-[11px] font-bold text-emerald-200 border border-emerald-700/60 mb-1">
                {isAdmin ? 'Genel Merkez Yöneticisi' : 'Satış & Teklif Personeli'}
              </div>
              <h2 className="text-2xl font-black font-display text-white">
                {currentUser?.name}
              </h2>
              <p className="text-xs text-emerald-200">
                @{currentUser?.username} • {currentUser?.city || 'İstanbul'} / {currentUser?.branch || 'Merkez'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs bg-emerald-800/50 px-4 py-2 rounded-2xl border border-emerald-700/50">
            <Clock className="h-4 w-4 text-amber-300 shrink-0" />
            <span>Son Giriş: <strong>{new Date().toLocaleTimeString()}</strong></span>
          </div>
        </div>
      </div>

      {/* Performance Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="pearl-card rounded-3xl p-5 border border-slate-200/90 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>Verilen Toplam Teklif</span>
            <FileText className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black font-mono text-slate-900">
            {userQuotes.length} <span className="text-xs font-sans text-slate-400 font-medium">Adet</span>
          </div>
          <div className="text-[11px] text-slate-400">Tarafınızdan oluşturulan teklifler</div>
        </div>

        <div className="pearl-card rounded-3xl p-5 border border-emerald-200 bg-emerald-50/40 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-xs font-semibold text-emerald-800">
            <span>Onaylanan Teklifler</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black font-mono text-emerald-950">
            {approvedQuotes.length} <span className="text-xs font-sans text-emerald-700 font-medium">Adet</span>
          </div>
          <div className="text-[11px] text-emerald-700">Merkezce onaylanan teklifler</div>
        </div>

        <div className="pearl-card rounded-3xl p-5 border border-slate-200/90 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>Toplam Potansiyel Ciro</span>
            <DollarSign className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black font-mono text-slate-900">
            ${totalVolumeUSD.toLocaleString('tr-TR')}
          </div>
          <div className="text-[11px] text-slate-400">Teklif verilen toplam hacim</div>
        </div>
      </div>

      {/* Profile Edit Form */}
      <div className="pearl-card rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm space-y-6">
        <div className="border-b border-slate-100 pb-4">
          <h3 className="text-lg font-bold text-slate-900 font-display">Profil & Hesap Bilgileri</h3>
          <p className="text-xs text-slate-500">Kişisel bilgilerinizi, profil fotoğrafınızı ve şifrenizi güncelleyebilirsiniz.</p>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          
          {/* Profil Fotoğrafı Yükleme Bölümü */}
          <div className="p-4 sm:p-5 rounded-3xl bg-slate-50 border border-slate-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div 
                  onClick={() => form.avatarImage && setLightboxOpen(true)}
                  className={`flex h-20 w-20 items-center justify-center rounded-full bg-white border-2 border-emerald-500/40 shadow-md overflow-hidden ring-4 ring-emerald-500/10 ${
                    form.avatarImage ? 'cursor-pointer hover:scale-105 hover:ring-emerald-500 transition-all' : ''
                  }`}
                  title={form.avatarImage ? 'Fotoğrafı büyütmek için tıklayın' : undefined}
                >
                  {form.avatarImage ? (
                    <img src={form.avatarImage} alt="Profil Önizleme" className="h-full w-full object-cover" />
                  ) : isAdmin ? (
                    <Crown className="h-10 w-10 text-amber-500" />
                  ) : (
                    <User className="h-10 w-10 text-emerald-700" />
                  )}
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold text-slate-900">Profil Fotoğrafı</h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Fotoğrafa tıklayarak tam boy inceleyebilir veya yeni fotoğraf yükleyebilirsiniz.
                </p>
              </div>
            </div>

            {/* Hidden File Input & Trigger Buttons */}
            <div className="flex items-center gap-2.5 shrink-0">
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                onChange={handleImageSelect}
                className="hidden"
              />

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-white hover:bg-emerald-50 border border-slate-300 hover:border-emerald-500 text-xs font-bold text-slate-800 hover:text-emerald-900 shadow-2xs transition-all cursor-pointer"
              >
                <Camera className="h-3.5 w-3.5 text-emerald-600" />
                <span>Fotoğraf Seç & Yükle</span>
              </button>

              {form.avatarImage && (
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  className="flex items-center gap-1 px-3 py-2 rounded-2xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-xs font-bold text-rose-700 transition-all cursor-pointer"
                  title="Fotoğrafı Kaldır ve Varsayılana Dön"
                >
                  <Trash2 className="h-3.5 w-3.5 text-rose-600" />
                  <span>Kaldır</span>
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Ad Soyad</label>
              <div className="relative">
                <User className="h-4 w-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-3.5 py-2.5 text-xs font-bold text-slate-900 focus:bg-white focus:border-emerald-600 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Kullanıcı Adı (Giriş İçin)</label>
              <div className="relative">
                <span className="text-slate-400 text-xs font-bold absolute left-3.5 top-3">@</span>
                <input
                  type="text"
                  required
                  value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3.5 py-2.5 text-xs font-bold text-slate-900 focus:bg-white focus:border-emerald-600 focus:outline-none font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Şehir / İl</label>
              <div className="relative">
                <MapPin className="h-4 w-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  placeholder="Örn: İstanbul"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-3.5 py-2.5 text-xs font-semibold text-slate-900 focus:bg-white focus:border-emerald-600 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Şube / Birim</label>
              <div className="relative">
                <Building2 className="h-4 w-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  value={form.branch}
                  onChange={(e) => setForm({ ...form, branch: e.target.value })}
                  placeholder="Örn: Fatih Şubesi"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-3.5 py-2.5 text-xs font-semibold text-slate-900 focus:bg-white focus:border-emerald-600 focus:outline-none"
                />
              </div>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">Telefon Numarası</label>
              <div className="relative">
                <Phone className="h-4 w-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: formatPhoneNumber(e.target.value) })}
                  placeholder="+90 5XX XXX XX XX"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-3.5 py-2.5 text-xs font-semibold text-slate-900 focus:bg-white focus:border-emerald-600 focus:outline-none font-mono"
                />
              </div>
            </div>
          </div>

          {/* ══════════════════════════════════════════════════════════════
              🔒 ADVANCED PASSWORD CHANGE & STRENGTH METER (3-STAGE)
             ══════════════════════════════════════════════════════════════ */}
          <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-slate-50 to-emerald-50/30 border border-slate-200/90 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200/70 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-amber-100 text-amber-900 border border-amber-300">
                  <Key className="h-4 w-4 text-amber-700" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Güvenlik & Şifre Değiştirme</h4>
                  <p className="text-[11px] text-slate-500">Şifrenizi değiştirmek için mevcut şifrenizi ve yeni şifrenizi giriniz.</p>
                </div>
              </div>
              <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100/80 px-2.5 py-1 rounded-full border border-emerald-300">
                256-Bit Güvenlik
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* 1. Eski Şifre */}
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-700">Mevcut (Eski) Şifreniz</label>
                <div className="relative">
                  <input
                    type={showOldPass ? 'text' : 'password'}
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    placeholder="Mevcut şifreniz..."
                    className="w-full bg-white border border-slate-300 rounded-xl pl-3.5 pr-9 py-2.5 text-xs font-mono font-bold text-slate-900 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/10 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowOldPass(!showOldPass)}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                  >
                    {showOldPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* 2. Yeni Şifre */}
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-700">Yeni Şifre</label>
                <div className="relative">
                  <input
                    type={showNewPass ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Yeni şifreniz (min 6)..."
                    className="w-full bg-white border border-slate-300 rounded-xl pl-3.5 pr-9 py-2.5 text-xs font-mono font-bold text-slate-900 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/10 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPass(!showNewPass)}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                  >
                    {showNewPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* 3. Yeni Şifre Tekrarı */}
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-700">Yeni Şifre (Tekrar)</label>
                <div className="relative">
                  <input
                    type={showConfirmPass ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Şifreyi tekrar yazın..."
                    className="w-full bg-white border border-slate-300 rounded-xl pl-3.5 pr-9 py-2.5 text-xs font-mono font-bold text-slate-900 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/10 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPass(!showConfirmPass)}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                  >
                    {showConfirmPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>

            {/* 📊 Canlı Şifre Güvenlik & Güç Ölçeri */}
            {newPassword.length > 0 && (
              <div className="p-3 rounded-2xl bg-white border border-slate-200 space-y-2 animate-slide-down">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-slate-600 flex items-center gap-1.5">
                    <span>Şifre Gücü Seviyesi:</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] ${strength.textCol} font-extrabold bg-slate-100`}>
                      {strength.label}
                    </span>
                  </span>
                  <span className="font-mono text-slate-400 text-[11px]">%{strength.percent}</span>
                </div>

                {/* Progress Bar */}
                <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-300 ${strength.color}`} 
                    style={{ width: `${strength.percent}%` }}
                  />
                </div>

                {/* Match Indicator */}
                {confirmPassword.length > 0 && (
                  <div className={`text-[11px] font-bold flex items-center gap-1.5 pt-1 ${
                    newPassword === confirmPassword ? 'text-emerald-700' : 'text-rose-600'
                  }`}>
                    {newPassword === confirmPassword ? (
                      <>
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                        <span>Yeni şifreler eşleşiyor ✓</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="h-3.5 w-3.5 text-rose-600" />
                        <span>Yeni şifreler henüz eşleşmedi!</span>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="submit"
              className="flex items-center gap-2 rounded-2xl bg-emerald-600 hover:bg-emerald-700 px-6 py-3 text-xs font-black text-white shadow-lg shadow-emerald-600/25 transition-all cursor-pointer"
            >
              {isSaved ? <CheckCircle2 className="h-4 w-4" /> : <Save className="h-4 w-4" />}
              <span>{isSaved ? 'Bilgiler Kaydedildi!' : 'Profil Bilgilerini Kaydet'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* 🖼️ Image Lightbox Modal */}
      <ImageLightboxModal
        isOpen={lightboxOpen}
        imageSrc={form.avatarImage}
        userName={form.name}
        userRole={isAdmin ? 'Genel Merkez Yöneticisi' : 'Satış Personeli'}
        userBranch={`${form.city} / ${form.branch}`}
        onClose={() => setLightboxOpen(false)}
      />

      {/* ✂️ Image Cropper Modal */}
      <ImageCropModal
        isOpen={cropModalOpen}
        imageSrc={cropImageSrc}
        onClose={() => {
          setCropModalOpen(false);
          setCropImageSrc(null);
        }}
        onConfirmCrop={handleConfirmCrop}
        title="Profil Fotoğrafını Kırp ve Hizala"
      />
    </div>
  );
}
