import React from 'react';
import { Users, Check, Sparkles } from 'lucide-react';

export default function RoomComparisonTable({ 
  matrix = [], 
  selectedOccupancy = 2, 
  onSelectOccupancy,
  currency = 'USD'
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
          <Users className="h-4 w-4 text-emerald-600" />
          <span>Oda Tiplerine Göre Kişi Başı Fiyat Seçenekleri</span>
        </h4>
        <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">
          Seçilen oda tipine göre hesap anında güncellenir
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {matrix.map((item) => {
          const isSelected = selectedOccupancy === item.occupancy;
          
          const usdVal = item.finalPriceUSD ?? item.priceUSD ?? 0;
          const tryVal = item.finalPriceTRY ?? item.priceTRY ?? 0;
          const eurVal = item.finalPriceEUR ?? item.priceEUR ?? 0;
          const sarVal = item.finalPriceSAR ?? item.priceSAR ?? 0;

          let priceStr = `${usdVal.toLocaleString('tr-TR')} $`;
          if (currency === 'TRY') {
            priceStr = `${tryVal.toLocaleString('tr-TR')} ₺`;
          } else if (currency === 'EUR') {
            priceStr = `${eurVal.toLocaleString('tr-TR')} €`;
          } else if (currency === 'SAR') {
            priceStr = `${sarVal.toLocaleString('tr-TR')} SAR`;
          }

          return (
            <button
              key={item.occupancy}
              type="button"
              onClick={() => onSelectOccupancy(item.occupancy)}
              className={`relative flex flex-col justify-between rounded-2xl p-4 text-left transition-all duration-300 transform cursor-pointer border select-none ${
                isSelected
                  ? 'bg-emerald-50/95 border-emerald-600 shadow-md ring-2 ring-emerald-600/30 scale-102 -translate-y-0.5'
                  : 'bg-white border-slate-200/90 hover:border-emerald-300 hover:bg-slate-50/80 hover:-translate-y-0.5 hover:shadow-xs active:scale-98'
              }`}
            >
              {isSelected && (
                <span className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-white shadow-md animate-fade-scale">
                  <Check className="h-3 w-3 stroke-[3]" />
                </span>
              )}

              <div>
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                  <span className={`flex h-5 w-5 items-center justify-center rounded-lg text-[11px] font-mono font-bold transition-colors ${
                    isSelected ? 'bg-emerald-600 text-white shadow-2xs' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {item.occupancy}
                  </span>
                  <span>{item.label}</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">{item.desc}</p>
              </div>

              <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-baseline justify-between">
                <span className="text-[10px] text-slate-400 font-medium">Kişi Başı:</span>
                <span className={`text-base font-extrabold font-mono transition-colors ${
                  isSelected ? 'text-emerald-800' : 'text-slate-800'
                }`}>
                  {priceStr}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
