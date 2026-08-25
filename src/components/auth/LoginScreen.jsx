import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { soundService } from '../../services/soundService';
import lottie from 'lottie-web';
import fingerprintAnimation from '../../assets/fingerprint_verification.json';
import inzarLogo from '../../assets/inzarturizmlogo.png';
import { 
  Lock, 
  User, 
  Crown,
  ShieldCheck, 
  ArrowRight, 
  AlertCircle,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Fingerprint
} from 'lucide-react';

// 💎 1. High-Precision Swiss/Optic Crystal Lens Interactive Eye
function RealisticPasswordEye({ isFocused, isPasswordVisible, onToggle }) {
  const eyeRef = useRef(null);
  const [pupilOffset, setPupilOffset] = useState({ x: 0, y: 0 });
  const [isBlinking, setIsBlinking] = useState(false);

  useEffect(() => {
    let blinkTimer;
    let blinkEndTimer;

    const scheduleNextBlink = () => {
      const delay = Math.random() * 3000 + 2500;
      blinkTimer = setTimeout(() => {
        if (!isFocused || isPasswordVisible) {
          setIsBlinking(true);
          blinkEndTimer = setTimeout(() => {
            setIsBlinking(false);
            if (Math.random() > 0.75) {
              setTimeout(() => {
                setIsBlinking(true);
                setTimeout(() => setIsBlinking(false), 120);
              }, 160);
            }
          }, 140);
        }
        scheduleNextBlink();
      }, delay);
    };

    scheduleNextBlink();

    return () => {
      clearTimeout(blinkTimer);
      clearTimeout(blinkEndTimer);
    };
  }, [isFocused, isPasswordVisible]);

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (isFocused && !isPasswordVisible) return;
      if (!eyeRef.current) return;

      const rect = eyeRef.current.getBoundingClientRect();
      const eyeCenterX = rect.left + rect.width / 2;
      const eyeCenterY = rect.top + rect.height / 2;

      const dx = e.clientX - eyeCenterX;
      const dy = e.clientY - eyeCenterY;
      const angle = Math.atan2(dy, dx);
      const dist = Math.hypot(dx, dy);

      const maxOffsetX = 3.6;
      const maxOffsetY = 2.2;
      const travel = Math.min(1, dist / 80);

      setPupilOffset({
        x: Math.cos(angle) * maxOffsetX * travel,
        y: Math.sin(angle) * maxOffsetY * travel
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [isFocused, isPasswordVisible]);

  const isClosed = (isFocused && !isPasswordVisible) || isBlinking;

  return (
    <button
      type="button"
      onClick={onToggle}
      ref={eyeRef}
      title={isPasswordVisible ? 'Şifreyi Gizle' : 'Şifreyi Göster'}
      className="relative w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-emerald-700 hover:bg-emerald-50/60 transition-all duration-200 cursor-pointer select-none group"
    >
      <svg 
        viewBox="0 0 24 24" 
        className="w-5 h-5 fill-none stroke-current stroke-[1.7] overflow-visible"
      >
        {isClosed ? (
          <g className="transition-all duration-200">
            <path 
              d="M3.5 12.8C6.5 15.8 10 17 12 17C14 17 17.5 15.8 20.5 12.8" 
              strokeLinecap="round" 
              className="stroke-slate-400 group-hover:stroke-emerald-700 transition-colors"
            />
            <path d="M6 14.8L4.5 16.8" strokeLinecap="round" className="stroke-slate-400/80" />
            <path d="M12 17L12 19.5" strokeLinecap="round" className="stroke-slate-400/80" />
            <path d="M18 14.8L19.5 16.8" strokeLinecap="round" className="stroke-slate-400/80" />
          </g>
        ) : (
          <g>
            <path 
              d="M2.5 12C4.8 7.2 8.2 5 12 5C15.8 5 19.2 7.2 21.5 12C19.2 16.8 15.8 19 12 19C8.2 19 4.8 16.8 2.5 12Z" 
              className="stroke-slate-400 group-hover:stroke-emerald-700 transition-colors"
            />
            <circle 
              cx={12 + pupilOffset.x} 
              cy={12 + pupilOffset.y} 
              r="3.3" 
              className="fill-emerald-600 stroke-slate-900 stroke-[0.8] transition-transform duration-75 ease-out"
            />
            <circle 
              cx={12 + pupilOffset.x} 
              cy={12 + pupilOffset.y} 
              r="1.6" 
              className="fill-slate-950"
            />
            <circle 
              cx={12 + pupilOffset.x - 0.9} 
              cy={12 + pupilOffset.y - 0.9} 
              r="0.75" 
              className="fill-white drop-shadow-xs"
            />
          </g>
        )}
      </svg>
    </button>
  );
}

// Lightweight 60fps Magnetic Particle Canvas (Pure Pearl & Crystal Ice particles)
function AmbientParticleCanvas() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    let mouse = { x: -1000, y: -1000, radius: 180 };

    const handleMouseMove = (e) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    };
    window.addEventListener('mousemove', handleMouseMove);

    const particleCount = Math.min(Math.floor(width / 28), 55);
    const particles = [];

    const colors = [
      'rgba(16, 185, 129, 0.40)',  // Crisp Emerald
      'rgba(14, 165, 233, 0.35)',  // Ice Sky
      'rgba(71, 85, 105, 0.30)',   // Pearl Slate
      'rgba(20, 184, 166, 0.35)',  // Crisp Teal
      'rgba(148, 163, 184, 0.35)', // Platinum Silver
    ];

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        originX: Math.random() * width,
        originY: Math.random() * height,
        radius: Math.random() * 2.5 + 1.2,
        color: colors[Math.floor(Math.random() * colors.length)],
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        baseRadius: Math.random() * 2.5 + 1.2,
        pulseSpeed: Math.random() * 0.02 + 0.01,
        pulseAngle: Math.random() * Math.PI * 2
      });
    }

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        p.x += p.vx;
        p.y += p.vy;

        if (p.x < -15) p.x = width + 15;
        if (p.x > width + 15) p.x = -15;
        if (p.y < -15) p.y = height + 15;
        if (p.y > height + 15) p.y = -15;

        p.pulseAngle += p.pulseSpeed;
        const currentRadius = p.baseRadius + Math.sin(p.pulseAngle) * 0.6;

        const dx = mouse.x - p.x;
        const dy = mouse.y - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < mouse.radius && dist > 5) {
          const force = (mouse.radius - dist) / mouse.radius;
          p.x += (dx / dist) * force * 2.8;
          p.y += (dy / dist) * force * 2.8;
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, Math.max(0.6, currentRadius), 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.shadowBlur = 6;
        ctx.shadowColor = p.color;
        ctx.fill();
        ctx.shadowBlur = 0;

        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dist2 = Math.hypot(p.x - p2.x, p.y - p2.y);
          if (dist2 < 95) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = `rgba(16, 185, 129, ${(1 - dist2 / 95) * 0.12})`;
            ctx.lineWidth = 0.7;
            ctx.stroke();
          }
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none z-0" />;
}

