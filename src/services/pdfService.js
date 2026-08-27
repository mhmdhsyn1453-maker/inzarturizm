// İnzar Turizm - Profesyonel ve Kesintisiz PDF & Mektup Motoru
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import inzarLogo from '../assets/inzarturizmlogo.png';

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function formatAsciiFileName(customerName, packageName) {
  const trMap = {
    'ç': 'c', 'Ç': 'C',
    'ğ': 'g', 'Ğ': 'G',
    'ı': 'i', 'I': 'I', 'İ': 'I', 'i': 'i',
    'ö': 'o', 'Ö': 'O',
    'ş': 's', 'Ş': 'S',
    'ü': 'u', 'Ü': 'U'
  };

  const sanitize = (text) => {
    if (!text) return '';
    return String(text)
      .split('')
      .map(char => trMap[char] || char)
      .join('')
      .replace(/[^a-zA-Z0-9\s-_]/g, '')
      .trim()
      .replace(/\s+/g, '_');
  };

  const clientClean = sanitize(customerName) || 'Misafir';
  const pkgClean = sanitize(packageName) || 'Umre_Teklifi';

  return `Inzar_Umre_Teklifi_${clientClean}_${pkgClean}.pdf`;
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

  const getRoomCost = (occ) => {
    if (quote.roomMatrix && quote.roomMatrix.length > 0) {
      const rm = quote.roomMatrix.find(r => r.occupancy === occ);
      if (rm) {
        return {
          usd: rm.priceUSD || rm.totalHotelUSD || 0,
          try: rm.priceTRY || Math.round((rm.priceUSD || rm.totalHotelUSD || 0) * (quote.currenciesUsed?.USD_TRY || 36.50))
        };
      }
    }
    const mkDays = Number(quote.makkahDays) || 0;
    const mdDays = Number(quote.madinahDays) || 0;
    const mkRoom = Number(quote.makkahRoomSAR) || 0;
    const mdRoom = Number(quote.madinahRoomSAR) || 0;
    const mkFood = Number(quote.makkahFoodSAR) || 0;
    const mdFood = Number(quote.madinahFoodSAR) || 0;
    const sarUsd = quote.currenciesUsed?.SAR_USD || 3.75;
    const usdTry = quote.currenciesUsed?.USD_TRY || (quote.finalPriceUSD ? (quote.finalPriceTRY / quote.finalPriceUSD) : 36.50);

    if (mkRoom > 0 || mdRoom > 0) {
      const mkDaily = occ > 0 ? (mkRoom / occ) : 0;
      const mdDaily = occ > 0 ? (mdRoom / occ) : 0;
      const totalSAR = (mkDaily + mkFood) * mkDays + (mdDaily + mdFood) * mdDays;
      const usd = Math.round(totalSAR / sarUsd);
      return { usd, try: Math.round(usd * usdTry) };
    }

    if (quote.totalAccommodationSAR) {
      const baseSAR = (quote.totalAccommodationSAR / (quote.makkahRoomOccupancy || 2)) * (2 / occ);
      const usd = Math.round(baseSAR / sarUsd);
      return { usd, try: Math.round(usd * usdTry) };
    }

    const factor = occ === 1 ? 1.7 : occ === 2 ? 1.0 : occ === 3 ? 0.78 : 0.68;
    const estimatedBaseHotelUSD = Math.round((quote.finalPriceUSD || 500) * 0.45 * factor);
    return { usd: estimatedBaseHotelUSD, try: Math.round(estimatedBaseHotelUSD * usdTry) };
  };

  const getTransferText = (sel) => {
    if (!sel || sel.vehicleType === 'none') return '<span style="color: #94a3b8; font-weight: bold;">Talep Edilmedi (Kendi İmkânıyla)</span>';
    if (sel.vehicleType === 'small') return `<span style="color: #047857; font-weight: bold;">Özel VIP Araç (${escapeHtml(sel.passengerCount) || 2} Kişi)</span>`;
    if (sel.vehicleType === 'big') return `<span style="color: #047857; font-weight: bold;">Lüks Otobüs (${escapeHtml(sel.passengerCount) || 45} Kişi Paylaşımlı)</span>`;
    return 'Dahil';
  };

  const fileName = formatAsciiFileName(quote.customerName, quote.packageName);

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
      
      <!-- Header Section: Luxury Embossed Emerald & Gold Bar -->
      <div style="
        display: flex; 
        align-items: center; 
        justify-content: space-between; 
        padding: 12px 18px; 
        border-radius: 14px; 
        background: linear-gradient(135deg, #064e3b 0%, #065f46 60%, #047857 100%); 
        color: #ffffff;
        box-shadow: 0 4px 12px rgba(6, 78, 59, 0.15);
        margin-bottom: 10px;
      ">
        <div style="display: flex; align-items: center; gap: 14px;">
          <div style="background-color: #ffffff; padding: 6px 10px; border-radius: 10px; display: flex; align-items: center; justify-content: center;">
            <img 
              src="${inzarLogo}" 
              alt="İnzar Turizm Logo" 
              style="height: 46px; width: auto; object-fit: contain; display: block;"
            />
          </div>
          <div>
            <h1 style="font-size: 19px; font-weight: 900; color: #ffffff; letter-spacing: -0.2px; line-height: 1.1; margin: 0;">
              İNZAR TURİZM
            </h1>
            <p style="font-size: 9px; font-weight: 800; color: #fef08a; text-transform: uppercase; letter-spacing: 0.6px; margin: 2px 0 0 0;">
              Hac & Umre Organizasyonu • Lüks Seyahat Hizmetleri
            </p>
            <p style="font-size: 8.5px; color: #a7f3d0; margin: 2px 0 0 0;">
              TÜRSAB Belge No: 8207 • T.C. Diyanet İşleri Başkanlığı Yetkili Acente
            </p>
          </div>
        </div>

        <div style="text-align: right;">
          <div style="display: inline-block; background-color: #fef08a; color: #064e3b; font-weight: 900; font-size: 10px; padding: 4px 12px; border-radius: 20px; letter-spacing: 0.4px; text-transform: uppercase; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            RESMİ FİYAT TEKLİFİ
          </div>
          <div style="margin-top: 5px; font-size: 9px; color: #d1fae5; line-height: 1.35;">
            <div><strong>Teklif Ref:</strong> INZ-${Date.now().toString().slice(-6)}</div>
            <div><strong>Tarih:</strong> ${todayStr}</div>
            <div><strong>Geçerlilik:</strong> ${validUntilStr} (15 Gün)</div>
          </div>
        </div>
      </div>

      <!-- Guest & Program Overview Cards (Rounded 12px) -->
      <div style="display: grid; grid-template-columns: 1.1fr 1fr; gap: 10px; margin-bottom: 10px;">
        <div style="padding: 10px 14px; border-radius: 12px; background-color: #f8fafc; border: 1.5px solid #e2e8f0; font-size: 10px;">
          <div style="font-size: 8.5px; font-weight: 800; text-transform: uppercase; color: #065f46; letter-spacing: 0.5px; margin-bottom: 2px; display: flex; align-items: center; gap: 6px;">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#065f46" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            <span>SAYIN MİSAFİRİMİZ / KURUM:</span>
          </div>
          <div style="font-size: 13.5px; font-weight: 900; color: #0f172a; letter-spacing: -0.2px;">${safeCustomerName}</div>
          <div style="color: #475569; margin-top: 2px;">İletişim: <strong style="color: #0f172a;">${safeCustomerPhone}</strong></div>
          <div style="color: #475569; margin-top: 1px;">Grup Kişi Sayısı: <strong style="color: #064e3b;">${Number(quote.paxCount) || 1} Misafir</strong></div>
        </div>

        <div style="padding: 10px 14px; border-radius: 12px; background-color: #f0fdf4; border: 1.5px solid #bbf7d0; font-size: 10px; text-align: right;">
          <div style="font-size: 8.5px; font-weight: 800; text-transform: uppercase; color: #065f46; letter-spacing: 0.5px; margin-bottom: 2px; display: flex; align-items: center; justify-content: flex-end; gap: 6px;">
            <span>PROGRAM KÜNYESİ:</span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#065f46" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
          </div>
          <div style="font-size: 13.5px; font-weight: 900; color: #047857; letter-spacing: -0.2px;">${safePackageName}</div>
          <div style="color: #475569; margin-top: 2px;">
            Toplam Süre: <strong style="color: #0f172a;">${Number(quote.makkahDays) + Number(quote.madinahDays)} Gün</strong> 
            ${quote.madinahDays === 0 ? ' (Sadece Mekke)' : quote.makkahDays === 0 ? ' (Sadece Medine)' : ` (${quote.makkahDays}G Mekke / ${quote.madinahDays}G Medine)`}
          </div>
          <div style="color: #475569; margin-top: 1px;">Dönem: <strong style="color: #0f172a;">${escapeHtml(quote.selectedMonthLabel || quote.selectedMonth || 'Ocak (Sömestr Tatili)')}</strong></div>
        </div>
      </div>

      <!-- Hotel Standards Table Card (Rounded 12px) -->
      <div style="margin-bottom: 10px; border-radius: 12px; border: 1.5px solid #e2e8f0; overflow: hidden; background-color: #ffffff;">
        <div style="padding: 6px 12px; background-color: #f1f5f9; border-bottom: 1px solid #cbd5e1; font-size: 9.5px; font-weight: 800; color: #064e3b; text-transform: uppercase; letter-spacing: 0.4px; display: flex; align-items: center; gap: 6px;">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#064e3b" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2Z"/><path d="m9 16 .348-.24c1.465-1.013 3.84-1.013 5.304 0L15 16"/><path d="M8 7h.01"/><path d="M16 7h.01"/><path d="M12 7h.01"/><path d="M12 11h.01"/><path d="M16 11h.01"/><path d="M8 11h.01"/></svg>
          <span>KONAKLAMA VE OTEL STANDARTLARI</span>
        </div>
        <table style="width: 100%; text-align: left; font-size: 9.5px; border-collapse: collapse;">
          <thead>
            <tr style="background-color: #f8fafc; color: #475569; font-weight: bold; border-bottom: 1px solid #e2e8f0;">
              <th style="padding: 6px 10px;">Bölge</th>
              <th style="padding: 6px 10px;">Otel Adı</th>
              <th style="padding: 6px 10px;">Süre</th>
              <th style="padding: 6px 10px;">Mescid Mesafesi</th>
              <th style="padding: 6px 10px;">Yemek Durumu</th>
            </tr>
          </thead>
          <tbody>
            <tr style="border-bottom: 1px solid #f1f5f9;">
              <td style="padding: 6px 10px; font-weight: 800; color: #065f46;">MEKKE-İ MÜKERREME</td>
              <td style="padding: 6px 10px; font-weight: 700; color: #0f172a;">${quote.makkahDays > 0 ? (quote.pkgDetails?.hotelMakkah || 'Merkezi Otel') : 'Konaklama Yok'}</td>
              <td style="padding: 6px 10px; font-weight: bold; color: #334155;">${quote.makkahDays > 0 ? quote.makkahDays + ' Gece / Gün' : '0 Gün'}</td>
              <td style="padding: 6px 10px; color: #475569;">${quote.makkahDays > 0 ? (quote.pkgDetails?.distanceMakkah || 'Yürüme / Ring Servis') : '-'}</td>
              <td style="padding: 6px 10px; color: ${quote.makkahDays > 0 ? '#047857' : '#94a3b8'}; font-weight: 700;">${quote.makkahDays > 0 ? (quote.pkgDetails?.mealMakkah || 'Sabah & Akşam Tabldot/Büfe') : 'Dahil Değil'}</td>
            </tr>
            <tr>
              <td style="padding: 6px 10px; font-weight: 800; color: #92400e;">MEDİNE-İ MÜNEVVERE</td>
              <td style="padding: 6px 10px; font-weight: 700; color: #0f172a;">${quote.madinahDays > 0 ? (quote.pkgDetails?.hotelMadinah || 'Merkezi Otel') : 'Konaklama Yok'}</td>
              <td style="padding: 6px 10px; font-weight: bold; color: #334155;">${quote.madinahDays > 0 ? quote.madinahDays + ' Gece / Gün' : '0 Gün'}</td>
              <td style="padding: 6px 10px; color: #475569;">${quote.madinahDays > 0 ? (quote.pkgDetails?.distanceMadinah || 'Yürüme Mesafesi') : '-'}</td>
              <td style="padding: 6px 10px; color: ${quote.madinahDays > 0 ? '#047857' : '#94a3b8'}; font-weight: 700;">${quote.madinahDays > 0 ? (quote.pkgDetails?.mealMadinah || 'Sabah & Akşam Tabldot/Büfe') : 'Dahil Değil'}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Transfers (Rounded 12px Card) -->
      <div style="margin-bottom: 10px; border-radius: 12px; border: 1.5px solid #e2e8f0; padding: 8px 12px; background-color: #ffffff;">
        <div style="font-size: 9.5px; font-weight: 800; text-transform: uppercase; color: #064e3b; margin-bottom: 6px; letter-spacing: 0.4px; display: flex; align-items: center; gap: 6px;">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#064e3b" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.5 2.8C2.1 11 2 11.5 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/></svg>
          <span>ULAŞIM VE İÇ HAT TRANSFERLERİ (ARAÇ DURUMU)</span>
        </div>
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; font-size: 9px;">
          <div style="padding: 6px 10px; border-radius: 8px; background-color: #f8fafc; border: 1px solid #e2e8f0;">
            <span style="font-weight: 800; color: #475569; display: block; font-size: 8.5px;">Cidde - Mekke:</span>
            <span style="font-weight: 700; color: #064e3b; font-size: 10px; margin-top: 1px; display: block;">${getTransferText(transfers.jedMek)}</span>
          </div>
          <div style="padding: 6px 10px; border-radius: 8px; background-color: #f8fafc; border: 1px solid #e2e8f0;">
            <span style="font-weight: 800; color: #475569; display: block; font-size: 8.5px;">Mekke - Medine:</span>
            <span style="font-weight: 700; color: #064e3b; font-size: 10px; margin-top: 1px; display: block;">${getTransferText(transfers.mekMed)}</span>
          </div>
          <div style="padding: 6px 10px; border-radius: 8px; background-color: #f8fafc; border: 1px solid #e2e8f0;">
            <span style="font-weight: 800; color: #475569; display: block; font-size: 8.5px;">Medine - Havaalanı:</span>
            <span style="font-weight: 700; color: #064e3b; font-size: 10px; margin-top: 1px; display: block;">${getTransferText(transfers.medAir)}</span>
          </div>
        </div>
      </div>

      <!-- Pricing Matrix: ONLY CHOSEN ROOM (Rounded 12px Card) -->
      <div style="
        margin-bottom: 10px;
        border-radius: 12px;
        border: 1.5px solid #e2e8f0;
        padding: 10px 14px;
        background-color: #ffffff;
      ">
        <div style="font-size: 9.5px; font-weight: 800; text-transform: uppercase; color: #064e3b; margin-bottom: 6px; letter-spacing: 0.4px; display: flex; align-items: center; gap: 6px;">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#064e3b" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2 4v16"/><path d="M2 8h18a2 2 0 0 1 2 2v10"/><path d="M2 17h20"/><path d="M6 8v9"/></svg>
          <span>${quote.isMixedRoomMode ? 'KARMA GRUP KONAKLAMA DAĞILIMI & ODA MALİYETLERİ' : 'SEÇİLEN ODA TİPİ & ODA MALİYETİ'}</span>
        </div>

        ${quote.isMixedRoomMode && quote.mixedRoomsSummary ? `
          <div>
            <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; text-align: center; margin-bottom: 8px;">
              <div style="padding: 6px; background-color: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0;">
                <div style="font-size: 8.5px; font-weight: 800; color: #475569;">1 KİŞİLİK</div>
                <div style="font-size: 12px; font-weight: 900; color: #064e3b;">${quote.mixedRoomsSummary.singleRooms} Oda</div>
                <div style="font-size: 8px; color: #64748b;">${quote.mixedRoomsSummary.singleRooms * 1} Misafir</div>
                <div style="margin-top: 3px; padding-top: 3px; border-top: 1px dashed #cbd5e1; font-size: 9px; font-weight: 800; color: #047857;">
                  $${getRoomCost(1).usd} <span style="font-size: 7.5px; font-weight: normal; color: #64748b;">/Kişi</span>
                </div>
              </div>
              <div style="padding: 6px; background-color: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0;">
                <div style="font-size: 8.5px; font-weight: 800; color: #475569;">2 KİŞİLİK</div>
                <div style="font-size: 12px; font-weight: 900; color: #064e3b;">${quote.mixedRoomsSummary.doubleRooms} Oda</div>
                <div style="font-size: 8px; color: #64748b;">${quote.mixedRoomsSummary.doubleRooms * 2} Misafir</div>
                <div style="margin-top: 3px; padding-top: 3px; border-top: 1px dashed #cbd5e1; font-size: 9px; font-weight: 800; color: #047857;">
                  $${getRoomCost(2).usd} <span style="font-size: 7.5px; font-weight: normal; color: #64748b;">/Kişi</span>
                </div>
              </div>
              <div style="padding: 6px; background-color: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0;">
                <div style="font-size: 8.5px; font-weight: 800; color: #475569;">3 KİŞİLİK</div>
                <div style="font-size: 12px; font-weight: 900; color: #064e3b;">${quote.mixedRoomsSummary.tripleRooms} Oda</div>
                <div style="font-size: 8px; color: #64748b;">${quote.mixedRoomsSummary.tripleRooms * 3} Misafir</div>
                <div style="margin-top: 3px; padding-top: 3px; border-top: 1px dashed #cbd5e1; font-size: 9px; font-weight: 800; color: #047857;">
                  $${getRoomCost(3).usd} <span style="font-size: 7.5px; font-weight: normal; color: #64748b;">/Kişi</span>
                </div>
              </div>
              <div style="padding: 6px; background-color: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0;">
                <div style="font-size: 8.5px; font-weight: 800; color: #475569;">4 KİŞİLİK</div>
                <div style="font-size: 12px; font-weight: 900; color: #064e3b;">${quote.mixedRoomsSummary.quadRooms} Oda</div>
                <div style="font-size: 8px; color: #64748b;">${quote.mixedRoomsSummary.quadRooms * 4} Misafir</div>
                <div style="margin-top: 3px; padding-top: 3px; border-top: 1px dashed #cbd5e1; font-size: 9px; font-weight: 800; color: #047857;">
                  $${getRoomCost(4).usd} <span style="font-size: 7.5px; font-weight: normal; color: #64748b;">/Kişi</span>
                </div>
              </div>
            </div>

            <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #e2e8f0; padding-top: 4px; font-size: 9.5px;">
              <div>
                <span style="color: #475569;">Toplam Konaklama: </span>
                <strong style="color: #0f172a;">${quote.mixedRoomsSummary.totalRooms} Oda (${quote.mixedRoomsSummary.totalPax} Misafir)</strong>
              </div>
              <div style="color: #64748b; font-size: 8.5px;">
                * Belirtilen tutarlar her oda tipini seçen misafirlerin kişi başı otel konaklama maliyetleridir.
              </div>
            </div>
          </div>
        ` : `
          <!-- SADECE SEÇİLEN ODA TİPİ VE KİŞİ BAŞI ODA MALİYETİ -->
          <div style="
            display: flex; 
            align-items: center; 
            justify-content: space-between; 
            padding: 8px 12px; 
            border-radius: 8px; 
            background-color: #f8fafc; 
            border: 1px solid #e2e8f0;
          ">
            <div>
              <span style="font-size: 8.5px; font-weight: 800; color: #065f46; text-transform: uppercase; letter-spacing: 0.4px; display: block;">
                SEÇİLEN ODA KATEGORİSİ
              </span>
              <div style="font-size: 13.5px; font-weight: 900; color: #0f172a; margin-top: 1px;">
                ${quote.makkahRoomOccupancy || 2} Kişilik Oda
              </div>
            </div>

            <div style="text-align: right;">
              <span style="font-size: 8.5px; font-weight: 800; color: #047857; display: block;">
                ODA KİŞİ BAŞI MALİYETİ
              </span>
              <div style="font-size: 14px; font-weight: 900; color: #064e3b; margin-top: 1px;">
                $${getRoomCost(quote.makkahRoomOccupancy || 2).usd?.toLocaleString('tr-TR')} USD
              </div>
              <div style="font-size: 8.5px; color: #64748b; font-weight: 600;">
                ~${getRoomCost(quote.makkahRoomOccupancy || 2).try?.toLocaleString('tr-TR')} ₺ / Kişi
              </div>
            </div>
          </div>
        `}
      </div>

      <!-- Inclusions & Exclusions (Rounded 12px Card) -->
      <div style="margin-bottom: 10px; border-radius: 12px; border: 1.5px solid #e2e8f0; padding: 8px 12px; background-color: #ffffff;">
        <div style="font-size: 9.5px; font-weight: 800; text-transform: uppercase; color: #064e3b; margin-bottom: 4px; letter-spacing: 0.4px; display: flex; align-items: center; gap: 6px;">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#064e3b" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>
          <span>FİYATA DAHİL OLAN HİZMETLER VE AYRICALIKLAR</span>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; column-gap: 16px; row-gap: 3.5px; font-size: 9px;">
          <div style="color: ${(fixed.flightTicketSAR || fixed.flightTicketUSD) ? '#065f46' : '#94a3b8'}; font-weight: 700;">
            ${(fixed.flightTicketSAR || fixed.flightTicketUSD) ? '✓ Gidiş-Dönüş Uçak Bileti (Dahil)' : '— Uçak Bileti (Dahil Değil)'}
          </div>
          <div style="color: ${(fixed.visaTaxSAR || fixed.visaSAR) ? '#065f46' : '#94a3b8'}; font-weight: 700;">
            ${(fixed.visaTaxSAR || fixed.visaSAR) ? '✓ Suudi Arabistan Umre Vizesi (Dahil)' : '— Umre Vizesi (Dahil Değil)'}
          </div>
          <div style="color: ${fixed.insuranceSAR ? '#065f46' : '#94a3b8'}; font-weight: 700;">
            ${fixed.insuranceSAR ? '✓ Kapsamlı Sağlık & Seyahat Sigortası (Dahil)' : '— Seyahat Sigortası (Dahil Değil)'}
          </div>
          <div style="color: ${(fixed.guideSAR || fixed.guidanceSAR) ? '#065f46' : '#94a3b8'}; font-weight: 700;">
            ${(fixed.guideSAR || fixed.guidanceSAR) ? '✓ Kutsal Mekan Ziyaretleri & Rehberlik (Dahil)' : '— Rehberlik Hizmeti (Dahil Değil)'}
          </div>
          <div style="color: ${(fixed.bagSAR || fixed.scarfSAR) ? '#065f46' : '#94a3b8'}; font-weight: 700;">
            ${(fixed.bagSAR || fixed.scarfSAR) ? '✓ Seyahat Çanta Seti & Hediyeler (Dahil)' : '— Çanta Seti (Dahil Değil)'}
          </div>
          <div style="color: fixed.zamzamSAR ? '#065f46' : '#94a3b8'}; font-weight: 700;">
            ${fixed.zamzamSAR ? '✓ 5 Litre Orijinal Zemzem Suyu İkramı (Dahil)' : '— Zemzem İkramı (Dahil Değil)'}
          </div>
          <div style="color: ${(quote.makkahDays > 0 || quote.madinahDays > 0) ? '#065f46' : '#94a3b8'}; font-weight: 700;">
            ${(quote.makkahDays > 0 || quote.madinahDays > 0) ? '✓ Otellerde Program Süresince Konaklama (Dahil)' : '— Otel Konaklaması (Dahil Değil)'}
          </div>
          <div style="color: #065f46; font-weight: 700;">
            ✓ 7/24 Havalimanı Karşılama, Transfer & Saha Koordinasyon Desteği
          </div>
        </div>
      </div>

      <!-- 7. KİŞİ BAŞI TOPLAM HİZMET BEDELİ (DAHİLİ HİZMETLER & ARAÇ DAHİL) -->
      <div style="
        margin-bottom: 10px; 
        border-radius: 12px; 
        border: 1.5px solid #a7f3d0; 
        padding: 8px 12px; 
        background-color: #ecfdf5;
      ">
        <div style="
          font-size: 9.5px; 
          font-weight: 800; 
          text-transform: uppercase; 
          color: #064e3b; 
          margin-bottom: 6px; 
          letter-spacing: 0.4px; 
          display: flex; 
          align-items: center; 
          gap: 6px;
        ">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#064e3b" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m16 10-4 4-2-2"/></svg>
          <span>${quote.isMixedRoomMode ? 'ODA TERCİHİNE GÖRE KİŞİ BAŞI TOPLAM HİZMET BEDELLERİ (HER ŞEY DAHİL)' : 'KİŞİ BAŞI TOPLAM HİZMET BEDELİ (HER ŞEY DAHİL)'}</span>
        </div>

        ${quote.isMixedRoomMode && quote.mixedRoomsBreakdown ? `
          <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; text-align: center;">
            <div style="padding: 6px 8px; background-color: #ffffff; border-radius: 8px; border: 1px solid #bbf7d0;">
              <div style="font-size: 8.5px; font-weight: 800; color: #065f46;">1 KİŞİLİK ODA</div>
              <div style="font-size: 13px; font-weight: 900; color: #0f172a; margin-top: 1px;">
                $${quote.mixedRoomsBreakdown.single.priceUSD?.toLocaleString('tr-TR')} USD
              </div>
              <div style="font-size: 8px; color: #047857; font-weight: 700;">
                ~${quote.mixedRoomsBreakdown.single.priceTRY?.toLocaleString('tr-TR')} ₺ / Kişi
              </div>
            </div>

            <div style="padding: 6px 8px; background-color: #ffffff; border-radius: 8px; border: 1px solid #bbf7d0;">
              <div style="font-size: 8.5px; font-weight: 800; color: #065f46;">2 KİŞİLİK ODA</div>
              <div style="font-size: 13px; font-weight: 900; color: #0f172a; margin-top: 1px;">
                $${quote.mixedRoomsBreakdown.double.priceUSD?.toLocaleString('tr-TR')} USD
              </div>
              <div style="font-size: 8px; color: #047857; font-weight: 700;">
                ~${quote.mixedRoomsBreakdown.double.priceTRY?.toLocaleString('tr-TR')} ₺ / Kişi
              </div>
            </div>

            <div style="padding: 6px 8px; background-color: #ffffff; border-radius: 8px; border: 1px solid #bbf7d0;">
              <div style="font-size: 8.5px; font-weight: 800; color: #065f46;">3 KİŞİLİK ODA</div>
              <div style="font-size: 13px; font-weight: 900; color: #0f172a; margin-top: 1px;">
                $${quote.mixedRoomsBreakdown.triple.priceUSD?.toLocaleString('tr-TR')} USD
              </div>
              <div style="font-size: 8px; color: #047857; font-weight: 700;">
                ~${quote.mixedRoomsBreakdown.triple.priceTRY?.toLocaleString('tr-TR')} ₺ / Kişi
              </div>
            </div>

            <div style="padding: 6px 8px; background-color: #ffffff; border-radius: 8px; border: 1px solid #bbf7d0;">
              <div style="font-size: 8.5px; font-weight: 800; color: #065f46;">4 KİŞİLİK ODA</div>
              <div style="font-size: 13px; font-weight: 900; color: #0f172a; margin-top: 1px;">
                $${quote.mixedRoomsBreakdown.quad.priceUSD?.toLocaleString('tr-TR')} USD
              </div>
              <div style="font-size: 8px; color: #047857; font-weight: 700;">
                ~${quote.mixedRoomsBreakdown.quad.priceTRY?.toLocaleString('tr-TR')} ₺ / Kişi
              </div>
            </div>
          </div>
        ` : `
          <div style="display: flex; align-items: center; justify-content: space-between; padding: 4px 6px;">
            <div>
              <div style="font-size: 11px; font-weight: 800; color: #064e3b;">
                ${quote.makkahRoomOccupancy || 2} Kişilik Oda (Kişi Başı Paket Bedeli)
              </div>
              <div style="font-size: 8.5px; color: #475569; margin-top: 1px;">
                Otel Konaklaması, Vize, Uçak Bileti, Araç/Transferler ve Tüm Dahili Hizmetler Dahildir.
              </div>
            </div>

            <div style="text-align: right;">
              <div style="font-size: 15px; font-weight: 900; color: #064e3b;">
                $${quote.finalPriceUSD?.toLocaleString('tr-TR')} USD
              </div>
              <div style="font-size: 9px; color: #047857; font-weight: 800;">
                ~${quote.finalPriceTRY?.toLocaleString('tr-TR')} ₺ (Kişi Başı)
              </div>
            </div>
          </div>
        `}
      </div>

      <!-- 🌟 VURGULU TOPLAM BEDEL / MALİYET KUTUSU (STANDALONE) -->
      <div style="
        margin-bottom: 10px;
        padding: 10px 16px; 
        border-radius: 12px; 
        background-color: #064e3b; 
        color: #ffffff;
        display: flex; 
        align-items: center; 
        justify-content: space-between;
        box-shadow: 0 4px 12px rgba(6, 78, 59, 0.25);
        border: 1.5px solid #047857;
      ">
        <div>
          <div style="font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.4px; color: #fef08a;">
            ${quote.isMixedRoomMode && quote.mixedRoomsSummary ? 'GRUP GENEL TOPLAM HİZMET BEDELİ' : `TOPLAM HİZMET BEDELİ (${Number(quote.paxCount) || 1} KİŞİ)`}
          </div>
        </div>

        <div style="text-align: right;">
          <div style="font-size: 20px; font-weight: 900; color: #fbbf24; letter-spacing: -0.3px; line-height: 1;">
            $${((quote.isMixedRoomMode && quote.mixedRoomsSummary?.groupGrandTotalUSD) ? quote.mixedRoomsSummary.groupGrandTotalUSD : (quote.finalPriceUSD * (Number(quote.paxCount) || 1))).toLocaleString('tr-TR')} USD
          </div>
          <div style="font-size: 10px; color: #d1fae5; font-weight: 700; margin-top: 2px;">
            ~${((quote.isMixedRoomMode && quote.mixedRoomsSummary?.groupGrandTotalTRY) ? quote.mixedRoomsSummary.groupGrandTotalTRY : (quote.finalPriceTRY * (Number(quote.paxCount) || 1))).toLocaleString('tr-TR')} ₺ (TCMB Kuruna Göre)
          </div>
        </div>
      </div>

      <!-- Footer / Signatures (Rounded 12px Card) -->
      <div style="
        border-radius: 12px; 
        border: 1.5px solid #cbd5e1; 
        padding: 8px 12px; 
        background-color: #f8fafc;
        display: grid; 
        grid-template-columns: 1.2fr 1fr; 
        gap: 16px; 
        font-size: 8.5px; 
        color: #64748b;
      ">
        <div>
          <p style="margin: 0; font-weight: 800; color: #1e293b; text-transform: uppercase; letter-spacing: 0.2px;">Açıklamalar & Şartlar:</p>
          <ul style="margin: 2px 0 0 0; padding-left: 12px; lineHeight: 1.35;">
            <li>Fiyatlar döviz kuru TCMB serbest piyasa alışına göre anlık hesaplanmıştır.</li>
            <li>Kesin kayıt için pasaport fotokopisi ve kapora ödemesi gerekmektedir.</li>
            <li>Uçuş saatleri ve hava yolu şirketleri kontenjan durumuna göre teyit edilir.</li>
          </ul>
        </div>

        <div style="text-align: right; display: flex; flex-direction: column; justify-content: space-between;">
          <div>
            <div style="font-weight: 800; color: #0f172a; font-size: 9.5px;">İNZAR TURİZM GENEL MERKEZİ</div>
            <div style="color: #475569; margin-top: 1px;">Yetkili Satış Danışmanı: <strong>${quote.agentName || quote.createdByName || 'Satış Departmanı'}</strong></div>
          </div>
          <div style="padding-top: 4px;">
            <div style="display: inline-block; border-bottom: 1.5px dashed #94a3b8; width: 130px; text-align: center; color: #94a3b8; font-size: 8px;">
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

export async function generateQuotationPdf(elementId, quotationData) {
  const originalElement = document.getElementById(elementId);
  if (!originalElement) {
    throw new Error('PDF render elementi bulunamadı');
  }

  const fileName = formatAsciiFileName(quotationData?.customerName, quotationData?.packageName);

  // 1. Create a 100% Unclipped, Isolated Off-screen Container attached to body
  const clone = originalElement.cloneNode(true);
  clone.id = 'pdf-render-clone-target';
  clone.style.width = '794px';
  clone.style.height = '1122px';
  clone.style.maxHeight = '1122px';
  clone.style.position = 'fixed';
  clone.style.left = '-99999px';
  clone.style.top = '0px';
  clone.style.zIndex = '-9999';
  clone.style.background = '#ffffff';
  clone.style.boxSizing = 'border-box';
  clone.style.overflow = 'hidden';
  clone.style.fontFamily = 'Arial, Helvetica, sans-serif';
  clone.style.letterSpacing = 'normal';
  clone.style.wordSpacing = 'normal';
  
  // Normalize all child fonts and spacing
  const allNodes = clone.querySelectorAll('*');
  allNodes.forEach(node => {
    node.style.letterSpacing = 'normal';
    node.style.fontFamily = 'Arial, Helvetica, sans-serif';
  });

  document.body.appendChild(clone);

  try {
    // 2. Ensure all images inside clone are fully loaded
    const images = clone.getElementsByTagName('img');
    await Promise.all(
      Array.from(images).map(img => {
        if (img.complete) return Promise.resolve();
        return new Promise((resolve) => {
          img.onload = resolve;
          img.onerror = resolve;
        });
      })
    );

    // 3. High-Resolution Canvas Render with html2canvas (2x Retina scale)
    const canvas = await html2canvas(clone, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      logging: false,
      backgroundColor: '#ffffff',
      width: 794,
      height: 1122
    });

    const imgData = canvas.toDataURL('image/jpeg', 0.98);
    
    // 4. Create Exactly Single-Page A4 PDF (210mm x 297mm)
    const pdf = new jsPDF('p', 'mm', 'a4');
    pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297, undefined, 'FAST');
    pdf.save(fileName);
    return fileName;
  } finally {
    // Clean up temporary clone from DOM
    if (clone.parentNode) {
      clone.parentNode.removeChild(clone);
    }
  }
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

Hayırlı ve kabul olunmuş bir Umre dileriz.`;

  return encodeURIComponent(msg);
}

// 📦 Direct Standalone Single-Page A4 PDF Generator (Zero Modals Required)
export async function generateDirectPdfBlob(quote) {
  const todayStr = new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
  const validUntilStr = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
  
  const transfers = quote.transfersSelection || {};
  const roomMatrix = quote.roomMatrix || [];

  const getRoomCost = (occ) => {
    if (quote.roomMatrix && quote.roomMatrix.length > 0) {
      const rm = quote.roomMatrix.find(r => r.occupancy === occ);
      if (rm) {
        return {
          usd: rm.priceUSD || rm.totalHotelUSD || 0,
          try: rm.priceTRY || Math.round((rm.priceUSD || rm.totalHotelUSD || 0) * (quote.currenciesUsed?.USD_TRY || 36.50))
        };
      }
    }
    const mkDays = Number(quote.makkahDays) || 0;
    const mdDays = Number(quote.madinahDays) || 0;
    const mkRoom = Number(quote.makkahRoomSAR) || 0;
    const mdRoom = Number(quote.madinahRoomSAR) || 0;
    const mkFood = Number(quote.makkahFoodSAR) || 0;
    const mdFood = Number(quote.madinahFoodSAR) || 0;
    const sarUsd = quote.currenciesUsed?.SAR_USD || 3.75;
    const usdTry = quote.currenciesUsed?.USD_TRY || (quote.finalPriceUSD ? (quote.finalPriceTRY / quote.finalPriceUSD) : 36.50);

    if (mkRoom > 0 || mdRoom > 0) {
      const mkDaily = occ > 0 ? (mkRoom / occ) : 0;
      const mdDaily = occ > 0 ? (mdRoom / occ) : 0;
      const totalSAR = (mkDaily + mkFood) * mkDays + (mdDaily + mdFood) * mdDays;
      const usd = Math.round(totalSAR / sarUsd);
      return { usd, try: Math.round(usd * usdTry) };
    }

    if (quote.totalAccommodationSAR) {
      const baseSAR = (quote.totalAccommodationSAR / (quote.makkahRoomOccupancy || 2)) * (2 / occ);
      const usd = Math.round(baseSAR / sarUsd);
      return { usd, try: Math.round(usd * usdTry) };
    }

    const factor = occ === 1 ? 1.7 : occ === 2 ? 1.0 : occ === 3 ? 0.78 : 0.68;
    const estimatedBaseHotelUSD = Math.round((quote.finalPriceUSD || 500) * 0.45 * factor);
    return { usd: estimatedBaseHotelUSD, try: Math.round(estimatedBaseHotelUSD * usdTry) };
  };

  const getTransferText = (sel) => {
    if (!sel || sel.vehicleType === 'none') return '<span style="color: #94a3b8; font-weight: bold;">Talep Edilmedi (Kendi İmkânıyla)</span>';
    if (sel.vehicleType === 'small') return `<span style="color: #047857; font-weight: bold;">Özel VIP Araç (${escapeHtml(sel.passengerCount) || 2} Kişi)</span>`;
    if (sel.vehicleType === 'big') return `<span style="color: #047857; font-weight: bold;">Lüks Otobüs (${escapeHtml(sel.passengerCount) || 45} Kişi Paylaşımlı)</span>`;
    return 'Dahil';
  };

  const fileName = formatAsciiFileName(quote.customerName, quote.packageName);

  const safeCustomerName = escapeHtml(quote.customerName || 'Değerli Misafirimiz');
  const safeCustomerPhone = escapeHtml(quote.customerPhone || '-');
  const safePackageName = escapeHtml(quote.packageName || 'Standart Paket');
  const safeAgentName = escapeHtml(quote.agentName || quote.createdByName || 'Satış Departmanı');

  const clone = document.createElement('div');
  clone.id = 'direct-pdf-render-target';
  clone.style.width = '794px';
  clone.style.height = '1122px';
  clone.style.maxHeight = '1122px';
  clone.style.position = 'fixed';
  clone.style.left = '-99999px';
  clone.style.top = '0px';
  clone.style.zIndex = '-9999';
  clone.style.background = '#ffffff';
  clone.style.color = '#0f172a';
  clone.style.padding = '26px 34px';
  clone.style.boxSizing = 'border-box';
  clone.style.fontFamily = 'Arial, Helvetica, sans-serif';
  clone.style.overflow = 'hidden';
  clone.style.display = 'flex';
  clone.style.flexDirection = 'column';
  clone.style.justifyContent = 'space-between';

  clone.innerHTML = `
    <!-- Header Section: Luxury Embossed Emerald & Gold Bar -->
    <div style="
      display: flex; 
      align-items: center; 
      justify-content: space-between; 
      padding: 12px 18px; 
      border-radius: 14px; 
      background: linear-gradient(135deg, #064e3b 0%, #065f46 60%, #047857 100%); 
      color: #ffffff;
      box-shadow: 0 4px 12px rgba(6, 78, 59, 0.15);
      margin-bottom: 10px;
    ">
      <div style="display: flex; align-items: center; gap: 14px;">
        <div style="background-color: #ffffff; padding: 6px 10px; border-radius: 10px; display: flex; align-items: center; justify-content: center;">
          <img src="${inzarLogo}" alt="İnzar Logo" style="height: 46px; width: auto; object-fit: contain; display: block;" />
        </div>
        <div>
          <h1 style="font-size: 19px; font-weight: 900; color: #ffffff; letter-spacing: -0.2px; line-height: 1.1; margin: 0;">
            İNZAR TURİZM
          </h1>
          <p style="font-size: 9px; font-weight: 800; color: #fef08a; text-transform: uppercase; letter-spacing: 0.6px; margin: 2px 0 0 0;">
            Hac & Umre Organizasyonu • Lüks Seyahat Hizmetleri
          </p>
          <p style="font-size: 8.5px; color: #a7f3d0; margin: 2px 0 0 0;">
            TÜRSAB Belge No: 8207 • T.C. Diyanet İşleri Başkanlığı Yetkili Acente
          </p>
        </div>
      </div>

      <div style="text-align: right;">
        <div style="display: inline-block; background-color: #fef08a; color: #064e3b; font-weight: 900; font-size: 10px; padding: 4px 12px; border-radius: 20px; letter-spacing: 0.4px; text-transform: uppercase; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          RESMİ FİYAT TEKLİFİ
        </div>
        <div style="margin-top: 5px; font-size: 9px; color: #d1fae5; line-height: 1.35;">
          <div><strong>Teklif No:</strong> INZ-${Date.now().toString().slice(-6)}</div>
          <div><strong>Tarih:</strong> ${todayStr}</div>
          <div><strong>Geçerlilik:</strong> ${validUntilStr} (15 Gün)</div>
        </div>
      </div>
    </div>

    <!-- Guest & Program Overview Cards (Rounded 12px) -->
    <div style="display: grid; grid-template-columns: 1.1fr 1fr; gap: 10px; margin-bottom: 10px;">
      <div style="padding: 10px 14px; border-radius: 12px; background-color: #f8fafc; border: 1.5px solid #e2e8f0; font-size: 10px;">
        <div style="font-size: 8.5px; font-weight: 800; text-transform: uppercase; color: #065f46; letter-spacing: 0.5px; margin-bottom: 2px; display: flex; align-items: center; gap: 6px;">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#065f46" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          <span>SAYIN MİSAFİRİMİZ / KURUM:</span>
        </div>
        <div style="font-size: 13.5px; font-weight: 900; color: #0f172a; letter-spacing: -0.2px;">${safeCustomerName}</div>
        <div style="color: #475569; margin-top: 2px;">İletişim: <strong style="color: #0f172a;">${safeCustomerPhone}</strong></div>
        <div style="color: #475569; margin-top: 1px;">Grup Kişi Sayısı: <strong style="color: #064e3b;">${Number(quote.paxCount) || 1} Misafir</strong></div>
      </div>

      <div style="padding: 10px 14px; border-radius: 12px; background-color: #f0fdf4; border: 1.5px solid #bbf7d0; font-size: 10px; text-align: right;">
        <div style="font-size: 8.5px; font-weight: 800; text-transform: uppercase; color: #065f46; letter-spacing: 0.5px; margin-bottom: 2px; display: flex; align-items: center; justify-content: flex-end; gap: 6px;">
          <span>PROGRAM KÜNYESİ:</span>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#065f46" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
        </div>
        <div style="font-size: 13.5px; font-weight: 900; color: #047857; letter-spacing: -0.2px;">${safePackageName}</div>
        <div style="color: #475569; margin-top: 2px;">
          Toplam Süre: <strong style="color: #0f172a;">${Number(quote.makkahDays) + Number(quote.madinahDays)} Gün</strong> 
          ${quote.madinahDays === 0 ? ' (Sadece Mekke)' : quote.makkahDays === 0 ? ' (Sadece Medine)' : ` (${quote.makkahDays}G Mekke / ${quote.madinahDays}G Medine)`}
        </div>
        <div style="color: #475569; margin-top: 1px;">Dönem: <strong style="color: #0f172a;">${escapeHtml(quote.selectedMonthLabel || quote.selectedMonth || 'Ocak (Sömestr Tatili)')}</strong></div>
      </div>
    </div>

    <!-- Hotel Standards Table Card (Rounded 12px) -->
    <div style="margin-bottom: 10px; border-radius: 12px; border: 1.5px solid #e2e8f0; overflow: hidden; background-color: #ffffff;">
      <div style="padding: 6px 12px; background-color: #f1f5f9; border-bottom: 1px solid #cbd5e1; font-size: 9.5px; font-weight: 800; color: #064e3b; text-transform: uppercase; letter-spacing: 0.4px; display: flex; align-items: center; gap: 6px;">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#064e3b" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2Z"/><path d="m9 16 .348-.24c1.465-1.013 3.84-1.013 5.304 0L15 16"/><path d="M8 7h.01"/><path d="M16 7h.01"/><path d="M12 7h.01"/><path d="M12 11h.01"/><path d="M16 11h.01"/><path d="M8 11h.01"/></svg>
        <span>KONAKLAMA VE OTEL STANDARTLARI</span>
      </div>
      <table style="width: 100%; text-align: left; font-size: 9.5px; border-collapse: collapse;">
        <thead>
          <tr style="background-color: #f8fafc; color: #475569; font-weight: bold; border-bottom: 1px solid #e2e8f0;">
            <th style="padding: 6px 10px;">Bölge</th>
            <th style="padding: 6px 10px;">Otel Adı</th>
            <th style="padding: 6px 10px;">Süre</th>
            <th style="padding: 6px 10px;">Mescid Mesafesi</th>
            <th style="padding: 6px 10px;">Yemek Durumu</th>
          </tr>
        </thead>
        <tbody>
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 6px 10px; font-weight: 800; color: #065f46;">MEKKE-İ MÜKERREME</td>
            <td style="padding: 6px 10px; font-weight: 700; color: #0f172a;">${quote.makkahDays > 0 ? (quote.pkgDetails?.hotelMakkah || 'Merkezi Otel') : 'Konaklama Yok'}</td>
            <td style="padding: 6px 10px; font-weight: bold; color: #334155;">${quote.makkahDays > 0 ? quote.makkahDays + ' Gece / Gün' : '0 Gün'}</td>
            <td style="padding: 6px 10px; color: #475569;">${quote.makkahDays > 0 ? (quote.pkgDetails?.distanceMakkah || 'Yürüme / Ring Servis') : '-'}</td>
            <td style="padding: 6px 10px; color: ${quote.makkahDays > 0 ? '#047857' : '#94a3b8'}; font-weight: 700;">${quote.makkahDays > 0 ? (quote.pkgDetails?.mealMakkah || 'Sabah & Akşam Tabldot/Büfe') : 'Dahil Değil'}</td>
          </tr>
          <tr>
            <td style="padding: 6px 10px; font-weight: 800; color: #92400e;">MEDİNE-İ MÜNEVVERE</td>
            <td style="padding: 6px 10px; font-weight: 700; color: #0f172a;">${quote.madinahDays > 0 ? (quote.pkgDetails?.hotelMadinah || 'Merkezi Otel') : 'Konaklama Yok'}</td>
            <td style="padding: 6px 10px; font-weight: bold; color: #334155;">${quote.madinahDays > 0 ? quote.madinahDays + ' Gece / Gün' : '0 Gün'}</td>
            <td style="padding: 6px 10px; color: #475569;">${quote.madinahDays > 0 ? (quote.pkgDetails?.distanceMadinah || 'Yürüme Mesafesi') : '-'}</td>
            <td style="padding: 6px 10px; color: ${quote.madinahDays > 0 ? '#047857' : '#94a3b8'}; font-weight: 700;">${quote.madinahDays > 0 ? (quote.pkgDetails?.mealMadinah || 'Sabah & Akşam Tabldot/Büfe') : 'Dahil Değil'}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Transfers (Rounded 12px Card) -->
    <div style="margin-bottom: 10px; border-radius: 12px; border: 1.5px solid #e2e8f0; padding: 8px 12px; background-color: #ffffff;">
      <div style="font-size: 9.5px; font-weight: 800; text-transform: uppercase; color: #064e3b; margin-bottom: 6px; letter-spacing: 0.4px; display: flex; align-items: center; gap: 6px;">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#064e3b" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.5 2.8C2.1 11 2 11.5 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/></svg>
        <span>ULAŞIM VE İÇ HAT TRANSFERLERİ (ARAÇ DURUMU)</span>
      </div>
      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; font-size: 9px;">
        <div style="padding: 6px 10px; border-radius: 8px; background-color: #f8fafc; border: 1px solid #e2e8f0;">
          <span style="font-weight: 800; color: #475569; display: block; font-size: 8.5px;">Cidde - Mekke:</span>
          <span style="font-weight: 700; color: #064e3b; font-size: 10px; margin-top: 1px; display: block;">${getTransferText(transfers.jedMek)}</span>
        </div>
        <div style="padding: 6px 10px; border-radius: 8px; background-color: #f8fafc; border: 1px solid #e2e8f0;">
          <span style="font-weight: 800; color: #475569; display: block; font-size: 8.5px;">Mekke - Medine:</span>
          <span style="font-weight: 700; color: #064e3b; font-size: 10px; margin-top: 1px; display: block;">${getTransferText(transfers.mekMed)}</span>
        </div>
        <div style="padding: 6px 10px; border-radius: 8px; background-color: #f8fafc; border: 1px solid #e2e8f0;">
          <span style="font-weight: 800; color: #475569; display: block; font-size: 8.5px;">Medine - Havaalanı:</span>
          <span style="font-weight: 700; color: #064e3b; font-size: 10px; margin-top: 1px; display: block;">${getTransferText(transfers.medAir)}</span>
        </div>
      </div>
    </div>

    <!-- Pricing Matrix: ONLY CHOSEN ROOM (Rounded 12px Card) -->
    <div style="
      margin-bottom: 10px;
      border-radius: 12px;
      border: 1.5px solid #e2e8f0;
      padding: 10px 14px;
      background-color: #ffffff;
    ">
      <div style="font-size: 9.5px; font-weight: 800; text-transform: uppercase; color: #064e3b; margin-bottom: 6px; letter-spacing: 0.4px; display: flex; align-items: center; gap: 6px;">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#064e3b" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2 4v16"/><path d="M2 8h18a2 2 0 0 1 2 2v10"/><path d="M2 17h20"/><path d="M6 8v9"/></svg>
        <span>${quote.isMixedRoomMode ? 'KARMA GRUP KONAKLAMA DAĞILIMI & ODA MALİYETLERİ' : 'SEÇİLEN ODA TİPİ & ODA MALİYETİ'}</span>
      </div>

      ${quote.isMixedRoomMode && quote.mixedRoomsSummary ? `
        <div>
          <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; text-align: center; margin-bottom: 8px;">
            <div style="padding: 6px; background-color: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0;">
              <div style="font-size: 8.5px; font-weight: 800; color: #475569;">1 KİŞİLİK</div>
              <div style="font-size: 12px; font-weight: 900; color: #064e3b;">${quote.mixedRoomsSummary.singleRooms} Oda</div>
              <div style="font-size: 8px; color: #64748b;">${quote.mixedRoomsSummary.singleRooms * 1} Misafir</div>
            </div>
            <div style="padding: 6px; background-color: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0;">
              <div style="font-size: 8.5px; font-weight: 800; color: #475569;">2 KİŞİLİK</div>
              <div style="font-size: 12px; font-weight: 900; color: #064e3b;">${quote.mixedRoomsSummary.doubleRooms} Oda</div>
              <div style="font-size: 8px; color: #64748b;">${quote.mixedRoomsSummary.doubleRooms * 2} Misafir</div>
            </div>
            <div style="padding: 6px; background-color: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0;">
              <div style="font-size: 8.5px; font-weight: 800; color: #475569;">3 KİŞİLİK</div>
              <div style="font-size: 12px; font-weight: 900; color: #064e3b;">${quote.mixedRoomsSummary.tripleRooms} Oda</div>
              <div style="font-size: 8px; color: #64748b;">${quote.mixedRoomsSummary.tripleRooms * 3} Misafir</div>
            </div>
            <div style="padding: 6px; background-color: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0;">
              <div style="font-size: 8.5px; font-weight: 800; color: #475569;">4 KİŞİLİK</div>
              <div style="font-size: 12px; font-weight: 900; color: #064e3b;">${quote.mixedRoomsSummary.quadRooms} Oda</div>
              <div style="font-size: 8px; color: #64748b;">${quote.mixedRoomsSummary.quadRooms * 4} Misafir</div>
            </div>
          </div>

          <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #e2e8f0; padding-top: 4px; font-size: 9.5px;">
            <div>
              <span style="color: #475569;">Toplam Konaklama: </span>
              <strong style="color: #0f172a;">${quote.mixedRoomsSummary.totalRooms} Oda (${quote.mixedRoomsSummary.totalPax} Misafir)</strong>
            </div>
          </div>
        </div>
      ` : `
        <div style="
          display: flex; 
          align-items: center; 
          justify-content: space-between; 
          padding: 8px 12px; 
          border-radius: 8px; 
          background-color: #f8fafc; 
          border: 1px solid #e2e8f0;
        ">
          <div>
            <span style="font-size: 8.5px; font-weight: 800; color: #065f46; text-transform: uppercase; letter-spacing: 0.4px; display: block;">
              SEÇİLEN ODA KATEGORİSİ
            </span>
            <div style="font-size: 13.5px; font-weight: 900; color: #0f172a; margin-top: 1px;">
              ${quote.makkahRoomOccupancy || 2} Kişilik Oda
            </div>
          </div>

          <div style="text-align: right;">
            <span style="font-size: 8.5px; font-weight: 800; color: #047857; display: block;">
              KONAKLAMA KAPASİTESİ
            </span>
            <div style="font-size: 12px; font-weight: 900; color: #0f172a; margin-top: 1px;">
              ${quote.makkahRoomOccupancy || 2} Kişi / Oda (${quote.paxCount || 1} Misafir)
            </div>
          </div>
        </div>
      `}
    </div>

    <!-- Inclusions & Exclusions (Rounded 12px Card) -->
    <div style="margin-bottom: 10px; border-radius: 12px; border: 1.5px solid #e2e8f0; padding: 8px 12px; background-color: #ffffff;">
      <div style="font-size: 9.5px; font-weight: 800; text-transform: uppercase; color: #064e3b; margin-bottom: 4px; letter-spacing: 0.4px; display: flex; align-items: center; gap: 6px;">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#064e3b" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>
        <span>FİYATA DAHİL OLAN HİZMETLER VE AYRICALIKLAR</span>
      </div>
      <div style="display: grid; grid-template-columns: 1fr 1fr; column-gap: 16px; row-gap: 3.5px; font-size: 9px;">
        <div style="color: ${(fixed.flightTicketSAR || fixed.flightTicketUSD) ? '#065f46' : '#94a3b8'}; font-weight: 700;">
          ${(fixed.flightTicketSAR || fixed.flightTicketUSD) ? '✓ Gidiş-Dönüş Uçak Bileti (Dahil)' : '— Uçak Bileti (Dahil Değil)'}
        </div>
        <div style="color: ${(fixed.visaTaxSAR || fixed.visaSAR) ? '#065f46' : '#94a3b8'}; font-weight: 700;">
          ${(fixed.visaTaxSAR || fixed.visaSAR) ? '✓ Suudi Arabistan Umre Vizesi (Dahil)' : '— Umre Vizesi (Dahil Değil)'}
        </div>
        <div style="color: ${fixed.insuranceSAR ? '#065f46' : '#94a3b8'}; font-weight: 700;">
          ${fixed.insuranceSAR ? '✓ Kapsamlı Sağlık & Seyahat Sigortası (Dahil)' : '— Seyahat Sigortası (Dahil Değil)'}
        </div>
        <div style="color: ${(fixed.guideSAR || fixed.guidanceSAR) ? '#065f46' : '#94a3b8'}; font-weight: 700;">
          ${(fixed.guideSAR || fixed.guidanceSAR) ? '✓ Kutsal Mekan Ziyaretleri & Rehberlik (Dahil)' : '— Rehberlik Hizmeti (Dahil Değil)'}
        </div>
        <div style="color: ${(fixed.bagSAR || fixed.scarfSAR) ? '#065f46' : '#94a3b8'}; font-weight: 700;">
          ${(fixed.bagSAR || fixed.scarfSAR) ? '✓ Seyahat Çanta Seti & Hediyeler (Dahil)' : '— Çanta Seti (Dahil Değil)'}
        </div>
        <div style="color: fixed.zamzamSAR ? '#065f46' : '#94a3b8'}; font-weight: 700;">
          ${fixed.zamzamSAR ? '✓ 5 Litre Orijinal Zemzem Suyu İkramı (Dahil)' : '— Zemzem İkramı (Dahil Değil)'}
        </div>
        <div style="color: ${(quote.makkahDays > 0 || quote.madinahDays > 0) ? '#065f46' : '#94a3b8'}; font-weight: 700;">
          ${(quote.makkahDays > 0 || quote.madinahDays > 0) ? '✓ Otellerde Program Süresince Konaklama (Dahil)' : '— Otel Konaklaması (Dahil Değil)'}
        </div>
        <div style="color: #065f46; font-weight: 700;">
          ✓ 7/24 Havalimanı Karşılama, Transfer & Saha Koordinasyon Desteği
        </div>
      </div>
    </div>

    <!-- 7. KİŞİ BAŞI TOPLAM HİZMET BEDELİ (DAHİLİ HİZMETLER & ARAÇ DAHİL) -->
    <div style="
      margin-bottom: 10px; 
      border-radius: 12px; 
      border: 1.5px solid #a7f3d0; 
      padding: 8px 12px; 
      background-color: #ecfdf5;
    ">
      <div style="
        font-size: 9.5px; 
        font-weight: 800; 
        text-transform: uppercase; 
        color: #064e3b; 
        margin-bottom: 6px; 
        letter-spacing: 0.4px; 
        display: flex; 
        align-items: center; 
        gap: 6px;
      ">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#064e3b" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m16 10-4 4-2-2"/></svg>
        <span>${quote.isMixedRoomMode ? 'ODA TERCİHİNE GÖRE KİŞİ BAŞI TOPLAM HİZMET BEDELLERİ (HER ŞEY DAHİL)' : 'KİŞİ BAŞI TOPLAM HİZMET BEDELİ (HER ŞEY DAHİL)'}</span>
      </div>

      ${quote.isMixedRoomMode && quote.mixedRoomsBreakdown ? `
        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; text-align: center;">
          <div style="padding: 6px 8px; background-color: #ffffff; border-radius: 8px; border: 1px solid #bbf7d0;">
            <div style="font-size: 8.5px; font-weight: 800; color: #065f46;">1 KİŞİLİK ODA</div>
            <div style="font-size: 13px; font-weight: 900; color: #0f172a; margin-top: 1px;">
              $${quote.mixedRoomsBreakdown.single.priceUSD?.toLocaleString('tr-TR')} USD
            </div>
            <div style="font-size: 8px; color: #047857; font-weight: 700;">
              ~${quote.mixedRoomsBreakdown.single.priceTRY?.toLocaleString('tr-TR')} ₺ / Kişi
            </div>
          </div>

          <div style="padding: 6px 8px; background-color: #ffffff; border-radius: 8px; border: 1px solid #bbf7d0;">
            <div style="font-size: 8.5px; font-weight: 800; color: #065f46;">2 KİŞİLİK ODA</div>
            <div style="font-size: 13px; font-weight: 900; color: #0f172a; margin-top: 1px;">
              $${quote.mixedRoomsBreakdown.double.priceUSD?.toLocaleString('tr-TR')} USD
            </div>
            <div style="font-size: 8px; color: #047857; font-weight: 700;">
              ~${quote.mixedRoomsBreakdown.double.priceTRY?.toLocaleString('tr-TR')} ₺ / Kişi
            </div>
          </div>

          <div style="padding: 6px 8px; background-color: #ffffff; border-radius: 8px; border: 1px solid #bbf7d0;">
            <div style="font-size: 8.5px; font-weight: 800; color: #065f46;">3 KİŞİLİK ODA</div>
            <div style="font-size: 13px; font-weight: 900; color: #0f172a; margin-top: 1px;">
              $${quote.mixedRoomsBreakdown.triple.priceUSD?.toLocaleString('tr-TR')} USD
            </div>
            <div style="font-size: 8px; color: #047857; font-weight: 700;">
              ~${quote.mixedRoomsBreakdown.triple.priceTRY?.toLocaleString('tr-TR')} ₺ / Kişi
            </div>
          </div>

          <div style="padding: 6px 8px; background-color: #ffffff; border-radius: 8px; border: 1px solid #bbf7d0;">
            <div style="font-size: 8.5px; font-weight: 800; color: #065f46;">4 KİŞİLİK ODA</div>
            <div style="font-size: 13px; font-weight: 900; color: #0f172a; margin-top: 1px;">
              $${quote.mixedRoomsBreakdown.quad.priceUSD?.toLocaleString('tr-TR')} USD
            </div>
            <div style="font-size: 8px; color: #047857; font-weight: 700;">
              ~${quote.mixedRoomsBreakdown.quad.priceTRY?.toLocaleString('tr-TR')} ₺ / Kişi
            </div>
          </div>
        </div>
      ` : `
        <div style="display: flex; align-items: center; justify-content: space-between; padding: 4px 6px;">
          <div>
            <div style="font-size: 11px; font-weight: 800; color: #064e3b;">
              ${quote.makkahRoomOccupancy || 2} Kişilik Oda (Kişi Başı Paket Bedeli)
            </div>
            <div style="font-size: 8.5px; color: #475569; margin-top: 1px;">
              Otel Konaklaması, Vize, Uçak Bileti, Araç/Transferler ve Tüm Dahili Hizmetler Dahildir.
            </div>
          </div>

          <div style="text-align: right;">
            <div style="font-size: 15px; font-weight: 900; color: #064e3b;">
              $${quote.finalPriceUSD?.toLocaleString('tr-TR')} USD
            </div>
            <div style="font-size: 9px; color: #047857; font-weight: 800;">
              ~${quote.finalPriceTRY?.toLocaleString('tr-TR')} ₺ (Kişi Başı)
            </div>
          </div>
        </div>
      `}
    </div>

    <!-- 🌟 VURGULU TOPLAM BEDEL / MALİYET KUTUSU (STANDALONE) -->
    <div style="
      margin-bottom: 10px;
      padding: 10px 16px; 
      border-radius: 12px; 
      background-color: #064e3b; 
      color: #ffffff;
      display: flex; 
      align-items: center; 
      justify-content: space-between;
      box-shadow: 0 4px 12px rgba(6, 78, 59, 0.25);
      border: 1.5px solid #047857;
    ">
      <div>
        <div style="font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.4px; color: #fef08a;">
          ${quote.isMixedRoomMode && quote.mixedRoomsSummary ? 'GRUP GENEL TOPLAM HİZMET BEDELİ' : `TOPLAM HİZMET BEDELİ (${Number(quote.paxCount) || 1} KİŞİ)`}
        </div>
      </div>

      <div style="text-align: right;">
        <div style="font-size: 20px; font-weight: 900; color: #fbbf24; letter-spacing: -0.3px; line-height: 1;">
          $${((quote.isMixedRoomMode && quote.mixedRoomsSummary?.groupGrandTotalUSD) ? quote.mixedRoomsSummary.groupGrandTotalUSD : (quote.finalPriceUSD * (Number(quote.paxCount) || 1))).toLocaleString('tr-TR')} USD
        </div>
        <div style="font-size: 10px; color: #d1fae5; font-weight: 700; margin-top: 2px;">
          ~${((quote.isMixedRoomMode && quote.mixedRoomsSummary?.groupGrandTotalTRY) ? quote.mixedRoomsSummary.groupGrandTotalTRY : (quote.finalPriceTRY * (Number(quote.paxCount) || 1))).toLocaleString('tr-TR')} ₺ (TCMB Kuruna Göre)
        </div>
      </div>
    </div>

    <!-- Inclusions & Exclusions (Rounded 12px Card) -->
    <div style="margin-bottom: 10px; border-radius: 12px; border: 1.5px solid #e2e8f0; padding: 8px 12px; background-color: #ffffff;">
      <div style="font-size: 9.5px; font-weight: 800; text-transform: uppercase; color: #064e3b; margin-bottom: 4px; letter-spacing: 0.4px;">
        ✨ FİYATA DAHİL OLAN HİZMETLER VE AYRICALIKLAR
      </div>
      <div style="display: grid; grid-template-columns: 1fr 1fr; column-gap: 16px; row-gap: 3.5px; font-size: 9px;">
        <div style="color: ${(fixed.flightTicketSAR || fixed.flightTicketUSD) ? '#065f46' : '#94a3b8'}; font-weight: 700;">
          ${(fixed.flightTicketSAR || fixed.flightTicketUSD) ? '✓ Gidiş-Dönüş Uçak Bileti (Dahil)' : '— Uçak Bileti (Dahil Değil)'}
        </div>
        <div style="color: ${(fixed.visaTaxSAR || fixed.visaSAR) ? '#065f46' : '#94a3b8'}; font-weight: 700;">
          ${(fixed.visaTaxSAR || fixed.visaSAR) ? '✓ Suudi Arabistan Umre Vizesi (Dahil)' : '— Umre Vizesi (Dahil Değil)'}
        </div>
        <div style="color: ${fixed.insuranceSAR ? '#065f46' : '#94a3b8'}; font-weight: 700;">
          ${fixed.insuranceSAR ? '✓ Kapsamlı Sağlık & Seyahat Sigortası (Dahil)' : '— Seyahat Sigortası (Dahil Değil)'}
        </div>
        <div style="color: ${(fixed.guideSAR || fixed.guidanceSAR) ? '#065f46' : '#94a3b8'}; font-weight: 700;">
          ${(fixed.guideSAR || fixed.guidanceSAR) ? '✓ Kutsal Mekan Ziyaretleri & Rehberlik (Dahil)' : '— Rehberlik Hizmeti (Dahil Değil)'}
        </div>
        <div style="color: ${(fixed.bagSAR || fixed.scarfSAR) ? '#065f46' : '#94a3b8'}; font-weight: 700;">
          ${(fixed.bagSAR || fixed.scarfSAR) ? '✓ Seyahat Çanta Seti & Hediyeler (Dahil)' : '— Çanta Seti (Dahil Değil)'}
        </div>
        <div style="color: fixed.zamzamSAR ? '#065f46' : '#94a3b8'}; font-weight: 700;">
          ${fixed.zamzamSAR ? '✓ 5 Litre Orijinal Zemzem Suyu İkramı (Dahil)' : '— Zemzem İkramı (Dahil Değil)'}
        </div>
        <div style="color: ${(quote.makkahDays > 0 || quote.madinahDays > 0) ? '#065f46' : '#94a3b8'}; font-weight: 700;">
          ${(quote.makkahDays > 0 || quote.madinahDays > 0) ? '✓ Otellerde Program Süresince Konaklama (Dahil)' : '— Otel Konaklaması (Dahil Değil)'}
        </div>
        <div style="color: #065f46; font-weight: 700;">
          ✓ 7/24 Havalimanı Karşılama, Transfer & Saha Koordinasyon Desteği
        </div>
      </div>
    </div>

    <!-- Footer / Signatures (Rounded 12px Card) -->
    <div style="
      border-radius: 12px; 
      border: 1.5px solid #cbd5e1; 
      padding: 8px 12px; 
      background-color: #f8fafc;
      display: grid; 
      grid-template-columns: 1.2fr 1fr; 
      gap: 16px; 
      font-size: 8.5px; 
      color: #64748b;
    ">
      <div>
        <p style="margin: 0; font-weight: 800; color: #1e293b; text-transform: uppercase; letter-spacing: 0.2px;">Açıklamalar & Şartlar:</p>
        <ul style="margin: 2px 0 0 0; padding-left: 12px; lineHeight: 1.35;">
          <li>Fiyatlar döviz kuru TCMB serbest piyasa alışına göre anlık hesaplanmıştır.</li>
          <li>Kesin kayıt için pasaport fotokopisi ve kapora ödemesi gerekmektedir.</li>
          <li>Uçuş saatleri ve hava yolu şirketleri kontenjan durumuna göre teyit edilir.</li>
        </ul>
      </div>

      <div style="text-align: right; display: flex; flex-direction: column; justify-content: space-between;">
        <div>
          <div style="font-weight: 800; color: #0f172a; font-size: 9.5px;">İNZAR TURİZM GENEL MERKEZİ</div>
          <div style="color: #475569; margin-top: 1px;">Yetkili Satış Danışmanı: <strong>${quote.agentName || quote.createdByName || 'Satış Departmanı'}</strong></div>
        </div>
        <div style="padding-top: 4px;">
          <div style="display: inline-block; border-bottom: 1.5px dashed #94a3b8; width: 130px; text-align: center; color: #94a3b8; font-size: 8px;">
            Kaşe / Yetkili İmza
          </div>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(clone);

  try {
    const images = clone.getElementsByTagName('img');
    await Promise.all(
      Array.from(images).map(img => {
        if (img.complete) return Promise.resolve();
        return new Promise((resolve) => {
          img.onload = resolve;
          img.onerror = resolve;
        });
      })
    );

    const canvas = await html2canvas(clone, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      logging: false,
      backgroundColor: '#ffffff',
      width: 794,
      height: 1122
    });

    const imgData = canvas.toDataURL('image/jpeg', 0.98);
    const pdf = new jsPDF('p', 'mm', 'a4');
    pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297, undefined, 'FAST');
    const blob = pdf.output('blob');
    const file = new File([blob], fileName, { type: 'application/pdf' });

    return { pdf, blob, file, fileName };
  } finally {
    if (clone.parentNode) {
      clone.parentNode.removeChild(clone);
    }
  }
}

