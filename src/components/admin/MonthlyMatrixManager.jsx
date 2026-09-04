import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useData } from '../../context/DataContext';
import { useModal } from '../../context/ModalContext';
import CustomSelect from '../common/CustomSelect';
import CustomDateRangePicker, { formatDateTR, calculateNights } from '../common/CustomDateRangePicker';
import { 
  Calendar, 
  Bed, 
  Bus, 
  Coins, 
  TrendingUp, 
  Save, 
  CheckCircle2, 
  Plus, 
  Trash2, 
  Edit3, 
  Car, 
  Building2, 
  Sparkles,
  MapPin,
  Utensils,
  X,
  AlertCircle,
  Check,
  ChevronDown,
  Moon
} from 'lucide-react';
import confetti from 'canvas-confetti';

const DEFAULT_FIXED_EXPENSES = [
  { id: 'flightTicketSAR', name: 'Uçak Bileti', desc: 'Gidiş-Dönüş Tarifeli/Charter Uçuş Bedeli', priceSAR: 1500, isVisible: true },
  { id: 'visaTaxSAR', name: 'Vize + Vergi', desc: 'Suudi Arabistan Elektronik Umre Vizesi ve Harçlar', priceSAR: 500, isVisible: true },
  { id: 'insuranceSAR', name: 'Sigorta', desc: 'Kapsamlı Yurt Dışı Seyahat ve Sağlık Sigortası', priceSAR: 125, isVisible: true },
  { id: 'bagSAR', name: 'Çanta', desc: 'Kurumsal Hac & Umre Valiz / Çanta Seti', priceSAR: 25, isVisible: true },
  { id: 'scarfSAR', name: 'Fular / Eşarp', desc: 'Grup Tanıtım ve Rehberlik Fuları/Eşarbı', priceSAR: 15, isVisible: true },
  { id: 'guideSAR', name: 'Fri / Görevli', desc: 'Diyanet / Rehber Hoca ve Görevli Operasyon Payı', priceSAR: 45, isVisible: true },
  { id: 'commissionSAR', name: 'Komisyon', desc: 'Acente & Temsilci Satış Komisyon Havuzu', priceSAR: 50, isVisible: true },
  { id: 'bonusSAR', name: 'Prim', desc: 'Operasyon ve Satış Ekibi Başarı Primi', priceSAR: 25, isVisible: true },
  { id: 'zamzamSAR', name: 'Zemzem', desc: '5 Litre Orijinal Ambalajlı Diyanet/Kudret Zemzemi', priceSAR: 125, isVisible: true },
  { id: 'branchExpenseSAR', name: 'Şube Giderleri', desc: 'Şube ve İdari Genel Gider Payı', priceSAR: 0, isVisible: false },
];

const MEAL_OPTIONS = [
  { value: 'Açık Büfe', label: 'Açık Büfe (Sabah & Akşam)' },
  { value: 'Tabldot', label: 'Tabldot (Sabah & Akşam)' }
];

// Helper: Migrate / normalize a package to ensure makkahHotels, madinahHotels and fixedExpensesList exist
function normalizePackageHotels(pkg) {
  if (!pkg) return pkg;
  const normalized = { ...pkg };

  // Ensure makkahHotels array
  if (!Array.isArray(normalized.makkahHotels) || normalized.makkahHotels.length === 0) {
    normalized.makkahHotels = [
      {
        id: `${normalized.id}_makkah_1`,
        name: normalized.hotelMakkah || 'Mekke Standart Otel',
        distance: normalized.distanceMakkah || '1000m (Servisli)',
        mealType: normalized.mealMakkah?.includes('Tabldot') ? 'Tabldot' : 'Açık Büfe',
        dateRanges: [
          {
            id: `dr_makkah_1`,
            startDate: '2026-10-01',
            endDate: '2026-10-15',
            nights: 14,
            roomPriceSAR: 100,
            foodPriceSAR: 35
          }
        ]
      }
    ];
  } else {
    normalized.makkahHotels = normalized.makkahHotels.map(h => ({
      ...h,
      dateRanges: Array.isArray(h.dateRanges) ? h.dateRanges : []
    }));
  }

  // Ensure madinahHotels array
  if (!Array.isArray(normalized.madinahHotels) || normalized.madinahHotels.length === 0) {
    normalized.madinahHotels = [
      {
        id: `${normalized.id}_madinah_1`,
        name: normalized.hotelMadinah || 'Medine Standart Otel',
        distance: normalized.distanceMadinah || '350m (Yürüme)',
        mealType: normalized.mealMadinah?.includes('Tabldot') ? 'Tabldot' : 'Açık Büfe',
        dateRanges: [
          {
            id: `dr_madinah_1`,
            startDate: '2026-10-01',
            endDate: '2026-10-15',
            nights: 14,
            roomPriceSAR: 450,
            foodPriceSAR: 45
          }
        ]
      }
    ];
  } else {
    normalized.madinahHotels = normalized.madinahHotels.map(h => ({
      ...h,
      dateRanges: Array.isArray(h.dateRanges) ? h.dateRanges : []
    }));
  }

  // Ensure dynamic fixedExpensesList array
  if (!Array.isArray(normalized.fixedExpensesList) || normalized.fixedExpensesList.length === 0) {
    normalized.fixedExpensesList = DEFAULT_FIXED_EXPENSES.map(def => {
      const existingPrice = normalized.fixedExpenses?.[def.id];
      return {
        ...def,
        priceSAR: existingPrice !== undefined ? Number(existingPrice) : def.priceSAR
      };
    });
  }

  return normalized;
}

