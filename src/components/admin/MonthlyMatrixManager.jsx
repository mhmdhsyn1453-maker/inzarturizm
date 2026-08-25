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
    setSpecialPeriod, 
    resetAllData 
  } = useData();
  const { showConfirm } = useModal();

  const [selectedPkgId, setSelectedPkgId] = useState(packages[1]?.id || packages[0]?.id || 'standart');
  const [localPkg, setLocalPkg] = useState(() => packages.find(p => p.id === selectedPkgId) || packages[0]);
  const [localCurrencies, setLocalCurrencies] = useState({ ...currencies });
  const [isSaved, setIsSaved] = useState(false);
  const [activeSection, setActiveSection] = useState('hotels'); // 'hotels' | 'transfers' | 'expenses' | 'currencies'

  const handleSelectPackage = (pkgId) => {
    setSelectedPkgId(pkgId);
    const found = packages.find(p => p.id === pkgId);
    if (found) {
      setLocalPkg({ ...found });
    }
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
    updateCurrencies(localCurrencies, 'Döviz kurları ve kâr marjı güncellendi.');

    setIsSaved(true);
    confetti({
      particleCount: 60,
      spread: 60,
      origin: { y: 0.6 }
    });

    setTimeout(() => setIsSaved(false), 2500);
  };

  const ramadanMonth = months.find(m => m.badge === 'Ramazan Özel') || months.find(m => m.id === 'apr') || months[3];
  const shawwalMonth = months.find(m => m.badge === 'Şevval') || months.find(m => m.id === 'may') || months[4];

  const handleResetDefaults = async () => {
    const confirmed = await showConfirm({
      title: 'Fabrika Ayarlarına Sıfırla',
      message: 'Tüm otel fiyatları, kurlar ve transferler Excel orijinal başlangıç değerlerine sıfırlanacaktır.',
      details: 'Bu işlem geri alınamaz.',
      confirmText: 'Evet, Sıfırla',
      cancelText: 'Vazgeç',
      confirmVariant: 'amber'
    });
    if (confirmed) {
      resetAllData();
    }
  };

  return (
    <div className="space-y-5 pb-20 max-w-7xl mx-auto font-sans">
      
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
              12 aylık otel fiyatlarını, her paketin bağımsız kâr oranını (%), otel tanımlarını ve Ramazan & Şevval takvimini yönetin.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={handleResetDefaults}
              className="flex items-center gap-2 rounded-2xl bg-emerald-800/60 hover:bg-emerald-800 px-4 py-3 text-xs font-bold text-emerald-200 border border-emerald-700/60 transition-all cursor-pointer shadow-2xs hover:scale-102 active:scale-98"
            >
              <RotateCcw className="h-4 w-4" />
              <span>Varsayılanlara Sıfırla</span>
            </button>

            <button
              type="button"
              onClick={handleSaveAll}
              className="flex items-center gap-2 rounded-2xl bg-emerald-500 hover:bg-emerald-400 px-6 py-3 text-xs font-black text-slate-950 shadow-lg shadow-emerald-950/40 transition-all cursor-pointer hover:scale-102 active:scale-98"
            >
              {isSaved ? <CheckCircle2 className="h-4 w-4 text-slate-950" /> : <Save className="h-4 w-4" />}
              <span>{isSaved ? 'Kaydedildi!' : 'Tüm Değişiklikleri Kaydet'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Apple-Pill Unified Ribbon: Package Selector & Hijri Season Bar (Full Pill Form & CSS Animations) */}
      <div className="rounded-3xl lg:rounded-full p-2.5 bg-white/95 border border-slate-200/90 shadow-sm backdrop-blur-md flex flex-col lg:flex-row lg:items-center justify-between gap-3.5 transition-all">
        
        {/* Package Selector Pills */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100/90 rounded-full overflow-x-auto">
          <span className="text-xs font-bold text-slate-500 pl-3 pr-1 hidden sm:inline select-none">Paket:</span>
          {packages.map(p => {
            const isSelected = selectedPkgId === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => handleSelectPackage(p.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-extrabold spring-pill transition-all cursor-pointer whitespace-nowrap select-none ${
                  isSelected
                    ? 'bg-gradient-to-r from-emerald-600 to-emerald-700 text-white pill-active-glow shadow-md scale-102'
                    : 'text-slate-600 hover:text-slate-950 hover:bg-white/80'
                }`}
              >
                <span>{p.name}</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-black ${
                  isSelected 
                    ? 'bg-emerald-950/60 text-emerald-100 border border-emerald-400/30' 
                    : 'bg-slate-200 text-slate-700'
                }`}>
                  %{p.profitMargin || 15} Kâr
                </span>
              </button>
            );
          })}
        </div>

        {/* Hijri Calendar Special Periods Pills */}
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 px-2">
          
          {/* Ramazan Pill Capsule */}
          <div className="rounded-full bg-amber-50/80 hover:bg-amber-100/70 border border-amber-200/90 px-3 py-1 flex items-center gap-2 spring-pill shadow-2xs transition-all">
            <span className="text-xs font-bold text-amber-950 flex items-center gap-1 shrink-0">
              <Calendar className="h-3.5 w-3.5 text-amber-700" />
              <span>Ramazan:</span>
            </span>
            <div className="w-32">
              <CustomSelect
                value={ramadanMonth?.id || 'apr'}
                onChange={(val) => setSpecialPeriod('ramadan', val)}
                options={months.map(m => ({ id: m.id, label: m.name }))}
              />
            </div>
          </div>

          {/* Şevval Pill Capsule */}
          <div className="rounded-full bg-emerald-50/80 hover:bg-emerald-100/70 border border-emerald-200/90 px-3 py-1 flex items-center gap-2 spring-pill shadow-2xs transition-all">
            <span className="text-xs font-bold text-emerald-950 flex items-center gap-1 shrink-0">
              <Calendar className="h-3.5 w-3.5 text-emerald-700" />
              <span>Şevval:</span>
            </span>
            <div className="w-32">
              <CustomSelect
                value={shawwalMonth?.id || 'may'}
                onChange={(val) => setSpecialPeriod('shawwal', val)}
                options={months.map(m => ({ id: m.id, label: m.name }))}
              />
            </div>
          </div>

        </div>
      </div>

      {/* 3. Package Basic Settings (Hotels, Distances, Profit Margin, Food) */}
      <div className="pearl-card rounded-3xl p-5 bg-white border border-slate-200/90 shadow-sm space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
            <Bed className="h-4 w-4 text-emerald-600" />
            <span>{localPkg.name} - Otel Standartları & Kâr Oranı</span>
          </h3>
          <span className="text-[11px] font-mono text-slate-400 font-bold bg-slate-100 px-2 py-0.5 rounded-full">
            KOD: {localPkg.code || 'PKG'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          
          {/* Mekke Hotel */}
          <div className="bg-slate-50/90 p-3.5 rounded-2xl border border-slate-200 space-y-1.5 transition-all hover:border-slate-300">
            <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
              <span>🕋 Mekke Oteli & Mesafesi</span>
            </label>
            <input
              type="text"
              value={localPkg.hotelMakkah || ''}
              onChange={(e) => setLocalPkg({ ...localPkg, hotelMakkah: e.target.value })}
              placeholder="Otel adı..."
              className="w-full bg-white font-semibold text-slate-900 rounded-xl px-3 py-1.5 border border-slate-300 focus:outline-none focus:border-emerald-600 text-xs shadow-2xs"
            />
            <input
              type="text"
              value={localPkg.distanceMakkah || ''}
              onChange={(e) => setLocalPkg({ ...localPkg, distanceMakkah: e.target.value })}
              placeholder="Mesafe..."
              className="w-full bg-white text-slate-600 rounded-xl px-3 py-1 border border-slate-200 focus:outline-none focus:border-emerald-600 text-[11px]"
            />
          </div>

          {/* Medine Hotel */}
          <div className="bg-slate-50/90 p-3.5 rounded-2xl border border-slate-200 space-y-1.5 transition-all hover:border-slate-300">
            <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
              <span>🕌 Medine Oteli & Mesafesi</span>
            </label>
            <input
              type="text"
              value={localPkg.hotelMadinah || ''}
              onChange={(e) => setLocalPkg({ ...localPkg, hotelMadinah: e.target.value })}
              placeholder="Otel adı..."
              className="w-full bg-white font-semibold text-slate-900 rounded-xl px-3 py-1.5 border border-slate-300 focus:outline-none focus:border-emerald-600 text-xs shadow-2xs"
            />
            <input
              type="text"
              value={localPkg.distanceMadinah || ''}
              onChange={(e) => setLocalPkg({ ...localPkg, distanceMadinah: e.target.value })}
              placeholder="Mesafe..."
              className="w-full bg-white text-slate-600 rounded-xl px-3 py-1 border border-slate-200 focus:outline-none focus:border-emerald-600 text-[11px]"
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
                onChange={(e) => setLocalPkg({ ...localPkg, profitMargin: parseFloat(e.target.value) || 0 })}
                className="w-full bg-white font-mono font-black text-center text-amber-950 rounded-xl px-2 py-1.5 border border-amber-300 focus:outline-none focus:border-emerald-600 text-sm shadow-2xs"
              />
            </div>
            <p className="text-[10px] text-amber-800/80">Kârsız seçilirse net maliyet hesaplanır.</p>
          </div>

          {/* Food Rates */}
          <div className="bg-slate-50/90 p-3.5 rounded-2xl border border-slate-200 space-y-1.5 transition-all hover:border-slate-300">
            <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
              <Utensils className="h-3.5 w-3.5 text-slate-500" />
              <span>Günlük Yemek Bedeli (SAR)</span>
            </label>
            <div className="grid grid-cols-2 gap-2 pt-0.5">
              <div>
                <span className="text-[10px] text-slate-500 block">Mekke Yemek:</span>
                <input
                  type="number"
                  value={localPkg.makkahFoodPriceSAR || 0}
                  onChange={(e) => setLocalPkg({ ...localPkg, makkahFoodPriceSAR: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-white font-mono font-bold text-center text-emerald-800 rounded-xl px-2 py-1 border border-slate-300 text-xs shadow-2xs"
                />
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block">Medine Yemek:</span>
                <input
                  type="number"
                  value={localPkg.madinahFoodPriceSAR || 0}
                  onChange={(e) => setLocalPkg({ ...localPkg, madinahFoodPriceSAR: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-white font-mono font-bold text-center text-amber-900 rounded-xl px-2 py-1 border border-slate-300 text-xs shadow-2xs"
                />
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* 4. Section Navigation Pills - Floating Segmented Pill Bar with Full Breathing Room */}
      <div className="py-2 overflow-visible">
        <div className="inline-flex flex-wrap sm:flex-nowrap items-center gap-2 p-1.5 bg-slate-100/90 rounded-full border border-slate-200/90 shadow-sm backdrop-blur-md">
          <button
            type="button"
            onClick={() => setActiveSection('hotels')}
            className={`flex items-center gap-2 px-5 py-2.5 text-xs font-extrabold rounded-full spring-pill transition-all cursor-pointer whitespace-nowrap select-none ${
              activeSection === 'hotels' 
                ? 'bg-gradient-to-r from-emerald-600 to-emerald-700 text-white pill-active-glow shadow-md scale-102 ring-2 ring-emerald-500/20' 
                : 'text-slate-600 hover:bg-white/80 hover:text-slate-950'
            }`}
          >
            <Calendar className="h-4 w-4" />
            <span>1. 12 Ay Otel Oda Fiyat Matrisi (SAR)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSection('transfers')}
            className={`flex items-center gap-2 px-5 py-2.5 text-xs font-extrabold rounded-full spring-pill transition-all cursor-pointer whitespace-nowrap select-none ${
              activeSection === 'transfers' 
                ? 'bg-gradient-to-r from-emerald-600 to-emerald-700 text-white pill-active-glow shadow-md scale-102 ring-2 ring-emerald-500/20' 
                : 'text-slate-600 hover:bg-white/80 hover:text-slate-950'
            }`}
          >
            <Bus className="h-4 w-4" />
            <span>2. Transferler & Araç Fiyatları (SAR)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSection('expenses')}
            className={`flex items-center gap-2 px-5 py-2.5 text-xs font-extrabold rounded-full spring-pill transition-all cursor-pointer whitespace-nowrap select-none ${
              activeSection === 'expenses' 
                ? 'bg-gradient-to-r from-emerald-600 to-emerald-700 text-white pill-active-glow shadow-md scale-102 ring-2 ring-emerald-500/20' 
                : 'text-slate-600 hover:bg-white/80 hover:text-slate-950'
            }`}
          >
            <Coins className="h-4 w-4" />
            <span>3. Sabit Giderler Havuzu (SAR)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSection('currencies')}
            className={`flex items-center gap-2 px-5 py-2.5 text-xs font-extrabold rounded-full spring-pill transition-all cursor-pointer whitespace-nowrap select-none ${
              activeSection === 'currencies' 
                ? 'bg-gradient-to-r from-emerald-600 to-emerald-700 text-white pill-active-glow shadow-md scale-102 ring-2 ring-emerald-500/20' 
                : 'text-slate-600 hover:bg-white/80 hover:text-slate-950'
            }`}
          >
            <TrendingUp className="h-4 w-4" />
            <span>4. Kurlar & Pariteler</span>
          </button>
        </div>
      </div>

      {/* 5. SECTION 1: 12-Month Hotel Pricing Matrix Table */}
      {activeSection === 'hotels' && (
        <div className="pearl-card rounded-3xl bg-white border border-slate-200/90 shadow-sm overflow-hidden animate-fade-scale">
          <div className="p-4 bg-slate-50/80 border-b border-slate-200/90 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800">
              {localPkg.name} • 12 Aylık Günlük Oda Fiyatları Tablosu
            </span>
            <span className="text-[11px] text-slate-500 font-mono">
              Para Birimi: SAR / Gece
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100/70 border-b border-slate-200 text-slate-600 font-bold text-[11px] uppercase">
                  <th className="py-3 px-4 w-12 text-center">#</th>
                  <th className="py-3 px-4">Ay / Sezon</th>
                  <th className="py-3 px-4">Dönem Notu</th>
                  <th className="py-3 px-4">🕋 Mekke Oda (SAR/Gece)</th>
                  <th className="py-3 px-4">🕌 Medine Oda (SAR/Gece)</th>
                  <th className="py-3 px-4 text-center">Toplam Oda (SAR)</th>
                  <th className="py-3 px-4 text-right">Sezon Tipi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {months.map((m, idx) => {
                  const rates = localPkg.monthlyPrices?.[m.id] || { makkahRoomSAR: 0, madinahRoomSAR: 0 };
                  const isPeak = m.isPeak;
                  const totalSAR = (rates.makkahRoomSAR || 0) + (rates.madinahRoomSAR || 0);

                  return (
                    <tr 
                      key={m.id} 
                      className={`hover:bg-emerald-50/30 transition-colors ${
                        isPeak ? 'bg-amber-50/40' : ''
                      }`}
                    >
                      <td className="py-2.5 px-4 text-center text-slate-400 font-mono text-[11px]">
                        {idx + 1}
                      </td>

                      <td className="py-2.5 px-4">
                        <div className="font-bold text-slate-900 text-xs">{m.name}</div>
                        <div className="text-[10px] text-slate-400">{m.subtitle || 'Standart'}</div>
                      </td>

                      <td className="py-2.5 px-4">
                        {m.badge ? (
                          <span className={`inline-block text-[10px] font-extrabold px-2.5 py-0.5 rounded-full ${
                            m.badge.includes('Ramazan')
                              ? 'bg-amber-100 text-amber-900 border border-amber-300'
                              : m.badge.includes('Şevval')
                              ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                              : 'bg-sky-100 text-sky-900 border border-sky-300'
                          }`}>
                            {m.badge}
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400 font-medium">Normal Sezon</span>
                        )}
                      </td>

                      {/* Mekke Room SAR Input */}
                      <td className="py-2 px-4">
                        <div className="relative w-36">
                          <input
                            type="number"
                            min="0"
                            step="10"
                            value={rates.makkahRoomSAR || 0}
                            onChange={(e) => handleMonthRateChange(m.id, 'makkahRoomSAR', e.target.value)}
                            className="w-full bg-white font-mono font-bold text-slate-900 rounded-xl px-3 py-1.5 text-xs border border-slate-300 focus:outline-none focus:border-emerald-600 text-right pr-9 shadow-2xs"
                          />
                          <span className="absolute right-2.5 top-2 text-[10px] text-slate-400 font-mono">SAR</span>
                        </div>
                      </td>

                      {/* Medine Room SAR Input */}
                      <td className="py-2 px-4">
                        <div className="relative w-36">
                          <input
                            type="number"
                            min="0"
                            step="10"
                            value={rates.madinahRoomSAR || 0}
                            onChange={(e) => handleMonthRateChange(m.id, 'madinahRoomSAR', e.target.value)}
                            className="w-full bg-white font-mono font-bold text-slate-900 rounded-xl px-3 py-1.5 text-xs border border-slate-300 focus:outline-none focus:border-emerald-600 text-right pr-9 shadow-2xs"
                          />
                          <span className="absolute right-2.5 top-2 text-[10px] text-slate-400 font-mono">SAR</span>
                        </div>
                      </td>

                      {/* Total Daily Room SAR */}
                      <td className="py-2.5 px-4 text-center font-mono font-black text-xs text-slate-800">
                        {totalSAR} <span className="text-[10px] text-slate-400 font-sans">SAR</span>
                      </td>

                      {/* Season Badge */}
                      <td className="py-2.5 px-4 text-right">
                        {isPeak ? (
                          <span className="inline-block text-[10px] font-bold text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-full border border-amber-200">
                            Yoğun Sezon
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400">Standart</span>
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
  );
}
