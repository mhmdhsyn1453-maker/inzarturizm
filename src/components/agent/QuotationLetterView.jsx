import React, { useState } from 'react';
import { 
  ArrowLeft, 
  Printer, 
  Download, 
  Send, 
  CheckCircle2, 
  Share2,
  FileCheck
} from 'lucide-react';
import { generateQuotationPdf, generateWhatsAppMessage } from '../../services/pdfService';
import inzarLogo from '../../assets/inzarturizmlogo.png';

export default function QuotationLetterView({ 
  quotation, 
  onBackToForm, 
  onSaveQuote, 
  isSaved, 
  activeCurrency = 'USD' 
}) {
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
  const roomMatrix = quotation.roomMatrix || [];

  const doubleRoom = roomMatrix.find(r => r.occupancy === 2) || { finalPriceUSD: quotation.finalPriceUSD, finalPriceTRY: quotation.finalPriceTRY };
  const tripleRoom = roomMatrix.find(r => r.occupancy === 3) || { finalPriceUSD: Math.round((quotation.finalPriceUSD || 0) * 0.93), finalPriceTRY: Math.round((quotation.finalPriceTRY || 0) * 0.93) };
  const quadRoom = roomMatrix.find(r => r.occupancy === 4) || { finalPriceUSD: Math.round((quotation.finalPriceUSD || 0) * 0.88), finalPriceTRY: Math.round((quotation.finalPriceTRY || 0) * 0.88) };

  const getTransferText = (sel) => {
    if (!sel || sel.vehicleType === 'none') {
      return <span style={{ color: '#dc2626', fontWeight: 'bold' }}>Talep Edilmedi (Kendi İmkânıyla)</span>;
    }
    if (sel.vehicleType === 'small') {
      return <span style={{ color: '#047857', fontWeight: 'bold' }}>Küçük Araç ({sel.passengerCount || 2} Kişi Paylaşımlı)</span>;
    }
    if (sel.vehicleType === 'big') {
      return <span style={{ color: '#047857', fontWeight: 'bold' }}>Büyük Otobüs ({sel.passengerCount || 45} Kişi Paylaşımlı)</span>;
    }
    return 'Dahil';
  };

  const handleDownloadPdf = async () => {
    try {
      setIsDownloading(true);
      await generateQuotationPdf('inzar-app-printable-letter', quotation);
    } catch (err) {
      console.error('PDF error:', err);
      alert('PDF oluşturulamadı, Yazdır butonundan PDF Olarak Kaydet seçeneğini kullanabilirsiniz.');
    } finally {
      setIsDownloading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleWhatsApp = () => {
    const encoded = generateWhatsAppMessage(quotation);
    window.open(`https://wa.me/?text=${encoded}`, '_blank');
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Center A4 Paper Document Container (Zero Blur, Integrated in App Canvas) */}
      <div className="flex justify-center pb-16 overflow-x-auto">
        <div
          id="inzar-app-printable-letter"
          style={{
            width: '794px',
            height: '1122px',
            maxHeight: '1122px',
            backgroundColor: '#ffffff',
            color: '#0f172a',
            padding: '26px 34px',
            boxSizing: 'border-box',
            fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            boxShadow: '0 20px 35px -10px rgba(0, 0, 0, 0.12), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
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
              <div style={{ display: 'inline-block', backgroundColor: '#064e3b', color: '#ffffff', fontWeight: '800', fontSize: '11px', padding: '4px 12px', borderRadius: '4px' }}>
                RESMİ FİYAT TEKLİF FORMU
              </div>
              <div style={{ marginTop: '4px', fontSize: '10px', color: '#475569', lineHeight: '1.35' }}>
                <div><strong>Teklif No:</strong> INZ-{Date.now().toString().slice(-6)}</div>
                <div><strong>Tarih:</strong> {todayStr}</div>
                <div><strong>Geçerlilik:</strong> {validUntilStr}</div>
              </div>
            </div>
          </div>

          {/* Guest Info Banner */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', margin: '10px 0', padding: '10px 14px', borderRadius: '6px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', fontSize: '11px' }}>
            <div>
              <div style={{ fontSize: '9px', fontWeight: '800', textTransform: 'uppercase', color: '#065f46', marginBottom: '2px' }}>
                SAYIN MİSAFİRİMİZ / REFERANS:
              </div>
              <div style={{ fontSize: '13px', fontWeight: '800', color: '#0f172a' }}>
                {quotation.customerName || 'Değerli Misafirimiz'}
              </div>
              <div style={{ color: '#475569', marginTop: '1px' }}>
                İletişim: <strong>{quotation.customerPhone || '-'}</strong>
              </div>
              <div style={{ color: '#475569', marginTop: '1px' }}>
                Grup Kişi Sayısı: <strong>{quotation.paxCount || 1} Kişi</strong>
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '9px', fontWeight: '800', textTransform: 'uppercase', color: '#065f46', marginBottom: '2px' }}>
                PROGRAM & REZERVASYON ÖZETİ:
              </div>
              <div style={{ fontSize: '13px', fontWeight: '800', color: '#047857' }}>
                {quotation.packageName}
              </div>
              <div style={{ color: '#475569', marginTop: '1px' }}>
                Toplam Süre: <strong>{Number(quotation.makkahDays) + Number(quotation.madinahDays)} Gün</strong> 
                {quotation.madinahDays === 0 ? ' (Sadece Mekke)' : quotation.makkahDays === 0 ? ' (Sadece Medine)' : ` (${quotation.makkahDays}G Mekke / ${quotation.madinahDays}G Medine)`}
              </div>
              <div style={{ color: '#475569', marginTop: '1px' }}>
                Dönem: <strong>{quotation.selectedMonthLabel || quotation.selectedMonth || 'Ocak (Sömestr Tatili)'}</strong>
              </div>
            </div>
          </div>

          {/* Hotel Standards */}
          <div style={{ marginBottom: '10px' }}>
            <div style={{ fontSize: '10.5px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#064e3b', marginBottom: '4px', borderBottom: '1.5px solid #a7f3d0', paddingBottom: '2px' }}>
              KONAKLAMA VE OTEL STANDARTLARI
            </div>
            <table style={{ width: '100%', textAlign: 'left', fontSize: '10px', border: '1px solid #e2e8f0', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', color: '#334155', fontWeight: 'bold', borderBottom: '1.5px solid #cbd5e1' }}>
                  <th style={{ padding: '6px 8px' }}>Bölge</th>
                  <th style={{ padding: '6px 8px' }}>Otel Adı</th>
                  <th style={{ padding: '6px 8px' }}>Süre</th>
                  <th style={{ padding: '6px 8px' }}>Mescid Mesafesi</th>
                  <th style={{ padding: '6px 8px' }}>Yemek Durumu</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '6px 8px', fontWeight: '800', color: '#065f46' }}>MEKKE-İ MÜKERREME</td>
                  <td style={{ padding: '6px 8px', fontWeight: '600' }}>
                    {quotation.makkahDays > 0 ? (quotation.pkgDetails?.hotelMakkah || 'Merkezi Otel') : 'Konaklama Yok'}
                  </td>
                  <td style={{ padding: '6px 8px', fontWeight: 'bold' }}>
                    {quotation.makkahDays > 0 ? quotation.makkahDays + ' Gece / Gün' : '0 Gün'}
                  </td>
                  <td style={{ padding: '6px 8px', color: '#475569' }}>
                    {quotation.makkahDays > 0 ? (quotation.pkgDetails?.distanceMakkah || 'Yürüme / Ring Servis') : '-'}
                  </td>
                  <td style={{ padding: '6px 8px', color: quotation.makkahDays > 0 ? '#047857' : '#94a3b8', fontWeight: '600' }}>
                    {quotation.makkahDays > 0 ? 'Sabah & Akşam Tabldot/Büfe' : 'Dahil Değil'}
                  </td>
                </tr>
                <tr>
                  <td style={{ padding: '6px 8px', fontWeight: '800', color: '#92400e' }}>MEDİNE-İ MÜNEVVERE</td>
                  <td style={{ padding: '6px 8px', fontWeight: '600' }}>
                    {quotation.madinahDays > 0 ? (quotation.pkgDetails?.hotelMadinah || 'Merkezi Otel') : 'Konaklama Yok'}
                  </td>
                  <td style={{ padding: '6px 8px', fontWeight: 'bold' }}>
                    {quotation.madinahDays > 0 ? quotation.madinahDays + ' Gece / Gün' : '0 Gün'}
                  </td>
                  <td style={{ padding: '6px 8px', color: '#475569' }}>
                    {quotation.madinahDays > 0 ? (quotation.pkgDetails?.distanceMadinah || 'Yürüme Mesafesi') : '-'}
                  </td>
                  <td style={{ padding: '6px 8px', color: quotation.madinahDays > 0 ? '#047857' : '#94a3b8', fontWeight: '600' }}>
                    {quotation.madinahDays > 0 ? 'Sabah & Akşam Tabldot/Büfe' : 'Dahil Değil'}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Transfers */}
          <div style={{ marginBottom: '10px' }}>
            <div style={{ fontSize: '10.5px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#064e3b', marginBottom: '4px', borderBottom: '1.5px solid #a7f3d0', paddingBottom: '2px' }}>
              ULAŞIM VE İÇ HAT TRANSFERLERİ
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', fontSize: '9.5px' }}>
              <div style={{ padding: '6px 8px', borderRadius: '4px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
                <span style={{ fontWeight: 'bold', color: '#334155', display: 'block' }}>Cidde - Mekke:</span>
                <span>{getTransferText(transfers.jedMek)}</span>
              </div>
              <div style={{ padding: '6px 8px', borderRadius: '4px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
                <span style={{ fontWeight: 'bold', color: '#334155', display: 'block' }}>Mekke - Medine:</span>
                <span>{getTransferText(transfers.mekMed)}</span>
              </div>
              <div style={{ padding: '6px 8px', borderRadius: '4px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
                <span style={{ fontWeight: 'bold', color: '#334155', display: 'block' }}>Medine - Havaalanı:</span>
                <span>{getTransferText(transfers.medAir)}</span>
              </div>
            </div>
          </div>

          {/* Pricing Matrix */}
          {/* Pricing Matrix or Mixed Rooms Group Pricing */}
          <div style={{ marginBottom: '10px' }}>
            <div style={{ fontSize: '10.5px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#064e3b', marginBottom: '6px', borderBottom: '1.5px solid #a7f3d0', paddingBottom: '2px' }}>
              {quotation.isMixedRoomMode ? 'KARMA GRUP KONAKLAMA DAĞILIMI & FİYATLANDIRMA' : 'FİYATLANDIRMA SEÇENEKLERİ (ODA TİPİNE GÖRE KİŞİ BAŞI)'}
            </div>

            {quotation.isMixedRoomMode && quotation.mixedRoomsSummary ? (
              <div style={{ padding: '10px 14px', borderRadius: '6px', backgroundColor: '#f0fdf4', border: '1.5px solid #86efac' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px', textAlign: 'center', marginBottom: '8px' }}>
                  <div style={{ padding: '6px', backgroundColor: '#ffffff', borderRadius: '4px', border: '1px solid #cbd5e1' }}>
                    <div style={{ fontSize: '9px', fontWeight: '800', color: '#475569' }}>1 KİŞİLİK</div>
                    <div style={{ fontSize: '12px', fontWeight: '900', color: '#064e3b' }}>{quotation.mixedRoomsSummary.singleRooms} Oda</div>
                    <div style={{ fontSize: '8px', color: '#64748b' }}>{quotation.mixedRoomsSummary.singleRooms * 1} Misafir</div>
                  </div>
                  <div style={{ padding: '6px', backgroundColor: '#ffffff', borderRadius: '4px', border: '1px solid #cbd5e1' }}>
                    <div style={{ fontSize: '9px', fontWeight: '800', color: '#475569' }}>2 KİŞİLİK</div>
                    <div style={{ fontSize: '12px', fontWeight: '900', color: '#064e3b' }}>{quotation.mixedRoomsSummary.doubleRooms} Oda</div>
                    <div style={{ fontSize: '8px', color: '#64748b' }}>{quotation.mixedRoomsSummary.doubleRooms * 2} Misafir</div>
                  </div>
                  <div style={{ padding: '6px', backgroundColor: '#ffffff', borderRadius: '4px', border: '1px solid #cbd5e1' }}>
                    <div style={{ fontSize: '9px', fontWeight: '800', color: '#475569' }}>3 KİŞİLİK</div>
                    <div style={{ fontSize: '12px', fontWeight: '900', color: '#064e3b' }}>{quotation.mixedRoomsSummary.tripleRooms} Oda</div>
                    <div style={{ fontSize: '8px', color: '#64748b' }}>{quotation.mixedRoomsSummary.tripleRooms * 3} Misafir</div>
                  </div>
                  <div style={{ padding: '6px', backgroundColor: '#ffffff', borderRadius: '4px', border: '1px solid #cbd5e1' }}>
                    <div style={{ fontSize: '9px', fontWeight: '800', color: '#475569' }}>4 KİŞİLİK</div>
                    <div style={{ fontSize: '12px', fontWeight: '900', color: '#064e3b' }}>{quotation.mixedRoomsSummary.quadRooms} Oda</div>
                    <div style={{ fontSize: '8px', color: '#64748b' }}>{quotation.mixedRoomsSummary.quadRooms * 4} Misafir</div>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #bbf7d0', paddingTop: '6px', fontSize: '11px' }}>
                  <div>
                    <span style={{ color: '#475569' }}>Toplam Konaklama: </span>
                    <strong style={{ color: '#0f172a' }}>{quotation.mixedRoomsSummary.totalRooms} Oda ({quotation.mixedRoomsSummary.totalPax} Kişi)</strong>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ color: '#475569' }}>Grup Toplam Teklif: </span>
                    <strong style={{ fontSize: '14px', color: '#064e3b' }}>${(quotation.finalPriceUSD * (quotation.paxCount || 1)).toLocaleString('tr-TR')} USD</strong>
                    <span style={{ fontSize: '9.5px', color: '#64748b', marginLeft: '6px' }}>(Ort. ${quotation.finalPriceUSD?.toLocaleString('tr-TR')} USD / Kişi)</span>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', textAlign: 'center' }}>
                <div style={{ padding: '8px', borderRadius: '6px', border: quotation.makkahRoomOccupancy === 2 ? '2px solid #059669' : '1px solid #cbd5e1', backgroundColor: quotation.makkahRoomOccupancy === 2 ? '#ecfdf5' : '#f8fafc' }}>
                  <span style={{ fontSize: '9.5px', fontWeight: '800', color: '#334155', display: 'block' }}>2 KİŞİLİK ODA</span>
                  <div style={{ fontSize: '15px', fontWeight: '900', color: '#064e3b', marginTop: '2px' }}>
                    ${doubleRoom.finalPriceUSD?.toLocaleString('tr-TR')} USD
                  </div>
                  <div style={{ fontSize: '8.5px', color: '#64748b', marginTop: '1px' }}>
                    ~{doubleRoom.finalPriceTRY?.toLocaleString('tr-TR')} ₺ / Kişi
                  </div>
                </div>

                <div style={{ padding: '8px', borderRadius: '6px', border: quotation.makkahRoomOccupancy === 3 ? '2px solid #059669' : '1px solid #cbd5e1', backgroundColor: quotation.makkahRoomOccupancy === 3 ? '#ecfdf5' : '#f8fafc' }}>
                  <span style={{ fontSize: '9.5px', fontWeight: '800', color: '#334155', display: 'block' }}>3 KİŞİLİK ODA</span>
                  <div style={{ fontSize: '15px', fontWeight: '900', color: '#064e3b', marginTop: '2px' }}>
                    ${tripleRoom.finalPriceUSD?.toLocaleString('tr-TR')} USD
                  </div>
                  <div style={{ fontSize: '8.5px', color: '#64748b', marginTop: '1px' }}>
                    ~{tripleRoom.finalPriceTRY?.toLocaleString('tr-TR')} ₺ / Kişi
                  </div>
                </div>

                <div style={{ padding: '8px', borderRadius: '6px', border: quotation.makkahRoomOccupancy === 4 ? '2px solid #059669' : '1px solid #cbd5e1', backgroundColor: quotation.makkahRoomOccupancy === 4 ? '#ecfdf5' : '#f8fafc' }}>
                  <span style={{ fontSize: '9.5px', fontWeight: '800', color: '#334155', display: 'block' }}>4 KİŞİLİK ODA</span>
                  <div style={{ fontSize: '15px', fontWeight: '900', color: '#064e3b', marginTop: '2px' }}>
                    ${quadRoom.finalPriceUSD?.toLocaleString('tr-TR')} USD
                  </div>
                  <div style={{ fontSize: '8.5px', color: '#64748b', marginTop: '1px' }}>
                    ~{quadRoom.finalPriceTRY?.toLocaleString('tr-TR')} ₺ / Kişi
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Inclusions & Exclusions */}
          <div style={{ marginBottom: '10px' }}>
            <div style={{ fontSize: '10.5px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#064e3b', marginBottom: '4px', borderBottom: '1.5px solid #a7f3d0', paddingBottom: '2px' }}>
              DAHİL / HARİÇ HİZMETLER DÖKÜMÜ
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: '16px', rowGap: '4px', fontSize: '9.5px' }}>
              <div style={{ color: (fixed.flightTicketSAR || fixed.flightTicketUSD) ? '#065f46' : '#94a3b8' }}>
                {(fixed.flightTicketSAR || fixed.flightTicketUSD) ? '✓ Gidiş-Dönüş Uçak Bileti (Dahil)' : '— Uçak Bileti (Dahil Değil / Kendi Temin Eder)'}
              </div>
              <div style={{ color: (fixed.visaTaxSAR || fixed.visaSAR) ? '#065f46' : '#94a3b8' }}>
                {(fixed.visaTaxSAR || fixed.visaSAR) ? '✓ Suudi Arabistan Elektronik Umre Vizesi (Dahil)' : '— Umre Vizesi (Dahil Değil)'}
              </div>
              <div style={{ color: fixed.insuranceSAR ? '#065f46' : '#94a3b8' }}>
                {fixed.insuranceSAR ? '✓ Kapsamlı Sağlık ve Seyahat Sigortası (Dahil)' : '— Seyahat Sigortası (Dahil Değil)'}
              </div>
              <div style={{ color: (fixed.guideSAR || fixed.guidanceSAR) ? '#065f46' : '#94a3b8' }}>
                {(fixed.guideSAR || fixed.guidanceSAR) ? '✓ Kutsal Mekan Ziyaretleri & Rehberlik (Dahil)' : '— Rehberlik Hizmeti (Dahil Değil)'}
              </div>
              <div style={{ color: (fixed.bagSAR || fixed.scarfSAR) ? '#065f46' : '#94a3b8' }}>
                {(fixed.bagSAR || fixed.scarfSAR) ? '✓ İnzar Turizm Çanta Seti & Hediyeler (Dahil)' : '— Çanta Seti (Dahil Değil)'}
              </div>
              <div style={{ color: fixed.zamzamSAR ? '#065f46' : '#94a3b8' }}>
                {fixed.zamzamSAR ? '✓ 5 Litre Orijinal Zemzem Suyu İkramı (Dahil)' : '— Zemzem İkramı (Dahil Değil)'}
              </div>
              <div style={{ color: (quotation.makkahDays > 0 || quotation.madinahDays > 0) ? '#065f46' : '#94a3b8' }}>
                {(quotation.makkahDays > 0 || quotation.madinahDays > 0) ? '✓ Belirtilen Sürede Otel Konaklamaları (Dahil)' : '— Otel Konaklaması (Dahil Değil)'}
              </div>
              <div style={{ color: '#065f46' }}>
                ✓ 7/24 İnzar Turizm Saha & Koordinasyon Desteği
              </div>
            </div>
          </div>

          {/* Footer / Signatures (Bottom of Page) */}
          <div style={{ paddingTop: '10px', borderTop: '1.5px solid #cbd5e1', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', fontSize: '9px', color: '#64748b' }}>
            <div>
              <p style={{ margin: 0, fontWeight: '800', color: '#1e293b', textTransform: 'uppercase' }}>Açıklamalar & Şartlar:</p>
              <ul style={{ margin: '2px 0 0 0', paddingLeft: '12px', lineHeight: '1.35' }}>
                <li>Fiyatlar döviz kuru TCMB serbest piyasaya göre anlık hesaplanmıştır.</li>
                <li>Kesin kayıt için pasaport fotokopisi ve kapora ödemesi gerekmektedir.</li>
                <li>Uçuş saatleri ve hava yolu şirketleri kontenjan durumuna göre teyit edilir.</li>
              </ul>
            </div>

            <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontWeight: '800', color: '#0f172a', fontSize: '10.5px' }}>İNZAR TURİZM GENEL MERKEZİ</div>
                <div style={{ color: '#475569', marginTop: '1px' }}>Yetkili Temsilci: <strong>{quotation.agentName || quotation.createdByName || 'Satış Departmanı'}</strong></div>
              </div>
              <div style={{ paddingTop: '8px' }}>
                <div style={{ display: 'inline-block', borderBottom: '1px dashed #94a3b8', width: '130px', textAlign: 'center', color: '#94a3b8', fontSize: '8.5px' }}>
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
