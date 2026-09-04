// İnzar Turizm Master Veri Modeli
// Aylık Sezonluk Otel Fiyat Matrisi, Personel Hesapları ve Döviz Kurları (Takvimsel Sıralı: Ocak - Aralık)

export const DEFAULT_MONTHS = [
  { id: 'jan', name: 'Ocak', label: 'Ocak', subtitle: 'Sömestr', isPeak: true, badge: 'Sömestr' },
  { id: 'feb', name: 'Şubat', label: 'Şubat', subtitle: 'Standart', isPeak: false, badge: null },
  { id: 'mar', name: 'Mart', label: 'Mart', subtitle: 'Standart', isPeak: false, badge: null },
  { id: 'apr', name: 'Nisan', label: 'Nisan', subtitle: 'Ramazan Özel', isPeak: true, badge: 'Ramazan Özel' },
  { id: 'may', name: 'Mayıs', label: 'Mayıs', subtitle: 'Şevval', isPeak: false, badge: 'Şevval' },
  { id: 'jun', name: 'Haziran', label: 'Haziran', subtitle: 'Standart', isPeak: false, badge: null },
  { id: 'jul', name: 'Temmuz', label: 'Temmuz', subtitle: 'Standart', isPeak: false, badge: null },
  { id: 'aug', name: 'Ağustos', label: 'Ağustos', subtitle: 'Standart', isPeak: false, badge: null },
  { id: 'sep', name: 'Eylül', label: 'Eylül', subtitle: 'Standart', isPeak: false, badge: null },
  { id: 'oct', name: 'Ekim', label: 'Ekim', subtitle: 'Standart', isPeak: false, badge: null },
  { id: 'nov', name: 'Kasım', label: 'Kasım', subtitle: 'Standart', isPeak: false, badge: null },
  { id: 'dec', name: 'Aralık', label: 'Aralık', subtitle: 'Standart', isPeak: false, badge: null },
];

export const MONTHS_LIST = DEFAULT_MONTHS;

export const DEFAULT_CURRENCIES = {
  SAR_USD: 3.75, // 1 USD = 3.75 SAR (Sabit Suudi Kuru)
  USD_TRY: 36.50, // Güncel USD/TL
  EUR_TRY: 39.80, // Güncel EUR/TL
  EUR_USD: 1.08,  // EUR/USD
};

