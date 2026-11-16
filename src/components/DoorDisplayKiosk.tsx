import React, { useState, useEffect, useMemo } from 'react';
import { Laboratory, LabUsage, Schedule, Trainer, WorkstationIssue, AcUsage } from '../types';
import { format, differenceInMinutes, parse } from 'date-fns';
import { 
  Monitor, 
  Clock, 
  Users, 
  Calendar, 
  CheckCircle2, 
  AlertTriangle, 
  Maximize2, 
  Minimize2, 
  X, 
  Sun, 
  Moon, 
  QrCode, 
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Laptop,
  Snowflake,
  Wind
} from 'lucide-react';
import { QRCodeGenerator } from './QRCodeGenerator';
import { getLabCapacityStatus } from '../utils/capacity';
import { SchoolComputerLogo } from './SchoolComputerLogo';

interface DoorDisplayKioskProps {
  laboratories: Laboratory[];
  activeSessions: LabUsage[];
  schedules: Schedule[];
  trainers: Trainer[];
  acSessions?: AcUsage[];
  issues?: WorkstationIssue[];
  initialLabId?: string;
  onExitKiosk: () => void;
  onOpenCheckInForStation?: (labId: string, station: string) => void;
}

export const DoorDisplayKiosk: React.FC<DoorDisplayKioskProps> = ({
  laboratories,
  activeSessions,
  schedules,
  trainers,
  acSessions = [],
  issues = [],
  initialLabId,
  onExitKiosk,
  onOpenCheckInForStation,
}) => {
  // Retrieve saved lab choice from localStorage for persistent kiosk screen
  const [selectedLabId, setSelectedLabId] = useState<string>(() => {
    return initialLabId || localStorage.getItem('mma_kiosk_lab_id') || laboratories[0]?.id || '';
  });

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Clock tick every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Save selected room to localStorage whenever it changes
  useEffect(() => {
    if (selectedLabId) {
      localStorage.setItem('mma_kiosk_lab_id', selectedLabId);
    }
  }, [selectedLabId]);

  // Fullscreen toggler
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  const currentLab = laboratories.find(l => l.id === selectedLabId) || laboratories[0];
  const capacity = currentLab?.capacity || 30;

  // Active sessions in this laboratory right now
  const labActiveSessions = useMemo(() => {
    return activeSessions.filter(s => s.labId === selectedLabId && s.checkOut === null);
  }, [activeSessions, selectedLabId]);

  const capacityStatus = getLabCapacityStatus(labActiveSessions.length, capacity);

  // Time & Day parsing
  const currentDayName = format(currentTime, 'EEEE') as Schedule['day'];
  const currentTimeStr = format(currentTime, 'HH:mm');

  // Find ongoing class right now
  const currentSchedule = useMemo(() => {
    return schedules.find(s => {
      if (s.labId !== selectedLabId || s.day !== currentDayName) return false;
      return currentTimeStr >= s.startTime && currentTimeStr <= s.endTime;
    });
  }, [schedules, selectedLabId, currentDayName, currentTimeStr]);

  // Find upcoming classes for today
  const upcomingSchedules = useMemo(() => {
    return schedules.filter(s => {
      if (s.labId !== selectedLabId || s.day !== currentDayName) return false;
      return s.startTime > currentTimeStr;
    }).sort((a, b) => a.startTime.localeCompare(b.startTime));
  }, [schedules, selectedLabId, currentDayName, currentTimeStr]);

  // Trainer for current class
  const currentTrainer = useMemo(() => {
    if (!currentSchedule) return null;
    return trainers.find(t => t.id === currentSchedule.trainerId);
  }, [currentSchedule, trainers]);

  // Time remaining in current class
  const classProgress = useMemo(() => {
    if (!currentSchedule) return null;
    const [startH, startM] = currentSchedule.startTime.split(':').map(Number);
    const [endH, endM] = currentSchedule.endTime.split(':').map(Number);
    const [curH, curM] = currentTimeStr.split(':').map(Number);

    const startTotal = startH * 60 + startM;
    const endTotal = endH * 60 + endM;
    const curTotal = curH * 60 + curM;

    const totalDuration = endTotal - startTotal;
    const elapsed = curTotal - startTotal;
    const remaining = Math.max(0, endTotal - curTotal);
    const percent = Math.min(100, Math.max(0, Math.round((elapsed / Math.max(1, totalDuration)) * 100)));

    return {
      remainingMinutes: remaining,
      percent,
    };
  }, [currentSchedule, currentTimeStr]);

  // Occupied vs Free Stations
  const occupiedStationIds = useMemo(() => {
    return new Set(labActiveSessions.map(s => s.station));
  }, [labActiveSessions]);

  // Station list preview
  const stationList = useMemo(() => {
    const list: { id: string; isOccupied: boolean; user?: string }[] = [];
    for (let i = 1; i <= capacity; i++) {
      const pad = String(i).padStart(2, '0');
      const stName = `PC-${pad}`;
      const session = labActiveSessions.find(s => s.station === stName);
      list.push({
        id: stName,
        isOccupied: Boolean(session),
        user: session?.userName,
      });
    }
    return list;
  }, [capacity, labActiveSessions]);

  // Issues in this lab
  const labIssues = useMemo(() => {
    return issues.filter(i => i.labId === selectedLabId && i.status !== 'resolved');
  }, [issues, selectedLabId]);

  // Active AC Session in this lab
  const currentAcSession = useMemo(() => {
    return acSessions.find(s => s.labId === selectedLabId && s.status === 'active');
  }, [acSessions, selectedLabId]);

  return (
    <div className={`fixed inset-0 z-50 overflow-hidden flex flex-col font-sans transition-colors duration-300 ${
      isDarkMode ? 'bg-[#0A192F] text-white' : 'bg-[#F8FAFC] text-[#0A192F]'
    }`}>
      {/* Top Header Ribbon */}
      <header className={`px-6 py-4 flex items-center justify-between border-b backdrop-blur-md ${
        isDarkMode ? 'bg-[#071324]/90 border-[#1E3A5F]' : 'bg-white/95 border-[#E2E8F0] shadow-2xs'
      }`}>
        {/* Left: Lab selector & title */}
        <div className="flex items-center gap-3">
          <SchoolComputerLogo size="md" />
          <div>
            <div className="flex items-center gap-2">
              <select
                value={selectedLabId}
                onChange={(e) => setSelectedLabId(e.target.value)}
                className={`text-lg sm:text-xl font-bold bg-transparent border-0 focus:outline-none focus:ring-0 cursor-pointer ${
                  isDarkMode ? 'text-white' : 'text-zinc-900'
                }`}
              >
                {laboratories.map(lab => (
                  <option key={lab.id} value={lab.id} className={isDarkMode ? 'bg-zinc-900 text-white' : 'bg-white text-zinc-900'}>
                    {lab.name}
                  </option>
                ))}
              </select>
            </div>
            <p className="text-xs text-zinc-400 font-mono">
              MMA ICT TrackLab · Doorway Tablet Kiosk Display
            </p>
          </div>
        </div>

        {/* Right: Real-time clock & kiosk controls */}
        <div className="flex items-center gap-4">
          {/* Digital Clock */}
          <div className="text-right">
            <div className="text-2xl sm:text-3xl font-extrabold font-mono tracking-tight text-blue-500">
              {format(currentTime, 'hh:mm')}
              <span className="text-sm font-normal text-zinc-400 ml-1">
                {format(currentTime, 'ss a')}
              </span>
            </div>
            <div className="text-xs text-zinc-400 font-medium">
              {format(currentTime, 'EEEE, MMMM d, yyyy')}
            </div>
          </div>

          <div className="h-8 w-px bg-zinc-700/50 hidden sm:block" />

          {/* Display Controls */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setIsDarkMode(!isDarkMode)}
              className={`p-2 rounded-lg transition-colors cursor-pointer ${
                isDarkMode ? 'hover:bg-zinc-800 text-zinc-400 hover:text-white' : 'hover:bg-zinc-200 text-zinc-600'
              }`}
              title="Toggle Dark/Light Mode"
            >
              {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            <button
              type="button"
              onClick={toggleFullscreen}
              className={`p-2 rounded-lg transition-colors cursor-pointer ${
                isDarkMode ? 'hover:bg-zinc-800 text-zinc-400 hover:text-white' : 'hover:bg-zinc-200 text-zinc-600'
              }`}
              title="Toggle Fullscreen (F11)"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            <button
              type="button"
              onClick={onExitKiosk}
              className="p-2 rounded-lg bg-red-600/10 hover:bg-red-600/20 text-red-500 transition-colors cursor-pointer flex items-center gap-1 text-xs font-semibold ml-1"
              title="Exit Kiosk Mode"
            >
              <X className="w-4 h-4" />
              <span className="hidden sm:inline">Exit</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Kiosk Content Area */}
      <div className="flex-1 p-6 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (8 cols): Primary Status, Ongoing Class & Seat Occupancy */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          {/* Hero Room Status Banner */}
          <div className={`p-6 sm:p-8 rounded-3xl border shadow-xl relative overflow-hidden transition-all ${
            currentSchedule
              ? isDarkMode 
                ? 'bg-amber-950/30 border-amber-500/40 ring-1 ring-amber-500/30' 
                : 'bg-amber-50 border-amber-300'
              : capacityStatus.isExceeded
              ? isDarkMode
                ? 'bg-red-950/30 border-red-500/40 ring-1 ring-red-500/30'
                : 'bg-red-50 border-red-300'
              : isDarkMode
                ? 'bg-emerald-950/30 border-emerald-500/40 ring-1 ring-emerald-500/30'
                : 'bg-emerald-50 border-emerald-300'
          }`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="relative flex h-3 w-3">
                    <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                      currentSchedule ? 'bg-amber-400' : capacityStatus.isExceeded ? 'bg-red-400' : 'bg-emerald-400'
                    }`} />
                    <span className={`relative inline-flex rounded-full h-3 w-3 ${
                      currentSchedule ? 'bg-amber-500' : capacityStatus.isExceeded ? 'bg-red-500' : 'bg-emerald-500'
                    }`} />
                  </span>
                  <span className={`text-xs font-mono font-bold tracking-widest uppercase px-2.5 py-0.5 rounded-full ${
                    currentSchedule
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      : capacityStatus.isExceeded
                      ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                      : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  }`}>
                    {currentSchedule ? 'CLASS IN SESSION' : capacityStatus.isExceeded ? 'LAB AT CAPACITY' : 'OPEN FOR VACANT PRACTICE'}
                  </span>

                  {/* Air-Conditioner Status Badge */}
                  {currentAcSession ? (
                    <span className="text-xs font-mono font-bold uppercase px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 inline-flex items-center gap-1.5">
                      <Snowflake className="w-3 h-3 text-cyan-400 animate-spin-slow" />
                      <span>AC: {currentAcSession.temperature || 23}°C ({currentAcSession.mode || 'Cool'})</span>
                    </span>
                  ) : (
                    <span className="text-xs font-mono font-medium px-2.5 py-0.5 rounded-full bg-zinc-800/60 text-zinc-400 border border-zinc-700/50 inline-flex items-center gap-1">
                      <Wind className="w-3 h-3 text-zinc-500" />
                      <span>AC: OFF</span>
                    </span>
                  )}
                </div>

                <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight">
                  {currentSchedule ? currentSchedule.subject : 'Workstations Available'}
                </h1>

                <p className={`text-sm sm:text-base mt-2 font-medium ${
                  isDarkMode ? 'text-zinc-300' : 'text-zinc-700'
                }`}>
                  {currentSchedule ? (
                    <>
                      Section: <strong className="text-blue-400">{currentSchedule.yearSection}</strong> · Instructor: <strong>{currentTrainer?.name || currentSchedule.teacherName}</strong>
                    </>
                  ) : (
                    <>
                      Students and researchers may occupy vacant workstations for open computing practice.
                    </>
                  )}
                </p>
              </div>

              {/* Class Progress or Open Badge */}
              {currentSchedule && classProgress ? (
                <div className={`p-4 rounded-2xl border text-center shrink-0 min-w-[180px] ${
                  isDarkMode ? 'bg-zinc-900/80 border-zinc-800' : 'bg-white border-zinc-200'
                }`}>
                  <div className="text-2xl sm:text-3xl font-extrabold font-mono text-amber-400">
                    {classProgress.remainingMinutes} <span className="text-xs font-normal text-zinc-400">min left</span>
                  </div>
                  <div className="text-[11px] text-zinc-400 font-mono mt-0.5">
                    {currentSchedule.startTime} – {currentSchedule.endTime}
                  </div>
                  {/* Progress bar */}
                  <div className="w-full bg-zinc-700/40 h-2 rounded-full mt-2.5 overflow-hidden">
                    <div
                      style={{ width: `${classProgress.percent}%` }}
                      className="bg-amber-400 h-full rounded-full transition-all duration-1000"
                    />
                  </div>
                </div>
              ) : (
                <div className={`p-4 rounded-2xl border text-center shrink-0 min-w-[180px] ${
                  isDarkMode ? 'bg-zinc-900/80 border-zinc-800' : 'bg-white border-zinc-200'
                }`}>
                  <div className="text-2xl sm:text-3xl font-extrabold font-mono text-emerald-400">
                    {capacityStatus.availableCount}
                  </div>
                  <div className="text-[11px] text-zinc-400 font-medium">
                    Free Seats Available
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Live Seat Availability & Station Map */}
          <div className={`p-6 rounded-3xl border shadow-lg flex-1 flex flex-col justify-between ${
            isDarkMode ? 'bg-[#0E223D] border-[#1E3A5F]' : 'bg-white border-[#E2E8F0] shadow-sm'
          }`}>
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold flex items-center gap-2">
                    <Laptop className="w-5 h-5 text-blue-500" />
                    <span>Live Workstation Seat Map</span>
                  </h3>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Green indicators represent currently available workstations ready for immediate login.
                  </p>
                </div>

                <div className="flex items-center gap-3 text-xs font-mono">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-xs" />
                    <span className={isDarkMode ? 'text-zinc-300' : 'text-zinc-700'}>{capacityStatus.availableCount} Free</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-xs" />
                    <span className={isDarkMode ? 'text-zinc-300' : 'text-zinc-700'}>{capacityStatus.occupiedCount} Occupied</span>
                  </span>
                </div>
              </div>

              {/* Station Grid Pills */}
              <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-10 gap-2.5 pt-2">
                {stationList.map(st => (
                  <div
                    key={st.id}
                    className={`p-2.5 rounded-xl border text-center transition-all ${
                      st.isOccupied
                        ? isDarkMode
                          ? 'bg-red-950/40 border-red-800/60 text-red-300'
                          : 'bg-red-50 border-red-200 text-red-900'
                        : isDarkMode
                        ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300 shadow-xs'
                        : 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    }`}
                  >
                    <div className="text-xs font-mono font-bold">{st.id}</div>
                    <div className="text-[9px] font-semibold uppercase tracking-wider mt-0.5 opacity-80">
                      {st.isOccupied ? 'In Use' : 'OPEN'}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Bottom status note */}
            <div className={`mt-6 pt-4 border-t flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs ${
              isDarkMode ? 'border-zinc-800 text-zinc-400' : 'border-zinc-100 text-zinc-500'
            }`}>
              <span>
                Maximum safe capacity: <strong>{capacity} stations</strong> · Room: <strong>{currentLab?.name}</strong>
              </span>
              {labIssues.length > 0 && (
                <span className="text-amber-500 font-semibold flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>{labIssues.length} PC hardware fault reported</span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right Column (4 cols): QR Scan Check-In & Today's Next Classes */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          {/* Quick Check-In QR Code Card for Students */}
          <div className={`p-6 rounded-3xl border shadow-lg text-center flex flex-col items-center justify-center ${
            isDarkMode ? 'bg-[#0E223D] border-[#1E3A5F]' : 'bg-white border-[#E2E8F0] shadow-sm'
          }`}>
            <div className="flex items-center gap-2 text-xs font-bold font-mono tracking-wider uppercase text-blue-500 mb-1">
              <QrCode className="w-4 h-4" />
              <span>Instant Door Check-In</span>
            </div>
            <h4 className="text-base font-bold mb-1">
              Scan with Smartphone
            </h4>
            <p className="text-xs text-zinc-400 max-w-xs mb-4">
              Point your camera at this QR code to log into a workstation in {currentLab?.name}.
            </p>

            {/* Embedded QR Code */}
            <div className="p-3 bg-white rounded-2xl shadow-md border border-zinc-200 inline-block">
              <QRCodeGenerator
                labId={selectedLabId}
                station="DOOR-KIOSK"
                labName={currentLab?.name}
                size={160}
                showDetails={false}
                showPrintButton={false}
                showDownloadButton={false}
                showCopyLinkButton={false}
                compact={true}
              />
            </div>

            <p className="text-[10px] text-zinc-400 font-mono mt-3">
              Touch-free student attendance logging
            </p>
          </div>

          {/* Today's Schedule Agenda Card */}
          <div className={`p-6 rounded-3xl border shadow-lg flex-1 flex flex-col ${
            isDarkMode ? 'bg-[#0E223D] border-[#1E3A5F]' : 'bg-white border-[#E2E8F0] shadow-sm'
          }`}>
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-bold flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-500" />
                <span>Today's Room Schedule</span>
              </h4>
              <span className="text-[10px] font-mono text-zinc-400">{currentDayName}</span>
            </div>

            <div className="space-y-2.5 flex-1 overflow-y-auto pr-1">
              {upcomingSchedules.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-zinc-400">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500/50 mb-2" />
                  <p className="text-xs font-semibold">No further scheduled classes today</p>
                  <p className="text-[11px] mt-0.5 text-zinc-500">The laboratory remains open for free practice.</p>
                </div>
              ) : (
                upcomingSchedules.map(sch => {
                  const trainer = trainers.find(t => t.id === sch.trainerId);

                  return (
                    <div
                      key={sch.id}
                      className={`p-3.5 rounded-2xl border text-xs space-y-1 transition-all ${
                        isDarkMode 
                          ? 'bg-[#071324] border-[#1E3A5F]' 
                          : 'bg-[#F8FAFC] border-[#E2E8F0]'
                      }`}
                    >
                      <div className="flex items-center justify-between font-mono text-[11px] font-semibold text-blue-400">
                        <span>{sch.startTime} – {sch.endTime}</span>
                        <span className="text-zinc-500 text-[10px]">{sch.yearSection}</span>
                      </div>
                      <p className="font-bold text-sm truncate">
                        {sch.subject}
                      </p>
                      <p className="text-[11px] text-zinc-400 truncate">
                        Faculty: {trainer?.name || sch.teacherName}
                      </p>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
