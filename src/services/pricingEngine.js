// İnzar Turizm - Aylık Otonom Tarife & Teklif Hesaplama Motoru
// Seçilen seyahat ayına göre merkez otel fiyatlarını otonom çeker ve Excel formüllerini uygular.

export function calculateQuotation({
  pkg, // Seçili paket objesi
  selectedMonth = 'nov',
  makkahDays = 7,
  makkahRoomOccupancy = 2, // 1, 2, 3, 4, 5
  madinahDays = 3,
  madinahRoomOccupancy = 2, // 1, 2, 3, 4, 5
  transfersSelection = {
    jedMek: { vehicleType: 'small', passengerCount: 2 },
    mekMed: { vehicleType: 'small', passengerCount: 2 },
    medAir: { vehicleType: 'small', passengerCount: 2 },
  },
  fixedExpensesIncluded = {
    flightTicketSAR: true,
    visaTaxSAR: true,
    insuranceSAR: true,
    bagSAR: true,
    scarfSAR: true,
    guideSAR: true,
    commissionSAR: true,
    bonusSAR: true,
    zamzamSAR: true,
    branchExpenseSAR: false,
  },
  currencies = {
    SAR_USD: 3.75,
    USD_TRY: 36.50,
    EUR_TRY: 39.80,
    EUR_USD: 1.08,
  },
  applyProfitMargin = true, // Kârı uygula / Kârsız (Net maliyet)
  customProfitMargin = null,
  customDiscountUSD = 0,
}) {
  if (!pkg) return null;

  const sarUsdRate = currencies.SAR_USD || 3.75;
  const usdTryRate = currencies.USD_TRY || 36.50;
  const eurUsdRate = currencies.EUR_USD || 1.08;

  // Paket bazlı kar marjı: applyProfitMargin false ise %0 (karsız), true ise paketin kendi marjı (veya custom)
  const defaultPkgMargin = pkg.profitMargin !== undefined ? pkg.profitMargin : 15;
  const targetMargin = customProfitMargin !== null ? customProfitMargin : defaultPkgMargin;
  const profitMarginPercent = applyProfitMargin ? targetMargin : 0;

  // 1. Seçilen Aya Göre Otonom Otel Oda Fiyatı (SAR)
  const monthRate = pkg.monthlyPrices?.[selectedMonth] || pkg.monthlyPrices?.nov || { makkahRoomSAR: 100, madinahRoomSAR: 500 };
  const makkahRoomSAR = monthRate.makkahRoomSAR || 0;
  const madinahRoomSAR = monthRate.madinahRoomSAR || 0;

  // 2. Mekke Konaklama & Yemek
  const makkahFoodSAR = pkg.makkahFoodPriceSAR || 0;
  const makkahPerPersonDailyRoomSAR = makkahRoomOccupancy > 0 ? (makkahRoomSAR / makkahRoomOccupancy) : 0;
  const makkahPerPersonDailyTotalSAR = makkahPerPersonDailyRoomSAR + makkahFoodSAR;
  const makkahTotalSAR = makkahPerPersonDailyTotalSAR * makkahDays;

  // 3. Medine Konaklama & Yemek
  const madinahFoodSAR = pkg.madinahFoodPriceSAR || 0;
  const madinahPerPersonDailyRoomSAR = madinahRoomOccupancy > 0 ? (madinahRoomSAR / madinahRoomOccupancy) : 0;
  const madinahPerPersonDailyTotalSAR = madinahPerPersonDailyRoomSAR + madinahFoodSAR;
  const madinahTotalSAR = madinahPerPersonDailyTotalSAR * madinahDays;

  // 4. Transferler Dağılımı (Kişi Sayısına Bölünür)
  let transfersTotalSAR = 0;
  const transferBreakdown = [];

  const routeKeys = [
    { id: 'jedMek', label: 'Cidde - Mekke Otel', smallKey: 'jedMekSmall', bigKey: 'jedMekBig' },
    { id: 'mekMed', label: 'Mekke - Medine Transfer', smallKey: 'mekMedSmall', bigKey: 'mekMedBig' },
    { id: 'medAir', label: 'Medine Otel - Havaalanı', smallKey: 'medAirSmall', bigKey: 'medAirBig' },
  ];

  routeKeys.forEach(r => {
    const sel = transfersSelection[r.id] || { vehicleType: 'none', passengerCount: 0 };
    let vehicleCost = 0;
    let perPersonCost = 0;

    if (sel.vehicleType === 'small') {
      vehicleCost = pkg.transfers?.[r.smallKey] || 0;
      perPersonCost = (sel.passengerCount > 0) ? (vehicleCost / sel.passengerCount) : 0;
    } else if (sel.vehicleType === 'big') {
      vehicleCost = pkg.transfers?.[r.bigKey] || 0;
      perPersonCost = (sel.passengerCount > 0) ? (vehicleCost / sel.passengerCount) : 0;
    }

    transfersTotalSAR += perPersonCost;
    transferBreakdown.push({
      routeId: r.id,
      label: r.label,
      vehicleType: sel.vehicleType,
      vehicleCost,
      passengerCount: sel.passengerCount,
      perPersonCostSAR: perPersonCost
    });
  });

  // 5. Sabit & Ek Giderler
  let fixedExpensesTotalSAR = 0;
  const fixedExpensesBreakdown = [];

  const fixedList = [
    { key: 'flightTicketSAR', label: 'Uçak Bileti' },
    { key: 'visaTaxSAR', label: 'Vize + Vergi' },
    { key: 'insuranceSAR', label: 'Sigorta' },
    { key: 'bagSAR', label: 'Çanta' },
    { key: 'scarfSAR', label: 'Fular / Eşarp' },
    { key: 'guideSAR', label: 'Rehberlik / Görevli' },
    { key: 'commissionSAR', label: 'Personel Komisyonu' },
    { key: 'bonusSAR', label: 'Prim' },
    { key: 'zamzamSAR', label: '5L Zemzem' },
    { key: 'branchExpenseSAR', label: 'Genel Gider' },
  ];

  fixedList.forEach(item => {
    const isInc = !!fixedExpensesIncluded[item.key];
    const cost = isInc ? (pkg.fixedExpenses?.[item.key] || 0) : 0;
    fixedExpensesTotalSAR += cost;
    fixedExpensesBreakdown.push({
      key: item.key,
      label: item.label,
      included: isInc,
      costSAR: cost
    });
  });

  // 6. Toplam Maliyet Havuzu (SAR)
  const grandTotalCostSAR = makkahTotalSAR + madinahTotalSAR + transfersTotalSAR + fixedExpensesTotalSAR;

  // 7. USD ve Kar Marjı Çevirisi
  const baseCostUSD = grandTotalCostSAR / sarUsdRate;
  const profitMarginAmountUSD = baseCostUSD * (profitMarginPercent / 100);
  const priceBeforeDiscountUSD = baseCostUSD + profitMarginAmountUSD;
  const finalPriceUSD = Math.max(0, priceBeforeDiscountUSD - (customDiscountUSD || 0));

  // 8. Diğer Para Birimleri
  const finalPriceTRY = finalPriceUSD * usdTryRate;
  const finalPriceEUR = finalPriceUSD / eurUsdRate;
  const finalPriceSAR = finalPriceUSD * sarUsdRate;

  return {
    packageId: pkg.id,
    packageName: pkg.name,
    packageProfitMargin: defaultPkgMargin,
    applyProfitMargin,
    selectedMonth,
    makkahDays,
    makkahRoomOccupancy,
    makkahRoomSAR,
    makkahFoodSAR,
    makkahPerPersonDailyRoomSAR,
    makkahTotalSAR,
    madinahDays,
    madinahRoomOccupancy,
    madinahRoomSAR,
    madinahFoodSAR,
    madinahPerPersonDailyRoomSAR,
    madinahTotalSAR,
    totalAccommodationSAR: makkahTotalSAR + madinahTotalSAR,
    transfersTotalSAR,
    transferBreakdown,
    fixedExpensesTotalSAR,
    fixedExpensesBreakdown,
    grandTotalCostSAR,
    baseCostUSD,
    profitMarginPercent,
    profitMarginAmountUSD,
    customDiscountUSD,
    finalPriceUSD: Math.round(finalPriceUSD),
    finalPriceUSDExact: Number(finalPriceUSD.toFixed(2)),
    finalPriceTRY: Math.round(finalPriceTRY),
    finalPriceEUR: Math.round(finalPriceEUR),
    finalPriceSAR: Math.round(finalPriceSAR),
    currenciesUsed: { ...currencies },
    timestamp: new Date().toISOString()
  };
}

