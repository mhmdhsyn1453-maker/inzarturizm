import React, { useState, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { useModal } from '../../context/ModalContext';
import { generateWhatsAppMessage } from '../../services/pdfService';
import QuotationPdfModal from '../pdf/QuotationPdfModal';
import { 
  FileText, 
  Search, 
  Trash2, 
  Send, 
  Download, 
  Calendar, 
  User, 
  Phone, 
  DollarSign,
  CheckCircle2,
  Edit3,
  Sparkles,
  Filter,
  Layers,
  Clock,
  ThumbsUp,
  AlertCircle
} from 'lucide-react';
import confetti from 'canvas-confetti';

export default function SavedQuotesList({ onEditQuote }) {
  const { savedQuotes, deleteQuote, updateQuoteStatus, setEditingQuote } = useData();
  const { currentUser, isAdmin } = useAuth();
  const { showConfirm, showAlert } = useModal();

  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'approved' | 'revised' | 'pending'
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedQuoteForPdf, setSelectedQuoteForPdf] = useState(null);

  // Status counts
  const approvedCount = savedQuotes.filter(q => q.status === 'approved' || q.status === 'approved_revised').length;
  const revisedCount = savedQuotes.filter(q => q.status === 'revised' || q.status === 'approved_revised' || (q.revisionCount && q.revisionCount > 0)).length;
  const pendingCount = savedQuotes.filter(q => !q.status || q.status === 'pending').length;

  const filteredQuotes = useMemo(() => {
    return savedQuotes.filter(q => {
      // Filter by status tab
      if (statusFilter === 'approved' && q.status !== 'approved' && q.status !== 'approved_revised') return false;
      if (statusFilter === 'revised' && q.status !== 'revised' && q.status !== 'approved_revised' && (!q.revisionCount || q.revisionCount === 0)) return false;
      if (statusFilter === 'pending' && q.status && q.status !== 'pending') return false;

      // Filter by search
      const term = searchTerm.toLowerCase();
      const matchSearch = 
        (q.customerName && q.customerName.toLowerCase().includes(term)) ||
        (q.packageName && q.packageName.toLowerCase().includes(term)) ||
        (q.customerPhone && q.customerPhone.includes(term)) ||
        (q.createdByName && q.createdByName.toLowerCase().includes(term)) ||
        (q.id && q.id.toLowerCase().includes(term));
      return matchSearch;
    });
  }, [savedQuotes, searchTerm, statusFilter]);

  const totalVolumeUSD = useMemo(() => {
    return savedQuotes.reduce((acc, q) => acc + (q.finalPriceUSD * (q.paxCount || 1)), 0);
  }, [savedQuotes]);

  const handleWhatsApp = (quote) => {
    const encoded = generateWhatsAppMessage(quote);
    const phone = quote.customerPhone ? quote.customerPhone.replace(/[^0-9]/g, '') : '';
    const url = phone ? `https://wa.me/${phone}?text=${encoded}` : `https://api.whatsapp.com/send?text=${encoded}`;
    window.open(url, '_blank');
  };

  const handleApproveQuote = async (quote) => {
    const confirmed = await showConfirm({
      title: 'Teklifi Onayla (Satışa Dönüştür)',
      message: `${quote.customerName || 'Misafir'} adına verilen ${quote.packageName} (${quote.finalPriceUSD} USD) teklifi MÜŞTERİ TARAFINDAN ONAYLANDI olarak işaretlensin mi?`,
      details: 'Onaylanan teklifler Genel Merkezin önüne kesinleşen satış olarak anında düşer.',
      confirmText: 'Evet, Müşteri Onayladı',
      cancelText: 'Vazgeç',
      confirmVariant: 'emerald'
    });

    if (confirmed) {
      updateQuoteStatus(quote.id, 'approved', 'Müşteri teklifi kabul etti.');
      confetti({
        particleCount: 60,
        spread: 70,
        origin: { y: 0.6 }
      });
    }
  };

  const handleEditClick = (quote) => {
    setEditingQuote(quote);
    if (onEditQuote) {
      onEditQuote(quote);
    }
  };

  return (
    <div className="space-y-6 pb-20">
      
      {/* Top Banner */}
      <div className="pearl-card rounded-3xl p-6 sm:p-8 bg-gradient-to-r from-emerald-900 via-emerald-850 to-emerald-950 text-white shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-800/80 px-3 py-1 text-xs font-bold text-emerald-200 border border-emerald-700/60">
              <FileText className="h-3.5 w-3.5 text-amber-400" />
              <span>TEKLİF & SATIŞ PORTFÖYÜ</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black font-display tracking-tight text-white">
              Verilen Teklifler & Durum Takibi
            </h2>
            <p className="text-xs sm:text-sm text-emerald-100/90 max-w-2xl">
              Personellerin oluşturduğu teklifleri listeleyin, müşteri onaylarını kaydedin ve sonradan revize edilen teklifleri anlık takip edin.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs bg-emerald-800/60 px-4 py-2.5 rounded-2xl border border-emerald-700/60 font-mono text-emerald-200 shrink-0">
            <DollarSign className="h-4 w-4 text-amber-400" />
            <span>Toplam Portföy: <strong>${totalVolumeUSD.toLocaleString()} USD</strong></span>
          </div>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="pearl-card rounded-3xl p-5 border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500">
            <span>Toplam Teklif</span>
            <FileText className="h-4 w-4 text-slate-400" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900 font-mono mt-1">
            {savedQuotes.length} <span className="text-xs text-slate-400 font-sans">Adet</span>
          </div>
        </div>

        <div className="pearl-card rounded-3xl p-5 border border-emerald-200 bg-emerald-50/40 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-bold text-emerald-800">
            <span>Müşteri Onayladı</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-extrabold text-emerald-900 font-mono mt-1">
            {approvedCount} <span className="text-xs text-emerald-700 font-sans">Satış</span>
          </div>
        </div>

        <div className="pearl-card rounded-3xl p-5 border border-amber-200 bg-amber-50/40 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-bold text-amber-900">
            <span>Sonradan Düzenlenen</span>
            <Edit3 className="h-4 w-4 text-amber-600" />
          </div>
          <div className="text-2xl font-extrabold text-amber-950 font-mono mt-1">
            {revisedCount} <span className="text-xs text-amber-800 font-sans">Revize</span>
          </div>
        </div>

        <div className="pearl-card rounded-3xl p-5 border border-sky-200 bg-sky-50/40 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-bold text-sky-800">
            <span>Beklemede / Taslak</span>
            <Clock className="h-4 w-4 text-sky-600" />
          </div>
          <div className="text-2xl font-extrabold text-sky-950 font-mono mt-1">
            {pendingCount} <span className="text-xs text-sky-700 font-sans">Teklif</span>
          </div>
        </div>
      </div>

      {/* Table Card */}
      <div className="pearl-card rounded-3xl p-6 sm:p-7 border border-slate-200/90 shadow-sm space-y-4">
        
        {/* Status Filter Tabs & Search */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          
          {/* Status Filter Buttons */}
          <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 rounded-2xl">
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                statusFilter === 'all'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Tümü ({savedQuotes.length})
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter('approved')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                statusFilter === 'approved'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-emerald-800 hover:bg-emerald-100/50'
              }`}
            >
              Onaylananlar ({approvedCount})
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter('revised')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                statusFilter === 'revised'
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'text-amber-900 hover:bg-amber-100/50'
              }`}
            >
              Düzenlenenler ({revisedCount})
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter('pending')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                statusFilter === 'pending'
                  ? 'bg-slate-700 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-200'
              }`}
            >
              Bekleyenler ({pendingCount})
            </button>
          </div>

          {/* Search Box */}
          <div className="relative w-full lg:w-72">
            <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Misafir, paket, personel ara..."
              className="w-full bg-slate-50 text-slate-800 text-xs rounded-2xl pl-10 pr-4 py-2 border border-slate-200 focus:outline-none focus:border-emerald-600 focus:bg-white"
            />
          </div>
        </div>

        {filteredQuotes.length === 0 ? (
          <div className="py-16 text-center text-slate-400 space-y-2">
            <FileText className="h-12 w-12 mx-auto text-slate-300" />
            <p className="text-sm font-bold text-slate-700">Seçilen filtrelere uygun teklif bulunamadı.</p>
            <p className="text-xs text-slate-400">Teklif Sihirbazından yeni hesaplama yapıp kaydedebilirsiniz.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200/80 text-slate-500 font-bold uppercase tracking-wider bg-slate-50/70">
                <tr>
                  <th className="py-3 px-4 rounded-l-xl">Umreci / Referans</th>
                  <th className="py-3 px-4">Paket & Sezon</th>
                  <th className="py-3 px-4">Durum / Etiket</th>
                  <th className="py-3 px-4">Kişi Başı Satış</th>
                  <th className="py-3 px-4">Hazırlayan</th>
                  <th className="py-3 px-4">Tarih</th>
                  <th className="py-3 px-4 text-right rounded-r-xl">İşlemler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans">
                {filteredQuotes.map((quote) => {
                  const isApproved = quote.status === 'approved' || quote.status === 'approved_revised';
                  const isRevised = quote.status === 'revised' || quote.status === 'approved_revised' || (quote.revisionCount && quote.revisionCount > 0);

                  return (
                    <tr key={quote.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 text-xs">
                          {quote.customerName || 'Misafir'}
                        </div>
                        <div className="text-slate-400 text-[11px] font-mono flex items-center gap-1 mt-0.5">
                          <Phone className="h-3 w-3 text-emerald-600" />
                          <span>{quote.customerPhone || 'Belirtilmedi'}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-800">{quote.packageName}</div>
                        <div className="text-slate-400 text-[10px]">
                          {quote.selectedMonthName || quote.selectedMonth} • {quote.makkahDays + quote.madinahDays} Gün
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        {isApproved ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-900 border border-emerald-300">
                            <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                            <span>Müşteri Onayladı</span>
                          </span>
                        ) : isRevised ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-900 border border-amber-300">
                            <Edit3 className="h-3 w-3 text-amber-600" />
                            <span>Sonradan Düzenlendi ({quote.revisionCount || 1}x)</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-sky-100 text-sky-900 border border-sky-200">
                            <Clock className="h-3 w-3 text-sky-600" />
                            <span>Beklemede</span>
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 font-mono">
                        <div className="text-xs font-black text-emerald-900">
                          ${quote.finalPriceUSD} <span className="text-[10px] text-slate-400 font-sans">USD</span>
                        </div>
                        <div className="text-[10px] text-slate-500 font-sans">
                          {quote.paxCount > 1 ? `Toplam ${quote.paxCount} Kişi: $${(quote.finalPriceUSD * quote.paxCount).toLocaleString()}` : '1 Kişi'}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-slate-700 text-xs">
                        <div className="font-bold">{quote.createdByName || 'Personel'}</div>
                        <div className="text-[10px] text-slate-400">{quote.branch || 'Merkez'}</div>
                      </td>

                      <td className="py-3.5 px-4 text-slate-400 text-[11px] whitespace-nowrap">
                        {new Date(quote.createdAt || quote.timestamp).toLocaleDateString('tr-TR')}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          
                          {/* 🟢 Müşteri Onayladı Butonu */}
                          {!isApproved && (
                            <button
                              type="button"
                              onClick={() => handleApproveQuote(quote)}
                              className="rounded-xl px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-300 font-bold text-[11px] transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
                              title="Müşteri Teklifi Kabul Etti Olarak Onayla"
                            >
                              <ThumbsUp className="h-3.5 w-3.5 text-emerald-700" />
                              <span className="hidden sm:inline">Onayla</span>
                            </button>
                          )}

                          {/* ✏️ Teklifi Düzenle (Revize Et) Butonu */}
                          <button
                            type="button"
                            onClick={() => handleEditClick(quote)}
                            className="rounded-xl p-2 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 transition-colors cursor-pointer shadow-2xs"
                            title="Teklifi Düzenle / Revize Et"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                          </button>

                          {/* 📄 PDF Görüntüle */}
                          <button
                            type="button"
                            onClick={() => setSelectedQuoteForPdf(quote)}
                            className="rounded-xl p-2 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 transition-colors cursor-pointer shadow-2xs"
                            title="PDF Önizle & İndir"
                          >
                            <Download className="h-3.5 w-3.5" />
                          </button>

                          {/* 💬 WhatsApp */}
                          <button
                            type="button"
                            onClick={() => handleWhatsApp(quote)}
                            className="rounded-xl p-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 transition-colors cursor-pointer shadow-2xs"
                            title="WhatsApp Teklifi İlet"
                          >
                            <Send className="h-3.5 w-3.5" />
                          </button>

                          {/* 🗑️ Sil */}
                          {isAdmin && (
                            <button
                              type="button"
                              onClick={async () => {
                                const confirmed = await showConfirm({
                                  title: 'Teklifi Sil',
                                  message: `${quote.customerName || 'Misafir'} adına oluşturulan ${quote.packageName} teklifini silmek istediğinize emin misiniz?`,
                                  details: 'Silinen teklif geçmiş kayıtlardan kalıcı olarak kaldırılacaktır.',
                                  confirmText: 'Evet, Sil',
                                  cancelText: 'Vazgeç',
                                  confirmVariant: 'danger'
                                });
                                if (confirmed) {
                                  deleteQuote(quote.id);
                                }
                              }}
                              className="rounded-xl p-2 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 transition-colors cursor-pointer shadow-2xs"
                              title="Sil"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* PDF Modal */}
      {selectedQuoteForPdf && (
        <QuotationPdfModal
          quotation={selectedQuoteForPdf}
          onClose={() => setSelectedQuoteForPdf(null)}
        />
      )}
    </div>
  );
}
