import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { useModal } from '../../context/ModalContext';
import CustomSelect from '../common/CustomSelect';
import { 
  Calendar, 
  Bed, 
  Bus, 
  Coins, 
  TrendingUp, 
  Save, 
  RotateCcw,
  CheckCircle2,
  Moon,
  Clock,
  RefreshCw,
  Utensils,
  Car,
  FileSpreadsheet,
  Layers,
  Percent,
  DollarSign,
  Building2,
  ShieldCheck,
  Sparkles
} from 'lucide-react';
import confetti from 'canvas-confetti';

const EXPENSE_LABELS = {
  flightTicketSAR: { name: 'Uçak Bileti', desc: 'Gidiş-Dönüş Tarifeli/Charter Uçuş Bedeli' },
  visaTaxSAR: { name: 'Vize + Vergi', desc: 'Suudi Arabistan Elektronik Umre Vizesi ve Harçlar' },
  insuranceSAR: { name: 'Sigorta', desc: 'Kapsamlı Yurt Dışı Seyahat ve Sağlık Sigortası' },
  bagSAR: { name: 'Çanta', desc: 'Kurumsal Hac & Umre Valiz / Çanta Seti' },
  scarfSAR: { name: 'Fular / Eşarp', desc: 'Grup Tanıtım ve Rehberlik Fuları/Eşarbı' },
  guideSAR: { name: 'Fri / Görevli', desc: 'Diyanet / Rehber Hoca ve Görevli Operasyon Payı' },
  commissionSAR: { name: 'Komisyon', desc: 'Acente & Temsilci Satış Komisyon Havuzu' },
  bonusSAR: { name: 'Prim', desc: 'Operasyon ve Satış Ekibi Başarı Primi' },
  zamzamSAR: { name: 'Zemzem', desc: '5 Litre Orijinal Ambalajlı Diyanet/Kudret Zemzemi' },
  branchExpenseSAR: { name: 'Şube Giderleri', desc: 'Şube ve İdari Genel Gider Payı' },
};

