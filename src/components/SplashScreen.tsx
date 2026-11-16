import React, { useEffect, useState } from 'react';
import schoolSeal from '../assets/images/mma_school_seal.png';
import ictLogo from '../assets/images/mma_ict_logo.png';

interface SplashScreenProps {
  isLoading: boolean;
  onFinished?: () => void;
  statusMessage?: string;
  minDisplayTimeMs?: number;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({
  isLoading,
  onFinished,
  statusMessage = 'Initializing MMA TrackLab Systems...',
  minDisplayTimeMs = 1500,
}) => {
  const [minTimeElapsed, setMinTimeElapsed] = useState(false);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [isRendered, setIsRendered] = useState(true);
  const [progress, setProgress] = useState(15);

  useEffect(() => {
    // Progress bar animation simulation
    const pTimer1 = setTimeout(() => setProgress(45), 300);
    const pTimer2 = setTimeout(() => setProgress(75), 800);
    const pTimer3 = setTimeout(() => setProgress(98), 1200);

    const minTimer = setTimeout(() => {
      setMinTimeElapsed(true);
    }, minDisplayTimeMs);

    return () => {
      clearTimeout(pTimer1);
      clearTimeout(pTimer2);
      clearTimeout(pTimer3);
      clearTimeout(minTimer);
    };
  }, [minDisplayTimeMs]);

  useEffect(() => {
    if (!isLoading && minTimeElapsed) {
      setProgress(100);
      setIsFadingOut(true);
      const exitTimer = setTimeout(() => {
        setIsRendered(false);
        if (onFinished) onFinished();
      }, 600); // 600ms fade transition
      return () => clearTimeout(exitTimer);
    }
  }, [isLoading, minTimeElapsed, onFinished]);

  if (!isRendered) return null;

  return (
    <div
      className={`fixed inset-0 z-[99999] flex flex-col items-center justify-between bg-gradient-to-b from-slate-950 via-slate-900 to-blue-950 text-white select-none transition-opacity duration-600 ease-out ${
        isFadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
      aria-label="Application Loading Splash Screen"
    >
      {/* Background ambient lighting effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-amber-500/15 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute inset-0 bg-[radial-gradient(#1e3a8a_1px,transparent_1px)] [background-size:24px_24px] opacity-25" />
      </div>

      {/* Top subtle bar */}
      <div className="w-full pt-8 px-6 flex items-center justify-between text-xs text-slate-400 font-mono relative z-10">
        <span className="tracking-widest uppercase text-[11px] text-blue-300 font-semibold flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
          MMA TrackLab Console
        </span>
        <span className="text-[11px] text-slate-400 hidden sm:inline-block">
          Academic Year 2024–2025
        </span>
      </div>

      {/* Centerpiece: Official Academy Seal */}
      <div className="relative z-10 flex flex-col items-center text-center px-4 max-w-lg mx-auto my-auto">
        {/* Glow Ring & Seal Container */}
        <div className="relative mb-6 group">
          {/* Pulsing outer aura */}
          <div className="absolute -inset-3 rounded-full bg-gradient-to-tr from-blue-600/40 via-amber-400/30 to-blue-400/40 blur-xl opacity-75 animate-pulse" />
          
          {/* Crisp white backdrop for high-contrast presentation */}
          <div className="relative w-44 h-44 sm:w-52 sm:h-52 rounded-full bg-white p-2.5 shadow-2xl ring-4 ring-blue-500/30 flex items-center justify-center transition-transform duration-700 transform hover:scale-105">
            <img
              src={schoolSeal}
              alt="Mary Mediatrix of All Graces Academy Official Seal"
              className="w-full h-full object-contain filter drop-shadow-md animate-in fade-in zoom-in-95 duration-700"
            />
          </div>

          {/* ICT Dept Mini Emblem Accent */}
          <div className="absolute -bottom-1 -right-1 w-14 h-14 bg-white rounded-full p-1.5 shadow-xl ring-2 ring-blue-600/50 flex items-center justify-center">
            <img
              src={ictLogo}
              alt="MMA ICT Emblem"
              className="w-full h-full object-contain"
            />
          </div>
        </div>

        {/* Institution Titles */}
        <div className="space-y-1.5">
          <p className="text-[11px] font-mono font-bold tracking-[0.22em] text-amber-400 uppercase">
            Official Academic Seal
          </p>
          <h1 className="text-xl sm:text-2xl font-extrabold tracking-wide text-white drop-shadow-sm font-serif">
            MARY MEDIATRIX OF ALL GRACES ACADEMY, INC.
          </h1>
          <p className="text-xs sm:text-sm font-medium tracking-wide text-blue-200/90 font-mono">
            Information & Communications Technology Department
          </p>
          <div className="pt-1 flex items-center justify-center gap-2">
            <span className="h-px w-8 bg-amber-400/40" />
            <span className="text-[10px] uppercase font-mono tracking-widest text-amber-300 font-semibold">
              Fides Ex Auditu
            </span>
            <span className="h-px w-8 bg-amber-400/40" />
          </div>
        </div>

        {/* Progress Bar & Status Text */}
        <div className="w-64 sm:w-72 mt-8 space-y-2.5">
          <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden shadow-inner p-0.5 border border-slate-700/60">
            <div
              className="h-full bg-gradient-to-r from-blue-500 via-indigo-400 to-amber-400 rounded-full transition-all duration-300 ease-out shadow-sm"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
            <span className="truncate pr-2">{statusMessage}</span>
            <span className="text-blue-300 font-bold tabular-nums">{progress}%</span>
          </div>
        </div>
      </div>

      {/* Bottom Footer Note */}
      <div className="w-full pb-6 px-6 text-center text-[11px] text-slate-500 font-mono relative z-10">
        MMA ICT TrackLab · Computer Laboratories & Smart Campus Infrastructure
      </div>
    </div>
  );
};
