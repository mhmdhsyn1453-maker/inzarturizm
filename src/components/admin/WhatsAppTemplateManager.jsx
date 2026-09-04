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
  FileText
} from 'lucide-react';

const WhatsAppIcon = ({ className = 'h-5 w-5' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0012.04 2zm5.77 14.15c-.24.68-1.2 1.25-1.66 1.3-.43.05-.98.24-3.13-.65-2.26-.94-3.7-3.23-3.81-3.38-.11-.15-.91-1.21-.91-2.31 0-1.1.58-1.64.78-1.87.2-.23.44-.29.58-.29.15 0 .3 0 .42.01.13.01.3.05.47.45.17.41.6 1.46.65 1.57.05.11.08.24.02.38-.06.14-.09.23-.18.34-.09.11-.19.25-.27.33-.1.1-.2.21-.09.4.11.19.49.81 1.05 1.31.73.65 1.34.85 1.53.94.19.09.3.08.41-.05.11-.13.48-.56.61-.75.13-.19.26-.16.44-.09.18.07 1.15.54 1.35.64.2.1.33.15.38.23.05.08.05.48-.19 1.16z" />
  </svg>
);

const VARIABLES = [
  { tag: '{MUSTERI_ADI}', label: 'Misafir Adı', example: 'Musa Kazım' },
  { tag: '{PAKET_ADI}', label: 'Paket Adı', example: 'Ekonomik Paket' },
  { tag: '{MEKKE_OTELI}', label: 'Mekke Oteli', example: 'Merkezi Otel' },
  { tag: '{MEDINE_OTELI}', label: 'Medine Oteli', example: 'Merkezi Otel' },
  { tag: '{MEKKE_GECE}', label: 'Mekke Gece', example: '10' },
  { tag: '{MEDINE_GECE}', label: 'Medine Gece', example: '4' },
  { tag: '{TOPLAM_GUN}', label: 'Toplam Gün', example: '14' },
  { tag: '{ODA_TIPI}', label: 'Oda Tipi', example: '2 Kişilik Oda' },
  { tag: '{FIYAT_USD}', label: 'Fiyat (USD)', example: '650' },
  { tag: '{FIYAT_TL}', label: 'Fiyat (TL)', example: '24.500' },
  { tag: '{TEMSILCI}', label: 'Satış Temsilcisi', example: 'Şeyhmus Çoban' }
];

export default function WhatsAppTemplateManager() {
  const { currentUser } = useAuth();
  const { showAlert, showConfirm } = useModal();
  const [template, setTemplate] = useState(() => syncService.getWhatsAppTemplate());
  const [copied, setCopied] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  const handleInsertTag = (tag) => {
    setTemplate(prev => prev + (prev.endsWith(' ') || prev.endsWith('\n') ? '' : ' ') + tag + ' ');
  };

  const handleSave = () => {
    syncService.saveWhatsAppTemplate(template, currentUser);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2500);
    showAlert({
      title: '✓ WhatsApp Şablonu Güncellendi',
      message: 'Personellerin WhatsApp üzerinden müşteriye göndereceği mesaj şablonu başarıyla kaydedildi.',
      type: 'success'
    });
  };

  const handleReset = async () => {
    const confirmed = await showConfirm({
      title: 'Varsayılan Şablona Sıfırla',
      message: 'WhatsApp mesaj şablonunu fabrika ayarlarına döndürmek istediğinize emin misiniz?',
      confirmText: 'Evet, Sıfırla',
      cancelText: 'Vazgeç',
      confirmVariant: 'amber'
    });

    if (confirmed) {
      localStorage.removeItem('INZAR_WHATSAPP_TEMPLATE');
      const def = syncService.getWhatsAppTemplate();
      setTemplate(def);
      syncService.saveWhatsAppTemplate(def, currentUser);
      showAlert({
        title: 'Şablon Sıfırlandı',
        message: 'WhatsApp mesaj şablonu kurumsal varsayılana döndürüldü.',
        type: 'info'
      });
    }
  };

  const handleCopyPreview = () => {
    navigator.clipboard.writeText(previewMessage);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Live preview interpolation
  const previewMessage = template
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
    .replace(/{TEMSILCI}/g, currentUser?.name || 'Şeyhmus Çoban');

  return (
    <div className="space-y-6 pb-20 font-sans max-w-7xl mx-auto animate-fade-in">
      
      {/* 👑 Top Banner (Kullanıcının İstediği Resmi Kurumsal Banner) */}
      <div className="pearl-card rounded-3xl p-6 sm:p-8 bg-gradient-to-r from-emerald-900 via-emerald-850 to-emerald-950 text-white shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-800/80 px-3 py-1 text-xs font-bold text-emerald-200 border border-emerald-700/60">
              <WhatsAppIcon className="h-3.5 w-3.5 text-emerald-400" />
              <span>OTONOM MESAJ & BİLGİLENDİRME</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black font-display tracking-tight text-white">
              WhatsApp Otonom Mesaj Yönetimi
            </h2>
            <p className="text-sm text-emerald-200/90 font-medium max-w-2xl">
              Genel Merkez tarafından onaylanan resmi teklif bildirim ve eşlik metni şablonunu buradan yönetebilirsiniz.
            </p>
          </div>

          <div className="flex items-center gap-3 self-start lg:self-auto">
            <button
              type="button"
              onClick={handleReset}
              className="flex items-center justify-center gap-2 rounded-2xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold px-4 py-3 border border-white/20 shadow-md transition-all cursor-pointer hover:scale-105 active:scale-95"
            >
              <RotateCcw className="h-4 w-4" />
              <span>Varsayılana Dön</span>
            </button>

            <button
              type="button"
              onClick={handleSave}
              className="flex items-center justify-center gap-2 rounded-2xl bg-emerald-400 hover:bg-emerald-300 text-emerald-950 text-xs font-black px-6 py-3 shadow-lg shadow-emerald-400/30 transition-all cursor-pointer hover:scale-105 active:scale-95"
            >
              <Save className="h-4 w-4" />
              <span>{isSaved ? '✓ Kaydedildi' : 'Şablonu Kaydet'}</span>
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Sol Kolon: Metin Editörü ve Dinamik Değişkenler */}
        <div className="lg:col-span-7 space-y-4">
          
          {/* Dinamik Değişken Etiketleri */}
          <div className="pearl-card rounded-3xl p-5 bg-white border border-slate-200/90 shadow-sm space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-800 font-display">
              <Sparkles className="h-4 w-4 text-emerald-600" />
              <span>Dinamik Bilgi Etiketleri (Tıklayarak Metne Ekleyin)</span>
            </div>

            <div className="flex flex-wrap gap-2">
              {VARIABLES.map((v, idx) => (
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
            <div className="flex items-center justify-between">
              <label className="text-xs font-black text-slate-800">
                Resmi WhatsApp Mesaj Metni Şablonu
              </label>
              <span className="text-[11px] text-slate-400 font-mono">
                {template.length} karakter
              </span>
            </div>

            <textarea
              rows={13}
              value={template}
              onChange={(e) => setTemplate(e.target.value)}
              placeholder="WhatsApp mesaj şablonunu buraya yazınız..."
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs font-mono font-medium text-slate-900 focus:bg-white focus:border-emerald-600 focus:outline-none shadow-3xs leading-relaxed"
            />

            <div className="flex items-center gap-2 text-[11px] text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-200/80">
              <Info className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>Metinde *yıldız* içine alınan kısımlar WhatsApp'ta kalın görünür. Personel WhatsApp butonuna bastığında PDF dosyasının yanı sıra bu şablon doldurularak açılır.</span>
            </div>
          </div>

        </div>

        {/* Sağ Kolon: Canlı Müşteri WhatsApp Önizlemesi */}
        <div className="lg:col-span-5 space-y-3 sticky top-4">
          <div className="pearl-card rounded-3xl p-5 bg-white border border-slate-200/90 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-800 font-display">
                <Smartphone className="h-4 w-4 text-emerald-600" />
                <span>Canlı WhatsApp Önizlemesi</span>
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
              
              {/* WhatsApp Balonu */}
              <div className="bg-white rounded-2xl rounded-tl-none p-4 shadow-sm border border-slate-200/70 max-w-[96%] space-y-2 text-slate-900 text-xs leading-relaxed whitespace-pre-wrap font-sans">
                {previewMessage}
                <div className="text-[9px] text-slate-400 text-right pt-1 font-mono">
                  14:30 ✓✓
                </div>
              </div>

              {/* Ek Dosya Bildirimi */}
              <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 rounded-xl border border-emerald-200 text-[11px] text-emerald-900 font-semibold">
                <FileText className="h-4 w-4 text-emerald-700 shrink-0" />
                <span>Resmi PDF Teklif Mektubu otomatik olarak eşlik eder</span>
              </div>

            </div>

          </div>
        </div>

      </div>

    </div>
  );
}
