import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { calculateQuotation, generateRoomMatrix } from '../../services/pricingEngine';
import LiveQuoteCard from './LiveQuoteCard';
import RoomComparisonTable from './RoomComparisonTable';
import QuotationPdfModal from '../pdf/QuotationPdfModal';
import CustomSelect from '../common/CustomSelect';
import { 
  Calculator, 
  Calendar, 
  Bed, 
  Bus, 
  Coins, 
  MapPin, 
  Check, 
  Info,
  Layers,
  User,
  Phone,
  MessageSquare,
  DollarSign,
  Edit3,
  FileEdit,
  FileText,
  RotateCcw,
  Building,
  Building2,
  XCircle,
  Car,
  Plane,
  Navigation,
  Printer,
  Download,
  Send,
  CheckCircle2,
  Sparkles,
  Users,
  Clock,
  Plus,
  Minus,
  Moon,
  Utensils
} from 'lucide-react';
import confetti from 'canvas-confetti';
import QuotationLetterView from './QuotationLetterView';
import { generateQuotationPdf, generateWhatsAppMessage, openQuotationInNewPage } from '../../services/pdfService';

const TRANSFER_ROUTES = [
  { id: 'jedMek', label: 'Cidde - Mekke Otel', smallKey: 'jedMekSmall', bigKey: 'jedMekBig', routeCode: 'JED-MEK' },
  { id: 'mekMed', label: 'Mekke - Medine Transfer', smallKey: 'mekMedSmall', bigKey: 'mekMedBig', routeCode: 'MEK-MED' },
  { id: 'medAir', label: 'Medine Otel - Havaalanı', smallKey: 'medAirSmall', bigKey: 'medAirBig', routeCode: 'MED-AIR' },
];

const FIXED_EXPENSES_INFO = [
  { key: 'flightTicketSAR', label: 'Uçak Bileti', desc: 'Tarifeli / Charter Uçuş Bedeli' },
  { key: 'visaTaxSAR', label: 'Vize + Vergi', desc: 'Suudi Arabistan Vize Harcı & Vergiler' },
  { key: 'insuranceSAR', label: 'Sigorta', desc: 'Kapsamlı Yurt Dışı Seyahat Sigortası' },
  { key: 'bagSAR', label: 'Çanta', desc: 'İnzar Kurumsal Valiz / Çanta Seti' },
  { key: 'scarfSAR', label: 'Fular / Eşarp', desc: 'Rehberlik ve Tanıtım Aksesuarı' },
  { key: 'guideSAR', label: 'Fri / Görevli', desc: 'Rehber Hoca ve Görevli Operasyon Payı' },
  { key: 'commissionSAR', label: 'Komisyon', desc: 'Personel / Acente Komisyon Havuzu' },
  { key: 'bonusSAR', label: 'Prim', desc: 'Operasyon ve Satış Ekibi Başarı Primi' },
  { key: 'zamzamSAR', label: 'Zemzem', desc: '5 Litre Orijinal Ambalajlı Diyanet Zemzemi' },
  { key: 'branchExpenseSAR', label: 'Şube Giderleri', desc: 'Şube ve İdari Genel Gider Payı' },
];



