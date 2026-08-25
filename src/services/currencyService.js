// İnzar Turizm - Canlı Döviz Kuru API Servisi
// TCMB & Uluslararası Piyasa Gerçek Zamanlı Kurlar (USD, EUR, SAR, TRY)

export async function fetchLiveExchangeRates() {
  try {
    // Primary High-Availability Live Rate API (Open Exchange Rates / ER-API)
    const response = await fetch('https://open.er-api.com/v6/latest/USD', {
      headers: { 'Accept': 'application/json' }
    });

    if (!response.ok) {
      throw new Error(`Exchange API error: ${response.status}`);
    }

    const data = await response.json();
    const rates = data.rates || {};

    const usdTry = parseFloat(rates.TRY) || 48.08;
    const sarUsd = parseFloat(rates.SAR) || 3.75; // Suudi Riyali sabit peg: 3.75
    const eurPerUsd = parseFloat(rates.EUR) || 0.857;
    const eurUsd = eurPerUsd > 0 ? 1 / eurPerUsd : 1.16;
    const eurTry = usdTry * eurUsd;

    return {
      success: true,
      rates: {
        SAR_USD: parseFloat(sarUsd.toFixed(2)),
        USD_TRY: parseFloat(usdTry.toFixed(2)),
        EUR_TRY: parseFloat(eurTry.toFixed(2)),
        EUR_USD: parseFloat(eurUsd.toFixed(3)),
      },
      lastUpdated: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      source: 'Canlı Piyasa Kurları (Global Forex)'
    };
  } catch (error) {
    console.warn('Primary currency API failed, trying fallback:', error);
    try {
      // Fallback API: Frankfurter
      const fbResp = await fetch('https://api.frankfurter.app/latest?from=USD&to=TRY,EUR');
      const fbData = await fbResp.json();
      const usdTry = parseFloat(fbData.rates?.TRY) || 48.08;
      const eurPerUsd = parseFloat(fbData.rates?.EUR) || 0.857;
      const eurUsd = eurPerUsd > 0 ? 1 / eurPerUsd : 1.16;
      const eurTry = usdTry * eurUsd;

      return {
        success: true,
        rates: {
          SAR_USD: 3.75,
          USD_TRY: parseFloat(usdTry.toFixed(2)),
          EUR_TRY: parseFloat(eurTry.toFixed(2)),
          EUR_USD: parseFloat(eurUsd.toFixed(3)),
        },
        lastUpdated: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        source: 'Frankfurter Canlı Piyasa'
      };
    } catch (fallbackError) {
      console.error('All live currency APIs failed:', fallbackError);
      return {
        success: false,
        error: fallbackError.message
      };
    }
  }
}
