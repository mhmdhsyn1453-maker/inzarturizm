import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import inzarLogo from '../assets/inzarturizmlogo.png';
import CustomSelect from './common/CustomSelect';
import { 
  Building2, 
  UserCheck, 
  ShieldAlert, 
  Calculator, 
  FileText, 
  Settings2, 
  RefreshCw, 
  Radio, 
  TrendingUp, 
  LogOut,
  Sparkles,
  Users,
  History
} from 'lucide-react';

export default function Header({ activeTab, setActiveTab }) {
  const { currentUser, isAdmin, switchUser, logout, users } = useAuth();
  const { currencies, lastSyncTime, resetAllData } = useData();

  return (
    <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-xl">
      {/* Top Currency & Live Sync Status Bar */}
      <div className="border-b border-slate-800/50 bg-slate-900/60 px-4 py-1.5 text-xs text-slate-300">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-4 overflow-x-auto py-0.5">
            <div className="flex items-center gap-1.5 font-medium text-amber-400">
              <TrendingUp className="h-3.5 w-3.5" />
              <span>Canlı Döviz & Kurlar:</span>
            </div>
            <div className="flex items-center gap-3 font-mono text-slate-200">
              <span className="rounded bg-slate-800/80 px-2 py-0.5 border border-slate-700/50">
                1 USD = <strong className="text-emerald-400">{currencies.SAR_USD} SAR</strong>
              </span>
              <span className="rounded bg-slate-800/80 px-2 py-0.5 border border-slate-700/50">
                1 USD = <strong className="text-emerald-400">{currencies.USD_TRY} ₺</strong>
              </span>
              <span className="rounded bg-slate-800/80 px-2 py-0.5 border border-slate-700/50">
                1 EUR = <strong className="text-emerald-400">{currencies.EUR_TRY} ₺</strong>
              </span>
              <span className="rounded bg-amber-500/10 px-2 py-0.5 border border-amber-500/30 text-amber-300">
                Hedef Kar Marjı: <strong>%{currencies.defaultProfitMargin}</strong>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-emerald-400 text-[11px] font-medium">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
              </span>
              <span>Hot-Reload Senkronize</span>
              <span className="text-slate-500 font-mono">({lastSyncTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })})</span>
            </div>

            {/* Fast User Switcher for Testing/Demo */}
            <div className="flex items-center gap-1.5 pl-3 border-l border-slate-800">
              <span className="text-slate-400 text-[11px]">Hızlı Rol Geçişi:</span>
              <div className="w-48">
                <CustomSelect
                  value={currentUser?.id || ''}
                  onChange={(val) => switchUser(val)}
                  options={users.map(u => ({
                    id: u.id,
                    label: `${u.name} (${u.branch})`
                  }))}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Brand Navigation Bar */}
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
        {/* Logo and App Title */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="relative flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-emerald-600 via-emerald-800 to-slate-900 p-1 shadow-lg shadow-emerald-900/30 border border-emerald-500/30">
              <img 
                src={inzarLogo} 
                alt="İnzar Turizm Logo" 
                className="h-full w-full object-contain filter drop-shadow"
              />
              <span className="text-white font-bold text-lg font-display">İZ</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold font-display tracking-tight text-white">
                  İNZAR <span className="gold-gradient-text">TURİZM</span>
                </h1>
                <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-400 border border-emerald-500/30">
                  Umre v2.5 PRO
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Merkez & Personel Tarife Hesaplama Platformu
              </p>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center gap-1.5 rounded-xl bg-slate-900/80 p-1 border border-slate-800 shadow-inner">
          <button
            onClick={() => setActiveTab('wizard')}
            className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-all ${
              activeTab === 'wizard'
                ? 'bg-gradient-to-r from-emerald-600 to-emerald-700 text-white shadow-md shadow-emerald-900/40'
                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Calculator className="h-4 w-4" />
            <span>Teklif Oluştur</span>
          </button>

          <button
            onClick={() => setActiveTab('quotes')}
            className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-all ${
              activeTab === 'quotes'
                ? 'bg-gradient-to-r from-emerald-600 to-emerald-700 text-white shadow-md shadow-emerald-900/40'
                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <FileText className="h-4 w-4" />
            <span>Kayıtlı Teklifler</span>
          </button>

          {isAdmin && (
            <button
              onClick={() => setActiveTab('admin')}
              className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-all ${
                activeTab === 'admin'
                  ? 'bg-gradient-to-r from-amber-600 to-amber-700 text-white shadow-md shadow-amber-900/40'
                  : 'text-amber-400 hover:bg-amber-500/10'
              }`}
            >
              <Settings2 className="h-4 w-4" />
              <span>Merkez Yönetim Paneli</span>
              <span className="rounded bg-amber-400/20 px-1.5 py-0.2 text-[10px] font-bold text-amber-300 border border-amber-400/30">
                HQ
              </span>
            </button>
          )}

          {isAdmin && (
            <button
              onClick={() => setActiveTab('logs')}
              className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                activeTab === 'logs'
                  ? 'bg-slate-800 text-white border border-slate-700'
                  : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
              }`}
            >
              <History className="h-4 w-4" />
              <span>Denetim Günlüğü</span>
            </button>
          )}
        </nav>

        {/* User Card & Active Role Badge */}
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <div className="flex items-center justify-end gap-1.5 text-sm font-semibold text-slate-200">
              {isAdmin ? (
                <span className="text-amber-400">{currentUser?.name}</span>
              ) : (
                <span className="text-emerald-400">{currentUser?.name}</span>
              )}
            </div>
            <div className="text-xs text-slate-400 flex items-center justify-end gap-1">
              <Building2 className="h-3 w-3 text-slate-500" />
              <span>{currentUser?.branch}</span>
            </div>
          </div>

          <div className={`flex h-10 w-10 items-center justify-center rounded-xl font-bold shadow-md border ${
            isAdmin 
              ? 'bg-gradient-to-br from-amber-500 to-amber-700 text-slate-950 border-amber-400/50' 
              : 'bg-gradient-to-br from-emerald-500 to-emerald-700 text-white border-emerald-400/50'
          }`}>
            {currentUser?.name?.charAt(0) || 'U'}
          </div>
        </div>
      </div>
    </header>
  );
}