export default function MonthlyMatrixManager() {
  const { 
    packages, 
    currencies, 
    months, 
    currencyStatus,
    refreshLiveCurrencies,
    updatePackage, 
    updateCurrencies, 
    updateMonths,
    setSpecialPeriod, 
    resetAllData 
  } = useData();
  const { showConfirm } = useModal();

  const sortedPackages = [...packages].sort((a, b) => {
    const order = { 'ekonomik': 1, 'standart': 2, 'luxe': 3, 'vip': 3 };
    return (order[a.id] || 99) - (order[b.id] || 99);
  });

  const [selectedPkgId, setSelectedPkgId] = useState(packages.find(p => p.id === 'ekonomik')?.id || packages[0]?.id || 'ekonomik');
  const [localPkg, setLocalPkg] = useState(() => packages.find(p => p.id === selectedPkgId) || packages[0]);
  const [localMonths, setLocalMonths] = useState(() => [...months]);
  const [localCurrencies, setLocalCurrencies] = useState({ ...currencies });
  const [viewCurrency, setViewCurrency] = useState('SAR'); // 'SAR' | 'USD' | 'TRY' | 'EUR'
  const [isSaved, setIsSaved] = useState(false);
  const [activeSection, setActiveSection] = useState('hotels'); // 'hotels' | 'transfers' | 'expenses'
  const [pkgSlideDirection, setPkgSlideDirection] = useState('right'); // 'right' | 'left'
  const [tabSlideDirection, setTabSlideDirection] = useState('right'); // 'right' | 'left'

  // Update localMonths when external months change
  React.useEffect(() => {
    setLocalMonths([...months]);
  }, [months]);

  const handleSelectPackage = (pkgId) => {
    const pkgOrderMap = { 'ekonomik': 0, 'standart': 1, 'luxe': 2, 'vip': 2 };
    const currentIdx = pkgOrderMap[selectedPkgId] ?? 0;
    const targetIdx = pkgOrderMap[pkgId] ?? 0;

    if (targetIdx < currentIdx) {
      setPkgSlideDirection('left'); // Geriye (sola) geçiş: Yeni sayfa SOLDAN sağa doğru kayar
    } else if (targetIdx > currentIdx) {
      setPkgSlideDirection('right'); // İleriye (sağa) geçiş: Yeni sayfa SAĞDAN sola doğru kayar
    }

    setSelectedPkgId(pkgId);
    const found = packages.find(p => p.id === pkgId);
    if (found) {
      setLocalPkg({ ...found });
    }
  };

  const handleSelectSection = (sectionId) => {
    const sectionOrderMap = { 'hotels': 0, 'transfers': 1, 'expenses': 2 };
    const currentIdx = sectionOrderMap[activeSection] ?? 0;
    const targetIdx = sectionOrderMap[sectionId] ?? 0;

    if (targetIdx < currentIdx) {
      setTabSlideDirection('left');
    } else if (targetIdx > currentIdx) {
      setTabSlideDirection('right');
    }
    setActiveSection(sectionId);
  };

  const handleMonthRateChange = (monthId, field, value) => {
    const val = parseFloat(value) || 0;
    setLocalPkg(prev => ({
      ...prev,
      monthlyPrices: {
        ...prev.monthlyPrices,
        [monthId]: {
          ...(prev.monthlyPrices?.[monthId] || {}),
          [field]: val
        }
      }
    }));
  };

  const handleMonthDetailChange = (monthId, field, value) => {
    setLocalMonths(prev => prev.map(m => {
      if (m.id !== monthId) return m;
      if (field === 'badge') {
        const isPeak = value === 'Yoğun Sezon' || value === 'Ramazan Özel' || value === 'Sömestr';
        const badge = value === 'Standart' ? null : value;
        return { ...m, badge, isPeak, subtitle: value };
      }
      return { ...m, [field]: value };
    }));
  };

  const handleTransferChange = (field, value) => {
    const val = parseFloat(value) || 0;
    setLocalPkg(prev => ({
      ...prev,
      transfers: {
        ...prev.transfers,
        [field]: val
      }
    }));
  };

  const handleFixedExpenseChange = (field, value) => {
    const val = parseFloat(value) || 0;
    setLocalPkg(prev => ({
      ...prev,
      fixedExpenses: {
        ...prev.fixedExpenses,
        [field]: val
      }
    }));
  };

  const handleSaveAll = () => {
    updatePackage(localPkg.id, localPkg, `${localPkg.name} verileri ve parametreleri güncellendi.`);
    updateMonths(localMonths, '12 Aylık sezon notları ve dönem tipleri güncellendi.');
    updateCurrencies(localCurrencies, 'Döviz kurları ve kâr marjı güncellendi.');

    setIsSaved(true);
    confetti({
      particleCount: 60,
      spread: 60,
      origin: { y: 0.6 }
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

  const ramadanMonth = localMonths.find(m => m.badge === 'Ramazan Özel') || localMonths.find(m => m.id === 'apr') || localMonths[3];
  const shawwalMonth = localMonths.find(m => m.badge === 'Şevval') || localMonths.find(m => m.id === 'may') || localMonths[4];



  return (
    <div className="space-y-6 pb-20 font-sans">
      
      {/* 1. Apple-Card Royal Emerald Top Banner */}
      <div className="pearl-card rounded-3xl p-6 sm:p-8 bg-gradient-to-r from-emerald-900 via-emerald-850 to-emerald-950 text-white shadow-xl border border-emerald-700/40 relative overflow-hidden backdrop-blur-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-800/80 px-3.5 py-1 text-[11px] font-bold text-emerald-200 border border-emerald-700/60 shadow-2xs">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>GENEL MERKEZ YÖNETİM PANELİ</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black font-display tracking-tight text-white">
              Veri Giriş Merkezi
            </h2>
            <p className="text-xs sm:text-sm text-emerald-100/90 max-w-2xl font-medium">
              12 aylık Mekke/Medine otel ve yemek maliyetlerini, sezon notlarını, paket kâr oranlarını ve takvim parametrelerini yönetin.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={handleSaveAll}
              className="flex items-center gap-2 rounded-2xl bg-emerald-500 hover:bg-emerald-400 px-6 py-3 text-xs font-black text-slate-950 shadow-lg shadow-emerald-950/40 transition-all cursor-pointer hover:scale-102 active:scale-98"
            >
              {isSaved ? <CheckCircle2 className="h-4 w-4 text-slate-950" /> : <Save className="h-4 w-4 text-slate-950" />}
              <span>{isSaved ? 'Kaydedildi!' : 'Tüm Değişiklikleri Kaydet'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Apple-Pill Full-Width Package Ribbon (Sadece Paket Adları, Ferah Gradientli) */}
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

      {/* PAKET DEĞİŞİMİNDE TÜM BU ALAN (KARTLAR + BÖLÜM MENÜSÜ + TABLOLAR) YANA KAYAR */}
      <div 
        key={selectedPkgId} 
        className={`${pkgSlideDirection === 'left' ? 'animate-slide-from-left' : 'animate-slide-from-right'} space-y-6`}
      >

        {/* 3. Package Hotel Metadata Header (3 Clean Cards) */}
        <div className="pearl-card rounded-3xl p-5 bg-white border border-slate-200/90 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
              <Bed className="h-4 w-4 text-emerald-600" />
              <span>{localPkg.name} - Otel Standartları & Kâr Oranı</span>
            </h3>
            <span className="text-[11px] font-mono text-slate-400 font-bold bg-slate-100 px-2 py-0.5 rounded-full">
              KOD: {localPkg.code || 'PKG'}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* Mekke Hotel */}
            <div className="bg-slate-50/90 p-3.5 rounded-2xl border border-slate-200 space-y-1.5 transition-all hover:border-slate-300">
              <label className="text-[11px] font-bold text-slate-700 flex items-center justify-between">
                <span>🕋 Mekke Oteli & Bilgileri</span>
                <span className="text-[10px] text-emerald-700 font-semibold">PDF'te Gözükür</span>
              </label>
              <input
                type="text"
                value={localPkg.hotelMakkah || ''}
                onChange={(e) => setLocalPkg({ ...localPkg, hotelMakkah: e.target.value })}
                placeholder="Otel adı... (Örn: Merkez Otel)"
                className="w-full bg-white font-semibold text-slate-900 rounded-xl px-3 py-1.5 border border-slate-300 focus:outline-none focus:border-emerald-600 text-xs shadow-2xs"
              />
              <input
                type="text"
                value={localPkg.distanceMakkah || ''}
                onChange={(e) => setLocalPkg({ ...localPkg, distanceMakkah: e.target.value })}
                placeholder="Mesafe... (Örn: 1200m Ring Servis)"
                className="w-full bg-white text-slate-600 rounded-xl px-3 py-1 border border-slate-200 focus:outline-none focus:border-emerald-600 text-[11px]"
              />
              <input
                type="text"
                value={localPkg.mealMakkah || ''}
                onChange={(e) => setLocalPkg({ ...localPkg, mealMakkah: e.target.value })}
                placeholder="Yemek Durumu (Örn: Sabah & Akşam Açık Büfe)"
                className="w-full bg-emerald-50/60 font-medium text-emerald-900 rounded-xl px-3 py-1 border border-emerald-300/80 focus:outline-none focus:border-emerald-600 text-[11px]"
              />
            </div>

            {/* Medine Hotel */}
            <div className="bg-slate-50/90 p-3.5 rounded-2xl border border-slate-200 space-y-1.5 transition-all hover:border-slate-300">
              <label className="text-[11px] font-bold text-slate-700 flex items-center justify-between">
                <span>🕌 Medine Oteli & Bilgileri</span>
                <span className="text-[10px] text-emerald-700 font-semibold">PDF'te Gözükür</span>
              </label>
              <input
                type="text"
                value={localPkg.hotelMadinah || ''}
                onChange={(e) => setLocalPkg({ ...localPkg, hotelMadinah: e.target.value })}
                placeholder="Otel adı... (Örn: Al Eiman Taibah)"
                className="w-full bg-white font-semibold text-slate-900 rounded-xl px-3 py-1.5 border border-slate-300 focus:outline-none focus:border-emerald-600 text-xs shadow-2xs"
              />
              <input
                type="text"
                value={localPkg.distanceMadinah || ''}
                onChange={(e) => setLocalPkg({ ...localPkg, distanceMadinah: e.target.value })}
                placeholder="Mesafe... (Örn: 350m Yürüme Mesafesi)"
                className="w-full bg-white text-slate-600 rounded-xl px-3 py-1 border border-slate-200 focus:outline-none focus:border-emerald-600 text-[11px]"
              />
              <input
                type="text"
                value={localPkg.mealMadinah || ''}
                onChange={(e) => setLocalPkg({ ...localPkg, mealMadinah: e.target.value })}
                placeholder="Yemek Durumu (Örn: Sabah & Akşam Açık Büfe)"
                className="w-full bg-emerald-50/60 font-medium text-emerald-900 rounded-xl px-3 py-1 border border-emerald-300/80 focus:outline-none focus:border-emerald-600 text-[11px]"
              />
            </div>

            {/* Profit Margin */}
            <div className="bg-amber-50/70 p-3.5 rounded-2xl border border-amber-200 space-y-1.5 transition-all hover:border-amber-300">
              <label className="text-[11px] font-bold text-amber-950 flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <TrendingUp className="h-3.5 w-3.5 text-amber-600" />
                  <span>Paket Kâr Oranı (%)</span>
                </span>
                <span className="text-[10px] text-amber-800 font-normal">Teklife eklenir</span>
              </label>
              <div className="flex items-center gap-1.5 pt-0.5">
                <span className="text-xs font-bold text-amber-900">%</span>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={localPkg.profitMargin !== undefined ? localPkg.profitMargin : 15}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => setLocalPkg({ ...localPkg, profitMargin: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-white font-mono font-black text-center text-amber-950 rounded-xl px-2 py-1.5 border border-amber-300 focus:outline-none focus:border-emerald-600 text-sm shadow-2xs"
                />
              </div>
              <p className="text-[10px] text-amber-800/80">Personel karlı fiyatı görür.</p>
            </div>

          </div>
        </div>

        {/* 4. Section Navigation Pills - TAM ORTALI, FERAH GRADİENTLİ VE ŞIK BAR */}
        <div className="flex justify-center my-4 overflow-visible">
          <div className="w-full max-w-4xl flex items-center justify-center p-1.5 bg-slate-100/90 rounded-full border border-slate-200/90 shadow-sm backdrop-blur-md gap-2">
            <button
              type="button"
              onClick={() => handleSelectSection('hotels')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 text-xs font-extrabold rounded-full spring-pill transition-all cursor-pointer select-none ${
                activeSection === 'hotels' 
                  ? 'bg-gradient-to-r from-emerald-700 to-emerald-800 text-white shadow-md shadow-emerald-800/30 border border-emerald-600/40 scale-101 ring-2 ring-emerald-600/20' 
                  : 'text-slate-600 hover:bg-white/80 hover:text-slate-950'
              }`}
            >
              <Calendar className="h-4 w-4" />
              <span>Otel & Yemek Fiyatları (SAR)</span>
            </button>

            <button
              type="button"
              onClick={() => handleSelectSection('transfers')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 text-xs font-extrabold rounded-full spring-pill transition-all cursor-pointer select-none ${
                activeSection === 'transfers' 
                  ? 'bg-gradient-to-r from-emerald-700 to-emerald-800 text-white shadow-md shadow-emerald-800/30 border border-emerald-600/40 scale-101 ring-2 ring-emerald-600/20' 
                  : 'text-slate-600 hover:bg-white/80 hover:text-slate-950'
              }`}
            >
              <Bus className="h-4 w-4" />
              <span>Transferler & Araç Fiyatları (SAR)</span>
            </button>

            <button
              type="button"
              onClick={() => handleSelectSection('expenses')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 text-xs font-extrabold rounded-full spring-pill transition-all cursor-pointer select-none ${
                activeSection === 'expenses' 
                  ? 'bg-gradient-to-r from-emerald-700 to-emerald-800 text-white shadow-md shadow-emerald-800/30 border border-emerald-600/40 scale-101 ring-2 ring-emerald-600/20' 
                  : 'text-slate-600 hover:bg-white/80 hover:text-slate-950'
              }`}
            >
              <Coins className="h-4 w-4" />
              <span>Sabit Giderler Havuzu (SAR)</span>
            </button>
          </div>
        </div>

        {/* 5. Animated Tables Container - SADECE 3 MENÜYE TIKLANDIĞINDA ALTTAKİ TABLOLAR YANA KAYAR */}
        <div 
          key={activeSection} 
          className={tabSlideDirection === 'left' ? 'animate-slide-from-left' : 'animate-slide-from-right'}
        >
          {activeSection === 'hotels' && (
            <div className="pearl-card rounded-3xl bg-white border border-slate-200/90 shadow-sm overflow-hidden animate-fade-scale">
              {/* Table Header Controls: Package Name + Currency Converter Switcher */}
              <div className="p-4 bg-slate-50/90 border-b border-slate-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="text-xs font-extrabold text-slate-900 block">
                    {localPkg.name} • 12 Aylık Günlük Otel Oda & Yemek Fiyatları Matrisi
                  </span>
              <span className="text-[11px] text-slate-500 font-medium">
                Her ay için Mekke ve Medine'nin otel oda ve günlük yemek fiyatlarını ayrı ayrı belirleyin.
              </span>
            </div>

            {/* 💱 Live Currency Converter Selector */}
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
                  <th className="py-3 px-3">Ay</th>
                  <th className="py-3 px-3 text-center w-44">Sezon Tipi</th>
                  <th className="py-3 px-3 bg-emerald-50/50 text-emerald-950">🕋 Mekke Otel (SAR)</th>
                  <th className="py-3 px-3 bg-emerald-50/50 text-emerald-950">🍽️ Mekke Yemek (SAR)</th>
                  <th className="py-3 px-3 bg-amber-50/50 text-amber-950">🕌 Medine Otel (SAR)</th>
                  <th className="py-3 px-3 bg-amber-50/50 text-amber-950">🍽️ Medine Yemek (SAR)</th>
                  <th className="py-3 px-3 text-center bg-slate-50">Günlük Toplam</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {localMonths.map((m, idx) => {
                  const rates = localPkg.monthlyPrices?.[m.id] || { 
                    makkahRoomSAR: 0, 
                    madinahRoomSAR: 0,
                    makkahFoodSAR: localPkg.makkahFoodPriceSAR || 40,
                    madinahFoodSAR: localPkg.madinahFoodPriceSAR || 45
                  };

                  const makkahRoomVal = rates.makkahRoomSAR || 0;
                  const makkahFoodVal = rates.makkahFoodSAR !== undefined ? rates.makkahFoodSAR : (localPkg.makkahFoodPriceSAR || 0);
                  const madinahRoomVal = rates.madinahRoomSAR || 0;
                  const madinahFoodVal = rates.madinahFoodSAR !== undefined ? rates.madinahFoodSAR : (localPkg.madinahFoodPriceSAR || 0);

                  const totalDailySAR = makkahRoomVal + makkahFoodVal + madinahRoomVal + madinahFoodVal;
                  const isPeak = m.isPeak;

                  return (
                    <tr 
                      key={m.id} 
                      className={`hover:bg-emerald-50/30 transition-colors ${
                        isPeak ? 'bg-amber-50/30' : ''
                      }`}
                    >
                      {/* Index */}
                      <td className="py-2.5 px-3 text-center text-slate-400 font-mono text-[11px]">
                        {idx + 1}
                      </td>

                      {/* Month Name */}
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <div className="font-extrabold text-slate-900 text-xs">{m.name}</div>
                      </td>

                      {/* Editable Season Type Badge */}
                      <td className="py-2 px-3 text-center">
                        <div className="w-40 mx-auto">
                          <CustomSelect
                            value={m.badge || 'Standart'}
                            onChange={(val) => handleMonthDetailChange(m.id, 'badge', val)}
                            options={[
                              { value: 'Standart', label: 'Standart' },
                              { value: 'Sömestr', label: 'Sömestr' },
                              { value: 'Ramazan Özel', label: 'Ramazan Özel' },
                              { value: 'Şevval', label: 'Şevval' },
                              { value: 'Yoğun Sezon', label: 'Yoğun Sezon' }
                            ]}
                            className="text-xs font-bold"
                          />
                        </div>
                      </td>

                      {/* 1. 🕋 Mekke Otel Room SAR */}
                      <td className="py-2 px-3 bg-emerald-50/20">
                        <div className="relative w-28">
                          <input
                            type="number"
                            min="0"
                            step="5"
                            value={makkahRoomVal}
                            onFocus={(e) => e.target.select()}
                            onChange={(e) => handleMonthRateChange(m.id, 'makkahRoomSAR', e.target.value)}
                            className="w-full bg-white font-mono font-bold text-slate-900 rounded-xl px-2.5 py-1 text-xs border border-slate-300 focus:outline-none focus:border-emerald-600 text-right pr-9 shadow-3xs"
                          />
                          <span className="absolute right-2 top-1.5 text-[10px] text-slate-400 font-mono">SAR</span>
                        </div>
                        {viewCurrency !== 'SAR' && (
                          <div className="text-[10px] font-mono text-emerald-800 text-right pr-1 mt-0.5">
                            {formatCurrencyEquivalent(makkahRoomVal)}
                          </div>
                        )}
                      </td>

                      {/* 2. 🍽️ Mekke Yemek SAR */}
                      <td className="py-2 px-3 bg-emerald-50/20">
                        <div className="relative w-24">
                          <input
                            type="number"
                            min="0"
                            step="5"
                            value={makkahFoodVal}
                            onFocus={(e) => e.target.select()}
                            onChange={(e) => handleMonthRateChange(m.id, 'makkahFoodSAR', e.target.value)}
                            className="w-full bg-white font-mono font-bold text-emerald-900 rounded-xl px-2 py-1 text-xs border border-emerald-300 focus:outline-none focus:border-emerald-600 text-right pr-8 shadow-3xs"
                          />
                          <span className="absolute right-2 top-1.5 text-[10px] text-slate-400 font-mono">SAR</span>
                        </div>
                        {viewCurrency !== 'SAR' && (
                          <div className="text-[10px] font-mono text-emerald-800 text-right pr-1 mt-0.5">
                            {formatCurrencyEquivalent(makkahFoodVal)}
                          </div>
                        )}
                      </td>

                      {/* 3. 🕌 Medine Otel Room SAR */}
                      <td className="py-2 px-3 bg-amber-50/20">
                        <div className="relative w-28">
                          <input
                            type="number"
                            min="0"
                            step="5"
                            value={madinahRoomVal}
                            onFocus={(e) => e.target.select()}
                            onChange={(e) => handleMonthRateChange(m.id, 'madinahRoomSAR', e.target.value)}
                            className="w-full bg-white font-mono font-bold text-slate-900 rounded-xl px-2.5 py-1 text-xs border border-slate-300 focus:outline-none focus:border-emerald-600 text-right pr-9 shadow-3xs"
                          />
                          <span className="absolute right-2 top-1.5 text-[10px] text-slate-400 font-mono">SAR</span>
                        </div>
                        {viewCurrency !== 'SAR' && (
                          <div className="text-[10px] font-mono text-amber-800 text-right pr-1 mt-0.5">
                            {formatCurrencyEquivalent(madinahRoomVal)}
                          </div>
                        )}
                      </td>

                      {/* 4. 🍽️ Medine Yemek SAR */}
                      <td className="py-2 px-3 bg-amber-50/20">
                        <div className="relative w-24">
                          <input
                            type="number"
                            min="0"
                            step="5"
                            value={madinahFoodVal}
                            onFocus={(e) => e.target.select()}
                            onChange={(e) => handleMonthRateChange(m.id, 'madinahFoodSAR', e.target.value)}
                            className="w-full bg-white font-mono font-bold text-amber-900 rounded-xl px-2 py-1 text-xs border border-amber-300 focus:outline-none focus:border-emerald-600 text-right pr-8 shadow-3xs"
                          />
                          <span className="absolute right-2 top-1.5 text-[10px] text-slate-400 font-mono">SAR</span>
                        </div>
                        {viewCurrency !== 'SAR' && (
                          <div className="text-[10px] font-mono text-amber-800 text-right pr-1 mt-0.5">
                            {formatCurrencyEquivalent(madinahFoodVal)}
                          </div>
                        )}
                      </td>

                      {/* Total Daily SAR & Equivalent */}
                      <td className="py-2.5 px-3 text-center bg-slate-50/80 font-mono">
                        <div className="font-black text-xs text-slate-900">
                          {totalDailySAR} <span className="text-[10px] text-slate-400 font-sans">SAR</span>
                        </div>
                        {viewCurrency !== 'SAR' && (
                          <div className="text-[10px] font-bold text-emerald-700">
                            {formatCurrencyEquivalent(totalDailySAR)}
                          </div>
                        )}
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. SECTION 2: Transfers & Routes Table */}
      {activeSection === 'transfers' && (
        <div className="pearl-card rounded-3xl bg-white border border-slate-200/90 shadow-sm overflow-hidden animate-fade-scale">
          <div className="p-4 bg-slate-50/80 border-b border-slate-200/90">
            <span className="text-xs font-bold text-slate-800">
              {localPkg.name} • Transfer & Araç Güzergâh Ücretleri
            </span>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Belirtilen tutarlar araç başına toplam bedeldir. Kişi sayısına bölünerek kişi başı maliyete dahil edilir.
            </p>
          </div>

          <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Cidde - Mekke */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                <Car className="h-4 w-4 text-emerald-600" />
                <span>Cidde - Mekke Otel Transferi</span>
              </div>
              <div>
                <label className="text-[10px] text-slate-500 block mb-1">Küçük Araç (Sedan / GMC):</label>
                <div className="relative">
                  <input
                    type="number"
                    value={localPkg.transfers?.jedMekSmall || 200}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => handleTransferChange('jedMekSmall', e.target.value)}
                    className="w-full bg-white font-mono font-bold text-xs rounded-xl px-3 py-2 border border-slate-300 text-right pr-9 shadow-2xs"
                  />
                  <span className="absolute right-2.5 top-2 text-[10px] text-slate-400 font-mono">SAR</span>
                </div>
              </div>
              <div>
                <label className="text-[10px] text-slate-500 block mb-1">Büyük Araç (HiAce / Otobüs):</label>
                <div className="relative">
                  <input
                    type="number"
                    value={localPkg.transfers?.jedMekBig || 800}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => handleTransferChange('jedMekBig', e.target.value)}
                    className="w-full bg-white font-mono font-bold text-xs rounded-xl px-3 py-2 border border-slate-300 text-right pr-9 shadow-2xs"
                  />
                  <span className="absolute right-2.5 top-2 text-[10px] text-slate-400 font-mono">SAR</span>
                </div>
              </div>
            </div>

            {/* Mekke - Medine */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                <Car className="h-4 w-4 text-emerald-600" />
                <span>Mekke - Medine Şehirlerarası Transfer</span>
              </div>
              <div>
                <label className="text-[10px] text-slate-500 block mb-1">Küçük Araç (Sedan / GMC):</label>
                <div className="relative">
                  <input
                    type="number"
                    value={localPkg.transfers?.mekMedSmall || 500}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => handleTransferChange('mekMedSmall', e.target.value)}
                    className="w-full bg-white font-mono font-bold text-xs rounded-xl px-3 py-2 border border-slate-300 text-right pr-9 shadow-2xs"
                  />
                  <span className="absolute right-2.5 top-2 text-[10px] text-slate-400 font-mono">SAR</span>
                </div>
              </div>
              <div>
                <label className="text-[10px] text-slate-500 block mb-1">Büyük Araç (HiAce / Otobüs):</label>
                <div className="relative">
                  <input
                    type="number"
                    value={localPkg.transfers?.mekMedBig || 800}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => handleTransferChange('mekMedBig', e.target.value)}
                    className="w-full bg-white font-mono font-bold text-xs rounded-xl px-3 py-2 border border-slate-300 text-right pr-9 shadow-2xs"
                  />
                  <span className="absolute right-2.5 top-2 text-[10px] text-slate-400 font-mono">SAR</span>
                </div>
              </div>
            </div>

            {/* Medine - Havaalanı */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                <Car className="h-4 w-4 text-emerald-600" />
                <span>Medine - Havalimanı Transferi</span>
              </div>
              <div>
                <label className="text-[10px] text-slate-500 block mb-1">Küçük Araç (Sedan / GMC):</label>
                <div className="relative">
                  <input
                    type="number"
                    value={localPkg.transfers?.medAirSmall || 100}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => handleTransferChange('medAirSmall', e.target.value)}
                    className="w-full bg-white font-mono font-bold text-xs rounded-xl px-3 py-2 border border-slate-300 text-right pr-9 shadow-2xs"
                  />
                  <span className="absolute right-2.5 top-2 text-[10px] text-slate-400 font-mono">SAR</span>
                </div>
              </div>
              <div>
                <label className="text-[10px] text-slate-500 block mb-1">Büyük Araç (HiAce / Otobüs):</label>
                <div className="relative">
                  <input
                    type="number"
                    value={localPkg.transfers?.medAirBig || 800}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => handleTransferChange('medAirBig', e.target.value)}
                    className="w-full bg-white font-mono font-bold text-xs rounded-xl px-3 py-2 border border-slate-300 text-right pr-9 shadow-2xs"
                  />
                  <span className="absolute right-2.5 top-2 text-[10px] text-slate-400 font-mono">SAR</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. SECTION 3: Fixed Expenses Table */}
      {activeSection === 'expenses' && (
        <div className="pearl-card rounded-3xl bg-white border border-slate-200/90 shadow-sm overflow-hidden animate-fade-scale">
          <div className="p-4 bg-slate-50/80 border-b border-slate-200/90">
            <span className="text-xs font-bold text-slate-800">
              {localPkg.name} • Sabit Operasyonel Gider Kalemleri (SAR)
            </span>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Teklif formunda "Dahil" olarak işaretlenen kalemler kişi başı maliyet havuzuna eklenir.
            </p>
          </div>

          <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {Object.entries(EXPENSE_LABELS).map(([expKey, expMeta]) => {
              const currentVal = localPkg.fixedExpenses?.[expKey] !== undefined ? localPkg.fixedExpenses[expKey] : 0;

              return (
                <div key={expKey} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3 hover:border-slate-300 transition-all">
                  <div>
                    <span className="font-bold text-xs text-slate-800 block">{expMeta.name}</span>
                    <span className="text-[10px] text-slate-400 line-clamp-1">{expMeta.desc}</span>
                  </div>

                  <div className="relative w-28 shrink-0">
                    <input
                      type="number"
                      value={currentVal}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => handleFixedExpenseChange(expKey, e.target.value)}
                      className="w-full bg-white font-mono font-bold text-xs rounded-xl px-2.5 py-1.5 border border-slate-300 text-right pr-8 shadow-2xs"
                    />
                    <span className="absolute right-2 top-2 text-[10px] text-slate-400 font-mono">SAR</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 5. SECTION 4: Live Currencies & Parities */}
      {activeSection === 'currencies' && (
        <div className="pearl-card rounded-3xl bg-white border border-slate-200/90 shadow-sm overflow-hidden animate-fade-scale">
          <div className="p-4 bg-slate-50/80 border-b border-slate-200/90 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-slate-800">
                Piyasa Kurları & Çapraz Pariteler
              </span>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Canlı döviz kurları 3 dakikada bir otomatik yenilenir veya buradan manuel sabitlenebilir.
              </p>
            </div>

            <button
              type="button"
              onClick={() => refreshLiveCurrencies(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-300 text-xs font-bold spring-pill transition-all cursor-pointer"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${currencyStatus.isLoading ? 'animate-spin' : ''}`} />
              <span>Canlı Kurları Şimdi Yenile</span>
            </button>
          </div>

          <div className="p-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1.5">
              <label className="text-xs font-bold text-slate-700 block">USD / TRY (1 USD = ₺)</label>
              <input
                type="number"
                step="0.01"
                value={localCurrencies.USD_TRY || 0}
                onChange={(e) => setLocalCurrencies({ ...localCurrencies, USD_TRY: parseFloat(e.target.value) || 0 })}
                className="w-full bg-white font-mono font-bold text-slate-900 rounded-xl px-3 py-2 border border-slate-300 text-xs shadow-2xs"
              />
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1.5">
              <label className="text-xs font-bold text-slate-700 block">EUR / TRY (1 EUR = ₺)</label>
              <input
                type="number"
                step="0.01"
                value={localCurrencies.EUR_TRY || 0}
                onChange={(e) => setLocalCurrencies({ ...localCurrencies, EUR_TRY: parseFloat(e.target.value) || 0 })}
                className="w-full bg-white font-mono font-bold text-slate-900 rounded-xl px-3 py-2 border border-slate-300 text-xs shadow-2xs"
              />
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1.5">
              <label className="text-xs font-bold text-slate-700 block">SAR / USD Sabit Paritesi (3.75 SAR)</label>
              <input
                type="number"
                step="0.01"
                value={localCurrencies.SAR_USD || 3.75}
                onChange={(e) => setLocalCurrencies({ ...localCurrencies, SAR_USD: parseFloat(e.target.value) || 3.75 })}
                className="w-full bg-white font-mono font-bold text-slate-900 rounded-xl px-3 py-2 border border-slate-300 text-xs shadow-2xs"
              />
            </div>
          </div>
        </div>
      )}

      </div>
      </div>
    </div>
  );
}
