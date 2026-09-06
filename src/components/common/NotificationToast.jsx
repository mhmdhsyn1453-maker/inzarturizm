import React from 'react';
import { useData } from '../../context/DataContext';
import { 
  Radio, 
  X, 
  Sparkles, 
  CheckCircle2, 
  Megaphone, 
  FileText, 
  Building2, 
  Users, 
  AlertTriangle,
  Volume2
} from 'lucide-react';

export default function NotificationToast() {
  const { hotReloadAlert, dismissHotReloadAlert } = useData();

  if (!hotReloadAlert) return null;

  const getIcon = () => {
    switch (hotReloadAlert.type) {
      case 'announcement':
        return <Megaphone className="h-5 w-5 text-amber-400 animate-bounce" />;
      case 'quote':
        return <FileText className="h-5 w-5 text-emerald-400 animate-pulse" />;
      case 'tariff':
        return <Building2 className="h-5 w-5 text-teal-400" />;
      case 'staff':
        return <Users className="h-5 w-5 text-blue-400" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-rose-400 animate-pulse" />;
      default:
        return <Radio className="h-5 w-5 text-emerald-400 animate-pulse" />;
    }
  };

  const getBorderColor = () => {
    switch (hotReloadAlert.type) {
      case 'announcement':
        return 'border-amber-500/60 shadow-amber-950/50';
      case 'warning':
        return 'border-rose-500/60 shadow-rose-950/50';
      case 'tariff':
        return 'border-teal-500/60 shadow-teal-950/50';
      default:
        return 'border-emerald-500/60 shadow-emerald-950/60';
    }
  };

  return (
    <div className="fixed top-6 right-6 z-[99999] animate-slide-down max-w-md w-full px-2 pointer-events-auto">
      <div className={`flex items-start justify-between gap-3 rounded-2xl bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4 border shadow-2xl backdrop-blur-2xl transition-all ${getBorderColor()}`}>
        
        <div className="flex items-start gap-3 min-w-0">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 border border-white/10 shadow-inner mt-0.5">
            {getIcon()}
          </div>
          
          <div className="space-y-0.5 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-xs font-black text-white font-display tracking-tight truncate">
                {hotReloadAlert.title || 'Canlı Sistem Bildirimi'}
              </h4>
              <span className="text-[10px] text-emerald-400/90 font-mono font-bold bg-emerald-950/80 px-1.5 py-0.2 rounded border border-emerald-500/30">
                {hotReloadAlert.timestamp}
              </span>
            </div>
            
            <p className="text-xs text-slate-300 font-medium leading-relaxed break-words">
              {hotReloadAlert.message}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={dismissHotReloadAlert}
          className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white transition-colors shrink-0 cursor-pointer"
          title="Bildirimi Kapat"
        >
          <X className="h-4 w-4" />
        </button>

      </div>
    </div>
  );
}
