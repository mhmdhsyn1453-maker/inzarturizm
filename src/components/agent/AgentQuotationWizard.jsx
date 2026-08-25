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
  Navigation
} from 'lucide-react';
import confetti from 'canvas-confetti';

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

import QuotationLetterView from './QuotationLetterView';
import { openQuotationInNewPage } from '../../services/pdfService';

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
      transfersSelection,
      fixedExpensesIncluded,
      currencies,
      applyProfitMargin
    );
  }, [activePackage, selectedMonth, makkahDays, madinahDays, transfersSelection, fixedExpensesIncluded, currencies, applyProfitMargin]);

  // Enriched full quotation
  const currentQuotation = useMemo(() => {
    if (!rawQuotation) return null;
    return {
      ...rawQuotation,
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
  }, [rawQuotation, activePackage, roomMatrix, fixedExpensesIncluded, transfersSelection, customerName, customerPhone, paxCount, notes, currentUser]);

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

  // If user selected Letter View Mode, render the integrated full A4 Proposal Letter right inside the app
  if (viewMode === 'letter') {
    return (
      <QuotationLetterView
        quotation={currentQuotation}
        onBackToForm={() => setViewMode('form')}
        onSaveQuote={handleSaveQuote}
        isSaved={isSaved}
        activeCurrency={activeCurrency}
      />
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start font-sans">
      {/* Left 8 Columns: Configuration Form */}
      <div className="lg:col-span-8 space-y-6 pb-24">
        
        {/* View Mode Switcher Tab Banner */}
        <div className="pearl-card rounded-2xl p-2 bg-white/80 border border-slate-200/90 shadow-2xs flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
            <button
              type="button"
              onClick={() => setViewMode('form')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'form' 
                  ? 'bg-emerald-700 text-white shadow-2xs' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileEdit className="h-3.5 w-3.5" />
              <span>Teklif Formu & Ayarlar</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('letter')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'letter' 
                  ? 'bg-emerald-700 text-white shadow-2xs' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileText className="h-3.5 w-3.5" />
              <span>Resmi A4 Teklif Mektubu</span>
            </button>
          </div>

          <button
            type="button"
            onClick={handleResetDraft}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-rose-50 hover:text-rose-800 hover:border-rose-300 text-slate-600 border border-slate-200 text-xs font-bold transition-all cursor-pointer shadow-3xs"
            title="Tüm seçimleri sıfırla ve yeni teklif başlat"
          >
            <RotateCcw className="h-3.5 w-3.5 text-slate-400" />
            <span>Formu Sıfırla</span>
          </button>
        </div>

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
        <div className="pearl-card rounded-3xl p-6 sm:p-7 space-y-4 shadow-sm border border-slate-200/90">
          <div className="flex flex-wrap items-center justify-between border-b border-slate-100 pb-3 gap-2">
            <h3 className="text-base font-bold text-slate-900 font-display flex items-center gap-2">
              <Calendar className="h-5 w-5 text-emerald-600" />
              <span>1. Seyahat Dönemi / Ayı (Otonom Otel Fiyatı)</span>
            </h3>
            
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleResetDraft}
                className="px-3 py-1 rounded-full bg-slate-100 hover:bg-rose-50 hover:text-rose-800 hover:border-rose-300 text-slate-600 border border-slate-200 text-xs font-bold transition-all cursor-pointer spring-pill shadow-3xs"
                title="Tüm seçimleri sıfırla ve yeni teklif başlat"
              >
                Yeni Teklif / Sıfırla
              </button>

              <span className="text-xs text-emerald-800 font-bold bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 shadow-2xs">
                Otel Fiyatları Otomatik Çekilir
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
            {activeMonthsList.map((m) => {
              const isSelected = selectedMonth === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setSelectedMonth(m.id)}
                  className={`h-18 p-2.5 sm:p-3 rounded-2xl text-left spring-pill border cursor-pointer relative flex flex-col justify-between overflow-hidden select-none ${
                    isSelected
                      ? 'border-emerald-600 bg-emerald-50/90 text-emerald-950 ring-2 ring-emerald-600/30 shadow-md scale-102 -translate-y-0.5'
                      : 'border-slate-200/90 bg-white hover:border-emerald-300 text-slate-700 hover:bg-slate-50 hover:-translate-y-0.5'
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

        {/* Step 2: Umre Paketi & Otel Standartları */}
        <div className="pearl-card rounded-3xl p-6 sm:p-7 space-y-4 shadow-sm border border-slate-200/90">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-base font-bold text-slate-900 font-display flex items-center gap-2">
              <Layers className="h-5 w-5 text-emerald-600" />
              <span>2. Umre Paketi & Otel Kategorisi</span>
            </h3>
            <span className="text-xs text-slate-400 font-medium">Merkez Tarafından Yönetilen Standartlar</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {packages.map((pkg) => {
              const isSelected = selectedPkgId === pkg.id;
              const monthRate = pkg.monthlyPrices?.[selectedMonth] || { makkahRoomSAR: 0, madinahRoomSAR: 0 };

              return (
                <div
                  key={pkg.id}
                  onClick={() => setSelectedPkgId(pkg.id)}
                  className={`cursor-pointer rounded-2xl p-5 spring-pill border flex flex-col justify-between select-none ${
                    isSelected
                      ? 'bg-emerald-50/90 border-emerald-600 ring-2 ring-emerald-600/30 shadow-md scale-102 -translate-y-0.5'
                      : 'bg-white border-slate-200/90 hover:border-emerald-300 hover:bg-slate-50 hover:-translate-y-0.5'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="h-3.5 w-3.5 rounded-full shadow-xs" style={{ backgroundColor: pkg.color || '#059669' }} />
                        <h4 className="font-bold text-slate-900 text-base font-display">
                          {pkg.name}
                        </h4>
                      </div>
                      {isSelected && (
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-white shadow-2xs animate-fade-scale">
                          <Check className="h-3 w-3 stroke-[3]" />
                        </span>
                      )}
                    </div>

                    <span className="inline-block mt-2 rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold text-slate-700">
                      {pkg.badge || 'Paket'}
                    </span>

                    <div className="mt-4 pt-3 border-t border-slate-100 space-y-1 text-xs text-slate-600">
                      <div className="flex items-start gap-1.5">
                        <MapPin className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
                        <span className="font-medium text-slate-900">{pkg.hotelMakkah}</span>
                      </div>
                      <div className="flex items-start gap-1.5">
                        <MapPin className="h-3.5 w-3.5 text-amber-600 shrink-0 mt-0.5" />
                        <span className="font-medium text-slate-900">{pkg.hotelMadinah}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-slate-400 font-mono">Kod: {pkg.code || 'PKG'}</span>
                    <span className="text-emerald-800 font-bold font-mono">
                      Mekke: {monthRate.makkahRoomSAR} SAR
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Step 3: Konaklama Süresi & Oda Seçici */}
        <div className="pearl-card rounded-3xl p-6 sm:p-7 space-y-6 shadow-sm border border-slate-200/90">
          <div className="flex flex-wrap items-center justify-between border-b border-slate-100 pb-3 gap-2">
            <h3 className="text-base font-bold text-slate-900 font-display flex items-center gap-2">
              <Bed className="h-5 w-5 text-emerald-600" />
              <span>3. Gün Sayısı & Oda Seçenekleri</span>
            </h3>
            <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 shadow-2xs">
              Toplam: {Number(makkahDays) + Number(madinahDays)} Gün
              {madinahDays === 0 && ' (Sadece Mekke)'}
              {makkahDays === 0 && ' (Sadece Medine)'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Mekke Days */}
            <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-200 space-y-2.5 hover:border-slate-300 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Building className="h-4 w-4 text-emerald-700" />
                  <span>Mekke Gün Sayısı:</span>
                </span>
                <span className={`text-base font-black font-mono px-3 py-0.5 rounded-lg border shadow-2xs ${
                  makkahDays === 0 
                    ? 'text-slate-400 bg-slate-100 border-slate-200' 
                    : 'text-emerald-950 bg-white border-slate-200'
                }`}>
                  {makkahDays === 0 ? 'Mekke Yok (0)' : `${makkahDays} Gün`}
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="30"
                value={makkahDays}
                onChange={(e) => setMakkahDays(parseInt(e.target.value) || 0)}
                className="w-full accent-emerald-600 cursor-pointer"
              />
              <div className="flex items-center gap-1.5 pt-1">
                {[0, 5, 7, 10, 14].map(d => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setMakkahDays(d)}
                    className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold transition-all cursor-pointer ${
                      makkahDays === d ? 'bg-emerald-700 text-white shadow-2xs' : 'bg-white text-slate-600 hover:bg-slate-200 border border-slate-200'
                    }`}
                  >
                    {d === 0 ? '0 (Yok)' : `${d}g`}
                  </button>
                ))}
              </div>
            </div>

            {/* Medine Days */}
            <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-200 space-y-2.5 hover:border-slate-300 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Building2 className="h-4 w-4 text-amber-700" />
                  <span>Medine Gün Sayısı:</span>
                </span>
                <span className={`text-base font-black font-mono px-3 py-0.5 rounded-lg border shadow-2xs ${
                  madinahDays === 0 
                    ? 'text-rose-700 bg-rose-50 border-rose-200' 
                    : 'text-amber-950 bg-white border-slate-200'
                }`}>
                  {madinahDays === 0 ? 'Medine Yok (0)' : `${madinahDays} Gün`}
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="20"
                value={madinahDays}
                onChange={(e) => setMadinahDays(parseInt(e.target.value) || 0)}
                className="w-full accent-amber-600 cursor-pointer"
              />
              <div className="flex items-center gap-1.5 pt-1">
                {[0, 3, 4, 7, 10].map(d => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setMadinahDays(d)}
                    className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold transition-all cursor-pointer ${
                      madinahDays === d 
                        ? 'bg-amber-600 text-white shadow-2xs' 
                        : d === 0 
                        ? 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 font-extrabold' 
                        : 'bg-white text-slate-600 hover:bg-slate-200 border border-slate-200'
                    }`}
                  >
                    {d === 0 ? '0 (Medine Yok)' : `${d}g`}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Oda Tipleri Karşılaştırma Tablosu */}
          <RoomComparisonTable
            matrix={roomMatrix}
            selectedOccupancy={makkahOccupancy}
            onSelectOccupancy={(occ) => {
              setMakkahOccupancy(occ);
              setMadinahOccupancy(occ);
            }}
            currency={activeCurrency}
          />
        </div>

        {/* Step 4: Transfer & Şehirlerarası Ulaşım */}
        <div className="pearl-card rounded-3xl p-6 sm:p-7 space-y-4 shadow-sm border border-slate-200/90">
          <div className="flex flex-wrap items-center justify-between border-b border-slate-100 pb-3 gap-2">
            <div>
              <h3 className="text-base font-bold text-slate-900 font-display flex items-center gap-2">
                <Bus className="h-5 w-5 text-sky-600" />
                <span>4. Transfer & Ulaşım Dağılımı</span>
              </h3>
              <p className="text-xs text-slate-400 font-medium">Araç Ücreti Kişi Sayısına Bölünür</p>
            </div>

            {/* Quick All-Transfer Toggle */}
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
                className="flex items-center gap-1 px-3 py-1 rounded-full bg-slate-100 hover:bg-rose-50 hover:text-rose-800 hover:border-rose-300 text-slate-600 border border-slate-200 text-xs font-bold transition-all cursor-pointer spring-pill"
              >
                <XCircle className="h-3.5 w-3.5 text-rose-500" />
                <span>Taşıt Gerek Yok (Tümünü Kaldır)</span>
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
                className="flex items-center gap-1 px-3 py-1 rounded-full bg-sky-50 hover:bg-sky-100 text-sky-900 border border-sky-200 text-xs font-bold transition-all cursor-pointer spring-pill"
              >
                <RotateCcw className="h-3.5 w-3.5 text-sky-600" />
                <span>Standart Transferleri Seç</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {TRANSFER_ROUTES.map((route) => {
              const sel = transfersSelection[route.id] || { vehicleType: 'small', passengerCount: 2 };
              const smallCost = activePackage?.transfers?.[route.smallKey] || 0;
              const bigCost = activePackage?.transfers?.[route.bigKey] || 0;

              return (
                <div 
                  key={route.id}
                  className="rounded-2xl p-4 border border-slate-200/90 bg-white space-y-3 shadow-2xs hover:border-slate-300 transition-all"
                >
                  <div className="flex items-center justify-between font-bold text-xs text-slate-900 pb-2 border-b border-slate-100">
                    <div className="flex items-center gap-1.5">
                      <Car className="h-4 w-4 text-sky-600" />
                      <span>{route.label}</span>
                    </div>
                    {sel.vehicleType === 'none' && (
                      <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                        Taşıt Yok
                      </span>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 block">Araç Tercihi:</label>
                    <div className="grid grid-cols-3 gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleTransferChange(route.id, 'vehicleType', 'small')}
                        className={`p-2 rounded-xl text-xs font-bold spring-pill border text-left cursor-pointer transition-all ${
                          sel.vehicleType === 'small'
                            ? 'bg-sky-50 border-sky-500 text-sky-950 ring-2 ring-sky-500/20 shadow-2xs scale-102'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <span className="block text-[10px] font-bold">Küçük</span>
                        <span className="text-[10px] font-mono text-slate-400">{smallCost} SAR</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleTransferChange(route.id, 'vehicleType', 'big')}
                        className={`p-2 rounded-xl text-xs font-bold spring-pill border text-left cursor-pointer transition-all ${
                          sel.vehicleType === 'big'
                            ? 'bg-sky-50 border-sky-500 text-sky-950 ring-2 ring-sky-500/20 shadow-2xs scale-102'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <span className="block text-[10px] font-bold">Büyük</span>
                        <span className="text-[10px] font-mono text-slate-400">{bigCost} SAR</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleTransferChange(route.id, 'vehicleType', 'none')}
                        className={`p-2 rounded-xl text-xs font-bold spring-pill border text-left cursor-pointer transition-all ${
                          sel.vehicleType === 'none'
                            ? 'bg-rose-50 border-rose-500 text-rose-950 ring-2 ring-rose-500/20 shadow-2xs scale-102'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <span className="block text-[10px] font-bold">Araç Yok</span>
                        <span className="text-[10px] font-mono text-slate-400">0 SAR</span>
                      </button>
                    </div>
                  </div>

                  {sel.vehicleType !== 'none' ? (
                    <div className="space-y-1 pt-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-500">Araçtaki Kişi Sayısı:</span>
                        <span className="font-mono font-bold text-slate-900">{sel.passengerCount || 1} Kişi</span>
                      </div>
                      <input
                        type="range"
                        min="1"
                        max="50"
                        value={sel.passengerCount || 1}
                        onChange={(e) => handleTransferChange(route.id, 'passengerCount', parseInt(e.target.value) || 1)}
                        className="w-full accent-sky-600 cursor-pointer"
                      />
                    </div>
                  ) : (
                    <div className="p-2 rounded-xl bg-slate-50 border border-slate-100 text-center text-[10px] text-slate-400 font-medium">
                      Bu rota için araç bedeli eklenmez (0 SAR)
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Step 5: Sabit & Ek Giderler Checklist */}
        <div className="pearl-card rounded-3xl p-6 sm:p-7 space-y-4 shadow-sm border border-slate-200/90">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-base font-bold text-slate-900 font-display flex items-center gap-2">
              <Coins className="h-5 w-5 text-emerald-600" />
              <span>5. Sabit & Operasyonel Giderler Havuzu</span>
            </h3>
            <span className="text-xs text-slate-400 font-medium">Teklife Dahil Edilecek Kalemleri Seçin</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {FIXED_EXPENSES_INFO.map((item) => {
              const isIncluded = !!fixedExpensesIncluded[item.key];
              const costSAR = activePackage?.fixedExpenses?.[item.key] || 0;

              return (
                <div
                  key={item.key}
                  onClick={() => toggleFixedExpense(item.key)}
                  className={`p-3.5 rounded-2xl border transition-all duration-300 cursor-pointer flex items-center justify-between select-none ${
                    isIncluded
                      ? 'bg-emerald-50/90 border-emerald-500/80 shadow-2xs scale-101'
                      : 'bg-white border-slate-200/90 opacity-60 hover:opacity-100 hover:border-slate-300'
                  }`}
                >
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-slate-900 block">{item.label}</span>
                    <span className="text-[10px] text-slate-400 line-clamp-1">{item.desc}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-xs text-slate-700">
                      {costSAR} <span className="text-[10px] text-slate-400">SAR</span>
                    </span>
                    <div className={`flex h-5 w-5 items-center justify-center rounded-lg border transition-colors ${
                      isIncluded ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-slate-300 bg-white'
                    }`}>
                      {isIncluded && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Step 6: Müşteri Bilgisi & Teklif Notları */}
        <div className="pearl-card rounded-3xl p-6 sm:p-7 space-y-4 shadow-sm border border-slate-200/90">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-base font-bold text-slate-900 font-display flex items-center gap-2">
              <User className="h-5 w-5 text-emerald-600" />
              <span>6. Müşteri & Misafir Bilgileri</span>
            </h3>
            <span className="text-xs text-slate-400 font-medium">PDF ve WhatsApp Çıktısında Görünür</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-slate-400" />
                <span>Misafir Adı Soyadı / Grup Lideri:</span>
              </label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Örn: Ahmet Yılmaz"
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs text-slate-900 focus:border-emerald-600 focus:outline-none shadow-2xs font-semibold"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5 text-slate-400" />
                <span>Telefon Numarası (WhatsApp İçin):</span>
              </label>
              <input
                type="tel"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="Örn: 0532 123 45 67"
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs text-slate-900 focus:border-emerald-600 focus:outline-none shadow-2xs font-mono font-semibold"
              />
            </div>

            <div className="sm:col-span-2 space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <MessageSquare className="h-3.5 w-3.5 text-slate-400" />
                <span>Teklif Özel Notları & Açıklamalar:</span>
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Misafir için özel istekler, rehberlik notları, transfer detayları vb."
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs text-slate-900 focus:border-emerald-600 focus:outline-none shadow-2xs resize-none"
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
          discountUSD={discountUSD}
          onChangeDiscount={setDiscountUSD}
          activeCurrency={activeCurrency}
          setActiveCurrency={setActiveCurrency}
          applyProfitMargin={applyProfitMargin}
          onToggleApplyProfitMargin={() => setApplyProfitMargin(!applyProfitMargin)}
        />
      </div>
    </div>
  );
}
