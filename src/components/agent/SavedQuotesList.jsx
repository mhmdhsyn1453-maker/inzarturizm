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
  ChevronRightCircle,
  ShieldCheck,
  Check,
  XCircle,
  AlertTriangle,
  MessageSquare,
  Undo2,
  RotateCcw
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

// ⏳ 7 Günlük Geri Sayım Hesaplayıcı
function get7DaysCountdown(validUntil, createdAt) {
  const expiry = validUntil ? new Date(validUntil).getTime() : (createdAt ? new Date(createdAt).getTime() + 7 * 24 * 60 * 60 * 1000 : null);
  if (!expiry) return null;
  const now = Date.now();
  const diffMs = expiry - now;

  if (diffMs <= 0) {
    return { isExpired: true, text: 'Süresi Doldu (7 Gün)', days: 0, hours: 0, minutes: 0, badgeClass: 'bg-rose-50 text-rose-700 border-rose-200' };
  }

  const days = Math.floor(diffMs / (24 * 60 * 60 * 1000));
  const hours = Math.floor((diffMs % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
  const minutes = Math.floor((diffMs % (60 * 60 * 1000)) / (60 * 1000));

  let text = '';
  let badgeClass = 'bg-emerald-50 text-emerald-800 border-emerald-200';

  if (days > 2) {
    text = `${days} Gün ${hours} Sa Kaldı`;
    badgeClass = 'bg-emerald-50 text-emerald-800 border-emerald-200';
  } else if (days >= 1) {
    text = `${days} Gün ${hours} Sa Kaldı`;
    badgeClass = 'bg-amber-50 text-amber-800 border-amber-300';
  } else if (hours > 0) {
    text = `${hours} Saat ${minutes} Dk Kaldı`;
    badgeClass = 'bg-rose-50 text-rose-800 border-rose-300 animate-pulse';
  } else {
    text = `${minutes} Dk Kaldı`;
    badgeClass = 'bg-rose-100 text-rose-900 border-rose-400 animate-pulse';
  }

  return { isExpired: false, text, days, hours, minutes, badgeClass };
}

export default function SavedQuotesList({ onEditQuote }) {
  const { savedQuotes, deleteQuote, updateQuoteStatus, setEditingQuote } = useData();
  const { currentUser, isAdmin } = useAuth();
  const { showConfirm, showAlert, showRejectModal, showPdfSaveLocationModal } = useModal();

  const isHqAssistant = currentUser?.role?.toUpperCase() === 'HQ_ASSISTANT';
  const isHqOrAdmin = isAdmin || isHqAssistant;

  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'pending_hq' | 'hq_approved' | 'pending_customer' | 'rejected'
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedQuoteForPdf, setSelectedQuoteForPdf] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [isExiting, setIsExiting] = useState(false);

  // Auto reset page to 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter]);

  // Keep selectedQuoteForPdf synchronized with latest savedQuotes updates
  useEffect(() => {
    if (selectedQuoteForPdf) {
      const freshQuote = savedQuotes.find(q => q.id === selectedQuoteForPdf.id);
      if (freshQuote && freshQuote !== selectedQuoteForPdf) {
        setSelectedQuoteForPdf(freshQuote);
      }
    }
  }, [savedQuotes, selectedQuoteForPdf]);

  // 🔒 Rol Bazlı Teklif İzolasyonu: Admin ve Genel Merkez Yardımcısı tüm acentenin tekliflerini görür, Personel yalnızca kendi oluşturduğu teklifleri görür
  const visibleQuotes = useMemo(() => {
    if (isHqOrAdmin) return savedQuotes;
    return savedQuotes.filter(q => {
      const isOwner = 
        (currentUser?.id && (q.createdById === currentUser.id || q.createdBy === currentUser.id)) ||
        (currentUser?.name && (q.createdByName === currentUser.name || q.agentName === currentUser.name));
      return isOwner;
    });
  }, [savedQuotes, isHqOrAdmin, currentUser]);

  // Status counts
  const pendingHqCount = visibleQuotes.filter(q => q.status === 'customer_approved').length;
  const hqApprovedCount = visibleQuotes.filter(q => q.status === 'hq_approved' || q.status === 'approved' || q.status === 'approved_revised').length;
  const pendingCustomerCount = visibleQuotes.filter(q => !q.status || q.status === 'pending' || q.status === 'revised').length;
  const rejectedCount = visibleQuotes.filter(q => q.status === 'rejected' || q.status === 'hq_rejected' || q.status === 'expired').length;

  const filteredQuotes = useMemo(() => {
    return visibleQuotes.filter(q => {
      // Filter by status tab
      if (statusFilter === 'pending_hq' && q.status !== 'customer_approved') return false;
      if (statusFilter === 'hq_approved' && (q.status !== 'hq_approved' && q.status !== 'approved' && q.status !== 'approved_revised')) return false;
      if (statusFilter === 'pending_customer' && (q.status === 'customer_approved' || q.status === 'hq_approved' || q.status === 'approved' || q.status === 'approved_revised' || q.status === 'rejected' || q.status === 'hq_rejected' || q.status === 'expired')) return false;
      if (statusFilter === 'rejected' && (q.status !== 'rejected' && q.status !== 'hq_rejected' && q.status !== 'expired')) return false;

      // Filter by search
      const term = searchTerm.toLowerCase();
      const matchSearch = 
        (q.customerName && q.customerName.toLowerCase().includes(term)) ||
        (q.packageName && q.packageName.toLowerCase().includes(term)) ||
        (q.customerPhone && q.customerPhone.includes(term)) ||
        (q.createdByName && q.createdByName.toLowerCase().includes(term)) ||
        (q.branch && q.branch.toLowerCase().includes(term)) ||
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

  // 📄 Doğrudan PDF İndir
  const handleDirectDownload = async (quote, e) => {
    e?.stopPropagation();
    const mode = await showPdfSaveLocationModal(quote.customerName ? `${quote.customerName}_Umre_Teklifi.pdf` : 'Inzar_Umre_Teklifi.pdf');
    if (!mode) return;

    setDownloadingId(quote.id);
    try {
      await downloadDirectQuotationPdf(quote, mode);
    } catch (err) {
      console.error('PDF download error:', err);
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

  // 📱 Genel Merkez Onay/Ret WhatsApp Mesaj Gönderimi
  const sendHqWhatsAppNotification = (quote, decision, note = '') => {
    const phoneRaw = (quote.customerPhone || '').replace(/\D/g, '');
    if (!phoneRaw) return;

    let message = '';
    if (decision === 'approved') {
      message = `*İNZAR TURİZM GENEL MERKEZ ONAY BİLDİRİMİ* 🕋✨\n\n` +
        `Sayın *${quote.customerName}*,\n\n` +
        `Temsilcimiz *${quote.createdByName || 'Personelimiz'}* tarafından hazırlanan *${quote.packageName}* Umre programı teklifiniz (${quote.id}) Genel Merkezimiz tarafından *RESMİ OLARAK ONAYLANMIŞTIR*.\n\n` +
        `📋 *Onaylanan Teklif Özeti:*\n` +
        `• *Paket:* ${quote.packageName}\n` +
        `• *Kişi Sayısı:* ${quote.paxCount || 1} Kişi\n` +
        `• *Toplam Tutar:* ${quote.finalPriceUSD} USD (~${quote.finalPriceTRY} TL)\n` +
        `• *Mekke Kalış:* ${quote.makkahDays} Gece (${quote.selectedMakkahHotel?.name || quote.packageName})\n` +
        `• *Medine Kalış:* ${quote.madinahDays} Gece (${quote.selectedMadinahHotel?.name || quote.packageName})\n\n` +
        `Umre kaydınız ve vize/otel işlemleriniz resmen başlatılmıştır. Hayırlı ve mübarek olmasını dileriz.\n\n` +
        `📍 *İnzar Turizm Genel Merkez*\n` +
        `🌐 inzar.com.tr`;
    } else {
      message = `*İNZAR TURİZM BİLGİLENDİRME* 🕋\n\n` +
        `Sayın *${quote.customerName}*,\n\n` +
        `*${quote.packageName}* Umre teklifiniz (${quote.id}) ile ilgili Genel Merkez değerlendirmesi yapılmıştır.${note ? `\n\n*Merkez Açıklaması:* ${note}` : ''}\n\n` +
        `Temsilcimiz *${quote.createdByName || 'Personelimiz'}* alternatif tarihler ve uygun kontenjanlar için sizinle irtibata geçecektir.\n\n` +
        `📍 *İnzar Turizm Genel Merkez*`;
    }

    const targetPhone = phoneRaw.startsWith('90') ? phoneRaw : (phoneRaw.startsWith('0') ? '9' + phoneRaw : '90' + phoneRaw);
    const encodedUrl = `https://wa.me/${targetPhone}?text=${encodeURIComponent(message)}`;
    window.open(encodedUrl, '_blank');
  };

  // 1. AŞAMA: Personel Müşteri Onayını Kaydeder (Merkez Onayı Bekleniyor durumuna geçer)
  const handleCustomerApprove = async (quote, e) => {
    e?.stopPropagation();
    const confirmed = await showConfirm({
      title: 'Müşteri Onayını Kaydet',
      message: `${quote.customerName || 'Misafir'} adına verilen teklif MÜŞTERİ TARAFINDAN ONAYLANDI olarak işaretlensin mi?`,
      details: 'Teklif durumu "Merkez Onayı Bekleniyor" olarak güncellenecek ve Genel Merkez incelemesine iletilecektir.',
      confirmText: 'Evet, Müşteri Onayladı',
      cancelText: 'Vazgeç',
      confirmVariant: 'emerald'
    });

    if (confirmed) {
      updateQuoteStatus(quote.id, 'customer_approved', currentUser);
      showAlert({
        title: '✓ Müşteri Onayı Alındı',
        message: 'Teklif durumu "Merkez Onayı Bekleniyor" olarak güncellendi. Genel Merkez onayına iletildi.',
        type: 'success'
      });
    }
  };

  // 2. AŞAMA: Genel Merkez / Genel Merkez Yardımcısı Onaylar (Resmi Kesinleşme + Otomatik PDF İndirme)
  const handleHqApprove = async (quote, e) => {
    e?.stopPropagation();
    const confirmed = await showConfirm({
      title: '✓ Genel Merkez Teklif Onayı',
      message: `"${quote.customerName || 'Misafir'}" adına hazırlanan ${quote.packageName} (${quote.finalPriceUSD} USD) teklifini RESMİ OLARAK ONAYLIYOR MUSUNUZ?`,
      details: 'Onay verildiğinde teklif kesinleşecek ve onaylı resmi PDF belgesi otomatik olarak indirilecektir.',
      confirmText: '✓ Teklifi Resmi Onayla',
      cancelText: 'Vazgeç',
      confirmVariant: 'emerald'
    });

    if (confirmed) {
      updateQuoteStatus(quote.id, 'hq_approved', currentUser);
      confetti({
        particleCount: 60,
        spread: 70,
        origin: { y: 0.6 }
      });
      try {
        await downloadDirectQuotationPdf(quote);
      } catch (err) {
        console.error('PDF indirme hatası:', err);
      }
      showAlert({
        title: '✓ Teklif Genel Merkez Tarafından Onaylandı',
        message: 'Teklif resmi olarak onaylandı ve onaylı teklif PDF belgesi indirildi.',
        type: 'success'
      });
    }
  };

  // 🔄 MÜŞTERİ ONAYINI GERİ ÇEK: Teklif tekrar 'Müşteri Kararı Bekleniyor' durumuna alınır
  const handleCustomerRevoke = async (quote, e) => {
    e?.stopPropagation();
    const confirmed = await showConfirm({
      title: 'Müşteri Onayını Geri Çek',
      message: `"${quote.customerName || 'Misafir'}" adına verilen onay geri çekilsin mi?`,
      details: 'Teklif durumu yeniden "Müşteri Kararı Bekleniyor" (Taslak/Beklemede) aşamasına dönecektir.',
      confirmText: 'Evet, Onayı Geri Çek',
      cancelText: 'Vazgeç',
      type: 'confirm',
      confirmVariant: 'amber'
    });

    if (confirmed) {
      updateQuoteStatus(quote.id, 'pending', currentUser, 'Müşteri onayı geri çekildi.');
      showAlert({
        title: 'Müşteri Onayı Geri Çekildi',
        message: 'Teklif durumu "Müşteri Kararı Bekleniyor" olarak güncellendi.',
        type: 'info'
      });
    }
  };

  // ❌ MÜŞTERİ VAZGEÇTİ / REDDETTİ: Müşteri olumsuz dönüş yaptıysa
  const handleCustomerReject = async (quote, e) => {
    e?.stopPropagation();
    const confirmed = await showConfirm({
      title: 'Müşteri Vazgeçti / İptal',
      message: `"${quote.customerName || 'Misafir'}" bu tekliften vazgeçti olarak işaretlensin mi?`,
      details: 'Teklif durumu "Müşteri Reddetti" olarak arşivlenecektir.',
      confirmText: 'Evet, Vazgeçti',
      cancelText: 'Vazgeç',
      type: 'confirm',
      confirmVariant: 'danger'
    });

    if (confirmed) {
      updateQuoteStatus(quote.id, 'rejected', currentUser, 'Müşteri tekliften vazgeçti.');
      showAlert({
        title: 'Teklif Arşivlendi',
        message: 'Müşteri vazgeçişi sisteme kaydedildi.',
        type: 'info'
      });
    }
  };

  // 2. AŞAMA RET: Global Tam Ekran Blur'lu Ret Modalını Açar
  const handleOpenRejectModal = async (quote, e) => {
    e?.stopPropagation();
    const result = await showRejectModal({
      customerName: quote.customerName || 'Misafir',
      defaultReason: ''
    });

    if (result && result.confirmed) {
      const finalReason = result.reason?.trim() || 'Genel Merkez tarafından uygun görülmedi.';
      updateQuoteStatus(quote.id, 'hq_rejected', currentUser, finalReason);
      showAlert({
        title: 'Teklif Reddedildi',
        message: `"${quote.customerName || 'Misafir'}" adına olan teklif reddedildi ve ret gerekçesi sisteme işlendi.`,
        type: 'warning'
      });
    }
  };

  const handleEditClick = (quote, e) => {
    e?.stopPropagation();
    setSelectedQuoteForPdf(null);
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
            {/* WhatsApp (PDF ile) */}
            <button
              type="button"
              onClick={(e) => handleWhatsApp(selectedQuoteForPdf, e)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-emerald-50 hover:bg-emerald-600 text-emerald-800 hover:text-white text-xs font-bold border border-emerald-300 transition-all duration-200 cursor-pointer shadow-2xs hover:scale-105 active:scale-95"
              title="PDF İndir ve WhatsApp ile Paylaş"
            >
              <Send className="h-3.5 w-3.5" />
              <span>WhatsApp</span>
            </button>

            {/* Resmi PDF İndir */}
            <button
              type="button"
              disabled={downloadingId === selectedQuoteForPdf.id}
              onClick={(e) => handleDirectDownload(selectedQuoteForPdf, e)}
              className="flex items-center gap-1.5 px-5 py-2 rounded-full bg-gradient-to-r from-emerald-800 to-emerald-600 hover:from-emerald-700 hover:to-emerald-500 text-white text-xs font-black tracking-wide transition-all duration-200 cursor-pointer shadow-md shadow-emerald-900/25 hover:scale-105 active:scale-95 disabled:opacity-50"
              title="Doğrudan Resmi PDF İndir"
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

        <div className="pearl-card rounded-3xl p-5 border border-amber-300 bg-amber-50/50 shadow-2xs relative overflow-hidden">
          <div className="flex items-center justify-between text-xs font-bold text-amber-900">
            <span>Merkez Onayı Bekleyen</span>
            <ShieldCheck className="h-4 w-4 text-amber-700 animate-bounce" />
          </div>
          <div className="text-2xl font-extrabold text-amber-950 font-mono mt-1">
            {pendingHqCount} <span className="text-xs text-amber-800 font-sans">İncelemede</span>
          </div>
        </div>

        <div className="pearl-card rounded-3xl p-5 border border-emerald-300 bg-emerald-50/50 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-bold text-emerald-800">
            <span>Merkez Onayladı (Kesin)</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-extrabold text-emerald-900 font-mono mt-1">
            {hqApprovedCount} <span className="text-xs text-emerald-700 font-sans">Satış</span>
          </div>
        </div>

        <div className="pearl-card rounded-3xl p-5 border border-sky-200 bg-sky-50/40 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-bold text-sky-800">
            <span>Müşteri Bekleyen (7 Gün)</span>
            <Clock className="h-4 w-4 text-sky-600" />
          </div>
          <div className="text-2xl font-extrabold text-sky-950 font-mono mt-1">
            {pendingCustomerCount} <span className="text-xs text-sky-700 font-sans">Görüşmede</span>
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
              onClick={() => setStatusFilter('pending_hq')}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                statusFilter === 'pending_hq'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-amber-900 hover:bg-amber-100/50'
              }`}
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Merkez Onayı Bekleyenler ({pendingHqCount})</span>
              {pendingHqCount > 0 && <span className="h-2 w-2 rounded-full bg-amber-300 animate-ping" />}
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter('hq_approved')}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                statusFilter === 'hq_approved'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-emerald-800 hover:bg-emerald-100/50'
              }`}
            >
              Merkez Onaylı ({hqApprovedCount})
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter('pending_customer')}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                statusFilter === 'pending_customer'
                  ? 'bg-sky-700 text-white shadow-xs'
                  : 'text-sky-800 hover:bg-sky-100/50'
              }`}
            >
              Müşteri Bekleyenler ({pendingCustomerCount})
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter('rejected')}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                statusFilter === 'rejected'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'text-rose-700 hover:bg-rose-100/50'
              }`}
            >
              Red / Süresi Dolan ({rejectedCount})
            </button>
          </div>

          {/* Search Box */}
          <div className="relative w-full lg:w-80">
            <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Misafir, paket, telefon, şube veya personel ara..."
              className="w-full bg-slate-50 text-slate-800 text-xs rounded-full pl-10 pr-4 py-2.5 border border-slate-200 focus:outline-none focus:border-emerald-600 focus:bg-white shadow-3xs"
            />
          </div>
        </div>

        {/* 🗂️ Standalone Teklif Kartları Listesi (Genişletilmiş, Ferah ve Modern Tasarım) */}
        {filteredQuotes.length === 0 ? (
          <div className="py-16 text-center text-slate-400 space-y-2">
            <FileText className="h-12 w-12 mx-auto text-slate-300" />
            <p className="text-sm font-bold text-slate-700">Seçilen filtrelere uygun teklif bulunamadı.</p>
            <p className="text-xs text-slate-400">Teklif Sihirbazından yeni hesaplama yapıp kaydedebilirsiniz.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {paginatedQuotes.map((quote) => {
              const isHqApproved = quote.status === 'hq_approved' || quote.status === 'approved' || quote.status === 'approved_revised';
              const isPendingHq = quote.status === 'customer_approved';
              const isHqRejected = quote.status === 'hq_rejected';
              const isCustomerRejected = quote.status === 'rejected';
              const isRevised = quote.status === 'revised' || quote.status === 'approved_revised' || (quote.revisionCount && quote.revisionCount > 0);
              
              const isMixed = !!(quote.isMixedRoomMode || (quote.mixedRoomsSummary && quote.mixedRoomsSummary.totalPax > 0));
              const totalPax = isMixed ? (quote.mixedRoomsSummary?.totalPax || quote.paxCount || 1) : (quote.paxCount || 1);
              const totalGroupPrice = isMixed 
                ? (quote.mixedRoomsSummary?.groupGrandTotalUSD || (quote.finalPriceUSD * totalPax))
                : (quote.finalPriceUSD * totalPax);

              const countdown = get7DaysCountdown(quote.validUntil, quote.createdAt || quote.timestamp);

              return (
                <div
                  key={quote.id}
                  onClick={() => handleOpenPreview(quote)}
                  className={`quote-card-interactive pearl-card rounded-3xl p-5 sm:p-6 border shadow-sm hover:shadow-xl bg-white/95 backdrop-blur-sm cursor-pointer group relative overflow-hidden transition-all duration-300 ${
                    isPendingHq 
                      ? 'border-amber-400 ring-2 ring-amber-400/20 bg-gradient-to-b from-amber-50/30 to-white' 
                      : isHqApproved
                      ? 'border-emerald-300 hover:border-emerald-500 bg-gradient-to-b from-emerald-50/20 to-white'
                      : isHqRejected
                      ? 'border-rose-300 bg-gradient-to-b from-rose-50/20 to-white'
                      : 'border-slate-200/90 hover:border-emerald-400'
                  }`}
                >
                  <div className="space-y-4">
                    
                    {/* 1. KATMAN: Misafir Başlığı, İletişim, Durum & Sayaç Rozetleri */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-slate-100">
                      
                      {/* Sol: Misafir İsim, Telefon, Temsilci */}
                      <div className="flex items-center gap-3.5">
                        <div className={`h-13 w-13 rounded-2xl flex items-center justify-center font-black text-base border shadow-xs shrink-0 group-hover:scale-105 transition-all duration-300 ${
                          isPendingHq
                            ? 'bg-amber-100 text-amber-900 border-amber-300'
                            : isHqApproved
                            ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                            : isHqRejected
                            ? 'bg-rose-100 text-rose-800 border-rose-300'
                            : 'bg-emerald-50 text-emerald-900 border-emerald-200'
                        }`}>
                          {quote.customerName ? quote.customerName.charAt(0).toUpperCase() : 'M'}
                        </div>
                        
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-extrabold text-base text-slate-900 group-hover:text-emerald-900 transition-colors">
                              {quote.customerName || 'Misafir'}
                            </h3>
                            <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
                              #{quote.id?.substring(0, 8)}
                            </span>
                          </div>

                          <div className="flex items-center gap-3 text-slate-500 text-xs font-mono mt-1 flex-wrap">
                            <span className="flex items-center gap-1 font-semibold text-slate-700">
                              <Phone className="h-3.5 w-3.5 text-emerald-600" />
                              <span>{quote.customerPhone || 'Belirtilmedi'}</span>
                            </span>
                            <span className="text-slate-300">•</span>
                            <span className="text-[11px] text-slate-600 font-sans font-medium flex items-center gap-1">
                              <User className="h-3.5 w-3.5 text-slate-400" />
                              <span>Temsilci: <strong className="text-slate-800">{quote.createdByName || 'Personel'}</strong></span>
                              {quote.branch && <span className="text-slate-400">({quote.branch})</span>}
                            </span>
                            <span className="text-slate-300">•</span>
                            <span className="text-[11px] text-slate-400 font-sans">
                              {new Date(quote.createdAt || quote.timestamp).toLocaleDateString('tr-TR')}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Sağ: Durum ve Geri Sayım Rozetleri */}
                      <div className="flex items-center gap-2 flex-wrap justify-start sm:justify-end">
                        {/* ⏳ 7 GÜNLÜK GERİ SAYIM SAYACI */}
                        {!isHqApproved && !isPendingHq && !isHqRejected && !isCustomerRejected && countdown && (
                          <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black border shadow-3xs ${countdown.badgeClass}`}>
                            <Clock className="h-3.5 w-3.5" />
                            <span>{countdown.text}</span>
                          </div>
                        )}

                        {/* 🏷️ DURUM ROZETLERİ */}
                        {isPendingHq ? (
                          <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-black bg-amber-100 text-amber-950 border border-amber-300 shadow-3xs animate-pulse">
                            <ShieldCheck className="h-4 w-4 text-amber-700" />
                            <span>Merkez Onayı Bekleniyor</span>
                          </span>
                        ) : isHqApproved ? (
                          <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-black bg-emerald-100 text-emerald-950 border border-emerald-300 shadow-3xs">
                            <CheckCircle2 className="h-4 w-4 text-emerald-700" />
                            <span>Genel Merkez Onayladı</span>
                          </span>
                        ) : isHqRejected ? (
                          <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-black bg-rose-100 text-rose-900 border border-rose-300 shadow-3xs" title={quote.hqNote || 'Gerekçe belirtilmedi'}>
                            <XCircle className="h-4 w-4 text-rose-700" />
                            <span>Merkez Reddetti</span>
                          </span>
                        ) : isRevised ? (
                          <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-black bg-amber-100 text-amber-900 border border-amber-300 shadow-3xs">
                            <Edit3 className="h-4 w-4 text-amber-700" />
                            <span>Revize Edildi ({quote.revisionCount || 1}x)</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-black bg-sky-100 text-sky-900 border border-sky-200 shadow-3xs">
                            <Clock className="h-4 w-4 text-sky-700" />
                            <span>Müşteri Kararı Bekleniyor</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* 2. KATMAN: Program, Oteller, Yemek ve Konaklama Grid'i */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs">
                      {/* Paket & Dönem */}
                      <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                          <Building2 className="h-3 w-3 text-amber-600" />
                          <span>Paket & Sezon</span>
                        </div>
                        <div className="font-extrabold text-slate-900 text-xs truncate">{quote.packageName}</div>
                        <div className="text-[11px] text-emerald-800 font-semibold flex items-center gap-1">
                          <Calendar className="h-3 w-3 text-emerald-600" />
                          <span>{formatTurkishMonth(quote.selectedMonth, quote.selectedMonthName)} ({quote.makkahDays + quote.madinahDays} Gün)</span>
                        </div>
                      </div>

                      {/* Mekke Oteli */}
                      <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                          <img src="/mekke.png" alt="Mekke" className="h-3 w-3 object-contain opacity-80" />
                          <span>Mekke-i Mükerreme ({quote.makkahDays} Gece)</span>
                        </div>
                        <div className="font-extrabold text-slate-900 text-xs truncate">
                          {quote.selectedMakkahHotel?.name || quote.pkgDetails?.hotelMakkah || 'Mekke Oteli'}
                        </div>
                        <div className="text-[11px] text-slate-500 font-medium truncate">
                          {quote.selectedMakkahHotel?.distance || quote.pkgDetails?.distanceMakkah || 'Merkezi / Yürüme'}
                        </div>
                      </div>

                      {/* Medine Oteli */}
                      <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                          <img src="/medine.png" alt="Medine" className="h-3 w-3 object-contain opacity-80" />
                          <span>Medine-i Münevvere ({quote.madinahDays} Gece)</span>
                        </div>
                        <div className="font-extrabold text-slate-900 text-xs truncate">
                          {quote.selectedMadinahHotel?.name || quote.pkgDetails?.hotelMadinah || 'Medine Oteli'}
                        </div>
                        <div className="text-[11px] text-slate-500 font-medium truncate">
                          {quote.selectedMadinahHotel?.distance || quote.pkgDetails?.distanceMadinah || 'Merkezi / Yürüme'}
                        </div>
                      </div>

                      {/* Yemek & Kişi Sayısı */}
                      <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                          <Users className="h-3 w-3 text-indigo-600" />
                          <span>Kişi & Yemek Konsepti</span>
                        </div>
                        <div className="font-extrabold text-slate-900 text-xs">
                          {isMixed ? `Çoklu Oda (${totalPax} Misafir)` : `${quote.paxCount || 1} Kişilik Oda`}
                        </div>
                        <div className="text-[11px] text-slate-600 font-medium">
                          {quote.includeMakkahMeals !== false ? 'Sabah & Akşam Dahil' : 'Yemeksiz (Sadece Oda)'}
                        </div>
                      </div>
                    </div>

                    {/* Ret Gerekçesi Varsa Göster */}
                    {isHqRejected && quote.hqNote && (
                      <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-start gap-2">
                        <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                        <div>
                          <strong className="font-bold">Genel Merkez Ret Açıklaması:</strong> {quote.hqNote}
                        </div>
                      </div>
                    )}

                    {/* 3. KATMAN: Fiyat Paneli ve Genişletilmiş Eylem Butonları */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-3 border-t border-slate-100 bg-slate-50/60 p-4 rounded-2xl">
                      
                      {/* Sol: Fiyat Bilgisi */}
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-2xl bg-emerald-700 text-white shadow-xs">
                          <DollarSign className="h-6 w-6" />
                        </div>
                        <div>
                          <div className="flex items-baseline gap-1.5">
                            <span className="text-xl sm:text-2xl font-black font-mono text-slate-900">
                              ${isMixed ? totalGroupPrice.toLocaleString('tr-TR') : quote.finalPriceUSD?.toLocaleString('tr-TR')}
                            </span>
                            <span className="text-xs font-extrabold text-emerald-700 font-sans">USD</span>
                            {quote.finalPriceTRY > 0 && (
                              <span className="text-xs font-bold text-slate-400 font-mono">
                                (~{(quote.finalPriceTRY * totalPax).toLocaleString('tr-TR')} ₺)
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 font-medium">
                            {isMixed ? `Toplam Grup Tutarı (${totalPax} Kişi)` : quote.paxCount > 1 ? `Kişi Başı: $${quote.finalPriceUSD} | Toplam: $${totalGroupPrice}` : 'Toplam Fiyat (Kişi Başı)'}
                          </div>
                        </div>
                      </div>

                      {/* Sağ: Genişletilmiş Eylem Butonları (Tam Görünür, İkonlu & Etiketli) */}
                      <div className="flex items-center gap-2 flex-wrap justify-end" onClick={(e) => e.stopPropagation()}>
                        
                        {/* 1. AŞAMA: Müşteri Kararı Beklenirken Gösterilecek Butonlar */}
                        {!isHqApproved && !isPendingHq && !isHqRejected && !isCustomerRejected && (
                          <>
                            <button
                              type="button"
                              onClick={(e) => handleCustomerApprove(quote, e)}
                              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs transition-all cursor-pointer shadow-md shadow-emerald-600/20 hover:scale-105 active:scale-95"
                              title="Müşteri Teklifi Kabul Etti Olarak Merkeze Gönder"
                            >
                              <ThumbsUp className="h-4 w-4" />
                              <span>Müşteri Onayladı</span>
                            </button>

                            <button
                              type="button"
                              onClick={(e) => handleCustomerReject(quote, e)}
                              className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-700 border border-slate-200 hover:border-rose-200 font-bold text-xs transition-all cursor-pointer shadow-2xs hover:scale-105 active:scale-95"
                              title="Müşteri Tekliften Vazgeçti Olarak İşaretle"
                            >
                              <XCircle className="h-3.5 w-3.5" />
                              <span className="hidden sm:inline">Vazgeçti</span>
                            </button>
                          </>
                        )}

                        {/* 1. AŞAMA GERİ ÇEKME: Müşteri Onayı Verilmişken Geri Çekme (Personel & Merkez) */}
                        {isPendingHq && (
                          <button
                            type="button"
                            onClick={(e) => handleCustomerRevoke(quote, e)}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 font-bold text-xs transition-all cursor-pointer shadow-2xs hover:scale-105 active:scale-95"
                            title="Müşteri Onayını Geri Çek ve Tekrar Değerlendirmeye Al"
                          >
                            <Undo2 className="h-4 w-4 text-amber-700" />
                            <span>Onayı Geri Çek</span>
                          </button>
                        )}

                        {/* 2. AŞAMA: Merkez Onayı Bekleyen Teklif İçin Merkez Karar Butonları */}
                        {isPendingHq && isHqOrAdmin && (
                          <>
                            <button
                              type="button"
                              onClick={(e) => handleHqApprove(quote, e)}
                              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs transition-all cursor-pointer shadow-md shadow-emerald-700/25 hover:scale-105 active:scale-95 animate-pulse"
                              title="Genel Merkez Olarak Teklifi Resmi Onayla"
                            >
                              <Check className="h-4 w-4" />
                              <span>✓ Merkez Onayla</span>
                            </button>

                            <button
                              type="button"
                              onClick={(e) => handleOpenRejectModal(quote, e)}
                              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 font-bold text-xs transition-all cursor-pointer shadow-2xs hover:scale-105 active:scale-95"
                              title="Teklifi Reddet"
                            >
                              <XCircle className="h-4 w-4 text-rose-600" />
                              <span>Reddet</span>
                            </button>
                          </>
                        )}

                        {/* 🛑 MERKEZ ONAYINI SONRADAN REDDETME / İPTAL ETME (Merkez Yetkilisi İçin) */}
                        {isHqApproved && isHqOrAdmin && (
                          <button
                            type="button"
                            onClick={(e) => handleOpenRejectModal(quote, e)}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 font-bold text-xs transition-all cursor-pointer shadow-2xs hover:scale-105 active:scale-95"
                            title="Genel Merkez Onayını Geri Çek ve Reddet"
                          >
                            <XCircle className="h-4 w-4 text-rose-600" />
                            <span>Onayı İptal Et / Reddet</span>
                          </button>
                        )}

                        {/* 🔄 REDDEDİLMİŞ TEKLİFİ YENİDEN ONAYLAMA (Merkez Yetkilisi İçin) */}
                        {isHqRejected && isHqOrAdmin && (
                          <button
                            type="button"
                            onClick={(e) => handleHqApprove(quote, e)}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-850 border border-emerald-300 font-bold text-xs transition-all cursor-pointer shadow-2xs hover:scale-105 active:scale-95"
                            title="Reddedilen Teklifi Şartlar Uygunsa Yeniden Onayla"
                          >
                            <RotateCcw className="h-4 w-4 text-emerald-700" />
                            <span>Yeniden Onayla</span>
                          </button>
                        )}

                        {/* 🔄 MÜŞTERİ VAZGEÇMİŞ TEKLİFİ TEKRAR AKTİFE ALMA */}
                        {isCustomerRejected && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              updateQuoteStatus(quote.id, 'pending', currentUser, 'Teklif tekrar aktife alındı.');
                              showAlert({ title: 'Teklif Aktifleştirildi', message: 'Teklif tekrar müşteri kararı aşamasına alındı.', type: 'info' });
                            }}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-850 border border-sky-300 font-bold text-xs transition-all cursor-pointer shadow-2xs hover:scale-105 active:scale-95"
                            title="Teklifi Tekrar Aktif Yap"
                          >
                            <RotateCcw className="h-4 w-4 text-sky-700" />
                            <span>Tekrar Aktife Al</span>
                          </button>
                        )}

                        {/* Önizle Butonu */}
                        <button
                          type="button"
                          onClick={() => handleOpenPreview(quote)}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs transition-all cursor-pointer shadow-2xs hover:scale-105 active:scale-95"
                          title="Teklif Mektubunu Önizle"
                        >
                          <Eye className="h-4 w-4" />
                          <span>Önizle</span>
                        </button>

                        {/* Düzenle Butonu */}
                        <button
                          type="button"
                          onClick={(e) => handleEditClick(quote, e)}
                          className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 font-bold text-xs transition-all cursor-pointer shadow-2xs hover:scale-105 active:scale-95"
                          title="Teklifi Düzenle / Revize Et"
                        >
                          <Edit3 className="h-3.5 w-3.5 text-amber-700" />
                          <span className="hidden sm:inline">Düzenle</span>
                        </button>

                        {/* PDF İndir */}
                        <button
                          type="button"
                          disabled={downloadingId === quote.id}
                          onClick={(e) => handleDirectDownload(quote, e)}
                          className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-bold text-xs transition-all cursor-pointer shadow-2xs disabled:opacity-50 hover:scale-105 active:scale-95"
                          title="Doğrudan PDF İndir"
                        >
                          {downloadingId === quote.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-600" />
                          ) : (
                            <Download className="h-3.5 w-3.5 text-slate-600" />
                          )}
                          <span className="hidden sm:inline">PDF</span>
                        </button>

                        {/* WhatsApp Paylaş */}
                        <button
                          type="button"
                          onClick={(e) => handleWhatsApp(quote, e)}
                          className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold text-xs transition-all cursor-pointer shadow-2xs hover:scale-105 active:scale-95"
                          title="WhatsApp ile Gönder"
                        >
                          <Send className="h-3.5 w-3.5 text-emerald-700" />
                          <span className="hidden sm:inline">WhatsApp</span>
                        </button>

                        {/* Sil (Admin veya HQ_ASSISTANT) */}
                        {isHqOrAdmin && (
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
                            className="p-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 transition-all cursor-pointer shadow-2xs hover:scale-105 active:scale-95"
                            title="Teklifi Sil"
                          >
                            <Trash2 className="h-4 w-4" />
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

        {/* 📑 Sayfalama (Pagination) */}
        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-slate-100 text-xs">
            <div className="text-slate-500 font-medium">
              Toplam <strong className="text-slate-800">{filteredQuotes.length}</strong> tekliften{' '}
              <strong className="text-slate-800">{(currentPage - 1) * ITEMS_PER_PAGE + 1}</strong> -{' '}
              <strong className="text-slate-800">{Math.min(currentPage * ITEMS_PER_PAGE, filteredQuotes.length)}</strong> arası gösteriliyor.
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                className="p-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-emerald-50 hover:text-emerald-900 hover:border-emerald-300 transition-all cursor-pointer shadow-3xs disabled:opacity-40 disabled:cursor-not-allowed"
                title="Önceki Sayfa"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                <button
                  key={pageNum}
                  type="button"
                  onClick={() => setCurrentPage(pageNum)}
                  className={`h-8 w-8 rounded-xl font-bold transition-all cursor-pointer ${
                    currentPage === pageNum
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 shadow-3xs'
                  }`}
                >
                  {pageNum}
                </button>
              ))}

              <button
                type="button"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                className="p-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-emerald-50 hover:text-emerald-900 hover:border-emerald-300 transition-all cursor-pointer shadow-3xs disabled:opacity-40 disabled:cursor-not-allowed"
                title="Sonraki Sayfa"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

      </div>

    </div>
  );
}