// Bulletproof Fingerprint Lottie Component that GUARANTEES playing only once and stopping permanently
function FingerprintLottiePlayer({ onDone }) {
  const containerRef = useRef(null);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    if (!containerRef.current) return;
    containerRef.current.innerHTML = '';

    const anim = lottie.loadAnimation({
      container: containerRef.current,
      renderer: 'svg',
      loop: false,
      autoplay: false,
      animationData: fingerprintAnimation,
      rendererSettings: {
        preserveAspectRatio: 'xMidYMid meet',
        progressiveLoad: true,
        hideOnTransparent: false
      }
    });

    anim.setSpeed(1.1);

    let hasCompleted = false;

    const handleEnterFrame = (e) => {
      if (e.currentTime >= 97 && !hasCompleted) {
        hasCompleted = true;
        anim.removeEventListener('enterFrame', handleEnterFrame);
        anim.goToAndStop(98, true);
        if (onDoneRef.current) {
          onDoneRef.current();
        }
      }
    };

    const handleComplete = () => {
      if (!hasCompleted) {
        hasCompleted = true;
        anim.goToAndStop(98, true);
        if (onDoneRef.current) {
          onDoneRef.current();
        }
      }
    };

    anim.addEventListener('enterFrame', handleEnterFrame);
    anim.addEventListener('complete', handleComplete);

    anim.play();

    return () => {
      try {
        anim.removeEventListener('enterFrame', handleEnterFrame);
        anim.removeEventListener('complete', handleComplete);
        anim.destroy();
      } catch (e) {}
    };
  }, []);

  return (
    <div className="relative mx-auto flex items-center justify-center my-3">
      <div className="w-36 h-36 sm:w-44 sm:h-44 rounded-full bg-gradient-to-br from-white via-slate-50 to-emerald-50 p-2 shadow-2xl ring-8 ring-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center overflow-hidden">
        <div ref={containerRef} className="w-32 h-32 sm:w-36 sm:h-36 flex items-center justify-center scale-125" />
      </div>
    </div>
  );
}

