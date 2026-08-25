import React, { useState } from 'react';
import { generateQuotationPdf } from '../../services/pdfService';
import { 
  Download, 
  Printer, 
  X, 
  CheckCircle2, 
  Award,
  AlertCircle
} from 'lucide-react';
import confetti from 'canvas-confetti';
import inzarLogo from '../../assets/inzarturizmlogo.png';

export default function QuotationPdfModal({ quotation, onClose }) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  const handleDownload = async () => {
    try {
      setIsGenerating(true);
      setErrorMsg(null);
      await generateQuotationPdf('inzar-pdf-document', quotation);
      setDownloadSuccess(true);
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.6 }
      });
      setTimeout(() => setDownloadSuccess(false), 4000);
    } catch (error) {
      console.error('PDF creation error:', error);
      setErrorMsg('PDF oluşturulurken bir hata oluştu: ' + (error?.message || error));
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const todayStr = new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
  const validUntilStr = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });

  // Safe checks for dynamic inclusions
  const fixed = quotation.fixedExpensesIncluded || {};
  const transfers = quotation.transfersSelection || {};
  const roomMatrix = quotation.roomMatrix || [];

  // Extract prices from dynamic room matrix
  const doubleRoom = roomMatrix.find(r => r.occupancy === 2) || { finalPriceUSD: quotation.finalPriceUSD, finalPriceTRY: quotation.finalPriceTRY };
  const tripleRoom = roomMatrix.find(r => r.occupancy === 3) || { finalPriceUSD: Math.round((quotation.finalPriceUSD || 0) * 0.93), finalPriceTRY: Math.round((quotation.finalPriceTRY || 0) * 0.93) };
  const quadRoom = roomMatrix.find(r => r.occupancy === 4) || { finalPriceUSD: Math.round((quotation.finalPriceUSD || 0) * 0.88), finalPriceTRY: Math.round((quotation.finalPriceTRY || 0) * 0.88) };

  // Transfer labels
  const getTransferDesc = (sel) => {
    if (!sel || sel.vehicleType === 'none') return 'Talep Edilmedi (Kendi İmkânıyla)';
    if (sel.vehicleType === 'small') return `Küçük Araç (${sel.passengerCount || 2} Kişi Paylaşımlı)`;
    if (sel.vehicleType === 'big') return `Büyük Otobüs (${sel.passengerCount || 45} Kişi Paylaşımlı)`;
    return 'Dahil';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto no-print">
      <div className="relative w-full max-w-4xl bg-slate-100 rounded-3xl border border-slate-300 shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col font-sans">
        
        {/* Modal Top Action Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-white shrink-0">
          <div className="flex items-center gap-2 text-slate-900 font-bold text-base sm:text-lg">
            <Award className="h-5 w-5 text-emerald-700" />
            <span>Resmi Umre Teklif Belgesi (A4 Matbaa Önizleme)</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold border border-slate-300 transition-all cursor-pointer spring-pill"
            >
              <Printer className="h-4 w-4" />
              <span>Yazdır / PDF</span>
            </button>

            <button
              type="button"
              disabled={isGenerating}
              onClick={handleDownload}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold shadow-md transition-all cursor-pointer spring-pill ${
                downloadSuccess 
                  ? 'bg-emerald-600 text-white' 
                  : 'bg-emerald-700 hover:bg-emerald-600 text-white active:scale-95'
              } disabled:opacity-60`}
            >
              {downloadSuccess ? (
                <>
                  <CheckCircle2 className="h-4 w-4 text-white" />
                  <span>PDF Başarıyla İndirildi!</span>
                </>
              ) : (
                <>
                  <Download className={`h-4 w-4 ${isGenerating ? 'animate-bounce' : ''}`} />
                  <span>{isGenerating ? 'Hazırlanıyor...' : 'Resmi PDF İndir'}</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {errorMsg && (
          <div className="bg-rose-50 border-b border-rose-200 px-6 py-2.5 text-xs text-rose-700 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* PDF Document Paper (Pure Inline Standard Styles for 100% Identical Single Page Output) */}
        <div className="overflow-y-auto p-4 sm:p-8 bg-slate-300 flex justify-center">
          <div
            id="inzar-pdf-document"
            style={{
              width: '794px',
              height: '1122px',
              maxHeight: '1122px',
              backgroundColor: '#ffffff',
              color: '#0f172a',
              padding: '26px 34px',
              boxSizing: 'border-box',
              fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
              borderRadius: '2px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              overflow: 'hidden'
            }}
          >
            {/* Header Section: Frameless Logo */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '2.5px solid #064e3b', paddingBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <img 
                  src={inzarLogo} 
                  alt="İnzar Turizm Logo" 
                  crossOrigin="anonymous"
                  style={{ height: '60px', width: 'auto', objectFit: 'contain', display: 'block' }}
                />
                <div>
                  <h1 style={{ margin: 0, fontSize: '21px', fontWeight: '900', color: '#064e3b', letterSpacing: '-0.5px' }}>
                    İNZAR TURİZM
                  </h1>
                  <p style={{ margin: '1px 0 0 0', fontSize: '10px', fontWeight: '800', color: '#b45309', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                    Hac & Umre Organizasyonu • Turizm Acentesi
                  </p>
                  <p style={{ margin: '1px 0 0 0', fontSize: '9px', color: '#64748b' }}>
                    TÜRSAB Belge No: 8207 • Diyanet Yetkili
                  </p>
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <div style={{ display: 'inline-block', backgroundColor: '#064e3b', color: '#ffffff', fontWeight: '800', fontSize: '12px', padding: '6px 14px', borderRadius: '4px', letterSpacing: '0.5px' }}>
                  RESMİ FİYAT TEKLİF FORMU
                </div>
                <div style={{ marginTop: '6px', fontSize: '11px', color: '#475569', lineHeight: '1.4' }}>
                  <div><strong>Teklif No:</strong> INZ-{Date.now().toString().slice(-6)}</div>
                  <div><strong>Tarih:</strong> {todayStr}</div>
                  <div><strong>Geçerlilik:</strong> {validUntilStr}</div>
                </div>
              </div>
            </div>

            {/* Info Summary Banner */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', margin: '20px 0', padding: '14px 18px', borderRadius: '8px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', fontSize: '12px' }}>
              <div>
                <div style={{ fontSize: '10px', fontWeight: '800', textTransform: 'uppercase', color: '#065f46', marginBottom: '4px' }}>
                  SAYIN MİSAFİRİMİZ / REFERANS:
                </div>
                <div style={{ fontSize: '14px', fontWeight: '800', color: '#0f172a' }}>{quotation.customerName || 'Değerli Misafirimiz'}</div>
                <div style={{ color: '#475569', marginTop: '2px' }}>İletişim: <strong>{quotation.customerPhone || '-'}</strong></div>
                <div style={{ color: '#475569', marginTop: '2px' }}>Grup Kişi Sayısı: <strong>{quotation.paxCount || 1} Kişi</strong></div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '10px', fontWeight: '800', textTransform: 'uppercase', color: '#065f46', marginBottom: '4px' }}>
                  PROGRAM & REZERVASYON ÖZETİ:
                </div>
                <div style={{ fontSize: '14px', fontWeight: '800', color: '#047857' }}>{quotation.packageName}</div>
                <div style={{ color: '#475569', marginTop: '2px' }}>
                  Toplam Süre: <strong>{Number(quotation.makkahDays) + Number(quotation.madinahDays)} Gün</strong> 
                  {quotation.madinahDays === 0 ? ' (Sadece Mekke)' : quotation.makkahDays === 0 ? ' (Sadece Medine)' : ` (${quotation.makkahDays}G Mekke / ${quotation.madinahDays}G Medine)`}
                </div>
                <div style={{ color: '#475569', marginTop: '2px' }}>Dönem: <strong>{quotation.selectedMonthLabel || quotation.selectedMonth || 'Ocak (Sömestr Tatili)'}</strong></div>
              </div>
            </div>

            {/* Hotel Standards Table */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#064e3b', marginBottom: '6px', borderBottom: '2px solid #a7f3d0', paddingBottom: '4px' }}>
                KONAKLAMA VE OTEL STANDARTLARI
              </div>
              <table style={{ width: '100%', textAlign: 'left', fontSize: '11px', borderCollapse: 'collapse', border: '1px solid #e2e8f0' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8fafc', color: '#334155', fontWeight: 'bold', borderBottom: '2px solid #cbd5e1' }}>
                    <th style={{ padding: '8px 10px' }}>Bölge</th>
                    <th style={{ padding: '8px 10px' }}>Otel Adı</th>
                    <th style={{ padding: '8px 10px' }}>Süre</th>
                    <th style={{ padding: '8px 10px' }}>Mescid Mesafesi</th>
                    <th style={{ padding: '8px 10px' }}>Yemek Durumu</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '8px 10px', fontWeight: '800', color: '#065f46' }}>MEKKE-İ MÜKERREME</td>
                    <td style={{ padding: '8px 10px', fontWeight: '600' }}>
                      {quotation.makkahDays > 0 ? (quotation.pkgDetails?.hotelMakkah || 'Merkezi Otel') : 'Konaklama Yok'}
                    </td>
                    <td style={{ padding: '8px 10px', fontWeight: 'bold' }}>
                      {quotation.makkahDays > 0 ? `${quotation.makkahDays} Gece / Gün` : '0 Gün'}
                    </td>
                    <td style={{ padding: '8px 10px', color: '#475569' }}>
                      {quotation.makkahDays > 0 ? (quotation.pkgDetails?.distanceMakkah || 'Yürüme / Ring Servis') : '-'}
                    </td>
                    <td style={{ padding: '8px 10px', color: quotation.makkahDays > 0 ? '#047857' : '#94a3b8', fontWeight: '600' }}>
                      {quotation.makkahDays > 0 ? 'Sabah & Akşam Tabldot/Büfe' : 'Dahil Değil'}
                    </td>
                  </tr>
                  <tr>
                    <td style={{ padding: '8px 10px', fontWeight: '800', color: '#92400e' }}>MEDİNE-İ MÜNEVVERE</td>
                    <td style={{ padding: '8px 10px', fontWeight: '600' }}>
                      {quotation.madinahDays > 0 ? (quotation.pkgDetails?.hotelMadinah || 'Merkezi Otel') : 'Konaklama Yok'}
                    </td>
                    <td style={{ padding: '8px 10px', fontWeight: 'bold' }}>
                      {quotation.madinahDays > 0 ? `${quotation.madinahDays} Gece / Gün` : '0 Gün'}
                    </td>
                    <td style={{ padding: '8px 10px', color: '#475569' }}>
                      {quotation.madinahDays > 0 ? (quotation.pkgDetails?.distanceMadinah || 'Yürüme Mesafesi') : '-'}
                    </td>
                    <td style={{ padding: '8px 10px', color: quotation.madinahDays > 0 ? '#047857' : '#94a3b8', fontWeight: '600' }}>
                      {quotation.madinahDays > 0 ? 'Sabah & Akşam Tabldot/Büfe' : 'Dahil Değil'}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Transfer Routes Detail */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#064e3b', marginBottom: '6px', borderBottom: '2px solid #a7f3d0', paddingBottom: '4px' }}>
                ULAŞIM VE İÇ HAT TRANSFERLERİ
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', fontSize: '10.5px' }}>
                <div style={{ padding: '8px 10px', borderRadius: '6px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
                  <span style={{ fontWeight: 'bold', color: '#334155', display: 'block' }}>Cidde - Mekke:</span>
                  <span style={{ color: transfers.jedMek?.vehicleType === 'none' ? '#dc2626' : '#047857', fontWeight: '600' }}>
                    {getTransferDesc(transfers.jedMek)}
                  </span>
                </div>
                <div style={{ padding: '8px 10px', borderRadius: '6px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
                  <span style={{ fontWeight: 'bold', color: '#334155', display: 'block' }}>Mekke - Medine:</span>
                  <span style={{ color: transfers.mekMed?.vehicleType === 'none' ? '#dc2626' : '#047857', fontWeight: '600' }}>
                    {getTransferDesc(transfers.mekMed)}
                  </span>
                </div>
                <div style={{ padding: '8px 10px', borderRadius: '6px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
                  <span style={{ fontWeight: 'bold', color: '#334155', display: 'block' }}>Medine - Havaalanı:</span>
                  <span style={{ color: transfers.medAir?.vehicleType === 'none' ? '#dc2626' : '#047857', fontWeight: '600' }}>
                    {getTransferDesc(transfers.medAir)}
                  </span>
                </div>
              </div>
            </div>

            {/* Room Price Cards or Mixed Rooms Group Pricing */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#064e3b', marginBottom: '8px', borderBottom: '2px solid #a7f3d0', paddingBottom: '4px' }}>
                {quotation.isMixedRoomMode ? 'KARMA GRUP KONAKLAMA DAĞILIMI & FİYATLANDIRMA' : 'FİYATLANDIRMA SEÇENEKLERİ (ODA TİPİNE GÖRE KİŞİ BAŞI)'}
              </div>

              {quotation.isMixedRoomMode && quotation.mixedRoomsSummary ? (
                <div style={{ padding: '12px 16px', borderRadius: '8px', backgroundColor: '#f0fdf4', border: '1.5px solid #86efac' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', textAlign: 'center', marginBottom: '10px' }}>
                    <div style={{ padding: '8px', backgroundColor: '#ffffff', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                      <div style={{ fontSize: '10px', fontWeight: '800', color: '#475569' }}>1 KİŞİLİK</div>
                      <div style={{ fontSize: '14px', fontWeight: '900', color: '#064e3b' }}>{quotation.mixedRoomsSummary.singleRooms} Oda</div>
                      <div style={{ fontSize: '9px', color: '#64748b' }}>{quotation.mixedRoomsSummary.singleRooms * 1} Misafir</div>
                    </div>
                    <div style={{ padding: '8px', backgroundColor: '#ffffff', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                      <div style={{ fontSize: '10px', fontWeight: '800', color: '#475569' }}>2 KİŞİLİK</div>
                      <div style={{ fontSize: '14px', fontWeight: '900', color: '#064e3b' }}>{quotation.mixedRoomsSummary.doubleRooms} Oda</div>
                      <div style={{ fontSize: '9px', color: '#64748b' }}>{quotation.mixedRoomsSummary.doubleRooms * 2} Misafir</div>
                    </div>
                    <div style={{ padding: '8px', backgroundColor: '#ffffff', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                      <div style={{ fontSize: '10px', fontWeight: '800', color: '#475569' }}>3 KİŞİLİK</div>
                      <div style={{ fontSize: '14px', fontWeight: '900', color: '#064e3b' }}>{quotation.mixedRoomsSummary.tripleRooms} Oda</div>
                      <div style={{ fontSize: '9px', color: '#64748b' }}>{quotation.mixedRoomsSummary.tripleRooms * 3} Misafir</div>
                    </div>
                    <div style={{ padding: '8px', backgroundColor: '#ffffff', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                      <div style={{ fontSize: '10px', fontWeight: '800', color: '#475569' }}>4 KİŞİLİK</div>
                      <div style={{ fontSize: '14px', fontWeight: '900', color: '#064e3b' }}>{quotation.mixedRoomsSummary.quadRooms} Oda</div>
                      <div style={{ fontSize: '9px', color: '#64748b' }}>{quotation.mixedRoomsSummary.quadRooms * 4} Misafir</div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #bbf7d0', paddingTop: '8px', fontSize: '12px' }}>
                    <div>
                      <span style={{ color: '#475569' }}>Toplam Konaklama: </span>
                      <strong style={{ color: '#0f172a' }}>{quotation.mixedRoomsSummary.totalRooms} Oda ({quotation.mixedRoomsSummary.totalPax} Kişi)</strong>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ color: '#475569' }}>Grup Toplam Teklif: </span>
                      <strong style={{ fontSize: '15px', color: '#064e3b' }}>${(quotation.finalPriceUSD * (quotation.paxCount || 1)).toLocaleString('tr-TR')} USD</strong>
                      <span style={{ fontSize: '10.5px', color: '#64748b', marginLeft: '6px' }}>(Ort. ${quotation.finalPriceUSD?.toLocaleString('tr-TR')} USD / Kişi)</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', textAlign: 'center' }}>
                  {/* 2 Kişilik */}
                  <div style={{ padding: '10px', borderRadius: '8px', border: quotation.makkahRoomOccupancy === 2 ? '2px solid #059669' : '1px solid #cbd5e1', backgroundColor: quotation.makkahRoomOccupancy === 2 ? '#ecfdf5' : '#f8fafc' }}>
                    <span style={{ fontSize: '10.5px', fontWeight: '800', color: '#334155', display: 'block' }}>2 KİŞİLİK ODA</span>
                    <div style={{ fontSize: '17px', fontWeight: '900', color: '#064e3b', marginTop: '3px' }}>
                      ${doubleRoom.finalPriceUSD?.toLocaleString('tr-TR')} USD
                    </div>
                    <div style={{ fontSize: '9.5px', color: '#64748b', marginTop: '1px' }}>
                      ~{doubleRoom.finalPriceTRY?.toLocaleString('tr-TR')} ₺ / Kişi
                    </div>
                  </div>

                  {/* 3 Kişilik */}
                  <div style={{ padding: '10px', borderRadius: '8px', border: quotation.makkahRoomOccupancy === 3 ? '2px solid #059669' : '1px solid #cbd5e1', backgroundColor: quotation.makkahRoomOccupancy === 3 ? '#ecfdf5' : '#f8fafc' }}>
                    <span style={{ fontSize: '10.5px', fontWeight: '800', color: '#334155', display: 'block' }}>3 KİŞİLİK ODA</span>
                    <div style={{ fontSize: '17px', fontWeight: '900', color: '#064e3b', marginTop: '3px' }}>
                      ${tripleRoom.finalPriceUSD?.toLocaleString('tr-TR')} USD
                    </div>
                    <div style={{ fontSize: '9.5px', color: '#64748b', marginTop: '1px' }}>
                      ~{tripleRoom.finalPriceTRY?.toLocaleString('tr-TR')} ₺ / Kişi
                    </div>
                  </div>

                  {/* 4 Kişilik */}
                  <div style={{ padding: '10px', borderRadius: '8px', border: quotation.makkahRoomOccupancy === 4 ? '2px solid #059669' : '1px solid #cbd5e1', backgroundColor: quotation.makkahRoomOccupancy === 4 ? '#ecfdf5' : '#f8fafc' }}>
                    <span style={{ fontSize: '10.5px', fontWeight: '800', color: '#334155', display: 'block' }}>4 KİŞİLİK ODA</span>
                    <div style={{ fontSize: '17px', fontWeight: '900', color: '#064e3b', marginTop: '3px' }}>
                      ${quadRoom.finalPriceUSD?.toLocaleString('tr-TR')} USD
                    </div>
                    <div style={{ fontSize: '9.5px', color: '#64748b', marginTop: '1px' }}>
                      ~{quadRoom.finalPriceTRY?.toLocaleString('tr-TR')} ₺ / Kişi
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Included & Excluded Services (100% Genuine Dynamic Matching) */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#064e3b', marginBottom: '8px', borderBottom: '2px solid #a7f3d0', paddingBottom: '4px' }}>
                DAHİL / HARİÇ HİZMETLER DÖKÜMÜ
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: '20px', rowGap: '5px', fontSize: '10.5px' }}>
                
                {/* Uçak */}
                <div style={{ color: (fixed.flightTicketSAR || fixed.flightTicketUSD) ? '#065f46' : '#94a3b8' }}>
                  {(fixed.flightTicketSAR || fixed.flightTicketUSD) ? '✓ Gidiş-Dönüş Uçak Bileti (Dahil)' : '— Uçak Bileti (Dahil Değil / Kendi Temin Eder)'}
                </div>

                {/* Vize */}
                <div style={{ color: (fixed.visaTaxSAR || fixed.visaSAR) ? '#065f46' : '#94a3b8' }}>
                  {(fixed.visaTaxSAR || fixed.visaSAR) ? '✓ Suudi Arabistan Elektronik Umre Vizesi (Dahil)' : '— Umre Vizesi (Dahil Değil)'}
                </div>

                {/* Sigorta */}
                <div style={{ color: fixed.insuranceSAR ? '#065f46' : '#94a3b8' }}>
                  {fixed.insuranceSAR ? '✓ Kapsamlı Sağlık ve Seyahat Sigortası (Dahil)' : '— Seyahat Sigortası (Dahil Değil)'}
                </div>

                {/* Rehberlik */}
                <div style={{ color: (fixed.guideSAR || fixed.guidanceSAR) ? '#065f46' : '#94a3b8' }}>
                  {(fixed.guideSAR || fixed.guidanceSAR) ? '✓ Kutsal Mekan Ziyaretleri & Rehberlik (Dahil)' : '— Rehberlik Hizmeti (Dahil Değil)'}
                </div>

                {/* Çanta */}
                <div style={{ color: (fixed.bagSAR || fixed.scarfSAR) ? '#065f46' : '#94a3b8' }}>
                  {(fixed.bagSAR || fixed.scarfSAR) ? '✓ İnzar Turizm Çanta Seti & Hediyeler (Dahil)' : '— Çanta Seti (Dahil Değil)'}
                </div>

                {/* Zemzem */}
                <div style={{ color: fixed.zamzamSAR ? '#065f46' : '#94a3b8' }}>
                  {fixed.zamzamSAR ? '✓ 5 Litre Orijinal Zemzem Suyu İkramı (Dahil)' : '— Zemzem İkramı (Dahil Değil)'}
                </div>

                {/* Oteller */}
                <div style={{ color: (quotation.makkahDays > 0 || quotation.madinahDays > 0) ? '#065f46' : '#94a3b8' }}>
                  {(quotation.makkahDays > 0 || quotation.madinahDays > 0) ? '✓ Belirtilen Sürede Otel Konaklamaları (Dahil)' : '— Otel Konaklaması (Dahil Değil)'}
                </div>

                {/* 7/24 Destek */}
                <div style={{ color: '#065f46' }}>
                  ✓ 7/24 İnzar Turizm Saha & Koordinasyon Desteği
                </div>

              </div>
            </div>

            {/* Footer / Signatures */}
            <div style={{ marginTop: '28px', paddingTop: '14px', borderTop: '2px solid #cbd5e1', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '28px', fontSize: '10px', color: '#64748b' }}>
              <div>
                <p style={{ margin: 0, fontWeight: '800', color: '#1e293b', textTransform: 'uppercase' }}>Açıklamalar & Şartlar:</p>
                <ul style={{ margin: '3px 0 0 0', paddingLeft: '14px', lineHeight: '1.4' }}>
                  <li>Fiyatlar döviz kuru TCMB serbest piyasaya göre anlık hesaplanmıştır.</li>
                  <li>Kesin kayıt için pasaport fotokopisi ve kapora ödemesi gerekmektedir.</li>
                  <li>Uçuş saatleri ve hava yolu şirketleri kontenjan durumuna göre teyit edilir.</li>
                </ul>
              </div>

              <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontWeight: '800', color: '#0f172a', fontSize: '11px' }}>İNZAR TURİZM GENEL MERKEZİ</div>
                  <div style={{ color: '#475569', marginTop: '2px' }}>Yetkili Temsilci: <strong>{quotation.agentName || quotation.createdByName || 'Satış Departmanı'}</strong></div>
                </div>
                <div style={{ paddingTop: '12px' }}>
                  <div style={{ display: 'inline-block', borderBottom: '1px dashed #94a3b8', width: '140px', textAlign: 'center', color: '#94a3b8', fontSize: '9px' }}>
                    Kaşe / Yetkili İmza
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
