// İnzar Turizm Master Veri Modeli
// Aylık Sezonluk Otel Fiyat Matrisi, Personel Hesapları ve Döviz Kurları (Takvimsel Sıralı: Ocak - Aralık)

export const DEFAULT_MONTHS = [
  { id: 'jan', name: 'Ocak', label: 'Ocak (Sömestr Tatili)', subtitle: 'Sömestr Tatili', isPeak: true, badge: 'Sömestr' },
  { id: 'feb', name: 'Şubat', label: 'Şubat (Üç Aylar / Recep)', subtitle: 'Üç Aylar / Recep', isPeak: false, badge: null },
  { id: 'mar', name: 'Mart', label: 'Mart (Şaban Ayı)', subtitle: 'Şaban Ayı', isPeak: false, badge: null },
  { id: 'apr', name: 'Nisan', label: 'Nisan (Ramazan-ı Şerif)', subtitle: 'Ramazan-ı Şerif', isPeak: true, badge: 'Ramazan Özel' },
  { id: 'may', name: 'Mayıs', label: 'Mayıs (Şevval Umresi)', subtitle: 'Şevval Umresi', isPeak: false, badge: 'Şevval' },
  { id: 'jun', name: 'Haziran', label: 'Haziran (Erken Yaz)', subtitle: 'Erken Yaz', isPeak: false, badge: null },
  { id: 'jul', name: 'Temmuz', label: 'Temmuz (Yaz Dönemi)', subtitle: 'Yaz Dönemi', isPeak: false, badge: null },
  { id: 'aug', name: 'Ağustos', label: 'Ağustos (Yaz Dönemi)', subtitle: 'Yaz Dönemi', isPeak: false, badge: null },
  { id: 'sep', name: 'Eylül', label: 'Eylül (Güz Dönemi)', subtitle: 'Güz Dönemi', isPeak: false, badge: null },
  { id: 'oct', name: 'Ekim', label: 'Ekim (Sezon Açılışı)', subtitle: 'Sezon Açılışı', isPeak: false, badge: null },
  { id: 'nov', name: 'Kasım', label: 'Kasım (Standart Sezon)', subtitle: 'Standart Sezon', isPeak: false, badge: null },
  { id: 'dec', name: 'Aralık', label: 'Aralık (Yıl Sonu)', subtitle: 'Yıl Sonu', isPeak: false, badge: null },
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
    isFeatured: false,
    color: '#0284c7', // Sky Blue
    badge: 'Ekonomik Tercih',
    makkahFoodPriceSAR: 35,
    madinahFoodPriceSAR: 45,
    // 12 Ayın Takvimsel Otel Fiyatları (Ocak -> Aralık)
    monthlyPrices: {
      jan: { makkahRoomSAR: 85, madinahRoomSAR: 500 },
      feb: { makkahRoomSAR: 65, madinahRoomSAR: 430 },
      mar: { makkahRoomSAR: 75, madinahRoomSAR: 450 },
      apr: { makkahRoomSAR: 180, madinahRoomSAR: 750 },
      may: { makkahRoomSAR: 70, madinahRoomSAR: 420 },
      jun: { makkahRoomSAR: 50, madinahRoomSAR: 380 },
      jul: { makkahRoomSAR: 50, madinahRoomSAR: 380 },
      aug: { makkahRoomSAR: 50, madinahRoomSAR: 380 },
      sep: { makkahRoomSAR: 55, madinahRoomSAR: 390 },
      oct: { makkahRoomSAR: 50, madinahRoomSAR: 380 },
      nov: { makkahRoomSAR: 55, madinahRoomSAR: 400 },
      dec: { makkahRoomSAR: 60, madinahRoomSAR: 420 },
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
    isFeatured: true,
    color: '#059669', // Emerald
    badge: 'En Çok Tercih Edilen',
    makkahFoodPriceSAR: 40,
    madinahFoodPriceSAR: 45,
    monthlyPrices: {
      jan: { makkahRoomSAR: 160, madinahRoomSAR: 650 },
      feb: { makkahRoomSAR: 115, madinahRoomSAR: 530 },
      mar: { makkahRoomSAR: 135, madinahRoomSAR: 580 },
      apr: { makkahRoomSAR: 320, madinahRoomSAR: 950 },
      may: { makkahRoomSAR: 120, madinahRoomSAR: 520 },
      jun: { makkahRoomSAR: 95, madinahRoomSAR: 480 },
      jul: { makkahRoomSAR: 95, madinahRoomSAR: 480 },
      aug: { makkahRoomSAR: 95, madinahRoomSAR: 480 },
      sep: { makkahRoomSAR: 100, madinahRoomSAR: 490 },
      oct: { makkahRoomSAR: 90, madinahRoomSAR: 480 },
      nov: { makkahRoomSAR: 100, madinahRoomSAR: 500 },
      dec: { makkahRoomSAR: 110, madinahRoomSAR: 520 },
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
    isFeatured: false,
    color: '#d97706', // Gold / Amber
    badge: 'VIP & Ultra Lüks',
    makkahFoodPriceSAR: 75,
    madinahFoodPriceSAR: 75,
    monthlyPrices: {
      jan: { makkahRoomSAR: 1200, madinahRoomSAR: 1150 },
      feb: { makkahRoomSAR: 900, madinahRoomSAR: 880 },
      mar: { makkahRoomSAR: 1050, madinahRoomSAR: 980 },
      apr: { makkahRoomSAR: 2200, madinahRoomSAR: 1850 },
      may: { makkahRoomSAR: 950, madinahRoomSAR: 900 },
      jun: { makkahRoomSAR: 800, madinahRoomSAR: 800 },
      jul: { makkahRoomSAR: 800, madinahRoomSAR: 800 },
      aug: { makkahRoomSAR: 800, madinahRoomSAR: 800 },
      sep: { makkahRoomSAR: 850, madinahRoomSAR: 820 },
      oct: { makkahRoomSAR: 800, madinahRoomSAR: 800 },
      nov: { makkahRoomSAR: 850, madinahRoomSAR: 850 },
      dec: { makkahRoomSAR: 900, madinahRoomSAR: 900 },
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
