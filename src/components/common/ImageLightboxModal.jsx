import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, User, Download, ShieldCheck, MapPin } from 'lucide-react';

export default function ImageLightboxModal({
  isOpen,
  imageSrc,
  userName,
  userRole,
  userBranch,
  onClose
}) {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', handleKeyDown);
    // Prevent background scrolling while modal is open
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen || !imageSrc) return null;

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = imageSrc;
    link.download = `${(userName || 'kullanici').replace(/\s+/g, '_')}_profil.jpg`;
    link.click();
  };

  const modalContent = (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[99999] flex items-center justify-center p-4 sm:p-8 bg-black/80 backdrop-blur-md animate-fade-in font-sans cursor-zoom-out select-none"
      style={{ margin: 0 }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative max-w-lg w-full bg-slate-900/95 rounded-3xl p-5 sm:p-6 border border-slate-800 shadow-2xl space-y-4 animate-scale-up cursor-default overflow-hidden"
      >
        {/* Top bar header */}
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold text-xs shadow-inner">
              <User className="h-4 w-4" />
            </div>
            <div>
              <h4 className="text-white font-extrabold text-sm">{userName || 'Kullanıcı Fotoğrafı'}</h4>
              <div className="text-[11px] text-slate-400 font-medium flex items-center gap-2 flex-wrap mt-0.5">
                {userRole && (
                  <span className="text-emerald-400 font-bold flex items-center gap-1">
                    <ShieldCheck className="h-3 w-3" /> {userRole}
                  </span>
                )}
                {userBranch && (
                  <span className="text-slate-400 flex items-center gap-1">
                    <MapPin className="h-3 w-3 text-slate-500" /> {userBranch}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleDownload}
              className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 border border-transparent hover:border-slate-700 transition-all cursor-pointer"
              title="Fotoğrafı İndir"
            >
              <Download className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 border border-transparent hover:border-slate-700 transition-all cursor-pointer"
              title="Kapat (Esc)"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* High-Resolution Image Container */}
        <div className="relative rounded-2xl overflow-hidden bg-slate-950/80 border border-slate-800/80 flex items-center justify-center min-h-[260px] max-h-[65vh] p-2">
          <img
            src={imageSrc}
            alt={userName || 'Profil Fotoğrafı'}
            className="max-h-[60vh] w-auto max-w-full rounded-xl object-contain shadow-2xl transition-all"
          />
        </div>

        {/* Bottom hint */}
        <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
          <span>Kapatmak için dış alana tıklayabilir veya <strong className="text-slate-400 font-mono">Esc</strong> tuşuna basabilirsiniz.</span>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
