import React, { useState } from 'react';
import { 
  ArrowLeft, 
  Download, 
  Send, 
  CheckCircle2, 
  Share2,
  FileCheck,
  Loader2
} from 'lucide-react';
import { generateQuotationPdf, generateWhatsAppMessage, downloadDirectQuotationPdf, shareQuoteOnWhatsApp } from '../../services/pdfService';
import { useModal } from '../../context/ModalContext';
import inzarLogo from '../../assets/inzarturizmlogo.png';

export default function QuotationLetterView({ 
  quotation, 
  onBackToForm, 
  onSaveQuote, 
  isSaved, 
  activeCurrency = 'USD' 
}) {
  const { showPdfSaveLocationModal } = useModal();
  const [isDownloading, setIsDownloading] = useState(false);

  if (!quotation) {
    return (
      <div className="text-center py-20 bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
        <p className="text-slate-600 font-bold mb-4">Görüntülenecek teklif verisi bulunamadı.</p>
        <button
          onClick={onBackToForm}
          className="px-4 py-2 bg-emerald-700 text-white rounded-xl font-bold cursor-pointer hover:bg-emerald-600 transition-all"
        >
          Forma Geri Dön
        </button>
      </div>
    );
  }

  const todayStr = new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
  const validUntilStr = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
  
  const fixed = quotation.fixedExpensesIncluded || {};
  const transfers = quotation.transfersSelection || {};
  
  // Room Matrix & Pure Room Cost Calculation
  const getRoomCost = (occ) => {
    // 1. Try finding in roomMatrix
    if (quotation.roomMatrix && quotation.roomMatrix.length > 0) {
      const rm = quotation.roomMatrix.find(r => r.occupancy === occ);
      if (rm) {
        return {
          usd: rm.priceUSD || rm.totalHotelUSD || 0,
          try: rm.priceTRY || Math.round((rm.priceUSD || rm.totalHotelUSD || 0) * (quotation.currenciesUsed?.USD_TRY || 36.50))
        };
      }
    }
    // 2. Direct formula calculation
    const mkDays = Number(quotation.makkahDays) || 0;
    const mdDays = Number(quotation.madinahDays) || 0;
    const mkRoom = Number(quotation.makkahRoomSAR) || 0;
    const mdRoom = Number(quotation.madinahRoomSAR) || 0;
    const mkFood = Number(quotation.makkahFoodSAR) || 0;
    const mdFood = Number(quotation.madinahFoodSAR) || 0;
    const sarUsd = quotation.currenciesUsed?.SAR_USD || 3.75;
    const usdTry = quotation.currenciesUsed?.USD_TRY || (quotation.finalPriceUSD ? (quotation.finalPriceTRY / quotation.finalPriceUSD) : 36.50);

    if (mkRoom > 0 || mdRoom > 0) {
      const mkDaily = occ > 0 ? (mkRoom / occ) : 0;
      const mdDaily = occ > 0 ? (mdRoom / occ) : 0;
      const totalSAR = (mkDaily + mkFood) * mkDays + (mdDaily + mdFood) * mdDays;
      const usd = Math.round(totalSAR / sarUsd);
      return { usd, try: Math.round(usd * usdTry) };
    }

    // 3. Fallback estimation based on total accommodation or finalPrice
    if (quotation.totalAccommodationSAR) {
      const baseSAR = (quotation.totalAccommodationSAR / (quotation.makkahRoomOccupancy || 2)) * (2 / occ);
      const usd = Math.round(baseSAR / sarUsd);
      return { usd, try: Math.round(usd * usdTry) };
    }

    // Proportional fallback
    const factor = occ === 1 ? 1.7 : occ === 2 ? 1.0 : occ === 3 ? 0.78 : 0.68;
    const estimatedBaseHotelUSD = Math.round((quotation.finalPriceUSD || 500) * 0.45 * factor);
    return { usd: estimatedBaseHotelUSD, try: Math.round(estimatedBaseHotelUSD * usdTry) };
  };

  // Grand Total for single room mode or mixed room mode
  const paxCount = quotation.paxCount || 1;
  const isMixed = quotation.isMixedRoomMode && quotation.mixedRoomsSummary;
  
  const grandTotalUSD = isMixed
    ? (quotation.mixedRoomsSummary.groupGrandTotalUSD || quotation.finalPriceUSD * paxCount)
    : (quotation.finalPriceUSD * paxCount);

  const grandTotalTRY = isMixed
    ? (quotation.mixedRoomsSummary.groupGrandTotalTRY || quotation.finalPriceTRY * paxCount)
    : (quotation.finalPriceTRY * paxCount);

  const selectedOccupancy = quotation.makkahRoomOccupancy || 2;
  const selectedOccupancyLabel = `${selectedOccupancy} Kişilik Oda`;

  const selectedRoomOnlyCost = getRoomCost(selectedOccupancy);

  const getTransferText = (sel) => {
    if (!sel || sel.vehicleType === 'none') {
      return <span style={{ color: '#94a3b8', fontWeight: 'bold' }}>Talep Edilmedi (Kendi İmkânıyla)</span>;
    }
    if (sel.vehicleType === 'small') {
      return <span style={{ color: '#047857', fontWeight: 'bold' }}>Özel VIP Araç ({sel.passengerCount || 2} Kişi)</span>;
    }
    if (sel.vehicleType === 'big') {
      return <span style={{ color: '#047857', fontWeight: 'bold' }}>Lüks Otobüs ({sel.passengerCount || 45} Kişi Paylaşımlı)</span>;
    }
    return 'Dahil';
  };

  const handleDownloadPdf = async () => {
    const mode = await showPdfSaveLocationModal(quotation.customerName ? `${quotation.customerName}_Umre_Teklifi.pdf` : 'Inzar_Umre_Teklifi.pdf');
    if (!mode) return;

    try {
      setIsDownloading(true);
      await downloadDirectQuotationPdf(quotation, mode);
    } catch (err) {
      console.error('PDF error:', err);
      try {
        await generateQuotationPdf('inzar-app-printable-letter', quotation);
      } catch (e2) {
        alert('PDF oluşturulamadı.');
      }
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="space-y-6 font-sans">
      <div className="flex justify-center pb-16 overflow-x-auto">
        <div
          id="inzar-app-printable-letter"
          style={{
            width: '794px',
            minHeight: '1122px',
            maxHeight: '1122px',
            backgroundColor: '#ffffff',
            color: '#0f172a',
            padding: '24px 32px',
            boxSizing: 'border-box',
            fontFamily: "'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, Helvetica, Arial, sans-serif",
            boxShadow: '0 20px 35px -10px rgba(0, 0, 0, 0.12), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
            borderRadius: '2px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            overflow: 'hidden'
          }}
        >
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between', 
            padding: '12px 18px', 
            borderRadius: '14px', 
            background: 'linear-gradient(135deg, #064e3b 0%, #065f46 60%, #047857 100%)', 
            color: '#ffffff',
            boxShadow: '0 4px 12px rgba(6, 78, 59, 0.15)',
            marginBottom: '10px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{ backgroundColor: '#ffffff', padding: '6px 10px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <img 
                  src={inzarLogo} 
                  alt="İnzar Turizm Logo" 
                  crossOrigin="anonymous"
                  style={{ height: '46px', width: 'auto', objectFit: 'contain', display: 'block' }}
                />
              </div>
              <div>
                <h1 style={{ margin: 0, fontSize: '19px', fontWeight: '900', color: '#ffffff', letterSpacing: '-0.2px', lineHeight: '1.1' }}>
                  İNZAR TURİZM
                </h1>
                <p style={{ margin: '2px 0 0 0', fontSize: '9px', fontWeight: '800', color: '#fef08a', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                  Hac & Umre Organizasyonu • Lüks Seyahat Hizmetleri
                </p>
                <p style={{ margin: '2px 0 0 0', fontSize: '8.5px', color: '#a7f3d0' }}>
                  TÜRSAB Belge No: 8207 • T.C. Diyanet İşleri Başkanlığı Yetkili Acente
                </p>
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ display: 'inline-block', backgroundColor: '#fef08a', color: '#064e3b', fontWeight: '900', fontSize: '10px', padding: '4px 12px', borderRadius: '20px', letterSpacing: '0.4px', textTransform: 'uppercase', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                RESMİ FİYAT TEKLİFİ
              </div>
              <div style={{ marginTop: '5px', fontSize: '9px', color: '#d1fae5', lineHeight: '1.35' }}>
                <div><strong>Teklif Ref:</strong> INZ-{Date.now().toString().slice(-6)}</div>
                <div><strong>Tarih:</strong> {todayStr}</div>
                <div><strong>Geçerlilik:</strong> {validUntilStr} (15 Gün)</div>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: '10px', marginBottom: '10px' }}>
            <div style={{ 
              padding: '10px 14px', 
              borderRadius: '12px', 
              backgroundColor: '#f8fafc', 
              border: '1.5px solid #e2e8f0', 
              fontSize: '10px' 
            }}>
              <div style={{ fontSize: '8.5px', fontWeight: '800', textTransform: 'uppercase', color: '#065f46', letterSpacing: '0.5px', marginBottom: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#065f46" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                <span>SAYIN MİSAFİRİMİZ / KURUM:</span>
              </div>
              <div style={{ fontSize: '13.5px', fontWeight: '900', color: '#0f172a', letterSpacing: '-0.2px' }}>
                {quotation.customerName || 'Değerli Misafirimiz'}
              </div>
              <div style={{ color: '#475569', marginTop: '2px' }}>
                İletişim: <strong style={{ color: '#0f172a' }}>{quotation.customerPhone || '-'}</strong>
              </div>
              <div style={{ color: '#475569', marginTop: '1px' }}>
                Grup Kişi Sayısı: <strong style={{ color: '#064e3b' }}>{quotation.paxCount || 1} Misafir</strong>
              </div>
            </div>

            <div style={{ 
              padding: '10px 14px', 
              borderRadius: '12px', 
              backgroundColor: '#f0fdf4', 
              border: '1.5px solid #bbf7d0', 
              fontSize: '10px',
              textAlign: 'right'
            }}>
              <div style={{ fontSize: '8.5px', fontWeight: '800', textTransform: 'uppercase', color: '#065f46', letterSpacing: '0.5px', marginBottom: '2px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
                <span>PROGRAM KÜNYESİ & ROTA:</span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#065f46" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
              </div>
              <div style={{ fontSize: '13.5px', fontWeight: '900', color: '#047857', letterSpacing: '-0.2px' }}>
                {quotation.packageName}
              </div>
              <div style={{ color: '#475569', marginTop: '2px' }}>
                Seyahat Tarihi: <strong style={{ color: '#0f172a' }}>{quotation.startDate ? `${quotation.startDate} - ${quotation.endDate || ''}` : (quotation.selectedMonthLabel || 'Belirtilmedi')}</strong>
              </div>
              <div style={{ color: '#475569', marginTop: '1px' }}>
                Süre & Rota: <strong style={{ color: '#064e3b' }}>{Number(quotation.makkahDays) + Number(quotation.madinahDays)} Gece ({quotation.routeOrder === 'madinah_first' ? 'Medine ➔ Mekke' : 'Mekke ➔ Medine'})</strong>
              </div>
            </div>
          </div>

          <div style={{ 
            marginBottom: '10px', 
            borderRadius: '12px', 
            border: '1.5px solid #e2e8f0', 
            overflow: 'hidden',
            backgroundColor: '#ffffff'
          }}>
            <div style={{ 
              padding: '6px 12px', 
              backgroundColor: '#f1f5f9', 
              borderBottom: '1px solid #cbd5e1', 
              fontSize: '9.5px', 
              fontWeight: '800', 
              color: '#064e3b', 
              textTransform: 'uppercase', 
              letterSpacing: '0.4px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#064e3b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2Z"/><path d="m9 16 .348-.24c1.465-1.013 3.84-1.013 5.304 0L15 16"/><path d="M8 7h.01"/><path d="M16 7h.01"/><path d="M12 7h.01"/><path d="M12 11h.01"/><path d="M16 11h.01"/><path d="M8 11h.01"/></svg>
              <span>KONAKLAMA VE OTEL STANDARTLARI</span>
            </div>
            <table style={{ width: '100%', textAlign: 'left', fontSize: '9.5px', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', color: '#475569', fontWeight: 'bold', borderBottom: '1px solid #e2e8f0' }}>
                  <th style={{ padding: '6px 10px' }}>Durak / Bölge</th>
                  <th style={{ padding: '6px 10px' }}>Otel Adı</th>
                  <th style={{ padding: '6px 10px' }}>Süre</th>
                  <th style={{ padding: '6px 10px' }}>Mescid Mesafesi</th>
                  <th style={{ padding: '6px 10px' }}>Yemek Durumu</th>
                </tr>
              </thead>
              <tbody>
                {quotation.routeOrder === 'madinah_first' ? (
                  <>
                    <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '6px 10px', fontWeight: '800', color: '#065f46' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <img src="/medine.png" alt="Medine" style={{ width: '12px', height: '12px', objectFit: 'contain', opacity: 0.8 }} />
                          <span>1. MEDİNE-İ MÜNEVVERE</span>
                        </div>
                      </td>
                      <td style={{ padding: '6px 10px', fontWeight: '700', color: '#0f172a' }}>
                        {quotation.selectedMadinahHotel?.name || quotation.pkgDetails?.hotelMadinah || 'Medine Oteli'}
                      </td>
                      <td style={{ padding: '6px 10px', fontWeight: '800', color: '#065f46' }}>{quotation.madinahDays} Gece</td>
                      <td style={{ padding: '6px 10px', color: '#475569' }}>
                        {quotation.selectedMadinahHotel?.distance || quotation.pkgDetails?.distanceMadinah || 'Merkezi / Yürüme Mesafesi'}
                      </td>
                      <td style={{ padding: '6px 10px', color: '#475569' }}>
                        {quotation.includeMadinahMeals !== false ? `${quotation.selectedMadinahHotel?.mealType || quotation.pkgDetails?.mealMadinah || 'Açık Büfe'} (Sabah & Akşam)` : 'Yemeksiz (Sadece Konaklama)'}
                      </td>
                    </tr>
                    <tr>
                      <td style={{ padding: '6px 10px', fontWeight: '800', color: '#065f46' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <img src="/mekke.png" alt="Mekke" style={{ width: '12px', height: '12px', objectFit: 'contain', opacity: 0.8 }} />
                          <span>2. MEKKE-İ MÜKERREME</span>
                        </div>
                      </td>
                      <td style={{ padding: '6px 10px', fontWeight: '700', color: '#0f172a' }}>
                        {quotation.selectedMakkahHotel?.name || quotation.pkgDetails?.hotelMakkah || 'Mekke Oteli'}
                      </td>
                      <td style={{ padding: '6px 10px', fontWeight: '800', color: '#065f46' }}>{quotation.makkahDays} Gece</td>
                      <td style={{ padding: '6px 10px', color: '#475569' }}>
                        {quotation.selectedMakkahHotel?.distance || quotation.pkgDetails?.distanceMakkah || 'Merkezi / Yürüme Mesafesi'}
                      </td>
                      <td style={{ padding: '6px 10px', color: '#475569' }}>
                        {quotation.includeMakkahMeals !== false ? `${quotation.selectedMakkahHotel?.mealType || quotation.pkgDetails?.mealMakkah || 'Açık Büfe'} (Sabah & Akşam)` : 'Yemeksiz (Sadece Konaklama)'}
                      </td>
                    </tr>
                  </>
                ) : (
                  <>
                    <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '6px 10px', fontWeight: '800', color: '#065f46' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <img src="/mekke.png" alt="Mekke" style={{ width: '12px', height: '12px', objectFit: 'contain', opacity: 0.8 }} />
                          <span>1. MEKKE-İ MÜKERREME</span>
                        </div>
                      </td>
                      <td style={{ padding: '6px 10px', fontWeight: '700', color: '#0f172a' }}>
                        {quotation.selectedMakkahHotel?.name || quotation.pkgDetails?.hotelMakkah || 'Mekke Oteli'}
                      </td>
                      <td style={{ padding: '6px 10px', fontWeight: '800', color: '#065f46' }}>{quotation.makkahDays} Gece</td>
                      <td style={{ padding: '6px 10px', color: '#475569' }}>
                        {quotation.selectedMakkahHotel?.distance || quotation.pkgDetails?.distanceMakkah || 'Merkezi / Yürüme Mesafesi'}
                      </td>
                      <td style={{ padding: '6px 10px', color: '#475569' }}>
                        {quotation.includeMakkahMeals !== false ? `${quotation.selectedMakkahHotel?.mealType || quotation.pkgDetails?.mealMakkah || 'Açık Büfe'} (Sabah & Akşam)` : 'Yemeksiz (Sadece Konaklama)'}
                      </td>
                    </tr>
                    <tr>
                      <td style={{ padding: '6px 10px', fontWeight: '800', color: '#065f46' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <img src="/medine.png" alt="Medine" style={{ width: '12px', height: '12px', objectFit: 'contain', opacity: 0.8 }} />
                          <span>2. MEDİNE-İ MÜNEVVERE</span>
                        </div>
                      </td>
                      <td style={{ padding: '6px 10px', fontWeight: '700', color: '#0f172a' }}>
                        {quotation.selectedMadinahHotel?.name || quotation.pkgDetails?.hotelMadinah || 'Medine Oteli'}
                      </td>
                      <td style={{ padding: '6px 10px', fontWeight: '800', color: '#065f46' }}>{quotation.madinahDays} Gece</td>
                      <td style={{ padding: '6px 10px', color: '#475569' }}>
                        {quotation.selectedMadinahHotel?.distance || quotation.pkgDetails?.distanceMadinah || 'Merkezi / Yürüme Mesafesi'}
                      </td>
                      <td style={{ padding: '6px 10px', color: '#475569' }}>
                        {quotation.includeMadinahMeals !== false ? `${quotation.selectedMadinahHotel?.mealType || quotation.pkgDetails?.mealMadinah || 'Açık Büfe'} (Sabah & Akşam)` : 'Yemeksiz (Sadece Konaklama)'}
                      </td>
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          </div>

          <div style={{ marginBottom: '10px', borderRadius: '12px', border: '1.5px solid #e2e8f0', padding: '8px 12px', backgroundColor: '#ffffff' }}>
            <div style={{ fontSize: '9.5px', fontWeight: '800', textTransform: 'uppercase', color: '#064e3b', marginBottom: '6px', letterSpacing: '0.4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#064e3b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.5 2.8C2.1 11 2 11.5 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/></svg>
              <span>ULAŞIM VE İÇ HAT TRANSFERLERİ (ARAÇ DURUMU)</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', fontSize: '9px' }}>
              <div style={{ padding: '6px 10px', borderRadius: '8px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
                <span style={{ fontWeight: '800', color: '#475569', display: 'block' }}>Cidde - Mekke:</span>
                <span style={{ fontWeight: '700', color: '#064e3b', marginTop: '1px', display: 'block' }}>{getTransferText(transfers.jedMek)}</span>
              </div>
              <div style={{ padding: '6px 10px', borderRadius: '8px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
                <span style={{ fontWeight: '800', color: '#475569', display: 'block' }}>Mekke - Medine:</span>
                <span style={{ fontWeight: '700', color: '#064e3b', marginTop: '1px', display: 'block' }}>{getTransferText(transfers.mekMed)}</span>
              </div>
              <div style={{ padding: '6px 10px', borderRadius: '8px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
                <span style={{ fontWeight: '800', color: '#475569', display: 'block' }}>Medine - Havaalanı:</span>
                <span style={{ fontWeight: '700', color: '#064e3b', marginTop: '1px', display: 'block' }}>{getTransferText(transfers.medAir)}</span>
              </div>
            </div>
          </div>

          <div style={{ 
            marginBottom: '10px',
            borderRadius: '12px',
            border: '1.5px solid #e2e8f0',
            padding: '10px 14px',
            backgroundColor: '#ffffff'
          }}>
            <div style={{ 
              fontSize: '9.5px', 
              fontWeight: '800', 
              textTransform: 'uppercase', 
              color: '#064e3b', 
              marginBottom: '6px', 
              letterSpacing: '0.4px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#064e3b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 4v16"/><path d="M2 8h18a2 2 0 0 1 2 2v10"/><path d="M2 17h20"/><path d="M6 8v9"/></svg>
              <span>{isMixed ? 'KARMA GRUP KONAKLAMA DAĞILIMI' : 'SEÇİLEN ODA TİPİ VE KONAKLAMA DÜZENİ'}</span>
            </div>

            {isMixed ? (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px', textAlign: 'center', marginBottom: '8px' }}>
                  <div style={{ padding: '6px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '8.5px', fontWeight: '800', color: '#475569' }}>1 KİŞİLİK</div>
                    <div style={{ fontSize: '12px', fontWeight: '900', color: '#064e3b' }}>{quotation.mixedRoomsSummary.singleRooms} Oda</div>
                    <div style={{ fontSize: '8px', color: '#64748b' }}>{quotation.mixedRoomsSummary.singleRooms * 1} Misafir</div>
                  </div>
                  <div style={{ padding: '6px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '8.5px', fontWeight: '800', color: '#475569' }}>2 KİŞİLİK</div>
                    <div style={{ fontSize: '12px', fontWeight: '900', color: '#064e3b' }}>{quotation.mixedRoomsSummary.doubleRooms} Oda</div>
                    <div style={{ fontSize: '8px', color: '#64748b' }}>{quotation.mixedRoomsSummary.doubleRooms * 2} Misafir</div>
                  </div>
                  <div style={{ padding: '6px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '8.5px', fontWeight: '800', color: '#475569' }}>3 KİŞİLİK</div>
                    <div style={{ fontSize: '12px', fontWeight: '900', color: '#064e3b' }}>{quotation.mixedRoomsSummary.tripleRooms} Oda</div>
                    <div style={{ fontSize: '8px', color: '#64748b' }}>{quotation.mixedRoomsSummary.tripleRooms * 3} Misafir</div>
                  </div>
                  <div style={{ padding: '6px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '8.5px', fontWeight: '800', color: '#475569' }}>4 KİŞİLİK</div>
                    <div style={{ fontSize: '12px', fontWeight: '900', color: '#064e3b' }}>{quotation.mixedRoomsSummary.quadRooms} Oda</div>
                    <div style={{ fontSize: '8px', color: '#64748b' }}>{quotation.mixedRoomsSummary.quadRooms * 4} Misafir</div>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #e2e8f0', paddingTop: '4px', fontSize: '9.5px' }}>
                  <div>
                    <span style={{ color: '#475569' }}>Toplam Konaklama: </span>
                    <strong style={{ color: '#0f172a' }}>{quotation.mixedRoomsSummary.totalRooms} Oda ({quotation.mixedRoomsSummary.totalPax} Misafir)</strong>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between', 
                padding: '8px 12px', 
                borderRadius: '8px', 
                backgroundColor: '#f8fafc', 
                border: '1px solid #e2e8f0'
              }}>
                <div>
                  <span style={{ fontSize: '8.5px', fontWeight: '800', color: '#065f46', textTransform: 'uppercase', letterSpacing: '0.4px', display: 'block' }}>
                    SEÇİLEN ODA KATEGORİSİ
                  </span>
                  <div style={{ fontSize: '13.5px', fontWeight: '900', color: '#0f172a', marginTop: '1px' }}>
                    {selectedOccupancyLabel}
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '8.5px', fontWeight: '800', color: '#047857', display: 'block' }}>
                    KONAKLAMA KAPASİTESİ
                  </span>
                  <div style={{ fontSize: '12px', fontWeight: '900', color: '#0f172a', marginTop: '1px' }}>
                    {selectedOccupancy} Kişi / Oda ({paxCount || 1} Misafir)
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ══════════════════════════════════════════════════════════════
              6. INCLUSIONS & EXCLUSIONS LIST (ROUNDED 12PX BOX)
             ══════════════════════════════════════════════════════════════ */}
          <div style={{ 
            marginBottom: '10px', 
            borderRadius: '12px', 
            border: '1.5px solid #e2e8f0', 
            padding: '8px 12px',
            backgroundColor: '#ffffff'
          }}>
            <div style={{ 
              fontSize: '9.5px', 
              fontWeight: '800', 
              textTransform: 'uppercase', 
              color: '#064e3b', 
              marginBottom: '4px', 
              letterSpacing: '0.4px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#064e3b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>
              <span>FİYATA DAHİL OLAN HİZMETLER VE AYRICALIKLAR</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: '16px', rowGap: '3.5px', fontSize: '9px' }}>
              <div style={{ color: (fixed.flightTicketSAR || fixed.flightTicketUSD) ? '#065f46' : '#94a3b8', fontWeight: '700' }}>
                {(fixed.flightTicketSAR || fixed.flightTicketUSD) ? '✓ Gidiş-Dönüş Uçak Bileti (Dahil)' : '— Uçak Bileti (Dahil Değil)'}
              </div>
              <div style={{ color: (fixed.visaTaxSAR || fixed.visaSAR) ? '#065f46' : '#94a3b8', fontWeight: '700' }}>
                {(fixed.visaTaxSAR || fixed.visaSAR) ? '✓ Suudi Arabistan Umre Vizesi (Dahil)' : '— Umre Vizesi (Dahil Değil)'}
              </div>
              <div style={{ color: fixed.insuranceSAR ? '#065f46' : '#94a3b8', fontWeight: '700' }}>
                {fixed.insuranceSAR ? '✓ Kapsamlı Sağlık & Seyahat Sigortası (Dahil)' : '— Seyahat Sigortası (Dahil Değil)'}
              </div>
              <div style={{ color: (fixed.guideSAR || fixed.guidanceSAR) ? '#065f46' : '#94a3b8', fontWeight: '700' }}>
                {(fixed.guideSAR || fixed.guidanceSAR) ? '✓ Kutsal Mekan Ziyaretleri & Rehberlik (Dahil)' : '— Rehberlik Hizmeti (Dahil Değil)'}
              </div>
              <div style={{ color: (fixed.bagSAR || fixed.scarfSAR) ? '#065f46' : '#94a3b8', fontWeight: '700' }}>
                {(fixed.bagSAR || fixed.scarfSAR) ? '✓ Seyahat Çanta Seti & Hediyeler (Dahil)' : '— Çanta Seti (Dahil Değil)'}
              </div>
              <div style={{ color: fixed.zamzamSAR ? '#065f46' : '#94a3b8', fontWeight: '700' }}>
                {fixed.zamzamSAR ? '✓ 5 Litre Orijinal Zemzem Suyu İkramı (Dahil)' : '— Zemzem İkramı (Dahil Değil)'}
              </div>
              <div style={{ color: (quotation.makkahDays > 0 || quotation.madinahDays > 0) ? '#065f46' : '#94a3b8', fontWeight: '700' }}>
                {(quotation.makkahDays > 0 || quotation.madinahDays > 0) ? '✓ Otellerde Program Süresince Konaklama (Dahil)' : '— Otel Konaklaması (Dahil Değil)'}
              </div>
              <div style={{ color: '#065f46', fontWeight: '700' }}>
                ✓ 7/24 Havalimanı Karşılama, Transfer & Saha Koordinasyon Desteği
              </div>
            </div>
          </div>

          {/* ══════════════════════════════════════════════════════════════
              7. KİŞİ BAŞI TOPLAM HİZMET BEDELİ (DAHİLİ HİZMETLER & ARAÇ DAHİL)
             ══════════════════════════════════════════════════════════════ */}
          <div style={{ 
            marginBottom: '10px', 
            borderRadius: '12px', 
            border: '1.5px solid #a7f3d0', 
            padding: '8px 12px',
            backgroundColor: '#ecfdf5'
          }}>
            <div style={{ 
              fontSize: '9.5px', 
              fontWeight: '800', 
              textTransform: 'uppercase', 
              color: '#064e3b', 
              marginBottom: '6px', 
              letterSpacing: '0.4px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#064e3b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="m16 10-4 4-2-2"/></svg>
              <span>{isMixed ? 'ODA TERCİHİNE GÖRE KİŞİ BAŞI TOPLAM HİZMET BEDELLERİ (HER ŞEY DAHİL)' : 'KİŞİ BAŞI TOPLAM HİZMET BEDELİ (HER ŞEY DAHİL)'}</span>
            </div>

            {isMixed && quotation.mixedRoomsBreakdown ? (() => {
              const activeTypes = [
                { key: 'single', label: '1 KİŞİLİK ODA', count: quotation.mixedRooms?.single || 0, data: quotation.mixedRoomsBreakdown.single },
                { key: 'double', label: '2 KİŞİLİK ODA', count: quotation.mixedRooms?.double || 0, data: quotation.mixedRoomsBreakdown.double },
                { key: 'triple', label: '3 KİŞİLİK ODA', count: quotation.mixedRooms?.triple || 0, data: quotation.mixedRoomsBreakdown.triple },
                { key: 'quad', label: '4 KİŞİLİK ODA', count: quotation.mixedRooms?.quad || 0, data: quotation.mixedRoomsBreakdown.quad }
              ].filter(r => r.count > 0);

              const cols = activeTypes.length > 0 ? activeTypes.length : 1;

              return (
                <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: '6px', textAlign: 'center' }}>
                  {activeTypes.map(r => (
                    <div key={r.key} style={{ padding: '6px 8px', backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
                      <div style={{ fontSize: '8.5px', fontWeight: '800', color: '#065f46' }}>{r.label} ({r.count} Oda)</div>
                      <div style={{ fontSize: '13px', fontWeight: '900', color: '#0f172a', marginTop: '1px' }}>
                        ${r.data?.priceUSD?.toLocaleString('tr-TR')} USD
                      </div>
                      <div style={{ fontSize: '8px', color: '#047857', fontWeight: '700' }}>
                        ~{r.data?.priceTRY?.toLocaleString('tr-TR')} ₺ / Kişi
                      </div>
                    </div>
                  ))}
                </div>
              );
            })() : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 6px' }}>
                <div>
                  <div style={{ fontSize: '11px', fontWeight: '800', color: '#064e3b' }}>
                    {selectedOccupancyLabel} (Kişi Başı Paket Bedeli)
                  </div>
                  <div style={{ fontSize: '8.5px', color: '#475569', marginTop: '1px' }}>
                    Otel Konaklaması, Vize, Uçak Bileti, Araç/Transferler ve Tüm Dahili Hizmetler Dahildir.
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '15px', fontWeight: '900', color: '#064e3b' }}>
                    ${quotation.finalPriceUSD?.toLocaleString('tr-TR')} USD
                  </div>
                  <div style={{ fontSize: '9px', color: '#047857', fontWeight: '800' }}>
                    ~{quotation.finalPriceTRY?.toLocaleString('tr-TR')} ₺ (Kişi Başı)
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ══════════════════════════════════════════════════════════════
              8. VURGULU TOPLAM BEDEL / MALİYET KUTUSU (STANDALONE)
             ══════════════════════════════════════════════════════════════ */}
          <div style={{ 
            marginBottom: '10px',
            padding: '10px 16px', 
            borderRadius: '12px', 
            backgroundColor: '#064e3b', 
            color: '#ffffff',
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            boxShadow: '0 4px 12px rgba(6, 78, 59, 0.25)',
            border: '1.5px solid #047857'
          }}>
            <div>
              <div style={{ fontSize: '10px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.4px', color: '#fef08a' }}>
                {isMixed ? 'GRUP GENEL TOPLAM HİZMET BEDELİ' : `TOPLAM HİZMET BEDELİ (${paxCount} KİŞİ)`}
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '20px', fontWeight: '900', color: '#fbbf24', letterSpacing: '-0.3px', lineHeight: '1' }}>
                ${grandTotalUSD?.toLocaleString('tr-TR')} USD
              </div>
              <div style={{ fontSize: '10px', color: '#d1fae5', fontWeight: '700', marginTop: '2px' }}>
                ~{grandTotalTRY?.toLocaleString('tr-TR')} ₺ (TCMB Kuruna Göre)
              </div>
            </div>
          </div>

          {/* ══════════════════════════════════════════════════════════════
              9. FOOTER / TERMS & SIGNATURE (ROUNDED 12PX BOX)
             ══════════════════════════════════════════════════════════════ */}
          <div style={{ 
            borderRadius: '12px', 
            border: '1.5px solid #cbd5e1', 
            padding: '8px 12px', 
            backgroundColor: '#f8fafc',
            display: 'grid', 
            gridTemplateColumns: '1.2fr 1fr', 
            gap: '16px', 
            fontSize: '8.5px', 
            color: '#64748b' 
          }}>
            <div>
              <p style={{ margin: 0, fontWeight: '800', color: '#1e293b', textTransform: 'uppercase', letterSpacing: '0.2px' }}>Açıklamalar & Şartlar:</p>
              <ul style={{ margin: '2px 0 0 0', paddingLeft: '12px', lineHeight: '1.35' }}>
                <li>Fiyatlar döviz kuru TCMB serbest piyasa alışına göre anlık hesaplanmıştır.</li>
                <li>Kesin kayıt için pasaport fotokopisi ve kapora ödemesi gerekmektedir.</li>
                <li>Uçuş saatleri ve hava yolu şirketleri kontenjan durumuna göre teyit edilir.</li>
              </ul>
            </div>

            <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontWeight: '800', color: '#0f172a', fontSize: '9.5px' }}>İNZAR TURİZM GENEL MERKEZİ</div>
                <div style={{ color: '#475569', marginTop: '1px' }}>Yetkili Satış Danışmanı: <strong>{quotation.agentName || quotation.createdByName || 'Satış Departmanı'}</strong></div>
              </div>
              <div style={{ paddingTop: '4px' }}>
                <div style={{ display: 'inline-block', borderBottom: '1.5px dashed #94a3b8', width: '130px', textAlign: 'center', color: '#94a3b8', fontSize: '8px' }}>
                  Kaşe / Yetkili İmza
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
