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
  Moon
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

export default function AgentQuotationWizard({ editingQuote = null, setEditingQuote = () => {} }) {
  const { packages, currencies, months, saveQuote } = useData();
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

  // Auto-Save Draft to LocalStorage
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
      setSelectedPkgId(editingQuote.packageId || packages[1]?.id || packages[0]?.id);
      setSelectedMonth(editingQuote.selectedMonth || 'jan');
      setMakkahDays(editingQuote.makkahDays || 7);
      setMadinahDays(editingQuote.madinahDays || 4);
      setMakkahOccupancy(editingQuote.makkahRoomOccupancy || 2);
      setMadinahOccupancy(editingQuote.madinahRoomOccupancy || 2);
      setPaxCount(editingQuote.paxCount || 2);
      setDiscountUSD(editingQuote.customDiscountUSD || 0);
      setCustomerName(editingQuote.customerName || '');
      setCustomerPhone(editingQuote.customerPhone || '');
      setNotes(editingQuote.notes || '');
      if (editingQuote.applyProfitMargin !== undefined) {
        setApplyProfitMargin(editingQuote.applyProfitMargin);
      }
    }
  }, [editingQuote, packages]);

  const activePackage = useMemo(() => {
    return packages.find(p => p.id === selectedPkgId) || packages[0];
  }, [packages, selectedPkgId]);

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
      selectedMonth,
      selectedMonthLabel,
      pkgDetails: activePackage,
      roomMatrix,
      fixedExpensesIncluded,
      transfersSelection,
      customerName,
      customerPhone,
      paxCount,
      notes,
      agentName: currentUser?.name || 'Acente Temsilcisi'
    };
  }, [rawQuotation, activePackage, roomMatrix, fixedExpensesIncluded, transfersSelection, customerName, customerPhone, paxCount, notes, currentUser, months, selectedMonth]);

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
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start font-sans">
            {/* Left 8 Columns: Configuration Form */}
            <div className="lg:col-span-8 space-y-6 pb-24">

        {/* Revision / Editing Mode Alert Banner */}
        {editingQuote && (
          <div className="pearl-card rounded-3xl p-4 sm:p-5 bg-gradient-to-r from-amber-50 via-amber-100/50 to-amber-50 border border-amber-300 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fade-scale">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-500 text-white shadow-sm shadow-amber-600/30">
                <Edit3 className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-xs font-black text-amber-950 font-display">Teklif Düzenleme / Revizyon Modu Aktif</h4>
                <p className="text-[11px] text-amber-900/90 font-medium">
                  <strong>#{editingQuote.id}</strong> ({editingQuote.customerName || 'Misafir'}) teklifini güncelliyorsunuz. Kaydettiğinizde Merkeze revizyon bildirimi iletilecektir.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setEditingQuote(null);
                setCustomerName('');
                setCustomerPhone('');
                setNotes('');
              }}
              className="px-3.5 py-1.5 rounded-xl bg-amber-200 hover:bg-amber-300 text-amber-950 text-xs font-bold transition-all cursor-pointer whitespace-nowrap shadow-2xs hover:scale-102 active:scale-98"
            >
              Düzenlemeyi İptal Et
            </button>
          </div>
        )}

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
                    {m.isPeak && (
                      <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-900 border border-amber-200">
                        {m.badge || 'Yoğun'}
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-slate-400 font-medium">
                    {m.subtitle || 'Dönem'}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Step 2: Umre Paketi & Otel Standartları (Spacious Full-Width Luxury Layout) */}
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
            <span className="text-xs text-slate-400 font-medium hidden sm:inline">Merkez Standartları</span>
          </div>

          <div className="space-y-3">
            {packages.map((pkg) => {
              const isSelected = selectedPkgId === pkg.id;
              const monthRate = pkg.monthlyPrices?.[selectedMonth] || { makkahRoomSAR: 0, madinahRoomSAR: 0 };
              const makkahFood = pkg.makkahFoodPriceSAR || pkg.makkahFoodSAR || 35;
              const madinahFood = pkg.madinahFoodPriceSAR || pkg.madinahFoodSAR || 45;

              return (
                <div
                  key={pkg.id}
                  onClick={() => setSelectedPkgId(pkg.id)}
                  className={`cursor-pointer rounded-2xl p-4 sm:p-5 spring-pill border transition-all duration-200 select-none flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                    isSelected
                      ? 'bg-emerald-50/95 border-emerald-600 ring-2 ring-emerald-600/30 shadow-md scale-[1.01]'
                      : 'bg-white border-slate-200/90 hover:border-emerald-300 hover:bg-slate-50/80 shadow-3xs'
                  }`}
                >
                  {/* Left: Package Name, Color, Description & Hotel Names */}
                  <div className="space-y-2 flex-1 min-w-0">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="h-3.5 w-3.5 rounded-full shadow-xs shrink-0" style={{ backgroundColor: pkg.color || '#059669' }} />
                      <h4 className="font-bold text-slate-900 text-base font-display">
                        {pkg.name}
                      </h4>
                      <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-bold text-slate-700">
                        {pkg.badge || 'Paket'}
                      </span>
                      {isSelected && (
                        <span className="flex items-center gap-1 text-xs font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                          <Check className="h-3.5 w-3.5 stroke-[3]" />
                          <span>Seçili Paket</span>
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-700 pt-1">
                      <div className="flex items-center gap-2 bg-white/90 p-2.5 rounded-xl border border-slate-100">
                        <MapPin className="h-4 w-4 text-emerald-600 shrink-0" />
                        <div className="min-w-0">
                          <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Mekke Oteli</span>
                          <span className="font-semibold text-slate-900 truncate block">{pkg.hotelMakkah}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 bg-white/90 p-2.5 rounded-xl border border-slate-100">
                        <MapPin className="h-4 w-4 text-amber-600 shrink-0" />
                        <div className="min-w-0">
                          <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Medine Oteli</span>
                          <span className="font-semibold text-slate-900 truncate block">{pkg.hotelMadinah}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right: Clean Room & Food Price Breakdown Boxes */}
                  <div className="flex sm:flex-col justify-between sm:justify-center gap-2 shrink-0 border-t md:border-t-0 md:border-l border-slate-200/80 pt-3 md:pt-0 md:pl-4 min-w-[210px]">
                    <div className="bg-white/90 p-2.5 rounded-xl border border-slate-100 shadow-3xs space-y-0.5">
                      <div className="flex items-center justify-between text-xs gap-3">
                        <span className="flex items-center gap-1 font-bold text-emerald-900">
                          <Building className="h-3.5 w-3.5 text-emerald-600" />
                          <span>Mekke:</span>
                        </span>
                        <span className="font-mono font-black text-slate-900 text-xs">
                          {monthRate.makkahRoomSAR} SAR <span className="text-slate-400 text-[10px] font-normal">Oda</span>
                        </span>
                      </div>
                      <div className="text-right text-[11px] text-slate-500 font-mono font-medium">
                        + {makkahFood} SAR Yemek
                      </div>
                    </div>

                    <div className="bg-white/90 p-2.5 rounded-xl border border-slate-100 shadow-3xs space-y-0.5">
                      <div className="flex items-center justify-between text-xs gap-3">
                        <span className="flex items-center gap-1 font-bold text-amber-900">
                          <Building2 className="h-3.5 w-3.5 text-amber-600" />
                          <span>Medine:</span>
                        </span>
                        <span className="font-mono font-black text-slate-900 text-xs">
                          {monthRate.madinahRoomSAR} SAR <span className="text-slate-400 text-[10px] font-normal">Oda</span>
                        </span>
                      </div>
                      <div className="text-right text-[11px] text-slate-500 font-mono font-medium">
                        + {madinahFood} SAR Yemek
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Step 3: Konaklama Süresi */}
        <div id="step-3" className="pearl-card rounded-2xl p-5 sm:p-6 space-y-4 shadow-2xs border border-slate-200/90 bg-white scroll-mt-6">
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
            <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
              Toplam {Number(makkahDays) + Number(madinahDays)} Gece
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Mekke Box */}
            <div className="flex items-center justify-between p-3.5 rounded-2xl border border-emerald-100 bg-gradient-to-r from-emerald-50/40 via-white to-white hover:border-emerald-200 transition-all shadow-3xs">
              <div>
                <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <span className="text-sm">🕋</span>
                  <span>Mekke Kalış</span>
                </div>
                <div className="text-[11px] text-slate-500 font-medium">
                  {makkahDays === 0 ? 'Konaklama Yok' : `${makkahDays} Gece`}
                </div>
              </div>

              <div className="flex items-center gap-1.5 bg-white px-2 py-1.5 rounded-xl border border-slate-200/90 shadow-2xs">
                <button
                  type="button"
                  onClick={() => setMakkahDays(Math.max(0, makkahDays - 1))}
                  className="h-8 w-8 rounded-lg bg-slate-100 hover:bg-slate-200 active:scale-90 text-slate-700 font-bold flex items-center justify-center cursor-pointer transition-all spring-pill"
                  title="1 Gece Azalt"
                >
                  <Minus className="h-3.5 w-3.5" />
                </button>
                <span className="font-mono font-black text-base text-emerald-950 min-w-[32px] text-center select-none">
                  {makkahDays}
                </span>
                <button
                  type="button"
                  onClick={() => setMakkahDays(Math.min(30, makkahDays + 1))}
                  className="h-8 w-8 rounded-lg bg-emerald-700 hover:bg-emerald-600 active:scale-90 text-white font-bold flex items-center justify-center cursor-pointer transition-all spring-pill shadow-xs shadow-emerald-800/20"
                  title="1 Gece Artır"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Medine Box */}
            <div className="flex items-center justify-between p-3.5 rounded-2xl border border-amber-100 bg-gradient-to-r from-amber-50/40 via-white to-white hover:border-amber-200 transition-all shadow-3xs">
              <div>
                <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <span className="text-sm">🕌</span>
                  <span>Medine Kalış</span>
                </div>
                <div className="text-[11px] text-slate-500 font-medium">
                  {madinahDays === 0 ? 'Konaklama Yok' : `${madinahDays} Gece`}
                </div>
              </div>

              <div className="flex items-center gap-1.5 bg-white px-2 py-1.5 rounded-xl border border-slate-200/90 shadow-2xs">
                <button
                  type="button"
                  onClick={() => setMadinahDays(Math.max(0, madinahDays - 1))}
                  className="h-8 w-8 rounded-lg bg-slate-100 hover:bg-slate-200 active:scale-90 text-slate-700 font-bold flex items-center justify-center cursor-pointer transition-all spring-pill"
                  title="1 Gece Azalt"
                >
                  <Minus className="h-3.5 w-3.5" />
                </button>
                <span className="font-mono font-black text-base text-amber-950 min-w-[32px] text-center select-none">
                  {madinahDays}
                </span>
                <button
                  type="button"
                  onClick={() => setMadinahDays(Math.min(20, madinahDays + 1))}
                  className="h-8 w-8 rounded-lg bg-amber-600 hover:bg-amber-500 active:scale-90 text-white font-bold flex items-center justify-center cursor-pointer transition-all spring-pill shadow-xs shadow-amber-700/20"
                  title="1 Gece Artır"
                >
                  <Plus className="h-3.5 w-3.5" />
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

          <div className="space-y-2.5">
            {TRANSFER_ROUTES.map((route) => {
              const sel = transfersSelection[route.id] || { vehicleType: 'small', passengerCount: 2 };
              const smallCost = activePackage?.transfers?.[route.smallKey] || 0;
              const bigCost = activePackage?.transfers?.[route.bigKey] || 0;

              return (
                <div 
                  key={route.id} 
                  className={`flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-2xl border transition-all ${
                    sel.vehicleType === 'none'
                      ? 'bg-slate-50/60 border-slate-200/80 opacity-75'
                      : 'bg-white border-slate-200/90 shadow-3xs hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2.5 font-bold text-xs text-slate-900">
                    <div className={`h-7 w-7 rounded-lg flex items-center justify-center ${
                      sel.vehicleType === 'none' ? 'bg-slate-200 text-slate-500' : 'bg-sky-100 text-sky-700'
                    }`}>
                      <Car className="h-4 w-4 shrink-0" />
                    </div>
                    <span>{route.label}</span>
                  </div>

                  <div className="flex items-center gap-2.5 flex-wrap">
                    {/* Vehicle Type Segment Pill with Distinct High-Contrast Active Colors */}
                    <div className="flex items-center gap-1 p-1 bg-slate-100/90 border border-slate-200/80 rounded-full select-none">
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

                    {/* Fluid Animated Passenger Count Stepper */}
                    {sel.vehicleType !== 'none' && (
                      <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-full border border-slate-200 shadow-3xs animate-fade-scale">
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
                    )}
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
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="Örn: 0532 123 45 67"
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

      {/* Right 4 Columns: Fixed Full-Height Independent Panel */}
      <div className="lg:col-span-4 lg:sticky lg:top-4 lg:h-[calc(100vh-2rem)] flex flex-col justify-start">
        <LiveQuoteCard
          quotation={currentQuotation}
          onOpenPdfModal={() => {
            setViewMode('letter');
          }}
          onSaveQuote={handleSaveQuote}
          isSaved={isSaved}
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