export async function downloadDirectQuotationPdf(quote) {
  const { pdf, fileName } = await generateDirectPdfBlob(quote);
  pdf.save(fileName);
  return fileName;
}

export async function shareQuoteOnWhatsApp(quote) {
  const phone = quote.customerPhone ? quote.customerPhone.replace(/[^0-9]/g, '') : '';
  
  try {
    const { file, fileName } = await generateDirectPdfBlob(quote);
    
    // Check if Web Share API level 2 with files is supported (e.g. Mobile browsers, Chrome/Safari on mobile)
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({
        files: [file],
        title: fileName,
        text: `${quote.customerName || 'Misafir'} - İnzar Turizm Umre Teklif Belgesi`
      });
      return { sharedViaNative: true };
    }
  } catch (err) {
    console.log('Web share with file unavailable or cancelled:', err);
  }

  // Fallback for desktop: Download PDF file & open WhatsApp chat so user can attach it immediately
  try {
    await downloadDirectQuotationPdf(quote);
  } catch (e) {}

  const encoded = generateWhatsAppMessage(quote);
  const url = phone ? `https://wa.me/${phone}?text=${encoded}` : `https://api.whatsapp.com/send?text=${encoded}`;
  window.open(url, '_blank');
  return { sharedViaUrl: true };
}


