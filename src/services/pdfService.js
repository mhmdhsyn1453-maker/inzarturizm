// İnzar Turizm - Profesyonel ve Kesintisiz PDF & Mektup Motoru
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Open Quotation in a Brand New Dedicated Tab (Zero Blur / Single A4 Page / Separate Print & Download)
export function openQuotationInNewPage(quote) {
  const newWin = window.open('', '_blank');
  if (!newWin) {
    alert('Lütfen tarayıcınızın pop-up engelleyicisinde bu siteye izin verin.');
    return;
  }

  const todayStr = new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
  const validUntilStr = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
  
  const fixed = quote.fixedExpensesIncluded || {};
  const transfers = quote.transfersSelection || {};
  const roomMatrix = quote.roomMatrix || [];

  const doubleRoom = roomMatrix.find(r => r.occupancy === 2) || { finalPriceUSD: quote.finalPriceUSD, finalPriceTRY: quote.finalPriceTRY };
  const tripleRoom = roomMatrix.find(r => r.occupancy === 3) || { finalPriceUSD: Math.round((quote.finalPriceUSD || 0) * 0.93), finalPriceTRY: Math.round((quote.finalPriceTRY || 0) * 0.93) };
  const quadRoom = roomMatrix.find(r => r.occupancy === 4) || { finalPriceUSD: Math.round((quote.finalPriceUSD || 0) * 0.88), finalPriceTRY: Math.round((quote.finalPriceTRY || 0) * 0.88) };

  const getTransferText = (sel) => {
    if (!sel || sel.vehicleType === 'none') return '<span style="color: #dc2626; font-weight: bold;">Talep Edilmedi (Kendi İmkânıyla)</span>';
    if (sel.vehicleType === 'small') return `<span style="color: #047857; font-weight: bold;">Küçük Araç (${escapeHtml(sel.passengerCount) || 2} Kişi Paylaşımlı)</span>`;
    if (sel.vehicleType === 'big') return `<span style="color: #047857; font-weight: bold;">Büyük Otobüs (${escapeHtml(sel.passengerCount) || 45} Kişi Paylaşımlı)</span>`;
    return 'Dahil';
  };

  const clientName = (quote.customerName || 'Misafir').replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_ğüşıöçĞÜŞİÖÇ-]/g, '');
  const pkgName = (quote.packageName || 'Umre').replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_ğüşıöçĞÜŞİÖÇ-]/g, '');
  const fileName = `Inzar_Umre_Teklifi_${clientName}_${pkgName}.pdf`;

  const safeCustomerName = escapeHtml(quote.customerName || 'Değerli Misafirimiz');
  const safeCustomerPhone = escapeHtml(quote.customerPhone || '-');
  const safePackageName = escapeHtml(quote.packageName || 'Standart Paket');
  const safeAgentName = escapeHtml(quote.agentName || quote.createdByName || 'Satış Departmanı');

  const html = `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>İnzar Turizm Umre Teklif Mektubu - ${safeCustomerName}</title>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background-color: #cbd5e1;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #0f172a;
      display: flex;
      flex-direction: column;
      align-items: center;
      min-height: 100vh;
    }
    .top-actions {
      position: sticky;
      top: 0;
      z-index: 100;
      width: 100%;
      background: #064e3b;
      color: white;
      padding: 10px 24px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      box-shadow: 0 4px 6px -1px rgba(0,0,0,0.15);
    }
    .btn {
      background: #059669;
      color: white;
      border: none;
      padding: 8px 16px;
      font-size: 12px;
      font-weight: bold;
      border-radius: 8px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: all 0.2s;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .btn:hover { background: #10b981; transform: translateY(-1px); }
    .btn-download { background: #d97706; }
    .btn-download:hover { background: #b45309; }
    .btn-close { background: #334155; }
    .btn-close:hover { background: #475569; }
    .paper-container {
      padding: 20px 10px;
      width: 100%;
      display: flex;
      justify-content: center;
    }
    .a4-paper {
      width: 794px;
      height: 1122px;
      max-height: 1122px;
      background: #ffffff;
      padding: 26px 34px;
      box-shadow: 0 15px 30px rgba(0,0,0,0.15);
      border-radius: 2px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      overflow: hidden;
    }
    table { width: 100%; border-collapse: collapse; }
    @media print {
      body { background: transparent !important; padding: 0 !important; margin: 0 !important; }
      .top-actions { display: none !important; }
      .paper-container { padding: 0 !important; margin: 0 !important; }
      .a4-paper {
        width: 100% !important;
        height: 100% !important;
        max-height: 100vh !important;
        box-shadow: none !important;
        padding: 16px 20px !important;
        margin: 0 !important;
        page-break-after: avoid !important;
        page-break-inside: avoid !important;
      }
      @page {
        size: A4 portrait;
        margin: 6mm;
      }
    }
  </style>
</head>
<body>

  <!-- Top Action Bar with SEPARATE Print and Download Buttons -->
  <div class="top-actions">
    <div style="font-weight: bold; font-size: 14px; display: flex; align-items: center; gap: 8px;">
      <span>İnzar Turizm Resmi Teklif Mektubu</span>
      <span style="font-size: 11px; background: rgba(255,255,255,0.2); padding: 2px 8px; border-radius: 4px;">Tek Sayfa A4 Matbaa Belgesi</span>
    </div>

    <div style="display: flex; gap: 8px;">
      <!-- Print Button -->
      <button class="btn" onclick="window.print()" title="Yazıcıdan A4 Olarak Yazdır veya PDF Kaydet">
        Yazdır
      </button>

      <!-- Download Button -->
      <button class="btn btn-download" onclick="downloadSinglePagePdf()" id="dl-btn" title="Doğrudan Tek Sayfa A4 PDF Dosyası Olarak Bilgisayara İndir">
        PDF İndir
      </button>

      <!-- Close Button -->
      <button class="btn btn-close" onclick="window.close()" title="Sayfayı Kapat">
        ✕ Kapat
      </button>
    </div>
  </div>

  <!-- A4 Document View (100% Single Page / Frameless Logo / Crisp Data) -->
  <div class="paper-container">
    <div class="a4-paper" id="printable-quote">
      
      <!-- Header Section: Frameless Logo -->
      <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 2.5px solid #064e3b; padding-bottom: 10px;">
        <div style="display: flex; align-items: center; gap: 14px;">
          <img 
            src="/inzarturizmlogo.png" 
            alt="İnzar Turizm Logo" 
            style="height: 60px; width: auto; object-fit: contain; display: block;"
          />
          <div>
            <h1 style="font-size: 21px; font-weight: 900; color: #064e3b; letter-spacing: -0.5px;">İNZAR TURİZM</h1>
            <p style="font-size: 10px; font-weight: 800; color: #b45309; text-transform: uppercase; letter-spacing: 0.8px; margin-top: 1px;">
              Hac & Umre Organizasyonu • Turizm Acentesi
            </p>
            <p style="font-size: 9px; color: #64748b; margin-top: 1px;">
              TÜRSAB A Grubu Seyahat Acentesi Belge No: 12840 • Diyanet Yetkili
            </p>
          </div>
        </div>

        <div style="text-align: right;">
          <div style="display: inline-block; background-color: #064e3b; color: #ffffff; font-weight: 800; font-size: 11px; padding: 4px 12px; border-radius: 4px;">
            RESMİ FİYAT TEKLİF FORMU
          </div>
          <div style="margin-top: 4px; font-size: 10px; color: #475569; line-height: 1.35;">
            <div><strong>Teklif No:</strong> INZ-${Date.now().toString().slice(-6)}</div>
            <div><strong>Tarih:</strong> ${todayStr}</div>
            <div><strong>Geçerlilik:</strong> ${validUntilStr}</div>
          </div>
        </div>
      </div>

      <!-- Guest Info Banner -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin: 10px 0; padding: 10px 14px; border-radius: 6px; background-color: #f0fdf4; border: 1px solid #bbf7d0; font-size: 11px;">
        <div>
          <div style="font-size: 9px; font-weight: 800; text-transform: uppercase; color: #065f46; margin-bottom: 2px;">
            SAYIN MİSAFİRİMİZ / REFERANS:
          </div>
          <div style="font-size: 13px; font-weight: 800; color: #0f172a;">${safeCustomerName}</div>
          <div style="color: #475569; margin-top: 1px;">İletişim: <strong>${safeCustomerPhone}</strong></div>
          <div style="color: #475569; margin-top: 1px;">Grup Kişi Sayısı: <strong>${Number(quote.paxCount) || 1} Kişi</strong></div>
        </div>

        <div style="text-align: right;">
          <div style="font-size: 9px; font-weight: 800; text-transform: uppercase; color: #065f46; margin-bottom: 2px;">
            PROGRAM & REZERVASYON ÖZETİ:
          </div>
          <div style="font-size: 13px; font-weight: 800; color: #047857;">${safePackageName}</div>
          <div style="color: #475569; margin-top: 1px;">
            Toplam Süre: <strong>${Number(quote.makkahDays) + Number(quote.madinahDays)} Gün</strong> 
            ${quote.madinahDays === 0 ? ' (Sadece Mekke)' : quote.makkahDays === 0 ? ' (Sadece Medine)' : ` (${quote.makkahDays}G Mekke / ${quote.madinahDays}G Medine)`}
          </div>
          <div style="color: #475569; margin-top: 1px;">Dönem: <strong>${escapeHtml(quote.selectedMonthLabel || quote.selectedMonth || 'Standart')}</strong></div>
        </div>
      </div>

      <!-- Hotel Standards -->
      <div style="margin-bottom: 10px;">
        <div style="font-size: 10.5px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; color: #064e3b; margin-bottom: 4px; border-bottom: 1.5px solid #a7f3d0; padding-bottom: 2px;">
          KONAKLAMA VE OTEL STANDARTLARI
        </div>
        <table style="width: 100%; text-align: left; font-size: 10px; border: 1px solid #e2e8f0;">
          <thead>
            <tr style="background-color: #f8fafc; color: #334155; font-weight: bold; border-bottom: 1.5px solid #cbd5e1;">
              <th style="padding: 6px 8px;">Bölge</th>
              <th style="padding: 6px 8px;">Otel Adı</th>
              <th style="padding: 6px 8px;">Süre</th>
              <th style="padding: 6px 8px;">Mescid Mesafesi</th>
              <th style="padding: 6px 8px;">Yemek Durumu</th>
            </tr>
          </thead>
          <tbody>
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 6px 8px; font-weight: 800; color: #065f46;">MEKKE-İ MÜKERREME</td>
              <td style="padding: 6px 8px; font-weight: 600;">${quote.makkahDays > 0 ? (quote.pkgDetails?.hotelMakkah || 'Merkezi Otel') : 'Konaklama Yok'}</td>
              <td style="padding: 6px 8px; font-weight: bold;">${quote.makkahDays > 0 ? quote.makkahDays + ' Gece / Gün' : '0 Gün'}</td>
              <td style="padding: 6px 8px; color: #475569;">${quote.makkahDays > 0 ? (quote.pkgDetails?.distanceMakkah || 'Yürüme / Ring Servis') : '-'}</td>
              <td style="padding: 6px 8px; color: ${quote.makkahDays > 0 ? '#047857' : '#94a3b8'}; font-weight: 600;">${quote.makkahDays > 0 ? 'Sabah & Akşam Tabldot/Büfe' : 'Dahil Değil'}</td>
            </tr>
            <tr>
              <td style="padding: 6px 8px; font-weight: 800; color: #92400e;">MEDİNE-İ MÜNEVVERE</td>
              <td style="padding: 6px 8px; font-weight: 600;">${quote.madinahDays > 0 ? (quote.pkgDetails?.hotelMadinah || 'Merkezi Otel') : 'Konaklama Yok'}</td>
              <td style="padding: 6px 8px; font-weight: bold;">${quote.madinahDays > 0 ? quote.madinahDays + ' Gece / Gün' : '0 Gün'}</td>
              <td style="padding: 6px 8px; color: #475569;">${quote.madinahDays > 0 ? (quote.pkgDetails?.distanceMadinah || 'Yürüme Mesafesi') : '-'}</td>
              <td style="padding: 6px 8px; color: ${quote.madinahDays > 0 ? '#047857' : '#94a3b8'}; font-weight: 600;">${quote.madinahDays > 0 ? 'Sabah & Akşam Tabldot/Büfe' : 'Dahil Değil'}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Transfers -->
      <div style="margin-bottom: 10px;">
        <div style="font-size: 10.5px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; color: #064e3b; margin-bottom: 4px; border-bottom: 1.5px solid #a7f3d0; padding-bottom: 2px;">
          ULAŞIM VE İÇ HAT TRANSFERLERİ
        </div>
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; font-size: 9.5px;">
          <div style="padding: 6px 8px; border-radius: 4px; background-color: #f8fafc; border: 1px solid #e2e8f0;">
            <span style="font-weight: bold; color: #334155; display: block;">Cidde - Mekke:</span>
            <span>${getTransferText(transfers.jedMek)}</span>
          </div>
          <div style="padding: 6px 8px; border-radius: 4px; background-color: #f8fafc; border: 1px solid #e2e8f0;">
            <span style="font-weight: bold; color: #334155; display: block;">Mekke - Medine:</span>
            <span>${getTransferText(transfers.mekMed)}</span>
          </div>
          <div style="padding: 6px 8px; border-radius: 4px; background-color: #f8fafc; border: 1px solid #e2e8f0;">
            <span style="font-weight: bold; color: #334155; display: block;">Medine - Havaalanı:</span>
            <span>${getTransferText(transfers.medAir)}</span>
          </div>
        </div>
      </div>

      <!-- Pricing Matrix -->
      <div style="margin-bottom: 10px;">
        <div style="font-size: 10.5px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; color: #064e3b; margin-bottom: 6px; border-bottom: 1.5px solid #a7f3d0; padding-bottom: 2px;">
          FİYATLANDIRMA SEÇENEKLERİ (ODA TİPİNE GÖRE KİŞİ BAŞI)
        </div>
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; text-align: center;">
          
          <div style="padding: 8px; border-radius: 6px; border: ${quote.makkahRoomOccupancy === 2 ? '2px solid #059669' : '1px solid #cbd5e1'}; background-color: ${quote.makkahRoomOccupancy === 2 ? '#ecfdf5' : '#f8fafc'};">
            <span style="font-size: 9.5px; font-weight: 800; color: #334155; display: block;">2 KİŞİLİK ODA (DOUBLE)</span>
            <div style="font-size: 15px; font-weight: 900; color: #064e3b; margin-top: 2px;">
              $${doubleRoom.finalPriceUSD?.toLocaleString('tr-TR')} USD
            </div>
            <div style="font-size: 8.5px; color: #64748b; margin-top: 1px;">
              ~${doubleRoom.finalPriceTRY?.toLocaleString('tr-TR')} ₺ / Kişi
            </div>
          </div>

          <div style="padding: 8px; border-radius: 6px; border: ${quote.makkahRoomOccupancy === 3 ? '2px solid #059669' : '1px solid #cbd5e1'}; background-color: ${quote.makkahRoomOccupancy === 3 ? '#ecfdf5' : '#f8fafc'};">
            <span style="font-size: 9.5px; font-weight: 800; color: #334155; display: block;">3 KİŞİLİK ODA (TRIPLE)</span>
            <div style="font-size: 15px; font-weight: 900; color: #064e3b; margin-top: 2px;">
              $${tripleRoom.finalPriceUSD?.toLocaleString('tr-TR')} USD
            </div>
            <div style="font-size: 8.5px; color: #64748b; margin-top: 1px;">
              ~${tripleRoom.finalPriceTRY?.toLocaleString('tr-TR')} ₺ / Kişi
            </div>
          </div>

          <div style="padding: 8px; border-radius: 6px; border: ${quote.makkahRoomOccupancy === 4 ? '2px solid #059669' : '1px solid #cbd5e1'}; background-color: ${quote.makkahRoomOccupancy === 4 ? '#ecfdf5' : '#f8fafc'};">
            <span style="font-size: 9.5px; font-weight: 800; color: #334155; display: block;">4 KİŞİLİK ODA (QUAD)</span>
            <div style="font-size: 15px; font-weight: 900; color: #064e3b; margin-top: 2px;">
              $${quadRoom.finalPriceUSD?.toLocaleString('tr-TR')} USD
            </div>
            <div style="font-size: 8.5px; color: #64748b; margin-top: 1px;">
              ~${quadRoom.finalPriceTRY?.toLocaleString('tr-TR')} ₺ / Kişi
            </div>
          </div>

        </div>
      </div>

      <!-- Inclusions & Exclusions -->
      <div style="margin-bottom: 10px;">
        <div style="font-size: 10.5px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; color: #064e3b; margin-bottom: 4px; border-bottom: 1.5px solid #a7f3d0; padding-bottom: 2px;">
          DAHİL / HARİÇ HİZMETLER DÖKÜMÜ
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; column-gap: 16px; row-gap: 4px; font-size: 9.5px;">
          <div style="color: ${fixed.flightTicketUSD ? '#065f46' : '#94a3b8'};">
            ${fixed.flightTicketUSD ? '✓ Gidiş-Dönüş Uçak Bileti (Dahil)' : '— Uçak Bileti (Dahil Değil / Kendi Temin Eder)'}
          </div>
          <div style="color: ${fixed.visaSAR ? '#065f46' : '#94a3b8'};">
            ${fixed.visaSAR ? '✓ Suudi Arabistan Elektronik Umre Vizesi (Dahil)' : '— Umre Vizesi (Dahil Değil)'}
          </div>
          <div style="color: ${fixed.insuranceSAR ? '#065f46' : '#94a3b8'};">
            ${fixed.insuranceSAR ? '✓ Kapsamlı Sağlık ve Seyahat Sigortası (Dahil)' : '— Seyahat Sigortası (Dahil Değil)'}
          </div>
          <div style="color: ${fixed.guidanceSAR ? '#065f46' : '#94a3b8'};">
            ${fixed.guidanceSAR ? '✓ Kutsal Mekan Ziyaretleri & Rehberlik (Dahil)' : '— Rehberlik Hizmeti (Dahil Değil)'}
          </div>
          <div style="color: ${fixed.bagSAR ? '#065f46' : '#94a3b8'};">
            ${fixed.bagSAR ? '✓ İnzar Turizm Çanta Seti & Hediyeler (Dahil)' : '— Çanta Seti (Dahil Değil)'}
          </div>
          <div style="color: ${fixed.zamzamSAR ? '#065f46' : '#94a3b8'};">
            ${fixed.zamzamSAR ? '✓ 5 Litre Orijinal Zemzem Suyu İkramı (Dahil)' : '— Zemzem İkramı (Dahil Değil)'}
          </div>
          <div style="color: ${(quote.makkahDays > 0 || quote.madinahDays > 0) ? '#065f46' : '#94a3b8'};">
            ${(quote.makkahDays > 0 || quote.madinahDays > 0) ? '✓ Belirtilen Sürede Otel Konaklamaları (Dahil)' : '— Otel Konaklaması (Dahil Değil)'}
          </div>
          <div style="color: #065f46;">
            ✓ 7/24 İnzar Turizm Saha & Koordinasyon Desteği
          </div>
        </div>
      </div>

      <!-- Footer / Signatures (Bottom of Page) -->
      <div style="padding-top: 10px; border-top: 1.5px solid #cbd5e1; display: grid; grid-template-columns: 1fr 1fr; gap: 20px; font-size: 9px; color: #64748b;">
        <div>
          <p style="margin: 0; font-weight: 800; color: #1e293b; text-transform: uppercase;">Açıklamalar & Şartlar:</p>
          <ul style="margin: 2px 0 0 0; padding-left: 12px; line-height: 1.35;">
            <li>Fiyatlar döviz kuru TCMB serbest piyasaya göre anlık hesaplanmıştır.</li>
            <li>Kesin kayıt için pasaport fotokopisi ve kapora ödemesi gerekmektedir.</li>
            <li>Uçuş saatleri ve hava yolu şirketleri kontenjan durumuna göre teyit edilir.</li>
          </ul>
        </div>

        <div style="text-align: right; display: flex; flex-direction: column; justify-content: space-between;">
          <div>
            <div style="font-weight: 800; color: #0f172a; font-size: 10.5px;">İNZAR TURİZM GENEL MERKEZİ</div>
            <div style="color: #475569; margin-top: 1px;">Yetkili Temsilci: <strong>${quote.agentName || quote.createdByName || 'Satış Departmanı'}</strong></div>
          </div>
          <div style="padding-top: 8px;">
            <div style="display: inline-block; border-bottom: 1px dashed #94a3b8; width: 130px; text-align: center; color: #94a3b8; font-size: 8.5px;">
              Kaşe / Yetkili İmza
            </div>
          </div>
        </div>
      </div>

    </div>
  </div>

  <script>
    async function downloadSinglePagePdf() {
      const btn = document.getElementById('dl-btn');
      const element = document.getElementById('printable-quote');
      btn.innerText = 'Hazırlanıyor...';
      btn.disabled = true;

      try {
        const canvas = await html2canvas(element, {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          logging: false,
          backgroundColor: '#ffffff',
          width: 794,
          height: 1122
        });

        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF('p', 'mm', 'a4');
        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        
        // Single Page Exact A4 Fit
        pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297, undefined, 'FAST');
        pdf.save('${fileName}');
        btn.innerText = 'İndirildi';
        setTimeout(() => {
          btn.innerText = 'PDF İndir';
          btn.disabled = false;
        }, 3000);
      } catch (err) {
        console.error('PDF error:', err);
        alert('PDF oluşturulamadı, lütfen Yazdır butonundan PDF Olarak Kaydet seçeneğini kullanın.');
        btn.innerText = 'PDF İndir';
        btn.disabled = false;
      }
    }
  </script>

</body>
</html>`;

  newWin.document.open();
  newWin.document.write(html);
  newWin.document.close();
}

