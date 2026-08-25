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
  isMixedRoomMode = false,
  mixedRooms = { single: 0, double: 0, triple: 0, quad: 0 }
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

  const makkahFoodSAR = Number(pkg.makkahFoodPriceSAR) || Number(pkg.makkahFoodSAR) || 0;
  const madinahFoodSAR = Number(pkg.madinahFoodPriceSAR) || Number(pkg.madinahFoodSAR) || 0;

  // 2. Mekke & Medine Konaklama & Yemek
  let makkahTotalSAR = 0;
  let madinahTotalSAR = 0;
  let makkahPerPersonDailyRoomSAR = 0;
  let madinahPerPersonDailyRoomSAR = 0;
  let mixedRoomsSummary = null;

  if (isMixedRoomMode) {
    const singleCount = Number(mixedRooms.single) || 0;
    const doubleCount = Number(mixedRooms.double) || 0;
    const tripleCount = Number(mixedRooms.triple) || 0;
    const quadCount = Number(mixedRooms.quad) || 0;

    const totalMixedPax = (singleCount * 1) + (doubleCount * 2) + (tripleCount * 3) + (quadCount * 4);
    const totalMixedRooms = singleCount + doubleCount + tripleCount + quadCount;
    const effectivePax = totalMixedPax > 0 ? totalMixedPax : 1;

    // Mekke Grup Toplamı
    const makkahGroupSingle = singleCount * (makkahRoomSAR + (1 * makkahFoodSAR)) * makkahDays;
    const makkahGroupDouble = doubleCount * (makkahRoomSAR + (2 * makkahFoodSAR)) * makkahDays;
    const makkahGroupTriple = tripleCount * (makkahRoomSAR + (3 * makkahFoodSAR)) * makkahDays;
    const makkahGroupQuad = quadCount * (makkahRoomSAR + (4 * makkahFoodSAR)) * makkahDays;
    const makkahGroupTotal = makkahGroupSingle + makkahGroupDouble + makkahGroupTriple + makkahGroupQuad;
    makkahTotalSAR = totalMixedPax > 0 ? (makkahGroupTotal / effectivePax) : 0;
    makkahPerPersonDailyRoomSAR = makkahDays > 0 ? ((makkahTotalSAR / makkahDays) - makkahFoodSAR) : 0;

    // Medine Grup Toplamı
    const madinahGroupSingle = singleCount * (madinahRoomSAR + (1 * madinahFoodSAR)) * madinahDays;
    const madinahGroupDouble = doubleCount * (madinahRoomSAR + (2 * madinahFoodSAR)) * madinahDays;
    const madinahGroupTriple = tripleCount * (madinahRoomSAR + (3 * madinahFoodSAR)) * madinahDays;
    const madinahGroupQuad = quadCount * (madinahRoomSAR + (4 * madinahFoodSAR)) * madinahDays;
    const madinahGroupTotal = madinahGroupSingle + madinahGroupDouble + madinahGroupTriple + madinahGroupQuad;
    madinahTotalSAR = totalMixedPax > 0 ? (madinahGroupTotal / effectivePax) : 0;
    madinahPerPersonDailyRoomSAR = madinahDays > 0 ? ((madinahTotalSAR / madinahDays) - madinahFoodSAR) : 0;

    mixedRoomsSummary = {
      totalRooms: totalMixedRooms,
      totalPax: totalMixedPax,
      singleRooms: singleCount,
      doubleRooms: doubleCount,
      tripleRooms: tripleCount,
      quadRooms: quadCount,
      makkahGroupTotalSAR: makkahGroupTotal,
      madinahGroupTotalSAR: madinahGroupTotal
    };
  } else {
    // Standart Tekil Oda Tipi
    makkahPerPersonDailyRoomSAR = makkahRoomOccupancy > 0 ? (makkahRoomSAR / makkahRoomOccupancy) : 0;
    const makkahPerPersonDailyTotalSAR = makkahPerPersonDailyRoomSAR + makkahFoodSAR;
    makkahTotalSAR = makkahPerPersonDailyTotalSAR * makkahDays;

    madinahPerPersonDailyRoomSAR = madinahRoomOccupancy > 0 ? (madinahRoomSAR / madinahRoomOccupancy) : 0;
    const madinahPerPersonDailyTotalSAR = madinahPerPersonDailyRoomSAR + madinahFoodSAR;
    madinahTotalSAR = madinahPerPersonDailyTotalSAR * madinahDays;
  }

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
    isMixedRoomMode,
    mixedRooms,
    mixedRoomsSummary,
    currenciesUsed: { ...currencies },
    timestamp: new Date().toISOString()
  };
}