// 2'li, 3'lü, 4'lü Oda Karşılaştırma Matrisi
export function generateRoomMatrix(
  pkg, 
  selectedMonth, 
  makkahDays, 
  madinahDays, 
  transfersSelection, 
  fixedExpensesIncluded, 
  currencies, 
  applyProfitMargin = true,
  customProfitMargin = null
) {
  const occupancies = [
    { count: 2, label: '2 Kişilik Oda (Double)', desc: 'Eşler veya 2 Kişi' },
    { count: 3, label: '3 Kişilik Oda (Triple)', desc: '3 Kişilik Paylaşımlı' },
    { count: 4, label: '4 Kişilik Oda (Quad)', desc: '4 Kişilik Aile / Grup' },
    { count: 1, label: 'Tek Kişilik Oda (Single)', desc: 'Özel Tek Kişilik Oda' }
  ];

  return occupancies.map(occ => {
    const q = calculateQuotation({
      pkg,
      selectedMonth,
      makkahDays,
      makkahRoomOccupancy: occ.count,
      madinahDays,
      madinahRoomOccupancy: occ.count,
      transfersSelection,
      fixedExpensesIncluded,
      currencies,
      applyProfitMargin,
      customProfitMargin,
    });

    return {
      occupancy: occ.count,
      label: occ.label,
      desc: occ.desc,
      priceUSD: q.finalPriceUSD,
      priceTRY: q.finalPriceTRY,
      priceEUR: q.finalPriceEUR,
      priceSAR: q.finalPriceSAR,
      finalPriceUSD: q.finalPriceUSD,
      finalPriceTRY: q.finalPriceTRY,
      finalPriceEUR: q.finalPriceEUR,
      finalPriceSAR: q.finalPriceSAR,
      baseCostUSD: Math.round(q.baseCostUSD),
      profitUSD: Math.round(q.profitMarginAmountUSD),
    };
  });
}