export const DEFAULT_PACKAGES = [
  {
    id: 'ekonomik',
    name: 'Ekonomik Paket',
    code: 'EKO',
    profitMargin: 15, // Pakete Özel Kar Oranı (%)
    description: 'Bütçe dostu, kaliteli servis ve servisle Harem/Mescid-i Nebevi ulaşımı.',
    hotelMakkah: 'Elaf Bakkah / Dar Al Eiman Al Khalil (Servisli)',
    hotelMadinah: 'Al Eiman Taibah / Maden Hotel (350m)',
    distanceMakkah: '1200m (24 Saat Ücretsiz Ring Servis)',
    distanceMadinah: '350m (Yürüme Mesafesi)',
    mealMakkah: 'Sabah & Akşam Tabldot (Türk Mutfağı)',
    mealMadinah: 'Sabah & Akşam Tabldot (Türk Mutfağı)',
    isFeatured: false,
    color: '#0284c7', // Sky Blue
    badge: 'Ekonomik Tercih',
    makkahFoodPriceSAR: 35,
    madinahFoodPriceSAR: 45,
    makkahHotels: [
      {
        id: 'eko_makkah_1',
        name: 'Elaf Bakkah / Dar Al Eiman Al Khalil',
        distance: '1200m (24 Saat Ücretsiz Ring Servis)',
        mealType: 'Sabah & Akşam Tabldot (Türk Mutfağı)',
        foodPriceSAR: 35,
        monthlyPrices: {
          jan: { roomSAR: 85, foodSAR: 35 },
          feb: { roomSAR: 65, foodSAR: 35 },
          mar: { roomSAR: 75, foodSAR: 35 },
          apr: { roomSAR: 180, foodSAR: 35 },
          may: { roomSAR: 70, foodSAR: 35 },
          jun: { roomSAR: 50, foodSAR: 35 },
          jul: { roomSAR: 50, foodSAR: 35 },
          aug: { roomSAR: 50, foodSAR: 35 },
          sep: { roomSAR: 55, foodSAR: 35 },
          oct: { roomSAR: 50, foodSAR: 35 },
          nov: { roomSAR: 55, foodSAR: 35 },
          dec: { roomSAR: 60, foodSAR: 35 },
        }
      }
    ],
    madinahHotels: [
      {
        id: 'eko_madinah_1',
        name: 'Al Eiman Taibah / Maden Hotel',
        distance: '350m (Yürüme Mesafesi)',
        mealType: 'Sabah & Akşam Tabldot (Türk Mutfağı)',
        foodPriceSAR: 45,
        monthlyPrices: {
          jan: { roomSAR: 500, foodSAR: 45 },
          feb: { roomSAR: 430, foodSAR: 45 },
          mar: { roomSAR: 450, foodSAR: 45 },
          apr: { roomSAR: 750, foodSAR: 45 },
          may: { roomSAR: 420, foodSAR: 45 },
          jun: { roomSAR: 380, foodSAR: 45 },
          jul: { roomSAR: 380, foodSAR: 45 },
          aug: { roomSAR: 380, foodSAR: 45 },
          sep: { roomSAR: 390, foodSAR: 45 },
          oct: { roomSAR: 380, foodSAR: 45 },
          nov: { roomSAR: 400, foodSAR: 45 },
          dec: { roomSAR: 420, foodSAR: 45 },
        }
      }
    ],
    // 12 Ayın Takvimsel Otel Fiyatları (Ocak -> Aralık) - Geriye dönük uyumluluk
    monthlyPrices: {
      jan: { makkahRoomSAR: 85, madinahRoomSAR: 500, makkahFoodSAR: 35, madinahFoodSAR: 45 },
      feb: { makkahRoomSAR: 65, madinahRoomSAR: 430, makkahFoodSAR: 35, madinahFoodSAR: 45 },
      mar: { makkahRoomSAR: 75, madinahRoomSAR: 450, makkahFoodSAR: 35, madinahFoodSAR: 45 },
      apr: { makkahRoomSAR: 180, madinahRoomSAR: 750, makkahFoodSAR: 35, madinahFoodSAR: 45 },
      may: { makkahRoomSAR: 70, madinahRoomSAR: 420, makkahFoodSAR: 35, madinahFoodSAR: 45 },
      jun: { makkahRoomSAR: 50, madinahRoomSAR: 380, makkahFoodSAR: 35, madinahFoodSAR: 45 },
      jul: { makkahRoomSAR: 50, madinahRoomSAR: 380, makkahFoodSAR: 35, madinahFoodSAR: 45 },
      aug: { makkahRoomSAR: 50, madinahRoomSAR: 380, makkahFoodSAR: 35, madinahFoodSAR: 45 },
      sep: { makkahRoomSAR: 55, madinahRoomSAR: 390, makkahFoodSAR: 35, madinahFoodSAR: 45 },
      oct: { makkahRoomSAR: 50, madinahRoomSAR: 380, makkahFoodSAR: 35, madinahFoodSAR: 45 },
      nov: { makkahRoomSAR: 55, madinahRoomSAR: 400, makkahFoodSAR: 35, madinahFoodSAR: 45 },
      dec: { makkahRoomSAR: 60, madinahRoomSAR: 420, makkahFoodSAR: 35, madinahFoodSAR: 45 },
    },
    transfers: {
      jedMekSmall: 200,
      mekMedSmall: 500,
      medAirSmall: 100,
      jedMekBig: 800,
      mekMedBig: 800,
      medAirBig: 800,
    },
    fixedExpenses: {
      flightTicketSAR: 1500,
      visaTaxSAR: 500,
      insuranceSAR: 125,
      bagSAR: 25,
      scarfSAR: 15,
      guideSAR: 45,
      commissionSAR: 50,
      bonusSAR: 25,
      zamzamSAR: 125,
      branchExpenseSAR: 0,
    }
  },
  {
    id: 'standart',
    name: 'Standart Paket',
    code: 'STD',
    profitMargin: 20, // Pakete Özel Kar Oranı (%)
    description: 'Merkezi konum, yürüme mesafesinde oteller ve zengin açık büfe menü.',
    hotelMakkah: 'Mövenpick Hajar Tower / Anjum Makkah',
    hotelMadinah: 'Rove Al Madinah / Leader Al Muna',
    distanceMakkah: '0-250m (Harem Avlusu)',
    distanceMadinah: '150m (Mescid-i Nebevi Karşısı)',
    mealMakkah: 'Sabah & Akşam Açık Büfe',
    mealMadinah: 'Sabah & Akşam Açık Büfe',
    isFeatured: true,
    color: '#059669', // Emerald
    badge: 'En Çok Tercih Edilen',
    makkahFoodPriceSAR: 40,
    madinahFoodPriceSAR: 45,
    makkahHotels: [
      {
        id: 'std_makkah_1',
        name: 'Mövenpick Hajar Tower / Anjum Makkah',
        distance: '0-250m (Harem Avlusu)',
        mealType: 'Sabah & Akşam Açık Büfe',
        foodPriceSAR: 40,
        monthlyPrices: {
          jan: { roomSAR: 160, foodSAR: 40 },
          feb: { roomSAR: 115, foodSAR: 40 },
          mar: { roomSAR: 135, foodSAR: 40 },
          apr: { roomSAR: 320, foodSAR: 40 },
          may: { roomSAR: 120, foodSAR: 40 },
          jun: { roomSAR: 95, foodSAR: 40 },
          jul: { roomSAR: 95, foodSAR: 40 },
          aug: { roomSAR: 95, foodSAR: 40 },
          sep: { roomSAR: 100, foodSAR: 40 },
          oct: { roomSAR: 90, foodSAR: 40 },
          nov: { roomSAR: 100, foodSAR: 40 },
          dec: { roomSAR: 110, foodSAR: 40 },
        }
      }
    ],
    madinahHotels: [
      {
        id: 'std_madinah_1',
        name: 'Rove Al Madinah / Leader Al Muna',
        distance: '150m (Mescid-i Nebevi Karşısı)',
        mealType: 'Sabah & Akşam Açık Büfe',
        foodPriceSAR: 45,
        monthlyPrices: {
          jan: { roomSAR: 650, foodSAR: 45 },
          feb: { roomSAR: 530, foodSAR: 45 },
          mar: { roomSAR: 580, foodSAR: 45 },
          apr: { roomSAR: 950, foodSAR: 45 },
          may: { roomSAR: 520, foodSAR: 45 },
          jun: { roomSAR: 480, foodSAR: 45 },
          jul: { roomSAR: 480, foodSAR: 45 },
          aug: { roomSAR: 480, foodSAR: 45 },
          sep: { roomSAR: 490, foodSAR: 45 },
          oct: { roomSAR: 480, foodSAR: 45 },
          nov: { roomSAR: 500, foodSAR: 45 },
          dec: { roomSAR: 520, foodSAR: 45 },
        }
      }
    ],
    monthlyPrices: {
      jan: { makkahRoomSAR: 160, madinahRoomSAR: 650, makkahFoodSAR: 40, madinahFoodSAR: 45 },
      feb: { makkahRoomSAR: 115, madinahRoomSAR: 530, makkahFoodSAR: 40, madinahFoodSAR: 45 },
      mar: { makkahRoomSAR: 135, madinahRoomSAR: 580, makkahFoodSAR: 40, madinahFoodSAR: 45 },
      apr: { makkahRoomSAR: 320, madinahRoomSAR: 950, makkahFoodSAR: 40, madinahFoodSAR: 45 },
      may: { makkahRoomSAR: 120, madinahRoomSAR: 520, makkahFoodSAR: 40, madinahFoodSAR: 45 },
      jun: { makkahRoomSAR: 95, madinahRoomSAR: 480, makkahFoodSAR: 40, madinahFoodSAR: 45 },
      jul: { makkahRoomSAR: 95, madinahRoomSAR: 480, makkahFoodSAR: 40, madinahFoodSAR: 45 },
      aug: { makkahRoomSAR: 95, madinahRoomSAR: 480, makkahFoodSAR: 40, madinahFoodSAR: 45 },
      sep: { makkahRoomSAR: 100, madinahRoomSAR: 490, makkahFoodSAR: 40, madinahFoodSAR: 45 },
      oct: { makkahRoomSAR: 90, madinahRoomSAR: 480, makkahFoodSAR: 40, madinahFoodSAR: 45 },
      nov: { makkahRoomSAR: 100, madinahRoomSAR: 500, makkahFoodSAR: 40, madinahFoodSAR: 45 },
      dec: { makkahRoomSAR: 110, madinahRoomSAR: 520, makkahFoodSAR: 40, madinahFoodSAR: 45 },
    },
    transfers: {
      jedMekSmall: 200,
      mekMedSmall: 500,
      medAirSmall: 100,
      jedMekBig: 800,
      mekMedBig: 800,
      medAirBig: 800,
    },
    fixedExpenses: {
      flightTicketSAR: 1500,
      visaTaxSAR: 500,
      insuranceSAR: 125,
      bagSAR: 25,
      scarfSAR: 15,
      guideSAR: 45,
      commissionSAR: 50,
      bonusSAR: 25,
      zamzamSAR: 125,
      branchExpenseSAR: 0,
    }
  },
  {
    id: 'luxe',
    name: 'Lüxe / VIP Paket',
    code: 'LUX',
    profitMargin: 25, // Pakete Özel Kar Oranı (%)
    description: '5 Yıldızlı Saat Kulesi ve Harem manzaralı oteller, VIP özel transferler.',
    hotelMakkah: 'Fairmont Makkah Clock Royal Tower / Raffles',
    hotelMadinah: 'Oberoi Madinah / Dar Al Taqwa',
    distanceMakkah: '0m (Saat Kulesi Doğrudan Avlu)',
    distanceMadinah: '0m (Mescid Avlusunda)',
    mealMakkah: 'Sabah & Akşam Lüks Açık Büfe',
    mealMadinah: 'Sabah & Akşam Lüks Açık Büfe',
    isFeatured: false,
    color: '#d97706', // Gold / Amber
    badge: 'VIP & Ultra Lüks',
    makkahFoodPriceSAR: 75,
    madinahFoodPriceSAR: 75,
    makkahHotels: [
      {
        id: 'lux_makkah_1',
        name: 'Fairmont Makkah Clock Royal Tower / Raffles',
        distance: '0m (Saat Kulesi Doğrudan Avlu)',
        mealType: 'Sabah & Akşam Lüks Açık Büfe',
        foodPriceSAR: 75,
        monthlyPrices: {
          jan: { roomSAR: 1200, foodSAR: 75 },
          feb: { roomSAR: 900, foodSAR: 75 },
          mar: { roomSAR: 1050, foodSAR: 75 },
          apr: { roomSAR: 2200, foodSAR: 75 },
          may: { roomSAR: 950, foodSAR: 75 },
          jun: { roomSAR: 800, foodSAR: 75 },
          jul: { roomSAR: 800, foodSAR: 75 },
          aug: { roomSAR: 800, foodSAR: 75 },
          sep: { roomSAR: 850, foodSAR: 75 },
          oct: { roomSAR: 800, foodSAR: 75 },
          nov: { roomSAR: 850, foodSAR: 75 },
          dec: { roomSAR: 900, foodSAR: 75 },
        }
      }
    ],
    madinahHotels: [
      {
        id: 'lux_madinah_1',
        name: 'Oberoi Madinah / Dar Al Taqwa',
        distance: '0m (Mescid Avlusunda)',
        mealType: 'Sabah & Akşam Lüks Açık Büfe',
        foodPriceSAR: 75,
        monthlyPrices: {
          jan: { roomSAR: 1150, foodSAR: 75 },
          feb: { roomSAR: 880, foodSAR: 75 },
          mar: { roomSAR: 980, foodSAR: 75 },
          apr: { roomSAR: 1850, foodSAR: 75 },
          may: { roomSAR: 900, foodSAR: 75 },
          jun: { roomSAR: 800, foodSAR: 75 },
          jul: { roomSAR: 800, foodSAR: 75 },
          aug: { roomSAR: 800, foodSAR: 75 },
          sep: { roomSAR: 820, foodSAR: 75 },
          oct: { roomSAR: 800, foodSAR: 75 },
          nov: { roomSAR: 850, foodSAR: 75 },
          dec: { roomSAR: 900, foodSAR: 75 },
        }
      }
    ],
    monthlyPrices: {
      jan: { makkahRoomSAR: 1200, madinahRoomSAR: 1150, makkahFoodSAR: 75, madinahFoodSAR: 75 },
      feb: { makkahRoomSAR: 900, madinahRoomSAR: 880, makkahFoodSAR: 75, madinahFoodSAR: 75 },
      mar: { makkahRoomSAR: 1050, madinahRoomSAR: 980, makkahFoodSAR: 75, madinahFoodSAR: 75 },
      apr: { makkahRoomSAR: 2200, madinahRoomSAR: 1850, makkahFoodSAR: 75, madinahFoodSAR: 75 },
      may: { makkahRoomSAR: 950, madinahRoomSAR: 900, makkahFoodSAR: 75, madinahFoodSAR: 75 },
      jun: { makkahRoomSAR: 800, madinahRoomSAR: 800, makkahFoodSAR: 75, madinahFoodSAR: 75 },
      jul: { makkahRoomSAR: 800, madinahRoomSAR: 800, makkahFoodSAR: 75, madinahFoodSAR: 75 },
      aug: { makkahRoomSAR: 800, madinahRoomSAR: 800, makkahFoodSAR: 75, madinahFoodSAR: 75 },
      sep: { makkahRoomSAR: 850, madinahRoomSAR: 820, makkahFoodSAR: 75, madinahFoodSAR: 75 },
      oct: { makkahRoomSAR: 800, madinahRoomSAR: 800, makkahFoodSAR: 75, madinahFoodSAR: 75 },
      nov: { makkahRoomSAR: 850, madinahRoomSAR: 850, makkahFoodSAR: 75, madinahFoodSAR: 75 },
      dec: { makkahRoomSAR: 900, madinahRoomSAR: 900, makkahFoodSAR: 75, madinahFoodSAR: 75 },
    },
    transfers: {
      jedMekSmall: 300,
      mekMedSmall: 600,
      medAirSmall: 200,
      jedMekBig: 800,
      mekMedBig: 800,
      medAirBig: 800,
    },
    fixedExpenses: {
      flightTicketSAR: 1500,
      visaTaxSAR: 500,
      insuranceSAR: 125,
      bagSAR: 25,
      scarfSAR: 15,
      guideSAR: 45,
      commissionSAR: 50,
      bonusSAR: 25,
      zamzamSAR: 125,
      branchExpenseSAR: 0,
    }
  }
];