// 2'li, 3'lü, 4'lü, 1'li Saf Konaklama & Yemek Karşılaştırma Matrisi (Uçak, vize, transfer ve diğer giderlerden bağımsız)
export function generateRoomMatrix(
  pkg, 
  selectedMonth = 'nov', 
  makkahDays = 7, 
  madinahDays = 4, 
  currencies = { SAR_USD: 3.75, USD_TRY: 36.50, EUR_USD: 1.08 }
) {
  const occupancies = [
    { count: 1, label: 'Tek Kişilik Oda', desc: 'Özel Tek Kişilik Oda' },
    { count: 2, label: '2 Kişilik Oda', desc: 'Eşler veya 2 Kişi' },
    { count: 3, label: '3 Kişilik Oda', desc: '3 Kişilik Paylaşımlı' },
    { count: 4, label: '4 Kişilik Oda', desc: '4 Kişilik Aile / Grup' }
  ];

  if (!pkg) return [];

  const sarUsdRate = currencies?.SAR_USD || 3.75;
  const usdTryRate = currencies?.USD_TRY || 36.50;
  const eurUsdRate = currencies?.EUR_USD || 1.08;

  const monthRates = pkg.monthlyPrices?.[selectedMonth] || pkg.monthlyPrices?.nov || {
    makkahRoomSAR: pkg.baseMakkahRoomSAR || 100,
    madinahRoomSAR: pkg.baseMadinahRoomSAR || 500,
  };

  const makkahRoomSAR = Number(monthRates.makkahRoomSAR) || Number(pkg.baseMakkahRoomSAR) || 0;
  const makkahFoodSAR = Number(pkg.makkahFoodPriceSAR) || Number(pkg.makkahFoodSAR) || 0;

  const madinahRoomSAR = Number(monthRates.madinahRoomSAR) || Number(pkg.baseMadinahRoomSAR) || 0;
  const madinahFoodSAR = Number(pkg.madinahFoodPriceSAR) || Number(pkg.madinahFoodSAR) || 0;

  const numMakkahDays = Number(makkahDays) || 0;
  const numMadinahDays = Number(madinahDays) || 0;

  return occupancies.map(occ => {
    // Mekke kişi başı günlük (Oda payı + Yemek) ve toplam
    const makkahDailySAR = (occ.count > 0 ? (makkahRoomSAR / occ.count) : 0) + makkahFoodSAR;
    const makkahTotalSAR = makkahDailySAR * numMakkahDays;

    // Medine kişi başı günlük (Oda payı + Yemek) ve toplam
    const madinahDailySAR = (occ.count > 0 ? (madinahRoomSAR / occ.count) : 0) + madinahFoodSAR;
    const madinahTotalSAR = madinahDailySAR * numMadinahDays;

    // Toplam Saf Konaklama & Yemek (Kişi Başı)
    const totalHotelSAR = makkahTotalSAR + madinahTotalSAR;
    const totalHotelUSD = totalHotelSAR / sarUsdRate;
    const totalHotelTRY = totalHotelUSD * usdTryRate;
    const totalHotelEUR = totalHotelUSD / eurUsdRate;

    // Mekke ve Medine Detayları (USD)
    const makkahUSD = makkahTotalSAR / sarUsdRate;
    const madinahUSD = madinahTotalSAR / sarUsdRate;

    return {
      occupancy: occ.count,
      label: occ.label,
      desc: occ.desc,
      makkahDays: numMakkahDays,
      madinahDays: numMadinahDays,
      makkahTotalSAR: Math.round(makkahTotalSAR),
      madinahTotalSAR: Math.round(madinahTotalSAR),
      makkahUSD: Math.round(makkahUSD),
      madinahUSD: Math.round(madinahUSD),
      makkahDailySAR: Math.round(makkahDailySAR),
      madinahDailySAR: Math.round(madinahDailySAR),
      priceUSD: Math.round(totalHotelUSD),
      priceTRY: Math.round(totalHotelTRY),
      priceEUR: Math.round(totalHotelEUR),
      priceSAR: Math.round(totalHotelSAR),
      finalPriceUSD: Math.round(totalHotelUSD),
      finalPriceTRY: Math.round(totalHotelTRY),
      finalPriceEUR: Math.round(totalHotelEUR),
      finalPriceSAR: Math.round(totalHotelSAR),
    };
  });
}
