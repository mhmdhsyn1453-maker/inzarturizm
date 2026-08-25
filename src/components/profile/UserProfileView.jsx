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
  Crown
} from 'lucide-react';
import confetti from 'canvas-confetti';

export default function UserProfileView() {
  const { currentUser, updateStaff, isAdmin } = useAuth();
  const { savedQuotes } = useData();
  const { showAlert } = useModal();
  const fileInputRef = useRef(null);

  const [form, setForm] = useState({
    name: currentUser?.name || '',
    username: currentUser?.username || '',
    city: currentUser?.city || 'İstanbul',
    branch: currentUser?.branch || (isAdmin ? 'Genel Merkez' : 'Fatih Şubesi'),
    phone: currentUser?.phone || '',
    email: currentUser?.email || '',
    avatarImage: currentUser?.avatarImage || null,
    password: ''
  });

  const [isSaved, setIsSaved] = useState(false);

  // User Stats
  const userQuotes = savedQuotes.filter(q => q.createdById === currentUser?.id || q.createdByName === currentUser?.name);
  const approvedQuotes = userQuotes.filter(q => q.status === 'approved' || q.status === 'approved_revised');
  const totalVolumeUSD = userQuotes.reduce((acc, q) => acc + (q.finalPriceUSD * (q.paxCount || 1)), 0);

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      showAlert({ title: 'Dosya Boyutu Yüksek', message: 'Lütfen 5MB altında bir profil resmi yükleyiniz.', type: 'error' });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setForm(prev => ({ ...prev, avatarImage: reader.result }));
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setForm(prev => ({ ...prev, avatarImage: null }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.username.trim()) return;

    const payload = {
      name: form.name.trim(),
      username: form.username.trim(),
      city: form.city.trim(),
      branch: form.branch.trim(),
      phone: form.phone.trim(),
      email: form.email.trim(),
      avatarImage: form.avatarImage
    };

    if (form.password.trim()) {
      payload.password = form.password.trim();
    }

    updateStaff(currentUser.id, payload);
    setIsSaved(true);

    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.6 }
    });

    setTimeout(() => setIsSaved(false), 3000);
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Top Banner */}
      <div className="pearl-card rounded-3xl p-6 sm:p-8 bg-gradient-to-r from-emerald-900 via-emerald-850 to-emerald-950 text-white shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="relative group">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white/10 backdrop-blur-md border-2 border-white/30 shadow-inner overflow-hidden">
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
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white border-2 border-emerald-500/40 shadow-md overflow-hidden ring-4 ring-emerald-500/10">
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
                  Fotoğraf yüklenmediğinde rolünüze uygun kurumsal vektör ikonu görüntülenir.
                </p>
              </div>
            </div>

            {/* Hidden File Input & Trigger Buttons */}
            <div className="flex items-center gap-2.5 shrink-0">
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                onChange={handleImageChange}
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

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Telefon Numarası</label>
              <div className="relative">
                <Phone className="h-4 w-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="+90 5XX XXX XX XX"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-3.5 py-2.5 text-xs font-semibold text-slate-900 focus:bg-white focus:border-emerald-600 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">E-Posta Adresi</label>
              <div className="relative">
                <Mail className="h-4 w-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="ornek@inzarturizm.com"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-3.5 py-2.5 text-xs font-semibold text-slate-900 focus:bg-white focus:border-emerald-600 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Password Change Section */}
          <div className="p-4 rounded-2xl bg-amber-50/50 border border-amber-200/80 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
              <Lock className="h-4 w-4 text-amber-600" />
              <span>Giriş Şifresini Güncelle (İsteğe Bağlı)</span>
            </div>
            <p className="text-[11px] text-amber-800/80">Şifrenizi değiştirmek istemiyorsanız bu alanı boş bırakabilirsiniz.</p>
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="Yeni Şifre Giriniz..."
              className="w-full max-w-sm bg-white border border-amber-300 rounded-xl px-3.5 py-2 text-xs font-mono font-bold text-slate-900 focus:border-emerald-600 focus:outline-none"
            />
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
    </div>
  );
}