export default function MonthlyMatrixManager() {
  const { 
    packages, 
    currencies, 
    months, 
    updatePackage, 
    updateAllPackages,
    updateCurrencies, 
    updateMonths
  } = useData();
  const { showConfirm, showAlert } = useModal();

  const sortedPackages = useMemo(() => {
    const order = { 'ekonomik': 1, 'standart': 2, 'luxe': 3, 'vip': 3 };
    return [...packages].sort((a, b) => (order[a.id] || 99) - (order[b.id] || 99));
  }, [packages]);

  const [selectedPkgId, setSelectedPkgId] = useState(
    packages.find(p => p.id === 'ekonomik')?.id || packages[0]?.id || 'ekonomik'
  );

  // Initialize unified drafts for all packages
  const [allPkgsDraft, setAllPkgsDraft] = useState(() => {
    const drafts = {};
    (packages || []).forEach(p => {
      drafts[p.id] = normalizePackageHotels(p);
    });
    return drafts;
  });

  // Sync draft state whenever packages changes from outside/database
  useEffect(() => {
    if (packages && packages.length > 0) {
      setAllPkgsDraft(prev => {
        const next = { ...prev };
        packages.forEach(p => {
          next[p.id] = normalizePackageHotels(p);
        });
        return next;
      });
    }
  }, [packages]);

  const localPkg = allPkgsDraft[selectedPkgId] || normalizePackageHotels(packages.find(p => p.id === selectedPkgId) || packages[0]);

  const setLocalPkg = (updater) => {
    setAllPkgsDraft(prev => {
      const current = prev[selectedPkgId] || normalizePackageHotels(packages.find(p => p.id === selectedPkgId) || packages[0]);
      const nextPkg = typeof updater === 'function' ? updater(current) : updater;
      return {
        ...prev,
        [selectedPkgId]: nextPkg
      };
    });
  };

  const [localCurrencies, setLocalCurrencies] = useState({ ...currencies });
  const [viewCurrency, setViewCurrency] = useState('SAR'); // 'SAR' | 'USD' | 'TRY' | 'EUR'
  const [isSaved, setIsSaved] = useState(false);

  // 4 SECTIONS: 'makkah_hotels' | 'madinah_hotels' | 'transfers' | 'expenses'
  const [activeSection, setActiveSection] = useState('makkah_hotels');
  const [pkgSlideDirection, setPkgSlideDirection] = useState('right');
  const [tabSlideDirection, setTabSlideDirection] = useState('right');

  // Selected hotel state for Mekke and Medine
  const [selectedMakkahHotelId, setSelectedMakkahHotelId] = useState(() => localPkg.makkahHotels?.[0]?.id || '');
  const [selectedMadinahHotelId, setSelectedMadinahHotelId] = useState(() => localPkg.madinahHotels?.[0]?.id || '');

  // INLINE HOTEL FORM STATE (Otel Adı, Mesafe, Yemek Konsepti)
  const [inlineFormOpen, setInlineFormOpen] = useState(false);
  const [inlineFormMode, setInlineFormMode] = useState('add'); // 'add' | 'edit'
  const [inlineFormCity, setInlineFormCity] = useState('makkah'); // 'makkah' | 'madinah'
  const [inlineFormData, setInlineFormData] = useState({
    id: '',
    name: '',
    distance: '',
    mealType: 'Açık Büfe'
  });

  // NEW DATE RANGE ROW DRAFT STATE (Otel bazlı yeni aralık satırı taslağı)
  const [newRangeDraft, setNewRangeDraft] = useState({
    startDate: '',
    endDate: '',
    nights: 0,
    roomPriceSAR: '',
    foodPriceSAR: ''
  });

  // EDITING DATE RANGE ID STATE
  const [editingRangeId, setEditingRangeId] = useState(null);

  // NEW DYNAMIC FIXED EXPENSE (DAHİLİ HİZMET) FORM STATE
  const [expenseFormOpen, setExpenseFormOpen] = useState(false);
  const [newExpenseDraft, setNewExpenseDraft] = useState({
    name: '',
    desc: '',
    priceSAR: '',
    isVisible: true
  });

  const inlineFormRef = useRef(null);
  const expenseFormRef = useRef(null);

  // Keep selected hotel IDs synchronized when localPkg changes
  useEffect(() => {
    if (localPkg.makkahHotels?.length > 0) {
      if (!localPkg.makkahHotels.some(h => h.id === selectedMakkahHotelId)) {
        setSelectedMakkahHotelId(localPkg.makkahHotels[0].id);
      }
    }
    if (localPkg.madinahHotels?.length > 0) {
      if (!localPkg.madinahHotels.some(h => h.id === selectedMadinahHotelId)) {
        setSelectedMadinahHotelId(localPkg.madinahHotels[0].id);
      }
    }
  }, [localPkg, selectedMakkahHotelId, selectedMadinahHotelId]);

  // Switch package
  const handleSelectPackage = (pkgId) => {
    const pkgOrderMap = { 'ekonomik': 0, 'standart': 1, 'luxe': 2, 'vip': 2 };
    const currentIdx = pkgOrderMap[selectedPkgId] ?? 0;
    const targetIdx = pkgOrderMap[pkgId] ?? 0;

    if (targetIdx < currentIdx) {
      setPkgSlideDirection('left');
    } else if (targetIdx > currentIdx) {
      setPkgSlideDirection('right');
    }

    setSelectedPkgId(pkgId);
    const targetDraft = allPkgsDraft[pkgId] || normalizePackageHotels(packages.find(p => p.id === pkgId) || packages[0]);
    setSelectedMakkahHotelId(targetDraft.makkahHotels?.[0]?.id || '');
    setSelectedMadinahHotelId(targetDraft.madinahHotels?.[0]?.id || '');
    setInlineFormOpen(false);
    setNewRangeDraft({ startDate: '', endDate: '', nights: 0, roomPriceSAR: '', foodPriceSAR: '' });
    setEditingRangeId(null);
  };

  // Switch section (4 pills)
  const handleSelectSection = (sectionId) => {
    const sectionOrderMap = { 'makkah_hotels': 0, 'madinah_hotels': 1, 'transfers': 2, 'expenses': 3 };
    const currentIdx = sectionOrderMap[activeSection] ?? 0;
    const targetIdx = sectionOrderMap[sectionId] ?? 0;

    if (targetIdx < currentIdx) {
      setTabSlideDirection('left');
    } else if (targetIdx > currentIdx) {
      setTabSlideDirection('right');
    }
    setActiveSection(sectionId);
    setInlineFormOpen(false);
    setNewRangeDraft({ startDate: '', endDate: '', nights: 0, roomPriceSAR: '', foodPriceSAR: '' });
    setEditingRangeId(null);
  };

  // Active hotel getter
  const currentActiveMakkahHotel = useMemo(() => {
    return localPkg.makkahHotels?.find(h => h.id === selectedMakkahHotelId) || localPkg.makkahHotels?.[0] || null;
  }, [localPkg.makkahHotels, selectedMakkahHotelId]);

  const currentActiveMadinahHotel = useMemo(() => {
    return localPkg.madinahHotels?.find(h => h.id === selectedMadinahHotelId) || localPkg.madinahHotels?.[0] || null;
  }, [localPkg.madinahHotels, selectedMadinahHotelId]);

  // Open Inline Form for Adding a new Hotel
  const handleOpenInlineAdd = (city) => {
    setInlineFormCity(city);
    setInlineFormMode('add');
    setInlineFormData({
      id: `${localPkg.id}_${city}_${Date.now()}`,
      name: '',
      distance: city === 'makkah' ? '1000m (Ring Servis)' : '250m (Yürüme)',
      mealType: 'Açık Büfe'
    });
    setInlineFormOpen(true);
    setTimeout(() => {
      inlineFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 100);
  };

  // Open Inline Form for Editing an existing Hotel
  const handleOpenInlineEdit = (city, hotel) => {
    setInlineFormCity(city);
    setInlineFormMode('edit');
    setInlineFormData({
      id: hotel.id,
      name: hotel.name || '',
      distance: hotel.distance || '',
      mealType: hotel.mealType?.includes('Tabldot') ? 'Tabldot' : 'Açık Büfe'
    });
    setInlineFormOpen(true);
    setTimeout(() => {
      inlineFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 100);
  };

  // Save Inline Hotel Form (Add or Edit)
  const handleSaveInlineForm = (e) => {
    e.preventDefault();
    if (!inlineFormData.name.trim()) {
      showAlert({ title: 'Eksik Bilgi', message: 'Lütfen otel adını giriniz.', type: 'error' });
      return;
    }

    const listKey = inlineFormCity === 'makkah' ? 'makkahHotels' : 'madinahHotels';

    if (inlineFormMode === 'add') {
      const newHotel = {
        id: inlineFormData.id || `${localPkg.id}_${inlineFormCity}_${Date.now()}`,
        name: inlineFormData.name.trim(),
        distance: inlineFormData.distance.trim() || (inlineFormCity === 'makkah' ? '1000m Servisli' : '300m Yürüme'),
        mealType: inlineFormData.mealType,
        dateRanges: [] // Clean empty date ranges awaiting user entries!
      };

      setLocalPkg(prev => ({
        ...prev,
        [listKey]: [...(prev[listKey] || []), newHotel]
      }));

      if (inlineFormCity === 'makkah') setSelectedMakkahHotelId(newHotel.id);
      else setSelectedMadinahHotelId(newHotel.id);

      confetti({
        particleCount: 40,
        spread: 50,
        origin: { y: 0.6 }
      });

    } else {
      setLocalPkg(prev => {
        const updatedHotels = (prev[listKey] || []).map(h => {
          if (h.id !== inlineFormData.id) return h;
          return {
            ...h,
            name: inlineFormData.name.trim(),
            distance: inlineFormData.distance.trim(),
            mealType: inlineFormData.mealType
          };
        });

        const activeMakkah = inlineFormCity === 'makkah' 
          ? updatedHotels.find(h => h.id === inlineFormData.id) 
          : prev.makkahHotels?.find(h => h.id === selectedMakkahHotelId);
        const activeMadinah = inlineFormCity === 'madinah'
          ? updatedHotels.find(h => h.id === inlineFormData.id)
          : prev.madinahHotels?.find(h => h.id === selectedMadinahHotelId);

        return {
          ...prev,
          [listKey]: updatedHotels,
          hotelMakkah: activeMakkah?.name || prev.hotelMakkah,
          distanceMakkah: activeMakkah?.distance || prev.distanceMakkah,
          mealMakkah: activeMakkah?.mealType || prev.mealMakkah,
          hotelMadinah: activeMadinah?.name || prev.hotelMadinah,
          distanceMadinah: activeMadinah?.distance || prev.distanceMadinah,
          mealMadinah: activeMadinah?.mealType || prev.mealMadinah,
        };
      });
    }

    // Formu derhal kapat
    setInlineFormOpen(false);
  };

  // Delete hotel
  const handleDeleteHotel = async (city, hotelId) => {
    const listKey = city === 'makkah' ? 'makkahHotels' : 'madinahHotels';
    const hotelList = localPkg[listKey] || [];

    if (hotelList.length <= 1) {
      showAlert({
        title: 'Silinemez',
        message: 'Pakette en az 1 adet otel bulunmalıdır. Başka bir otel ekledikten sonra bu oteli silebilirsiniz.',
        type: 'error'
      });
      return;
    }

    const hotelToDelete = hotelList.find(h => h.id === hotelId);
    const confirmed = await showConfirm({
      title: 'Oteli Sil',
      message: `"${hotelToDelete?.name || 'Bu Otel'}" otelini ve tüm tarih aralığı fiyatlarını silmek istediğinize emin misiniz?`,
      confirmText: 'Evet, Sil',
      cancelText: 'Vazgeç',
      confirmVariant: 'danger'
    });

    if (confirmed) {
      const remainingHotels = hotelList.filter(h => h.id !== hotelId);
      setLocalPkg(prev => ({
        ...prev,
        [listKey]: remainingHotels
      }));

      if (city === 'makkah') {
        setSelectedMakkahHotelId(remainingHotels[0]?.id || '');
      } else {
        setSelectedMadinahHotelId(remainingHotels[0]?.id || '');
      }

      if (inlineFormOpen && inlineFormData.id === hotelId) {
        setInlineFormOpen(false);
      }
    }
  };

  // ═══════════════════════════════════════════════════════════════
  // DATE RANGE MATRIX CRUD OPERATIONS (Dinamik Tarih Aralığı Ekle / Düzenle / Sil)
  // ═══════════════════════════════════════════════════════════════

  const handleAddNewDateRange = (city, hotelId) => {
    if (!newRangeDraft.startDate || !newRangeDraft.endDate) {
      showAlert({ title: 'Tarih Eksik', message: 'Lütfen geçerli bir başlangıç ve bitiş tarihi seçiniz.', type: 'error' });
      return;
    }

    const roomPrice = parseFloat(newRangeDraft.roomPriceSAR) || 0;
    const foodPrice = parseFloat(newRangeDraft.foodPriceSAR) || 0;
    const nights = calculateNights(newRangeDraft.startDate, newRangeDraft.endDate);

    const newRange = {
      id: `dr_${Date.now()}`,
      startDate: newRangeDraft.startDate,
      endDate: newRangeDraft.endDate,
      nights,
      roomPriceSAR: roomPrice,
      foodPriceSAR: foodPrice
    };

    const listKey = city === 'makkah' ? 'makkahHotels' : 'madinahHotels';

    setLocalPkg(prev => {
      const updated = {
        ...prev,
        [listKey]: (prev[listKey] || []).map(h => {
          if (h.id !== hotelId) return h;
          return {
            ...h,
            dateRanges: [...(h.dateRanges || []), newRange]
          };
        })
      };
      // Anında veritabanına ve state'e kaydet (Auto-Save)
      updatePackage(selectedPkgId, updated, `${updated.name} ${city === 'makkah' ? 'Mekke' : 'Medine'} oteline yeni tarih aralığı eklendi.`);
      return updated;
    });

    // Reset draft row
    setNewRangeDraft({
      startDate: '',
      endDate: '',
      nights: 0,
      roomPriceSAR: '',
      foodPriceSAR: ''
    });

    confetti({
      particleCount: 30,
      spread: 45,
      origin: { y: 0.7 }
    });
  };

  const handleUpdateDateRange = (city, hotelId, rangeId, field, value) => {
    const listKey = city === 'makkah' ? 'makkahHotels' : 'madinahHotels';

    setLocalPkg(prev => {
      const updated = {
        ...prev,
        [listKey]: (prev[listKey] || []).map(h => {
          if (h.id !== hotelId) return h;
          return {
            ...h,
            dateRanges: (h.dateRanges || []).map(r => {
              if (r.id !== rangeId) return r;
              const updatedRange = { ...r, [field]: value };
              if (field === 'startDate' || field === 'endDate') {
                updatedRange.nights = calculateNights(updatedRange.startDate, updatedRange.endDate);
              }
              return updatedRange;
            })
          };
        })
      };
      updatePackage(selectedPkgId, updated, `${updated.name} tarih aralığı tarifesi güncellendi.`);
      return updated;
    });
  };

  const handleDeleteDateRange = async (city, hotelId, rangeId) => {
    const listKey = city === 'makkah' ? 'makkahHotels' : 'madinahHotels';

    setLocalPkg(prev => {
      const updated = {
        ...prev,
        [listKey]: (prev[listKey] || []).map(h => {
          if (h.id !== hotelId) return h;
          return {
            ...h,
            dateRanges: (h.dateRanges || []).filter(r => r.id !== rangeId)
          };
        })
      };
      updatePackage(selectedPkgId, updated, `${updated.name} tarih aralığı tarifesi silindi.`);
      return updated;
    });
  };

  // Transfer change (Price or Vehicle Label)
  const handleTransferChange = (field, value, isText = false) => {
    const val = isText ? value : (parseFloat(value) || 0);
    setLocalPkg(prev => ({
      ...prev,
      transfers: {
        ...prev.transfers,
        [field]: val
      }
    }));
  };

  // ═══════════════════════════════════════════════════════════
  // DİNAMİK SABİT GİDERLER / DAHİLİ HİZMETLER (GLOBAL SWITCH & CRUD)
  // ═══════════════════════════════════════════════════════════

  // 1. Yeni Dahili Hizmet Ekle (TÜM PAKETLERE EKLENİR)
  const handleAddNewExpense = (e) => {
    e.preventDefault();
    if (!newExpenseDraft.name.trim()) {
      showAlert({ title: 'İsim Eksik', message: 'Lütfen dahili hizmet adını giriniz.', type: 'error' });
      return;
    }

    const newExpenseId = `exp_${Date.now()}`;
    const basePrice = parseFloat(newExpenseDraft.priceSAR) || 0;
    const isVis = newExpenseDraft.isVisible !== false;

    const newExpenseObj = {
      id: newExpenseId,
      name: newExpenseDraft.name.trim(),
      desc: newExpenseDraft.desc.trim() || 'Dahili Operasyonel Hizmet',
      priceSAR: basePrice,
      isVisible: isVis
    };

    setAllPkgsDraft(prev => {
      const next = {};
      Object.keys(prev).forEach(pkgId => {
        const p = prev[pkgId];
        next[pkgId] = {
          ...p,
          fixedExpensesList: [...(p.fixedExpensesList || []), { ...newExpenseObj }]
        };
      });
      return next;
    });

    setNewExpenseDraft({ name: '', desc: '', priceSAR: '', isVisible: true });
    setExpenseFormOpen(false);

    confetti({
      particleCount: 35,
      spread: 50,
      origin: { y: 0.7 }
    });
  };

  // 2. Fiyat Güncelle (YALNIZCA SEÇİLİ PAKET İÇİN GEÇERLİDİR)
  const handleUpdateExpensePrice = (expId, price) => {
    const val = parseFloat(price) || 0;
    setAllPkgsDraft(prev => {
      const current = prev[selectedPkgId];
      if (!current) return prev;
      return {
        ...prev,
        [selectedPkgId]: {
          ...current,
          fixedExpensesList: (current.fixedExpensesList || []).map(item => {
            if (item.id !== expId) return item;
            return { ...item, priceSAR: val };
          })
        }
      };
    });
  };

  // 3. Görünürlük Switch'i (AÇ / KAPA - TÜM PAKETLERE ANINDA ETKİ EDER)
  const handleToggleExpenseVisibility = (expId) => {
    setAllPkgsDraft(prev => {
      const next = {};
      const currentItem = (prev[selectedPkgId]?.fixedExpensesList || []).find(item => item.id === expId);
      const newVisibility = currentItem ? !currentItem.isVisible : true;

      // TÜM PAKETLERDE BU HİZMETİN GÖRÜNÜRLÜĞÜNÜ GÜNCELLE
      Object.keys(prev).forEach(pkgId => {
        const p = prev[pkgId];
        next[pkgId] = {
          ...p,
          fixedExpensesList: (p.fixedExpensesList || []).map(item => {
            if (item.id !== expId) return item;
            return { ...item, isVisible: newVisibility };
          })
        };
      });
      return next;
    });
  };

  // 4. Hizmeti Sil (TÜM PAKETLERDEN KALDIRILIR)
  const handleDeleteExpense = async (expId, expName) => {
    const confirmed = await showConfirm({
      title: 'Dahili Hizmeti Sil',
      message: `"${expName}" hizmet kalemini TÜM paketlerden tamamen silmek istediğinize emin misiniz?`,
      confirmText: 'Evet, Tümünden Sil',
      cancelText: 'Vazgeç',
      confirmVariant: 'danger'
    });

    if (confirmed) {
      setAllPkgsDraft(prev => {
        const next = {};
        Object.keys(prev).forEach(pkgId => {
          const p = prev[pkgId];
          next[pkgId] = {
            ...p,
            fixedExpensesList: (p.fixedExpensesList || []).filter(item => item.id !== expId)
          };
        });
        return next;
      });
    }
  };

  // Save All changes (Tüm paketleri ve tarih tarifelerini atomik olarak kaydeder)
  const handleSaveAll = () => {
    const updatedPkgsList = Object.values(allPkgsDraft).map(draft => {
      const fixedExpensesMap = {};
      (draft.fixedExpensesList || []).forEach(item => {
        fixedExpensesMap[item.id] = Number(item.priceSAR) || 0;
      });

      const pkgToSave = {
        ...draft,
        fixedExpenses: fixedExpensesMap,
        fixedExpensesList: draft.fixedExpensesList || [],
      };

      if (draft.id === selectedPkgId) {
        pkgToSave.mealMakkah = currentActiveMakkahHotel?.mealType || draft.mealMakkah || 'Açık Büfe';
        pkgToSave.mealMadinah = currentActiveMadinahHotel?.mealType || draft.mealMadinah || 'Açık Büfe';
        pkgToSave.hotelMakkah = currentActiveMakkahHotel?.name || draft.hotelMakkah;
        pkgToSave.hotelMadinah = currentActiveMadinahHotel?.name || draft.hotelMadinah;
        pkgToSave.distanceMakkah = currentActiveMakkahHotel?.distance || draft.distanceMakkah;
        pkgToSave.distanceMadinah = currentActiveMadinahHotel?.distance || draft.distanceMadinah;
      }

      return pkgToSave;
    });

    updateAllPackages(updatedPkgsList, 'Tüm paket otel tarih aralıkları, araç ve dahili hizmetler kaydedildi.');
    updateCurrencies(localCurrencies, 'Döviz kurları ve kâr marjı güncellendi.');

    setIsSaved(true);
    confetti({
      particleCount: 75,
      spread: 70,
      origin: { y: 0.7 }
    });

    setTimeout(() => setIsSaved(false), 2500);
  };

  const formatCurrencyEquivalent = (sarValue) => {
    if (!sarValue || viewCurrency === 'SAR') return null;
    const sarUsd = currencies?.SAR_USD || 3.75;
    const usdTry = currencies?.USD_TRY || 36.5;
    const eurUsd = currencies?.EUR_USD || 1.08;

    const usd = sarValue / sarUsd;
    if (viewCurrency === 'USD') return `~$${usd.toFixed(0)}`;
    if (viewCurrency === 'TRY') return `~${(usd * usdTry).toLocaleString('tr-TR', { maximumFractionDigits: 0 })} ₺`;
    if (viewCurrency === 'EUR') return `~€${(usd / eurUsd).toFixed(0)}`;
    return null;
  };

  return (
    <div className="space-y-6 pb-28 font-sans relative">
      
      {/* 1. Apple-Card Royal Emerald Top Banner with Integrated Profit Margin */}
      <div className="pearl-card rounded-3xl p-6 sm:p-7 bg-gradient-to-r from-emerald-900 via-emerald-850 to-emerald-950 text-white shadow-xl border border-emerald-700/40 relative overflow-hidden backdrop-blur-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-800/80 px-3.5 py-1 text-[11px] font-bold text-emerald-200 border border-emerald-700/60 shadow-2xs">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>GENEL MERKEZ YÖNETİM PANELİ</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black font-display tracking-tight text-white">
              Veri Giriş Merkezi
            </h2>
            <p className="text-xs sm:text-sm text-emerald-100/90 max-w-2xl font-medium">
              Her paket için sınırsız Mekke ve Medine oteli ekleyin, özel takvim ile dinamik tarih aralığı bazlı gecelik oda & yemek fiyatlarını yönetin.
            </p>
          </div>

          {/* Header Profit Margin Badge / Input Widget */}
          <div className="flex items-center gap-3 shrink-0 bg-white/10 p-2.5 rounded-2xl border border-white/15 backdrop-blur-md">
            <div className="flex items-center gap-2 pl-2">
              <div className="p-2 rounded-xl bg-amber-400 text-amber-950 shadow-sm">
                <TrendingUp className="h-4 w-4" />
              </div>
              <div className="pr-1">
                <span className="text-[10px] uppercase tracking-wider font-extrabold text-amber-200 block">
                  {localPkg.name} Kârı
                </span>
                <span className="text-[11px] text-white/80 font-medium">Teklife Eklenen</span>
              </div>
            </div>

            <div className="flex items-center gap-1 bg-white px-3 py-1.5 rounded-xl border border-amber-300 shadow-inner">
              <span className="text-xs font-black text-amber-950">%</span>
              <input
                type="number"
                min="0"
                max="100"
                value={localPkg.profitMargin !== undefined ? localPkg.profitMargin : 15}
                onFocus={(e) => e.target.select()}
                onChange={(e) => setLocalPkg({ ...localPkg, profitMargin: parseFloat(e.target.value) || 0 })}
                className="w-12 bg-transparent font-mono font-black text-center text-amber-950 focus:outline-none text-sm"
              />
            </div>
          </div>

        </div>
      </div>

      {/* 2. Apple-Pill Full-Width Package Ribbon (Ekonomik / Standart / Lüxe/VIP) */}
      <div className="w-full flex items-center justify-center">
        <div className="w-full p-1.5 bg-slate-100/90 rounded-full border border-slate-200/90 shadow-sm backdrop-blur-md flex items-center gap-2">
          {sortedPackages.map(p => {
            const isSelected = selectedPkgId === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => handleSelectPackage(p.id)}
                className={`flex-1 flex items-center justify-center py-3 px-6 rounded-full text-xs sm:text-sm font-black spring-pill transition-all cursor-pointer select-none ${
                  isSelected
                    ? 'bg-gradient-to-r from-emerald-700 to-emerald-800 text-white shadow-md shadow-emerald-800/30 border border-emerald-600/40 scale-101 ring-2 ring-emerald-600/20'
                    : 'text-slate-600 hover:text-slate-950 hover:bg-white/80'
                }`}
              >
                <span className="whitespace-nowrap">{p.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. 4-PILL SECTION NAVIGATION RIBBON (Mekke / Medine Monokrom PNG İkonları ile) */}
      <div className="flex justify-center my-4 overflow-visible">
        <div className="w-full max-w-5xl flex items-center justify-center p-1.5 bg-slate-100/95 rounded-full border border-slate-200/90 shadow-sm backdrop-blur-md gap-1.5 sm:gap-2">
          
          {/* 1. Mekke Otelleri */}
          <button
            type="button"
            onClick={() => handleSelectSection('makkah_hotels')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-2 sm:px-4 text-[11px] sm:text-xs font-extrabold rounded-full spring-pill transition-all cursor-pointer select-none ${
              activeSection === 'makkah_hotels' 
                ? 'bg-gradient-to-r from-emerald-700 to-emerald-800 text-white shadow-md shadow-emerald-800/30 border border-emerald-600/40 scale-101 ring-2 ring-emerald-600/20' 
                : 'text-slate-600 hover:bg-white/80 hover:text-slate-950'
            }`}
          >
            <img 
              src="/mekke.png" 
              alt="Mekke" 
              className={`h-4 w-4 object-contain transition-all ${
                activeSection === 'makkah_hotels' ? 'brightness-0 invert' : 'opacity-70'
              }`} 
            />
            <span className="truncate">Mekke Otelleri</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
              activeSection === 'makkah_hotels' ? 'bg-emerald-900/60 text-emerald-200' : 'bg-slate-200 text-slate-600'
            }`}>
              {localPkg.makkahHotels?.length || 1}
            </span>
          </button>

          {/* 2. Medine Otelleri */}
          <button
            type="button"
            onClick={() => handleSelectSection('madinah_hotels')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-2 sm:px-4 text-[11px] sm:text-xs font-extrabold rounded-full spring-pill transition-all cursor-pointer select-none ${
              activeSection === 'madinah_hotels' 
                ? 'bg-gradient-to-r from-emerald-700 to-emerald-800 text-white shadow-md shadow-emerald-800/30 border border-emerald-600/40 scale-101 ring-2 ring-emerald-600/20' 
                : 'text-slate-600 hover:bg-white/80 hover:text-slate-950'
            }`}
          >
            <img 
              src="/medine.png" 
              alt="Medine" 
              className={`h-4 w-4 object-contain transition-all ${
                activeSection === 'madinah_hotels' ? 'brightness-0 invert' : 'opacity-70'
              }`} 
            />
            <span className="truncate">Medine Otelleri</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
              activeSection === 'madinah_hotels' ? 'bg-emerald-900/60 text-emerald-200' : 'bg-slate-200 text-slate-600'
            }`}>
              {localPkg.madinahHotels?.length || 1}
            </span>
          </button>

          {/* 3. Transfer & Araç Fiyatları */}
          <button
            type="button"
            onClick={() => handleSelectSection('transfers')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-2 sm:px-4 text-[11px] sm:text-xs font-extrabold rounded-full spring-pill transition-all cursor-pointer select-none ${
              activeSection === 'transfers' 
                ? 'bg-gradient-to-r from-emerald-700 to-emerald-800 text-white shadow-md shadow-emerald-800/30 border border-emerald-600/40 scale-101 ring-2 ring-emerald-600/20' 
                : 'text-slate-600 hover:bg-white/80 hover:text-slate-950'
            }`}
          >
            <Bus className="h-4 w-4" />
            <span className="truncate">Transfer & Araç</span>
          </button>

          {/* 4. Sabit Giderler Havuzu */}
          <button
            type="button"
            onClick={() => handleSelectSection('expenses')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-2 sm:px-4 text-[11px] sm:text-xs font-extrabold rounded-full spring-pill transition-all cursor-pointer select-none ${
              activeSection === 'expenses' 
                ? 'bg-gradient-to-r from-emerald-700 to-emerald-800 text-white shadow-md shadow-emerald-800/30 border border-emerald-600/40 scale-101 ring-2 ring-emerald-600/20' 
                : 'text-slate-600 hover:bg-white/80 hover:text-slate-950'
            }`}
          >
            <Coins className="h-4 w-4" />
            <span className="truncate">Sabit Giderler</span>
          </button>

        </div>
      </div>

      {/* 4. ANIMATED CONTENT CONTAINER */}
      <div 
        key={`${selectedPkgId}_${activeSection}`} 
        className={`${pkgSlideDirection === 'left' ? 'animate-slide-from-left' : 'animate-slide-from-right'} space-y-6`}
      >

        {/* ═══════════════════════════════════════════════════════════
            SECTION 1: MEKKE OTELLERİ & DİNAMİK TARİH ARALIKLARI TABLOSU
           ═══════════════════════════════════════════════════════════ */}
        {activeSection === 'makkah_hotels' && (
          <div className="space-y-4 animate-fade-scale">
            
            {/* Hotel Selector Pills & Management Bar */}
            <div className="pearl-card rounded-3xl p-5 bg-white border border-slate-200 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3.5">
                <div className="flex items-center gap-2.5">
                  <img src="/mekke.png" alt="Mekke" className="h-5 w-5 object-contain opacity-80" />
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900">
                      {localPkg.name} - Mekke Otelleri Listesi
                    </h3>
                    <p className="text-[11px] text-slate-500 font-medium">
                      Genel Merkez tarafından tanımlanan Mekke otelleri. Fiyatlarını düzenlemek istediğiniz oteli seçin.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleOpenInlineAdd('makkah')}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-sm transition-all cursor-pointer hover:scale-102 active:scale-98 self-start sm:self-auto"
                >
                  <Plus className="h-4 w-4 stroke-[2.5]" />
                  <span>Yeni Mekke Oteli Ekle</span>
                </button>
              </div>

              {/* Hotel Pills Ribbon */}
              <div className="flex items-center gap-2.5 flex-wrap">
                {(localPkg.makkahHotels || []).map((hotel, idx) => {
                  const isHotelSelected = (currentActiveMakkahHotel?.id === hotel.id);
                  return (
                    <div 
                      key={hotel.id} 
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl border transition-all duration-300 cursor-pointer select-none ${
                        isHotelSelected
                          ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500/30 text-emerald-950 shadow-md scale-[1.03] animate-scale-in'
                          : 'bg-slate-50/80 border-slate-200 text-slate-600 hover:bg-slate-100 hover:border-slate-300 hover:text-slate-900 hover:scale-[1.01]'
                      }`}
                      onClick={() => {
                        setSelectedMakkahHotelId(hotel.id);
                        setEditingRangeId(null);
                      }}
                    >
                      <div className="relative flex items-center justify-center">
                        <div className={`h-2.5 w-2.5 rounded-full ${isHotelSelected ? 'bg-emerald-600' : 'bg-slate-300'}`} />
                        {isHotelSelected && (
                          <div className="absolute h-4 w-4 rounded-full bg-emerald-400 opacity-75 animate-ping" />
                        )}
                      </div>
                      <div className="text-left">
                        <span className="font-black text-xs block leading-tight">{hotel.name}</span>
                        <span className="text-[10px] text-slate-500 font-medium">{hotel.distance}</span>
                      </div>

                      {/* Action buttons on pill */}
                      <div className="flex items-center gap-1 pl-2 ml-auto border-l border-slate-200/80">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenInlineEdit('makkah', hotel);
                          }}
                          className="p-1 text-slate-400 hover:text-emerald-700 hover:bg-white rounded-lg transition-all cursor-pointer"
                          title="Oteli Düzenle"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                        </button>
                        {localPkg.makkahHotels.length > 1 && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteHotel('makkah', hotel.id);
                            }}
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
                            title="Oteli Sil"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* FERAH INLINE HOTEL FORM (Expandable Card - No blur, no scroll) */}
              {inlineFormOpen && inlineFormCity === 'makkah' && (
                <div ref={inlineFormRef} className="p-5 bg-gradient-to-br from-emerald-50/90 to-teal-50/70 rounded-2xl border-2 border-emerald-400/80 shadow-md space-y-4 animate-scale-in">
                  <div className="flex items-center justify-between border-b border-emerald-200/80 pb-3">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-xl bg-emerald-600 text-white shadow-xs">
                        {inlineFormMode === 'add' ? <Plus className="h-4 w-4" /> : <Edit3 className="h-4 w-4" />}
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-emerald-950">
                          {inlineFormMode === 'add' ? 'Yeni Mekke Oteli Ekle' : `"${inlineFormData.name}" Otelini Düzenle`}
                        </h4>
                        <p className="text-[11px] text-emerald-800/80">
                          Otel adı, mesafesi ve yemek konseptini belirleyin.
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setInlineFormOpen(false)}
                      className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-white/80 rounded-xl transition-all"
                      title="Formu Kapat"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <form onSubmit={handleSaveInlineForm} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                      
                      {/* Otel Adı */}
                      <div className="space-y-1">
                        <label className="block text-xs font-extrabold text-emerald-950">
                          Otel Adı *
                        </label>
                        <input
                          type="text"
                          required
                          value={inlineFormData.name}
                          onChange={(e) => setInlineFormData({ ...inlineFormData, name: e.target.value })}
                          placeholder="Örn: Elaf Bakkah / Anjum"
                          className="w-full bg-white text-slate-900 rounded-xl px-3.5 py-2 border border-emerald-300 focus:outline-none focus:border-emerald-600 text-xs font-bold shadow-2xs"
                        />
                      </div>

                      {/* Mesafe */}
                      <div className="space-y-1">
                        <label className="block text-xs font-extrabold text-emerald-950">
                          Mesafe & Ulaşım Bilgisi
                        </label>
                        <input
                          type="text"
                          value={inlineFormData.distance}
                          onChange={(e) => setInlineFormData({ ...inlineFormData, distance: e.target.value })}
                          placeholder="Örn: 1200m (24 Saat Ring Servis)"
                          className="w-full bg-white text-slate-900 rounded-xl px-3.5 py-2 border border-emerald-300 focus:outline-none focus:border-emerald-600 text-xs font-medium shadow-2xs"
                        />
                      </div>

                      {/* Yemek Tipi (SELECT) */}
                      <div className="space-y-1">
                        <label className="block text-xs font-extrabold text-emerald-950">
                          Yemek Konsepti
                        </label>
                        <CustomSelect
                          value={inlineFormData.mealType}
                          onChange={(val) => setInlineFormData({ ...inlineFormData, mealType: val })}
                          options={MEAL_OPTIONS}
                          className="text-xs font-bold"
                        />
                      </div>

                    </div>

                    <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-emerald-200/80">
                      <button
                        type="button"
                        onClick={() => setInlineFormOpen(false)}
                        className="px-4 py-2 rounded-xl text-slate-600 hover:bg-white/80 text-xs font-bold transition-all cursor-pointer"
                      >
                        Vazgeç
                      </button>
                      <button
                        type="submit"
                        className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-700/20 transition-all cursor-pointer hover:scale-102 active:scale-98 flex items-center gap-1.5"
                      >
                        <Check className="h-4 w-4 stroke-[2.5]" />
                        <span>{inlineFormMode === 'add' ? 'Oteli Kaydet & Fiyatları Düzenle' : 'Değişiklikleri Uygula'}</span>
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Active Hotel Details Summary Banner */}
              {currentActiveMakkahHotel && !inlineFormOpen && (
                <div 
                  key={`makkah_summary_${currentActiveMakkahHotel.id}`} 
                  className="p-3.5 bg-emerald-50/60 rounded-2xl border border-emerald-200/90 flex flex-wrap items-center justify-between gap-3 text-xs animate-scale-in"
                >
                  <div className="flex items-center gap-4 flex-wrap">
                    <div className="flex items-center gap-1.5 text-slate-800 font-bold bg-white px-2.5 py-1 rounded-xl border border-emerald-200">
                      <span className="text-emerald-700 font-black">Seçili Otel:</span>
                      <span className="text-slate-900">{currentActiveMakkahHotel.name}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-700">
                      <MapPin className="h-4 w-4 text-emerald-600" />
                      <span className="font-bold">Mesafe:</span>
                      <span className="text-slate-600">{currentActiveMakkahHotel.distance}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-700">
                      <Utensils className="h-4 w-4 text-emerald-600" />
                      <span className="font-bold">Yemek Konsepti:</span>
                      <span className="text-slate-600 font-semibold">{currentActiveMakkahHotel.mealType || 'Açık Büfe'} (Sabah & Akşam)</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleOpenInlineEdit('makkah', currentActiveMakkahHotel)}
                    className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 hover:underline flex items-center gap-1 cursor-pointer bg-white px-3 py-1.5 rounded-xl border border-emerald-200 shadow-2xs hover:scale-102 transition-all"
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                    <span>Otel Bilgilerini Değiştir</span>
                  </button>
                </div>
              )}
            </div>

            {/* DİNAMİK TARİH ARALIKLARI FİYAT MATRİSİ TABLOSU */}
            {currentActiveMakkahHotel && (
              <div 
                key={`makkah_matrix_${currentActiveMakkahHotel.id}`} 
                className="pearl-card rounded-3xl bg-white border border-slate-200/90 shadow-sm overflow-hidden animate-fade-scale"
              >
                <div className="p-4 bg-slate-50/90 border-b border-slate-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <img src="/mekke.png" alt="Mekke" className="h-4 w-4 object-contain opacity-70" />
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-black text-slate-900">
                          {currentActiveMakkahHotel.name}
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-200">
                          Tarih Aralığı Fiyat Tarifeleri
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Otelden alınan tarih aralıklarını, gecelik oda fiyatı ve günlük yemek bedelini ekleyin.
                      </p>
                    </div>
                  </div>

                  {/* Currency selector */}
                  <div className="flex items-center gap-1.5 bg-white p-1 rounded-2xl border border-slate-200 shadow-2xs self-start sm:self-auto">
                    <span className="text-[11px] font-bold text-slate-500 pl-2 pr-1">Döviz Çevirici:</span>
                    {['SAR', 'USD', 'TRY', 'EUR'].map(curr => (
                      <button
                        key={curr}
                        type="button"
                        onClick={() => setViewCurrency(curr)}
                        className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          viewCurrency === curr
                            ? 'bg-emerald-700 text-white shadow-xs'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                        }`}
                      >
                        {curr === 'TRY' ? '₺ TL' : curr === 'USD' ? '$ USD' : curr === 'EUR' ? '€ EUR' : 'SAR'}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-700 font-black text-[11px] uppercase">
                        <th className="py-3 px-3 w-10 text-center">#</th>
                        <th className="py-3 px-3 min-w-[260px]">Tarih Aralığı (Giriş - Çıkış)</th>
                        <th className="py-3 px-3 bg-emerald-50/50 text-emerald-950">Gecelik Oda Fiyatı (SAR)</th>
                        <th className="py-3 px-3 bg-emerald-50/50 text-emerald-950">Günlük Yemek Fiyatı (SAR)</th>
                        <th className="py-3 px-3 text-center bg-slate-50">Günlük Toplam Bedel</th>
                        <th className="py-3 px-3 text-center w-20">İşlem</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      
                      {/* Existing Saved Date Range Rows */}
                      {(currentActiveMakkahHotel.dateRanges || []).map((range, idx) => {
                        const roomVal = range.roomPriceSAR || 0;
                        const foodVal = range.foodPriceSAR || 0;
                        const totalDaily = roomVal + foodVal;

                        return (
                          <tr 
                            key={range.id} 
                            className="hover:bg-emerald-50/30 transition-colors animate-scale-in"
                          >
                            <td className="py-2.5 px-3 text-center text-slate-400 font-mono text-[11px]">
                              {idx + 1}
                            </td>

                            <td className="py-2 px-3">
                              <CustomDateRangePicker
                                startDate={range.startDate}
                                endDate={range.endDate}
                                onChange={({ startDate, endDate }) => {
                                  handleUpdateDateRange('makkah', currentActiveMakkahHotel.id, range.id, 'startDate', startDate);
                                  handleUpdateDateRange('makkah', currentActiveMakkahHotel.id, range.id, 'endDate', endDate);
                                }}
                              />
                            </td>

                            <td className="py-2 px-3 bg-emerald-50/20">
                              <div className="relative w-36">
                                <input
                                  type="number"
                                  min="0"
                                  step="5"
                                  value={roomVal}
                                  onFocus={(e) => e.target.select()}
                                  onChange={(e) => handleUpdateDateRange('makkah', currentActiveMakkahHotel.id, range.id, 'roomPriceSAR', parseFloat(e.target.value) || 0)}
                                  className="w-full bg-white font-mono font-bold text-slate-900 rounded-xl px-2.5 py-1 text-xs border border-slate-300 focus:outline-none focus:border-emerald-600 text-right pr-9 shadow-3xs"
                                />
                                <span className="absolute right-2 top-1.5 text-[10px] text-slate-400 font-mono">SAR</span>
                              </div>
                              {viewCurrency !== 'SAR' && (
                                <div className="text-[10px] font-mono text-emerald-800 text-right pr-1 mt-0.5">
                                  {formatCurrencyEquivalent(roomVal)}
                                </div>
                              )}
                            </td>

                            <td className="py-2 px-3 bg-emerald-50/20">
                              <div className="relative w-32">
                                <input
                                  type="number"
                                  min="0"
                                  step="5"
                                  value={foodVal}
                                  onFocus={(e) => e.target.select()}
                                  onChange={(e) => handleUpdateDateRange('makkah', currentActiveMakkahHotel.id, range.id, 'foodPriceSAR', parseFloat(e.target.value) || 0)}
                                  className="w-full bg-white font-mono font-bold text-emerald-900 rounded-xl px-2.5 py-1 text-xs border border-emerald-300 focus:outline-none focus:border-emerald-600 text-right pr-8 shadow-3xs"
                                />
                                <span className="absolute right-2 top-1.5 text-[10px] text-slate-400 font-mono">SAR</span>
                              </div>
                              {viewCurrency !== 'SAR' && (
                                <div className="text-[10px] font-mono text-emerald-800 text-right pr-1 mt-0.5">
                                  {formatCurrencyEquivalent(foodVal)}
                                </div>
                              )}
                            </td>

                            <td className="py-2.5 px-3 text-center bg-slate-50/80 font-mono">
                              <div className="font-black text-xs text-slate-900">
                                {totalDaily} <span className="text-[10px] text-slate-400 font-sans">SAR</span>
                              </div>
                              {viewCurrency !== 'SAR' && (
                                <div className="text-[10px] font-bold text-emerald-700">
                                  {formatCurrencyEquivalent(totalDaily)}
                                </div>
                              )}
                            </td>

                            <td className="py-2 px-3 text-center">
                              <button
                                type="button"
                                onClick={() => handleDeleteDateRange('makkah', currentActiveMakkahHotel.id, range.id)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all cursor-pointer"
                                title="Aralığı Sil"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}

                      {/* NEW DRAFT RANGE ROW (Her zaman hazırda bekleyen yeni satır) */}
                      <tr className="bg-emerald-50/40 border-t-2 border-emerald-200">
                        <td className="py-3 px-3 text-center text-emerald-600 font-black">
                          <Plus className="h-4 w-4 mx-auto animate-bounce" />
                        </td>

                        <td className="py-2 px-3">
                          <CustomDateRangePicker
                            startDate={newRangeDraft.startDate}
                            endDate={newRangeDraft.endDate}
                            onChange={({ startDate, endDate, nights }) => {
                              setNewRangeDraft(prev => ({
                                ...prev,
                                startDate,
                                endDate,
                                nights
                              }));
                            }}
                            placeholder="Yeni Tarih Aralığı Seçiniz..."
                          />
                        </td>

                        <td className="py-2 px-3">
                          <div className="relative w-36">
                            <input
                              type="number"
                              min="0"
                              step="5"
                              placeholder="0"
                              value={newRangeDraft.roomPriceSAR}
                              onChange={(e) => setNewRangeDraft({ ...newRangeDraft, roomPriceSAR: e.target.value })}
                              className="w-full bg-white font-mono font-bold text-slate-900 rounded-xl px-2.5 py-1 text-xs border border-emerald-300 focus:outline-none focus:border-emerald-600 text-right pr-9 shadow-3xs"
                            />
                            <span className="absolute right-2 top-1.5 text-[10px] text-slate-400 font-mono">SAR</span>
                          </div>
                        </td>

                        <td className="py-2 px-3">
                          <div className="relative w-32">
                            <input
                              type="number"
                              min="0"
                              step="5"
                              placeholder="0"
                              value={newRangeDraft.foodPriceSAR}
                              onChange={(e) => setNewRangeDraft({ ...newRangeDraft, foodPriceSAR: e.target.value })}
                              className="w-full bg-white font-mono font-bold text-emerald-900 rounded-xl px-2.5 py-1 text-xs border border-emerald-300 focus:outline-none focus:border-emerald-600 text-right pr-8 shadow-3xs"
                            />
                            <span className="absolute right-2 top-1.5 text-[10px] text-slate-400 font-mono">SAR</span>
                          </div>
                        </td>

                        <td className="py-2.5 px-3 text-center font-mono">
                          <div className="font-black text-xs text-slate-700">
                            {(parseFloat(newRangeDraft.roomPriceSAR) || 0) + (parseFloat(newRangeDraft.foodPriceSAR) || 0)} <span className="text-[10px] text-slate-400 font-sans">SAR</span>
                          </div>
                        </td>

                        <td className="py-2 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleAddNewDateRange('makkah', currentActiveMakkahHotel.id)}
                            disabled={!newRangeDraft.startDate || !newRangeDraft.endDate}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer flex items-center gap-1 mx-auto hover:scale-105 active:scale-95"
                          >
                            <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
                            <span>Kaydet</span>
                          </button>
                        </td>
                      </tr>

                    </tbody>
                  </table>
                </div>
              </div>
            )}

          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════
            SECTION 2: MEDİNE OTELLERİ & DİNAMİK TARİH ARALIKLARI TABLOSU
           ═══════════════════════════════════════════════════════════ */}
        {activeSection === 'madinah_hotels' && (
          <div className="space-y-4 animate-fade-scale">
            
            {/* Hotel Selector Pills & Management Bar */}
            <div className="pearl-card rounded-3xl p-5 bg-white border border-slate-200 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3.5">
                <div className="flex items-center gap-2.5">
                  <img src="/medine.png" alt="Medine" className="h-5 w-5 object-contain opacity-80" />
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900">
                      {localPkg.name} - Medine Otelleri Listesi
                    </h3>
                    <p className="text-[11px] text-slate-500 font-medium">
                      Genel Merkez tarafından tanımlanan Medine otelleri. Fiyatlarını düzenlemek istediğiniz oteli seçin.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleOpenInlineAdd('madinah')}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-sm transition-all cursor-pointer hover:scale-102 active:scale-98 self-start sm:self-auto"
                >
                  <Plus className="h-4 w-4 stroke-[2.5]" />
                  <span>Yeni Medine Oteli Ekle</span>
                </button>
              </div>

              {/* Hotel Pills Ribbon */}
              <div className="flex items-center gap-2.5 flex-wrap">
                {(localPkg.madinahHotels || []).map((hotel, idx) => {
                  const isHotelSelected = (currentActiveMadinahHotel?.id === hotel.id);
                  return (
                    <div 
                      key={hotel.id} 
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl border transition-all duration-300 cursor-pointer select-none ${
                        isHotelSelected
                          ? 'bg-amber-50 border-amber-500 ring-2 ring-amber-500/30 text-amber-950 shadow-md scale-[1.03] animate-scale-in'
                          : 'bg-slate-50/80 border-slate-200 text-slate-600 hover:bg-slate-100 hover:border-slate-300 hover:text-slate-900 hover:scale-[1.01]'
                      }`}
                      onClick={() => {
                        setSelectedMadinahHotelId(hotel.id);
                        setEditingRangeId(null);
                      }}
                    >
                      <div className="relative flex items-center justify-center">
                        <div className={`h-2.5 w-2.5 rounded-full ${isHotelSelected ? 'bg-amber-600' : 'bg-slate-300'}`} />
                        {isHotelSelected && (
                          <div className="absolute h-4 w-4 rounded-full bg-amber-400 opacity-75 animate-ping" />
                        )}
                      </div>
                      <div className="text-left">
                        <span className="font-black text-xs block leading-tight">{hotel.name}</span>
                        <span className="text-[10px] text-slate-500 font-medium">{hotel.distance}</span>
                      </div>

                      {/* Action buttons on pill */}
                      <div className="flex items-center gap-1 pl-2 ml-auto border-l border-slate-200/80">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenInlineEdit('madinah', hotel);
                          }}
                          className="p-1 text-slate-400 hover:text-amber-700 hover:bg-white rounded-lg transition-all cursor-pointer"
                          title="Oteli Düzenle"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                        </button>
                        {localPkg.madinahHotels.length > 1 && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteHotel('madinah', hotel.id);
                            }}
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
                            title="Oteli Sil"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* FERAH INLINE HOTEL FORM (Expandable Card - No blur, no scroll) */}
              {inlineFormOpen && inlineFormCity === 'madinah' && (
                <div ref={inlineFormRef} className="p-5 bg-gradient-to-br from-amber-50/90 to-orange-50/70 rounded-2xl border-2 border-amber-400/80 shadow-md space-y-4 animate-scale-in">
                  <div className="flex items-center justify-between border-b border-amber-200/80 pb-3">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-xl bg-amber-600 text-white shadow-xs">
                        {inlineFormMode === 'add' ? <Plus className="h-4 w-4" /> : <Edit3 className="h-4 w-4" />}
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-amber-950">
                          {inlineFormMode === 'add' ? 'Yeni Medine Oteli Ekle' : `"${inlineFormData.name}" Otelini Düzenle`}
                        </h4>
                        <p className="text-[11px] text-amber-800/80">
                          Otel adı, mesafesi ve yemek konseptini belirleyin.
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setInlineFormOpen(false)}
                      className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-white/80 rounded-xl transition-all"
                      title="Formu Kapat"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <form onSubmit={handleSaveInlineForm} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                      
                      {/* Otel Adı */}
                      <div className="space-y-1">
                        <label className="block text-xs font-extrabold text-amber-950">
                          Otel Adı *
                        </label>
                        <input
                          type="text"
                          required
                          value={inlineFormData.name}
                          onChange={(e) => setInlineFormData({ ...inlineFormData, name: e.target.value })}
                          placeholder="Örn: Al Eiman Taibah / Maden"
                          className="w-full bg-white text-slate-900 rounded-xl px-3.5 py-2 border border-amber-300 focus:outline-none focus:border-amber-600 text-xs font-bold shadow-2xs"
                        />
                      </div>

                      {/* Mesafe */}
                      <div className="space-y-1">
                        <label className="block text-xs font-extrabold text-amber-950">
                          Mesafe & Ulaşım Bilgisi
                        </label>
                        <input
                          type="text"
                          value={inlineFormData.distance}
                          onChange={(e) => setInlineFormData({ ...inlineFormData, distance: e.target.value })}
                          placeholder="Örn: 250m (Yürüme Mesafesi)"
                          className="w-full bg-white text-slate-900 rounded-xl px-3.5 py-2 border border-amber-300 focus:outline-none focus:border-amber-600 text-xs font-medium shadow-2xs"
                        />
                      </div>

                      {/* Yemek Tipi (SELECT) */}
                      <div className="space-y-1">
                        <label className="block text-xs font-extrabold text-amber-950">
                          Yemek Konsepti
                        </label>
                        <CustomSelect
                          value={inlineFormData.mealType}
                          onChange={(val) => setInlineFormData({ ...inlineFormData, mealType: val })}
                          options={MEAL_OPTIONS}
                          className="text-xs font-bold"
                        />
                      </div>

                    </div>

                    <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-amber-200/80">
                      <button
                        type="button"
                        onClick={() => setInlineFormOpen(false)}
                        className="px-4 py-2 rounded-xl text-slate-600 hover:bg-white/80 text-xs font-bold transition-all cursor-pointer"
                      >
                        Vazgeç
                      </button>
                      <button
                        type="submit"
                        className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold shadow-md shadow-amber-700/20 transition-all cursor-pointer hover:scale-102 active:scale-98 flex items-center gap-1.5"
                      >
                        <Check className="h-4 w-4 stroke-[2.5]" />
                        <span>{inlineFormMode === 'add' ? 'Oteli Kaydet & Fiyatları Düzenle' : 'Değişiklikleri Uygula'}</span>
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Active Hotel Details Summary Banner */}
              {currentActiveMadinahHotel && !inlineFormOpen && (
                <div 
                  key={`madinah_summary_${currentActiveMadinahHotel.id}`} 
                  className="p-3.5 bg-amber-50/60 rounded-2xl border border-amber-200/90 flex flex-wrap items-center justify-between gap-3 text-xs animate-scale-in"
                >
                  <div className="flex items-center gap-4 flex-wrap">
                    <div className="flex items-center gap-1.5 text-slate-800 font-bold bg-white px-2.5 py-1 rounded-xl border border-amber-200">
                      <span className="text-amber-700 font-black">Seçili Otel:</span>
                      <span className="text-slate-900">{currentActiveMadinahHotel.name}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-700">
                      <MapPin className="h-4 w-4 text-amber-600" />
                      <span className="font-bold">Mesafe:</span>
                      <span className="text-slate-600">{currentActiveMadinahHotel.distance}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-700">
                      <Utensils className="h-4 w-4 text-amber-600" />
                      <span className="font-bold">Yemek Konsepti:</span>
                      <span className="text-slate-600 font-semibold">{currentActiveMadinahHotel.mealType || 'Açık Büfe'} (Sabah & Akşam)</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleOpenInlineEdit('madinah', currentActiveMadinahHotel)}
                    className="text-[11px] font-bold text-amber-700 hover:text-amber-800 hover:underline flex items-center gap-1 cursor-pointer bg-white px-3 py-1.5 rounded-xl border border-amber-200 shadow-2xs hover:scale-102 transition-all"
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                    <span>Otel Bilgilerini Değiştir</span>
                  </button>
                </div>
              )}
            </div>

            {/* DİNAMİK TARİH ARALIKLARI FİYAT MATRİSİ TABLOSU */}
            {currentActiveMadinahHotel && (
              <div 
                key={`madinah_matrix_${currentActiveMadinahHotel.id}`} 
                className="pearl-card rounded-3xl bg-white border border-slate-200/90 shadow-sm overflow-hidden animate-fade-scale"
              >
                <div className="p-4 bg-slate-50/90 border-b border-slate-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <img src="/medine.png" alt="Medine" className="h-4 w-4 object-contain opacity-70" />
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-black text-slate-900">
                          {currentActiveMadinahHotel.name}
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 border border-amber-200">
                          Tarih Aralığı Fiyat Tarifeleri
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Otelden alınan tarih aralıklarını, gecelik oda fiyatı ve günlük yemek bedelini ekleyin.
                      </p>
                    </div>
                  </div>

                  {/* Currency selector */}
                  <div className="flex items-center gap-1.5 bg-white p-1 rounded-2xl border border-slate-200 shadow-2xs self-start sm:self-auto">
                    <span className="text-[11px] font-bold text-slate-500 pl-2 pr-1">Döviz Çevirici:</span>
                    {['SAR', 'USD', 'TRY', 'EUR'].map(curr => (
                      <button
                        key={curr}
                        type="button"
                        onClick={() => setViewCurrency(curr)}
                        className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          viewCurrency === curr
                            ? 'bg-emerald-700 text-white shadow-xs'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                        }`}
                      >
                        {curr === 'TRY' ? '₺ TL' : curr === 'USD' ? '$ USD' : curr === 'EUR' ? '€ EUR' : 'SAR'}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-700 font-black text-[11px] uppercase">
                        <th className="py-3 px-3 w-10 text-center">#</th>
                        <th className="py-3 px-3 min-w-[260px]">Tarih Aralığı (Giriş - Çıkış)</th>
                        <th className="py-3 px-3 bg-amber-50/50 text-amber-950">Gecelik Oda Fiyatı (SAR)</th>
                        <th className="py-3 px-3 bg-amber-50/50 text-amber-950">Günlük Yemek Fiyatı (SAR)</th>
                        <th className="py-3 px-3 text-center bg-slate-50">Günlük Toplam Bedel</th>
                        <th className="py-3 px-3 text-center w-20">İşlem</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      
                      {/* Existing Saved Date Range Rows */}
                      {(currentActiveMadinahHotel.dateRanges || []).map((range, idx) => {
                        const roomVal = range.roomPriceSAR || 0;
                        const foodVal = range.foodPriceSAR || 0;
                        const totalDaily = roomVal + foodVal;

                        return (
                          <tr 
                            key={range.id} 
                            className="hover:bg-amber-50/30 transition-colors animate-scale-in"
                          >
                            <td className="py-2.5 px-3 text-center text-slate-400 font-mono text-[11px]">
                              {idx + 1}
                            </td>

                            <td className="py-2 px-3">
                              <CustomDateRangePicker
                                startDate={range.startDate}
                                endDate={range.endDate}
                                onChange={({ startDate, endDate }) => {
                                  handleUpdateDateRange('madinah', currentActiveMadinahHotel.id, range.id, 'startDate', startDate);
                                  handleUpdateDateRange('madinah', currentActiveMadinahHotel.id, range.id, 'endDate', endDate);
                                }}
                              />
                            </td>

                            <td className="py-2 px-3 bg-amber-50/20">
                              <div className="relative w-36">
                                <input
                                  type="number"
                                  min="0"
                                  step="5"
                                  value={roomVal}
                                  onFocus={(e) => e.target.select()}
                                  onChange={(e) => handleUpdateDateRange('madinah', currentActiveMadinahHotel.id, range.id, 'roomPriceSAR', parseFloat(e.target.value) || 0)}
                                  className="w-full bg-white font-mono font-bold text-slate-900 rounded-xl px-2.5 py-1 text-xs border border-slate-300 focus:outline-none focus:border-emerald-600 text-right pr-9 shadow-3xs"
                                />
                                <span className="absolute right-2 top-1.5 text-[10px] text-slate-400 font-mono">SAR</span>
                              </div>
                              {viewCurrency !== 'SAR' && (
                                <div className="text-[10px] font-mono text-amber-800 text-right pr-1 mt-0.5">
                                  {formatCurrencyEquivalent(roomVal)}
                                </div>
                              )}
                            </td>

                            <td className="py-2 px-3 bg-amber-50/20">
                              <div className="relative w-32">
                                <input
                                  type="number"
                                  min="0"
                                  step="5"
                                  value={foodVal}
                                  onFocus={(e) => e.target.select()}
                                  onChange={(e) => handleUpdateDateRange('madinah', currentActiveMadinahHotel.id, range.id, 'foodPriceSAR', parseFloat(e.target.value) || 0)}
                                  className="w-full bg-white font-mono font-bold text-amber-900 rounded-xl px-2.5 py-1 text-xs border border-amber-300 focus:outline-none focus:border-emerald-600 text-right pr-8 shadow-3xs"
                                />
                                <span className="absolute right-2 top-1.5 text-[10px] text-slate-400 font-mono">SAR</span>
                              </div>
                              {viewCurrency !== 'SAR' && (
                                <div className="text-[10px] font-mono text-amber-800 text-right pr-1 mt-0.5">
                                  {formatCurrencyEquivalent(foodVal)}
                                </div>
                              )}
                            </td>

                            <td className="py-2.5 px-3 text-center bg-slate-50/80 font-mono">
                              <div className="font-black text-xs text-slate-900">
                                {totalDaily} <span className="text-[10px] text-slate-400 font-sans">SAR</span>
                              </div>
                              {viewCurrency !== 'SAR' && (
                                <div className="text-[10px] font-bold text-emerald-700">
                                  {formatCurrencyEquivalent(totalDaily)}
                                </div>
                              )}
                            </td>

                            <td className="py-2 px-3 text-center">
                              <button
                                type="button"
                                onClick={() => handleDeleteDateRange('madinah', currentActiveMadinahHotel.id, range.id)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all cursor-pointer"
                                title="Aralığı Sil"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}

                      {/* NEW DRAFT RANGE ROW (Her zaman hazırda bekleyen yeni satır) */}
                      <tr className="bg-amber-50/40 border-t-2 border-amber-200">
                        <td className="py-3 px-3 text-center text-amber-600 font-black">
                          <Plus className="h-4 w-4 mx-auto animate-bounce" />
                        </td>

                        <td className="py-2 px-3">
                          <CustomDateRangePicker
                            startDate={newRangeDraft.startDate}
                            endDate={newRangeDraft.endDate}
                            onChange={({ startDate, endDate, nights }) => {
                              setNewRangeDraft(prev => ({
                                ...prev,
                                startDate,
                                endDate,
                                nights
                              }));
                            }}
                            placeholder="Yeni Tarih Aralığı Seçiniz..."
                          />
                        </td>

                        <td className="py-2 px-3">
                          <div className="relative w-36">
                            <input
                              type="number"
                              min="0"
                              step="5"
                              placeholder="0"
                              value={newRangeDraft.roomPriceSAR}
                              onChange={(e) => setNewRangeDraft({ ...newRangeDraft, roomPriceSAR: e.target.value })}
                              className="w-full bg-white font-mono font-bold text-slate-900 rounded-xl px-2.5 py-1 text-xs border border-amber-300 focus:outline-none focus:border-emerald-600 text-right pr-9 shadow-3xs"
                            />
                            <span className="absolute right-2 top-1.5 text-[10px] text-slate-400 font-mono">SAR</span>
                          </div>
                        </td>

                        <td className="py-2 px-3">
                          <div className="relative w-32">
                            <input
                              type="number"
                              min="0"
                              step="5"
                              placeholder="0"
                              value={newRangeDraft.foodPriceSAR}
                              onChange={(e) => setNewRangeDraft({ ...newRangeDraft, foodPriceSAR: e.target.value })}
                              className="w-full bg-white font-mono font-bold text-amber-900 rounded-xl px-2.5 py-1 text-xs border border-amber-300 focus:outline-none focus:border-emerald-600 text-right pr-8 shadow-3xs"
                            />
                            <span className="absolute right-2 top-1.5 text-[10px] text-slate-400 font-mono">SAR</span>
                          </div>
                        </td>

                        <td className="py-2.5 px-3 text-center font-mono">
                          <div className="font-black text-xs text-slate-700">
                            {(parseFloat(newRangeDraft.roomPriceSAR) || 0) + (parseFloat(newRangeDraft.foodPriceSAR) || 0)} <span className="text-[10px] text-slate-400 font-sans">SAR</span>
                          </div>
                        </td>

                        <td className="py-2 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleAddNewDateRange('madinah', currentActiveMadinahHotel.id)}
                            disabled={!newRangeDraft.startDate || !newRangeDraft.endDate}
                            className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer flex items-center gap-1 mx-auto hover:scale-105 active:scale-95"
                          >
                            <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
                            <span>Kaydet</span>
                          </button>
                        </td>
                      </tr>

                    </tbody>
                  </table>
                </div>
              </div>
            )}

          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════
            SECTION 3: TRANSFERS & ROUTES TABLE (İsim ve Fiyat Girişli)
           ═══════════════════════════════════════════════════════════ */}
        {activeSection === 'transfers' && (
          <div className="pearl-card rounded-3xl bg-white border border-slate-200/90 shadow-sm overflow-hidden animate-fade-scale">
            <div className="p-4 bg-slate-50/80 border-b border-slate-200/90 flex items-center gap-2">
              <Bus className="h-4 w-4 text-emerald-600" />
              <div>
                <span className="text-xs font-bold text-slate-800 block">
                  {localPkg.name} • Transfer Güzergâhları, Araç İsimleri & Ücretleri
                </span>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Her güzergah için küçük ve büyük araç isimlerini (Örn: Sedan Taksi, VIP GMC, HiAce Minibüs) ve toplam araç ücretlerini belirleyin.
                </p>
              </div>
            </div>

            <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-5">
              
              {/* 1. Cidde - Mekke */}
              <div className="p-4 rounded-3xl bg-slate-50/90 border border-slate-200/90 space-y-4 shadow-3xs">
                <div className="font-extrabold text-xs text-slate-900 flex items-center gap-2 border-b border-slate-200 pb-2.5">
                  <div className="p-1.5 rounded-xl bg-emerald-100 text-emerald-700">
                    <Car className="h-4 w-4" />
                  </div>
                  <span>Cidde - Mekke Otel Transferi</span>
                </div>

                {/* Küçük Araç */}
                <div className="p-3 bg-white rounded-2xl border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-extrabold text-slate-700">Küçük Araç</span>
                    <span className="text-[10px] text-slate-400 font-medium">Binek / Sedan / GMC</span>
                  </div>
                  <div className="space-y-1.5">
                    <div>
                      <label className="text-[10px] text-slate-500 block">Araç Modeli / İsmi:</label>
                      <input
                        type="text"
                        placeholder="Örn: Sedan Taksi (Camry / Sonata)"
                        value={localPkg.transfers?.jedMekSmallLabel !== undefined ? localPkg.transfers.jedMekSmallLabel : (localPkg.id.includes('luxe') ? 'VIP GMC Yukon / Tahoe' : 'Sedan Taksi (Camry)')}
                        onChange={(e) => handleTransferChange('jedMekSmallLabel', e.target.value, true)}
                        className="w-full bg-slate-50 text-slate-900 font-bold text-xs rounded-xl px-2.5 py-1.5 border border-slate-300 focus:outline-none focus:border-emerald-600 focus:bg-white transition-all shadow-3xs"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 block">Araç Toplam Ücreti:</label>
                      <div className="relative">
                        <input
                          type="number"
                          value={localPkg.transfers?.jedMekSmall || 200}
                          onFocus={(e) => e.target.select()}
                          onChange={(e) => handleTransferChange('jedMekSmall', e.target.value)}
                          className="w-full bg-slate-50 font-mono font-black text-xs rounded-xl px-2.5 py-1.5 border border-slate-300 focus:outline-none focus:border-emerald-600 focus:bg-white text-right pr-9 shadow-3xs"
                        />
                        <span className="absolute right-2.5 top-1.5 text-[10px] text-slate-400 font-mono">SAR</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Büyük Araç */}
                <div className="p-3 bg-white rounded-2xl border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-extrabold text-slate-700">Büyük Araç</span>
                    <span className="text-[10px] text-slate-400 font-medium">Minibüs / Otobüs</span>
                  </div>
                  <div className="space-y-1.5">
                    <div>
                      <label className="text-[10px] text-slate-500 block">Araç Modeli / İsmi:</label>
                      <input
                        type="text"
                        placeholder="Örn: HiAce Minibüs (10 Kişilik)"
                        value={localPkg.transfers?.jedMekBigLabel !== undefined ? localPkg.transfers.jedMekBigLabel : (localPkg.id.includes('luxe') ? 'Mercedes VIP Sprinter' : 'HiAce Minibüs / Otobüs')}
                        onChange={(e) => handleTransferChange('jedMekBigLabel', e.target.value, true)}
                        className="w-full bg-slate-50 text-slate-900 font-bold text-xs rounded-xl px-2.5 py-1.5 border border-slate-300 focus:outline-none focus:border-emerald-600 focus:bg-white transition-all shadow-3xs"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 block">Araç Toplam Ücreti:</label>
                      <div className="relative">
                        <input
                          type="number"
                          value={localPkg.transfers?.jedMekBig || 800}
                          onFocus={(e) => e.target.select()}
                          onChange={(e) => handleTransferChange('jedMekBig', e.target.value)}
                          className="w-full bg-slate-50 font-mono font-black text-xs rounded-xl px-2.5 py-1.5 border border-slate-300 focus:outline-none focus:border-emerald-600 focus:bg-white text-right pr-9 shadow-3xs"
                        />
                        <span className="absolute right-2.5 top-1.5 text-[10px] text-slate-400 font-mono">SAR</span>
                      </div>
                    </div>
                  </div>
                </div>

              </div>

              {/* 2. Mekke - Medine */}
              <div className="p-4 rounded-3xl bg-slate-50/90 border border-slate-200/90 space-y-4 shadow-3xs">
                <div className="font-extrabold text-xs text-slate-900 flex items-center gap-2 border-b border-slate-200 pb-2.5">
                  <div className="p-1.5 rounded-xl bg-emerald-100 text-emerald-700">
                    <Car className="h-4 w-4" />
                  </div>
                  <span>Mekke - Medine Transfer</span>
                </div>

                {/* Küçük Araç */}
                <div className="p-3 bg-white rounded-2xl border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-extrabold text-slate-700">Küçük Araç</span>
                    <span className="text-[10px] text-slate-400 font-medium">Binek / Sedan / GMC</span>
                  </div>
                  <div className="space-y-1.5">
                    <div>
                      <label className="text-[10px] text-slate-500 block">Araç Modeli / İsmi:</label>
                      <input
                        type="text"
                        placeholder="Örn: Sedan Taksi (Camry / Sonata)"
                        value={localPkg.transfers?.mekMedSmallLabel !== undefined ? localPkg.transfers.mekMedSmallLabel : (localPkg.id.includes('luxe') ? 'VIP GMC Yukon / Tahoe' : 'Sedan Taksi (Camry)')}
                        onChange={(e) => handleTransferChange('mekMedSmallLabel', e.target.value, true)}
                        className="w-full bg-slate-50 text-slate-900 font-bold text-xs rounded-xl px-2.5 py-1.5 border border-slate-300 focus:outline-none focus:border-emerald-600 focus:bg-white transition-all shadow-3xs"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 block">Araç Toplam Ücreti:</label>
                      <div className="relative">
                        <input
                          type="number"
                          value={localPkg.transfers?.mekMedSmall || 500}
                          onFocus={(e) => e.target.select()}
                          onChange={(e) => handleTransferChange('mekMedSmall', e.target.value)}
                          className="w-full bg-slate-50 font-mono font-black text-xs rounded-xl px-2.5 py-1.5 border border-slate-300 focus:outline-none focus:border-emerald-600 focus:bg-white text-right pr-9 shadow-3xs"
                        />
                        <span className="absolute right-2.5 top-1.5 text-[10px] text-slate-400 font-mono">SAR</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Büyük Araç */}
                <div className="p-3 bg-white rounded-2xl border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-extrabold text-slate-700">Büyük Araç</span>
                    <span className="text-[10px] text-slate-400 font-medium">Minibüs / Otobüs</span>
                  </div>
                  <div className="space-y-1.5">
                    <div>
                      <label className="text-[10px] text-slate-500 block">Araç Modeli / İsmi:</label>
                      <input
                        type="text"
                        placeholder="Örn: HiAce Minibüs (10 Kişilik)"
                        value={localPkg.transfers?.mekMedBigLabel !== undefined ? localPkg.transfers.mekMedBigLabel : (localPkg.id.includes('luxe') ? 'Mercedes VIP Sprinter' : 'HiAce Minibüs / Otobüs')}
                        onChange={(e) => handleTransferChange('mekMedBigLabel', e.target.value, true)}
                        className="w-full bg-slate-50 text-slate-900 font-bold text-xs rounded-xl px-2.5 py-1.5 border border-slate-300 focus:outline-none focus:border-emerald-600 focus:bg-white transition-all shadow-3xs"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 block">Araç Toplam Ücreti:</label>
                      <div className="relative">
                        <input
                          type="number"
                          value={localPkg.transfers?.mekMedBig || 800}
                          onFocus={(e) => e.target.select()}
                          onChange={(e) => handleTransferChange('mekMedBig', e.target.value)}
                          className="w-full bg-slate-50 font-mono font-black text-xs rounded-xl px-2.5 py-1.5 border border-slate-300 focus:outline-none focus:border-emerald-600 focus:bg-white text-right pr-9 shadow-3xs"
                        />
                        <span className="absolute right-2.5 top-1.5 text-[10px] text-slate-400 font-mono">SAR</span>
                      </div>
                    </div>
                  </div>
                </div>

              </div>

              {/* 3. Medine - Havalimanı */}
              <div className="p-4 rounded-3xl bg-slate-50/90 border border-slate-200/90 space-y-4 shadow-3xs">
                <div className="font-extrabold text-xs text-slate-900 flex items-center gap-2 border-b border-slate-200 pb-2.5">
                  <div className="p-1.5 rounded-xl bg-emerald-100 text-emerald-700">
                    <Car className="h-4 w-4" />
                  </div>
                  <span>Medine - Havalimanı Transferi</span>
                </div>

                {/* Küçük Araç */}
                <div className="p-3 bg-white rounded-2xl border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-extrabold text-slate-700">Küçük Araç</span>
                    <span className="text-[10px] text-slate-400 font-medium">Binek / Sedan / GMC</span>
                  </div>
                  <div className="space-y-1.5">
                    <div>
                      <label className="text-[10px] text-slate-500 block">Araç Modeli / İsmi:</label>
                      <input
                        type="text"
                        placeholder="Örn: Sedan Taksi (Camry / Sonata)"
                        value={localPkg.transfers?.medAirSmallLabel !== undefined ? localPkg.transfers.medAirSmallLabel : (localPkg.id.includes('luxe') ? 'VIP GMC Yukon / Tahoe' : 'Sedan Taksi (Camry)')}
                        onChange={(e) => handleTransferChange('medAirSmallLabel', e.target.value, true)}
                        className="w-full bg-slate-50 text-slate-900 font-bold text-xs rounded-xl px-2.5 py-1.5 border border-slate-300 focus:outline-none focus:border-emerald-600 focus:bg-white transition-all shadow-3xs"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 block">Araç Toplam Ücreti:</label>
                      <div className="relative">
                        <input
                          type="number"
                          value={localPkg.transfers?.medAirSmall || 100}
                          onFocus={(e) => e.target.select()}
                          onChange={(e) => handleTransferChange('medAirSmall', e.target.value)}
                          className="w-full bg-slate-50 font-mono font-black text-xs rounded-xl px-2.5 py-1.5 border border-slate-300 focus:outline-none focus:border-emerald-600 focus:bg-white text-right pr-9 shadow-3xs"
                        />
                        <span className="absolute right-2.5 top-1.5 text-[10px] text-slate-400 font-mono">SAR</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Büyük Araç */}
                <div className="p-3 bg-white rounded-2xl border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-extrabold text-slate-700">Büyük Araç</span>
                    <span className="text-[10px] text-slate-400 font-medium">Minibüs / Otobüs</span>
                  </div>
                  <div className="space-y-1.5">
                    <div>
                      <label className="text-[10px] text-slate-500 block">Araç Modeli / İsmi:</label>
                      <input
                        type="text"
                        placeholder="Örn: HiAce Minibüs (10 Kişilik)"
                        value={localPkg.transfers?.medAirBigLabel !== undefined ? localPkg.transfers.medAirBigLabel : (localPkg.id.includes('luxe') ? 'Mercedes VIP Sprinter' : 'HiAce Minibüs / Otobüs')}
                        onChange={(e) => handleTransferChange('medAirBigLabel', e.target.value, true)}
                        className="w-full bg-slate-50 text-slate-900 font-bold text-xs rounded-xl px-2.5 py-1.5 border border-slate-300 focus:outline-none focus:border-emerald-600 focus:bg-white transition-all shadow-3xs"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 block">Araç Toplam Ücreti:</label>
                      <div className="relative">
                        <input
                          type="number"
                          value={localPkg.transfers?.medAirBig || 800}
                          onFocus={(e) => e.target.select()}
                          onChange={(e) => handleTransferChange('medAirBig', e.target.value)}
                          className="w-full bg-slate-50 font-mono font-black text-xs rounded-xl px-2.5 py-1.5 border border-slate-300 focus:outline-none focus:border-emerald-600 focus:bg-white text-right pr-9 shadow-3xs"
                        />
                        <span className="absolute right-2.5 top-1.5 text-[10px] text-slate-400 font-mono">SAR</span>
                      </div>
                    </div>
                  </div>
                </div>

              </div>

            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════
            SECTION 4: DYNAMIC FIXED EXPENSES (DAHİLİ HİZMETLER HAVUZU)
           ═══════════════════════════════════════════════════════════ */}
        {activeSection === 'expenses' && (
          <div className="pearl-card rounded-3xl bg-white border border-slate-200/90 shadow-sm overflow-hidden animate-fade-scale">
            
            {/* Header & Add Button */}
            <div className="p-4 bg-slate-50/80 border-b border-slate-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-emerald-100 text-emerald-700">
                  <Coins className="h-4 w-4" />
                </div>
                <div>
                  <span className="text-xs font-black text-slate-900 block">
                    {localPkg.name} • Dahili Hizmetler & Sabit Giderler Havuzu
                  </span>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Personelin teklif ekranında göreceği dahili hizmetleri yönetin, fiyat belirleyin veya switch ile gösterip gizleyin.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setExpenseFormOpen(!expenseFormOpen)}
                className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 self-start sm:self-auto hover:scale-105 active:scale-95 shrink-0"
              >
                {expenseFormOpen ? (
                  <>
                    <X className="h-3.5 w-3.5" />
                    <span>Formu Kapat</span>
                  </>
                ) : (
                  <>
                    <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
                    <span>Yeni Dahili Hizmet Ekle</span>
                  </>
                )}
              </button>
            </div>

            {/* INLINE ADD NEW EXPENSE FORM */}
            {expenseFormOpen && (
              <form
                ref={expenseFormRef}
                onSubmit={handleAddNewExpense}
                className="p-5 bg-gradient-to-br from-emerald-50/70 via-teal-50/40 to-slate-50 border-b border-emerald-200/80 space-y-4 animate-scale-in"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-emerald-700" />
                    <span className="text-xs font-extrabold text-emerald-950">Yeni Dahili Hizmet / Sabit Gider Ekle</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-medium">* Zorunlu Alanlar</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                  {/* Hizmet Adı */}
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">Hizmet / Gider Adı *</label>
                    <input
                      type="text"
                      required
                      placeholder="Örn: Hızlı Tren Bileti / Özel Rehber"
                      value={newExpenseDraft.name}
                      onChange={(e) => setNewExpenseDraft({ ...newExpenseDraft, name: e.target.value })}
                      className="w-full bg-white text-slate-900 font-bold text-xs rounded-xl px-3 py-2 border border-emerald-300 focus:outline-none focus:border-emerald-600 shadow-3xs"
                    />
                  </div>

                  {/* Açıklama */}
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">Kısa Açıklama</label>
                    <input
                      type="text"
                      placeholder="Örn: Mekke - Medine VIP Hızlı Tren Geçişi"
                      value={newExpenseDraft.desc}
                      onChange={(e) => setNewExpenseDraft({ ...newExpenseDraft, desc: e.target.value })}
                      className="w-full bg-white text-slate-900 font-medium text-xs rounded-xl px-3 py-2 border border-slate-300 focus:outline-none focus:border-emerald-600 shadow-3xs"
                    />
                  </div>

                  {/* Fiyat SAR */}
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">Kişi Başı Ücret (SAR) *</label>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        step="5"
                        placeholder="0"
                        value={newExpenseDraft.priceSAR}
                        onChange={(e) => setNewExpenseDraft({ ...newExpenseDraft, priceSAR: e.target.value })}
                        className="w-full bg-white font-mono font-black text-xs text-slate-900 rounded-xl px-3 py-2 border border-emerald-300 focus:outline-none focus:border-emerald-600 text-right pr-9 shadow-3xs"
                      />
                      <span className="absolute right-2.5 top-2 text-[10px] text-slate-400 font-mono">SAR</span>
                    </div>
                  </div>

                  {/* Görünürlük Switch & Kaydet Butonu */}
                  <div className="flex items-end gap-2">
                    <button
                      type="button"
                      onClick={() => setNewExpenseDraft({ ...newExpenseDraft, isVisible: !newExpenseDraft.isVisible })}
                      className={`flex-1 py-2 px-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-3xs ${
                        newExpenseDraft.isVisible
                          ? 'bg-emerald-100 border-emerald-400 text-emerald-800'
                          : 'bg-slate-100 border-slate-300 text-slate-500'
                      }`}
                      title="Teklif formunda gösterilsin mi?"
                    >
                      <span className={`h-2 w-2 rounded-full ${newExpenseDraft.isVisible ? 'bg-emerald-600 animate-pulse' : 'bg-slate-400'}`} />
                      <span>{newExpenseDraft.isVisible ? 'Teklifte Göster' : 'Gizli'}</span>
                    </button>

                    <button
                      type="submit"
                      className="px-4 py-2 bg-emerald-800 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-xs transition-all cursor-pointer hover:scale-105 active:scale-95 shrink-0"
                    >
                      Ekle
                    </button>
                  </div>
                </div>
              </form>
            )}

            {/* EXPENSES GRID CARDS */}
            <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {(localPkg.fixedExpensesList || []).map((exp) => {
                const isVis = exp.isVisible !== false;

                return (
                  <div
                    key={exp.id}
                    className={`p-4 rounded-3xl border transition-all duration-300 relative group flex flex-col justify-between gap-3 ${
                      isVis
                        ? 'bg-white border-slate-200/90 shadow-3xs hover:border-emerald-300 hover:shadow-xs'
                        : 'bg-slate-50/70 border-dashed border-slate-300 opacity-60 hover:opacity-100'
                    }`}
                  >
                    {/* Üst Kısım: Başlık, Açıklama ve Sil Butonu */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1 pr-1">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-xs text-slate-900 block leading-tight">
                            {exp.name}
                          </span>
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                            isVis
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : 'bg-slate-200 text-slate-600 border border-slate-300'
                          }`}>
                            {isVis ? 'Teklifte Açık' : 'Gizli'}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400 line-clamp-2 leading-relaxed">
                          {exp.desc}
                        </p>
                      </div>

                      {/* Sil Butonu */}
                      <button
                        type="button"
                        onClick={() => handleDeleteExpense(exp.id, exp.name)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all cursor-pointer shrink-0 opacity-80 hover:opacity-100"
                        title="Bu Hizmeti Listeden Sil"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    {/* Alt Kısım: Fiyat Girişi + Görünürlük Switch'i */}
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-3">
                      
                      {/* Switch: Teklifte Göster / Gizle */}
                      <div className="flex items-center gap-2 select-none">
                        <button
                          type="button"
                          onClick={() => handleToggleExpenseVisibility(exp.id)}
                          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                            isVis ? 'bg-emerald-600' : 'bg-slate-300'
                          }`}
                          role="switch"
                          aria-checked={isVis}
                          title={isVis ? 'Teklif formunda aktif (Gizlemek için tıklayın)' : 'Teklif formunda gizli (Göstermek için tıklayın)'}
                        >
                          <span
                            aria-hidden="true"
                            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                              isVis ? 'translate-x-4' : 'translate-x-0'
                            }`}
                          />
                        </button>
                        <span className="text-[10px] font-bold text-slate-500">
                          {isVis ? 'Teklifte Göster' : 'Teklifte Gizle'}
                        </span>
                      </div>

                      {/* Fiyat Giriş Kutusu */}
                      <div className="relative w-28 shrink-0">
                        <input
                          type="number"
                          min="0"
                          step="5"
                          value={exp.priceSAR !== undefined ? exp.priceSAR : 0}
                          onFocus={(e) => e.target.select()}
                          onChange={(e) => handleUpdateExpensePrice(exp.id, e.target.value)}
                          className="w-full bg-slate-50 font-mono font-black text-xs text-slate-900 rounded-xl px-2.5 py-1.5 border border-slate-300 focus:outline-none focus:border-emerald-600 focus:bg-white text-right pr-8 shadow-3xs"
                        />
                        <span className="absolute right-2 top-1.5 text-[10px] text-slate-400 font-mono">SAR</span>
                      </div>

                    </div>

                  </div>
                );
              })}
            </div>

          </div>
        )}

      </div>

      {/* ═══════════════════════════════════════════════════════════
          FLOATING STICKY SAVE BUTTON (Sağ Alt Köşe)
         ═══════════════════════════════════════════════════════════ */}
      <div className="fixed bottom-6 right-6 z-[60]">
        <button
          type="button"
          onClick={handleSaveAll}
          className={`flex items-center gap-2.5 px-7 py-3.5 rounded-2xl font-black text-sm shadow-2xl transition-all cursor-pointer border ${
            isSaved
              ? 'bg-emerald-600 text-white border-emerald-400 shadow-emerald-600/50 scale-105'
              : 'bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white border-emerald-300/40 shadow-emerald-900/40 hover:scale-105 active:scale-95'
          }`}
        >
          {isSaved ? (
            <>
              <CheckCircle2 className="h-5 w-5 text-white animate-scale-in" />
              <span>Başarıyla Kaydedildi!</span>
            </>
          ) : (
            <>
              <Save className="h-5 w-5 stroke-[2.5]" />
              <span>Tüm Değişiklikleri Kaydet</span>
            </>
          )}
        </button>
      </div>

    </div>
  );
}
