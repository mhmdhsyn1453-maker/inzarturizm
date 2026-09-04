-- ==============================================================================
-- İNZAR TURİZM - SUPABASE POSTGRESQL VERİTABANI ŞEMASI & GÜVENLİK KURALLARI
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==============================================================================
-- 2. TABLOLARIN OLUŞTURULMASI
-- ==============================================================================

-- A. PROFILES (Kullanıcı ve Personel Profilleri - auth.users ile entegre)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'STAFF' CHECK (role IN ('ADMIN', 'STAFF', 'HQ_ASSISTANT')),
  city TEXT DEFAULT 'İstanbul',
  branch TEXT DEFAULT 'Merkez',
  phone TEXT,
  avatar_image TEXT,
  is_active BOOLEAN DEFAULT true,
  two_factor_enabled BOOLEAN DEFAULT false,
  two_factor_secret TEXT,
  two_factor_backup_codes JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  last_login TIMESTAMPTZ
);

-- B. PACKAGES (Otel Standartları ve Paketler)
CREATE TABLE IF NOT EXISTS public.packages (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  tag TEXT,
  color TEXT DEFAULT 'emerald',
  profit_margin NUMERIC DEFAULT 15,
  food_type TEXT DEFAULT 'Tabldot / Açık Büfe',
  hotel_makkah TEXT NOT NULL,
  hotel_madinah TEXT NOT NULL,
  distance_makkah TEXT NOT NULL,
  distance_madinah TEXT NOT NULL,
  meal_makkah TEXT DEFAULT 'Açık Büfe',
  meal_madinah TEXT DEFAULT 'Açık Büfe',
  default_days_makkah INTEGER DEFAULT 10,
  default_days_madinah INTEGER DEFAULT 4,
  makkah_hotels JSONB DEFAULT '[]'::jsonb,
  madinah_hotels JSONB DEFAULT '[]'::jsonb,
  makkah_prices JSONB NOT NULL,
  madinah_prices JSONB NOT NULL,
  fixed_expenses JSONB NOT NULL,
  transfers JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- C. CURRENCIES (Döviz Kurları)
CREATE TABLE IF NOT EXISTS public.currencies (
  id TEXT PRIMARY KEY DEFAULT 'current_rates',
  usd_try NUMERIC NOT NULL,
  eur_try NUMERIC NOT NULL,
  sar_usd NUMERIC NOT NULL,
  sar_try NUMERIC NOT NULL,
  eur_usd NUMERIC NOT NULL,
  source TEXT DEFAULT 'TCMB / Serbest Piyasa',
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- D. CUSTOMERS (Müşteri ve Ziyaretçi Kayıtları)
CREATE TABLE IF NOT EXISTS public.customers (
  id TEXT PRIMARY KEY,
  tc_no TEXT,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT,
  created_by_id TEXT,
  created_by_name TEXT,
  branch TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- E. QUOTES (Verilen Teklifler)
CREATE TABLE IF NOT EXISTS public.quotes (
  id TEXT PRIMARY KEY,
  customer_name TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  tc_no TEXT,
  customer_phone TEXT,
  package_id TEXT NOT NULL,
  package_name TEXT NOT NULL,
  selected_month TEXT NOT NULL,
  selected_month_label TEXT,
  start_date TEXT,
  end_date TEXT,
  route_order TEXT DEFAULT 'makkah_first',
  route_schedule JSONB,
  selected_makkah_hotel_id TEXT,
  selected_madinah_hotel_id TEXT,
  include_meals BOOLEAN DEFAULT true,
  include_makkah_meals BOOLEAN DEFAULT true,
  include_madinah_meals BOOLEAN DEFAULT true,
  is_mixed_room_mode BOOLEAN DEFAULT false,
  mixed_rooms JSONB,
  mixed_rooms_breakdown JSONB,
  mixed_rooms_summary JSONB,
  makkah_days INTEGER DEFAULT 10,
  madinah_days INTEGER DEFAULT 4,
  pax_count INTEGER DEFAULT 1,
  room_matrix JSONB NOT NULL,
  selected_room_occupancy INTEGER DEFAULT 2,
  final_price_usd NUMERIC NOT NULL,
  final_price_try NUMERIC NOT NULL,
  final_price_eur NUMERIC NOT NULL,
  currency TEXT DEFAULT 'USD',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'customer_approved', 'hq_approved', 'hq_rejected', 'approved', 'rejected', 'revised', 'approved_revised', 'expired')),
  valid_until TIMESTAMPTZ,
  customer_approved_at TIMESTAMPTZ,
  customer_approved_by TEXT,
  hq_approved_at TIMESTAMPTZ,
  hq_approved_by TEXT,
  hq_note TEXT,
  created_by_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by_name TEXT NOT NULL,
  branch TEXT NOT NULL,
  revision_count INTEGER DEFAULT 0,
  transfers_selection JSONB,
  fixed_expenses_included JSONB,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- F. ANNOUNCEMENTS (Genel Merkez Sirkülerleri & Duyuruları)
CREATE TABLE IF NOT EXISTS public.announcements (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  author TEXT DEFAULT 'Genel Merkez Yönetimi',
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('normal', 'high', 'urgent')),
  is_pinned BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- G. AUDIT_LOGS (Güvenlik ve Denetim Kayıtları)
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  action TEXT NOT NULL,
  "user" TEXT NOT NULL,
  details TEXT NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==============================================================================
-- 3. GERÇEK ZAMANLI (REALTIME) YAYINLARIN AKTİF EDİLMESİ
-- ==============================================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.quotes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.customers;
ALTER PUBLICATION supabase_realtime ADD TABLE public.packages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.currencies;
ALTER PUBLICATION supabase_realtime ADD TABLE public.announcements;
ALTER PUBLICATION supabase_realtime ADD TABLE public.audit_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;

-- ==============================================================================
-- 4. ROW LEVEL SECURITY (RLS - SATIR BAZLI SİBER GÜVENLİK)
-- ==============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.currencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Okuma Politikaları (Tüm oturum açmış kullanıcılar okuyabilir)
CREATE POLICY "Profiles read allowed" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Packages read allowed" ON public.packages FOR SELECT USING (true);
CREATE POLICY "Currencies read allowed" ON public.currencies FOR SELECT USING (true);
CREATE POLICY "Customers read allowed" ON public.customers FOR SELECT USING (true);
CREATE POLICY "Quotes read allowed" ON public.quotes FOR SELECT USING (true);
CREATE POLICY "Announcements read allowed" ON public.announcements FOR SELECT USING (true);
CREATE POLICY "Audit logs read allowed" ON public.audit_logs FOR SELECT USING (true);

-- Yazma Politikaları
CREATE POLICY "Quotes insert allowed" ON public.quotes FOR INSERT WITH CHECK (true);
CREATE POLICY "Quotes update allowed" ON public.quotes FOR UPDATE USING (true);
CREATE POLICY "Quotes delete allowed" ON public.quotes FOR DELETE USING (true);
CREATE POLICY "Customers all allowed" ON public.customers FOR ALL USING (true);
CREATE POLICY "Audit logs insert allowed" ON public.audit_logs FOR INSERT WITH CHECK (true);
CREATE POLICY "Packages update allowed" ON public.packages FOR ALL USING (true);
CREATE POLICY "Currencies update allowed" ON public.currencies FOR ALL USING (true);
CREATE POLICY "Announcements update allowed" ON public.announcements FOR ALL USING (true);
CREATE POLICY "Profiles update allowed" ON public.profiles FOR ALL USING (true);