export const FIXED_EXPENSE_ITEMS = [
  { key: 'flightTicketSAR', label: 'Uçak Bileti', defaultInclude: true, icon: 'Plane', description: 'Gidiş-Dönüş Tarifeli/Charter Uçak Bileti' },
  { key: 'visaTaxSAR', label: 'Vize + Vergi Harçları', defaultInclude: true, icon: 'FileCheck', description: 'Suudi Arabistan Elektronik Umre Vizesi ve Belediye Vergileri' },
  { key: 'insuranceSAR', label: 'Seyahat Sağlık Sigortası', defaultInclude: true, icon: 'ShieldCheck', description: 'Kapsamlı Umre Sağlık ve Kaza Sigortası' },
  { key: 'bagSAR', label: 'Seyahat Çantası', defaultInclude: true, icon: 'Layers', description: 'İnzar Turizm Baskılı Kaliteli Valiz & Omuz Çantası' },
  { key: 'scarfSAR', label: 'Başörtüsü / İhram', defaultInclude: true, icon: 'Award', description: 'Bayanlar için Şal/Başörtüsü veya Erkekler için İhram' },
  { key: 'guideSAR', label: 'Rehberlik & Hoca Hizmeti', defaultInclude: true, icon: 'Coins', description: 'Mekke & Medine Dini Rehberlik ve Ziyaret Programları' },
  { key: 'commissionSAR', label: 'Temsilci / Acente Komisyonu', defaultInclude: false, icon: 'TrendingUp', description: 'Satışı Yapan Acenteye / Şubeye Ayrılan Prim' },
  { key: 'bonusSAR', label: 'Personel Prim Havuzu', defaultInclude: false, icon: 'Sparkles', description: 'Operasyon ve Satış Ekibi Başarı Primi' },
  { key: 'zamzamSAR', label: 'Zemzem Suyu (5 Litre)', defaultInclude: true, icon: 'Coins', description: 'Cidde/Medine Havalimanı Teslim 5L Orijinal Zemzem' },
  { key: 'branchExpenseSAR', label: 'Şube / Bölge Ekstra Gideri', defaultInclude: false, icon: 'DollarSign', description: 'İlave Transfer veya Şube Özel Harcamaları' },
];

