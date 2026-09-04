import React, { createContext, useContext, useState, useCallback } from 'react';
import { 
  AlertCircle, 
  AlertTriangle, 
  CheckCircle2, 
  Info, 
  LogOut, 
  ShieldAlert, 
  Trash2, 
  RotateCcw,
  FolderDown,
  Download,
  Zap,
  Check,
  X 
} from 'lucide-react';

const ModalContext = createContext();

export function ModalProvider({ children }) {
  const [modalState, setModalState] = useState({
    isOpen: false,
    title: '',
    message: '',
    details: '',
    type: 'confirm', // 'confirm' | 'alert' | 'logout' | 'delete' | 'reset'
    confirmText: 'Onayla',
    cancelText: 'Vazgeç',
    confirmVariant: 'emerald', // 'emerald' | 'danger' | 'amber'
    icon: null,
    onConfirm: null,
    onCancel: null
  });

  // Global Reject Modal State
  const [rejectState, setRejectState] = useState({
    isOpen: false,
    title: 'Teklifi Reddet / Revize İste',
    customerName: '',
    reason: 'Kontenjan / Otel doluluğu nedeniyle revize edilmelidir.',
    onConfirm: null,
    onCancel: null
  });

  // Global PDF Save Location Modal State
  const [pdfSaveState, setPdfSaveState] = useState({
    isOpen: false,
    fileName: '',
    dontAskAgain: false,
    onSelect: null,
    onCancel: null
  });

  const showConfirm = useCallback(({
    title = 'Onay Gerekiyor',
    message = 'Bu işlemi gerçekleştirmek istediğinize emin misiniz?',
    details = '',
    type = 'confirm',
    confirmText = 'Evet, Onayla',
    cancelText = 'Vazgeç',
    confirmVariant = 'emerald',
    icon = null,
    onConfirm: paramOnConfirm = null,
    onCancel: paramOnCancel = null
  }) => {
    return new Promise((resolve) => {
      setModalState({
        isOpen: true,
        title,
        message,
        details,
        type,
        confirmText,
        cancelText,
        confirmVariant,
        icon,
        onConfirm: () => {
          setModalState(prev => ({ ...prev, isOpen: false }));
          if (typeof paramOnConfirm === 'function') {
            try { paramOnConfirm(); } catch (e) { console.error(e); }
          }
          resolve(true);
        },
        onCancel: () => {
          setModalState(prev => ({ ...prev, isOpen: false }));
          if (typeof paramOnCancel === 'function') {
            try { paramOnCancel(); } catch (e) { console.error(e); }
          }
          resolve(false);
        }
      });
    });
  }, []);

  const showRejectModal = useCallback(({
    customerName = 'Misafir',
    defaultReason = ''
  }) => {
    return new Promise((resolve) => {
      setRejectState({
        isOpen: true,
        customerName,
        reason: defaultReason,
        onConfirm: (reason) => {
          setRejectState(prev => ({ ...prev, isOpen: false }));
          resolve({ confirmed: true, reason });
        },
        onCancel: () => {
          setRejectState(prev => ({ ...prev, isOpen: false }));
          resolve({ confirmed: false, reason: '' });
        }
      });
    });
  }, []);

  const showAlert = useCallback(({
    title = 'Bilgi',
    message = '',
    details = '',
    type = 'info',
    buttonText = 'Tamam'
  }) => {
    return new Promise((resolve) => {
      setModalState({
        isOpen: true,
        title,
        message,
        details,
        type: 'alert',
        confirmText: buttonText,
        cancelText: null,
        confirmVariant: type === 'error' ? 'danger' : 'emerald',
        icon: null,
        onConfirm: () => {
          setModalState(prev => ({ ...prev, isOpen: false }));
          resolve(true);
        },
        onCancel: () => {
          setModalState(prev => ({ ...prev, isOpen: false }));
          resolve(true);
        }
      });
    });
  }, []);

  const showLogoutConfirm = useCallback((userName = 'Yönetici') => {
    return showConfirm({
      title: 'Güvenli Oturumu Kapat',
      message: `${userName}, oturumunuzu güvenli bir şekilde kapatmak istediğinize emin misiniz?`,
      details: 'Kaydedilmemiş değişiklikleriniz varsa lütfen çıkmadan önce kaydediniz.',
      type: 'logout',
      confirmText: 'Evet, Çıkış Yap',
      cancelText: 'Vazgeç',
      confirmVariant: 'danger'
    });
  }, [showConfirm]);

  const showPdfSaveLocationModal = useCallback((fileName = 'Inzar_Teklif.pdf') => {
    // 1. Eğer kullanıcı daha önce 'bir daha sorma' demişse kayıtlı tercihi doğrudan döndür (modal açılmaz)
    const dontAsk = localStorage.getItem('INZAR_PDF_DONT_ASK_AGAIN') === 'true';
    const savedPref = localStorage.getItem('INZAR_PDF_SAVE_LOCATION_PREF');
    if (dontAsk && savedPref) {
      return Promise.resolve(savedPref);
    }

    // 2. Değilse şık mini seçim modalını aç
    return new Promise((resolve) => {
      setPdfSaveState({
        isOpen: true,
        fileName,
        dontAskAgain: false,
        onSelect: (mode, remember) => {
          if (remember) {
            localStorage.setItem('INZAR_PDF_DONT_ASK_AGAIN', 'true');
            localStorage.setItem('INZAR_PDF_SAVE_LOCATION_PREF', mode);
          }
          setPdfSaveState(prev => ({ ...prev, isOpen: false }));
          resolve(mode);
        },
        onCancel: () => {
          setPdfSaveState(prev => ({ ...prev, isOpen: false }));
          resolve(null);
        }
      });
    });
  }, []);

  const closeModal = () => {
    if (modalState.onCancel) modalState.onCancel();
    setModalState(prev => ({ ...prev, isOpen: false }));
  };

  return (
    <ModalContext.Provider value={{ showConfirm, showAlert, showLogoutConfirm, showRejectModal, showPdfSaveLocationModal }}>
      {children}

      {/* GLOBAL CUSTOM INZAR MODAL */}
      {modalState.isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-[480px] rounded-3xl bg-white p-6 sm:p-8 shadow-2xl border border-slate-200/90 animate-fade-scale text-center flex flex-col items-center">
            
            {/* Close Button */}
            <button
              onClick={closeModal}
              className="absolute right-4 top-4 rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Icon Header */}
            <div className="mb-4">
              {modalState.type === 'logout' ? (
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 shadow-sm">
                  <LogOut className="h-8 w-8" />
                </div>
              ) : modalState.type === 'delete' ? (
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 shadow-sm">
                  <Trash2 className="h-8 w-8" />
                </div>
              ) : modalState.confirmVariant === 'danger' ? (
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 shadow-sm">
                  <ShieldAlert className="h-8 w-8" />
                </div>
              ) : modalState.confirmVariant === 'amber' ? (
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 shadow-sm">
                  <AlertTriangle className="h-8 w-8" />
                </div>
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 shadow-sm">
                  <CheckCircle2 className="h-8 w-8" />
                </div>
              )}
            </div>

            {/* Title & Message */}
            <h3 className="text-xl font-black font-display tracking-tight text-slate-900 mb-2">
              {modalState.title}
            </h3>
            
            <p className="text-xs font-semibold text-slate-600 mb-2 leading-relaxed">
              {modalState.message}
            </p>

            {modalState.details && (
              <p className="text-[11px] text-slate-500 bg-slate-50 p-3 rounded-2xl border border-slate-200/80 mb-5 w-full font-medium">
                {modalState.details}
              </p>
            )}

            {/* Action Buttons */}
            <div className="flex items-center gap-3 w-full mt-2">
              {modalState.cancelText && (
                <button
                  type="button"
                  onClick={modalState.onCancel}
                  className="flex-1 rounded-2xl bg-slate-100 hover:bg-slate-200 py-3 text-xs font-bold text-slate-700 transition-all cursor-pointer"
                >
                  {modalState.cancelText}
                </button>
              )}

              <button
                type="button"
                onClick={modalState.onConfirm}
                className={`flex-1 rounded-2xl py-3 text-xs font-black text-white shadow-md transition-all cursor-pointer ${
                  modalState.confirmVariant === 'danger'
                    ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/25'
                    : modalState.confirmVariant === 'amber'
                    ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/25'
                    : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/25'
                }`}
              >
                {modalState.confirmText}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* GLOBAL REJECT MODAL (Tüm Ekrana Yayılan Tam Blur ve Tam Ortada Kart) */}
      {rejectState.isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-[500px] rounded-3xl bg-white p-6 sm:p-8 shadow-2xl border border-slate-200/90 animate-fade-scale text-left flex flex-col space-y-4">
            
            {/* Close Button */}
            <button
              onClick={rejectState.onCancel}
              className="absolute right-4 top-4 rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Header with Icon */}
            <div className="flex items-center gap-3.5 pb-3 border-b border-slate-100">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 shadow-sm">
                <ShieldAlert className="h-7 w-7" />
              </div>
              <div>
                <h3 className="text-lg font-black font-display tracking-tight text-slate-900">
                  Teklifi Reddet / Revize İste
                </h3>
                <p className="text-xs font-semibold text-slate-500">
                  <strong className="text-slate-800">{rejectState.customerName}</strong> misafirinin teklifini reddetme gerekçesini belirtin.
                </p>
              </div>
            </div>

            {/* Textarea Only */}
            <div className="space-y-2 pt-1">
              <label className="block text-xs font-bold text-slate-700">Açıklama / Karar Notu *</label>
              <textarea
                rows={4}
                autoFocus
                value={rejectState.reason}
                onChange={(e) => setRejectState(prev => ({ ...prev, reason: e.target.value }))}
                placeholder="Lütfen teklifin reddedilme veya revize edilme gerekçesini detaylıca yazınız..."
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3.5 text-xs font-semibold text-slate-900 focus:bg-white focus:border-rose-500 focus:outline-none shadow-3xs"
              />
            </div>

            {/* Modal Actions */}
            <div className="flex items-center gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={rejectState.onCancel}
                className="flex-1 rounded-2xl bg-slate-100 hover:bg-slate-200 py-3 text-xs font-bold text-slate-700 transition-all cursor-pointer text-center"
              >
                Vazgeç
              </button>

              <button
                type="button"
                onClick={() => rejectState.onConfirm && rejectState.onConfirm(rejectState.reason)}
                className="flex-1 rounded-2xl py-3 text-xs font-black text-white bg-rose-600 hover:bg-rose-700 shadow-md shadow-rose-600/25 transition-all cursor-pointer text-center"
              >
                Teklifi Resmi Olarak Reddet
              </button>
            </div>

          </div>
        </div>
      )}
      {/* GLOBAL PDF SAVE LOCATION MINI MODAL (Kayıt Yeri Sorma ve Bir Daha Gösterme) */}
      {pdfSaveState.isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md animate-fade-in font-sans">
          <div className="relative w-full max-w-[460px] rounded-3xl bg-white p-6 sm:p-7 shadow-2xl border border-slate-200/90 animate-fade-scale text-left flex flex-col space-y-4">
            
            {/* Close Button */}
            <button
              onClick={pdfSaveState.onCancel}
              className="absolute right-4 top-4 rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Header */}
            <div className="flex items-center gap-3.5 pb-2 border-b border-slate-100">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 shadow-xs">
                <FolderDown className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-black font-display tracking-tight text-slate-900">
                  PDF Kayıt Konumu Tercihi
                </h3>
                <p className="text-xs text-slate-500 font-medium truncate max-w-[300px]">
                  {pdfSaveState.fileName}
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 font-medium">
              Resmi teklif mektubu PDF belgesini nasıl indirmek istersiniz?
            </p>

            {/* 2 Seçenek Kartı */}
            <div className="grid grid-cols-1 gap-2.5">
              {/* Seçenek 1: Konum Seç (Farklı Kaydet) */}
              <button
                type="button"
                onClick={() => pdfSaveState.onSelect('picker', pdfSaveState.dontAskAgain)}
                className="w-full p-3.5 rounded-2xl border-2 border-slate-200 hover:border-emerald-500 bg-slate-50/50 hover:bg-emerald-50/60 transition-all text-left group cursor-pointer flex items-center justify-between shadow-2xs hover:scale-[1.01]"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-white border border-slate-200 group-hover:border-emerald-300 text-emerald-700 flex items-center justify-center shadow-3xs shrink-0">
                    <FolderDown className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-xs font-black text-slate-900 group-hover:text-emerald-950 flex items-center gap-1.5">
                      <span>Farklı Kaydet (Konum & Klasör Seç)</span>
                      <span className="px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 text-[9px] font-bold">Önerilen</span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Dosya yöneticisi açılır, kaydedilecek klasörü siz seçersiniz.
                    </div>
                  </div>
                </div>
              </button>

              {/* Seçenek 2: Hızlı İndir (İndirilenler Klasörü) */}
              <button
                type="button"
                onClick={() => pdfSaveState.onSelect('direct', pdfSaveState.dontAskAgain)}
                className="w-full p-3.5 rounded-2xl border border-slate-200 hover:border-slate-400 bg-slate-50/50 hover:bg-slate-100/70 transition-all text-left group cursor-pointer flex items-center justify-between shadow-3xs"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-white border border-slate-200 text-slate-700 flex items-center justify-center shadow-3xs shrink-0">
                    <Download className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-800">
                      Hızlı İndir (İndirilenler Klasörü)
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Soru sormadan doğrudan tarayıcının İndirilenler klasörüne kaydeder.
                    </div>
                  </div>
                </div>
              </button>
            </div>

            {/* "Bu tercihimi hatırla, bir daha sorma" Checkbox */}
            <div className="pt-2">
              <label 
                className="inline-flex items-center gap-2.5 text-xs font-semibold text-slate-700 cursor-pointer select-none"
                onClick={() => setPdfSaveState(prev => ({ ...prev, dontAskAgain: !prev.dontAskAgain }))}
              >
                <div className={`h-4.5 w-4.5 rounded-md border flex items-center justify-center transition-colors ${
                  pdfSaveState.dontAskAgain 
                    ? 'bg-emerald-600 border-emerald-600 text-white shadow-3xs' 
                    : 'border-slate-300 bg-white'
                }`}>
                  {pdfSaveState.dontAskAgain && <Check className="h-3 w-3 stroke-[3]" />}
                </div>
                <span>Bu tercihimi hatırla, bir daha karşıma çıkarma</span>
              </label>
            </div>

            {/* Footer Buttons */}
            <div className="pt-2 flex justify-end border-t border-slate-100">
              <button
                type="button"
                onClick={pdfSaveState.onCancel}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer"
              >
                Vazgeç
              </button>
            </div>

          </div>
        </div>
      )}

    </ModalContext.Provider>
  );
}

export function useModal() {
  return useContext(ModalContext);
}