// Download PDF as File directly
export async function generateQuotationPdf(elementId, quotationData) {
  const element = document.getElementById(elementId);
  if (!element) {
    throw new Error('PDF render elementi bulunamadı');
  }

  const clientName = quotationData?.customerName || 'Misafir';
  const pkgName = quotationData?.packageName || 'Standart';
  const fileName = `Inzar_Umre_Teklifi_${clientName.replace(/\s+/g, '_')}_${pkgName.replace(/\s+/g, '_')}.pdf`;

  // 1. Ensure all images inside element are fully loaded
  const images = element.getElementsByTagName('img');
  await Promise.all(
    Array.from(images).map(img => {
      if (img.complete) return Promise.resolve();
      return new Promise((resolve) => {
        img.onload = resolve;
        img.onerror = resolve;
      });
    })
  );

  // 2. High-Resolution Canvas Render with html2canvas (2x Retina scale)
  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    allowTaint: true,
    logging: false,
    backgroundColor: '#ffffff',
    windowWidth: 794,
  });

  const imgData = canvas.toDataURL('image/jpeg', 0.95);
  
  // 3. Create Exactly Single-Page A4 PDF (210mm x 297mm)
  const pdf = new jsPDF('p', 'mm', 'a4');
  pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297, undefined, 'FAST');
  pdf.save(fileName);
  return fileName;
}

