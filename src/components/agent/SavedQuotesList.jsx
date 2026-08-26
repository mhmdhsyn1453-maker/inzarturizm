import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { useModal } from '../../context/ModalContext';
import { downloadDirectQuotationPdf, shareQuoteOnWhatsApp } from '../../services/pdfService';
import QuotationLetterView from './QuotationLetterView';
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
  AlertCircle,
  Eye,
  Loader2,
  ArrowLeft,
  Printer,
  ChevronLeft,
  ChevronRight,
  Users,
  MapPin,
  Building2,
  ChevronRightCircle
} from 'lucide-react';
import confetti from 'canvas-confetti';

const ITEMS_PER_PAGE = 10;

const TURKISH_MONTH_MAP = {
  jan: 'Ocak',
  feb: 'Şubat',
  mar: 'Mart',
  apr: 'Nisan',
  may: 'Mayıs',
  jun: 'Haziran',
  jul: 'Temmuz',
  aug: 'Ağustos',
  sep: 'Eylül',
  oct: 'Ekim',
  nov: 'Kasım',
  dec: 'Aralık',
  ramadan_early: 'Ramazan (İlk 15 Gün)',
  ramadan_late: 'Ramazan (Son 15 Gün)',
  ramadan_full: 'Tam Ramazan (30 Gün)',
  sevval: 'Şevval Umresi',
};

function formatTurkishMonth(monthId, monthName) {
  if (monthName && !TURKISH_MONTH_MAP[monthName.toLowerCase()] && !['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'].includes(monthName.toLowerCase())) {
    return monthName;
  }
  const key = (monthId || monthName || '').toLowerCase().trim();
  return TURKISH_MONTH_MAP[key] || monthName || monthId || 'Dönem Belirtilmedi';
}

