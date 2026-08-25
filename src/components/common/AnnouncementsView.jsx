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
  X
} from 'lucide-react';
import confetti from 'canvas-confetti';

export default function AnnouncementsView() {
  const { announcements, addAnnouncement, deleteAnnouncement, markAnnouncementsAsRead } = useData();
  const { currentUser, isAdmin } = useAuth();
  const { showConfirm } = useModal();

  // Mark all announcements as read when the user views the announcements page
  useEffect(() => {
    markAnnouncementsAsRead();
  }, [markAnnouncementsAsRead]);

  const [showAddModal, setShowAddModal] = useState(false);
  const [form, setForm] = useState({
    title: '',
    content: '',
    priority: 'normal', // 'urgent' | 'high' | 'normal'
    isPinned: false
  });

  const handleCreate = (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.content.trim()) return;

    addAnnouncement(form);
    setShowAddModal(false);
    setForm({ title: '', content: '', priority: 'normal', isPinned: false });

    confetti({
      particleCount: 40,
      spread: 60,
      origin: { y: 0.6 }
    });
  };

  const handleDelete = async (annId, annTitle) => {
    const confirmed = await showConfirm({
      title: 'Duyuruyu Sil',
      message: `"${annTitle}" başlıklı duyuruyu silmek istediğinize emin misiniz?`,
      details: 'Silinen duyuru tüm personelin ekranından kaldırılacaktır.',
      confirmText: 'Evet, Sil',
      cancelText: 'Vazgeç',
      confirmVariant: 'danger'
    });
    if (confirmed) {
      deleteAnnouncement(annId);
    }
  };

  return (
    <div className="space-y-6 pb-20">
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
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 rounded-2xl bg-emerald-500 hover:bg-emerald-400 px-5 py-3 text-xs font-black text-slate-950 shadow-lg shadow-emerald-900/30 transition-all cursor-pointer shrink-0"
            >
              <Plus className="h-4 w-4" />
              <span>Yeni Duyuru Yayınla</span>
            </button>
          )}
        </div>
      </div>

      {/* Announcements List */}
      <div className="space-y-4">
        {announcements.length === 0 ? (
          <div className="pearl-card rounded-3xl p-12 text-center text-slate-400 space-y-3">
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
                className={`pearl-card rounded-3xl p-6 sm:p-7 border transition-all ${
                  ann.isPinned 
                    ? 'border-amber-300 bg-gradient-to-br from-amber-50/40 via-white to-amber-50/20 shadow-md ring-2 ring-amber-400/20' 
                    : 'border-slate-200/90 hover:border-slate-300'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b border-slate-100">
                  <div className="space-y-1.5 flex-1">
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

                    <h3 className="text-base sm:text-lg font-bold text-slate-900 font-display">
                      {ann.title}
                    </h3>
                  </div>

                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => handleDelete(ann.id, ann.title)}
                      className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer shrink-0"
                      title="Duyuruyu Sil"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>

                <div className="pt-4 text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-line font-medium">
                  {ann.content}
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 font-medium">
                  <span className="flex items-center gap-1.5 text-emerald-800 font-semibold">
                    <User className="h-3.5 w-3.5 text-emerald-600" />
                    <span>Yayınlayan: {ann.author || 'Genel Merkez'}</span>
                  </span>
                  <span>İnzar Turizm Genel Yönetim</span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal: Yeni Duyuru Yayınla (Admin) */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-[560px] rounded-3xl bg-white p-6 sm:p-7 shadow-2xl border border-slate-200/90 animate-fade-scale">
            <button
              onClick={() => setShowAddModal(false)}
              className="absolute right-4 top-4 rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-3 mb-5 border-b border-slate-100 pb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-800">
                <Megaphone className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 font-display">Yeni Duyuru Yayınla</h3>
                <p className="text-xs text-slate-500">Tüm personelin ekranına anında yansıyacak duyuru metnini girin.</p>
              </div>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Duyuru Başlığı</label>
                <input
                  type="text"
                  required
                  placeholder="Örn: 2026 Ramazan Sezonu Otel Fiyatları Güncellendi"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-900 focus:bg-white focus:border-emerald-600 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Önem Derecesi</label>
                  <CustomSelect
                    value={form.priority}
                    onChange={(val) => setForm({ ...form, priority: val })}
                    options={[
                      { id: 'normal', label: 'Normal Bilgilendirme' },
                      { id: 'high', label: 'Önemli Duyuru' },
                      { id: 'urgent', label: 'Acil / Kritik Duyuru' },
                    ]}
                  />
                </div>

                <div className="flex items-center pt-6">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={form.isPinned}
                      onChange={(e) => setForm({ ...form, isPinned: e.target.checked })}
                      className="rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                    />
                    <span className="text-xs font-bold text-slate-800">Başa Sabitle (Öne Çıkar)</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Duyuru İçeriği</label>
                <textarea
                  required
                  rows="4"
                  placeholder="Duyurunun detaylarını buraya yazınız..."
                  value={form.content}
                  onChange={(e) => setForm({ ...form, content: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs text-slate-900 focus:bg-white focus:border-emerald-600 focus:outline-none leading-relaxed"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="rounded-xl px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-5 py-2.5 text-xs font-black text-white shadow-md shadow-emerald-600/25 transition-all cursor-pointer"
                >
                  <Send className="h-3.5 w-3.5" />
                  <span>Duyuruyu Yayınla</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