// Generate formatted WhatsApp message text
export function generateWhatsAppMessage(quote) {
  const clientName = quote.customerName || 'Değerli Misafirimiz';
  
  const msg = `*İNZAR TURİZM - KUTSAL TOPRAKLAR UMRE TEKLİFİ*
Sayın *${clientName}*, danışmış olduğunuz Umre programı detayları ve özel fiyat teklifiniz aşağıda sunulmuştur:

*PAKET:* ${quote.packageName}
*MEKKE:* ${quote.pkgDetails?.hotelMakkah || 'Merkezi Otel'} (${quote.makkahDays} Gece/Gün)
*MEDİNE:* ${quote.pkgDetails?.hotelMadinah || 'Merkezi Otel'} (${quote.madinahDays} Gece/Gün)
*TOPLAM SÜRE:* ${Number(quote.makkahDays) + Number(quote.madinahDays)} Gün
*SEÇİLEN ODA:* ${quote.makkahRoomOccupancy} Kişilik Oda

*KİŞİ BAŞI TEKLİF:*
*${quote.finalPriceUSD?.toLocaleString('tr-TR')} USD* / Kişi Başı
*Yaklaşık TL Karşılığı:* ~${quote.finalPriceTRY?.toLocaleString('tr-TR')} ₺
*Euro Karşılığı:* ~${quote.finalPriceEUR?.toLocaleString('tr-TR')} €

*FİYATA DAHİL HİZMETLER:*
• Gidiş-Dönüş Uçak Bileti
• Suudi Arabistan Umre Vizesi ve Vergileri
• Kapsamlı Seyahat & Sağlık Sigortası
• Mekke & Medine Otel Konaklamaları
• Sabah & Akşam Açık Büfe / Tabldot Yemek
• Lüks Klimalı Araçlarla Tüm İç Hat Transferleri
• Mekke ve Medine Kutsal Ziyaret Yerleri Rehberliği
• İnzar Turizm Seyahat Çantası, Sırt Çantası ve Omuz Çantası
• Kurumsal Fular/Eşarp & İhram Rehberi
• 5 Litre Orijinal Zemzem İkramı

*Temsilci:* ${quote.agentName || quote.createdByName || 'İnzar Turizm Satış Danışmanı'}
*İletişim:* 0212 555 00 00 / www.inzarturizm.com

Hayırlı ve kabul olunmuş bir Umre dileriz.`;

  return encodeURIComponent(msg);
}

