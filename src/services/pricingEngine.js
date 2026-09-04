const MONTH_KEYS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

// Format helper
function addDaysToDateStr(dateStr, days) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

// Belirli bir şehir için gün gün otel oda ve yemek maliyetini hesaplar
function calculateCityStayRates({
  startDateStr,
  nights,
  city, // 'makkah' | 'madinah'
  pkg,
  selectedHotelId = null,
  includeMeals = true,
  selectedMonthFallback = 'nov'
}) {
  const totalNights = Number(nights) || 0;
  if (totalNights <= 0) {
    return {
      avgRoomSAR: 0,
      avgFoodSAR: 0,
      totalRoomSAR: 0,
      totalFoodSAR: 0,
      daysBreakdown: [],
      hasTariff: true,
      unpricedDaysCount: 0,
      missingTariffReason: null
    };
  }

  const hotelList = city === 'makkah' ? (pkg.makkahHotels || []) : (pkg.madinahHotels || []);
  const hotel = (selectedHotelId && hotelList.find(h => h.id === selectedHotelId)) || hotelList[0];

  let totalRoomCost = 0;
  let totalFoodCost = 0;
  let unpricedDaysCount = 0;
  const daysBreakdown = [];

  let curr = startDateStr ? new Date(startDateStr) : null;

  for (let i = 0; i < totalNights; i++) {
    let dayIso = curr ? curr.toISOString().split('T')[0] : '';
    let monthKey = selectedMonthFallback;
    
    if (curr && !isNaN(curr.getTime())) {
      monthKey = MONTH_KEYS[curr.getMonth()] || selectedMonthFallback;
    }

    let dayRoomPrice = 0;
    let dayFoodPrice = 0;
    let isDayPriced = false;

    // 1. Otelin Tarih Aralığı Fiyat Tarifeleri (dateRanges) kontrolü
    if (dayIso && hotel && Array.isArray(hotel.dateRanges) && hotel.dateRanges.length > 0) {
      const matchedRange = hotel.dateRanges.find(r => {
        if (!r.startDate || !r.endDate) return false;
        return dayIso >= r.startDate && dayIso <= r.endDate && Number(r.roomPriceSAR) > 0;
      });

      if (matchedRange) {
        dayRoomPrice = Number(matchedRange.roomPriceSAR) || 0;
        dayFoodPrice = includeMeals ? (Number(matchedRange.foodPriceSAR) || 0) : 0;
        isDayPriced = true;
      }
    }

    // 2. Eğer takvimden tarih seçilmemişse (sadece ay seçimi varsa) monthlyPrices devreye girer
    if (!startDateStr && !isDayPriced) {
      if (hotel?.monthlyPrices?.[monthKey]?.roomSAR) {
        dayRoomPrice = Number(hotel.monthlyPrices[monthKey].roomSAR) || 0;
        isDayPriced = dayRoomPrice > 0;
      } else {
        const mPrice = pkg.monthlyPrices?.[monthKey] || pkg.monthlyPrices?.nov || {};
        dayRoomPrice = city === 'makkah' ? (Number(mPrice.makkahRoomSAR) || 0) : (Number(mPrice.madinahRoomSAR) || 0);
        isDayPriced = dayRoomPrice > 0;
      }

      if (includeMeals && dayFoodPrice === 0) {
        if (hotel?.monthlyPrices?.[monthKey]?.foodSAR) {
          dayFoodPrice = Number(hotel.monthlyPrices[monthKey].foodSAR) || 0;
        } else {
          const mPrice = pkg.monthlyPrices?.[monthKey] || pkg.monthlyPrices?.nov || {};
          const fallbackFood = city === 'makkah' ? 35 : 45;
          dayFoodPrice = Number(mPrice[`${city}FoodSAR`] !== undefined ? mPrice[`${city}FoodSAR`] : (pkg[`${city}FoodPriceSAR`] || pkg[`${city}FoodSAR`] || fallbackFood));
        }
      }
    }

    if (!isDayPriced) {
      unpricedDaysCount++;
    }

    totalRoomCost += dayRoomPrice;
    totalFoodCost += dayFoodPrice;

    daysBreakdown.push({
      date: dayIso,
      dayIndex: i + 1,
      monthKey,
      roomPriceSAR: dayRoomPrice,
      foodPriceSAR: dayFoodPrice,
      isDayPriced
    });

    if (curr) {
      curr.setDate(curr.getDate() + 1);
    }
  }

  const hasTariff = totalNights > 0 && unpricedDaysCount === 0 && totalRoomCost > 0;
  const avgRoomSAR = totalNights > 0 ? (totalRoomCost / totalNights) : 0;
  const avgFoodSAR = totalNights > 0 ? (totalFoodCost / totalNights) : 0;

  return {
    avgRoomSAR,
    avgFoodSAR,
    totalRoomSAR: totalRoomCost,
    totalFoodSAR: totalFoodCost,
    daysBreakdown,
    hasTariff,
    unpricedDaysCount,
    missingTariffReason: !hasTariff ? `${city === 'makkah' ? 'Mekke' : 'Medine'} oteli için Genel Merkez henüz bu tarih aralığında fiyat belirlememiştir.` : null
  };
}