export default function LoginScreen() {
  const { login, users } = useAuth();
  
  // Remember Me state
  const [username, setUsername] = useState(() => {
    try {
      return localStorage.getItem('inzar_remembered_username') || '';
    } catch (e) {
      return '';
    }
  });
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(() => {
    try {
      return localStorage.getItem('inzar_remember_me') === 'true';
    } catch (e) {
      return false;
    }
  });

  const [showPassword, setShowPassword] = useState(false);
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);

  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isShaking, setIsShaking] = useState(false);
  
  // CapsLock Detection State
  const [isCapsLockOn, setIsCapsLockOn] = useState(false);

  // Interactive Cursor Ambient Glow Position
  const [mousePos, setMousePos] = useState({ x: -500, y: -500 });
  
  // 🪙 3D Vertical Coin Flip & Biometric State
  const [isFlipped, setIsFlipped] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [scannedUser, setScannedUser] = useState(null);
  const [pendingCredentials, setPendingCredentials] = useState(null);
  
  // Rate-limiting / Brute-force protection
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutTimer, setLockoutTimer] = useState(0);

  useEffect(() => {
    let timer;
    if (lockoutTimer > 0) {
      timer = setInterval(() => {
        setLockoutTimer(prev => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [lockoutTimer]);

  const handleMouseMove = (e) => {
    setMousePos({ x: e.clientX, y: e.clientY });
  };

  const handlePasswordKeyEvents = (e) => {
    if (e.getModifierState) {
      setIsCapsLockOn(e.getModifierState('CapsLock'));
    }
  };

  const toggleRememberMe = () => {
    const nextState = !rememberMe;
    setRememberMe(nextState);
    if (!nextState) {
      localStorage.removeItem('inzar_remembered_username');
      localStorage.setItem('inzar_remember_me', 'false');
    }
  };

  const startBiometricVerification = (validUser, userStr, passStr) => {
    setScannedUser(validUser);
    setPendingCredentials({ userStr, passStr });
    setIsVerified(false);

    // 🔊 1. Play 3D Flip Whoosh Sound & trigger 3D coin rotation!
    soundService.playFlipWhoosh();
    setIsFlipped(true);

    if (rememberMe) {
      localStorage.setItem('inzar_remembered_username', userStr);
      localStorage.setItem('inzar_remember_me', 'true');
    } else {
      localStorage.removeItem('inzar_remembered_username');
      localStorage.setItem('inzar_remember_me', 'false');
    }
  };

  const handleLottieDone = () => {
    // 🔊 2. Play Crystal Success Chime!
    soundService.playSuccessChime();
    setIsVerified(true);
    setTimeout(async () => {
      if (pendingCredentials) {
        await login(pendingCredentials.userStr, pendingCredentials.passStr, true);
      }
    }, 450);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (lockoutTimer > 0 || isFlipped) return;
    setErrorMsg('');

    const cleanUser = username.trim();
    const cleanPass = password.trim();

    if (!cleanUser || !cleanPass) {
      triggerError('Kullanıcı adı ve şifrenizi giriniz.');
      return;
    }

    setIsLoading(true);

    try {
      const result = await login(cleanUser, cleanPass, false);
      setIsLoading(false);

      if (!result.success) {
        const newFailed = failedAttempts + 1;
        setFailedAttempts(newFailed);
        if (newFailed >= 5) {
          setLockoutTimer(30);
          triggerError('Çok sayıda hatalı deneme! 30sn kilitlendi.');
        } else {
          triggerError(result.message);
        }
      } else {
        setFailedAttempts(0);
        startBiometricVerification(result.user, cleanUser, cleanPass);
      }
    } catch (err) {
      setIsLoading(false);
      triggerError('Giriş yapılırken bir hata oluştu.');
    }
  };

  const triggerError = (msg) => {
    setErrorMsg(msg);
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 500);
  };

  const handleQuickLogin = (u, p) => {
    if (lockoutTimer > 0 || isFlipped) return;
    setUsername(u);
    setPassword(p);
    setErrorMsg('');
    setIsLoading(true);

    setTimeout(() => {
      const result = login(u, p, false);
      setIsLoading(false);
      if (result.success) {
        setFailedAttempts(0);
        startBiometricVerification(result.user, u, p);
      } else {
        triggerError(result.message);
      }
    }, 150);
  };

  return (
    <div 
      onMouseMove={handleMouseMove}
      className="min-h-screen w-full flex items-center justify-center p-4 relative overflow-hidden bg-gradient-to-br from-slate-100 via-slate-50 to-emerald-50/30"
    >
      
      {/* 1. LAYER: Crisp Pearl & Cool Slate Ambient Auras */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-1/4 -left-20 h-[550px] w-[550px] rounded-full bg-slate-300/30 blur-[130px] animate-breathe-1" />
        <div className="absolute -bottom-20 -right-20 h-[600px] w-[600px] rounded-full bg-teal-200/25 blur-[140px] animate-breathe-2" />
        <div className="absolute top-10 right-1/4 h-[450px] w-[450px] rounded-full bg-emerald-200/25 blur-[120px] animate-breathe-3" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[650px] w-[650px] rounded-full bg-slate-200/40 blur-[100px]" />
      </div>

      {/* 2. LAYER: Magnetic Ambient Particle Canvas */}
      <AmbientParticleCanvas />

      {/* 3. LAYER: Subtle Crystal Glow following mouse */}
      <div
        className="pointer-events-none absolute h-[400px] w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-br from-emerald-300/15 via-sky-200/15 to-transparent blur-[80px] transition-transform duration-75 ease-out z-0"
        style={{ left: `${mousePos.x}px`, top: `${mousePos.y}px` }}
      />

      {/* 🪐 3D PERSPECTIVE CONTAINER WITH REFINED ORBIT BEAM */}
      <div className={`relative w-full max-w-[620px] aspect-square z-10 [perspective:1400px] transition-transform duration-300 ${isShaking ? 'animate-shake' : 'animate-fade-scale'}`}>
        
        {/* ✨ Outer Rotating Light Ring (Strictly External) */}
        <div className="absolute -inset-[5px] rounded-full overflow-hidden pointer-events-none -z-10 shadow-[0_0_40px_rgba(16,185,129,0.2)]">
          <div 
            className="w-full h-full rounded-full animate-orbit-spin"
            style={{
              background: 'conic-gradient(from 0deg, transparent 0deg, transparent 275deg, rgba(16,185,129,0.5) 320deg, rgba(20,184,166,0.85) 350deg, rgba(255,255,255,0.95) 360deg)'
            }}
          />
        </div>

        {/* 🪙 3D VERTICAL FLIPPING CARD BODY (Y-AXIS FLIP WITH SOUND) */}
        <div 
          className={`relative w-full h-full rounded-full transition-transform duration-700 ease-out [transform-style:preserve-3d] ${
            isFlipped ? '[transform:rotateY(180deg)]' : '[transform:rotateY(0deg)]'
          }`}
        >

          {/* ══════════════════════════════════════════════════════════════
              🔹 FRONT FACE: PRESTIGIOUS LOGIN FORM
             ══════════════════════════════════════════════════════════════ */}
          <div className="absolute inset-0 w-full h-full rounded-full pt-8 pb-10 px-10 sm:px-14 bg-white border-2 border-white/90 shadow-[0_30px_70px_-15px_rgba(15,23,42,0.12)] flex flex-col items-center justify-center text-center ring-4 ring-emerald-500/10 [backface-visibility:hidden]">
            
            {/* Logo Section (Pure, Large & Elegant) */}
            <div className="mb-6 sm:mb-7 flex flex-col items-center">
              <div className="flex items-center justify-center">
                <img
                  src={inzarLogo}
                  alt="İnzar Turizm"
                  className="h-36 sm:h-44 w-auto max-w-[320px] sm:max-w-[380px] object-contain pointer-events-none"
                />
              </div>

              {/* Single-Line Title with Emerald Gradient */}
              <h2 className="text-sm sm:text-base font-extrabold font-display tracking-tight text-slate-900 mt-4">
                TARİFE & TEKLİF <span className="emerald-gradient-text">YÖNETİM SİSTEMİ</span>
              </h2>
            </div>

            {/* Lockout / Error Alert */}
            {lockoutTimer > 0 ? (
              <div className="mb-3 flex items-center gap-1.5 rounded-full bg-amber-50 px-4 py-1.5 text-xs font-semibold text-amber-900 border border-amber-300 shadow-sm animate-slide-down max-w-[340px]">
                <Clock className="h-4 w-4 shrink-0 text-amber-700" />
                <span>Güvenlik kilidi: {lockoutTimer}s</span>
              </div>
            ) : errorMsg ? (
              <div className="mb-3 flex items-center gap-1.5 rounded-full bg-rose-50 px-4 py-1.5 text-xs font-semibold text-rose-700 border border-rose-200 shadow-sm animate-slide-down max-w-[340px]">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                <span className="truncate">{errorMsg}</span>
              </div>
            ) : null}

            {/* Form Fields */}
            <form onSubmit={handleSubmit} className="w-full max-w-[340px] sm:max-w-[380px] mx-auto space-y-3.5 flex flex-col items-center">
              
              {/* Porcelain Username Input */}
              <div className="relative group w-full">
                <User className="h-4 w-4 text-slate-400 group-focus-within:text-emerald-700 absolute left-4.5 top-3.5 transition-colors duration-200" />
                <input
                  type="text"
                  required
                  disabled={lockoutTimer > 0 || isFlipped}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Kullanıcı Adı (ör. merkez, mustafa)"
                  className="w-full rounded-full bg-slate-50/90 pl-11 pr-5 py-3 text-sm text-slate-900 border border-slate-200 shadow-[inset_0_1px_2px_rgba(0,0,0,0.02),0_1px_3px_rgba(0,0,0,0.03)] focus:outline-none focus:border-emerald-600 focus:bg-white focus:ring-4 focus:ring-emerald-500/12 transition-all font-semibold disabled:opacity-50"
                />
              </div>

              {/* Porcelain Password Input + Swiss Crystal Lens Eye */}
              <div className="w-full flex flex-col items-center">
                <div className="relative group w-full">
                  <Lock className="h-4 w-4 text-slate-400 group-focus-within:text-emerald-700 absolute left-4.5 top-3.5 transition-colors duration-200" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    disabled={lockoutTimer > 0 || isFlipped}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onFocus={() => setIsPasswordFocused(true)}
                    onBlur={() => {
                      setIsPasswordFocused(false);
                      setIsCapsLockOn(false);
                    }}
                    onKeyDown={handlePasswordKeyEvents}
                    onKeyUp={handlePasswordKeyEvents}
                    placeholder="Giriş Şifresi"
                    className="w-full rounded-full bg-slate-50/90 pl-11 pr-20 py-3 text-sm text-slate-900 border border-slate-200 shadow-[inset_0_1px_2px_rgba(0,0,0,0.02),0_1px_3px_rgba(0,0,0,0.03)] focus:outline-none focus:border-emerald-600 focus:bg-white focus:ring-4 focus:ring-emerald-500/12 transition-all font-mono font-bold disabled:opacity-50"
                  />

                  {/* Right-side Action: CapsLock Indicator + Swiss Crystal Lens Eye */}
                  <div className="absolute right-3 top-2 flex items-center gap-1.5">
                    {isCapsLockOn && (
                      <span 
                        title="CapsLock Açık"
                        className="flex items-center text-amber-500 text-xs animate-pulse"
                      >
                        <AlertTriangle className="h-4 w-4" />
                      </span>
                    )}
                    
                    <RealisticPasswordEye 
                      isFocused={isPasswordFocused}
                      isPasswordVisible={showPassword}
                      onToggle={() => setShowPassword(!showPassword)}
                    />
                  </div>
                </div>

                {/* Centered Subtle CapsLock Text */}
                {isCapsLockOn && (
                  <div 
                    style={{ width: '100%', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    className="gap-1.5 text-xs text-amber-700/85 font-medium animate-slide-down pt-1.5 select-none"
                  >
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                    <span>Büyük Harf (CapsLock) Açık</span>
                  </div>
                )}
              </div>

              {/* iOS Style "Beni Hatırla" Toggle Switch Button */}
              <div className="w-full flex items-center justify-center pt-0.5">
                <button
                  type="button"
                  onClick={toggleRememberMe}
                  className="group inline-flex items-center gap-2.5 py-1 px-3.5 rounded-full hover:bg-slate-100/60 transition-all cursor-pointer select-none"
                >
                  <div
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      rememberMe ? 'bg-emerald-600' : 'bg-slate-300'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                        rememberMe ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </div>
                  <span className="text-xs font-semibold text-slate-600 group-hover:text-slate-900 transition-colors">
                    Beni Hatırla
                  </span>
                </button>
              </div>

              {/* Royal Emerald Silk Shimmer Button */}
              <button
                type="submit"
                disabled={isLoading || lockoutTimer > 0 || isFlipped}
                className="relative overflow-hidden group w-full flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-emerald-900 via-emerald-700 to-teal-800 hover:from-emerald-800 hover:to-teal-700 py-3.5 px-6 font-bold text-white shadow-lg shadow-emerald-900/25 text-sm transition-all transform active:scale-98 disabled:opacity-50 cursor-pointer"
              >
                <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" />
                
                <span className="relative z-10">{isLoading ? 'Doğrulanıyor...' : 'Güvenli Giriş Yap'}</span>
                <ArrowRight className="h-4 w-4 relative z-10 transition-transform group-hover:translate-x-0.5" />
              </button>
            </form>

            {/* Bottom NEXUS Platforms Badge */}
            <div
              className="mt-4 text-[11px] text-slate-400 font-normal flex items-center justify-center select-none tracking-wide"
              style={{ fontFamily: "'Mark Pro', 'Plus Jakarta Sans', sans-serif" }}
            >
              <span>By <strong style={{ fontWeight: 700, color: '#334155' }}>NEXUS</strong> Platforms</span>
            </div>
          </div>

          {/* ══════════════════════════════════════════════════════════════
              🔹 BACK FACE: 3D REVERSE BIOMETRIC FINGERPRINT VIEW
             ══════════════════════════════════════════════════════════════ */}
          <div className="absolute inset-0 w-full h-full rounded-full pt-8 pb-10 px-10 sm:px-14 bg-white border-2 border-white/90 shadow-[0_30px_70px_-15px_rgba(15,23,42,0.12)] flex flex-col items-center justify-center text-center ring-4 ring-emerald-500/10 [backface-visibility:hidden] [transform:rotateY(180deg)]">
            {isFlipped && (
              <div className="w-full flex flex-col items-center justify-center space-y-4 animate-fade-scale py-2">
                <FingerprintLottiePlayer onDone={handleLottieDone} />

                <div className="space-y-2.5 w-full max-w-[320px]">
                  <div className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold border shadow-xs transition-all ${isVerified ? 'bg-emerald-100 text-emerald-900 border-emerald-300 scale-105' : 'bg-slate-100 text-slate-700 border-slate-200'}`}>
                    {isVerified ? (
                      <>
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        <span>Dijital Parmak İzi Doğrulandı</span>
                      </>
                    ) : (
                      <>
                        <Fingerprint className="h-4 w-4 text-emerald-600 animate-pulse" />
                        <span>Dijital Parmak İzi Taranıyor...</span>
                      </>
                    )}
                  </div>

                  <h3 className="text-xl font-bold text-slate-900 font-display">
                    Hoş Geldiniz, {scannedUser?.name}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    {isVerified ? 'Giriş Başarılı! Yönlendiriliyorsunuz...' : 'Güvenli oturum açılıyor, lütfen bekleyiniz...'}
                  </p>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
