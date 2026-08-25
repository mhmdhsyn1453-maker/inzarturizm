import React, { useState } from 'react';
import { 
  Share2, 
  FileText, 
  CheckCircle2, 
  Percent, 
  ChevronDown, 
  ChevronUp, 
  DollarSign,
  Users,
  Send,
  Calendar,
  Layers,
  ArrowRight,
  TrendingUp,
  ShieldAlert,
  Plus,
  Minus
} from 'lucide-react';
import { generateWhatsAppMessage } from '../../services/pdfService';
import { useAuth } from '../../context/AuthContext';

export default function LiveQuoteCard({
  quotation,
  onOpenPdfModal,
  onSaveQuote,
  isSaved,
  paxCount = 1,
  onChangePaxCount,
  discountUSD = 0,
  onChangeDiscount,
  activeCurrency,
  setActiveCurrency,
  applyProfitMargin = true,
  onToggleApplyProfitMargin
}) {
  const { isAdmin } = useAuth();
  const [showCostBreakdown, setShowCostBreakdown] = useState(false);

  if (!quotation) return null;

  const handleWhatsAppShare = () => {
    const encoded = generateWhatsAppMessage(quotation);
    const phone = quotation.customerPhone ? quotation.customerPhone.replace(/[^0-9]/g, '') : '';
    const url = phone ? `https://wa.me/${phone}?text=${encoded}` : `https://api.whatsapp.com/send?text=${encoded}`;
    window.open(url, '_blank');
  };

  const groupTotalUSD = quotation.finalPriceUSD * paxCount;
  const groupTotalTRY = quotation.finalPriceTRY * paxCount;
  const groupTotalEUR = quotation.finalPriceEUR * paxCount;
  const groupTotalSAR = quotation.finalPriceSAR * paxCount;

  return (
    <div className="h-full w-full flex flex-col">
      {/* Main Luxury Price Card: Single Fixed Full-Height Piece */}
      <div className="pearl-card pearl-card-emerald rounded-3xl p-5 sm:p-6 shadow-xl border border-emerald-300 relative h-full flex flex-col justify-between overflow-y-auto custom-scrollbar">
        
        {/* Currency Switcher */}
        <div className="flex items-center justify-between mb-2.5 border-b border-emerald-100 pb-2.5 shrink-0">
          <span className="text-xs font-bold text-emerald-800 flex items-center gap-1.5 uppercase tracking-wider">
            <DollarSign className="h-3.5 w-3.5 text-amber-600" />
            <span>Kişi Başı Satış Fiyatı</span>
          </span>

          <div className="flex items-center rounded-xl bg-white p-1 border border-slate-200 text-xs font-mono shadow-sm">
            {['USD', 'TRY', 'EUR', 'SAR'].map(curr => (
              <button
                key={curr}
                type="button"
                onClick={() => setActiveCurrency(curr)}
                className={`px-2.5 py-1 rounded-lg transition-all font-bold cursor-pointer ${
                  activeCurrency === curr
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {curr === 'USD' ? '$' : curr === 'TRY' ? '₺' : curr === 'EUR' ? '€' : 'SAR'}
              </button>
            ))}
          </div>
        </div>

        {/* Big Price Display */}
        <div className="my-3 space-y-1">
          <div className="flex items-baseline gap-2">
            <span className="text-4xl sm:text-5xl font-black font-mono tracking-tight text-emerald-950">
              {activeCurrency === 'USD' && `$${quotation.finalPriceUSD.toLocaleString('tr-TR')}`}
              {activeCurrency === 'TRY' && `${quotation.finalPriceTRY.toLocaleString('tr-TR')} ₺`}
              {activeCurrency === 'EUR' && `€${quotation.finalPriceEUR.toLocaleString('tr-TR')}`}
              {activeCurrency === 'SAR' && `${quotation.finalPriceSAR.toLocaleString('tr-TR')} SAR`}
            </span>
            <span className="text-xs text-slate-500 font-semibold">/ Kişi Başı</span>
          </div>

          {/* Sub-currency rates */}
          <div className="flex flex-wrap items-center gap-2 pt-1 font-mono text-xs text-slate-600">
            {activeCurrency !== 'USD' && (
              <span className="bg-white px-2 py-0.5 rounded-lg border border-slate-200 shadow-2xs">
                ${quotation.finalPriceUSD.toLocaleString('tr-TR')} USD
              </span>
            )}
            {activeCurrency !== 'TRY' && (
              <span className="bg-white px-2 py-0.5 rounded-lg border border-slate-200 shadow-2xs">
                ~{quotation.finalPriceTRY.toLocaleString('tr-TR')} ₺
              </span>
            )}
            {activeCurrency !== 'EUR' && (
              <span className="bg-white px-2 py-0.5 rounded-lg border border-slate-200 shadow-2xs">
                ~{quotation.finalPriceEUR.toLocaleString('tr-TR')} €
              </span>
            )}
          </div>
        </div>

        {/* 🏷️ PAKET BAZLI KÂR MARJI & KÂR UYGULA / KÂRSIZ SWITCH PANELİ */}
        <div className="my-3 rounded-2xl bg-white/90 p-3 border border-emerald-200 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
              <TrendingUp className="h-4 w-4 text-emerald-700" />
              <span>Paket Kâr Oranı:</span>
              <span className="font-mono text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md font-black">
                %{quotation.packageProfitMargin || 15}
              </span>
            </div>

            {/* iOS Style Profit Toggle */}
            <button
              type="button"
              onClick={onToggleApplyProfitMargin}
              className="flex items-center gap-2 px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 transition-all cursor-pointer select-none"
              title="Kârı Ekle veya Kârsız (Net Maliyet) Yap"
            >
              <div
                className={`relative inline-flex h-4 w-7 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                  applyProfitMargin ? 'bg-emerald-600' : 'bg-slate-400'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-3 w-3 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                    applyProfitMargin ? 'translate-x-3' : 'translate-x-0'
                  }`}
                />
              </div>
              <span className={`text-[11px] font-bold ${applyProfitMargin ? 'text-emerald-800' : 'text-slate-500'}`}>
                {applyProfitMargin ? 'Kâr Uygulandı' : 'Kârsız (Net Maliyet)'}
              </span>
            </button>
          </div>

          <div className="flex items-center justify-between text-[11px] font-mono pt-1 border-t border-slate-100 text-slate-500">
            <span>Ham Maliyet: <strong>${Math.round(quotation.baseCostUSD)} USD</strong></span>
            <span>Kâr Tutarı: <strong className={applyProfitMargin ? 'text-emerald-700 font-bold' : 'text-slate-400'}>+${Math.round(quotation.profitMarginAmountUSD)} USD</strong></span>
          </div>
        </div>

        {/* Group Pax Multiplier & Direct Stepper */}
        <div className="my-3 rounded-2xl bg-gradient-to-r from-emerald-50/70 via-white to-emerald-50/70 p-3 border border-emerald-200/90 shadow-3xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-emerald-700 shrink-0" />
            <div>
              <span className="text-[11px] font-bold text-slate-700 block leading-tight">
                Grup Kişi Sayısı:
              </span>
              <span className="text-[10px] text-slate-400 font-medium">Toplam Yolcu</span>
            </div>

            {/* Direct Interactive Stepper */}
            {onChangePaxCount && (
              <div className="flex items-center gap-1 bg-white px-1.5 py-0.5 rounded-xl border border-slate-200 shadow-3xs ml-1">
                <button
                  type="button"
                  onClick={() => onChangePaxCount(Math.max(1, paxCount - 1))}
                  className="h-5 w-5 rounded-md bg-slate-100 hover:bg-slate-200 active:scale-90 text-slate-700 font-bold flex items-center justify-center cursor-pointer transition-all spring-pill"
                  title="1 Kişi Azalt"
                >
                  <Minus className="h-2.5 w-2.5" />
                </button>
                <span className="font-mono font-black text-xs text-slate-900 min-w-[18px] text-center select-none">
                  {paxCount}
                </span>
                <button
                  type="button"
                  onClick={() => onChangePaxCount(Math.min(200, paxCount + 1))}
                  className="h-5 w-5 rounded-md bg-emerald-700 hover:bg-emerald-600 active:scale-90 text-white font-bold flex items-center justify-center cursor-pointer transition-all spring-pill shadow-xs"
                  title="1 Kişi Artır"
                >
                  <Plus className="h-2.5 w-2.5" />
                </button>
              </div>
            )}
          </div>

          <div className="text-right">
            <div className="text-[10px] text-slate-500 font-bold">
              Grup Toplamı ({paxCount} Kişi)
            </div>
            <div className="font-mono font-black text-emerald-950 text-base">
              {activeCurrency === 'USD' && `$${groupTotalUSD.toLocaleString('tr-TR')}`}
              {activeCurrency === 'TRY' && `${groupTotalTRY.toLocaleString('tr-TR')} ₺`}
              {activeCurrency === 'EUR' && `€${groupTotalEUR.toLocaleString('tr-TR')}`}
              {activeCurrency === 'SAR' && `${groupTotalSAR.toLocaleString('tr-TR')} SAR`}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2.5 pt-3 border-t border-emerald-100">
          <button
            type="button"
            onClick={() => {
              if (onOpenPdfModal) onOpenPdfModal();
            }}
            className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-700 to-emerald-600 hover:from-emerald-600 hover:to-emerald-500 py-3.5 px-4 font-bold text-white shadow-lg shadow-emerald-800/20 text-sm transition-all transform active:scale-98 cursor-pointer spring-pill"
          >
            <FileText className="h-4 w-4" />
            <span>Teklif Mektubu</span>
          </button>

          <button
            type="button"
            onClick={onSaveQuote}
            className={`w-full flex items-center justify-center gap-1.5 rounded-xl py-2.5 px-3 text-xs font-bold border transition-all cursor-pointer ${
              isSaved
                ? 'bg-amber-100 text-amber-900 border-amber-300'
                : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200 shadow-3xs'
            }`}
          >
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
            <span>{isSaved ? 'Teklif Başarıyla Kaydedildi' : 'Teklifi Sisteme Kaydet'}</span>
          </button>
        </div>

        {/* Staff Discount Field */}
        <div className="mt-3 pt-3 border-t border-emerald-100 flex items-center justify-between">
          <label className="text-xs font-semibold text-slate-600 flex items-center gap-1">
            <Percent className="h-3.5 w-3.5 text-amber-600" />
            <span>Özel İndirim (USD / Kişi):</span>
          </label>
          <div className="relative w-24">
            <input
              type="number"
              min="0"
              step="5"
              value={discountUSD}
              onChange={(e) => onChangeDiscount(parseFloat(e.target.value) || 0)}
              className="w-full bg-white font-mono font-bold text-right text-slate-900 rounded-lg px-2.5 py-1 text-xs border border-slate-300 focus:outline-none focus:border-emerald-600 pr-6"
            />
            <span className="absolute right-2 top-1 text-[10px] text-slate-400 font-mono">$</span>
          </div>
        </div>

        {/* Cost Breakdown Drawer */}
        <div className="mt-3 pt-3 border-t border-emerald-100">
          <button
            type="button"
            onClick={() => setShowCostBreakdown(!showCostBreakdown)}
            className="w-full flex items-center justify-between text-xs text-slate-500 hover:text-slate-800 font-medium transition-colors cursor-pointer"
          >
            <span>Detaylı Maliyet Dağılım Havuzu</span>
            {showCostBreakdown ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>

          {showCostBreakdown && (
            <div className="mt-3 space-y-2 rounded-2xl bg-white p-4 border border-slate-200 text-xs font-mono shadow-sm">
              <div className="flex items-center justify-between text-slate-700 pb-1.5 border-b border-slate-100">
                <span>Mekke Toplam ({quotation.makkahDays} Gün):</span>
                <span className="text-emerald-800 font-bold">{Math.round(quotation.makkahTotalSAR)} SAR</span>
              </div>
              <div className="flex items-center justify-between text-slate-700 pb-1.5 border-b border-slate-100">
                <span>Medine Toplam ({quotation.madinahDays} Gün):</span>
                <span className="text-amber-800 font-bold">{Math.round(quotation.madinahTotalSAR)} SAR</span>
              </div>
              <div className="flex items-center justify-between text-slate-700 pb-1.5 border-b border-slate-100">
                <span>Transferler (Kişi Başı):</span>
                <span className="text-sky-800 font-bold">{Math.round(quotation.transfersTotalSAR)} SAR</span>
              </div>
              <div className="flex items-center justify-between text-slate-700 pb-1.5 border-b border-slate-100">
                <span>Sabit & Ek Giderler:</span>
                <span className="text-purple-800 font-bold">{Math.round(quotation.fixedExpensesTotalSAR)} SAR</span>
              </div>
              <div className="flex items-center justify-between text-slate-900 font-bold pt-1 border-t border-slate-200">
                <span>Genel Toplam (SAR):</span>
                <span className="text-emerald-800">{Math.round(quotation.grandTotalCostSAR)} SAR</span>
              </div>
              <div className="flex items-center justify-between text-slate-500 text-[11px]">
                <span>Ham Maliyet (USD @ 3.75):</span>
                <span>${Math.round(quotation.baseCostUSD)} USD</span>
              </div>
              <div className="flex items-center justify-between text-amber-800 font-bold text-[11px] pt-1 border-t border-slate-100">
                <span>Merkez Kar Marjı (%{quotation.profitMarginPercent}):</span>
                <span>+{Math.round(quotation.profitMarginAmountUSD)} USD</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