export default function SavedQuotesList({ onEditQuote }) {
  const { savedQuotes, deleteQuote, updateQuoteStatus, setEditingQuote } = useData();
  const { currentUser, isAdmin } = useAuth();
  const { showConfirm, showAlert } = useModal();

  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'approved' | 'revised' | 'pending'
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedQuoteForPdf, setSelectedQuoteForPdf] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [isExiting, setIsExiting] = useState(false);

  // Auto reset page to 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter]);

  // 🔒 Rol Bazlı Teklif İzolasyonu: Admin tüm acentenin tekliflerini görür, Personel yalnızca kendi oluşturduğu teklifleri görür
  const visibleQuotes = useMemo(() => {
    if (isAdmin) return savedQuotes;
    return savedQuotes.filter(q => {
      const isOwner = 
        (currentUser?.id && (q.createdById === currentUser.id || q.createdBy === currentUser.id)) ||
        (currentUser?.name && (q.createdByName === currentUser.name || q.agentName === currentUser.name));
      return isOwner;
    });
  }, [savedQuotes, isAdmin, currentUser]);

  // Status counts (hesaplanan görünür tekliflere göre)
  const approvedCount = visibleQuotes.filter(q => q.status === 'approved' || q.status === 'approved_revised').length;
  const revisedCount = visibleQuotes.filter(q => q.status === 'revised' || q.status === 'approved_revised' || (q.revisionCount && q.revisionCount > 0)).length;
  const pendingCount = visibleQuotes.filter(q => !q.status || q.status === 'pending').length;

  const filteredQuotes = useMemo(() => {
    return visibleQuotes.filter(q => {
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
  }, [visibleQuotes, searchTerm, statusFilter]);

  // Pagination calculation
  const totalPages = Math.ceil(filteredQuotes.length / ITEMS_PER_PAGE) || 1;
  const paginatedQuotes = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredQuotes.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredQuotes, currentPage]);

  const totalVolumeUSD = useMemo(() => {
    return visibleQuotes.reduce((acc, q) => acc + (q.finalPriceUSD * (q.paxCount || 1)), 0);
  }, [visibleQuotes]);

  // 🌊 Animasyonlu Önizleme Açma (Tak diye değil, CSS ile akıcı geçiş)
  const handleOpenPreview = (quote) => {
    setIsExiting(true);
    setTimeout(() => {
      setSelectedQuoteForPdf(quote);
      setIsExiting(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 180);
  };

  // 🌊 Animasyonlu Listeye Dönüş
  const handleClosePreview = () => {
    setIsExiting(true);
    setTimeout(() => {
      setSelectedQuoteForPdf(null);
      setIsExiting(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 180);
  };

  // 📥 Doğrudan Tek Tıkla PDF İndirme
  const handleDirectDownload = async (quote, e) => {
    e?.stopPropagation();
    try {
      setDownloadingId(quote.id);
      await downloadDirectQuotationPdf(quote);
      confetti({
        particleCount: 40,
        spread: 60,
        origin: { y: 0.6 }
      });
    } catch (err) {
      console.error('Download error:', err);
      showAlert({
        title: 'İndirme Başarısız',
        message: 'PDF dosyası oluşturulurken bir hata meydana geldi: ' + (err?.message || err),
        variant: 'danger'
      });
    } finally {
      setDownloadingId(null);
    }
  };

  // 💬 WhatsApp Paylaşımı (PDF Dosyası ile)
  const handleWhatsApp = async (quote, e) => {
    e?.stopPropagation();
    try {
      await shareQuoteOnWhatsApp(quote);
    } catch (err) {
      console.error('WhatsApp share error:', err);
    }
  };

  const handleApproveQuote = async (quote, e) => {
    e?.stopPropagation();
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

  const handleEditClick = (quote, e) => {
    e?.stopPropagation();
    setEditingQuote(quote);
    if (onEditQuote) {
      onEditQuote(quote);
    }
  };

  // 📄 TAM SAYFA TEKLİF MEKTUBU ÖNİZLEME (CSS Animasyonlu Geçiş)
  if (selectedQuoteForPdf) {
    return (
      <div className={`space-y-6 pb-20 font-sans ${isExiting ? 'animate-page-exit' : 'animate-page-enter'}`}>
        
        {/* Top Control Bar (Signature Pill Form with Rich CSS Micro-interactions) */}
        <div className="pearl-card rounded-full p-2 sm:px-6 sm:py-2.5 border border-slate-200/90 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/95 backdrop-blur-md">
          <button
            type="button"
            onClick={handleClosePreview}
            className="group inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-100 hover:bg-emerald-50 text-slate-800 hover:text-emerald-900 border border-slate-200 hover:border-emerald-300 text-xs font-bold transition-all duration-200 cursor-pointer shadow-2xs hover:scale-105 active:scale-95 self-start sm:self-auto"
          >
            <ArrowLeft className="h-4 w-4 text-emerald-700 transition-transform duration-200 group-hover:-translate-x-1" />
            <span>Teklifler Listesine Dön</span>
          </button>

          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-emerald-50 via-emerald-100/60 to-emerald-50 border border-emerald-300 text-slate-800 text-xs font-bold self-center shadow-3xs">
            <FileText className="h-4 w-4 text-emerald-700 shrink-0" />
            <span>Teklif Mektubu Önizleme: <strong className="text-emerald-900 font-extrabold">{selectedQuoteForPdf.customerName || 'Misafir'}</strong></span>
          </div>

          <div className="flex items-center flex-wrap gap-2 justify-end">
            {/* WhatsApp */}
            <button
              type="button"
              onClick={(e) => handleWhatsApp(selectedQuoteForPdf, e)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-emerald-50 hover:bg-emerald-600 text-emerald-800 hover:text-white text-xs font-bold border border-emerald-300 transition-all duration-200 cursor-pointer shadow-2xs hover:scale-105 active:scale-95"
            >
              <Send className="h-3.5 w-3.5" />
              <span>WhatsApp</span>
            </button>

            {/* Yazdır */}
            <button
              type="button"
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-slate-100 hover:bg-slate-800 text-slate-700 hover:text-white text-xs font-bold border border-slate-300 transition-all duration-200 cursor-pointer shadow-2xs hover:scale-105 active:scale-95"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Yazdır / PDF</span>
            </button>

            {/* Resmi PDF İndir */}
            <button
              type="button"
              disabled={downloadingId === selectedQuoteForPdf.id}
              onClick={(e) => handleDirectDownload(selectedQuoteForPdf, e)}
              className="flex items-center gap-1.5 px-5 py-2 rounded-full bg-gradient-to-r from-emerald-800 to-emerald-600 hover:from-emerald-700 hover:to-emerald-500 text-white text-xs font-black tracking-wide transition-all duration-200 cursor-pointer shadow-md shadow-emerald-900/25 hover:scale-105 active:scale-95 disabled:opacity-50"
            >
              {downloadingId === selectedQuoteForPdf.id ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Download className="h-3.5 w-3.5" />
              )}
              <span>Resmi PDF İndir</span>
            </button>

            {/* Teklifi Düzenle */}
            <button
              type="button"
              onClick={(e) => handleEditClick(selectedQuoteForPdf, e)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-amber-50 hover:bg-amber-500 text-amber-900 hover:text-white text-xs font-bold border border-amber-300 transition-all duration-200 cursor-pointer shadow-2xs hover:scale-105 active:scale-95"
            >
              <Edit3 className="h-3.5 w-3.5" />
              <span>Teklifi Düzenle</span>
            </button>
          </div>
        </div>

        {/* Integrated A4 Printable Letter View */}
        <QuotationLetterView
          quotation={selectedQuoteForPdf}
          onBackToForm={handleClosePreview}
          isSaved={true}
        />
      </div>
    );
  }

  return (
    <div className={`space-y-6 pb-20 ${isExiting ? 'animate-page-exit' : 'animate-page-enter'}`}>
      
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
            {visibleQuotes.length} <span className="text-xs text-slate-400 font-sans">Adet</span>
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

      {/* Main Content Area */}
      <div className="pearl-card rounded-3xl p-5 sm:p-7 border border-slate-200/90 shadow-sm space-y-5">
        
        {/* Status Filter Tabs & Search Bar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          
          {/* Status Filter Buttons (Pill Format) */}
          <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 rounded-full">
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                statusFilter === 'all'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Tümü ({visibleQuotes.length})
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter('approved')}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
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
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
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
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                statusFilter === 'pending'
                  ? 'bg-slate-700 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-200'
              }`}
            >
              Bekleyenler ({pendingCount})
            </button>
          </div>

          {/* Search Box */}
          <div className="relative w-full lg:w-80">
            <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Misafir, paket, telefon veya personel ara..."
              className="w-full bg-slate-50 text-slate-800 text-xs rounded-full pl-10 pr-4 py-2.5 border border-slate-200 focus:outline-none focus:border-emerald-600 focus:bg-white shadow-3xs"
            />
          </div>
        </div>

        {/* 🗂️ Ayrı Ayrı Standalone Teklif Kartları Listesi (Her Biri Özel CSS & Hover Efektli) */}
        {filteredQuotes.length === 0 ? (
          <div className="py-16 text-center text-slate-400 space-y-2">
            <FileText className="h-12 w-12 mx-auto text-slate-300" />
            <p className="text-sm font-bold text-slate-700">Seçilen filtrelere uygun teklif bulunamadı.</p>
            <p className="text-xs text-slate-400">Teklif Sihirbazından yeni hesaplama yapıp kaydedebilirsiniz.</p>
          </div>
        ) : (
          <div className="space-y-3.5">
            {paginatedQuotes.map((quote) => {
              const isApproved = quote.status === 'approved' || quote.status === 'approved_revised';
              const isRevised = quote.status === 'revised' || quote.status === 'approved_revised' || (quote.revisionCount && quote.revisionCount > 0);
              const isMixed = !!(quote.isMixedRoomMode || (quote.mixedRoomsSummary && quote.mixedRoomsSummary.totalPax > 0));
              const totalPax = isMixed ? (quote.mixedRoomsSummary?.totalPax || quote.paxCount || 1) : (quote.paxCount || 1);
              const totalGroupPrice = isMixed 
                ? (quote.mixedRoomsSummary?.groupGrandTotalUSD || (quote.finalPriceUSD * totalPax))
                : (quote.finalPriceUSD * totalPax);

              return (
                <div
                  key={quote.id}
                  onClick={() => handleOpenPreview(quote)}
                  className="quote-card-interactive pearl-card rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-slate-200/90 shadow-2xs hover:shadow-lg hover:border-emerald-400 bg-white/95 backdrop-blur-sm cursor-pointer group relative overflow-hidden"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    
                    {/* Left: Customer & Contact */}
                    <div className="flex items-start sm:items-center gap-3.5 min-w-[240px]">
                      <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-emerald-100 to-emerald-50 text-emerald-800 flex items-center justify-center font-black text-sm border border-emerald-200/80 shadow-3xs shrink-0 group-hover:scale-105 group-hover:bg-emerald-700 group-hover:text-white transition-all duration-300">
                        {quote.customerName ? quote.customerName.charAt(0).toUpperCase() : 'M'}
                      </div>
                      
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-extrabold text-sm text-slate-900 group-hover:text-emerald-900 transition-colors">
                            {quote.customerName || 'Misafir'}
                          </h4>
                          {isMixed ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 shadow-3xs">
                              <Users className="h-2.5 w-2.5 text-amber-700" />
                              <span>Çoklu Oda ({totalPax} Kişi)</span>
                            </span>
                          ) : quote.paxCount > 1 ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                              <Users className="h-2.5 w-2.5 text-slate-500" />
                              <span>{quote.paxCount} Kişi</span>
                            </span>
                          ) : null}
                        </div>

                        <div className="flex items-center gap-3 text-slate-500 text-xs font-mono">
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3 text-emerald-600" />
                            <span>{quote.customerPhone || 'Belirtilmedi'}</span>
                          </span>
                          <span className="text-slate-300">•</span>
                          <span className="text-[11px] text-slate-400 font-sans">
                            {new Date(quote.createdAt || quote.timestamp).toLocaleDateString('tr-TR')}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Center: Package & Season Details */}
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs">
                      <div className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200/80 font-bold text-slate-800 flex items-center gap-1.5 shadow-3xs">
                        <Building2 className="h-3.5 w-3.5 text-amber-600" />
                        <span>{quote.packageName}</span>
                      </div>

                      <div className="px-3.5 py-1.5 rounded-full bg-slate-50 border border-slate-200/80 text-slate-700 flex items-center gap-1.5 shadow-3xs">
                        <Calendar className="h-3.5 w-3.5 text-emerald-600" />
                        <span className="font-bold text-slate-850">{formatTurkishMonth(quote.selectedMonth, quote.selectedMonthName)}</span>
                        <span className="text-slate-300">|</span>
                        <span className="font-bold text-emerald-800">{quote.makkahDays + quote.madinahDays} Gün</span>
                      </div>

                      {/* Status Badge */}
                      {isApproved ? (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-extrabold bg-emerald-100 text-emerald-900 border border-emerald-300 shadow-3xs">
                          <CheckCircle2 className="h-3 w-3 text-emerald-700" />
                          <span>Müşteri Onayladı</span>
                        </span>
                      ) : isRevised ? (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-extrabold bg-amber-100 text-amber-900 border border-amber-300 shadow-3xs">
                          <Edit3 className="h-3 w-3 text-amber-700" />
                          <span>Revize ({quote.revisionCount || 1}x)</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-extrabold bg-sky-100 text-sky-900 border border-sky-200 shadow-3xs">
                          <Clock className="h-3 w-3 text-sky-700" />
                          <span>Beklemede</span>
                        </span>
                      )}
                    </div>

                    {/* Right: Price & Quick Action Pills */}
                    <div className="flex items-center justify-between lg:justify-end gap-4 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100">
                      
                      {/* Price Pill */}
                      <div className="text-right font-mono">
                        {isMixed ? (
                          <>
                            <div className="inline-flex items-baseline gap-1 px-3 py-1 rounded-2xl bg-amber-50 border border-amber-200 text-amber-950 shadow-3xs">
                              <span className="text-base font-black">${totalGroupPrice.toLocaleString('tr-TR')}</span>
                              <span className="text-[10px] font-bold text-amber-700 font-sans">USD</span>
                            </div>
                            <div className="text-[10px] text-amber-800 font-bold font-sans mt-0.5">
                              Toplam Tutar
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="inline-flex items-baseline gap-1 px-3 py-1 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-950 shadow-3xs">
                              <span className="text-base font-black">${quote.finalPriceUSD?.toLocaleString('tr-TR')}</span>
                              <span className="text-[10px] font-bold text-emerald-700 font-sans">USD</span>
                            </div>
                            {quote.paxCount > 1 && (
                              <div className="text-[10px] text-slate-400 font-sans mt-0.5">
                                Toplam: ${totalGroupPrice.toLocaleString('tr-TR')}
                              </div>
                            )}
                          </>
                        )}
                      </div>

                      {/* Action Pill Buttons */}
                      <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                        
                        {/* Onayla Butonu */}
                        {!isApproved && (
                          <button
                            type="button"
                            onClick={(e) => handleApproveQuote(quote, e)}
                            className="rounded-full px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-300 font-bold text-xs transition-all cursor-pointer flex items-center gap-1 shadow-2xs hover:scale-105"
                            title="Müşteri Teklifi Kabul Etti Olarak Onayla"
                          >
                            <ThumbsUp className="h-3.5 w-3.5 text-emerald-700" />
                            <span className="hidden sm:inline">Onayla</span>
                          </button>
                        )}

                        {/* Önizle Butonu */}
                        <button
                          type="button"
                          onClick={() => handleOpenPreview(quote)}
                          className="rounded-full px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs transition-all cursor-pointer flex items-center gap-1 shadow-2xs hover:scale-105"
                          title="Teklif Mektubunu Önizle"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          <span>Önizle</span>
                        </button>

                        {/* Düzenle Butonu */}
                        <button
                          type="button"
                          onClick={(e) => handleEditClick(quote, e)}
                          className="rounded-full p-2 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 transition-all cursor-pointer shadow-2xs hover:scale-105"
                          title="Teklifi Düzenle / Revize Et"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                        </button>

                        {/* PDF İndir */}
                        <button
                          type="button"
                          disabled={downloadingId === quote.id}
                          onClick={(e) => handleDirectDownload(quote, e)}
                          className="rounded-full p-2 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 transition-all cursor-pointer shadow-2xs disabled:opacity-50 hover:scale-105"
                          title="Doğrudan PDF İndir"
                        >
                          {downloadingId === quote.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-600" />
                          ) : (
                            <Download className="h-3.5 w-3.5" />
                          )}
                        </button>

                        {/* WhatsApp Paylaş */}
                        <button
                          type="button"
                          onClick={(e) => handleWhatsApp(quote, e)}
                          className="rounded-full p-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 transition-all cursor-pointer shadow-2xs hover:scale-105"
                          title="WhatsApp ile Gönder"
                        >
                          <Send className="h-3.5 w-3.5" />
                        </button>

                        {/* Sil (Admin) */}
                        {isAdmin && (
                          <button
                            type="button"
                            onClick={async (e) => {
                              e.stopPropagation();
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
                            className="rounded-full p-2 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 transition-all cursor-pointer shadow-2xs hover:scale-105"
                            title="Sil"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* 📄 Sayfalama (Pagination Bar - 10 Teklifte Bir Sayfa) */}
        {filteredQuotes.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-100 text-xs text-slate-600">
            <div className="font-medium text-slate-500">
              Toplam <strong className="text-slate-800">{filteredQuotes.length}</strong> tekliften{' '}
              <strong className="text-slate-800">
                {(currentPage - 1) * ITEMS_PER_PAGE + 1} - {Math.min(currentPage * ITEMS_PER_PAGE, filteredQuotes.length)}
              </strong>{' '}
              arası gösteriliyor (Sayfa {currentPage} / {totalPages})
            </div>

            {totalPages > 1 && (
              <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-full shadow-3xs">
                {/* Önceki Sayfa */}
                <button
                  type="button"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white text-slate-700"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  <span>Önceki</span>
                </button>

                {/* Sayfa Numaraları */}
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                  <button
                    key={pageNum}
                    type="button"
                    onClick={() => setCurrentPage(pageNum)}
                    className={`h-7 w-7 rounded-full text-xs font-bold flex items-center justify-center transition-all cursor-pointer ${
                      currentPage === pageNum
                        ? 'bg-emerald-700 text-white shadow-xs scale-105'
                        : 'text-slate-600 hover:bg-white'
                    }`}
                  >
                    {pageNum}
                  </button>
                ))}

                {/* Sonraki Sayfa */}
                <button
                  type="button"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white text-slate-700"
                >
                  <span>Sonraki</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