export const TRANSFER_ROUTES = [
  { id: 'jedMek', label: 'Cidde Havalimanı ➔ Mekke Otel', defaultIncluded: true },
  { id: 'mekMed', label: 'Mekke Otel ➔ Medine Otel (Hızlı Tren / Otobüs)', defaultIncluded: true },
  { id: 'medAir', label: 'Medine Otel ➔ Medine Havalimanı', defaultIncluded: true },
];

export const DEFAULT_USERS = [
  { 
    id: 'a0000000-0000-0000-0000-000000000001', 
    username: 'merkez', 
    password: 'Inzar2026!', 
    name: 'Genel Merkez Yöneticisi', 
    role: 'ADMIN', 
    city: 'İstanbul', 
    branch: 'Genel Merkez',
    phone: '+90 212 555 0100',
    avatar: '',
    isActive: true,
    lastLogin: new Date().toISOString()
  },
  { 
    id: 'a0000000-0000-0000-0000-000000000002', 
    username: 'mustafakilic', 
    password: 'Mustafa123!', 
    name: 'Mustafa Kılıç', 
    role: 'ADMIN', 
    city: 'İstanbul', 
    branch: 'Genel Merkez',
    phone: '+90 532 100 2030',
    avatar: '',
    isActive: true,
    lastLogin: new Date().toISOString()
  },
  { 
    id: 'a0000000-0000-0000-0000-000000000009', 
    username: 'merkez_yardimcisi', 
    password: 'Inzar2026!', 
    name: 'Genel Merkez Yardımcısı', 
    role: 'HQ_ASSISTANT', 
    city: 'İstanbul', 
    branch: 'Genel Merkez',
    phone: '+90 212 555 0105',
    avatar: '',
    isActive: true,
    lastLogin: new Date().toISOString()
  },
  { 
    id: 'a0000000-0000-0000-0000-000000000003', 
    username: 'huseyin', 
    password: 'Huseyin123!', 
    name: 'M.Hüseyin AKBALIK', 
    role: 'STAFF', 
    city: 'Gaziantep', 
    branch: 'Gaziantep Şubesi',
    phone: '+90 555 234 5678',
    avatar: '',
    isActive: true,
    lastLogin: new Date().toISOString()
  },
  { 
    id: 'a0000000-0000-0000-0000-000000000004', 
    username: 'mehmetdemir', 
    password: 'Mehmet123!', 
    name: 'Mehmet Demir', 
    role: 'STAFF', 
    city: 'Diyarbakır', 
    branch: 'Diyarbakır Şubesi',
    phone: '+90 542 345 6789',
    avatar: '',
    isActive: true,
    lastLogin: new Date().toISOString()
  },
  { 
    id: 'a0000000-0000-0000-0000-000000000005', 
    username: 'aysekaya', 
    password: 'Ayse123!', 
    name: 'Ayşe Kaya', 
    role: 'STAFF', 
    city: 'Ankara', 
    branch: 'Kızılay Şubesi',
    phone: '+90 533 456 7890',
    avatar: '',
    isActive: true,
    lastLogin: new Date().toISOString()
  },
];

export const DEFAULT_ANNOUNCEMENTS = [
  {
    id: 'ann_1',
    title: '2026-2027 Umre Sezonu Otel Fiyat Matrisi Yayında',
    content: 'Değerli çalışma arkadaşlarımız, tüm otel oda fiyatları ve canlı döviz kurları Genel Merkez tarafından güncellenmiştir. Ramazan ve Şevval umresi için tekliflerinizi güncel paket oranlarıyla oluşturabilirsiniz.',
    date: new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }),
    author: 'Genel Merkez Yönetimi',
    priority: 'high', // 'urgent' | 'high' | 'normal'
    isPinned: true
  },
  {
    id: 'ann_2',
    title: 'VIP Transfer & Araç Kişi Başı Bölüşüm Hatırlatması',
    content: 'Cidde - Mekke ve Mekke - Medine güzergahlarında binek VIP araçlar tercih edildiğinde, araç ücretinin kişi sayısına bölündüğünü ve teklife otonom yansıdığını unutmayınız.',
    date: new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }),
    author: 'Operasyon Birimi',
    priority: 'normal',
    isPinned: false
  }
];