export function calculateQuotation({
  pkg, // Seçili paket objesi
  startDate = '',
  endDate = '',
  routeOrder = 'makkah_first', // 'makkah_first' (Önce Mekke Sonra Medine) | 'madinah_first' (Önce Medine Sonra Mekke)
  selectedMonth = 'nov',
  makkahDays = 7,
  makkahRoomOccupancy = 2, // 1, 2, 3, 4, 5
  madinahDays = 3,
  madinahRoomOccupancy = 2, // 1, 2, 3, 4, 5
  selectedMakkahHotelId = null,
  selectedMadinahHotelId = null,
  includeMeals = true,
  includeMakkahMeals = undefined,
  includeMadinahMeals = undefined,
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

  const isMakkahFoodInc = includeMakkahMeals !== undefined ? Boolean(includeMakkahMeals) : Boolean(includeMeals);
  const isMadinahFoodInc = includeMadinahMeals !== undefined ? Boolean(includeMadinahMeals) : Boolean(includeMeals);

  const sarUsdRate = currencies.SAR_USD || 3.75;
  const usdTryRate = currencies.USD_TRY || 36.50;
  const eurUsdRate = currencies.EUR_USD || 1.08;

  // Paket bazlı kar marjı: applyProfitMargin false ise %0 (karsız), true ise paketin kendi marjı (veya custom)
  const defaultPkgMargin = pkg.profitMargin !== undefined ? pkg.profitMargin : 15;
  const targetMargin = customProfitMargin !== null ? customProfitMargin : defaultPkgMargin;
  const profitMarginPercent = applyProfitMargin ? targetMargin : 0;

  // 1. Seyahat Rota Etap Tarihlerinin Belirlenmesi
  let makkahStartDate = startDate;
  let madinahStartDate = startDate;

  if (routeOrder === 'madinah_first') {
    // 🕌 1. Etap Medine, 2. Etap Mekke
    madinahStartDate = startDate;
    makkahStartDate = startDate && madinahDays > 0 ? addDaysToDateStr(startDate, Number(madinahDays)) : startDate;
  } else {
    // 🕋 1. Etap Mekke, 2. Etap Medine (Varsayılan)
    makkahStartDate = startDate;
    madinahStartDate = startDate && makkahDays > 0 ? addDaysToDateStr(startDate, Number(makkahDays)) : startDate;
  }

  // 2. Günlük Ağırlıklı Dinamik Oda & Yemek Fiyatlarının Hesaplanması
  const makkahStay = calculateCityStayRates({
    startDateStr: makkahStartDate,
    nights: makkahDays,
    city: 'makkah',
    pkg,
    selectedHotelId: selectedMakkahHotelId,
    includeMeals: isMakkahFoodInc,
    selectedMonthFallback: selectedMonth
  });

  const madinahStay = calculateCityStayRates({
    startDateStr: madinahStartDate,
    nights: madinahDays,
    city: 'madinah',
    pkg,
    selectedHotelId: selectedMadinahHotelId,
    includeMeals: isMadinahFoodInc,
    selectedMonthFallback: selectedMonth
  });

  const makkahRoomSAR = makkahStay.avgRoomSAR;
  const makkahFoodSAR = makkahStay.avgFoodSAR;
  const madinahRoomSAR = madinahStay.avgRoomSAR;
  const madinahFoodSAR = madinahStay.avgFoodSAR;

  // 2. Mekke & Medine Konaklama & Yemek
  let makkahTotalSAR = 0;
  let madinahTotalSAR = 0;
  let makkahPerPersonDailyRoomSAR = 0;
  let madinahPerPersonDailyRoomSAR = 0;
  let mixedRoomsSummary = null;
  let mixedRoomsBreakdown = null;

  // Transfer & Sabit giderleri önceden hesaplayalım (her oda tipine ortak eklenecek)
  let transfersTotalSAR = 0;
  const transferBreakdown = [];
  const routeKeys = [
    { id: 'jedMek', label: 'Cidde - Mekke Otel', smallKey: 'jedMekSmall', bigKey: 'jedMekBig' },
    { id: 'mekMed', label: 'Mekke - Medine Transfer', smallKey: 'mekMedSmall', bigKey: 'mekMedBig' },
    { id: 'medAir', label: 'Medine Otel - Havaalanı', smallKey: 'medAirSmall', bigKey: 'medAirBig' },
  ];

  routeKeys.forEach(r => {
    const sel = transfersSelection[r.id] || { vehicleType: 'none', passengerCount: 0 };
    let vehicleName = 'Dahil Değil';
    let vehicleCost = 0;
    let perPersonCost = 0;

    if (sel.vehicleType === 'small') {
      vehicleCost = pkg.transfers?.[r.smallKey] || 0;
      vehicleName = pkg.transfers?.[`${r.id}SmallLabel`] || 'Küçük Araç (Sedan / GMC)';
      perPersonCost = (sel.passengerCount > 0) ? (vehicleCost / sel.passengerCount) : 0;
    } else if (sel.vehicleType === 'big') {
      vehicleCost = pkg.transfers?.[r.bigKey] || 0;
      vehicleName = pkg.transfers?.[`${r.id}BigLabel`] || 'Büyük Araç (HiAce / Otobüs)';
      perPersonCost = (sel.passengerCount > 0) ? (vehicleCost / sel.passengerCount) : 0;
    }

    transfersTotalSAR += perPersonCost;
    transferBreakdown.push({
      routeId: r.id,
      label: r.label,
      vehicleType: sel.vehicleType,
      vehicleName,
      vehicleCost,
      passengerCount: sel.passengerCount,
      perPersonCostSAR: perPersonCost
    });
  });

  // Sabit Giderler & Dahili Hizmetler
  let fixedExpensesTotalSAR = 0;
  const fixedExpensesBreakdown = [];

  const rawFixedList = Array.isArray(pkg.fixedExpensesList) && pkg.fixedExpensesList.length > 0
    ? pkg.fixedExpensesList
    : [
        { id: 'flightTicketSAR', name: 'Uçak Bileti' },
        { id: 'visaTaxSAR', name: 'Vize + Vergi' },
        { id: 'insuranceSAR', name: 'Sigorta' },
        { id: 'bagSAR', name: 'Çanta' },
        { id: 'scarfSAR', name: 'Fular / Eşarp' },
        { id: 'guideSAR', name: 'Rehberlik / Görevli' },
        { id: 'commissionSAR', name: 'Personel Komisyonu' },
        { id: 'bonusSAR', name: 'Prim' },
        { id: 'zamzamSAR', name: '5L Zemzem' },
        { id: 'branchExpenseSAR', name: 'Genel Gider' },
      ];

  rawFixedList.forEach(item => {
    const itemKey = item.id || item.key;
    const itemLabel = item.name || item.label;
    const isInc = !!fixedExpensesIncluded[itemKey];
    const unitCost = item.priceSAR !== undefined ? Number(item.priceSAR) : (pkg.fixedExpenses?.[itemKey] || 0);
    const cost = isInc ? unitCost : 0;
    
    fixedExpensesTotalSAR += cost;
    fixedExpensesBreakdown.push({
      key: itemKey,
      label: itemLabel,
      included: isInc,
      costSAR: cost
    });
  });

  // Ortak Kişi Başı Ek Masraflar (Transfer + Sabitler)
  const sharedExpensesPerPersonSAR = transfersTotalSAR + fixedExpensesTotalSAR;

  // Her oda kapasitesi için net paket fiyatı hesaplayan yardımcı fonksiyon
  const calcRoomTypeFinalUSD = (occupancy) => {
    const mkDailyRoom = occupancy > 0 ? (makkahRoomSAR / occupancy) : 0;
    const mdDailyRoom = occupancy > 0 ? (madinahRoomSAR / occupancy) : 0;
    const mkTotal = (mkDailyRoom + makkahFoodSAR) * makkahDays;
    const mdTotal = (mdDailyRoom + madinahFoodSAR) * madinahDays;
    const totalSAR = mkTotal + mdTotal + sharedExpensesPerPersonSAR;
    const baseUSD = totalSAR / sarUsdRate;
    const profitUSD = baseUSD * (profitMarginPercent / 100);
    const beforeDiscount = baseUSD + profitUSD;
    return Math.round(Math.max(0, beforeDiscount - (customDiscountUSD || 0)));
  };

  let grandTotalCostSAR = 0;
  let finalPriceUSD = 0;
  let groupGrandTotalUSD = 0;

  if (isMixedRoomMode) {
    const singleCount = Number(mixedRooms.single) || 0;
    const doubleCount = Number(mixedRooms.double) || 0;
    const tripleCount = Number(mixedRooms.triple) || 0;
    const quadCount = Number(mixedRooms.quad) || 0;

    const totalMixedPax = (singleCount * 1) + (doubleCount * 2) + (tripleCount * 3) + (quadCount * 4);
    const totalMixedRooms = singleCount + doubleCount + tripleCount + quadCount;
    const effectivePax = totalMixedPax > 0 ? totalMixedPax : 1;

    // Her oda tipi için ayrı kişi başı net teklif fiyatı
    const singlePriceUSD = calcRoomTypeFinalUSD(1);
    const doublePriceUSD = calcRoomTypeFinalUSD(2);
    const triplePriceUSD = calcRoomTypeFinalUSD(3);
    const quadPriceUSD = calcRoomTypeFinalUSD(4);

    mixedRoomsBreakdown = {
      single: {
        count: singleCount,
        pax: singleCount * 1,
        priceUSD: singlePriceUSD,
        priceTRY: Math.round(singlePriceUSD * usdTryRate),
        priceSAR: Math.round(singlePriceUSD * sarUsdRate),
        priceEUR: Math.round(singlePriceUSD / eurUsdRate),
        subtotalUSD: singleCount * 1 * singlePriceUSD,
      },
      double: {
        count: doubleCount,
        pax: doubleCount * 2,
        priceUSD: doublePriceUSD,
        priceTRY: Math.round(doublePriceUSD * usdTryRate),
        priceSAR: Math.round(doublePriceUSD * sarUsdRate),
        priceEUR: Math.round(doublePriceUSD / eurUsdRate),
        subtotalUSD: doubleCount * 2 * doublePriceUSD,
      },
      triple: {
        count: tripleCount,
        pax: tripleCount * 3,
        priceUSD: triplePriceUSD,
        priceTRY: Math.round(triplePriceUSD * usdTryRate),
        priceSAR: Math.round(triplePriceUSD * sarUsdRate),
        priceEUR: Math.round(triplePriceUSD / eurUsdRate),
        subtotalUSD: tripleCount * 3 * triplePriceUSD,
      },
      quad: {
        count: quadCount,
        pax: quadCount * 4,
        priceUSD: quadPriceUSD,
        priceTRY: Math.round(quadPriceUSD * usdTryRate),
        priceSAR: Math.round(quadPriceUSD * sarUsdRate),
        priceEUR: Math.round(quadPriceUSD / eurUsdRate),
        subtotalUSD: quadCount * 4 * quadPriceUSD,
      },
    };

    groupGrandTotalUSD = 
      mixedRoomsBreakdown.single.subtotalUSD + 
      mixedRoomsBreakdown.double.subtotalUSD + 
      mixedRoomsBreakdown.triple.subtotalUSD + 
      mixedRoomsBreakdown.quad.subtotalUSD;

    // Ortalama Kişi Başı (Bilgi amaçlı)
    finalPriceUSD = totalMixedPax > 0 ? Math.round(groupGrandTotalUSD / effectivePax) : doublePriceUSD;

    // Maliyet havuzu
    const makkahGroupSingle = singleCount * (makkahRoomSAR + (1 * makkahFoodSAR)) * makkahDays;
    const makkahGroupDouble = doubleCount * (makkahRoomSAR + (2 * makkahFoodSAR)) * makkahDays;
    const makkahGroupTriple = tripleCount * (makkahRoomSAR + (3 * makkahFoodSAR)) * makkahDays;
    const makkahGroupQuad = quadCount * (makkahRoomSAR + (4 * makkahFoodSAR)) * makkahDays;
    const makkahGroupTotal = makkahGroupSingle + makkahGroupDouble + makkahGroupTriple + makkahGroupQuad;
    makkahTotalSAR = totalMixedPax > 0 ? (makkahGroupTotal / effectivePax) : 0;
    makkahPerPersonDailyRoomSAR = makkahDays > 0 ? ((makkahTotalSAR / makkahDays) - makkahFoodSAR) : 0;

    const madinahGroupSingle = singleCount * (madinahRoomSAR + (1 * madinahFoodSAR)) * madinahDays;
    const madinahGroupDouble = doubleCount * (madinahRoomSAR + (2 * madinahFoodSAR)) * madinahDays;
    const madinahGroupTriple = tripleCount * (madinahRoomSAR + (3 * madinahFoodSAR)) * madinahDays;
    const madinahGroupQuad = quadCount * (madinahRoomSAR + (4 * madinahFoodSAR)) * madinahDays;
    const madinahGroupTotal = madinahGroupSingle + madinahGroupDouble + madinahGroupTriple + madinahGroupQuad;
    madinahTotalSAR = totalMixedPax > 0 ? (madinahGroupTotal / effectivePax) : 0;
    madinahPerPersonDailyRoomSAR = madinahDays > 0 ? ((madinahTotalSAR / madinahDays) - madinahFoodSAR) : 0;

    grandTotalCostSAR = makkahTotalSAR + madinahTotalSAR + sharedExpensesPerPersonSAR;

    mixedRoomsSummary = {
      totalRooms: totalMixedRooms,
      totalPax: totalMixedPax,
      singleRooms: singleCount,
      doubleRooms: doubleCount,
      tripleRooms: tripleCount,
      quadRooms: quadCount,
      groupGrandTotalUSD,
      groupGrandTotalTRY: Math.round(groupGrandTotalUSD * usdTryRate),
      groupGrandTotalSAR: Math.round(groupGrandTotalUSD * sarUsdRate),
      groupGrandTotalEUR: Math.round(groupGrandTotalUSD / eurUsdRate),
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

    grandTotalCostSAR = makkahTotalSAR + madinahTotalSAR + sharedExpensesPerPersonSAR;
    const baseCostUSD = grandTotalCostSAR / sarUsdRate;
    const profitMarginAmountUSD = baseCostUSD * (profitMarginPercent / 100);
    const priceBeforeDiscountUSD = baseCostUSD + profitMarginAmountUSD;
    finalPriceUSD = Math.round(Math.max(0, priceBeforeDiscountUSD - (customDiscountUSD || 0)));
  }

  const baseCostUSD = grandTotalCostSAR / sarUsdRate;
  const profitMarginAmountUSD = baseCostUSD * (profitMarginPercent / 100);

  // 8. Diğer Para Birimleri
  const finalPriceTRY = (finalPriceUSD || 0) * usdTryRate;
  const finalPriceEUR = (finalPriceUSD || 0) / eurUsdRate;
  const finalPriceSAR = (finalPriceUSD || 0) * sarUsdRate;
  const isMakkahUnpriced = Number(makkahDays) > 0 && !makkahStay.hasTariff;
  const isMadinahUnpriced = Number(madinahDays) > 0 && !madinahStay.hasTariff;
  const hasValidTariff = !isMakkahUnpriced && !isMadinahUnpriced;

  let tariffWarning = null;
  if (!hasValidTariff) {
    if (isMakkahUnpriced && isMadinahUnpriced) {
      tariffWarning = 'Genel Merkez bu tarih aralığı için henüz Mekke ve Medine otel fiyat tarifesi belirlememiştir.';
    } else if (isMakkahUnpriced) {
      tariffWarning = 'Genel Merkez bu tarih aralığı için henüz Mekke otel fiyat tarifesi belirlememiştir.';
    } else {
      tariffWarning = 'Genel Merkez bu tarih aralığı için henüz Medine otel fiyat tarifesi belirlememiştir.';
    }
  }

  return {
    packageId: pkg.id,
    packageName: pkg.name,
    packageProfitMargin: defaultPkgMargin,
    applyProfitMargin,
    hasValidTariff,
    isUnpriced: !hasValidTariff,
    tariffWarning,
    startDate,
    endDate,
    routeOrder,
    makkahStartDate,
    madinahStartDate,
    makkahStay,
    madinahStay,
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
    mixedRoomsBreakdown,
    currenciesUsed: { ...currencies },
    timestamp: new Date().toISOString()
  };
}

// 2'li, 3'lü, 4'lü, 1'li Saf Konaklama & Yemek Karşılaştırma Matrisi (Detaylı Matematiksel Formüllü)
export function generateRoomMatrix(
  pkg,
  selectedMonth = 'nov',
  makkahDays = 7,
  madinahDays = 3,
  currencies = { SAR_USD: 3.75, USD_TRY: 36.50, EUR_USD: 1.08 },
  startDate = '',
  routeOrder = 'makkah_first',
  selectedMakkahHotelId = null,
  selectedMadinahHotelId = null,
  includeMeals = true,
  includeMakkahMeals = undefined,
  includeMadinahMeals = undefined
) {
  const occupancies = [
    { count: 1, label: 'Tek Kişilik Oda', desc: 'Özel Tek Kişilik Oda' },
    { count: 2, label: '2 Kişilik Oda', desc: 'Eşler veya 2 Kişi' },
    { count: 3, label: '3 Kişilik Oda', desc: '3 Kişilik Paylaşımlı' },
    { count: 4, label: '4 Kişilik Oda', desc: '4 Kişilik Aile / Grup' }
  ];

  if (!pkg) return [];

  const isMakkahFoodInc = includeMakkahMeals !== undefined ? Boolean(includeMakkahMeals) : Boolean(includeMeals);
  const isMadinahFoodInc = includeMadinahMeals !== undefined ? Boolean(includeMadinahMeals) : Boolean(includeMeals);

  const sarUsdRate = currencies?.SAR_USD || 3.75;
  const usdTryRate = currencies?.USD_TRY || 36.50;
  const eurUsdRate = currencies?.EUR_USD || 1.08;

  let makkahStartDate = startDate;
  let madinahStartDate = startDate;

  if (routeOrder === 'madinah_first') {
    madinahStartDate = startDate;
    makkahStartDate = startDate && madinahDays > 0 ? addDaysToDateStr(startDate, Number(madinahDays)) : startDate;
  } else {
    makkahStartDate = startDate;
    madinahStartDate = startDate && makkahDays > 0 ? addDaysToDateStr(startDate, Number(makkahDays)) : startDate;
  }

  const makkahStay = calculateCityStayRates({
    startDateStr: makkahStartDate,
    nights: makkahDays,
    city: 'makkah',
    pkg,
    selectedHotelId: selectedMakkahHotelId,
    includeMeals: isMakkahFoodInc,
    selectedMonthFallback: selectedMonth
  });

  const madinahStay = calculateCityStayRates({
    startDateStr: madinahStartDate,
    nights: madinahDays,
    city: 'madinah',
    pkg,
    selectedHotelId: selectedMadinahHotelId,
    includeMeals: isMadinahFoodInc,
    selectedMonthFallback: selectedMonth
  });

  const makkahRoomSAR = makkahStay.avgRoomSAR;
  const makkahFoodSAR = makkahStay.avgFoodSAR;
  const madinahRoomSAR = madinahStay.avgRoomSAR;
  const madinahFoodSAR = madinahStay.avgFoodSAR;

  const numMakkahDays = Number(makkahDays) || 0;
  const numMadinahDays = Number(madinahDays) || 0;

  return occupancies.map(occ => {
    // Mekke kişi başı günlük oda payı, yemek ve toplam
    const makkahDailyRoomPerPax = occ.count > 0 ? (makkahRoomSAR / occ.count) : 0;
    const makkahDailyTotalSAR = makkahDailyRoomPerPax + makkahFoodSAR;
    const makkahRoomTotalPerPax = makkahDailyRoomPerPax * numMakkahDays;
    const makkahFoodTotalPerPax = makkahFoodSAR * numMakkahDays;
    const makkahTotalSAR = makkahDailyTotalSAR * numMakkahDays;

    // Medine kişi başı günlük oda payı, yemek ve toplam
    const madinahDailyRoomPerPax = occ.count > 0 ? (madinahRoomSAR / occ.count) : 0;
    const madinahDailyTotalSAR = madinahDailyRoomPerPax + madinahFoodSAR;
    const madinahRoomTotalPerPax = madinahDailyRoomPerPax * numMadinahDays;
    const madinahFoodTotalPerPax = madinahFoodSAR * numMadinahDays;
    const madinahTotalSAR = madinahDailyTotalSAR * numMadinahDays;

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
      // Mekke ayrıntıları
      makkahRoomSAR,
      makkahDailyRoomPerPax: Math.round(makkahDailyRoomPerPax),
      makkahFoodSAR,
      makkahRoomTotalPerPax: Math.round(makkahRoomTotalPerPax),
      makkahFoodTotalPerPax: Math.round(makkahFoodTotalPerPax),
      makkahTotalSAR: Math.round(makkahTotalSAR),
      makkahUSD: Math.round(makkahUSD),
      // Medine ayrıntıları
      madinahRoomSAR,
      madinahDailyRoomPerPax: Math.round(madinahDailyRoomPerPax),
      madinahFoodSAR,
      madinahRoomTotalPerPax: Math.round(madinahRoomTotalPerPax),
      madinahFoodTotalPerPax: Math.round(madinahFoodTotalPerPax),
      madinahTotalSAR: Math.round(madinahTotalSAR),
      madinahUSD: Math.round(madinahUSD),
      // Toplamlar
      hasTariff: makkahStay.hasTariff && madinahStay.hasTariff,
      isUnpriced: !makkahStay.hasTariff || !madinahStay.hasTariff,
      totalHotelSAR: Math.round(totalHotelSAR),
      totalHotelUSD: Math.round(totalHotelUSD),
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
