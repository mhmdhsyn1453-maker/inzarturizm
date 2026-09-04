// Inzar Turizm - Quotation Wizard Engine v1.0.12
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { useModal } from '../../context/ModalContext';
import { calculateQuotation, generateRoomMatrix } from '../../services/pricingEngine';
import { formatPhoneNumber, formatTurkishTitleCase, formatTurkishUpperCase } from '../../utils/phoneUtils';
import { syncService } from '../../services/syncService';
import LiveQuoteCard from './LiveQuoteCard';
import RoomComparisonTable from './RoomComparisonTable';
import QuotationPdfModal from '../pdf/QuotationPdfModal';
import CustomSelect from '../common/CustomSelect';
import CustomDateRangePicker, { formatDateTR, calculateNights } from '../common/CustomDateRangePicker';
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
  Utensils,
  Eraser
} from 'lucide-react';
import confetti from 'canvas-confetti';
import QuotationLetterView from './QuotationLetterView';
import { generateQuotationPdf, generateWhatsAppMessage, openQuotationInNewPage, downloadDirectQuotationPdf, shareQuoteOnWhatsApp } from '../../services/pdfService';

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
  const defaultStartDate = new Date().toISOString().split('T')[0];
  const defaultEndDate = new Date(Date.now() + 11 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const [startDate, setStartDate] = useState(draft?.startDate || defaultStartDate);
  const [endDate, setEndDate] = useState(draft?.endDate || defaultEndDate);
  const [routeOrder, setRouteOrder] = useState(draft?.routeOrder || 'makkah_first'); // 'makkah_first' (Önce Mekke) | 'madinah_first' (Önce Medine)

  const [selectedPkgId, setSelectedPkgId] = useState(draft?.selectedPkgId || packages[1]?.id || packages[0]?.id || 'standart');
  const [selectedMakkahHotelId, setSelectedMakkahHotelId] = useState(draft?.selectedMakkahHotelId || null);
  const [selectedMadinahHotelId, setSelectedMadinahHotelId] = useState(draft?.selectedMadinahHotelId || null);
  const [includeMakkahMeals, setIncludeMakkahMeals] = useState(draft?.includeMakkahMeals ?? (draft?.includeMeals ?? true));
  const [includeMadinahMeals, setIncludeMadinahMeals] = useState(draft?.includeMadinahMeals ?? (draft?.includeMeals ?? true));
  const includeMeals = includeMakkahMeals && includeMadinahMeals;

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

  const { showConfirm, showAlert, showPdfSaveLocationModal } = useModal();

  // Customer Info & Gatekeeper Verification States
  const [customerFirstName, setCustomerFirstName] = useState(draft?.customerFirstName || (draft?.customerName ? draft.customerName.split(' ')[0] : ''));
  const [customerLastName, setCustomerLastName] = useState(draft?.customerLastName || (draft?.customerName ? draft.customerName.split(' ').slice(1).join(' ') : ''));
  const [customerTcNo, setCustomerTcNo] = useState(draft?.customerTcNo || draft?.tcNo || '');
  const [customerPhone, setCustomerPhone] = useState(draft?.customerPhone || '');
  const [customerName, setCustomerName] = useState(draft?.customerName || '');
  const [notes, setNotes] = useState(draft?.notes || '');

  // Gatekeeper: isCustomerVerified is true only when customer passes query check
  const [isCustomerVerified, setIsCustomerVerified] = useState(Boolean(draft?.isCustomerVerified || editingQuote));
  const [isSearchingCustomer, setIsSearchingCustomer] = useState(false);
  const [customerHistoryQuotes, setCustomerHistoryQuotes] = useState([]);
  const [pendingQuoteBlocked, setPendingQuoteBlocked] = useState(null);

  // UI State
  const [activeCurrency, setActiveCurrency] = useState('USD');
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [savedQuoteId, setSavedQuoteId] = useState(editingQuote?.id || null);
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
        startDate,
        endDate,
        routeOrder,
        selectedPkgId,
        selectedMakkahHotelId,
        selectedMadinahHotelId,
        includeMakkahMeals,
        includeMadinahMeals,
        includeMeals,
        selectedMonth,
        makkahDays,
        makkahOccupancy,
        madinahDays,
        madinahOccupancy,
        isMixedRoomMode,
        mixedRooms,
        paxCount,
        discountUSD,
        applyProfitMargin,
        transfersSelection,
        fixedExpensesIncluded,
        customerFirstName,
        customerLastName,
        customerTcNo,
        customerName,
        customerPhone,
        notes,
        isCustomerVerified
      };
      try {
        localStorage.setItem('inzar_wizard_draft_v2', JSON.stringify(dataToSave));
      } catch (e) {}
    }
  }, [
    startDate,
    endDate,
    routeOrder,
    selectedPkgId,
    selectedMakkahHotelId,
    selectedMadinahHotelId,
    includeMakkahMeals,
    includeMadinahMeals,
    includeMeals,
    selectedMonth,
    makkahDays,
    makkahOccupancy,
    madinahDays,
    madinahOccupancy,
    isMixedRoomMode,
    mixedRooms,
    paxCount,
    discountUSD,
    applyProfitMargin,
    transfersSelection,
    fixedExpensesIncluded,
    customerFirstName,
    customerLastName,
    customerTcNo,
    customerName,
    customerPhone,
    notes,
    isCustomerVerified,
    editingQuote
  ]);

  // Handle Verify Customer / Query Past Quotes
  const handleVerifyCustomer = async (e) => {
    if (e) e.preventDefault();

    if (!customerFirstName.trim()) {
      showAlert({ title: 'Ad Zorunlu', message: 'Lütfen müşterinin adını giriniz.', type: 'error' });
      return;
    }

    if (!customerLastName.trim()) {
      showAlert({ title: 'Soyad Zorunlu', message: 'Lütfen müşterinin soyadını giriniz.', type: 'error' });
      return;
    }

    if (!customerPhone.trim() && !customerTcNo.trim()) {
      showAlert({ title: 'İletişim Bilgisi Gerekli', message: 'Lütfen müşterinin Telefon Numarasını veya T.C. Kimlik Numarasını giriniz.', type: 'error' });
      return;
    }

    setIsSearchingCustomer(true);

    try {
      const fullName = `${customerFirstName.trim()} ${customerLastName.trim()}`.toLowerCase();
      const rawPhone = customerPhone.replace(/\D/g, '');
      const cleanTc = customerTcNo.replace(/\D/g, '');

      // Tüm kayıtlı teklifleri yerel ve senkronize havuzdan al
      const allSavedQuotes = syncService.getSavedQuotes();
      
      // Eşleşen geçmiş teklifleri tara
      const matchedQuotes = allSavedQuotes.filter(q => {
        const qFullName = (q.customerName || '').toLowerCase();
        const qPhone = (q.customerPhone || '').replace(/\D/g, '');
        const qTc = (q.customerTcNo || q.tcNo || '').replace(/\D/g, '');

        if (cleanTc && qTc && cleanTc === qTc) return true;
        if (rawPhone && qPhone && (rawPhone.endsWith(qPhone) || qPhone.endsWith(rawPhone))) return true;
        if (qFullName.includes(customerFirstName.trim().toLowerCase()) && qFullName.includes(customerLastName.trim().toLowerCase())) return true;
        return false;
      });

      setCustomerHistoryQuotes(matchedQuotes);

      // KURAL: Eğer müşterinin onay bekleyen (pending) teklifi varsa -> YENİ TEKLİF VERİLEMEZ (BLOKE)
      const pendingQuote = matchedQuotes.find(q => q.status === 'pending');
      
      if (pendingQuote) {
        setPendingQuoteBlocked(pendingQuote);
        setIsCustomerVerified(false);
      } else {
        setPendingQuoteBlocked(null);
        setIsCustomerVerified(true);
        const fullCustomerName = `${customerFirstName.trim()} ${customerLastName.trim().toUpperCase()}`;
        setCustomerName(fullCustomerName);

        // Müşteriyi doğrudan Supabase customers tablosuna ve yerel havuzuna anında kaydet
        syncService.saveCustomer({
          tcNo: cleanTc,
          firstName: customerFirstName.trim(),
          lastName: customerLastName.trim(),
          fullName: fullCustomerName,
          phone: rawPhone,
          createdById: currentUser?.id,
          createdByName: currentUser?.name,
          branch: currentUser?.branch
        });

        confetti({
          particleCount: 40,
          spread: 50,
          origin: { y: 0.6 }
        });
      }
    } catch (err) {
      console.error('Customer lookup error:', err);
      setIsCustomerVerified(true);
      setCustomerName(`${customerFirstName.trim()} ${customerLastName.trim().toUpperCase()}`);
    } finally {
      setIsSearchingCustomer(false);
    }
  };

  const handleResetDraft = () => {
    localStorage.removeItem('inzar_wizard_draft_v2');
    setSelectedPkgId('');
    setSelectedMonth('');
    setMakkahDays(0);
    setMakkahOccupancy(0);
    setMadinahDays(0);
    setMadinahOccupancy(0);
    setPaxCount(0);
    setDiscountUSD(0);
    setApplyProfitMargin(true);
    setTransfersSelection({
      jedMek: { vehicleType: 'none', passengerCount: 0 },
      mekMed: { vehicleType: 'none', passengerCount: 0 },
      medAir: { vehicleType: 'none', passengerCount: 0 },
    });
    setFixedExpensesIncluded({});
    setCustomerFirstName('');
    setCustomerLastName('');
    setCustomerTcNo('');
    setCustomerPhone('');
    setCustomerName('');
    setNotes('');
    setIsCustomerVerified(false);
    setPendingQuoteBlocked(null);
    setCustomerHistoryQuotes([]);
    setSavedQuoteId(null);
    setIsSaved(false);
    if (editingQuote) {
      setEditingQuote(null);
    }
  };

  // Edit Mode Initialization with Ref Guard
  const loadedQuoteIdRef = useRef(null);

  useEffect(() => {
    if (editingQuote) {
      const quoteKey = editingQuote.id || editingQuote.timestamp || JSON.stringify(editingQuote);
      if (loadedQuoteIdRef.current === quoteKey) return;
      loadedQuoteIdRef.current = quoteKey;

      const pkgId = editingQuote.selectedPkgId || editingQuote.packageId || editingQuote.pkgDetails?.id;
      if (pkgId) setSelectedPkgId(pkgId);
      if (editingQuote.selectedMakkahHotelId) setSelectedMakkahHotelId(editingQuote.selectedMakkahHotelId);
      if (editingQuote.selectedMadinahHotelId) setSelectedMadinahHotelId(editingQuote.selectedMadinahHotelId);
      
      if (editingQuote.includeMakkahMeals !== undefined) {
        setIncludeMakkahMeals(Boolean(editingQuote.includeMakkahMeals));
      } else if (editingQuote.includeMeals !== undefined) {
        setIncludeMakkahMeals(Boolean(editingQuote.includeMeals));
      }

      if (editingQuote.includeMadinahMeals !== undefined) {
        setIncludeMadinahMeals(Boolean(editingQuote.includeMadinahMeals));
      } else if (editingQuote.includeMeals !== undefined) {
        setIncludeMadinahMeals(Boolean(editingQuote.includeMeals));
      }

      if (editingQuote.selectedMonth) setSelectedMonth(editingQuote.selectedMonth);
      if (editingQuote.makkahDays !== undefined) setMakkahDays(Number(editingQuote.makkahDays) || 0);
      if (editingQuote.madinahDays !== undefined) setMadinahDays(Number(editingQuote.madinahDays) || 0);
      if (editingQuote.makkahRoomOccupancy !== undefined || editingQuote.makkahOccupancy !== undefined) {
        setMakkahOccupancy(Number(editingQuote.makkahRoomOccupancy || editingQuote.makkahOccupancy) || 2);
      }
      if (editingQuote.madinahRoomOccupancy !== undefined || editingQuote.madinahOccupancy !== undefined) {
        setMadinahOccupancy(Number(editingQuote.madinahRoomOccupancy || editingQuote.madinahOccupancy) || 2);
      }
      if (editingQuote.paxCount !== undefined) setPaxCount(Number(editingQuote.paxCount) || 1);
      if (editingQuote.customDiscountUSD !== undefined || editingQuote.discountUSD !== undefined) {
        setDiscountUSD(Number(editingQuote.customDiscountUSD || editingQuote.discountUSD || 0));
      }
      const fullName = editingQuote.customerName || '';
      const cParts = fullName.trim().split(/\s+/);
      setCustomerName(fullName);
      setCustomerFirstName(editingQuote.customerFirstName || cParts[0] || '');
      setCustomerLastName(editingQuote.customerLastName || cParts.slice(1).join(' ') || '');
      setCustomerTcNo(editingQuote.customerTcNo || editingQuote.tcNo || '');
      setCustomerPhone(editingQuote.customerPhone || '');
      setIsCustomerVerified(true);
      setNotes(editingQuote.notes || '');

      if (editingQuote.startDate) setStartDate(editingQuote.startDate);
      if (editingQuote.endDate) setEndDate(editingQuote.endDate);
      if (editingQuote.routeOrder) setRouteOrder(editingQuote.routeOrder);

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
      setSavedQuoteId(editingQuote.id || null);
      setIsSaved(true);
      setViewMode('form');
    } else {
      loadedQuoteIdRef.current = null;
    }
  }, [editingQuote]);

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

  // Hesaplanan Seyahat ve Etap Takvim Özeti
  const routeSchedule = useMemo(() => {
    if (!startDate) return null;
    const sDate = new Date(startDate);
    if (isNaN(sDate.getTime())) return null;

    const numMakkah = Number(makkahDays) || 0;
    const numMadinah = Number(madinahDays) || 0;

    if (routeOrder === 'madinah_first') {
      // 1. Etap Medine
      const medStart = startDate;
      const medEndDate = new Date(sDate);
      medEndDate.setDate(medEndDate.getDate() + numMadinah);
      const medEnd = medEndDate.toISOString().split('T')[0];

      // 2. Etap Mekke
      const mekStart = medEnd;
      const mekEndDate = new Date(medEndDate);
      mekEndDate.setDate(mekEndDate.getDate() + numMakkah);
      const mekEnd = mekEndDate.toISOString().split('T')[0];

      return {
        routeOrder: 'madinah_first',
        routeLabel: 'Önce Medine, Sonra Mekke',
        firstCity: 'Medine',
        firstCityFull: 'Medine-i Münevvere',
        firstStart: medStart,
        firstEnd: medEnd,
        firstDays: numMadinah,
        secondCity: 'Mekke',
        secondCityFull: 'Mekke-i Mükerreme',
        secondStart: mekStart,
        secondEnd: mekEnd,
        secondDays: numMakkah,
        totalNights: numMadinah + numMakkah,
        calculatedEndDate: mekEnd
      };
    } else {
      // 1. Etap Mekke (Varsayılan)
      const mekStart = startDate;
      const mekEndDate = new Date(sDate);
      mekEndDate.setDate(mekEndDate.getDate() + numMakkah);
      const mekEnd = mekEndDate.toISOString().split('T')[0];

      // 2. Etap Medine
      const medStart = mekEnd;
      const medEndDate = new Date(mekEndDate);
      medEndDate.setDate(medEndDate.getDate() + numMadinah);
      const medEnd = medEndDate.toISOString().split('T')[0];

      return {
        routeOrder: 'makkah_first',
        routeLabel: 'Önce Mekke, Sonra Medine',
        firstCity: 'Mekke',
        firstCityFull: 'Mekke-i Mükerreme',
        firstStart: mekStart,
        firstEnd: mekEnd,
        firstDays: numMakkah,
        secondCity: 'Medine',
        secondCityFull: 'Medine-i Münevvere',
        secondStart: medStart,
        secondEnd: medEnd,
        secondDays: numMadinah,
        totalNights: numMakkah + numMadinah,
        calculatedEndDate: medEnd
      };
    }
  }, [startDate, routeOrder, makkahDays, madinahDays]);

  // Paket değiştiğinde seçili otelleri yeni paketin otelleriyle senkronize et
  useEffect(() => {
    if (activePackage) {
      const mHotels = activePackage.makkahHotels || [];
      const medHotels = activePackage.madinahHotels || [];
      
      const hasMakkah = mHotels.some(h => h.id === selectedMakkahHotelId);
      if (!hasMakkah && mHotels.length > 0) {
        setSelectedMakkahHotelId(mHotels[0].id);
      }

      const hasMed = medHotels.some(h => h.id === selectedMadinahHotelId);
      if (!hasMed && medHotels.length > 0) {
        setSelectedMadinahHotelId(medHotels[0].id);
      }
    }
  }, [activePackage, selectedPkgId]);

  // Real-time Pricing Calculation
  const rawQuotation = useMemo(() => {
    if (!activePackage) return null;
    
    return calculateQuotation({
      pkg: activePackage,
      startDate,
      endDate: routeSchedule?.calculatedEndDate || endDate,
      routeOrder,
      selectedMonth,
      makkahDays,
      makkahRoomOccupancy: makkahOccupancy,
      madinahDays,
      madinahRoomOccupancy: madinahOccupancy,
      selectedMakkahHotelId,
      selectedMadinahHotelId,
      includeMeals,
      includeMakkahMeals,
      includeMadinahMeals,
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
    startDate,
    endDate,
    routeOrder,
    routeSchedule,
    selectedMonth, 
    makkahDays, 
    makkahOccupancy, 
    madinahDays, 
    madinahOccupancy, 
    selectedMakkahHotelId,
    selectedMadinahHotelId,
    includeMeals,
    includeMakkahMeals,
    includeMadinahMeals,
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
      currencies,
      startDate,
      routeOrder,
      selectedMakkahHotelId,
      selectedMadinahHotelId,
      includeMeals,
      includeMakkahMeals,
      includeMadinahMeals
    );
  }, [
    activePackage, 
    selectedMonth, 
    makkahDays, 
    madinahDays, 
    currencies, 
    startDate, 
    routeOrder, 
    selectedMakkahHotelId, 
    selectedMadinahHotelId, 
    includeMeals,
    includeMakkahMeals,
    includeMadinahMeals
  ]);

  // Enriched full quotation
  const currentQuotation = useMemo(() => {
    if (!rawQuotation) return null;
    const selectedMonthObj = months?.find(m => m.id === selectedMonth) || { label: 'Standart Dönem', name: 'Dönem' };
    const selectedMonthLabel = selectedMonthObj?.label || selectedMonthObj?.name || 'Standart Dönem';

    const mHotels = activePackage?.makkahHotels || [];
    const medHotels = activePackage?.madinahHotels || [];
    const selectedMakkahHotelObj = mHotels.find(h => h.id === selectedMakkahHotelId) || mHotels[0];
    const selectedMadinahHotelObj = medHotels.find(h => h.id === selectedMadinahHotelId) || medHotels[0];

    return {
      ...rawQuotation,
      id: editingQuote ? editingQuote.id : (savedQuoteId || undefined),
      startDate,
      endDate: routeSchedule?.calculatedEndDate || endDate,
      routeOrder,
      routeSchedule,
      selectedMonth,
      selectedMonthLabel,
      selectedMonthName: activeMonth?.name || activeMonth?.label || selectedMonth,
      pkgDetails: activePackage,
      selectedMakkahHotelId,
      selectedMadinahHotelId,
      selectedMakkahHotel: selectedMakkahHotelObj,
      selectedMadinahHotel: selectedMadinahHotelObj,
      includeMeals,
      includeMakkahMeals,
      includeMadinahMeals,
      roomMatrix,
      fixedExpensesIncluded,
      transfersSelection,
      customerFirstName,
      customerLastName,
      customerTcNo,
      tcNo: customerTcNo,
      customerName,
      customerPhone,
      paxCount,
      notes,
      agentName: currentUser?.name || 'Acente Temsilcisi',
      isRevision: !!editingQuote,
      originalQuoteId: editingQuote?.id || null
    };
  }, [
    rawQuotation, 
    startDate,
    endDate,
    routeOrder,
    routeSchedule,
    activePackage, 
    roomMatrix, 
    fixedExpensesIncluded, 
    transfersSelection, 
    customerFirstName,
    customerLastName,
    customerTcNo,
    customerName, 
    customerPhone, 
    paxCount, 
    notes, 
    currentUser, 
    months, 
    selectedMonth, 
    editingQuote, 
    activeMonth
  ]);

  const toggleFixedExpense = (key) => {
    setFixedExpensesIncluded(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleTransferChange = (routeId, field, value) => {
    setTransfersSelection(prev => {
      const currentRoute = prev[routeId] || {};
      const updatedRoute = { ...currentRoute, [field]: value };

      if (field === 'vehicleType' && value !== 'none') {
        const totalMixedPax = (mixedRooms?.single || 0) * 1 + (mixedRooms?.double || 0) * 2 + (mixedRooms?.triple || 0) * 3 + (mixedRooms?.quad || 0) * 4;
        const effectiveGroupPax = isMixedRoomMode 
          ? (totalMixedPax > 0 ? totalMixedPax : paxCount || 1)
          : (makkahOccupancy || paxCount || 2);

        if (!updatedRoute.passengerCount || updatedRoute.passengerCount <= 0) {
          updatedRoute.passengerCount = effectiveGroupPax;
        }
      }

      return {
        ...prev,
        [routeId]: updatedRoute
      };
    });
  };

  // 🛡️ Zorunlu Alan Doğrulama Kontrolü (Açıklama hariç tüm adımlar zorunludur)
  const validateForm = () => {
    if (!isCustomerVerified) {
      return { isValid: false, stepId: 'step-0', message: 'Lütfen önce misafir bilgilerini girip onaylayınız.' };
    }
    if (!startDate || !endDate) {
      return { isValid: false, stepId: 'step-1', message: '1. Adım Eksik: Lütfen Seyahat Giriş ve Çıkış Tarihlerini belirleyiniz.' };
    }
    if (!selectedPkgId) {
      return { isValid: false, stepId: 'step-2', message: '2. Adım Eksik: Lütfen bir Umre Paketi seçiniz.' };
    }
    if ((Number(makkahDays) || 0) <= 0 && (Number(madinahDays) || 0) <= 0) {
      return { isValid: false, stepId: 'step-3', message: '3. Adım Eksik: Lütfen Mekke veya Medine için en az 1 gece konaklama süresi belirleyiniz.' };
    }
    if (!isMixedRoomMode && (!makkahOccupancy || makkahOccupancy <= 0)) {
      return { isValid: false, stepId: 'step-3', message: '3. Adım Eksik: Lütfen bir Oda Tipi (2, 3 veya 4 Kişilik) seçiniz.' };
    }
    if (isMixedRoomMode) {
      const totalRooms = (Number(mixedRooms?.single) || 0) + (Number(mixedRooms?.double) || 0) + (Number(mixedRooms?.triple) || 0) + (Number(mixedRooms?.quad) || 0);
      if (totalRooms <= 0) {
        return { isValid: false, stepId: 'step-3', message: '3. Adım Eksik: Lütfen en az 1 adet oda adedi belirleyiniz.' };
      }
    }
    // 5. Tarih Aralığı Fiyat Tarifesi Doğrulaması
    if (currentQuotation?.isUnpriced || currentQuotation?.hasValidTariff === false) {
      return { 
        isValid: false, 
        stepId: 'step-2', 
        message: currentQuotation?.tariffWarning || 'Genel Merkez seçilen tarih aralığı için henüz otel fiyat tarifesi belirlememiştir.' 
      };
    }

    return { isValid: true };
  };

  const handleSwitchToLetter = () => {
    const validation = validateForm();
    if (!validation.isValid) {
      showAlert({
        title: 'Zorunlu Alanlar Eksik',
        message: validation.message,
        type: 'error'
      });
      const el = document.getElementById(validation.stepId);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    setViewMode('letter');
  };

  const handleSaveQuote = async () => {
    const validation = validateForm();
    if (!validation.isValid) {
      showAlert({
        title: 'Teklif Kaydedilemez',
        message: validation.message,
        type: 'error'
      });
      const el = document.getElementById(validation.stepId);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    if (!editingQuote && isSaved && savedQuoteId) {
      showAlert({
        title: '✓ Teklif Zaten Kaydedildi',
        message: `Bu teklif (${savedQuoteId}) sisteme başarıyla işlenmiştir. "Verilen Teklifler" sayfasından dilediğiniz zaman inceleyebilirsiniz.`,
        type: 'info'
      });
      return;
    }

    const isEditingMode = Boolean(editingQuote);
    const quoteIdToUse = editingQuote?.id || savedQuoteId || ('QUO-' + Date.now());
    const quotePayload = {
      ...currentQuotation,
      id: quoteIdToUse,
      createdById: currentUser?.id || currentQuotation?.createdById,
      createdByName: currentUser?.name || currentQuotation?.createdByName,
      branch: currentUser?.branch || currentQuotation?.branch
    };

    saveQuote(quotePayload);
    setSavedQuoteId(quoteIdToUse);
    setIsSaved(true);
    localStorage.removeItem('inzar_wizard_draft_v2');

    confetti({
      particleCount: 60,
      spread: 70,
      origin: { y: 0.7 }
    });

    if (isEditingMode) {
      setEditingQuote(null);
      const goBack = await showConfirm({
        title: '✓ Teklif Başarıyla Güncellendi (Revize Edildi)',
        message: `"${quotePayload.customerName || 'Misafir'}" adına olan ${quoteIdToUse} numaralı teklifin tüm güncel fiyatları, otel ve tarih değişiklikleri başarıyla veri tabanına işlendi.\n\nVerilen Teklifler listesine dönmek ister misiniz?`,
        confirmText: 'Evet, Teklifler Listesine Dön',
        cancelText: 'Burada Kal',
        type: 'success',
        confirmVariant: 'emerald'
      });

      if (goBack) {
        setActiveTab('quotes');
      }
    } else {
      const wantNew = await showConfirm({
        title: '✓ Teklif Başarıyla Kaydedildi',
        message: `${quotePayload.customerName || 'Misafir'} adına hazırlanan teklif (${quoteIdToUse}) başarıyla sisteme kaydedildi ve "Verilen Teklifler" listesine eklendi.\n\nYeni bir teklif hazırlamak için formu temizlemek ister misiniz?`,
        confirmText: 'Evet, Yeni Teklif Hazırla',
        cancelText: 'Teklif Sayfasında Kal',
        type: 'success',
        confirmVariant: 'emerald'
      });

      if (wantNew) {
        handleResetDraft();
        setViewMode('form');
      }
    }
  };

  const handleDownloadPdf = async () => {
    const validation = validateForm();
    if (!validation.isValid) {
      showAlert({
        title: 'PDF İndirilemez',
        message: validation.message,
        type: 'error'
      });
      const el = document.getElementById(validation.stepId);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    if (!currentQuotation) return;

    const mode = await showPdfSaveLocationModal(currentQuotation.customerName ? `${currentQuotation.customerName}_Umre_Teklifi.pdf` : 'Inzar_Umre_Teklifi.pdf');
    if (!mode) return;

    try {
      setIsDownloadingPdf(true);
      await downloadDirectQuotationPdf(currentQuotation, mode);
    } catch (err) {
      console.error('PDF download error:', err);
      try {
        await generateQuotationPdf('inzar-app-printable-letter', currentQuotation);
      } catch (e2) {
        alert('PDF oluşturulamadı.');
      }
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  // Handle Reset Click with Confirmation if form is active
  const handleResetClick = async () => {
    if (isCustomerVerified || customerFirstName || customerLastName || customerPhone) {
      const confirmed = await showConfirm({
        title: 'Teklifi İptal Et & Sıfırla',
        message: 'Müşteri vazgeçtiyse veya teklifi sıfırlamak istiyorsanız onaylayınız. Yapılan tüm seçimler temizlenecektir.',
        confirmText: 'Evet, İptal Et & Sıfırla',
        cancelText: 'Devam Et',
        type: 'danger',
        confirmVariant: 'danger',
        onConfirm: () => {
          handleResetDraft();
        }
      });
      if (confirmed) {
        handleResetDraft();
      }
    } else {
      handleResetDraft();
    }
  };

  // 🧹 Yalnızca Seçimleri Temizle (Misafir Bilgileri Korunur)
  const handleClearSelections = async () => {
    const confirmed = await showConfirm({
      title: 'Seçimleri Temizle',
      message: 'Formdaki paket, otel günleri, oda dağılımı, transfer ve gider seçimleri sıfırlanacaktır. Misafir bilgileri korunacaktır. Onaylıyor musunuz?',
      confirmText: 'Evet, Seçimleri Temizle',
      cancelText: 'Vazgeç',
      type: 'warning',
      confirmVariant: 'amber',
      onConfirm: () => {
        doClearSelections();
      }
    });
    if (confirmed) {
      doClearSelections();
    }
  };

  const doClearSelections = () => {
    localStorage.removeItem('inzar_wizard_draft_v2');
    setSelectedPkgId('');
    setSelectedMonth('');
    setMakkahDays(0);
    setMakkahOccupancy(0);
    setMadinahDays(0);
    setMadinahOccupancy(0);
    setPaxCount(0);
    setDiscountUSD(0);
    setApplyProfitMargin(true);
    setIsMixedRoomMode(false);
    setMixedRooms({ single: 0, double: 0, triple: 0, quad: 0 });
    setTransfersSelection({
      jedMek: { vehicleType: 'none', passengerCount: 0 },
      mekMed: { vehicleType: 'none', passengerCount: 0 },
      medAir: { vehicleType: 'none', passengerCount: 0 },
    });
    setFixedExpensesIncluded({});
    setNotes('');
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
        
        {/* Left Section: RED RESET FORM BUTTON + ORANGE CLEAR SELECTIONS BUTTON + (Conditional) Sliding Pill Switcher */}
        <div className="flex items-center gap-2.5 flex-wrap">
          
          {/* 🔴 RED RESET FORM BUTTON (Her Zaman Erişilebilir Bağımsız Kırmızı Sıfırla Butonu) */}
          <button
            type="button"
            onClick={handleResetClick}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 active:scale-95 text-white text-xs font-black transition-all cursor-pointer shadow-xs shadow-rose-600/30 hover:shadow-md hover:shadow-rose-600/40"
            title="Tüm formu ve misafir verilerini tamamen sıfırla"
          >
            <RotateCcw className="h-3.5 w-3.5 stroke-[2.5]" />
            <span>Formu Sıfırla</span>
          </button>

          {/* 🧹 SEÇİMLERİ TEMİZLE BUTONU (Müşteri içerideyken ve sadece Form modunda görünür, mektuba geçince kalkar) */}
          {isCustomerVerified && viewMode === 'form' && (
            <button
              type="button"
              onClick={handleClearSelections}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 active:scale-95 text-white text-xs font-black transition-all cursor-pointer shadow-xs shadow-amber-500/30 hover:shadow-md hover:shadow-amber-500/40 animate-scale-in"
              title="Misafir bilgilerini koruyarak sadece formdaki seçimleri temizle"
            >
              <Eraser className="h-3.5 w-3.5 stroke-[2.5]" />
              <span>Seçimleri Temizle</span>
            </button>
          )}

          {/* Sliding Pill Switcher (Yalnızca Müşteri Doğrulandıktan Sonra CSS Animasyonuyla Belirir) */}
          {isCustomerVerified && (
            <div className="relative p-1 bg-white/95 rounded-full border border-slate-200/90 shadow-2xs flex items-center select-none w-64 sm:w-72 shrink-0 animate-scale-in">
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
                onClick={handleSwitchToLetter}
                className={`relative z-10 flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-full text-xs font-bold transition-colors duration-200 cursor-pointer ${
                  viewMode === 'letter' ? 'text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <FileText className="h-3.5 w-3.5 shrink-0" />
                <span>Teklif Mektubu</span>
              </button>
            </div>
          )}
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

              {/* Save / Update Quote Button */}
              <button
                type="button"
                onClick={handleSaveQuote}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full font-bold text-xs border transition-all cursor-pointer ${
                  editingQuote
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-600 font-extrabold shadow-sm'
                    : isSaved
                    ? 'bg-emerald-100 text-emerald-950 border-emerald-300 font-extrabold shadow-2xs'
                    : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300'
                }`}
              >
                <CheckCircle2 className={`h-3.5 w-3.5 ${editingQuote ? 'text-white' : 'text-emerald-600'}`} />
                <span>{editingQuote ? 'Değişiklikleri Güncelle' : isSaved ? '✓ Kaydedildi' : 'Teklifi Kaydet'}</span>
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
        ) : !isCustomerVerified ? (
          
          /* ═══════════════════════════════════════════════════════════
             GATEKEEPER STEP 0: MÜŞTERİ BİLGİSİ & ÖN DOĞRULAMA EKRANI
             (İlk başta hiçbir yer gözükmez, sadece müşteri bilgisi girilir)
             ═══════════════════════════════════════════════════════════ */
          <div className="max-w-3xl mx-auto py-6 animate-scale-in">
            <div className="pearl-card rounded-3xl bg-white border-2 border-slate-200/90 shadow-xl overflow-hidden">
              
              {/* Header */}
              <div className="p-6 bg-gradient-to-r from-emerald-800 via-emerald-700 to-teal-800 text-white space-y-1 relative overflow-hidden">
                <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 opacity-10 pointer-events-none">
                  <User className="h-40 w-40" />
                </div>
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-white/20 backdrop-blur-xs">
                    <User className="h-5 w-5 text-white" />
                  </div>
                  <span className="text-[11px] font-extrabold uppercase tracking-widest text-emerald-200">
                    Teklif Başlangıç Adımı
                  </span>
                </div>
                <h3 className="text-xl font-black font-display tracking-tight text-white">
                  Müşteri Bilgileri & Teklif Uygunluk Sorgulama
                </h3>
                <p className="text-xs text-emerald-100/90 max-w-xl">
                  Yeni bir umre teklifi hazırlayabilmek için lütfen misafirin kimlik ve iletişim bilgilerini giriniz. Sistem otomatik olarak geçmiş teklif geçmişini kontrol edecektir.
                </p>
              </div>

              {/* Form Body */}
              <form onSubmit={handleVerifyCustomer} className="p-6 sm:p-8 space-y-6">
                
                {/* 🛑 BLOKE UYARISI: Eğer onay bekleyen teklif varsa */}
                {pendingQuoteBlocked && (
                  <div className="p-5 rounded-2xl bg-rose-50 border-2 border-rose-300 shadow-sm space-y-3 animate-shake">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-xl bg-rose-600 text-white shrink-0 shadow-xs">
                        <XCircle className="h-5 w-5" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-sm font-black text-rose-950">
                          Bu Müşteriye Yeni Teklif Verilemez!
                        </h4>
                        <p className="text-xs font-semibold text-rose-800 leading-relaxed">
                          Müşteriye ait <strong>onay bekleyen (beklemede)</strong> aktif bir teklif bulunmaktadır. Müşteri bu teklifi onaylamadan veya sonuçlandırmadan aynı kişi için mükerrer teklif oluşturulamaz.
                        </p>
                      </div>
                    </div>

                    {/* Bekleyen Teklif Özeti */}
                    <div className="p-3.5 bg-white rounded-xl border border-rose-200 space-y-1.5 text-xs">
                      <div className="flex items-center justify-between font-bold text-slate-800">
                        <span>Teklif No: <span className="font-mono text-rose-700">{pendingQuoteBlocked.id}</span></span>
                        <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 font-extrabold text-[10px] uppercase">
                          Müşteri Onayı Bekliyor
                        </span>
                      </div>
                      <div className="text-slate-600 flex items-center justify-between">
                        <span>Paket: <strong>{pendingQuoteBlocked.packageName}</strong></span>
                        <span className="font-mono font-black text-slate-900">{pendingQuoteBlocked.finalPriceUSD} USD</span>
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Oluşturulma: {new Date(pendingQuoteBlocked.createdAt).toLocaleDateString('tr-TR')} • Temsilci: {pendingQuoteBlocked.agentName || pendingQuoteBlocked.createdByName}
                      </div>
                    </div>
                  </div>
                )}

                {/* Input Fields (Ad, Soyad, TC, Telefon) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  
                  {/* Ad */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5 text-emerald-600" />
                      <span>Müşteri Adı *</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Örn: Ahmet"
                      value={customerFirstName}
                      onChange={(e) => setCustomerFirstName(formatTurkishTitleCase(e.target.value))}
                      className="w-full bg-slate-50 focus:bg-white text-slate-900 font-bold text-sm rounded-xl px-3.5 py-2.5 border border-slate-300 focus:outline-none focus:border-emerald-600 focus:ring-3 focus:ring-emerald-600/20 transition-all shadow-3xs"
                    />
                  </div>

                  {/* Soyad */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5 text-emerald-600" />
                      <span>Müşteri Soyadı *</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Örn: YILMAZ"
                      value={customerLastName}
                      onChange={(e) => setCustomerLastName(formatTurkishUpperCase(e.target.value))}
                      className="w-full bg-slate-50 focus:bg-white text-slate-900 font-bold text-sm rounded-xl px-3.5 py-2.5 border border-slate-300 focus:outline-none focus:border-emerald-600 focus:ring-3 focus:ring-emerald-600/20 transition-all shadow-3xs uppercase"
                    />
                  </div>

                  {/* T.C. Kimlik Numarası */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <Layers className="h-3.5 w-3.5 text-emerald-600" />
                      <span>T.C. Kimlik No</span>
                    </label>
                    <input
                      type="text"
                      maxLength={11}
                      placeholder="11 Haneli T.C. No"
                      value={customerTcNo}
                      onChange={(e) => setCustomerTcNo(e.target.value.replace(/\D/g, ''))}
                      className="w-full bg-slate-50 focus:bg-white text-slate-900 font-mono font-bold text-sm rounded-xl px-3.5 py-2.5 border border-slate-300 focus:outline-none focus:border-emerald-600 focus:ring-3 focus:ring-emerald-600/20 transition-all shadow-3xs tracking-wider"
                    />
                  </div>

                  {/* Telefon Numarası (+90 Otonom Format) */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5 text-emerald-600" />
                      <span>Telefon Numarası *</span>
                    </label>
                    <input
                      type="tel"
                      placeholder="+90 (5XX) XXX XX XX"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(formatPhoneNumber(e.target.value))}
                      className="w-full bg-slate-50 focus:bg-white text-slate-900 font-mono font-bold text-sm rounded-xl px-3.5 py-2.5 border border-slate-300 focus:outline-none focus:border-emerald-600 focus:ring-3 focus:ring-emerald-600/20 transition-all shadow-3xs"
                    />
                  </div>

                </div>

                {/* Varsa Geçmiş Onaylanmış / Reddedilmiş Teklifler Dökümü */}
                {customerHistoryQuotes.length > 0 && !pendingQuoteBlocked && (
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800">
                        Misafirin Geçmiş Teklif Geçmişi ({customerHistoryQuotes.length} Kayıt):
                      </span>
                    </div>
                    <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                      {customerHistoryQuotes.map(q => {
                        const isApproved = q.status === 'approved' || q.status === 'approved_revised';
                        const isRejected = q.status === 'rejected';

                        return (
                          <div key={q.id} className="p-2.5 bg-white rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                            <div>
                              <span className="font-bold text-slate-900">{q.packageName}</span>
                              <span className="text-[10px] text-slate-400 ml-2">{new Date(q.createdAt).toLocaleDateString('tr-TR')}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-black text-slate-800">{q.finalPriceUSD} USD</span>
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                                isApproved ? 'bg-emerald-100 text-emerald-800' : isRejected ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-700'
                              }`}>
                                {isApproved ? 'Onaylandı' : isRejected ? 'Reddedildi' : q.status}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Submit & Devam Et Button */}
                <div className="pt-2 flex items-center justify-end gap-3">
                  <button
                    type="submit"
                    disabled={isSearchingCustomer}
                    className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-700 via-emerald-600 to-teal-700 hover:from-emerald-600 hover:to-teal-600 text-white font-black text-sm transition-all cursor-pointer shadow-lg shadow-emerald-800/30 flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95 disabled:opacity-50"
                  >
                    {isSearchingCustomer ? (
                      <>
                        <Clock className="h-4 w-4 animate-spin" />
                        <span>Sorgulanıyor...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4 stroke-[2.5]" />
                        <span>Devam Et & Teklif Oluştur</span>
                      </>
                    )}
                  </button>
                </div>

              </form>

            </div>
          </div>

        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start font-sans">
            {/* Left 7/8 Columns: Configuration Form */}
            <div className="lg:col-span-7 xl:col-span-8 min-w-0 space-y-6 pb-24">

              {/* 👤 Doğrulanmış Müşteri Bilgi Rozeti & Değiştir Butonu */}
              <div className="pearl-card rounded-2xl p-4 bg-gradient-to-r from-emerald-50 via-teal-50/50 to-white border border-emerald-300/80 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-slide-down">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-2xl bg-emerald-700 text-white flex items-center justify-center font-black text-sm shadow-xs shrink-0">
                    {(customerFirstName || '').charAt(0)}{(customerLastName || '').charAt(0)}
                  </div>
                  <div>
                    <div className="text-xs font-black text-slate-900 flex items-center gap-2">
                      <span>{customerFirstName || ''} {(customerLastName || '').toUpperCase()}</span>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                        Doğrulanmış Misafir
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 flex items-center gap-3 mt-0.5">
                      {customerTcNo && <span>TC: <strong className="font-mono text-slate-700">{customerTcNo}</strong></span>}
                      {customerPhone && <span>Tel: <strong className="font-mono text-slate-700">{customerPhone}</strong></span>}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsCustomerVerified(false)}
                  className="px-3.5 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs font-bold transition-all cursor-pointer shadow-3xs self-start sm:self-auto hover:border-slate-400"
                >
                  Misafiri Değiştir
                </button>
              </div>

        {/* Step 1: Seyahat Tarihleri, Kalış Süresi & Rota Sıralaması */}
        <div id="step-1" className={`pearl-card rounded-2xl p-5 sm:p-6 space-y-5 shadow-2xs border transition-all duration-300 bg-white scroll-mt-6 ${
          !startDate || !endDate ? 'border-amber-300 ring-2 ring-amber-400/20' : 'border-slate-200/90'
        }`}>
          <div className="flex flex-wrap items-center justify-between border-b border-slate-100 pb-3 gap-2">
            <div className="flex items-center gap-2.5">
              <h3 className="text-sm font-bold text-slate-900 font-display flex items-center gap-1.5">
                <Calendar className="h-4 w-4 text-emerald-600" />
                <span>Seyahat Tarihleri & Rota Sıralaması</span>
              </h3>
            </div>
            
            <div className="flex items-center gap-2">
              {startDate && endDate ? (
                <span className="text-[11px] text-emerald-800 font-bold bg-emerald-100/90 px-2.5 py-0.5 rounded-full border border-emerald-300 flex items-center gap-1 animate-scale-in">
                  <Check className="h-3 w-3 stroke-[3]" />
                  <span>
                    {calculateNights(startDate, routeSchedule?.calculatedEndDate || endDate) > 0
                      ? `${calculateNights(startDate, routeSchedule?.calculatedEndDate || endDate) + 1} Gün ${calculateNights(startDate, routeSchedule?.calculatedEndDate || endDate)} Gece Belirlendi`
                      : 'Tarih Belirlendi'}
                  </span>
                </span>
              ) : (
                <span className="text-[11px] text-rose-700 font-black bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200 animate-pulse">
                  * Tarih Seçimi Zorunlu
                </span>
              )}
            </div>
          </div>

          {/* Tarih Aralığı ve Rota Sıralaması Kontrolleri */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
            
            {/* Sol 6 Kolon: Tarih Aralığı Seçici */}
            <div className="md:col-span-6 space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-emerald-600" />
                <span>Giriş & Çıkış Tarihleri (Seyahat Aralığı) *</span>
              </label>
              <CustomDateRangePicker
                startDate={startDate}
                endDate={routeSchedule?.calculatedEndDate || endDate}
                onChange={({ startDate: newStart, endDate: newEnd, nights }) => {
                  setStartDate(newStart);
                  setEndDate(newEnd);
                  if (nights > 0) {
                    if (routeOrder === 'madinah_first') {
                      const med = Math.min(4, Math.max(1, Math.floor(nights * 0.3)));
                      setMadinahDays(med);
                      setMakkahDays(Math.max(1, nights - med));
                    } else {
                      const med = Math.min(4, Math.max(1, Math.floor(nights * 0.3)));
                      setMakkahDays(Math.max(1, nights - med));
                      setMadinahDays(med);
                    }
                  }
                }}
                themeColor="emerald"
                placeholder="Seyahat Başlangıç ve Bitiş Tarihi"
              />
            </div>

            {/* Sağ 6 Kolon: Rota Sıralaması (Önce Mekke / Önce Medine) */}
            <div className="md:col-span-6 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Navigation className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Seyahat Rotası Sıralaması *</span>
                </label>
                <span className="text-[10px] text-slate-400 font-semibold italic">
                  Seçilen şehir 1. sıraya geçer
                </span>
              </div>

              {/* Akıcı Yer Değiştiren Buton Grubu */}
              <div className="grid grid-cols-2 gap-2 relative">
                {/* Önce Mekke Butonu */}
                <button
                  key={`${routeOrder}-makkah`}
                  type="button"
                  onClick={() => setRouteOrder('makkah_first')}
                  className={`p-2.5 rounded-2xl border text-left cursor-pointer transition-all duration-300 select-none relative overflow-hidden flex flex-col justify-between h-[68px] ${
                    routeOrder === 'makkah_first'
                      ? 'order-1 border-emerald-600 bg-gradient-to-br from-emerald-50 via-teal-50/70 to-emerald-50/90 text-emerald-950 ring-2 ring-emerald-600/30 shadow-xs font-black animate-swap-front'
                      : 'order-2 border-slate-200/90 bg-white hover:border-emerald-300 text-slate-600 hover:bg-slate-50 opacity-75 hover:opacity-100 animate-swap-back'
                  }`}
                >
                  <div className="flex items-center justify-between w-full gap-1.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <img src="/mekke.png" alt="Mekke" className="h-4 w-4 object-contain shrink-0" />
                      <span className="text-xs font-bold truncate">Önce Mekke</span>
                    </div>
                    {routeOrder === 'makkah_first' ? (
                      <span className="px-1.5 py-0.5 rounded-md bg-emerald-700 text-white text-[9px] font-black uppercase tracking-wider shrink-0 shadow-3xs">
                        1. Durak
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-500 text-[9px] font-bold shrink-0">
                        2. Durak
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between w-full pt-1 border-t border-slate-200/50 text-[10px]">
                    <span className="text-slate-400 font-semibold truncate">Mekke ➔ Medine</span>
                    {routeOrder === 'makkah_first' && (
                      <Check className="h-3.5 w-3.5 text-emerald-600 stroke-[3] shrink-0" />
                    )}
                  </div>
                </button>

                {/* Önce Medine Butonu */}
                <button
                  key={`${routeOrder}-madinah`}
                  type="button"
                  onClick={() => setRouteOrder('madinah_first')}
                  className={`p-2.5 rounded-2xl border text-left cursor-pointer transition-all duration-300 select-none relative overflow-hidden flex flex-col justify-between h-[68px] ${
                    routeOrder === 'madinah_first'
                      ? 'order-1 border-amber-600 bg-gradient-to-br from-amber-50 via-yellow-50/70 to-amber-50/90 text-amber-950 ring-2 ring-amber-600/30 shadow-xs font-black animate-swap-front'
                      : 'order-2 border-slate-200/90 bg-white hover:border-amber-300 text-slate-600 hover:bg-slate-50 opacity-75 hover:opacity-100 animate-swap-back'
                  }`}
                >
                  <div className="flex items-center justify-between w-full gap-1.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <img src="/medine.png" alt="Medine" className="h-4 w-4 object-contain shrink-0" />
                      <span className="text-xs font-bold truncate">Önce Medine</span>
                    </div>
                    {routeOrder === 'madinah_first' ? (
                      <span className="px-1.5 py-0.5 rounded-md bg-amber-700 text-white text-[9px] font-black uppercase tracking-wider shrink-0 shadow-3xs">
                        1. Durak
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-500 text-[9px] font-bold shrink-0">
                        2. Durak
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between w-full pt-1 border-t border-slate-200/50 text-[10px]">
                    <span className="text-slate-400 font-semibold truncate">Medine ➔ Mekke</span>
                    {routeOrder === 'madinah_first' && (
                      <Check className="h-3.5 w-3.5 text-amber-600 stroke-[3] shrink-0" />
                    )}
                  </div>
                </button>
              </div>
            </div>

          </div>

          {/* Mekke & Medine Kalış Süresi Ayar Kartları (Seçilen Rotaya Göre Öncelikli Sıralanır) */}
          <div className="space-y-2 pt-1 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Bed className="h-3.5 w-3.5 text-emerald-600" />
                <span>Şehirlerde Gece Kalış Süreleri Dağılımı *</span>
              </label>
              <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200">
                Toplam {Number(makkahDays) + Number(madinahDays)} Gece
              </span>
            </div>

            <div className="flex flex-col md:flex-row gap-3 transition-all duration-500 ease-out">
              {/* Mekke Kalış Kartı */}
              <div className={`flex-1 flex items-center justify-between p-3.5 sm:p-4 rounded-2xl border-2 border-emerald-300/90 bg-gradient-to-br from-emerald-50 via-teal-50/50 to-white shadow-xs hover:border-emerald-500 transition-all ${
                routeOrder === 'makkah_first' ? 'order-1' : 'order-2'
              }`}>
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <img src="/mekke.png" alt="Mekke" className="h-4 w-4 object-contain opacity-80 shrink-0" />
                    <h4 className="text-xs sm:text-sm font-black text-emerald-950 font-display flex items-center gap-1.5">
                      <span>Mekke Kalış Süresi</span>
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200">
                        {routeOrder === 'makkah_first' ? '1. Durak' : '2. Durak'}
                      </span>
                    </h4>
                  </div>
                  <div className="text-[11px] font-bold text-slate-500 pl-6">
                    {makkahDays === 0 ? 'Konaklama Yok' : `${makkahDays} Gece Mekke Oteli`}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-xl border border-emerald-200 shadow-3xs">
                  <button
                    type="button"
                    onClick={() => setMakkahDays(Math.max(0, makkahDays - 1))}
                    className="h-7 w-7 rounded-lg bg-slate-100 hover:bg-slate-200 active:scale-90 text-slate-700 font-bold flex items-center justify-center cursor-pointer transition-all spring-pill"
                    title="1 Gece Azalt"
                  >
                    <Minus className="h-3.5 w-3.5 stroke-[3]" />
                  </button>
                  <div className="min-w-[34px] text-center">
                    <span className="font-mono font-black text-base text-emerald-950 block leading-none">
                      {makkahDays}
                    </span>
                    <span className="text-[8px] font-bold text-slate-400 uppercase">Gece</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setMakkahDays(Math.min(30, makkahDays + 1))}
                    className="h-7 w-7 rounded-lg bg-emerald-700 hover:bg-emerald-600 active:scale-90 text-white font-bold flex items-center justify-center cursor-pointer transition-all spring-pill shadow-xs shadow-emerald-800/30"
                    title="1 Gece Artır"
                  >
                    <Plus className="h-3.5 w-3.5 stroke-[3]" />
                  </button>
                </div>
              </div>

              {/* Medine Kalış Kartı */}
              <div className={`flex-1 flex items-center justify-between p-3.5 sm:p-4 rounded-2xl border-2 border-amber-300/90 bg-gradient-to-br from-amber-50 via-orange-50/50 to-white shadow-xs hover:border-amber-500 transition-all ${
                routeOrder === 'madinah_first' ? 'order-1' : 'order-2'
              }`}>
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <img src="/medine.png" alt="Medine" className="h-4 w-4 object-contain opacity-80 shrink-0" />
                    <h4 className="text-xs sm:text-sm font-black text-amber-950 font-display flex items-center gap-1.5">
                      <span>Medine Kalış Süresi</span>
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-amber-100 text-amber-800 border border-amber-200">
                        {routeOrder === 'madinah_first' ? '1. Durak' : '2. Durak'}
                      </span>
                    </h4>
                  </div>
                  <div className="text-[11px] font-bold text-slate-500 pl-6">
                    {madinahDays === 0 ? 'Konaklama Yok' : `${madinahDays} Gece Medine Oteli`}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-xl border border-amber-200 shadow-3xs">
                  <button
                    type="button"
                    onClick={() => setMadinahDays(Math.max(0, madinahDays - 1))}
                    className="h-7 w-7 rounded-lg bg-slate-100 hover:bg-slate-200 active:scale-90 text-slate-700 font-bold flex items-center justify-center cursor-pointer transition-all spring-pill"
                    title="1 Gece Azalt"
                  >
                    <Minus className="h-3.5 w-3.5 stroke-[3]" />
                  </button>
                  <div className="min-w-[34px] text-center">
                    <span className="font-mono font-black text-base text-amber-950 block leading-none">
                      {madinahDays}
                    </span>
                    <span className="text-[8px] font-bold text-slate-400 uppercase">Gece</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setMadinahDays(Math.min(30, madinahDays + 1))}
                    className="h-7 w-7 rounded-lg bg-amber-700 hover:bg-amber-600 active:scale-90 text-white font-bold flex items-center justify-center cursor-pointer transition-all spring-pill shadow-xs shadow-amber-800/30"
                    title="1 Gece Artır"
                  >
                    <Plus className="h-3.5 w-3.5 stroke-[3]" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Otonom Hesaplanmış Program Akış Özeti - Taşmayan & Responsive Şık Şerit */}
          {routeSchedule && (
            <div className="p-3 bg-gradient-to-r from-slate-50 via-emerald-50/40 to-slate-50 rounded-2xl border border-slate-200/90 flex flex-col md:flex-row items-start md:items-center justify-between gap-2.5 text-xs select-none animate-fade-scale">
              <div className="flex items-center gap-2 flex-wrap min-w-0">
                <span className="font-extrabold text-slate-800 flex items-center gap-1.5 shrink-0">
                  <span>Program Akışı:</span>
                </span>
                
                {/* 1. Durak Rozeti */}
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white border border-slate-200 shadow-3xs font-bold text-slate-800 text-[11px]">
                  <img 
                    src={routeSchedule.firstCity === 'Mekke' ? '/mekke.png' : '/medine.png'} 
                    alt={routeSchedule.firstCity} 
                    className="h-3.5 w-3.5 object-contain shrink-0" 
                  />
                  <span>1. {routeSchedule.firstCity} ({formatDateTR(routeSchedule.firstStart)} - {formatDateTR(routeSchedule.firstEnd)} • {routeSchedule.firstDays} Gece)</span>
                </div>

                <span className="text-slate-400 font-black shrink-0">➔</span>

                {/* 2. Durak Rozeti */}
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white border border-slate-200 shadow-3xs font-bold text-slate-800 text-[11px]">
                  <img 
                    src={routeSchedule.secondCity === 'Mekke' ? '/mekke.png' : '/medine.png'} 
                    alt={routeSchedule.secondCity} 
                    className="h-3.5 w-3.5 object-contain shrink-0" 
                  />
                  <span>2. {routeSchedule.secondCity} ({formatDateTR(routeSchedule.secondStart)} - {formatDateTR(routeSchedule.secondEnd)} • {routeSchedule.secondDays} Gece)</span>
                </div>
              </div>

              <div className="shrink-0 font-bold text-emerald-900 bg-emerald-100/90 px-3 py-1.5 rounded-xl border border-emerald-300 shadow-3xs flex items-center gap-1.5 self-start md:self-auto">
                <Moon className="h-3.5 w-3.5 text-emerald-700" />
                <span>Toplam {routeSchedule.totalNights + 1} Gün • {routeSchedule.totalNights} Gece</span>
              </div>
            </div>
          )}
        </div>

        {/* Step 2: Umre Paketi & Otel Seçimi (Veri Merkezi Formatında Paket Butonları ve Otel Seçenekleri) */}
        <div id="step-2" className={`pearl-card rounded-2xl p-5 sm:p-6 space-y-5 shadow-2xs border transition-all duration-300 bg-white scroll-mt-6 ${
          !selectedPkgId ? 'border-amber-300 ring-2 ring-amber-400/20' : 'border-slate-200/90'
        }`}>
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2.5">
              <h3 className="text-sm font-bold text-slate-900 font-display flex items-center gap-1.5">
                <Layers className="h-4 w-4 text-emerald-600" />
                <span>Umre Paketi & Otel Seçimi</span>
              </h3>
            </div>
            <div className="flex items-center gap-2">
              {selectedPkgId ? (
                <span className="text-[11px] text-emerald-800 font-bold bg-emerald-100/90 px-2.5 py-0.5 rounded-full border border-emerald-300 flex items-center gap-1 animate-scale-in">
                  <Check className="h-3 w-3 stroke-[3]" />
                  <span>{activePackage?.name || 'Paket Seçildi'}</span>
                </span>
              ) : (
                <span className="text-[11px] text-rose-700 font-black bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200 animate-pulse">
                  * Seçim Zorunlu
                </span>
              )}
            </div>
          </div>

          {/* 1. Paket Seçim Butonları (Apple-Pill Full-Width Ribbon - Veri Giriş Merkezi ile Birebir Aynı) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <span>Paket Tercihi *</span>
              </label>
              <span className="text-[10px] text-slate-400 font-semibold italic">
                Paket değişince tercihleriniz korunarak anlık fiyat farkı hesaplanır
              </span>
            </div>

            <div className="w-full flex items-center justify-center">
              <div className="w-full p-1.5 bg-slate-100/90 rounded-full border border-slate-200/90 shadow-sm backdrop-blur-md flex items-center gap-2 select-none">
                {sortedPackages.map((pkg) => {
                  const isSelected = selectedPkgId === pkg.id;
                  return (
                    <button
                      key={pkg.id}
                      type="button"
                      onClick={() => setSelectedPkgId(pkg.id)}
                      className={`flex-1 flex items-center justify-center py-2.5 sm:py-3 px-3 sm:px-6 rounded-full text-xs sm:text-sm font-black spring-pill transition-all cursor-pointer select-none ${
                        isSelected
                          ? 'bg-gradient-to-r from-emerald-700 to-emerald-800 text-white shadow-md shadow-emerald-800/30 border border-emerald-600/40 scale-101 ring-2 ring-emerald-600/20'
                          : 'text-slate-600 hover:text-slate-950 hover:bg-white/80'
                      }`}
                    >
                      <span className="whitespace-nowrap truncate">{pkg.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 2. Seçilen Paketin Otelleri & Ayrı Ayrı Mekke / Medine Yemek Tercihleri */}
          <div className="space-y-4 pt-1 border-t border-slate-100">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              
              {/* Mekke Otel(ler)i & Mekke Yemek Tercihi Bölümü */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-50/50 via-teal-50/20 to-white border border-emerald-200/80 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-emerald-950 flex items-center gap-1.5">
                    <img src="/mekke.png" alt="Mekke" className="h-4 w-4 object-contain" />
                    <span>Mekke Otel Seçimi</span>
                  </span>
                  <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-200">
                    Mekke-i Mükerreme
                  </span>
                </div>

                {/* Mekke Otel Alternatifleri */}
                <div className="space-y-2">
                  {(activePackage?.makkahHotels && activePackage.makkahHotels.length > 0) ? (
                    activePackage.makkahHotels.map((h) => {
                      const isHotelSel = selectedMakkahHotelId === h.id || (!selectedMakkahHotelId && h.id === activePackage.makkahHotels[0].id);
                      return (
                        <div
                          key={h.id}
                          onClick={() => setSelectedMakkahHotelId(h.id)}
                          className={`p-3 rounded-xl border transition-all cursor-pointer select-none flex items-start justify-between gap-2.5 ${
                            isHotelSel
                              ? 'bg-white border-emerald-600 ring-2 ring-emerald-500/20 shadow-xs'
                              : 'bg-white/80 border-slate-200 hover:border-emerald-300'
                          }`}
                        >
                          <div className="space-y-1 min-w-0">
                            <div className="text-xs font-black text-slate-900 leading-tight truncate">
                              {h.name}
                            </div>
                            <div className="flex items-center gap-2 text-[11px] text-slate-500 flex-wrap">
                              <span className="flex items-center gap-1 text-emerald-800 font-semibold">
                                <MapPin className="h-3 w-3 text-emerald-600 shrink-0" />
                                <span>{h.distance || 'Harem Yakını'}</span>
                              </span>
                              {h.mealType && (
                                <span className="text-slate-400">• {h.mealType}</span>
                              )}
                            </div>
                          </div>

                          <div className={`h-5 w-5 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${
                            isHotelSel ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-slate-300 bg-white'
                          }`}>
                            {isHotelSel && <Check className="h-3 w-3 stroke-[3]" />}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="p-3 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-800">
                      {activePackage?.hotelMakkah || 'Paket Mekke Oteli'}
                      <div className="text-[11px] text-slate-500 font-normal mt-0.5">
                        {activePackage?.distanceMakkah || 'Harem Yakını'}
                      </div>
                    </div>
                  )}
                </div>

                {/* 🕋 Mekke Yemek Switch'i */}
                <div className="pt-2 border-t border-emerald-200/60 flex items-center justify-between gap-2">
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Utensils className="h-3.5 w-3.5 text-emerald-700" />
                      <span>Mekke Yemek Hizmeti:</span>
                    </span>
                    <span className="text-[10px] text-slate-500 font-medium block">
                      {includeMakkahMeals ? 'Sabah-Akşam Yemek Dahil' : 'Yemeksiz (Sadece Konaklama)'}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 p-0.5 bg-white border border-slate-300 rounded-full shadow-3xs shrink-0">
                    <button
                      type="button"
                      onClick={() => setIncludeMakkahMeals(true)}
                      className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer spring-pill flex items-center gap-1 ${
                        includeMakkahMeals
                          ? 'bg-emerald-700 text-white shadow-xs'
                          : 'text-slate-500 hover:text-slate-900'
                      }`}
                    >
                      <Check className="h-3 w-3 stroke-[3]" />
                      <span>Dahil</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setIncludeMakkahMeals(false)}
                      className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer spring-pill ${
                        !includeMakkahMeals
                          ? 'bg-rose-600 text-white shadow-xs'
                          : 'text-slate-500 hover:text-slate-900'
                      }`}
                    >
                      Yemeksiz
                    </button>
                  </div>
                </div>
              </div>

              {/* Medine Otel(ler)i & Medine Yemek Tercihi Bölümü */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-50/50 via-yellow-50/20 to-white border border-amber-200/80 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-amber-950 flex items-center gap-1.5">
                    <img src="/medine.png" alt="Medine" className="h-4 w-4 object-contain" />
                    <span>Medine Otel Seçimi</span>
                  </span>
                  <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-200">
                    Medine-i Münevvere
                  </span>
                </div>

                {/* Medine Otel Alternatifleri */}
                <div className="space-y-2">
                  {(activePackage?.madinahHotels && activePackage.madinahHotels.length > 0) ? (
                    activePackage.madinahHotels.map((h) => {
                      const isHotelSel = selectedMadinahHotelId === h.id || (!selectedMadinahHotelId && h.id === activePackage.madinahHotels[0].id);
                      return (
                        <div
                          key={h.id}
                          onClick={() => setSelectedMadinahHotelId(h.id)}
                          className={`p-3 rounded-xl border transition-all cursor-pointer select-none flex items-start justify-between gap-2.5 ${
                            isHotelSel
                              ? 'bg-white border-amber-600 ring-2 ring-amber-500/20 shadow-xs'
                              : 'bg-white/80 border-slate-200 hover:border-amber-300'
                          }`}
                        >
                          <div className="space-y-1 min-w-0">
                            <div className="text-xs font-black text-slate-900 leading-tight truncate">
                              {h.name}
                            </div>
                            <div className="flex items-center gap-2 text-[11px] text-slate-500 flex-wrap">
                              <span className="flex items-center gap-1 text-amber-800 font-semibold">
                                <MapPin className="h-3 w-3 text-amber-600 shrink-0" />
                                <span>{h.distance || 'Mescid-i Nebevi Yakını'}</span>
                              </span>
                              {h.mealType && (
                                <span className="text-slate-400">• {h.mealType}</span>
                              )}
                            </div>
                          </div>

                          <div className={`h-5 w-5 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${
                            isHotelSel ? 'bg-amber-600 border-amber-600 text-white' : 'border-slate-300 bg-white'
                          }`}>
                            {isHotelSel && <Check className="h-3 w-3 stroke-[3]" />}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="p-3 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-800">
                      {activePackage?.hotelMadinah || 'Paket Medine Oteli'}
                      <div className="text-[11px] text-slate-500 font-normal mt-0.5">
                        {activePackage?.distanceMadinah || 'Mescid-i Nebevi Yakını'}
                      </div>
                    </div>
                  )}
                </div>

                {/* 🕌 Medine Yemek Switch'i */}
                <div className="pt-2 border-t border-amber-200/60 flex items-center justify-between gap-2">
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Utensils className="h-3.5 w-3.5 text-amber-700" />
                      <span>Medine Yemek Hizmeti:</span>
                    </span>
                    <span className="text-[10px] text-slate-500 font-medium block">
                      {includeMadinahMeals ? 'Sabah-Akşam Yemek Dahil' : 'Yemeksiz (Sadece Konaklama)'}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 p-0.5 bg-white border border-slate-300 rounded-full shadow-3xs shrink-0">
                    <button
                      type="button"
                      onClick={() => setIncludeMadinahMeals(true)}
                      className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer spring-pill flex items-center gap-1 ${
                        includeMadinahMeals
                          ? 'bg-amber-700 text-white shadow-xs'
                          : 'text-slate-500 hover:text-slate-900'
                      }`}
                    >
                      <Check className="h-3 w-3 stroke-[3]" />
                      <span>Dahil</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setIncludeMadinahMeals(false)}
                      className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer spring-pill ${
                        !includeMadinahMeals
                          ? 'bg-rose-600 text-white shadow-xs'
                          : 'text-slate-500 hover:text-slate-900'
                      }`}
                    >
                      Yemeksiz
                    </button>
                  </div>
                </div>
              </div>

            </div>

            {/* Fiyat Tarifesi Belirlenmemiş Uyarısı */}
            {(currentQuotation?.isUnpriced || currentQuotation?.hasValidTariff === false) && (
              <div className="mt-3 p-4 rounded-2xl bg-gradient-to-r from-amber-50 via-orange-50/50 to-amber-50 border-2 border-amber-300 shadow-3xs flex items-start gap-3 animate-fade-scale text-amber-950">
                <div className="p-2 rounded-xl bg-amber-200/80 text-amber-900 shrink-0 mt-0.5">
                  <Info className="h-4 w-4" />
                </div>
                <div className="space-y-0.5 text-xs">
                  <h4 className="font-black text-amber-900 font-display">
                    ⚠️ Genel Merkez Fiyat Belirlememiştir
                  </h4>
                  <p className="text-amber-800 font-medium">
                    {currentQuotation?.tariffWarning || 'Seçtiğiniz tarih aralığı için Genel Merkez tarafından otel fiyat tarifesi girilmemiştir. Lütfen Genel Merkez ile iletişime geçiniz.'}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Step 3: Konaklama & Oda Tercihi */}
        <div id="step-3" className={`pearl-card rounded-2xl p-5 sm:p-7 space-y-4 shadow-2xs border transition-all duration-300 bg-white scroll-mt-6 ${
          (!isMixedRoomMode && (!makkahOccupancy || makkahOccupancy <= 0))
            ? 'border-amber-300 ring-2 ring-amber-400/20'
            : 'border-slate-200/90'
        }`}>
          <div className="flex flex-wrap items-center justify-between border-b border-slate-100 pb-3 gap-2">
            <div className="flex items-center gap-2.5">
              <h3 className="text-sm font-bold text-slate-900 font-display flex items-center gap-1.5">
                <Bed className="h-4 w-4 text-emerald-600" />
                <span>Konaklama & Oda Tercihi</span>
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-emerald-900 bg-emerald-100/90 px-3 py-1 rounded-full border border-emerald-300 shadow-2xs flex items-center gap-1 animate-scale-in">
                <Check className="h-3 w-3 stroke-[3]" />
                <span>{isMixedRoomMode ? 'Karma Çoklu Oda Seçili' : `${makkahOccupancy} Kişilik Oda Seçili`}</span>
              </span>
            </div>
          </div>

          {/* Saf Otel Oda Tipleri Karşılaştırma & Karma Dağılım Tablosu (Birim Fiyatlar Gizli) */}
          <RoomComparisonTable
            matrix={roomMatrix}
            selectedOccupancy={makkahOccupancy}
            onSelectOccupancy={(occ) => {
              setMakkahOccupancy(occ);
              setMadinahOccupancy(occ);
              setPaxCount(occ);
              setTransfersSelection(prev => {
                const next = { ...prev };
                ['jedMek', 'mekMed', 'medAir'].forEach(r => {
                  if (next[r]) {
                    next[r] = {
                      ...next[r],
                      passengerCount: occ
                    };
                  }
                });
                return next;
              });
            }}
            currency={activeCurrency}
            isMixedRoomMode={isMixedRoomMode}
            onToggleMixedMode={(enabled) => {
              setIsMixedRoomMode(enabled);
              if (enabled) {
                const totalP = (mixedRooms.single * 1) + (mixedRooms.double * 2) + (mixedRooms.triple * 3) + (mixedRooms.quad * 4);
                const count = totalP > 0 ? totalP : 1;
                setPaxCount(count);
                setTransfersSelection(prev => {
                  const next = { ...prev };
                  ['jedMek', 'mekMed', 'medAir'].forEach(r => {
                    if (next[r]) {
                      next[r] = { ...next[r], passengerCount: count };
                    }
                  });
                  return next;
                });
              } else {
                const occ = makkahOccupancy || 2;
                setPaxCount(occ);
                setTransfersSelection(prev => {
                  const next = { ...prev };
                  ['jedMek', 'mekMed', 'medAir'].forEach(r => {
                    if (next[r]) {
                      next[r] = { ...next[r], passengerCount: occ };
                    }
                  });
                  return next;
                });
              }
            }}
            mixedRooms={mixedRooms}
            onChangeMixedRoom={(key, val) => {
              const updated = { ...mixedRooms, [key]: val };
              setMixedRooms(updated);
              const totalP = (updated.single * 1) + (updated.double * 2) + (updated.triple * 3) + (updated.quad * 4);
              if (totalP > 0) {
                setPaxCount(totalP);
                setTransfersSelection(prev => {
                  const next = { ...prev };
                  ['jedMek', 'mekMed', 'medAir'].forEach(r => {
                    if (next[r]) {
                      next[r] = {
                        ...next[r],
                        passengerCount: totalP
                      };
                    }
                  });
                  return next;
                });
              }
            }}
            mixedRoomsBreakdown={rawQuotation?.mixedRoomsBreakdown}
            mixedRoomsSummary={rawQuotation?.mixedRoomsSummary}
          />
        </div>

        {/* Step 4: Transfer & Ulaşım */}
        {(() => {
          const isStep4Done = ['jedMek', 'mekMed', 'medAir'].every(r => transfersSelection[r]?.vehicleType);
          return (
            <div id="step-4" className={`pearl-card rounded-2xl p-5 sm:p-6 space-y-4 shadow-2xs border transition-all duration-300 bg-white scroll-mt-6 ${
              !isStep4Done ? 'border-amber-300 ring-2 ring-amber-400/20' : 'border-slate-200/90'
            }`}>
              <div className="flex flex-wrap items-center justify-between border-b border-slate-100 pb-3 gap-2">
                <div className="flex items-center gap-2.5">
                  <h3 className="text-sm font-bold text-slate-900 font-display flex items-center gap-1.5">
                    <Bus className="h-4 w-4 text-sky-600" />
                    <span>Transfer & Ulaşım Güzergahları</span>
                  </h3>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {isStep4Done ? (
                    <span className="text-[11px] text-emerald-800 font-bold bg-emerald-100/90 px-2.5 py-0.5 rounded-full border border-emerald-300 flex items-center gap-1 animate-scale-in">
                      <Check className="h-3 w-3 stroke-[3]" />
                      <span>Ulaşım Belirlendi</span>
                    </span>
                  ) : (
                    <span className="text-[11px] text-rose-700 font-black bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200 animate-pulse">
                      * Seçim Zorunlu
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setTransfersSelection({
                        jedMek: { vehicleType: 'none', passengerCount: 0 },
                        mekMed: { vehicleType: 'none', passengerCount: 0 },
                        medAir: { vehicleType: 'none', passengerCount: 0 },
                      });
                    }}
                    className="px-3 py-1 rounded-full bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-600 border border-slate-200 text-xs font-bold transition-all cursor-pointer spring-pill"
                  >
                    Tümünü Kaldır (Yok)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const totalMixedPax = (mixedRooms?.single || 0) * 1 + (mixedRooms?.double || 0) * 2 + (mixedRooms?.triple || 0) * 3 + (mixedRooms?.quad || 0) * 4;
                      const effectiveGroupPax = isMixedRoomMode 
                        ? (totalMixedPax > 0 ? totalMixedPax : paxCount || 1)
                        : (makkahOccupancy || paxCount || 2);
                      setTransfersSelection({
                        jedMek: { vehicleType: 'small', passengerCount: effectiveGroupPax },
                        mekMed: { vehicleType: 'small', passengerCount: effectiveGroupPax },
                        medAir: { vehicleType: 'small', passengerCount: effectiveGroupPax },
                      });
                    }}
                    className="px-3 py-1 rounded-full bg-sky-50 hover:bg-sky-100 text-sky-900 border border-sky-200 text-xs font-bold transition-all cursor-pointer spring-pill"
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
                      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 min-w-0">
                        
                        {/* 1. Sol: Güzergah Adı ve İkonu */}
                        <div className="flex items-center gap-2.5 font-bold text-xs text-slate-900 xl:w-52 shrink-0 min-w-0">
                          <div className={`h-8 w-8 rounded-xl flex items-center justify-center shrink-0 ${
                            sel.vehicleType === 'none' ? 'bg-slate-100 text-slate-400' : 'bg-sky-100 text-sky-700 shadow-3xs'
                          }`}>
                            <Car className="h-4 w-4 shrink-0" />
                          </div>
                          <div className="min-w-0">
                            <span className="font-extrabold text-slate-900 block leading-tight truncate">{route.label}</span>
                            <span className="text-[10px] text-slate-400 font-semibold block">Özel Transfer Rotası</span>
                          </div>
                        </div>

                        {/* 2. Orta & Sağ: Araç Seçim Butonları + Kişi Sayacı & Formül Kutusu */}
                        <div className="flex flex-wrap items-center gap-2.5 justify-start xl:justify-end flex-1 min-w-0">
                          {/* Araç Seçim Butonları */}
                          <div className="flex items-center gap-1 p-1 bg-slate-100/90 border border-slate-200/80 rounded-full select-none shrink-0">
                            {/* Küçük Araç Button */}
                            <button
                              type="button"
                              onClick={() => handleTransferChange(route.id, 'vehicleType', 'small')}
                              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all duration-200 cursor-pointer spring-pill ${
                                sel.vehicleType === 'small'
                                  ? 'bg-gradient-to-r from-sky-600 to-sky-700 text-white shadow-xs shadow-sky-600/30'
                                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                              }`}
                            >
                              {activePackage?.transfers?.[`${route.id}SmallLabel`] || 'Küçük Araç'}
                            </button>

                            {/* Büyük Araç Button */}
                            <button
                              type="button"
                              onClick={() => handleTransferChange(route.id, 'vehicleType', 'big')}
                              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all duration-200 cursor-pointer spring-pill ${
                                sel.vehicleType === 'big'
                                  ? 'bg-gradient-to-r from-emerald-700 to-emerald-800 text-white shadow-xs shadow-emerald-800/30'
                                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                              }`}
                            >
                              {activePackage?.transfers?.[`${route.id}BigLabel`] || 'Büyük Araç'}
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

                          {/* Kişi Sayacı & Formül Kutusu */}
                          {sel.vehicleType !== 'none' ? (
                            <div className="flex items-center gap-2 flex-wrap min-w-0">
                              <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-full border border-slate-200 shadow-3xs shrink-0">
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

                              {/* Araç Durumu Rozeti (Fiyatsız) */}
                              <span className="text-[11px] font-bold text-sky-900 bg-sky-50 px-2.5 py-1 rounded-xl border border-sky-200 shadow-3xs inline-flex items-center gap-1">
                                <Check className="h-3 w-3 stroke-[3]" />
                                <span>{sel.vehicleType === 'small' ? 'Küçük Araç Seçildi' : 'Büyük Araç Seçildi'}</span>
                              </span>
                            </div>
                          ) : (
                            <span className="text-[11px] font-semibold text-slate-400 bg-slate-100/80 px-3 py-1 rounded-full border border-slate-200/60 select-none">
                              Transfer Yok
                            </span>
                          )}
                        </div>

                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {/* Step 5: Sabit & Ek Giderler Checklist (İSTEĞE BAĞLI / OPSİYONEL) */}
        <div id="step-5" className="pearl-card rounded-2xl p-5 sm:p-6 space-y-4 shadow-2xs border border-slate-200/90 bg-white scroll-mt-6">
          <div className="flex flex-wrap items-center justify-between border-b border-slate-100 pb-3 gap-2">
            <div className="flex items-center gap-2.5">
              <h3 className="text-sm font-bold text-slate-900 font-display flex items-center gap-1.5">
                <Coins className="h-4 w-4 text-emerald-600" />
                <span>Sabit & Operasyonel Giderler Havuzu</span>
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-medium">Opsiyonel Hizmet Kalemleri</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {((Array.isArray(activePackage?.fixedExpensesList) && activePackage.fixedExpensesList.length > 0)
              ? activePackage.fixedExpensesList.filter(item => item.isVisible !== false)
              : FIXED_EXPENSES_INFO.map(f => ({
                  id: f.key,
                  name: f.label,
                  desc: f.desc,
                  priceSAR: activePackage?.fixedExpenses?.[f.key] !== undefined ? activePackage.fixedExpenses[f.key] : 0,
                  isVisible: true
                }))
            ).map((item) => {
              const expKey = item.id || item.key;
              const isIncluded = !!fixedExpensesIncluded[expKey];

              return (
                <div
                  key={expKey}
                  onClick={() => toggleFixedExpense(expKey)}
                  className={`p-3 rounded-xl border transition-all duration-200 cursor-pointer flex items-center justify-between select-none ${
                    isIncluded
                      ? 'bg-emerald-50/90 border-emerald-500/80 shadow-3xs'
                      : 'bg-white border-slate-200/80 opacity-60 hover:opacity-100 hover:border-slate-300'
                  }`}
                >
                  <div className="space-y-0.5 pr-2">
                    <span className="text-xs font-bold text-slate-900 block">{item.name || item.label}</span>
                    <span className="text-[10px] text-slate-400 line-clamp-1">{item.desc}</span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <div className={`flex h-5 w-5 items-center justify-center rounded-md border transition-colors ${
                      isIncluded ? 'bg-emerald-600 border-emerald-600 text-white shadow-2xs' : 'border-slate-300 bg-white'
                    }`}>
                      {isIncluded && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Step 6: Teklif Özel Notları (İsteğe Bağlı) */}
        <div id="step-6" className="pearl-card rounded-2xl p-5 space-y-3 shadow-2xs border border-slate-200/90 bg-white scroll-mt-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <div className="flex items-center gap-2.5">
              <h3 className="text-sm font-bold text-slate-900 font-display flex items-center gap-1.5">
                <MessageSquare className="h-4 w-4 text-emerald-600" />
                <span>Teklif Özel Notları & Ek Açıklamalar</span>
              </h3>
            </div>
            <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">İsteğe Bağlı • Mektup ve PDF'e Eklenir</span>
          </div>

          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Misafir için özel istekler, vize/pasaport notları, rehberlik veya transfer detayları (isteğe bağlı)..."
            className="w-full rounded-xl border border-slate-300 bg-slate-50 focus:bg-white px-3.5 py-2.5 text-xs text-slate-900 focus:border-emerald-600 focus:outline-none shadow-3xs resize-none transition-all"
          />
        </div>
      </div>

      {/* Right 4/5 Columns: Slightly Wider Fixed Full-Height Receipt Panel */}
      <div className="lg:col-span-5 xl:col-span-4 min-w-0 lg:sticky lg:top-4 lg:h-[calc(100vh-2rem)] flex flex-col justify-start">
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
