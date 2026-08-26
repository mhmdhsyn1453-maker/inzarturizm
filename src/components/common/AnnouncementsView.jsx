import React, { useState, useEffect } from 'react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { useModal } from '../../context/ModalContext';
import CustomSelect from '../common/CustomSelect';
import { 
  Megaphone, 
  Plus, 
  Pin, 
  Trash2, 
  Calendar, 
  User, 
  AlertCircle, 
  CheckCircle2, 
  Info, 
  Clock, 
  Send, 
  ArrowLeft, 
  Sparkles, 
  Eye, 
  FileText, 
  ShieldAlert, 
  Bell,
  ChevronRight,
  Bookmark,
  Share2,
  Check
} from 'lucide-react';
import confetti from 'canvas-confetti';

export default function AnnouncementsView() {
  const { announcements, addAnnouncement, deleteAnnouncement, markAnnouncementsAsRead } = useData();
  const { currentUser, isAdmin } = useAuth();
  const { showConfirm } = useModal();

  const [viewMode, setViewMode] = useState(() => {
    try {
      return sessionStorage.getItem('inzar_announcement_view_mode') || 'list';
    } catch { return 'list'; }
  }); // 'list' | 'create' | 'detail'
  const [selectedAnnId, setSelectedAnnId] = useState(null);
  const [slideDirection, setSlideDirection] = useState('right'); // 'right' | 'left'
  
  const [form, setForm] = useState(() => {
    try {
      const draft = sessionStorage.getItem('inzar_draft_announcement');
      if (draft) return JSON.parse(draft);
    } catch {}
    return {
      title: '',
      content: '',
      priority: 'normal', // 'urgent' | 'high' | 'normal'
      isPinned: false,
      author: currentUser?.name ? `${currentUser.name} (Genel Merkez)` : 'İnzar Genel Merkez'
    };
  });

  useEffect(() => {
    try {
      sessionStorage.setItem('inzar_announcement_view_mode', viewMode);
    } catch {}
  }, [viewMode]);

  useEffect(() => {
    try {
      sessionStorage.setItem('inzar_draft_announcement', JSON.stringify(form));
    } catch {}
  }, [form]);

  // Mark all announcements as read when the user views the announcements page
  useEffect(() => {
    markAnnouncementsAsRead();
  }, [markAnnouncementsAsRead]);

  const openCreatePage = () => {
    setSlideDirection('right');
    setViewMode('create');
  };

  const openDetailPage = (ann) => {
    setSelectedAnnId(ann.id);
    setSlideDirection('right');
    setViewMode('detail');
  };

  const backToListPage = () => {
    setSlideDirection('left');
    setViewMode('list');
  };

  const handleCreate = (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.content.trim()) return;

    addAnnouncement({
      title: form.title.trim(),
      content: form.content.trim(),
      priority: form.priority,
      isPinned: form.isPinned,
      author: form.author || 'Genel Merkez'
    });

    sessionStorage.removeItem('inzar_draft_announcement');
    setSlideDirection('left');
    setViewMode('list');
    setForm({ 
      title: '', 
      content: '', 
      priority: 'normal', 
      isPinned: false,
      author: currentUser?.name ? `${currentUser.name} (Genel Merkez)` : 'İnzar Genel Merkez'
    });

    confetti({
      particleCount: 50,
      spread: 70,
      origin: { y: 0.6 }
    });
  };

  const handleDelete = async (annId, annTitle, fromDetail = false) => {
    const confirmed = await showConfirm({
      title: 'Duyuruyu Sil',
      message: `"${annTitle}" başlıklı duyuruyu silmek istediğinize emin misiniz?`,
      details: 'Silinen duyuru tüm personelin ekranından ve bildirim havuzundan anında kaldırılacaktır.',
      confirmText: 'Evet, Sil',
      cancelText: 'Vazgeç',
      confirmVariant: 'danger'
    });
    if (confirmed) {
      deleteAnnouncement(annId);
      if (fromDetail) {
        backToListPage();
      }
    }
  };

  const selectedAnnouncement = announcements.find(a => a.id === selectedAnnId);

  // ══════════════════════════════════════════════════════════════
  // 1. VIEW: FULL-PAGE CREATE ANNOUNCEMENT (YENİ DUYURU YAYINLA)
  // ══════════════════════════════════════════════════════════════
  if (viewMode === 'create') {
    const isUrgent = form.priority === 'urgent';
    const isHigh = form.priority === 'high';

    return (
      <div 
        key="announcement-create"
        className={`${slideDirection === 'left' ? 'animate-slide-from-left' : 'animate-slide-from-right'} space-y-6 pb-20`}
      >
        {/* Top Header Banner (Sağdaki gereksiz buton kaldırıldı) */}
        <div className="pearl-card rounded-3xl p-6 sm:p-8 bg-gradient-to-r from-emerald-900 via-emerald-850 to-emerald-950 text-white shadow-xl">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={backToListPage}
              className="p-3 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/20 text-white transition-all cursor-pointer shadow-sm hover:scale-105 active:scale-95 shrink-0"
              title="Listeye Geri Dön"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[11px] font-extrabold bg-amber-400/20 text-amber-300 border border-amber-400/30 mb-1">
                <Megaphone className="h-3.5 w-3.5 text-amber-400" />
                <span>YENİ SİRKÜLER & DUYURU OLUŞTURUCU</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black font-display tracking-tight text-white">
                Yeni Kurumsal Duyuru Yayınla
              </h2>
              <p className="text-xs sm:text-sm text-emerald-100/85 max-w-2xl mt-0.5">
                Yayınlanan duyuru tüm personellerin ekranlarına anında gerçek zamanlı (Hot-Reload) olarak iletilir.
              </p>
            </div>
          </div>
        </div>

        {/* Main Create Form Card */}
        <div className="pearl-card rounded-3xl p-6 sm:p-8 bg-white border border-slate-200/90 shadow-sm">
          <form onSubmit={handleCreate} className="space-y-6">
            
            {/* 1. Başlık & Temel Ayarlar */}
            <div className="space-y-4">
              <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2 font-display">
                  <FileText className="h-4 w-4 text-emerald-600" />
                  <span>Duyuru Başlığı ve Öncelik Kriterleri</span>
                </h3>
                <span className="text-[11px] text-slate-400 font-bold">Zorunlu Alanlar (*)</span>
              </div>

              {/* Title Input */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-800">
                  Duyuru Başlığı <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Örn: 2026 Ramazan Sezonu Otel ve Transfer Fiyatları Güncellendi"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-bold text-slate-900 focus:bg-white focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 shadow-2xs transition-all"
                />
              </div>

              {/* Priority & Pinned & Author Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
                
                {/* Priority Selector */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-800">
                    Önem Derecesi & Bildirim Tipi
                  </label>
                  <CustomSelect
                    value={form.priority}
                    onChange={(val) => setForm({ ...form, priority: val })}
                    options={[
                      { value: 'normal', label: 'ℹ️ Normal Bilgilendirme' },
                      { value: 'high', label: '⚠️ Önemli Sirküler' },
                      { value: 'urgent', label: '🚨 Acil / Kritik Operasyon' },
                    ]}
                    className="text-xs font-bold"
                  />
                </div>

                {/* Author Input */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-800">
                    Yayınlayan Yetkili / Birim
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={form.author}
                      onChange={(e) => setForm({ ...form, author: e.target.value })}
                      placeholder="Örn: İnzar Turizm Genel Yönetim"
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 text-xs font-semibold text-slate-900 focus:bg-white focus:border-emerald-600 focus:outline-none shadow-2xs"
                    />
                  </div>
                </div>

                {/* Pin Card Toggle */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-800">
                    Sabitleme Durumu
                  </label>
                  <label className={`flex items-center gap-3 p-2.5 rounded-2xl border cursor-pointer select-none transition-all ${
                    form.isPinned 
                      ? 'bg-amber-50/80 border-amber-300 text-amber-950 ring-2 ring-amber-400/20' 
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100/80'
                  }`}>
                    <input
                      type="checkbox"
                      checked={form.isPinned}
                      onChange={(e) => setForm({ ...form, isPinned: e.target.checked })}
                      className="rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                    />
                    <div className="min-w-0">
                      <span className="text-xs font-extrabold flex items-center gap-1.5">
                        <Pin className={`h-3.5 w-3.5 ${form.isPinned ? 'text-amber-600' : 'text-slate-400'}`} />
                        <span>Başa Sabitle (Öne Çıkar)</span>
                      </span>
                      <span className="text-[10px] text-slate-500 block truncate">Her zaman listenin en üstünde durur</span>
                    </div>
                  </label>
                </div>

              </div>
            </div>

            {/* 2. Duyuru İçeriği Metin Alanı */}
            <div className="space-y-2 pt-2">
              <div className="border-b border-slate-100 pb-2 flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-800">
                  Duyuru Metni & Detaylı Açıklama <span className="text-rose-500">*</span>
                </label>
                <span className="text-[11px] text-slate-400">Satır başları ve maddeler korunur</span>
              </div>
              <textarea
                required
                rows="7"
                placeholder="Duyurunun tüm operasyonel detaylarını, geçerlilik tarihlerini veya önemli notlarını buraya yazınız..."
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs sm:text-sm font-medium text-slate-900 focus:bg-white focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 leading-relaxed shadow-2xs transition-all"
              />
            </div>

            {/* 3. Canlı Önizleme Kartı (Live Preview) */}
            {form.title && (
              <div className="space-y-2 pt-3">
                <div className="flex items-center gap-2 text-xs font-extrabold text-slate-500 uppercase tracking-wider">
                  <Eye className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Personel Ekranındaki Canlı Görünüm Önizlemesi</span>
                </div>
                
                <div className={`pearl-card rounded-3xl p-6 border transition-all ${
                  form.isPinned 
                    ? 'border-amber-300 bg-gradient-to-br from-amber-50/40 via-white to-amber-50/20 shadow-md ring-2 ring-amber-400/20' 
                    : 'border-slate-200/90 bg-white shadow-2xs'
                }`}>
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-3 border-b border-slate-100">
                    <div className="space-y-1.5 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {form.isPinned && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-900 border border-amber-300">
                            <Pin className="h-3 w-3" />
                            <span>Başa Sabitlendi</span>
                          </span>
                        )}

                        {isUrgent ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-100 text-rose-900 border border-rose-300">
                            <AlertCircle className="h-3 w-3" />
                            <span>ACİL</span>
                          </span>
                        ) : isHigh ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-900 border border-amber-300">
                            <AlertCircle className="h-3 w-3" />
                            <span>Önemli</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-slate-100 text-slate-700 border border-slate-200">
                            <Info className="h-3 w-3" />
                            <span>Bilgilendirme</span>
                          </span>
                        )}

                        <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" />
                          <span>Bugün (Şimdi)</span>
                        </span>
                      </div>

                      <h3 className="text-base sm:text-lg font-bold text-slate-900 font-display">
                        {form.title}
                      </h3>
                    </div>
                  </div>

                  <div className="pt-3 text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-line font-medium">
                    {form.content || 'Duyuru metni buraya gelecektir...'}
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 font-medium">
                    <span className="flex items-center gap-1.5 text-emerald-800 font-semibold">
                      <User className="h-3.5 w-3.5 text-emerald-600" />
                      <span>Yayınlayan: {form.author || 'Genel Merkez'}</span>
                    </span>
                    <span>İnzar Turizm Genel Yönetim</span>
                  </div>
                </div>
              </div>
            )}

            {/* Form Footer Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-5 border-t border-slate-100">
              <button
                type="button"
                onClick={backToListPage}
                className="rounded-2xl px-6 py-3 text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Vazgeç
              </button>

              <button
                type="submit"
                className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-700 to-emerald-800 hover:from-emerald-600 hover:to-emerald-700 px-7 py-3 text-xs font-black text-white shadow-lg shadow-emerald-800/30 transition-all cursor-pointer hover:scale-102 active:scale-98"
              >
                <Send className="h-4 w-4" />
                <span>Duyuruyu Yayınla ve Personellere İlet</span>
              </button>
            </div>

          </form>
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════
  // 2. VIEW: IN-DEPTH ANNOUNCEMENT DETAIL & PREVIEW PAGE (DUYURU İNCELEME)
  // ══════════════════════════════════════════════════════════════
  if (viewMode === 'detail' && selectedAnnouncement) {
    const isUrgent = selectedAnnouncement.priority === 'urgent';
    const isHigh = selectedAnnouncement.priority === 'high';

    return (
      <div 
        key={`announcement-detail-${selectedAnnouncement.id}`}
        className={`${slideDirection === 'left' ? 'animate-slide-from-left' : 'animate-slide-from-right'} space-y-6 pb-20`}
      >
        {/* Top Header Banner with Back Button */}
        <div className="pearl-card rounded-3xl p-6 sm:p-8 bg-gradient-to-r from-emerald-900 via-emerald-850 to-emerald-950 text-white shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={backToListPage}
                className="p-3 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/20 text-white transition-all cursor-pointer shadow-sm hover:scale-105 active:scale-95 shrink-0"
                title="Duyuru Listesine Geri Dön"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[11px] font-extrabold bg-emerald-400/20 text-emerald-300 border border-emerald-400/30 mb-1">
                  <FileText className="h-3.5 w-3.5 text-emerald-300" />
                  <span>RESMİ MERKEZ SİRKÜLERİ & DUYURU DETAYI</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black font-display tracking-tight text-white line-clamp-1">
                  {selectedAnnouncement.title}
                </h2>
                <p className="text-xs text-emerald-200 mt-0.5 flex items-center gap-2">
                  <span>Yayın Tarihi: {selectedAnnouncement.date || 'Bugün'}</span>
                  <span>•</span>
                  <span>Yetkili: {selectedAnnouncement.author || 'Genel Merkez'}</span>
                </p>
              </div>
            </div>

            {isAdmin && (
              <button
                type="button"
                onClick={() => handleDelete(selectedAnnouncement.id, selectedAnnouncement.title, true)}
                className="flex items-center gap-2 rounded-2xl bg-rose-600/80 hover:bg-rose-600 text-white text-xs font-bold px-4 py-2.5 border border-rose-500 shadow-md transition-all cursor-pointer shrink-0 self-start sm:self-auto"
              >
                <Trash2 className="h-4 w-4" />
                <span>Duyuruyu Sil</span>
              </button>
            )}
          </div>
        </div>

        {/* Official Sirküler Document Card */}
        <div className="pearl-card rounded-3xl p-6 sm:p-10 bg-white border border-slate-200/90 shadow-md space-y-6">
          
          {/* Header Row: Badges, Date & Pinned */}
          <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-slate-100">
            <div className="flex flex-wrap items-center gap-2.5">
              {selectedAnnouncement.isPinned && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-amber-100 text-amber-900 border border-amber-300 shadow-3xs">
                  <Pin className="h-3.5 w-3.5 text-amber-700" />
                  <span>Başa Sabitlendi</span>
                </span>
              )}

              {isUrgent ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-rose-100 text-rose-900 border border-rose-300 shadow-3xs">
                  <AlertCircle className="h-3.5 w-3.5 text-rose-600" />
                  <span>ACİL / KRİTİK OPERASYON</span>
                </span>
              ) : isHigh ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-amber-100 text-amber-900 border border-amber-300 shadow-3xs">
                  <AlertCircle className="h-3.5 w-3.5 text-amber-600" />
                  <span>Önemli Sirküler</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-slate-100 text-slate-700 border border-slate-200 shadow-3xs">
                  <Info className="h-3.5 w-3.5 text-slate-500" />
                  <span>Bilgilendirme</span>
                </span>
              )}
            </div>

            <div className="flex items-center gap-3 text-xs text-slate-500 font-medium">
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4 text-slate-400" />
                <span>{selectedAnnouncement.date || 'Bugün'}</span>
              </span>
              <span>•</span>
              <span className="flex items-center gap-1 font-semibold text-emerald-800">
                <User className="h-4 w-4 text-emerald-600" />
                <span>{selectedAnnouncement.author || 'Genel Merkez'}</span>
              </span>
            </div>
          </div>

          {/* Sirküler Full Title */}
          <div className="space-y-2">
            <h1 className="text-xl sm:text-3xl font-black font-display text-slate-900 tracking-tight leading-snug">
              {selectedAnnouncement.title}
            </h1>
          </div>

          {/* Sirküler Detailed Content Paper Area */}
          <div className="bg-slate-50/70 p-6 sm:p-8 rounded-2xl border border-slate-200/80 space-y-4">
            <div className="text-sm sm:text-base text-slate-800 leading-relaxed font-medium whitespace-pre-line select-text">
              {selectedAnnouncement.content}
            </div>
          </div>

          {/* Official Verification Seal & Footer */}
          <div className="pt-6 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs text-slate-500">
            <div className="flex items-center gap-2.5 text-emerald-900 font-bold bg-emerald-50 px-4 py-2.5 rounded-2xl border border-emerald-200/80 shadow-3xs">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>İnzar Turizm Genel Yönetim Bilgilendirme Sistemi Tebliği</span>
            </div>

            <button
              type="button"
              onClick={backToListPage}
              className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-all cursor-pointer self-start sm:self-auto"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Tüm Duyurulara Geri Dön</span>
            </button>
          </div>

        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════
  // 3. VIEW: ANNOUNCEMENTS LIST PAGE (DUYURULAR LİSTESİ)
  // ══════════════════════════════════════════════════════════════
  return (
    <div 
      key="announcement-list"
      className={`${slideDirection === 'left' ? 'animate-slide-from-left' : 'animate-slide-from-right'} space-y-6 pb-20`}
    >
      {/* Top Banner */}
      <div className="pearl-card rounded-3xl p-6 sm:p-8 bg-gradient-to-r from-emerald-900 via-emerald-850 to-emerald-950 text-white shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-800/80 px-3 py-1 text-xs font-bold text-emerald-200 border border-emerald-700/60">
              <Megaphone className="h-3.5 w-3.5 text-amber-400" />
              <span>KURUMSAL İLETİŞİM & BİLGİLENDİRME</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black font-display tracking-tight text-white">
              Merkez Duyuruları & Sirkülerler
            </h2>
            <p className="text-xs sm:text-sm text-emerald-100/90 max-w-2xl">
              Genel Merkez tarafından yayınlanan tarife değişiklikleri, operasyonel hatırlatmalar ve önemli duyuruları buradan takip edebilirsiniz.
            </p>
          </div>

          {isAdmin && (
            <button
              type="button"
              onClick={openCreatePage}
              className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 px-6 py-3.5 text-xs font-black text-slate-950 shadow-lg shadow-emerald-950/40 transition-all cursor-pointer shrink-0 hover:scale-102 active:scale-98"
            >
              <Plus className="h-4 w-4 stroke-[3]" />
              <span>Yeni Duyuru Yayınla</span>
            </button>
          )}
        </div>
      </div>

      {/* Announcements List with Clickable Cards */}
      <div className="space-y-4">
        {announcements.length === 0 ? (
          <div className="pearl-card rounded-3xl p-12 text-center text-slate-400 space-y-3 bg-white border border-slate-200/90 shadow-2xs">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
              <Megaphone className="h-8 w-8" />
            </div>
            <h4 className="text-base font-bold text-slate-700">Henüz Yayınlanmış Duyuru Yok</h4>
            <p className="text-xs text-slate-500">Merkez tarafından yeni bir bildirim yapıldığında burada listelenecektir.</p>
          </div>
        ) : (
          announcements.map((ann) => {
            const isUrgent = ann.priority === 'urgent';
            const isHigh = ann.priority === 'high';

            return (
              <div 
                key={ann.id}
                onClick={() => openDetailPage(ann)}
                className={`pearl-card rounded-3xl p-6 sm:p-7 border transition-all cursor-pointer group hover:scale-[1.008] hover:shadow-lg ${
                  ann.isPinned 
                    ? 'border-amber-300 bg-gradient-to-br from-amber-50/40 via-white to-amber-50/20 shadow-md ring-2 ring-amber-400/20 hover:border-amber-400' 
                    : 'border-slate-200/90 bg-white hover:border-emerald-400 shadow-2xs'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b border-slate-100">
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      {ann.isPinned && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-900 border border-amber-300">
                          <Pin className="h-3 w-3" />
                          <span>Başa Sabitlendi</span>
                        </span>
                      )}

                      {isUrgent ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-100 text-rose-900 border border-rose-300">
                          <AlertCircle className="h-3 w-3" />
                          <span>ACİL</span>
                        </span>
                      ) : isHigh ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-900 border border-amber-300">
                          <AlertCircle className="h-3 w-3" />
                          <span>Önemli</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-slate-100 text-slate-700 border border-slate-200">
                          <Info className="h-3 w-3" />
                          <span>Bilgilendirme</span>
                        </span>
                      )}

                      <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        <span>{ann.date}</span>
                      </span>
                    </div>

                    <h3 className="text-base sm:text-lg font-bold text-slate-900 font-display group-hover:text-emerald-700 transition-colors">
                      {ann.title}
                    </h3>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
                    <span className="hidden sm:inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full group-hover:bg-emerald-100 transition-all">
                      <span>Detayı Oku</span>
                      <ChevronRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
                    </span>

                    {isAdmin && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(ann.id, ann.title);
                        }}
                        className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                        title="Duyuruyu Sil"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="pt-4 text-xs sm:text-sm text-slate-600 leading-relaxed font-medium line-clamp-2">
                  {ann.content}
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 font-medium">
                  <span className="flex items-center gap-1.5 text-emerald-800 font-semibold">
                    <User className="h-3.5 w-3.5 text-emerald-600" />
                    <span>Yayınlayan: {ann.author || 'Genel Merkez'}</span>
                  </span>
                  <span className="text-emerald-700 font-bold group-hover:underline flex items-center gap-1">
                    <span>Detaylıca Gör</span>
                    <ChevronRight className="h-3 w-3" />
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
