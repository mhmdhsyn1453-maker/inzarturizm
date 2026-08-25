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

  const showConfirm = useCallback(({
    title = 'Onay Gerekiyor',
    message = 'Bu işlemi gerçekleştirmek istediğinize emin misiniz?',
    details = '',
    type = 'confirm',
    confirmText = 'Evet, Onayla',
    cancelText = 'Vazgeç',
    confirmVariant = 'emerald',
    icon = null
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
          resolve(true);
        },
        onCancel: () => {
          setModalState(prev => ({ ...prev, isOpen: false }));
          resolve(false);
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

  const closeModal = () => {
    if (modalState.onCancel) modalState.onCancel();
    setModalState(prev => ({ ...prev, isOpen: false }));
  };

  return (
    <ModalContext.Provider value={{ showConfirm, showAlert, showLogoutConfirm }}>
      {children}

      {/* GLOBAL CUSTOM INZAR MODAL */}
      {modalState.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-[460px] rounded-3xl bg-white p-6 sm:p-7 shadow-2xl border border-slate-200/90 animate-fade-scale text-center flex flex-col items-center">
            
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
              ) : modalState.confirmVariant === 'danger' ? (
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 shadow-sm">
                  <Trash2 className="h-8 w-8" />
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
            <h3 className="text-lg font-black font-display tracking-tight text-slate-900 mb-1.5">
              {modalState.title}
            </h3>
            
            <p className="text-xs font-semibold text-slate-600 mb-2 leading-relaxed">
              {modalState.message}
            </p>

            {modalState.details && (
              <p className="text-[11px] text-slate-400 bg-slate-50 p-2.5 rounded-xl border border-slate-200/60 mb-5 w-full">
                {modalState.details}
              </p>
            )}

            {/* Action Buttons */}
            <div className="flex items-center gap-3 w-full mt-3">
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
    </ModalContext.Provider>
  );
}

export function useModal() {
  return useContext(ModalContext);
}
