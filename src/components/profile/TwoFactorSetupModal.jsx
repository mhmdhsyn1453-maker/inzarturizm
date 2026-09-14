import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import QRCode from 'qrcode';
import {
  ShieldCheck,
  Smartphone,
  Copy,
  Check,
  AlertCircle,
  Key,
  Lock,
  RefreshCw,
  X,
  ArrowRight,
  Download,
  Sparkles
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { generateTOTPSecret, getTOTPUri, verifyTOTPToken, generateBackupCodes } from '../../utils/totp';

export default function TwoFactorSetupModal({ isOpen, onClose, user, onSetupComplete }) {
  const [step, setStep] = useState(1); // 1: QR & Secret, 2: Backup Codes
  const [secret, setSecret] = useState('');
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [verifyCode, setVerifyCode] = useState('');
  const [backupCodes, setBackupCodes] = useState([]);
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [copiedBackup, setCopiedBackup] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const wasOpenRef = React.useRef(false);

  useEffect(() => {
    // Only initialize when modal OPENS (false → true), not on every user prop change
    if (isOpen && !wasOpenRef.current && user) {
      const newSecret = generateTOTPSecret(16);
      setSecret(newSecret);
      setVerifyCode('');
      setErrorMsg('');
      setStep(1);
      setCopiedSecret(false);
      setCopiedBackup(false);
      setBackupCodes([]);

      const uri = getTOTPUri(user.username || user.name || 'Kullanici', newSecret, 'İnzar Turizm');
      QRCode.toDataURL(uri, {
        width: 220,
        margin: 1.5,
        color: {
          dark: '#064e3b',
          light: '#ffffff'
        }
      })
        .then(url => setQrDataUrl(url))
        .catch(err => console.error('QR generation error:', err));
    }
    wasOpenRef.current = isOpen;
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopySecret = () => {
    navigator.clipboard.writeText(secret);
    setCopiedSecret(true);
    setTimeout(() => setCopiedSecret(false), 2000);
  };

  const handleCopyBackupCodes = () => {
    navigator.clipboard.writeText(backupCodes.join('\n'));
    setCopiedBackup(true);
    setTimeout(() => setCopiedBackup(false), 2000);
  };

  const handleDownloadBackupCodes = () => {
    const text = `İNZAR TURİZM - 2FA KURTARMA KODLARI\nKullanıcı: ${user?.username || user?.name}\nTarih: ${new Date().toLocaleString('tr-TR')}\n\nBu kodlar telefonunuzu kaybetmeniz durumunda sisteme giriş yapabilmeniz içindir. Her kod yalnızca 1 kez kullanılabilir:\n\n${backupCodes.join('\n')}`;
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inzar-2fa-kurtarma-kodlari-${user?.username || 'user'}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    if (!verifyCode || verifyCode.length !== 6) {
      setErrorMsg('Lütfen Google Authenticator uygulamasındaki 6 haneli kodu eksiksiz giriniz.');
      return;
    }

    setIsVerifying(true);
    setErrorMsg('');

    try {
      const isValid = await verifyTOTPToken(secret, verifyCode);
      if (isValid) {
        const codes = generateBackupCodes(5);
        setBackupCodes(codes);
        // 🛡️ Save 2FA settings immediately so user doesn't lose it if they close
        onSetupComplete({
          twoFactorEnabled: true,
          twoFactorSecret: secret,
          twoFactorBackupCodes: codes
        });
        setStep(2);
        confetti({
          particleCount: 50,
          spread: 70,
          origin: { y: 0.6 }
        });
      } else {
        setErrorMsg('Girdiğiniz 6 haneli kod doğrulanamadı. Lütfen telefonunuzun saat ayarını ve kodu kontrol edip tekrar deneyiniz.');
      }
    } catch (err) {
      setErrorMsg('Doğrulama sırasında bir hata oluştu.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleFinish = () => {
    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-fade-in">
      <div className="pearl-card w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 p-6 sm:p-7 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-5 animate-scale-in">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className={`flex h-10 w-10 items-center justify-center rounded-2xl border shadow-2xs transition-all duration-500 ${
              step === 2 
                ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700 animate-success-pulse' 
                : 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/60'
            }`}>
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white font-display flex items-center gap-2">
                <span>Google Authenticator (2FA) Kurulumu</span>
                <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full transition-all duration-300 ${
                  step === 2 
                    ? 'bg-emerald-500 text-white' 
                    : 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300'
                }`}>
                  {step === 1 ? 'Adım 1/2' : 'Adım 2/2 ✓'}
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Hesabınızı iki aşamalı şifreleme ile bankacılık seviyesinde koruyun.
              </p>
              {/* Step Progress Bar */}
              <div className="mt-2 h-1 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div 
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-700 ease-out"
                  style={{ width: step === 1 ? '50%' : '100%' }}
                />
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Step 1: QR & Code Verification */}
        {step === 1 && (
          <div className="space-y-4 animate-step-enter">
            <div className="p-3.5 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-900/60 text-xs text-emerald-950 dark:text-emerald-200 space-y-1.5 animate-stagger-1">
              <div className="font-bold flex items-center gap-1.5 text-emerald-900 dark:text-emerald-300">
                <Smartphone className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
                <span>Nasıl Kurulur?</span>
              </div>
              <ol className="list-decimal list-inside space-y-1 text-[11.5px] text-emerald-900/90 dark:text-emerald-300/90 leading-relaxed">
                <li>Telefonunuza <strong>Google Authenticator</strong> uygulamasını açın (yoksa ücretsiz indirin).</li>
                <li>Uygulamadaki <strong>sağ alttaki (+) butonuna</strong> basıp <strong>QR Kodu Tara</strong>'yı seçin.</li>
                <li>Aşağıdaki QR kodu telefonunuzun kamerasıyla okutun.</li>
              </ol>
            </div>

            {/* QR Code and Secret Key Container */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 animate-stagger-2">
              <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-xs shrink-0">
                {qrDataUrl ? (
                  <img src={qrDataUrl} alt="2FA QR Kodu" className="w-36 h-36 rounded-lg" />
                ) : (
                  <div className="w-36 h-36 flex items-center justify-center text-slate-400">
                    <RefreshCw className="h-6 w-6 animate-spin" />
                  </div>
                )}
              </div>

              <div className="space-y-2 text-center sm:text-left flex-1 min-w-0">
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                  Kamera Okumazsa Manuel Anahtar:
                </span>
                <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700">
                  <Key className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <code className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200 tracking-widest truncate">
                    {secret}
                  </code>
                  <button
                    type="button"
                    onClick={handleCopySecret}
                    className="p-1 text-slate-400 hover:text-emerald-700 dark:hover:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 rounded-lg transition-all ml-auto cursor-pointer"
                    title="Anahtarı Kopyala"
                  >
                    {copiedSecret ? <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400" /> : <Copy className="h-4 w-4" />}
                  </button>
                </div>
                <p className="text-[10px] text-slate-400 dark:text-slate-500">
                  Authenticator uygulamasında "Kurulum Anahtarı Girin" seçeneğini kullanarak bu kodu yapıştırabilirsiniz.
                </p>
              </div>
            </div>

            {/* Verification Input Form */}
            <form onSubmit={handleVerify} className="space-y-3 pt-1 animate-stagger-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Telefonda Oluşan 6 Haneli Kodu Girin:
                </label>
                <div className="relative">
                  <input
                    type="text"
                    maxLength={6}
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={verifyCode}
                    onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="000000"
                    className="w-full text-center tracking-[0.5em] font-mono text-xl font-black py-2.5 px-4 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 focus:bg-white dark:focus:bg-slate-900 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all outline-hidden text-slate-900 dark:text-white"
                  />
                  <Lock className="h-4 w-4 text-slate-400 dark:text-slate-500 absolute left-4 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              {errorMsg && (
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-400 text-xs font-semibold animate-shake">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isVerifying || verifyCode.length !== 6}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-gradient-to-r from-emerald-700 to-emerald-600 hover:from-emerald-600 hover:to-emerald-500 text-white font-bold text-sm shadow-md shadow-emerald-700/20 hover:scale-101 active:scale-98 transition-all cursor-pointer disabled:opacity-50"
              >
                {isVerifying ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <span>Doğrula ve 2FA'yı Aktif Et</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* Step 2: Backup Codes */}
        {step === 2 && (
          <div className="space-y-4 animate-scale-in">
            <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 text-xs text-emerald-950 dark:text-emerald-200 space-y-1">
              <div className="font-extrabold text-emerald-900 dark:text-emerald-300 flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <span>Tebrikler! Google Authenticator 2FA Koruması Başarıyla Açıldı</span>
              </div>
              <p className="text-[11.5px] text-emerald-800 dark:text-emerald-300/90 leading-relaxed">
                Telefonunuzu kaybetmeniz veya sıfırlamanız durumunda hesabınıza erişebilmeniz için aşağıdaki <strong>tek kullanımlık kurtarma kodlarını</strong> güvenli bir yere kaydedin.
              </p>
            </div>

            {/* Backup Codes Grid */}
            <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                Acil Durum Kurtarma Kodlarınız:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {backupCodes.map((code, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between px-3 py-2 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 font-mono text-xs font-bold text-slate-800 dark:text-slate-200 shadow-2xs"
                  >
                    <span>{idx + 1}. {code}</span>
                    <span className="text-[9px] font-semibold text-slate-400 dark:text-slate-500 uppercase">1 Kez</span>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleCopyBackupCodes}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold border border-slate-300 dark:border-slate-700 transition-all cursor-pointer shadow-2xs"
                >
                  {copiedBackup ? <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                  <span>{copiedBackup ? 'Kopyalandı!' : 'Kodları Kopyala'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleDownloadBackupCodes}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold border border-slate-300 dark:border-slate-700 transition-all cursor-pointer shadow-2xs"
                >
                  <Download className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Dosya Olarak İndir (.txt)</span>
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={handleFinish}
              className="w-full py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-md shadow-emerald-600/20 hover:scale-101 active:scale-98 transition-all cursor-pointer text-center"
            >
              Kurulumu Tamamla ve Kapat
            </button>
          </div>
        )}

      </div>
    </div>,
    document.body
  );
}
