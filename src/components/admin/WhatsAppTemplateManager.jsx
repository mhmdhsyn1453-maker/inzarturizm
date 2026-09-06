import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useModal } from '../../context/ModalContext';
import { syncService } from '../../services/syncService';
import { 
  MessageSquare, 
  Save, 
  RotateCcw, 
  Sparkles, 
  CheckCircle2, 
  Copy,
  Smartphone,
  Info,
  Send,
  FileText,
  Check,
  XCircle,
  AlertTriangle,
  Ban,
  Star,
  BookmarkCheck,
  Layers
} from 'lucide-react';
import confetti from 'canvas-confetti';

const WhatsAppIcon = ({ className = 'h-5 w-5' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0012.04 2zm5.77 14.15c-.24.68-1.2 1.25-1.66 1.3-.43.05-.98.24-3.13-.65-2.26-.94-3.7-3.23-3.81-3.38-.11-.15-.91-1.21-.91-2.31 0-1.1.58-1.64.78-1.87.2-.23.44-.29.58-.29.15 0 .3 0 .42.01.13.01.3.05.47.45.17.41.6 1.46.65 1.57.05.11.08.24.02.38-.06.14-.09.23-.18.34-.09.11-.19.25-.27.33-.1.1-.2.21-.09.4.11.19.49.81 1.05 1.31.73.65 1.34.85 1.53.94.19.09.3.08.41-.05.11-.13.48-.56.61-.75.13-.19.26-.16.44-.09.18.07 1.15.54 1.35.64.2.1.33.15.38.23.05.08.05.48-.19 1.16z" />
  </svg>
);

const TEMPLATE_TABS = [
  {
    id: 'quote',
    title: 'Standart Teklif Şablonu',
    shortTitle: 'Teklif Gönderimi',
    badge: 'Taslak & İlk Teklif',
    desc: 'Personelin teklif oluştururken müşteriye gönderdiği standart tanıtım ve fiyat şablonu.',
    icon: FileText,
    accentColor: 'from-emerald-600 to-teal-700',
    lightBg: 'bg-emerald-50/80',
    borderActive: 'border-emerald-600',
    ringActive: 'ring-emerald-500/25',
    textActive: 'text-emerald-950'
  },
  {
    id: 'hq_approved',
    title: 'Merkez Onay Bildirimi',
    shortTitle: 'Onay Bildirimi',
    badge: 'Genel Merkez Onayladı',
    desc: 'Genel Merkez teklifi onayladığında müşteriye gönderilecek resmi tebrik ve özet şablonu.',
    icon: CheckCircle2,
    accentColor: 'from-teal-600 to-emerald-800',
    lightBg: 'bg-teal-50/80',
    borderActive: 'border-teal-600',
    ringActive: 'ring-teal-500/25',
    textActive: 'text-teal-950'
  },
  {
    id: 'hq_rejected',
    title: 'Merkez Ret / Bilgilendirme',
    shortTitle: 'Merkez Ret Mesajı',
    badge: 'Genel Merkez Reddetti',
    desc: 'Genel Merkez teklifi uygun görmediğinde müşteriye giden nezaketli ret ve alternatif arayış şablonu.',
    icon: XCircle,
    accentColor: 'from-rose-600 to-pink-700',
    lightBg: 'bg-rose-50/80',
    borderActive: 'border-rose-600',
    ringActive: 'ring-rose-500/25',
    textActive: 'text-rose-950'
  },
  {
    id: 'rejected',
    title: 'Müşteri İptal / Vazgeçiş',
    shortTitle: 'Müşteri İptali',
    badge: 'Müşteri Vazgeçti',
    desc: 'Müşteri tekliften vazgeçtiğinde arşive kaldırma ve kayıt iptal bilgilendirme şablonu.',
    icon: Ban,
    accentColor: 'from-amber-600 to-orange-700',
    lightBg: 'bg-amber-50/80',
    borderActive: 'border-amber-600',
    ringActive: 'ring-amber-500/25',
    textActive: 'text-amber-950'
  }
];

const ALL_VARIABLES = [
  { tag: '{MUSTERI_ADI}', label: 'Misafir Adı', example: 'Musa Kazım', for: ['quote', 'hq_approved', 'hq_rejected', 'rejected'] },
  { tag: '{PAKET_ADI}', label: 'Paket Adı', example: 'Ekonomik Umre Paketi', for: ['quote', 'hq_approved', 'hq_rejected', 'rejected'] },
  { tag: '{TEMSILCI}', label: 'Temsilci Adı', example: 'Şeyhmus Çoban', for: ['quote', 'hq_approved', 'hq_rejected', 'rejected'] },
  { tag: '{TEKLIF_NO}', label: 'Teklif / Talep No', example: 'INZ-2026-894', for: ['hq_approved', 'hq_rejected', 'rejected'] },
  { tag: '{MERKEZ_NOTU}', label: 'Merkez Ret Gerekçesi', example: 'Otel kontenjanı doluluğu sebebiyle alternatif tarihler önerilmektedir.', for: ['hq_rejected'] },
  { tag: '{FIYAT_USD}', label: 'Fiyat (USD)', example: '650', for: ['quote', 'hq_approved'] },
  { tag: '{FIYAT_TL}', label: 'Fiyat (TL)', example: '24.500', for: ['quote', 'hq_approved'] },
  { tag: '{KISI_SAYISI}', label: 'Kişi Sayısı', example: '2', for: ['quote', 'hq_approved'] },
  { tag: '{MEKKE_OTELI}', label: 'Mekke Oteli', example: 'Merkezi Otel (Harem 250m)', for: ['quote', 'hq_approved'] },
  { tag: '{MEDINE_OTELI}', label: 'Medine Oteli', example: 'Merkezi Otel (Mescid 150m)', for: ['quote', 'hq_approved'] },
  { tag: '{MEKKE_GECE}', label: 'Mekke Gece', example: '10', for: ['quote', 'hq_approved'] },
  { tag: '{MEDINE_GECE}', label: 'Medine Gece', example: '4', for: ['quote', 'hq_approved'] },
  { tag: '{TOPLAM_GUN}', label: 'Toplam Gün', example: '14', for: ['quote', 'hq_approved'] },
  { tag: '{ODA_TIPI}', label: 'Oda Tipi', example: '2 Kişilik Oda', for: ['quote', 'hq_approved'] }
];

export default function WhatsAppTemplateManager() {
  const { currentUser } = useAuth();
  const { showAlert, showConfirm } = useModal();
  
  const [activeTab, setActiveTab] = useState('quote');
  const [templates, setTemplates] = useState(() => syncService.getAllWhatsAppTemplates());
  const [copied, setCopied] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isDefaultSaved, setIsDefaultSaved] = useState(false);

  const currentTemplate = templates[activeTab] || '';

  const handleTemplateChange = (text) => {
    setTemplates(prev => ({
      ...prev,
      [activeTab]: text
    }));
  };

  const handleInsertTag = (tag) => {
    handleTemplateChange(currentTemplate + (currentTemplate.endsWith(' ') || currentTemplate.endsWith('\n') ? '' : ' ') + tag + ' ');
  };

  // 1. ŞABLONU KAYDET
  const handleSave = () => {
    syncService.saveWhatsAppTemplate(activeTab, currentTemplate, currentUser);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2500);
    showAlert({
      title: '✓ WhatsApp Şablonu Kaydedildi',
      message: `"${TEMPLATE_TABS.find(t => t.id === activeTab)?.title}" şablonu güncellendi ve tüm sistemde aktif edildi.`,
      type: 'success'
    });
  };

  // 2. VARSAYILAN OLARAK KAYDET
  const handleSaveAsDefault = async () => {
    const tabObj = TEMPLATE_TABS.find(t => t.id === activeTab);
    const confirmed = await showConfirm({
      title: '🌟 Varsayılan Olarak Kaydet',
      message: `Mevcut "${tabObj?.title}" metnini yeni KURUMSAL VARSAYILAN ŞABLON olarak belirlemek istiyor musunuz?`,
      details: 'Bu işlem sonrasında sistem fabrika ayarlarına sıfırlansa bile bu şablon temel alınacaktır.',
      confirmText: 'Evet, Varsayılan Yap',
      cancelText: 'Vazgeç',
      confirmVariant: 'emerald'
    });

    if (confirmed) {
      syncService.saveAsDefaultWhatsAppTemplate(activeTab, currentTemplate, currentUser);
      setIsDefaultSaved(true);
      confetti({ particleCount: 50, spread: 60, origin: { y: 0.8 } });
      setTimeout(() => setIsDefaultSaved(false), 2500);
      showAlert({
        title: '🌟 Kurumsal Varsayılan Olarak Kaydedildi',
        message: `"${tabObj?.title}" metni yeni kalıcı varsayılan olarak kaydedildi.`,
        type: 'success'
      });
    }
  };

  // 3. VARSAYILANA SIFIRLA
  const handleResetToFactory = async () => {
    const tabObj = TEMPLATE_TABS.find(t => t.id === activeTab);
    const confirmed = await showConfirm({
      title: '🔄 Fabrika Varsayılanına Sıfırla',
      message: `"${tabObj?.title}" şablonundaki tüm değişiklikleri silip orijinal fabrika ayarlarına döndürmek istediğinize emin misiniz?`,
      confirmText: 'Evet, Sıfırla',
      cancelText: 'Vazgeç',
      confirmVariant: 'amber'
    });

    if (confirmed) {
      const def = syncService.resetWhatsAppTemplateToFactory(activeTab, currentUser);
      setTemplates(prev => ({ ...prev, [activeTab]: def }));
      showAlert({
        title: '✓ Şablon Sıfırlandı',
        message: `"${tabObj?.title}" metni orijinal fabrika ayarlarına döndürüldü.`,
        type: 'info'
      });
    }
  };

  // Live preview interpolation
  const getPreviewMessage = () => {
    return currentTemplate
      .replace(/{MUSTERI_ADI}/g, 'Musa Kazım')
      .replace(/{PAKET_ADI}/g, 'Ekonomik Umre Paketi')
      .replace(/{MEKKE_OTELI}/g, 'Merkezi Otel (Harem 250m)')
      .replace(/{MEDINE_OTELI}/g, 'Merkezi Otel (Mescid 150m)')
      .replace(/{MEKKE_GECE}/g, '10')
      .replace(/{MEDINE_GECE}/g, '4')
      .replace(/{TOPLAM_GUN}/g, '14')
      .replace(/{ODA_TIPI}/g, '2 Kişilik Oda')
      .replace(/{FIYAT_USD}/g, '650')
      .replace(/{FIYAT_TL}/g, '24.500')
      .replace(/{TEMSILCI}/g, currentUser?.name || 'Şeyhmus Çoban')
      .replace(/{TEKLIF_NO}/g, 'INZ-2026-894')
      .replace(/{KISI_SAYISI}/g, '2')
      .replace(/{MERKEZ_NOTU}/g, '\n\n*Merkez Açıklaması / Gerekçe:* Seçilen tarih aralığında otel kontenjanı tükendiğinden bir sonraki haftaya planlanması önerilmektedir.');
  };

  const previewMessage = getPreviewMessage();

  const handleCopyPreview = () => {
    navigator.clipboard.writeText(previewMessage);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const activeTabObj = TEMPLATE_TABS.find(t => t.id === activeTab) || TEMPLATE_TABS[0];
  const relevantVariables = ALL_VARIABLES.filter(v => v.for.includes(activeTab));

  return (
    <div className="space-y-6 pb-28 font-sans max-w-7xl mx-auto animate-fade-in relative">
      
      {/* 👑 Top Banner (Yalın ve Şık Başlık Alanı) */}
      <div className="pearl-card rounded-3xl p-6 sm:p-8 bg-gradient-to-r from-emerald-900 via-emerald-850 to-emerald-950 text-white shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-800/80 px-3 py-1 text-xs font-bold text-emerald-200 border border-emerald-700/60 shadow-xs">
              <WhatsAppIcon className="h-3.5 w-3.5 text-emerald-400" />
              <span>DİNAMİK WHATSAPP ŞABLON MERKEZİ</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black font-display tracking-tight text-white">
              WhatsApp Mesaj Şablonları Yönetimi
            </h2>
            <p className="text-sm text-emerald-200/90 font-medium max-w-2xl">
              Teklif gönderme, Genel Merkez onay, ret ve müşteri iptal durumlarında WhatsApp üzerinden gidecek mesaj metinlerini buradan özelleştirebilirsiniz.
            </p>
          </div>

          <div className="hidden lg:flex items-center gap-2 text-xs font-bold bg-emerald-950/70 border border-emerald-700/50 px-4 py-3 rounded-2xl text-emerald-200">
            <Sparkles className="h-4 w-4 text-emerald-400" />
            <span>4 Farklı Senaryo İçin Canlı Şablon Motoru</span>
          </div>
        </div>
      </div>

      {/* 🗂️ ŞABLON SEÇİM SEKMELERİ (Zengin Hover & Aktif Seçim Animasyonları) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {TEMPLATE_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`group p-4.5 rounded-3xl text-left cursor-pointer select-none relative overflow-hidden transition-all duration-300 ease-out transform ${
                isActive
                  ? `bg-white border-2 ${tab.borderActive} ring-4 ${tab.ringActive} shadow-xl scale-[1.03] -translate-y-1`
                  : 'bg-white/90 border border-slate-200/90 hover:bg-white hover:border-emerald-400 hover:shadow-lg hover:-translate-y-1 hover:scale-[1.015]'
              }`}
            >
              {/* Arka Plan Zarif Glow Efekti */}
              <div className={`absolute -right-8 -top-8 w-24 h-24 rounded-full transition-all duration-500 pointer-events-none ${
                isActive 
                  ? 'bg-gradient-to-br ' + tab.accentColor + ' opacity-15 blur-xl scale-125' 
                  : 'bg-slate-200 opacity-0 group-hover:opacity-40 blur-lg'
              }`} />

              <div className="flex items-center justify-between w-full relative z-10">
                <div className={`p-3 rounded-2xl transition-all duration-300 transform ${
                  isActive 
                    ? `bg-gradient-to-br ${tab.accentColor} text-white shadow-md scale-105 rotate-1` 
                    : 'bg-slate-100 text-slate-600 group-hover:bg-slate-200 group-hover:scale-110 group-hover:rotate-3'
                }`}>
                  <Icon className="h-4 w-4 stroke-[2.5]" />
                </div>
                <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full border transition-all duration-300 ${
                  isActive
                    ? 'bg-emerald-100/90 text-emerald-900 border-emerald-300 shadow-3xs font-extrabold'
                    : 'bg-slate-100 text-slate-500 border-slate-200/80 group-hover:border-slate-300'
                }`}>
                  {tab.badge}
                </span>
              </div>

              <div className="mt-3.5 space-y-1 relative z-10">
                <h4 className={`text-xs font-black transition-colors duration-200 flex items-center justify-between ${
                  isActive ? 'text-slate-950 font-display' : 'text-slate-700 group-hover:text-slate-900'
                }`}>
                  <span>{tab.title}</span>
                  {isActive && <Check className="h-3.5 w-3.5 text-emerald-600 stroke-[3]" />}
                </h4>
                <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed font-medium">
                  {tab.desc}
                </p>
              </div>

              {/* Aktif İndikatör Çizgisi */}
              {isActive ? (
                <div className={`h-1.5 bg-gradient-to-r ${tab.accentColor} rounded-full w-full mt-3.5 shadow-xs`} />
              ) : (
                <div className="h-1 bg-transparent group-hover:bg-slate-200 rounded-full w-full mt-3.5 transition-colors duration-200" />
              )}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Sol Kolon: Metin Editörü ve Dinamik Değişkenler */}
        <div className="lg:col-span-7 space-y-4">
          
          {/* Dinamik Değişken Etiketleri */}
          <div className="pearl-card rounded-3xl p-5 bg-white border border-slate-200/90 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-800 font-display">
                <Sparkles className="h-4 w-4 text-emerald-600" />
                <span>Bu Şablona Özel Dinamik Etiketler (Tıklayarak Ekleyin)</span>
              </div>
              <span className="text-[10px] text-slate-400 font-semibold bg-slate-100 px-2 py-0.5 rounded-full">
                Otomatik Doldurulur
              </span>
            </div>

            <div className="flex flex-wrap gap-2">
              {relevantVariables.map((v, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleInsertTag(v.tag)}
                  className="px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-emerald-50 text-slate-700 hover:text-emerald-900 border border-slate-200 hover:border-emerald-300 text-xs font-semibold transition-all cursor-pointer shadow-3xs flex items-center gap-1.5 hover:scale-105 active:scale-95"
                >
                  <span className="font-mono font-bold text-emerald-700">{v.tag}</span>
                  <span className="text-[10px] text-slate-400">({v.label})</span>
                </button>
              ))}
            </div>
          </div>

          {/* Şablon Editör Kutusu */}
          <div className="pearl-card rounded-3xl p-5 bg-white border border-slate-200/90 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div>
                <label className="text-xs font-black text-slate-800 block">
                  {activeTabObj.title} Metni
                </label>
                <p className="text-[11px] text-slate-500">
                  {activeTabObj.desc}
                </p>
              </div>
              <span className="text-[11px] text-slate-400 font-mono bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                {currentTemplate.length} karakter
              </span>
            </div>

            <textarea
              rows={15}
              value={currentTemplate}
              onChange={(e) => handleTemplateChange(e.target.value)}
              placeholder="WhatsApp mesaj şablonunu buraya yazınız..."
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs font-mono font-medium text-slate-900 focus:bg-white focus:border-emerald-600 focus:outline-none shadow-3xs leading-relaxed"
            />

            <div className="flex items-center gap-2 text-[11px] text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-200/80">
              <Info className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>Metinde <strong>*yıldız*</strong> içine aldığınız kelimeler WhatsApp mesajında kalın (bold) olarak görünür.</span>
            </div>
          </div>

        </div>

        {/* Sağ Kolon: Canlı Müşteri WhatsApp Önizlemesi */}
        <div className="lg:col-span-5 space-y-3 sticky top-4">
          <div className="pearl-card rounded-3xl p-5 bg-white border border-slate-200/90 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-800 font-display">
                <Smartphone className="h-4 w-4 text-emerald-600" />
                <span>Canlı WhatsApp Görünümü</span>
              </div>

              <button
                type="button"
                onClick={handleCopyPreview}
                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1"
              >
                {copied ? <CheckCircle2 className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                <span>{copied ? 'Kopyalandı' : 'Kopyala'}</span>
              </button>
            </div>

            {/* WhatsApp Chat UI */}
            <div className="rounded-2xl border border-slate-200 bg-[#efeae2] p-4 space-y-3 shadow-inner relative">
              
              {/* WhatsApp Başlık Çubuğu */}
              <div className="flex items-center justify-between bg-emerald-900 text-white p-2.5 rounded-xl shadow-xs text-xs font-bold">
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-full bg-emerald-700 flex items-center justify-center text-[10px] font-black">
                    İZ
                  </div>
                  <div>
                    <div className="text-[11px] font-black leading-tight">İnzar Turizm Genel Merkez</div>
                    <div className="text-[9px] text-emerald-300 font-normal">Çevrimiçi</div>
                  </div>
                </div>
                <span className="text-[10px] bg-emerald-800/80 px-2 py-0.5 rounded-full border border-emerald-700/60">
                  {activeTabObj.badge}
                </span>
              </div>

              {/* WhatsApp Balonu */}
              <div className="bg-white rounded-2xl rounded-tl-none p-4 shadow-sm border border-slate-200/70 max-w-[98%] space-y-2 text-slate-900 text-xs leading-relaxed whitespace-pre-wrap font-sans">
                {previewMessage}
                <div className="text-[9px] text-slate-400 text-right pt-1 font-mono">
                  14:30 ✓✓
                </div>
              </div>

              {/* Ek Dosya Bildirimi (Sadece Teklif ve Onay için) */}
              {(activeTab === 'quote' || activeTab === 'hq_approved') && (
                <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 rounded-xl border border-emerald-200 text-[11px] text-emerald-900 font-semibold">
                  <FileText className="h-4 w-4 text-emerald-700 shrink-0" />
                  <span>Resmi Teklif Mektubu PDF belgesi otomatik olarak eşlik eder</span>
                </div>
              )}

            </div>

          </div>
        </div>

      </div>

      {/* 🚀 SAYFANIN ALTINDA SABİT EYLEM ÇUBUĞU (Kullanıcının İstediği Alt Buton Barı) */}
      <div className="fixed bottom-3 left-4 right-4 sm:left-72 sm:right-6 z-40">
        <div className="pearl-card rounded-3xl p-3.5 sm:px-6 sm:py-3.5 bg-slate-900/95 text-white border border-slate-700/80 shadow-2xl backdrop-blur-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-slide-from-bottom">
          
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-2xl bg-emerald-600/30 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs font-black text-white flex items-center gap-2">
                <span>{activeTabObj.title}</span>
                <span className="text-[10px] px-2 py-0.2 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-700/50">
                  {activeTabObj.badge}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium hidden sm:block">
                Yapılan değişiklikleri doğrudan sisteme kaydedebilir veya yeni varsayılan olarak sabitleyebilirsiniz.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap justify-end">
            
            {/* 1. Varsayılana Sıfırla Butonu */}
            <button
              type="button"
              onClick={handleResetToFactory}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 font-bold text-xs transition-all cursor-pointer shadow-sm hover:scale-105 active:scale-95"
              title="Orijinal fabrika ayarlarına sıfırla"
            >
              <RotateCcw className="h-3.5 w-3.5 text-amber-400" />
              <span>Varsayılana Sıfırla</span>
            </button>

            {/* 2. Varsayılan Olarak Kaydet Butonu */}
            <button
              type="button"
              onClick={handleSaveAsDefault}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-emerald-300 hover:text-emerald-200 border border-emerald-700/60 font-bold text-xs transition-all cursor-pointer shadow-sm hover:scale-105 active:scale-95"
              title="Bu metni yeni fabrika varsayılanı yap"
            >
              <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />
              <span>{isDefaultSaved ? '✓ Varsayılan Oldu' : 'Varsayılan Olarak Kaydet'}</span>
            </button>

            {/* 3. Şablonu Kaydet Butonu */}
            <button
              type="button"
              onClick={handleSave}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs transition-all cursor-pointer shadow-lg shadow-emerald-500/30 hover:scale-105 active:scale-95"
            >
              <Save className="h-4 w-4 stroke-[2.5]" />
              <span>{isSaved ? '✓ Kaydedildi' : 'Şablonu Kaydet'}</span>
            </button>

          </div>
        </div>
      </div>

    </div>
  );
}
