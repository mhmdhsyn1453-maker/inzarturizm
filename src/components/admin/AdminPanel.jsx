import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { 
  Building2, 
  Bed, 
  Utensils, 
  Bus, 
  Plane, 
  FileCheck, 
  ShieldCheck, 
  Coins, 
  TrendingUp, 
  Save, 
  Plus, 
  Trash2, 
  Sparkles, 
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Info,
  DollarSign
} from 'lucide-react';
import confetti from 'canvas-confetti';

export default function AdminPanel() {
  const { packages, currencies, updatePackage, addPackage, deletePackage, updateCurrencies, resetAllData } = useData();
  const { currentUser } = useAuth();

  const [selectedPkgId, setSelectedPkgId] = useState(packages[0]?.id || 'standart');
  const [localPkg, setLocalPkg] = useState(() => packages.find(p => p.id === selectedPkgId) || packages[0]);
  const [localCurrencies, setLocalCurrencies] = useState({ ...currencies });
  const [isSaved, setIsSaved] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newPkgForm, setNewPkgForm] = useState({
    name: '',
    code: '',
    description: '',
    hotelMakkah: '',
    hotelMadinah: '',
    distanceMakkah: '',
    distanceMadinah: '',
    color: '#059669',
    badge: 'Yeni Özel Paket',
    makkahRoomPriceSAR: 100,
    makkahFoodPriceSAR: 40,
    madinahRoomPriceSAR: 500,
    madinahFoodPriceSAR: 45,
  });

  // Handle switching selected package
  const handleSelectPackage = (pkgId) => {
    setSelectedPkgId(pkgId);
    const found = packages.find(p => p.id === pkgId);
    if (found) {
      setLocalPkg({ ...found });
    }
  };

  // Save changes to current package and currencies
  const handleSaveAll = () => {
    // 1. Update package
    updatePackage(localPkg.id, localPkg, `${localPkg.name} tarifesi ve maliyetleri güncellendi.`);
    // 2. Update currencies
    updateCurrencies(localCurrencies, 'Döviz kurları ve kar marjı güncellendi.');

    setIsSaved(true);
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#10b981', '#f59e0b', '#38bdf8']
    });

    setTimeout(() => setIsSaved(false), 3000);
  };

  // Add new custom package
  const handleCreateNewPackage = (e) => {
    e.preventDefault();
    if (!newPkgForm.name) return;

    const created = {
      ...newPkgForm,
      isFeatured: false,
      transfers: {
        jedMekSmall: 200,
        mekMedSmall: 500,
        medAirSmall: 100,
        jedMekBig: 800,
        mekMedBig: 800,
        medAirBig: 800,
      },
      fixedExpenses: {
        flightTicketSAR: 1500,
        visaTaxSAR: 500,
        insuranceSAR: 125,
        bagSAR: 25,
        scarfSAR: 15,
        guideSAR: 45,
        commissionSAR: 50,
        bonusSAR: 25,
        zamzamSAR: 125,
        branchExpenseSAR: 0,
      }
    };

    addPackage(created, `Yeni ${newPkgForm.name} paketi oluşturuldu.`);
    setShowAddModal(false);
    setSelectedPkgId(created.id);
    setLocalPkg(created);
  };

  return (
    <div className="space-y-8 pb-16">
      {/* Top Banner & Quick Controls */}
      <div className="glass-panel-gold rounded-3xl p-6 sm:p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 text-amber-400 text-sm font-semibold mb-1">
              <Sparkles className="h-4 w-4" />
              <span>GENEL MERKEZ YÖNETİM & DİNAMİK FİYATLANDIRMA MERKEZİ</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white font-display">
              Merkez Tarife & Fiyatlandırma Yönetimi
            </h2>
            <p className="text-sm text-slate-300 mt-1 max-w-2xl">
              Buradan güncelleyeceğiniz otel, transfer, uçak, vize, yemek ve kur parametreleri; sahadaki tüm personellerin ekranına <strong className="text-emerald-400">anında (Hot-Reload)</strong> yansır.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => {
                if (window.confirm('Tüm verileri orijinal Excel başlangıç değerlerine sıfırlamak istediğinize emin misiniz?')) {
                  resetAllData();
                }
              }}
              className="flex items-center gap-2 rounded-xl bg-slate-800/80 px-4 py-2.5 text-xs font-semibold text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700 transition-all"
            >
              <RotateCcw className="h-4 w-4 text-slate-400" />
              <span>Excel Fabrika Ayarlarına Dön</span>
            </button>

            <button
              type="button"
              onClick={handleSaveAll}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-900/50 transition-all transform active:scale-95"
            >
              {isSaved ? <CheckCircle2 className="h-5 w-5" /> : <Save className="h-5 w-5" />}
              <span>{isSaved ? 'Hot-Reload Yayınlandı!' : 'Kaydet ve Personellere Yayınla'}</span>
            </button>
          </div>
        </div>

        {/* Global Financial Tickers & Margins */}
        <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6 border-t border-slate-800/80">
          <div className="bg-slate-900/90 rounded-2xl p-4 border border-slate-800">
            <label className="text-xs text-slate-400 font-medium block">
              SAR / USD Kuru (Suudi Riyali)
            </label>
            <div className="flex items-center gap-2 mt-1.5">
              <input
                type="number"
                step="0.01"
                value={localCurrencies.SAR_USD}
                onChange={(e) => setLocalCurrencies({ ...localCurrencies, SAR_USD: parseFloat(e.target.value) || 0 })}
                className="w-full bg-slate-950 text-emerald-400 font-mono font-bold text-lg rounded-lg px-3 py-1.5 border border-slate-700 focus:outline-none focus:border-emerald-500"
              />
              <span className="text-xs text-slate-400 font-mono">SAR</span>
            </div>
            <span className="text-[10px] text-slate-500 mt-1 block">Sabit Kur: 3.75</span>
          </div>

          <div className="bg-slate-900/90 rounded-2xl p-4 border border-slate-800">
            <label className="text-xs text-slate-400 font-medium block">
              USD / TRY Kuru (Dolar / TL)
            </label>
            <div className="flex items-center gap-2 mt-1.5">
              <input
                type="number"
                step="0.1"
                value={localCurrencies.USD_TRY}
                onChange={(e) => setLocalCurrencies({ ...localCurrencies, USD_TRY: parseFloat(e.target.value) || 0 })}
                className="w-full bg-slate-950 text-emerald-400 font-mono font-bold text-lg rounded-lg px-3 py-1.5 border border-slate-700 focus:outline-none focus:border-emerald-500"
              />
              <span className="text-xs text-slate-400 font-mono">₺</span>
            </div>
            <span className="text-[10px] text-slate-500 mt-1 block">Canlı Satış Kuru</span>
          </div>

          <div className="bg-slate-900/90 rounded-2xl p-4 border border-slate-800">
            <label className="text-xs text-slate-400 font-medium block">
              EUR / TRY Kuru (Euro / TL)
            </label>
            <div className="flex items-center gap-2 mt-1.5">
              <input
                type="number"
                step="0.1"
                value={localCurrencies.EUR_TRY}
                onChange={(e) => setLocalCurrencies({ ...localCurrencies, EUR_TRY: parseFloat(e.target.value) || 0 })}
                className="w-full bg-slate-950 text-emerald-400 font-mono font-bold text-lg rounded-lg px-3 py-1.5 border border-slate-700 focus:outline-none focus:border-emerald-500"
              />
              <span className="text-xs text-slate-400 font-mono">₺</span>
            </div>
            <span className="text-[10px] text-slate-500 mt-1 block">Canlı Euro Kuru</span>
          </div>

          <div className="bg-gradient-to-br from-amber-950/40 to-slate-900 rounded-2xl p-4 border border-amber-500/30">
            <label className="text-xs text-amber-300 font-medium block">
              Merkez Hedef Kar Marjı (%)
            </label>
            <div className="flex items-center gap-2 mt-1.5">
              <input
                type="number"
                step="1"
                min="0"
                max="100"
                value={localCurrencies.defaultProfitMargin}
                onChange={(e) => setLocalCurrencies({ ...localCurrencies, defaultProfitMargin: parseFloat(e.target.value) || 0 })}
                className="w-full bg-slate-950 text-amber-400 font-mono font-bold text-lg rounded-lg px-3 py-1.5 border border-amber-500/50 focus:outline-none focus:border-amber-400"
              />
              <span className="text-sm font-bold text-amber-400">%</span>
            </div>
            <span className="text-[10px] text-amber-400/80 mt-1 block">Maliyet Üzerine Eklenir</span>
          </div>
        </div>
      </div>

      {/* Package Selector Tabs & Add New Package */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          {packages.map(p => (
            <button
              key={p.id}
              onClick={() => handleSelectPackage(p.id)}
              className={`flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-bold transition-all border ${
                selectedPkgId === p.id
                  ? 'bg-slate-800 text-white border-amber-500/80 shadow-lg shadow-amber-950/30'
                  : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:bg-slate-800/60 hover:text-slate-200'
              }`}
            >
              <span 
                className="h-3 w-3 rounded-full" 
                style={{ backgroundColor: p.color || '#10b981' }} 
              />
              <span>{p.name}</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
                {p.code || 'PKG'}
              </span>
            </button>
          ))}
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 rounded-2xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 px-4 py-2.5 text-xs font-bold border border-amber-500/30 transition-all"
        >
          <Plus className="h-4 w-4" />
          <span>Yeni Paket / Kategori Tanımla</span>
        </button>
      </div>

      {/* Package Detail Editors */}
      {localPkg && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Column 1: Konaklama & Otel ve Yemek Giderleri */}
          <div className="glass-panel rounded-3xl p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <Bed className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-lg font-display">
                    Otel & Yemek Maliyetleri
                  </h3>
                  <p className="text-xs text-slate-400">SAR (Riyal) Cinsinden Günlük Fiyatlar</p>
                </div>
              </div>
            </div>

            {/* Mekke Otel Girdileri */}
            <div className="bg-slate-900/80 rounded-2xl p-4 border border-slate-800/80 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-emerald-400 flex items-center gap-1.5">
                  <span>🕋 MEKKE KONAKLAMA</span>
                </h4>
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">Mekke Otel Adı</label>
                <input
                  type="text"
                  value={localPkg.hotelMakkah || ''}
                  onChange={(e) => setLocalPkg({ ...localPkg, hotelMakkah: e.target.value })}
                  className="w-full bg-slate-950 text-slate-200 rounded-lg px-3 py-2 text-sm border border-slate-700 focus:outline-none focus:border-emerald-500"
                  placeholder="Örn: Mövenpick Hajar / Anjum"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Oda Günlük Fiyatı</label>
                  <div className="relative">
                    <input
                      type="number"
                      value={localPkg.makkahRoomPriceSAR}
                      onChange={(e) => setLocalPkg({ ...localPkg, makkahRoomPriceSAR: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-slate-950 text-emerald-400 font-mono font-bold rounded-lg px-3 py-2 text-sm border border-slate-700 focus:outline-none focus:border-emerald-500"
                    />
                    <span className="absolute right-3 top-2 text-xs text-slate-500 font-mono">SAR</span>
                  </div>
                  <span className="text-[10px] text-slate-500 mt-1 block">Oda Başına Günlük</span>
                </div>

                <div>
                  <label className="text-xs text-slate-400 block mb-1">Günlük Yemek Fiyatı</label>
                  <div className="relative">
                    <input
                      type="number"
                      value={localPkg.makkahFoodPriceSAR}
                      onChange={(e) => setLocalPkg({ ...localPkg, makkahFoodPriceSAR: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-slate-950 text-emerald-400 font-mono font-bold rounded-lg px-3 py-2 text-sm border border-slate-700 focus:outline-none focus:border-emerald-500"
                    />
                    <span className="absolute right-3 top-2 text-xs text-slate-500 font-mono">SAR</span>
                  </div>
                  <span className="text-[10px] text-slate-500 mt-1 block">Kişi Başı Günlük</span>
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">Harem Mesafesi / Konum</label>
                <input
                  type="text"
                  value={localPkg.distanceMakkah || ''}
                  onChange={(e) => setLocalPkg({ ...localPkg, distanceMakkah: e.target.value })}
                  className="w-full bg-slate-950 text-slate-300 rounded-lg px-3 py-1.5 text-xs border border-slate-700"
                  placeholder="Örn: 0-150m (Harem Avlusu)"
                />
              </div>
            </div>

            {/* Medine Otel Girdileri */}
            <div className="bg-slate-900/80 rounded-2xl p-4 border border-slate-800/80 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-amber-400 flex items-center gap-1.5">
                  <span>🕌 MEDİNE KONAKLAMA</span>
                </h4>
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">Medine Otel Adı</label>
                <input
                  type="text"
                  value={localPkg.hotelMadinah || ''}
                  onChange={(e) => setLocalPkg({ ...localPkg, hotelMadinah: e.target.value })}
                  className="w-full bg-slate-950 text-slate-200 rounded-lg px-3 py-2 text-sm border border-slate-700 focus:outline-none focus:border-amber-500"
                  placeholder="Örn: Rove Al Madinah / Leader"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Oda Günlük Fiyatı</label>
                  <div className="relative">
                    <input
                      type="number"
                      value={localPkg.madinahRoomPriceSAR}
                      onChange={(e) => setLocalPkg({ ...localPkg, madinahRoomPriceSAR: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-slate-950 text-amber-400 font-mono font-bold rounded-lg px-3 py-2 text-sm border border-slate-700 focus:outline-none focus:border-amber-500"
                    />
                    <span className="absolute right-3 top-2 text-xs text-slate-500 font-mono">SAR</span>
                  </div>
                  <span className="text-[10px] text-slate-500 mt-1 block">Oda Başına Günlük</span>
                </div>

                <div>
                  <label className="text-xs text-slate-400 block mb-1">Günlük Yemek Fiyatı</label>
                  <div className="relative">
                    <input
                      type="number"
                      value={localPkg.madinahFoodPriceSAR}
                      onChange={(e) => setLocalPkg({ ...localPkg, madinahFoodPriceSAR: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-slate-950 text-amber-400 font-mono font-bold rounded-lg px-3 py-2 text-sm border border-slate-700 focus:outline-none focus:border-amber-500"
                    />
                    <span className="absolute right-3 top-2 text-xs text-slate-500 font-mono">SAR</span>
                  </div>
                  <span className="text-[10px] text-slate-500 mt-1 block">Kişi Başı Günlük</span>
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">Mescid-i Nebevi Mesafesi</label>
                <input
                  type="text"
                  value={localPkg.distanceMadinah || ''}
                  onChange={(e) => setLocalPkg({ ...localPkg, distanceMadinah: e.target.value })}
                  className="w-full bg-slate-950 text-slate-300 rounded-lg px-3 py-1.5 text-xs border border-slate-700"
                  placeholder="Örn: 150m (Yürüme Mesafesi)"
                />
              </div>
            </div>
          </div>

          {/* Column 2: Ulaşım ve Transfer Maliyetleri */}
          <div className="glass-panel rounded-3xl p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
                  <Bus className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-lg font-display">
                    Transfer & Araç Tarifeleri
                  </h3>
                  <p className="text-xs text-slate-400">Küçük VIP Araç ve Büyük Otobüs (SAR)</p>
                </div>
              </div>
            </div>

            {/* Güzergah 1: Cidde - Mekke */}
            <div className="bg-slate-900/80 rounded-2xl p-4 border border-slate-800/80 space-y-3">
              <h4 className="text-sm font-bold text-slate-200 flex items-center justify-between">
                <span>📍 Cidde Havalimanı - Mekke Otel</span>
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Küçük Araç (Binek/VIP)</label>
                  <div className="relative">
                    <input
                      type="number"
                      value={localPkg.transfers?.jedMekSmall || 0}
                      onChange={(e) => setLocalPkg({
                        ...localPkg,
                        transfers: { ...localPkg.transfers, jedMekSmall: parseFloat(e.target.value) || 0 }
                      })}
                      className="w-full bg-slate-950 text-sky-400 font-mono font-bold rounded-lg px-3 py-2 text-sm border border-slate-700"
                    />
                    <span className="absolute right-3 top-2 text-xs text-slate-500 font-mono">SAR</span>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Büyük Araç (Otobüs)</label>
                  <div className="relative">
                    <input
                      type="number"
                      value={localPkg.transfers?.jedMekBig || 0}
                      onChange={(e) => setLocalPkg({
                        ...localPkg,
                        transfers: { ...localPkg.transfers, jedMekBig: parseFloat(e.target.value) || 0 }
                      })}
                      className="w-full bg-slate-950 text-sky-400 font-mono font-bold rounded-lg px-3 py-2 text-sm border border-slate-700"
                    />
                    <span className="absolute right-3 top-2 text-xs text-slate-500 font-mono">SAR</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Güzergah 2: Mekke - Medine */}
            <div className="bg-slate-900/80 rounded-2xl p-4 border border-slate-800/80 space-y-3">
              <h4 className="text-sm font-bold text-slate-200 flex items-center justify-between">
                <span>📍 Mekke - Medine Transfer</span>
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Küçük Araç (Binek/VIP)</label>
                  <div className="relative">
                    <input
                      type="number"
                      value={localPkg.transfers?.mekMedSmall || 0}
                      onChange={(e) => setLocalPkg({
                        ...localPkg,
                        transfers: { ...localPkg.transfers, mekMedSmall: parseFloat(e.target.value) || 0 }
                      })}
                      className="w-full bg-slate-950 text-sky-400 font-mono font-bold rounded-lg px-3 py-2 text-sm border border-slate-700"
                    />
                    <span className="absolute right-3 top-2 text-xs text-slate-500 font-mono">SAR</span>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Büyük Araç (Otobüs)</label>
                  <div className="relative">
                    <input
                      type="number"
                      value={localPkg.transfers?.mekMedBig || 0}
                      onChange={(e) => setLocalPkg({
                        ...localPkg,
                        transfers: { ...localPkg.transfers, mekMedBig: parseFloat(e.target.value) || 0 }
                      })}
                      className="w-full bg-slate-950 text-sky-400 font-mono font-bold rounded-lg px-3 py-2 text-sm border border-slate-700"
                    />
                    <span className="absolute right-3 top-2 text-xs text-slate-500 font-mono">SAR</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Güzergah 3: Medine Otel - Havalimanı */}
            <div className="bg-slate-900/80 rounded-2xl p-4 border border-slate-800/80 space-y-3">
              <h4 className="text-sm font-bold text-slate-200 flex items-center justify-between">
                <span>📍 Medine Otel - Havalimanı</span>
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Küçük Araç (Binek/VIP)</label>
                  <div className="relative">
                    <input
                      type="number"
                      value={localPkg.transfers?.medAirSmall || 0}
                      onChange={(e) => setLocalPkg({
                        ...localPkg,
                        transfers: { ...localPkg.transfers, medAirSmall: parseFloat(e.target.value) || 0 }
                      })}
                      className="w-full bg-slate-950 text-sky-400 font-mono font-bold rounded-lg px-3 py-2 text-sm border border-slate-700"
                    />
                    <span className="absolute right-3 top-2 text-xs text-slate-500 font-mono">SAR</span>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Büyük Araç (Otobüs)</label>
                  <div className="relative">
                    <input
                      type="number"
                      value={localPkg.transfers?.medAirBig || 0}
                      onChange={(e) => setLocalPkg({
                        ...localPkg,
                        transfers: { ...localPkg.transfers, medAirBig: parseFloat(e.target.value) || 0 }
                      })}
                      className="w-full bg-slate-950 text-sky-400 font-mono font-bold rounded-lg px-3 py-2 text-sm border border-slate-700"
                    />
                    <span className="absolute right-3 top-2 text-xs text-slate-500 font-mono">SAR</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Column 3: Sabit & Operasyonel ve Ek Giderler */}
          <div className="glass-panel rounded-3xl p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                  <Coins className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-lg font-display">
                    Sabit & Operasyon Giderleri
                  </h3>
                  <p className="text-xs text-slate-400">Kişi Başı Maliyet Kalemleri (SAR)</p>
                </div>
              </div>
            </div>

            <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
              {[
                { key: 'flightTicketSAR', label: 'Uçak Bileti', icon: Plane },
                { key: 'visaTaxSAR', label: 'Vize + Vergi Harcı', icon: FileCheck },
                { key: 'insuranceSAR', label: 'Sağlık Sigortası', icon: ShieldCheck },
                { key: 'bagSAR', label: 'Seyahat Çantası', icon: Coins },
                { key: 'scarfSAR', label: 'Fular / Eşarp / İhram', icon: Coins },
                { key: 'guideSAR', label: 'Fri / Görevli Payı', icon: Coins },
                { key: 'commissionSAR', label: 'Acente Komisyonu', icon: Coins },
                { key: 'bonusSAR', label: 'Başarı Primi', icon: Coins },
                { key: 'zamzamSAR', label: '5 Litre Zemzem', icon: Coins },
                { key: 'branchExpenseSAR', label: 'Şube Giderleri', icon: Building2 },
              ].map(item => {
                const IconComponent = item.icon;
                return (
                  <div key={item.key} className="flex items-center justify-between bg-slate-900/80 rounded-xl p-2.5 border border-slate-800">
                    <div className="flex items-center gap-2">
                      <IconComponent className="h-4 w-4 text-purple-400" />
                      <span className="text-xs font-medium text-slate-200">{item.label}</span>
                    </div>
                    <div className="relative w-28">
                      <input
                        type="number"
                        value={localPkg.fixedExpenses?.[item.key] ?? 0}
                        onChange={(e) => setLocalPkg({
                          ...localPkg,
                          fixedExpenses: {
                            ...localPkg.fixedExpenses,
                            [item.key]: parseFloat(e.target.value) || 0
                          }
                        })}
                        className="w-full bg-slate-950 text-purple-300 font-mono font-bold text-right rounded-lg px-2.5 py-1 text-xs border border-slate-700 pr-8"
                      />
                      <span className="absolute right-2 top-1 text-[10px] text-slate-500 font-mono">SAR</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {packages.length > 1 && (
              <div className="pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm(`${localPkg.name} paketini silmek istediğinize emin misiniz?`)) {
                      deletePackage(localPkg.id);
                      setSelectedPkgId(packages[0]?.id || '');
                    }
                  }}
                  className="flex items-center gap-1.5 text-xs text-rose-400 hover:text-rose-300 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                  <span>Bu Paketi Sistemden Sil</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal: Add New Custom Package */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="glass-panel-gold rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-6 animate-slide-down">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <h3 className="text-xl font-bold text-white font-display">
                Yeni Umre Paketi Tanımla
              </h3>
              <button 
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateNewPackage} className="space-y-4">
              <div>
                <label className="text-xs text-slate-300 block mb-1">Paket Adı</label>
                <input
                  type="text"
                  required
                  value={newPkgForm.name}
                  onChange={(e) => setNewPkgForm({ ...newPkgForm, name: e.target.value })}
                  placeholder="Örn: Ramazan Özel Butik / VIP Kabe Manzaralı"
                  className="w-full bg-slate-900 text-white rounded-xl px-4 py-2.5 text-sm border border-slate-700 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-300 block mb-1">Paket Kodu</label>
                  <input
                    type="text"
                    value={newPkgForm.code}
                    onChange={(e) => setNewPkgForm({ ...newPkgForm, code: e.target.value.toUpperCase() })}
                    placeholder="Örn: RAM-VIP"
                    className="w-full bg-slate-900 text-white rounded-xl px-3 py-2 text-sm border border-slate-700"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-300 block mb-1">Rozet / Etiket</label>
                  <input
                    type="text"
                    value={newPkgForm.badge}
                    onChange={(e) => setNewPkgForm({ ...newPkgForm, badge: e.target.value })}
                    placeholder="Örn: 5 Yıldızlı Lüks"
                    className="w-full bg-slate-900 text-white rounded-xl px-3 py-2 text-sm border border-slate-700"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-300 block mb-1">Açıklama</label>
                <textarea
                  value={newPkgForm.description}
                  onChange={(e) => setNewPkgForm({ ...newPkgForm, description: e.target.value })}
                  rows={2}
                  placeholder="Paketin öne çıkan özellikleri, servis ve yemek detayları..."
                  className="w-full bg-slate-900 text-white rounded-xl px-3 py-2 text-xs border border-slate-700"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-lg transition-all"
                >
                  Paketi Oluştur
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