const getInitialDraft = () => {
  try {
    const raw = localStorage.getItem('inzar_wizard_draft_v2');
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
};

export default function AgentQuotationWizard({ setActiveTab = () => {} }) {
  const { packages, currencies, months, saveQuote, editingQuote, setEditingQuote } = useData();
  const { currentUser } = useAuth();
  const draft = getInitialDraft();

  // Wizard View Mode: 'form' | 'letter'
  const [viewMode, setViewMode] = useState('form');

  // Wizard States (Persistent across menu switches)
  const [selectedPkgId, setSelectedPkgId] = useState(draft?.selectedPkgId || packages[1]?.id || packages[0]?.id || 'standart');
  const [selectedMonth, setSelectedMonth] = useState(draft?.selectedMonth || 'jan');
  const [makkahDays, setMakkahDays] = useState(draft?.makkahDays ?? 7);
  const [makkahOccupancy, setMakkahOccupancy] = useState(draft?.makkahOccupancy ?? 2); // 2, 3, 4, 1
  const [madinahDays, setMadinahDays] = useState(draft?.madinahDays ?? 4);
  const [madinahOccupancy, setMadinahOccupancy] = useState(draft?.madinahOccupancy ?? 2); // 2, 3, 4, 1
  const [isMixedRoomMode, setIsMixedRoomMode] = useState(draft?.isMixedRoomMode ?? false);
  const [mixedRooms, setMixedRooms] = useState(draft?.mixedRooms || { single: 1, double: 2, triple: 1, quad: 1 });
  const [paxCount, setPaxCount] = useState(draft?.paxCount ?? 2);
  const [discountUSD, setDiscountUSD] = useState(draft?.discountUSD ?? 0);
  const [applyProfitMargin, setApplyProfitMargin] = useState(draft?.applyProfitMargin ?? true);

  // Transfer Route Selections: vehicleType ('small' | 'big' | 'none'), passengerCount
  const [transfersSelection, setTransfersSelection] = useState(draft?.transfersSelection || {
    jedMek: { vehicleType: 'small', passengerCount: 2 },
    mekMed: { vehicleType: 'small', passengerCount: 2 },
    medAir: { vehicleType: 'small', passengerCount: 2 },
  });

  // Fixed Expenses Selection: boolean map
  const [fixedExpensesIncluded, setFixedExpensesIncluded] = useState(draft?.fixedExpensesIncluded || {
    flightTicketSAR: true,
    visaTaxSAR: true,
    insuranceSAR: true,
    bagSAR: true,
    scarfSAR: true,
    guideSAR: true,
    commissionSAR: true,
    bonusSAR: true,
    zamzamSAR: true,
    branchExpenseSAR: true,
  });

  // Customer Info
  const [customerName, setCustomerName] = useState(draft?.customerName || '');
  const [customerPhone, setCustomerPhone] = useState(draft?.customerPhone || '');
  const [notes, setNotes] = useState(draft?.notes || '');

  // UI State
  const [activeCurrency, setActiveCurrency] = useState('USD');
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  // 1-Second Live Clock Ticker
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Auto-Save Draft to LocalStorage (only when not editing an existing quote)
  useEffect(() => {
    if (!editingQuote) {
      const dataToSave = {
        selectedPkgId,
        selectedMonth,
        makkahDays,
        makkahOccupancy,
        madinahDays,
        madinahOccupancy,
        paxCount,
        discountUSD,
        applyProfitMargin,
        transfersSelection,
        fixedExpensesIncluded,
        customerName,
        customerPhone,
        notes
      };
      try {
        localStorage.setItem('inzar_wizard_draft_v2', JSON.stringify(dataToSave));
      } catch (e) {}
    }
  }, [
    selectedPkgId,
    selectedMonth,
    makkahDays,
    makkahOccupancy,
    madinahDays,
    madinahOccupancy,
    paxCount,
    discountUSD,
    applyProfitMargin,
    transfersSelection,
    fixedExpensesIncluded,
    customerName,
    customerPhone,
    notes,
    editingQuote
  ]);

  const handleResetDraft = () => {
    localStorage.removeItem('inzar_wizard_draft_v2');
    setSelectedPkgId(packages[1]?.id || packages[0]?.id || 'standart');
    setSelectedMonth('jan');
    setMakkahDays(7);
    setMakkahOccupancy(2);
    setMadinahDays(4);
    setMadinahOccupancy(2);
    setPaxCount(2);
    setDiscountUSD(0);
    setApplyProfitMargin(true);
    setTransfersSelection({
      jedMek: { vehicleType: 'small', passengerCount: 2 },
      mekMed: { vehicleType: 'small', passengerCount: 2 },
      medAir: { vehicleType: 'small', passengerCount: 2 },
    });
    setFixedExpensesIncluded({
      flightTicketSAR: true,
      visaTaxSAR: true,
      insuranceSAR: true,
      bagSAR: true,
      scarfSAR: true,
      guideSAR: true,
      commissionSAR: true,
      bonusSAR: true,
      zamzamSAR: true,
      branchExpenseSAR: true,
    });
    setCustomerName('');
    setCustomerPhone('');
    setNotes('');
  };

  // Edit Mode Initialization
  useEffect(() => {
    if (editingQuote) {
      const pkgId = editingQuote.packageId || editingQuote.pkgDetails?.id;
      if (pkgId) setSelectedPkgId(pkgId);
      if (editingQuote.selectedMonth) setSelectedMonth(editingQuote.selectedMonth);
      if (editingQuote.makkahDays !== undefined) setMakkahDays(Number(editingQuote.makkahDays));
      if (editingQuote.madinahDays !== undefined) setMadinahDays(Number(editingQuote.madinahDays));
      if (editingQuote.makkahRoomOccupancy !== undefined) setMakkahOccupancy(Number(editingQuote.makkahRoomOccupancy));
      if (editingQuote.madinahRoomOccupancy !== undefined) setMadinahOccupancy(Number(editingQuote.madinahRoomOccupancy));
      if (editingQuote.paxCount !== undefined) setPaxCount(Number(editingQuote.paxCount));
      if (editingQuote.customDiscountUSD !== undefined || editingQuote.discountUSD !== undefined) {
        setDiscountUSD(Number(editingQuote.customDiscountUSD || editingQuote.discountUSD || 0));
      }
      setCustomerName(editingQuote.customerName || '');
      setCustomerPhone(editingQuote.customerPhone || '');
      setNotes(editingQuote.notes || '');
      if (editingQuote.applyProfitMargin !== undefined) {
        setApplyProfitMargin(editingQuote.applyProfitMargin);
      }
      if (editingQuote.isMixedRoomMode !== undefined) {
        setIsMixedRoomMode(editingQuote.isMixedRoomMode);
      }
      if (editingQuote.mixedRooms) {
        setMixedRooms(editingQuote.mixedRooms);
      }
      if (editingQuote.transfersSelection) {
        setTransfersSelection(editingQuote.transfersSelection);
      }
      if (editingQuote.fixedExpensesIncluded) {
        setFixedExpensesIncluded(editingQuote.fixedExpensesIncluded);
      }
      setViewMode('form');
    }
  }, [editingQuote, packages]);

  const sortedPackages = useMemo(() => {
    const order = { 'ekonomik': 1, 'standart': 2, 'luxe': 3, 'vip': 3 };
    return [...(packages || [])].sort((a, b) => (order[a.id] || 99) - (order[b.id] || 99));
  }, [packages]);

  const activePackage = useMemo(() => {
    return sortedPackages.find(p => p.id === selectedPkgId) || sortedPackages[0];
  }, [sortedPackages, selectedPkgId]);

  const activeMonthsList = useMemo(() => {
    return months || [];
  }, [months]);

  const activeMonth = useMemo(() => {
    return activeMonthsList.find(m => m.id === selectedMonth) || activeMonthsList[0] || { id: 'jan', name: 'Ocak' };
  }, [activeMonthsList, selectedMonth]);

  // Real-time Pricing Calculation
  const rawQuotation = useMemo(() => {
    if (!activePackage) return null;
    
    return calculateQuotation({
      pkg: activePackage,
      selectedMonth,
      makkahDays,
      makkahRoomOccupancy: makkahOccupancy,
      madinahDays,
      madinahRoomOccupancy: madinahOccupancy,
      isMixedRoomMode,
      mixedRooms,
      transfersSelection,
      fixedExpensesIncluded,
      currencies,
      customDiscountUSD: discountUSD,
      applyProfitMargin,
      paxCount,
      customerName,
      customerPhone,
      notes,
      agentName: currentUser?.name || 'Acente Temsilcisi',
      isRevision: !!editingQuote,
      originalQuoteId: editingQuote?.id || null
    });
  }, [
    activePackage, 
    selectedMonth, 
    makkahDays, 
    makkahOccupancy, 
    madinahDays, 
    madinahOccupancy, 
    isMixedRoomMode,
    mixedRooms,
    transfersSelection, 
    fixedExpensesIncluded, 
    currencies, 
    discountUSD, 
    applyProfitMargin,
    paxCount, 
    customerName, 
    customerPhone, 
    notes,
    currentUser,
    editingQuote
  ]);

  // Room Matrix Comparison
  const roomMatrix = useMemo(() => {
    if (!activePackage) return [];
    return generateRoomMatrix(
      activePackage,
      selectedMonth,
      makkahDays,
      madinahDays,
      currencies
    );
  }, [activePackage, selectedMonth, makkahDays, madinahDays, currencies]);

  // Enriched full quotation
  const currentQuotation = useMemo(() => {
    if (!rawQuotation) return null;
    const selectedMonthObj = months?.find(m => m.id === selectedMonth) || { label: 'Ocak (Sömestr Tatili)', name: 'Ocak' };
    const selectedMonthLabel = selectedMonthObj?.label || selectedMonthObj?.name || 'Ocak (Sömestr Tatili)';

    return {
      ...rawQuotation,
      id: editingQuote ? editingQuote.id : undefined,
      selectedMonth,
      selectedMonthLabel,
      selectedMonthName: activeMonth?.name || activeMonth?.label || selectedMonth,
      pkgDetails: activePackage,
      roomMatrix,
      fixedExpensesIncluded,
      transfersSelection,
      customerName,
      customerPhone,
      paxCount,
      notes,
      agentName: currentUser?.name || 'Acente Temsilcisi',
      isRevision: !!editingQuote,
      originalQuoteId: editingQuote?.id || null
    };
  }, [rawQuotation, activePackage, roomMatrix, fixedExpensesIncluded, transfersSelection, customerName, customerPhone, paxCount, notes, currentUser, months, selectedMonth, editingQuote, activeMonth]);

  const toggleFixedExpense = (key) => {
    setFixedExpensesIncluded(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleTransferChange = (routeId, field, value) => {
    setTransfersSelection(prev => ({
      ...prev,
      [routeId]: {
        ...prev[routeId],
        [field]: value
      }
    }));
  };

  const handleSaveQuote = () => {
    if (!currentQuotation) return;
    saveQuote(currentQuotation);
    setIsSaved(true);
    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.7 }
    });
    if (editingQuote) {
      setEditingQuote(null);
    }
    setTimeout(() => setIsSaved(false), 2500);
  };

  const handleDownloadPdf = async () => {
    if (!currentQuotation) return;
    try {
      setIsDownloadingPdf(true);
      await generateQuotationPdf('inzar-app-printable-letter', currentQuotation);
    } catch (err) {
      console.error('PDF download error:', err);
      alert('PDF oluşturulamadı, Yazdır butonundan PDF Olarak Kaydet seçeneğini kullanabilirsiniz.');
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  return (
    <div className="space-y-5 font-sans">
      {/* ✏️ Active Edit Mode Banner */}
      {editingQuote && (
        <div className="pearl-card rounded-3xl p-4 sm:p-5 bg-gradient-to-r from-amber-50 via-amber-100/40 to-amber-50 border-2 border-amber-400 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-slide-down">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-500 text-white shadow-xs shrink-0">
              <Edit3 className="h-5 w-5" />
            </div>
            <div>
              <div className="text-[11px] font-extrabold uppercase tracking-wider text-amber-900">
                TEKLİF DÜZENLEME & REVİZYON MODU
              </div>
              <div className="text-sm font-black text-slate-900">
                {editingQuote.customerName || 'Misafir'} • {editingQuote.packageName}
                <span className="ml-2 text-xs font-bold text-amber-700 bg-amber-200/80 px-2 py-0.5 rounded-full">
                  Revizyon Kaydı
                </span>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setEditingQuote(null);
              handleResetDraft();
            }}
            className="px-4 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold border border-slate-300 transition-all cursor-pointer shadow-2xs self-start sm:self-auto"
          >
            Düzenlemeyi İptal Et
          </button>
        </div>
      )}

      {/* 🚀 Robust Minimalist Top Toolbar with Zero Collision */}
      <div className="flex flex-wrap items-center justify-between gap-3 min-h-[40px] mb-1">
        {/* Sliding Pill Segmented Switcher */}
        <div className="relative p-1 bg-white/95 rounded-full border border-slate-200/90 shadow-2xs flex items-center select-none w-64 sm:w-72 shrink-0">
          {/* Active Sliding Floating Pill (Smooth GPU Spring Animation) */}
          <div
            className={`absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-full bg-gradient-to-r from-emerald-800 to-emerald-600 shadow-md shadow-emerald-900/20 transition-all duration-300 ease-[cubic-bezier(0.34,1.4,0.64,1)] pointer-events-none ${
              viewMode === 'letter' ? 'left-[calc(50%+2px)]' : 'left-1'
            }`}
          />

          <button
            type="button"
            onClick={() => setViewMode('form')}
            className={`relative z-10 flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-full text-xs font-bold transition-colors duration-200 cursor-pointer ${
              viewMode === 'form' ? 'text-white' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileEdit className="h-3.5 w-3.5 shrink-0" />
            <span>Teklif Formu</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('letter')}
            className={`relative z-10 flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-full text-xs font-bold transition-colors duration-200 cursor-pointer ${
              viewMode === 'letter' ? 'text-white' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="h-3.5 w-3.5 shrink-0" />
            <span>Teklif Mektubu</span>
          </button>
        </div>

        {/* Right Section: Form Mode Live Real-time Clock OR A4 Mode Action Buttons with Smooth CSS Transitions */}
        <div key={viewMode} className="animate-fade-scale">
          {viewMode === 'form' ? (
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/95 border border-slate-200/90 shadow-3xs select-none">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
              </span>
              <Clock className="h-3.5 w-3.5 text-emerald-700 ml-0.5" />
              <span className="text-xs font-semibold text-slate-700">
                {currentTime.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', weekday: 'long' })}
              </span>
              <span className="text-slate-300">|</span>
              <span className="text-xs font-mono font-bold text-slate-950">
                {currentTime.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2 flex-wrap">
              {/* Print Button */}
              <button
                type="button"
                onClick={() => window.print()}
                className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs transition-all cursor-pointer spring-pill shadow-xs"
                title="Yazıcıdan A4 Olarak Yazdır"
              >
                <Printer className="h-3.5 w-3.5" />
                <span>Yazdır</span>
              </button>

              {/* Download PDF Button */}
              <button
                type="button"
                onClick={handleDownloadPdf}
                disabled={isDownloadingPdf}
                className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs transition-all cursor-pointer spring-pill shadow-xs disabled:opacity-60"
                title="Tek Sayfa A4 PDF İndir"
              >
                <Download className="h-3.5 w-3.5" />
                <span>{isDownloadingPdf ? 'Hazırlanıyor...' : 'PDF İndir'}</span>
              </button>

              {/* Save Quote Button */}
              <button
                type="button"
                onClick={handleSaveQuote}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full font-bold text-xs border transition-all cursor-pointer ${
                  isSaved
                    ? 'bg-amber-100 text-amber-900 border-amber-300'
                    : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300'
                }`}
              >
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                <span>{isSaved ? 'Kaydedildi!' : 'Teklifi Kaydet'}</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 🎬 60FPS High-Performance Animated Content Viewport */}
      <div key={viewMode} className="animate-fade-scale w-full min-w-0">
        {viewMode === 'letter' ? (
          <QuotationLetterView
            quotation={currentQuotation}
            onBackToForm={() => setViewMode('form')}
            onSaveQuote={handleSaveQuote}
            isSaved={isSaved}
            activeCurrency={activeCurrency}
          />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start font-sans">
            {/* Left 7/8 Columns: Configuration Form */}
            <div className="lg:col-span-7 xl:col-span-8 space-y-6 pb-24">

        {/* Step 1: Seyahat Dönemi / Ayı */}
        <div id="step-1" className="pearl-card rounded-2xl p-5 sm:p-6 space-y-4 shadow-2xs border border-slate-200/90 bg-white scroll-mt-6">
          <div className="flex flex-wrap items-center justify-between border-b border-slate-100 pb-3 gap-2">
            <div className="flex items-center gap-2.5">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs font-mono shrink-0">
                1
              </span>
              <h3 className="text-sm font-bold text-slate-900 font-display flex items-center gap-1.5">
                <Calendar className="h-4 w-4 text-emerald-600" />
                <span>Seyahat Dönemi & Ayı</span>
              </h3>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleResetDraft}
                className="px-3 py-1 rounded-full bg-slate-100 hover:bg-rose-50 hover:text-rose-800 hover:border-rose-300 text-slate-600 border border-slate-200 text-xs font-bold transition-all cursor-pointer spring-pill shadow-3xs"
                title="Tüm seçimleri sıfırla ve yeni teklif başlat"
              >
                Yeni Teklif / Sıfırla
              </button>

              <span className="text-[11px] text-emerald-800 font-bold bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                Otel Fiyatları Otomatik Çekilir
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
            {activeMonthsList.map((m) => {
              const isSelected = selectedMonth === m.id;
              const seasonLabel = m.badge || (m.subtitle && m.subtitle !== 'Dönem' ? m.subtitle : 'Standart');
              const isSpecial = m.badge && m.badge !== 'Standart';

              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setSelectedMonth(m.id)}
                  className={`h-15 p-2.5 rounded-xl text-left spring-pill border cursor-pointer relative flex flex-col justify-between overflow-hidden select-none transition-all ${
                    isSelected
                      ? 'border-emerald-600 bg-emerald-50/90 text-emerald-950 ring-2 ring-emerald-600/30 shadow-xs scale-101'
                      : 'border-slate-200/80 bg-white hover:border-emerald-300 text-slate-700 hover:bg-slate-50/80'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="text-xs font-bold font-display">{m.name}</span>
                    {isSpecial && (
                      <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-900 border border-amber-200">
                        {m.badge}
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-slate-400 font-medium">
                    {seasonLabel}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Step 2: Umre Paketi & Otel Standartları (Detaylı, Lüks ve Açık Kart Tasarımı) */}
        <div id="step-2" className="pearl-card rounded-2xl p-5 sm:p-6 space-y-4 shadow-2xs border border-slate-200/90 bg-white scroll-mt-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2.5">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs font-mono shrink-0">
                2
              </span>
              <h3 className="text-sm font-bold text-slate-900 font-display flex items-center gap-1.5">
                <Layers className="h-4 w-4 text-emerald-600" />
                <span>Umre Paketi & Otel Kategorisi</span>
              </h3>
            </div>
            <span className="text-xs text-slate-400 font-medium hidden sm:inline">
              {activeMonth?.name || 'Seçili Dönem'} Fiyatları
            </span>
          </div>

          <div key={selectedMonth} className="space-y-4 animate-fade-scale">
            {sortedPackages.map((pkg, idx) => {
              const isSelected = selectedPkgId === pkg.id;
              const monthRate = pkg.monthlyPrices?.[selectedMonth] || { makkahRoomSAR: 0, madinahRoomSAR: 0 };
              const makkahFood = pkg.makkahFoodPriceSAR || pkg.makkahFoodSAR || 35;
              const madinahFood = pkg.madinahFoodPriceSAR || pkg.madinahFoodSAR || 45;

              // Bright Satin Metallic Theme Configuration per Package
              const pkgId = (pkg?.id || '').toLowerCase();
              
              let theme = {
                cardBg: isSelected
                  ? 'bg-gradient-to-br from-emerald-100 via-teal-100 to-emerald-200/80 border-2 border-emerald-600 ring-4 ring-emerald-500/25 shadow-xl scale-[1.008]'
                  : 'bg-gradient-to-br from-emerald-100/80 via-teal-50 to-emerald-100/90 border border-emerald-300 hover:border-emerald-500 hover:shadow-lg shadow-sm',
                tag: 'En Çok Tercih Edilen',
                tagBg: 'bg-emerald-800 text-white shadow-2xs',
                accentDot: 'bg-emerald-600 ring-emerald-300',
                descText: 'text-emerald-950/80',
                panelBg: 'bg-white/95 border-emerald-200/80 shadow-2xs hover:shadow-md hover:border-emerald-300',
                panelHeading: 'text-emerald-800',
                cityBadge: 'bg-emerald-100 text-emerald-900 border-emerald-300',
                distancePill: 'bg-emerald-50 text-emerald-900 border-emerald-200 group-hover/hotel:bg-emerald-100',
                selectedBadge: 'bg-gradient-to-r from-emerald-700 to-emerald-800 text-white font-black shadow-sm',
                priceLabel: 'text-emerald-950',
                iconColor: 'text-emerald-700',
                priceBorder: 'border-emerald-100',
              };

              if (pkgId.includes('ekonomik')) {
                theme = {
                  cardBg: isSelected
                    ? 'bg-gradient-to-br from-blue-100 via-sky-100 to-blue-200/80 border-2 border-blue-600 ring-4 ring-blue-500/25 shadow-xl scale-[1.008]'
                    : 'bg-gradient-to-br from-blue-100/80 via-sky-50 to-blue-100/90 border border-blue-300 hover:border-blue-500 hover:shadow-lg shadow-sm',
                  tag: 'Ekonomik Tercih',
                  tagBg: 'bg-blue-800 text-white shadow-2xs',
                  accentDot: 'bg-blue-600 ring-blue-300',
                  descText: 'text-blue-950/80',
                  panelBg: 'bg-white/95 border-blue-200/80 shadow-2xs hover:shadow-md hover:border-blue-300',
                  panelHeading: 'text-blue-800',
                  cityBadge: 'bg-blue-100 text-blue-900 border-blue-300',
                  distancePill: 'bg-blue-50 text-blue-900 border-blue-200 group-hover/hotel:bg-blue-100',
                  selectedBadge: 'bg-gradient-to-r from-blue-600 to-blue-700 text-white font-black shadow-sm',
                  priceLabel: 'text-blue-950',
                  iconColor: 'text-blue-700',
                  priceBorder: 'border-blue-100',
                };
              } else if (pkgId.includes('luxe') || pkgId.includes('vip')) {
                theme = {
                  cardBg: isSelected
                    ? 'bg-gradient-to-br from-amber-100 via-orange-100 to-amber-200/80 border-2 border-amber-600 ring-4 ring-amber-500/25 shadow-xl scale-[1.008]'
                    : 'bg-gradient-to-br from-amber-100/80 via-orange-50 to-amber-100/90 border border-amber-300 hover:border-amber-500 hover:shadow-lg shadow-sm',
                  tag: 'VIP & Ultra Lüks',
                  tagBg: 'bg-amber-800 text-white shadow-2xs',
                  accentDot: 'bg-amber-600 ring-amber-300',
                  descText: 'text-amber-950/80',
                  panelBg: 'bg-white/95 border-amber-200/80 shadow-2xs hover:shadow-md hover:border-amber-300',
                  panelHeading: 'text-amber-800',
                  cityBadge: 'bg-amber-100 text-amber-900 border-amber-300',
                  distancePill: 'bg-amber-50 text-amber-900 border-amber-200 group-hover/hotel:bg-amber-100',
                  selectedBadge: 'bg-gradient-to-r from-amber-600 to-amber-700 text-white font-black shadow-sm',
                  priceLabel: 'text-amber-950',
                  iconColor: 'text-amber-700',
                  priceBorder: 'border-amber-100',
                };
              }

              return (
                <div
                  key={pkg.id}
                  onClick={() => setSelectedPkgId(pkg.id)}
                  className={`group cursor-pointer rounded-[26px] p-5 sm:p-6 transition-all duration-300 select-none flex flex-col xl:flex-row xl:items-center justify-between gap-5 hover:-translate-y-1 active:scale-[0.995] ${theme.cardBg}`}
                >
                  {/* Left & Middle Section: Header & Inset Clean Panels */}
                  <div className="space-y-4 flex-1 min-w-0">
                    
                    {/* Header: Title + Tag + Selected Button */}
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className={`h-4 w-4 rounded-full ring-4 shrink-0 shadow-sm transition-transform duration-300 group-hover:scale-110 ${theme.accentDot}`} />
                        <h4 className="text-lg sm:text-2xl font-black font-display text-slate-900 tracking-tight group-hover:translate-x-0.5 transition-transform">
                          {pkg.name}
                        </h4>
                        <span className={`px-3 py-0.5 rounded-full text-[11px] font-extrabold tracking-wider uppercase transition-transform group-hover:scale-105 ${theme.tagBg}`}>
                          {pkg.badge && pkg.badge !== 'Standart' ? pkg.badge : theme.tag}
                        </span>
                        {isSelected && (
                          <span className={`inline-flex items-center gap-1.5 px-4 py-1 rounded-full text-xs font-black transition-all animate-scale-in ${theme.selectedBadge}`}>
                            <Check className="h-3.5 w-3.5 stroke-[3]" />
                            <span>Seçili Paket</span>
                          </span>
                        )}
                      </div>

                      {pkg.description && (
                        <p className={`text-xs font-semibold max-w-md hidden md:block ${theme.descText}`}>
                          {pkg.description}
                        </p>
                      )}
                    </div>

                    {/* Inset White Glass Hotel Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-0.5">
                      
                      {/* Mekke Oteli Inset Panel */}
                      <div className={`group/hotel p-4 rounded-2xl border transition-all duration-200 space-y-2 hover:scale-[1.01] ${theme.panelBg}`}>
                        <div className="flex items-center justify-between">
                          <span className={`text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 ${theme.panelHeading}`}>
                            <Building className={`h-3.5 w-3.5 ${theme.iconColor} group-hover/hotel:rotate-6 transition-transform`} />
                            <span>Mekke Konaklama</span>
                          </span>
                          <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${theme.cityBadge}`}>
                            Mekke-i Mükerreme
                          </span>
                        </div>
                        <div className="text-xs sm:text-sm font-black text-slate-900 leading-snug break-words">
                          {pkg.hotelMakkah}
                        </div>
                        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-bold border transition-colors ${theme.distancePill}`}>
                          <MapPin className="h-3 w-3 shrink-0" />
                          <span>Mesafe: {pkg.distanceMakkah || 'Harem Yakını'}</span>
                        </div>
                      </div>

                      {/* Medine Oteli Inset Panel */}
                      <div className={`group/hotel p-4 rounded-2xl border transition-all duration-200 space-y-2 hover:scale-[1.01] ${theme.panelBg}`}>
                        <div className="flex items-center justify-between">
                          <span className={`text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 ${theme.panelHeading}`}>
                            <Building2 className={`h-3.5 w-3.5 ${theme.iconColor} group-hover/hotel:rotate-6 transition-transform`} />
                            <span>Medine Konaklama</span>
                          </span>
                          <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${theme.cityBadge}`}>
                            Medine-i Münevvere
                          </span>
                        </div>
                        <div className="text-xs sm:text-sm font-black text-slate-900 leading-snug break-words">
                          {pkg.hotelMadinah}
                        </div>
                        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-bold border transition-colors ${theme.distancePill}`}>
                          <MapPin className="h-3 w-3 shrink-0" />
                          <span>Mesafe: {pkg.distanceMadinah || 'Mescid-i Nebevi Yakını'}</span>
                        </div>
                      </div>

                    </div>
                  </div>

                  {/* Right Section: Clean Financial Breakdown Panel */}
                  <div className="flex flex-row xl:flex-col justify-between xl:justify-center gap-3 shrink-0 border-t xl:border-t-0 xl:border-l border-slate-300/80 pt-4 xl:pt-0 xl:pl-6 min-w-[270px]">
                    
                    {/* Mekke Breakdown Card */}
                    <div className={`p-4 rounded-2xl border flex-1 xl:flex-none space-y-2 transition-all duration-200 hover:scale-[1.01] ${theme.panelBg}`}>
                      <div className="flex items-center justify-between gap-3">
                        <span className={`text-xs font-bold flex items-center gap-1.5 ${theme.priceLabel}`}>
                          <Building className={`h-3.5 w-3.5 ${theme.iconColor}`} />
                          <span>Mekke Oda:</span>
                        </span>
                        <span className="font-mono font-black text-slate-900 text-sm sm:text-base tracking-tight">
                          {monthRate.makkahRoomSAR} <span className="text-[10px] font-bold text-slate-500">SAR</span>
                        </span>
                      </div>
                      <div className={`flex items-center justify-between gap-3 pt-1.5 border-t ${theme.priceBorder}`}>
                        <span className={`text-xs font-bold flex items-center gap-1.5 ${theme.priceLabel}`}>
                          <Utensils className={`h-3.5 w-3.5 ${theme.iconColor}`} />
                          <span>Günlük Yemek:</span>
                        </span>
                        <span className="font-mono font-black text-slate-900 text-sm sm:text-base tracking-tight">
                          +{makkahFood} <span className="text-[10px] font-bold text-slate-500">SAR</span>
                        </span>
                      </div>
                    </div>

                    {/* Medine Breakdown Card */}
                    <div className={`p-4 rounded-2xl border flex-1 xl:flex-none space-y-2 transition-all duration-200 hover:scale-[1.01] ${theme.panelBg}`}>
                      <div className="flex items-center justify-between gap-3">
                        <span className={`text-xs font-bold flex items-center gap-1.5 ${theme.priceLabel}`}>
                          <Building2 className={`h-3.5 w-3.5 ${theme.iconColor}`} />
                          <span>Medine Oda:</span>
                        </span>
                        <span className="font-mono font-black text-slate-900 text-sm sm:text-base tracking-tight">
                          {monthRate.madinahRoomSAR} <span className="text-[10px] font-bold text-slate-500">SAR</span>
                        </span>
                      </div>
                      <div className={`flex items-center justify-between gap-3 pt-1.5 border-t ${theme.priceBorder}`}>
                        <span className={`text-xs font-bold flex items-center gap-1.5 ${theme.priceLabel}`}>
                          <Utensils className={`h-3.5 w-3.5 ${theme.iconColor}`} />
                          <span>Günlük Yemek:</span>
                        </span>
                        <span className="font-mono font-black text-slate-900 text-sm sm:text-base tracking-tight">
                          +{madinahFood} <span className="text-[10px] font-bold text-slate-500">SAR</span>
                        </span>
                      </div>
                    </div>

                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Step 3: Konaklama Süresi */}
        <div id="step-3" className="pearl-card rounded-2xl p-5 sm:p-7 space-y-5 shadow-2xs border border-slate-200/90 bg-white scroll-mt-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2.5">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs font-mono shrink-0">
                3
              </span>
              <h3 className="text-sm font-bold text-slate-900 font-display flex items-center gap-1.5">
                <Bed className="h-4 w-4 text-emerald-600" />
                <span>Konaklama Süresi</span>
              </h3>
            </div>
            <span className="text-xs font-black text-emerald-900 bg-emerald-100/90 px-3.5 py-1.5 rounded-full border border-emerald-300 shadow-2xs">
              Toplam {Number(makkahDays) + Number(madinahDays)} Gece Konaklama
            </span>
          </div>

          {/* Mekke & Medine Kalış Süresi Ayar Kartları */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Mekke Kalış Kartı */}
            <div className="flex items-center justify-between p-4 sm:p-5 rounded-2xl border-2 border-emerald-300/90 bg-gradient-to-br from-emerald-50 via-teal-50/50 to-white shadow-xs hover:border-emerald-500 hover:shadow-md transition-all duration-300">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xl shrink-0">🕋</span>
                  <div>
                    <h4 className="text-sm font-black text-emerald-950 font-display tracking-tight">
                      Mekke Kalış Süresi
                    </h4>
                    <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">
                      Mekke-i Mükerreme
                    </span>
                  </div>
                </div>
                <div className="text-xs font-bold text-slate-600 pl-7">
                  {makkahDays === 0 ? '⚠️ Konaklama Yok' : `🌙 ${makkahDays} Gece Otel Konaklaması`}
                </div>
              </div>

              <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-2xl border border-emerald-200 shadow-sm">
                <button
                  type="button"
                  onClick={() => setMakkahDays(Math.max(0, makkahDays - 1))}
                  className="h-9 w-9 rounded-xl bg-slate-100 hover:bg-slate-200 active:scale-90 text-slate-700 font-black flex items-center justify-center cursor-pointer transition-all spring-pill"
                  title="1 Gece Azalt"
                >
                  <Minus className="h-4 w-4 stroke-[3]" />
                </button>
                <div className="min-w-[42px] text-center">
                  <span className="font-mono font-black text-xl text-emerald-950 block leading-none">
                    {makkahDays}
                  </span>
                  <span className="text-[9px] font-bold text-slate-400 uppercase">Gece</span>
                </div>
                <button
                  type="button"
                  onClick={() => setMakkahDays(Math.min(30, makkahDays + 1))}
                  className="h-9 w-9 rounded-xl bg-emerald-700 hover:bg-emerald-600 active:scale-90 text-white font-black flex items-center justify-center cursor-pointer transition-all spring-pill shadow-xs shadow-emerald-800/30"
                  title="1 Gece Artır"
                >
                  <Plus className="h-4 w-4 stroke-[3]" />
                </button>
              </div>
            </div>

            {/* Medine Kalış Kartı */}
            <div className="flex items-center justify-between p-4 sm:p-5 rounded-2xl border-2 border-amber-300/90 bg-gradient-to-br from-amber-50 via-orange-50/50 to-white shadow-xs hover:border-amber-500 hover:shadow-md transition-all duration-300">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xl shrink-0">🕌</span>
                  <div>
                    <h4 className="text-sm font-black text-amber-950 font-display tracking-tight">
                      Medine Kalış Süresi
                    </h4>
                    <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">
                      Medine-i Münevvere
                    </span>
                  </div>
                </div>
                <div className="text-xs font-bold text-slate-600 pl-7">
                  {madinahDays === 0 ? '⚠️ Konaklama Yok' : `🌙 ${madinahDays} Gece Otel Konaklaması`}
                </div>
              </div>

              <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-2xl border border-amber-200 shadow-sm">
                <button
                  type="button"
                  onClick={() => setMadinahDays(Math.max(0, madinahDays - 1))}
                  className="h-9 w-9 rounded-xl bg-slate-100 hover:bg-slate-200 active:scale-90 text-slate-700 font-black flex items-center justify-center cursor-pointer transition-all spring-pill"
                  title="1 Gece Azalt"
                >
                  <Minus className="h-4 w-4 stroke-[3]" />
                </button>
                <div className="min-w-[42px] text-center">
                  <span className="font-mono font-black text-xl text-amber-950 block leading-none">
                    {madinahDays}
                  </span>
                  <span className="text-[9px] font-bold text-slate-400 uppercase">Gece</span>
                </div>
                <button
                  type="button"
                  onClick={() => setMadinahDays(Math.min(20, madinahDays + 1))}
                  className="h-9 w-9 rounded-xl bg-amber-600 hover:bg-amber-500 active:scale-90 text-white font-black flex items-center justify-center cursor-pointer transition-all spring-pill shadow-xs shadow-amber-700/30"
                  title="1 Gece Artır"
                >
                  <Plus className="h-4 w-4 stroke-[3]" />
                </button>
              </div>
            </div>

          </div>

          {/* Saf Otel Oda Tipleri Karşılaştırma & Karma Dağılım Tablosu */}
          <RoomComparisonTable
            matrix={roomMatrix}
            selectedOccupancy={makkahOccupancy}
            onSelectOccupancy={(occ) => {
              setMakkahOccupancy(occ);
              setMadinahOccupancy(occ);
            }}
            currency={activeCurrency}
            isMixedRoomMode={isMixedRoomMode}
            onToggleMixedMode={(enabled) => {
              setIsMixedRoomMode(enabled);
              if (enabled) {
                const totalP = (mixedRooms.single * 1) + (mixedRooms.double * 2) + (mixedRooms.triple * 3) + (mixedRooms.quad * 4);
                if (totalP > 0) setPaxCount(totalP);
              }
            }}
            mixedRooms={mixedRooms}
            onChangeMixedRoom={(key, val) => {
              const updated = { ...mixedRooms, [key]: val };
              setMixedRooms(updated);
              const totalP = (updated.single * 1) + (updated.double * 2) + (updated.triple * 3) + (updated.quad * 4);
              if (totalP > 0) setPaxCount(totalP);
            }}
            mixedRoomsBreakdown={rawQuotation?.mixedRoomsBreakdown}
            mixedRoomsSummary={rawQuotation?.mixedRoomsSummary}
          />
        </div>

        {/* Step 4: Transfer & Ulaşım */}
        <div id="step-4" className="pearl-card rounded-2xl p-5 sm:p-6 space-y-4 shadow-2xs border border-slate-200/90 bg-white scroll-mt-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2.5">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-sky-100 text-sky-800 font-bold text-xs font-mono shrink-0">
                4
              </span>
              <h3 className="text-sm font-bold text-slate-900 font-display flex items-center gap-1.5">
                <Bus className="h-4 w-4 text-sky-600" />
                <span>Transfer & Ulaşım</span>
              </h3>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setTransfersSelection({
                    jedMek: { vehicleType: 'none', passengerCount: 0 },
                    mekMed: { vehicleType: 'none', passengerCount: 0 },
                    medAir: { vehicleType: 'none', passengerCount: 0 },
                  });
                }}
                className="px-3 py-1.5 rounded-full bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-600 border border-slate-200 text-xs font-bold transition-all cursor-pointer spring-pill"
              >
                Tümünü Kaldır
              </button>
              <button
                type="button"
                onClick={() => {
                  setTransfersSelection({
                    jedMek: { vehicleType: 'small', passengerCount: paxCount || 2 },
                    mekMed: { vehicleType: 'small', passengerCount: paxCount || 2 },
                    medAir: { vehicleType: 'small', passengerCount: paxCount || 2 },
                  });
                }}
                className="px-3 py-1.5 rounded-full bg-sky-50 hover:bg-sky-100 text-sky-900 border border-sky-200 text-xs font-bold transition-all cursor-pointer spring-pill"
              >
                Standart (Binek)
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {TRANSFER_ROUTES.map((route) => {
              const sel = transfersSelection[route.id] || { vehicleType: 'small', passengerCount: 2 };
              const smallCost = activePackage?.transfers?.[route.smallKey] || 0;
              const bigCost = activePackage?.transfers?.[route.bigKey] || 0;

              return (
                <div 
                  key={route.id} 
                  className={`p-3.5 sm:p-4 rounded-2xl border transition-all ${
                    sel.vehicleType === 'none'
                      ? 'bg-slate-50/70 border-slate-200/80'
                      : 'bg-white border-slate-200/90 shadow-3xs hover:border-slate-300'
                  }`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                    
                    {/* 1. Sol: Güzergah Adı ve İkonu (Sabit Genişlik) */}
                    <div className="flex items-center gap-2.5 font-bold text-xs text-slate-900 lg:w-56 shrink-0">
                      <div className={`h-8 w-8 rounded-xl flex items-center justify-center shrink-0 ${
                        sel.vehicleType === 'none' ? 'bg-slate-100 text-slate-400' : 'bg-sky-100 text-sky-700 shadow-3xs'
                      }`}>
                        <Car className="h-4 w-4 shrink-0" />
                      </div>
                      <div>
                        <span className="font-extrabold text-slate-900 block leading-tight">{route.label}</span>
                        <span className="text-[10px] text-slate-400 font-semibold">Özel Transfer Rotası</span>
                      </div>
                    </div>

                    {/* 2. Orta: Araç Seçim Butonları (Her 3 Satırda Tam Aynı Hizada) */}
                    <div className="flex items-center gap-1 p-1 bg-slate-100/90 border border-slate-200/80 rounded-full select-none shrink-0 self-start lg:self-auto">
                      {/* Binek Button */}
                      <button
                        type="button"
                        onClick={() => handleTransferChange(route.id, 'vehicleType', 'small')}
                        className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all duration-200 cursor-pointer spring-pill ${
                          sel.vehicleType === 'small'
                            ? 'bg-gradient-to-r from-sky-600 to-sky-700 text-white shadow-xs shadow-sky-600/30'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                        }`}
                      >
                        Binek ({smallCost} SAR)
                      </button>

                      {/* Otobüs Button */}
                      <button
                        type="button"
                        onClick={() => handleTransferChange(route.id, 'vehicleType', 'big')}
                        className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all duration-200 cursor-pointer spring-pill ${
                          sel.vehicleType === 'big'
                            ? 'bg-gradient-to-r from-emerald-700 to-emerald-800 text-white shadow-xs shadow-emerald-800/30'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                        }`}
                      >
                        Otobüs ({bigCost} SAR)
                      </button>

                      {/* Yok Button */}
                      <button
                        type="button"
                        onClick={() => handleTransferChange(route.id, 'vehicleType', 'none')}
                        className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all duration-200 cursor-pointer spring-pill ${
                          sel.vehicleType === 'none'
                            ? 'bg-gradient-to-r from-rose-500 to-rose-600 text-white shadow-xs shadow-rose-500/30'
                            : 'text-slate-400 hover:text-slate-700 hover:bg-slate-200/60'
                        }`}
                      >
                        Yok
                      </button>
                    </div>

                    {/* 3. Sağ: Kişi Sayacı & Formül Kutusu (Sağa Tam Hizalı) */}
                    <div className="flex items-center gap-2 flex-wrap lg:justify-end lg:flex-1 min-h-[34px]">
                      {sel.vehicleType !== 'none' ? (
                        <div className="flex items-center gap-2 animate-fade-scale flex-wrap">
                          <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-full border border-slate-200 shadow-3xs">
                            <span className="text-[11px] font-bold text-slate-500 pl-0.5">Kişi:</span>
                            <button
                              type="button"
                              onClick={() => handleTransferChange(route.id, 'passengerCount', Math.max(1, (sel.passengerCount || 1) - 1))}
                              className="h-6 w-6 rounded-full bg-white hover:bg-slate-200 active:scale-85 text-slate-700 flex items-center justify-center font-bold border border-slate-200 transition-all cursor-pointer shadow-3xs"
                              title="1 Kişi Azalt"
                            >
                              <Minus className="h-3 w-3" />
                            </button>
                            <span className="font-mono font-black text-xs text-slate-950 min-w-[20px] text-center select-none">
                              {sel.passengerCount || 1}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleTransferChange(route.id, 'passengerCount', Math.min(50, (sel.passengerCount || 1) + 1))}
                              className="h-6 w-6 rounded-full bg-sky-600 hover:bg-sky-500 active:scale-85 text-white flex items-center justify-center font-bold transition-all cursor-pointer shadow-xs shadow-sky-600/30"
                              title="1 Kişi Artır"
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                          </div>

                          {/* Kişi Başı Bölüşüm Sonucu */}
                          <span className="text-[11px] font-mono font-bold text-sky-900 bg-sky-50 px-3 py-1 rounded-xl border border-sky-200 shadow-3xs whitespace-nowrap">
                            {sel.vehicleType === 'small' ? smallCost : bigCost} SAR ÷ {sel.passengerCount || 1} Kişi = <strong className="text-sky-950 font-black">{Math.round((sel.vehicleType === 'small' ? smallCost : bigCost) / (sel.passengerCount || 1))} SAR/kişi</strong>
                          </span>
                        </div>
                      ) : (
                        <span className="text-[11px] font-medium text-slate-400 bg-slate-100/70 px-3 py-1 rounded-full border border-slate-200/60 select-none">
                          Transfer Pakete Dahil Edilmedi
                        </span>
                      )}
                    </div>

                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Step 5: Sabit & Ek Giderler Checklist */}
        <div id="step-5" className="pearl-card rounded-2xl p-5 sm:p-6 space-y-4 shadow-2xs border border-slate-200/90 bg-white scroll-mt-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2.5">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs font-mono shrink-0">
                5
              </span>
              <h3 className="text-sm font-bold text-slate-900 font-display flex items-center gap-1.5">
                <Coins className="h-4 w-4 text-emerald-600" />
                <span>Sabit & Operasyonel Giderler Havuzu</span>
              </h3>
            </div>
            <span className="text-xs text-slate-400 font-medium">Teklife Dahil Edilecek Kalemler</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {FIXED_EXPENSES_INFO.map((item) => {
              const isIncluded = !!fixedExpensesIncluded[item.key];
              const costSAR = activePackage?.fixedExpenses?.[item.key] || 0;

              return (
                <div
                  key={item.key}
                  onClick={() => toggleFixedExpense(item.key)}
                  className={`p-3 rounded-xl border transition-all duration-200 cursor-pointer flex items-center justify-between select-none ${
                    isIncluded
                      ? 'bg-emerald-50/90 border-emerald-500/80 shadow-3xs'
                      : 'bg-white border-slate-200/80 opacity-60 hover:opacity-100 hover:border-slate-300'
                  }`}
                >
                  <div className="space-y-0.5 pr-2">
                    <span className="text-xs font-bold text-slate-900 block">{item.label}</span>
                    <span className="text-[10px] text-slate-400 line-clamp-1">{item.desc}</span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-mono font-bold text-xs text-slate-700">
                      {costSAR} <span className="text-[9px] text-slate-400">SAR</span>
                    </span>
                    <div className={`flex h-4.5 w-4.5 items-center justify-center rounded-md border transition-colors ${
                      isIncluded ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-slate-300 bg-white'
                    }`}>
                      {isIncluded && <Check className="h-3 w-3 stroke-[3]" />}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Step 6: Müşteri Bilgisi & Teklif Notları */}
        <div id="step-6" className="pearl-card rounded-2xl p-5 sm:p-6 space-y-4 shadow-2xs border border-slate-200/90 bg-white scroll-mt-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2.5">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs font-mono shrink-0">
                6
              </span>
              <h3 className="text-sm font-bold text-slate-900 font-display flex items-center gap-1.5">
                <User className="h-4 w-4 text-emerald-600" />
                <span>Müşteri & Misafir Bilgileri</span>
              </h3>
            </div>
            <span className="text-xs text-slate-400 font-medium hidden sm:inline">PDF ve Teklif Mektubunda Görünür</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-slate-400" />
                <span>Misafir / Grup Lideri:</span>
              </label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Örn: Ahmet Yılmaz"
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs text-slate-900 focus:border-emerald-600 focus:outline-none shadow-3xs font-semibold"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5 text-slate-400" />
                <span>İletişim Telefonu:</span>
              </label>
              <input
                type="tel"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(formatPhoneNumber(e.target.value))}
                placeholder="Örn: 0532 123 45 67 veya +90 ..."
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs text-slate-900 focus:border-emerald-600 focus:outline-none shadow-3xs font-mono font-semibold"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-slate-400" />
                <span>Grup Kişi Sayısı:</span>
              </label>
              <div className="flex items-center gap-1.5 bg-white px-2 py-1 rounded-xl border border-slate-300 shadow-3xs">
                <button
                  type="button"
                  onClick={() => setPaxCount(Math.max(1, paxCount - 1))}
                  className="h-7 w-7 rounded-lg bg-slate-100 hover:bg-slate-200 active:scale-90 text-slate-700 font-bold flex items-center justify-center cursor-pointer transition-all spring-pill"
                >
                  <Minus className="h-3.5 w-3.5" />
                </button>
                <span className="flex-1 font-mono font-black text-xs text-slate-900 text-center select-none">
                  {paxCount} Kişi
                </span>
                <button
                  type="button"
                  onClick={() => setPaxCount(Math.min(200, paxCount + 1))}
                  className="h-7 w-7 rounded-lg bg-emerald-700 hover:bg-emerald-600 active:scale-90 text-white font-bold flex items-center justify-center cursor-pointer transition-all spring-pill shadow-xs"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            <div className="sm:col-span-3 space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <MessageSquare className="h-3.5 w-3.5 text-slate-400" />
                <span>Teklif Özel Notları & Açıklamalar:</span>
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Misafir için özel istekler, rehberlik notları, transfer detayları vb."
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs text-slate-900 focus:border-emerald-600 focus:outline-none shadow-3xs resize-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Right 4/5 Columns: Slightly Wider Fixed Full-Height Receipt Panel */}
      <div className="lg:col-span-5 xl:col-span-4 lg:sticky lg:top-4 lg:h-[calc(100vh-2rem)] flex flex-col justify-start">
        <LiveQuoteCard
          quotation={currentQuotation}
          activePackage={activePackage}
          activeMonth={activeMonth}
          customerName={customerName}
          customerPhone={customerPhone}
          onOpenPdfModal={() => {
            setViewMode('letter');
          }}
          onSaveQuote={handleSaveQuote}
          isSaved={isSaved}
          isEditing={!!editingQuote}
          paxCount={paxCount}
          onChangePaxCount={setPaxCount}
          discountUSD={discountUSD}
          onChangeDiscount={setDiscountUSD}
          activeCurrency={activeCurrency}
          setActiveCurrency={setActiveCurrency}
          applyProfitMargin={applyProfitMargin}
          onToggleApplyProfitMargin={() => setApplyProfitMargin(!applyProfitMargin)}
        />
      </div>
    </div>
  )}
</div>
</div>
);
}
