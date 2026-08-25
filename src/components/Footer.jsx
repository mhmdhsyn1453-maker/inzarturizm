import React from 'react';
import { ShieldCheck, Sparkles, Building2, Phone, Mail, Globe } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="mt-auto border-t border-slate-800/80 bg-slate-950/90 py-8 text-xs text-slate-400 no-print">
      <div className="mx-auto max-w-7xl px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-7 w-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs border border-emerald-500/30">
            İZ
          </div>
          <div>
            <span className="font-bold text-slate-200">İNZAR TURİZM</span> - Umre Tarife Hesaplama & Teklif Otomasyonu
            <p className="text-[11px] text-slate-500">Tüm hakları saklıdır © {new Date().getFullYear()} • TÜRSAB A Grubu Belge No: 12840</p>
          </div>
        </div>

        <div className="flex items-center gap-6 text-[11px]">
          <span className="flex items-center gap-1 text-emerald-400">
            <ShieldCheck className="h-4 w-4" />
            <span>256-Bit SSL & Rol Korumalı Güvenlik</span>
          </span>
          <span className="flex items-center gap-1 text-amber-400">
            <Sparkles className="h-4 w-4" />
            <span>Merkez-Personel Hot-Reload Hub</span>
          </span>
        </div>
      </div>
    </footer>
  );
}
