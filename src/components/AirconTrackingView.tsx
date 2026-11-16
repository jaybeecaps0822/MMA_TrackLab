import React, { useState, useMemo, useEffect } from 'react';
import { Laboratory, AcUsage, UserProfile } from '../types';
import { format, differenceInMinutes, startOfDay, subDays } from 'date-fns';
import { 
  Snowflake, 
  Wind, 
  Power, 
  Thermometer, 
  Clock, 
  User, 
  CheckCircle2, 
  AlertTriangle, 
  QrCode, 
  Download, 
  Printer, 
  Search, 
  Filter, 
  Building2, 
  Sparkles, 
  Zap, 
  Trash2, 
  Calendar, 
  ChevronRight,
  ScanLine
} from 'lucide-react';
import { AcCheckInModal, AcCheckOutModal, AcQrCodeModal, AcQrScannerModal } from './AcModal';

interface AirconTrackingViewProps {
  laboratories: Laboratory[];
  acSessions: AcUsage[];
  profile: UserProfile | null;
  onTurnOnAc: (data: {
    labId: string;
    labName: string;
    acUnit: string;
    temperature: number;
    mode: 'Cool' | 'Eco' | 'Dry' | 'Fan';
    notes?: string;
  }) => Promise<void>;
  onTurnOffAc: (sessionId: string, closingNotes?: string) => Promise<void>;
  onDeleteAcSession?: (sessionId: string) => Promise<void>;
  initialSelectedLabId?: string;
  initialAction?: 'in' | 'out';
}

export const AirconTrackingView: React.FC<AirconTrackingViewProps> = ({
  laboratories,
  acSessions,
  profile,
  onTurnOnAc,
  onTurnOffAc,
  onDeleteAcSession,
  initialSelectedLabId,
  initialAction,
}) => {
  // Modal states
  const [checkInModal, setCheckInModal] = useState<{ isOpen: boolean; labId?: string; unit?: string }>({
    isOpen: false,
    labId: initialSelectedLabId,
  });
  const [checkOutModal, setCheckOutModal] = useState<{ isOpen: boolean; session: AcUsage | null }>({
    isOpen: false,
    session: null,
  });
  const [qrCodeModal, setQrCodeModal] = useState<{ isOpen: boolean; laboratory: Laboratory | null }>({
    isOpen: false,
    laboratory: null,
  });
  const [scannerModal, setScannerModal] = useState(false);

  // Search and Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLabFilter, setSelectedLabFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [currentTime, setCurrentTime] = useState(new Date());

  // Clock tick every 10 seconds for real-time runtime counters
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 10000);
    return () => clearInterval(timer);
  }, []);

  // Handle initial action (e.g. from QR scan)
  useEffect(() => {
    if (initialSelectedLabId) {
      const activeSession = acSessions.find(
        s => s.labId === initialSelectedLabId && s.status === 'active'
      );
      if (initialAction === 'out' && activeSession) {
        setCheckOutModal({ isOpen: true, session: activeSession });
      } else if (activeSession) {
        // If already active, open checkout modal
        setCheckOutModal({ isOpen: true, session: activeSession });
      } else {
        // Otherwise open checkin modal
        setCheckInModal({ isOpen: true, labId: initialSelectedLabId });
      }
    }
  }, [initialSelectedLabId, initialAction, acSessions]);

  // Map active sessions by labId
  const activeSessionsByLab = useMemo(() => {
    const map = new Map<string, AcUsage>();
    acSessions.forEach(s => {
      if (s.status === 'active') {
        map.set(s.labId, s);
      }
    });
    return map;
  }, [acSessions]);

  // Summary Metrics
  const stats = useMemo(() => {
    const now = new Date();
    const todayStart = startOfDay(now);

    let activeCount = 0;
    let todayMinutes = 0;
    let totalKWh = 0;

    acSessions.forEach(s => {
      if (s.status === 'active') {
        activeCount++;
        const mins = differenceInMinutes(now, s.turnedOnAt.toDate());
        if (mins > 0) {
          todayMinutes += mins;
          totalKWh += (mins / 60) * 2.2;
        }
      } else if (s.turnedOffAt) {
        const offDate = s.turnedOffAt.toDate();
        if (offDate >= todayStart) {
          const dur = s.durationMinutes || differenceInMinutes(offDate, s.turnedOnAt.toDate());
          todayMinutes += dur;
          totalKWh += (dur / 60) * 2.2;
        }
      }
    });

    return {
      activeCount,
      todayHours: (todayMinutes / 60).toFixed(1),
      estimatedKWhToday: totalKWh.toFixed(1),
      monitoredRooms: laboratories.length,
    };
  }, [acSessions, laboratories, currentTime]);

  // Filtered Sessions for Audit History
  const filteredSessions = useMemo(() => {
    return acSessions.filter(s => {
      if (selectedLabFilter !== 'all' && s.labId !== selectedLabFilter) return false;
      if (statusFilter !== 'all' && s.status !== statusFilter) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const labName = (s.labName || '').toLowerCase();
        const onUser = (s.turnedOnByName || '').toLowerCase();
        const offUser = (s.turnedOffByName || '').toLowerCase();
        const notes = (s.notes || '').toLowerCase();
        const unit = (s.acUnit || '').toLowerCase();
        if (!labName.includes(q) && !onUser.includes(q) && !offUser.includes(q) && !notes.includes(q) && !unit.includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [acSessions, selectedLabFilter, statusFilter, searchQuery]);

  // Print all QR Codes in one sheet
  const handlePrintAllQrSheets = () => {
    const printWindow = window.open('', '_blank', 'width=800,height=900');
    if (!printWindow) return;

    const base = `${window.location.origin}${window.location.pathname}`;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Print All Laboratory AC QR Stickers</title>
          <style>
            @page { size: A4; margin: 10mm; }
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 0; padding: 10px; }
            h2 { text-align: center; margin: 0 0 16px 0; font-size: 18px; color: #0f172a; }
            .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }
            .badge { border: 2px solid #0284c7; border-radius: 14px; padding: 14px; text-align: center; box-sizing: border-box; }
            .badge-title { font-size: 15px; font-weight: 800; margin: 4px 0; color: #0f172a; }
            .badge-sub { font-size: 10px; color: #0284c7; font-weight: 700; text-transform: uppercase; margin-bottom: 8px; }
            .qr-container { display: flex; justify-content: center; margin: 8px 0; }
            .qr-img { width: 140px; height: 140px; }
            .instructions { font-size: 10px; color: #334155; margin-top: 6px; font-weight: 600; }
          </style>
          <script src="https://cdn.jsdelivr.net/npm/qrcode@1.5.4/build/qrcode.min.js"></script>
        </head>
        <body>
          <h2>MMA ICT TrackLab · Air-Conditioning Usage QR Plaques</h2>
          <div class="grid">
            ${laboratories.map((lab, idx) => `
              <div class="badge">
                <div class="badge-sub">❄️ AIR-CONDITION CONTROL</div>
                <div class="badge-title">${lab.name}</div>
                <div class="qr-container">
                  <canvas id="qr-${idx}"></canvas>
                </div>
                <div class="instructions">SCAN TO TURN ON (IN) & TURN OFF (OUT)</div>
              </div>
            `).join('')}
          </div>
          <script>
            window.onload = async function() {
              const labs = ${JSON.stringify(laboratories.map(l => ({ id: l.id })))};
              for (let i = 0; i < labs.length; i++) {
                const canvas = document.getElementById('qr-' + i);
                const url = '${base}?acLabId=' + labs[i].id + '&action=ac-toggle';
                await QRCode.toCanvas(canvas, url, { width: 140, margin: 1 });
              }
              setTimeout(() => window.print(), 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Export to CSV
  const handleExportCsv = () => {
    if (filteredSessions.length === 0) return;
    const headers = ['Laboratory', 'AC Unit', 'Status', 'Temperature (°C)', 'Mode', 'Turned On At', 'Turned On By', 'Turned Off At', 'Turned Off By', 'Duration (Mins)', 'Est kWh', 'Notes'];
    const rows = filteredSessions.map(s => [
      `"${s.labName || ''}"`,
      `"${s.acUnit || ''}"`,
      s.status,
      s.temperature || 23,
      s.mode || 'Cool',
      s.turnedOnAt ? `"${format(s.turnedOnAt.toDate(), 'yyyy-MM-dd HH:mm:ss')}"` : '',
      `"${s.turnedOnByName || ''}"`,
      s.turnedOffAt ? `"${format(s.turnedOffAt.toDate(), 'yyyy-MM-dd HH:mm:ss')}"` : '',
      `"${s.turnedOffByName || ''}"`,
      s.durationMinutes || (s.turnedOffAt ? differenceInMinutes(s.turnedOffAt.toDate(), s.turnedOnAt.toDate()) : ''),
      s.estimatedKWh || '',
      `"${(s.notes || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `AC_Usage_Audit_Log_${format(new Date(), 'yyyyMMdd_HHmm')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* 1. Header & Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-zinc-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-cyan-700 uppercase tracking-wider">Active Cooling</span>
            <span className="relative flex h-3 w-3">
              {stats.activeCount > 0 && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
              )}
              <span className={`relative inline-flex rounded-full h-3 w-3 ${stats.activeCount > 0 ? 'bg-cyan-500' : 'bg-zinc-300'}`} />
            </span>
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-bold font-mono text-cyan-900">{stats.activeCount}</span>
            <span className="text-xs text-zinc-500">running now</span>
          </div>
          <span className="text-[11px] text-cyan-600/90 mt-1 block font-medium">
            {stats.activeCount > 0 ? 'AC units active' : 'All AC units off'}
          </span>
        </div>

        <div className="bg-white border border-zinc-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-blue-700 uppercase tracking-wider">Total Runtime</span>
            <Clock className="w-4 h-4 text-blue-600" />
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-bold font-mono text-blue-900">{stats.todayHours}</span>
            <span className="text-xs text-zinc-500">hours</span>
          </div>
          <span className="text-[11px] text-zinc-400 mt-1 block">Cumulative today</span>
        </div>

        <div className="bg-white border border-zinc-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-amber-700 uppercase tracking-wider">Est. Energy</span>
            <Zap className="w-4 h-4 text-amber-600" />
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-bold font-mono text-amber-900">{stats.estimatedKWhToday}</span>
            <span className="text-xs text-zinc-500">kWh</span>
          </div>
          <span className="text-[11px] text-zinc-400 mt-1 block">Est. power usage today</span>
        </div>

        <div className="bg-white border border-zinc-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-zinc-600 uppercase tracking-wider">Monitored Facilities</span>
            <Building2 className="w-4 h-4 text-zinc-500" />
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-bold font-mono text-zinc-900">{stats.monitoredRooms}</span>
            <span className="text-xs text-zinc-500">rooms</span>
          </div>
          <span className="text-[11px] text-zinc-400 mt-1 block">With AC QR trackers</span>
        </div>
      </div>

      {/* 2. Control Bar */}
      <div className="bg-white border border-zinc-200 rounded-xl p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-zinc-900 tracking-tight flex items-center gap-2">
              <Snowflake className="w-4 h-4 text-cyan-600" />
              Air-Conditioning Tracking & QR Control
            </h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              Monitor AC operation for each laboratory and room. Scan door/wall QR stickers to log AC In (Turn ON) and AC Out (Turn OFF).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => setScannerModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              <ScanLine className="w-3.5 h-3.5" />
              <span>Scan AC QR Code</span>
            </button>

            <button
              type="button"
              onClick={handlePrintAllQrSheets}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-zinc-700 bg-zinc-100 hover:bg-zinc-200 border border-zinc-200 rounded-lg transition-colors cursor-pointer"
              title="Print all QR stickers to mount near AC switches"
            >
              <Printer className="w-3.5 h-3.5 text-zinc-600" />
              <span>Print All Wall QR Badges</span>
            </button>
          </div>
        </div>
      </div>

      {/* 3. Laboratories AC Status Grid */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5" />
            Live Room Air-Conditioning Status
          </h3>
          <span className="text-xs text-zinc-400">
            {laboratories.length} Rooms Configured
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {laboratories.map((lab) => {
            const activeSession = activeSessionsByLab.get(lab.id);
            const isAcOn = Boolean(activeSession);

            // Compute running duration if ON
            let runningTimeStr = '';
            if (activeSession) {
              const mins = Math.max(1, differenceInMinutes(currentTime, activeSession.turnedOnAt.toDate()));
              const hrs = Math.floor(mins / 60);
              const remMins = mins % 60;
              runningTimeStr = hrs > 0 ? `${hrs}h ${remMins}m` : `${remMins}m`;
            }

            return (
              <div 
                key={lab.id}
                className={`rounded-2xl border transition-all duration-200 overflow-hidden shadow-xs flex flex-col justify-between ${
                  isAcOn 
                    ? 'bg-gradient-to-b from-cyan-50/50 to-white border-cyan-300 ring-1 ring-cyan-400/20 shadow-cyan-100/40' 
                    : 'bg-white border-zinc-200'
                }`}
              >
                {/* Card Top */}
                <div className="p-5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          isAcOn
                            ? 'bg-cyan-100 text-cyan-800 border border-cyan-200'
                            : 'bg-zinc-100 text-zinc-600 border border-zinc-200'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${isAcOn ? 'bg-cyan-500 animate-pulse' : 'bg-zinc-400'}`} />
                          {isAcOn ? 'COOLING ON' : 'AC OFF / STANDBY'}
                        </span>
                        {isAcOn && activeSession?.mode && (
                          <span className="text-[10px] font-semibold text-cyan-700 bg-white border border-cyan-200 px-1.5 py-0.2 rounded">
                            {activeSession.mode} Mode
                          </span>
                        )}
                      </div>
                      <h4 className="text-base font-bold text-zinc-900 mt-1.5 tracking-tight">
                        {lab.name}
                      </h4>
                      <p className="text-xs text-zinc-500">
                        {lab.location || 'ICT Building'} · Capacity: {lab.capacity || 30} seats
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setQrCodeModal({ isOpen: true, laboratory: lab })}
                      className="p-2 text-zinc-400 hover:text-cyan-700 hover:bg-cyan-50 rounded-xl transition-colors cursor-pointer border border-transparent hover:border-cyan-200"
                      title="View & Print Wall AC QR Code"
                    >
                      <QrCode className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Active vs Idle Info Section */}
                  {isAcOn && activeSession ? (
                    <div className="mt-4 p-3 bg-white/90 border border-cyan-100 rounded-xl shadow-2xs space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <Thermometer className="w-4 h-4 text-cyan-600" />
                          <span className="text-lg font-black font-mono text-cyan-900">
                            {activeSession.temperature || 23}°C
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] text-zinc-400 block font-mono">Running Time</span>
                          <span className="text-xs font-bold font-mono text-blue-700">
                            {runningTimeStr}
                          </span>
                        </div>
                      </div>

                      <div className="text-[11px] text-zinc-600 pt-1 border-t border-zinc-100 flex items-center justify-between">
                        <span className="truncate flex items-center gap-1">
                          <User className="w-3 h-3 text-zinc-400 shrink-0" />
                          <span>{activeSession.turnedOnByName}</span>
                        </span>
                        <span className="font-mono text-zinc-400 text-[10px]">
                          {format(activeSession.turnedOnAt.toDate(), 'hh:mm a')}
                        </span>
                      </div>

                      {activeSession.notes && (
                        <p className="text-[10px] text-zinc-500 italic truncate pt-0.5">
                          "{activeSession.notes}"
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="mt-4 p-3 bg-zinc-50 border border-zinc-100 rounded-xl text-center">
                      <p className="text-xs text-zinc-400 font-medium">
                        Air-conditioner is currently powered OFF.
                      </p>
                      <span className="text-[10px] text-zinc-400 block mt-0.5">
                        Scan wall QR sticker or tap below to switch ON
                      </span>
                    </div>
                  )}
                </div>

                {/* Card Action Footer */}
                <div className="p-3 bg-zinc-50/80 border-t border-zinc-100 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setQrCodeModal({ isOpen: true, laboratory: lab })}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-zinc-600 hover:text-zinc-900 px-2.5 py-1.5 rounded-lg hover:bg-zinc-200/60 transition-colors cursor-pointer"
                  >
                    <QrCode className="w-3.5 h-3.5 text-zinc-500" />
                    <span>Wall QR</span>
                  </button>

                  {isAcOn && activeSession ? (
                    <button
                      type="button"
                      onClick={() => setCheckOutModal({ isOpen: true, session: activeSession })}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-xs transition-colors cursor-pointer"
                    >
                      <Power className="w-3.5 h-3.5" />
                      <span>Turn AC OFF</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setCheckInModal({ isOpen: true, labId: lab.id })}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-cyan-600 hover:bg-cyan-700 rounded-xl shadow-xs transition-colors cursor-pointer"
                    >
                      <Snowflake className="w-3.5 h-3.5" />
                      <span>Turn AC ON</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Historical AC Audit Table */}
      <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden shadow-xs">
        {/* Table Filter Header */}
        <div className="p-4 border-b border-zinc-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-zinc-700" />
            <h3 className="text-sm font-bold text-zinc-900">AC In / Out Audit Log</h3>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-zinc-100 text-zinc-600">
              {filteredSessions.length} records
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selectedLabFilter}
              onChange={(e) => setSelectedLabFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-700 focus:outline-none focus:ring-1 focus:ring-zinc-900"
            >
              <option value="all">All Rooms</option>
              {laboratories.map(l => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'completed')}
              className="px-2.5 py-1.5 text-xs bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-700 focus:outline-none focus:ring-1 focus:ring-zinc-900"
            >
              <option value="all">All Status</option>
              <option value="active">Active Only</option>
              <option value="completed">Completed Only</option>
            </select>

            <div className="relative w-full sm:w-44">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search logs..."
                className="w-full pl-8 pr-2.5 py-1.5 bg-zinc-50 border border-zinc-200 rounded-lg text-xs placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-900"
              />
            </div>

            <button
              type="button"
              onClick={handleExportCsv}
              className="p-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-700 transition-colors cursor-pointer"
              title="Export AC Audit Log to CSV"
            >
              <Download className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 uppercase tracking-wider font-semibold font-mono">
                <th className="px-4 py-3">Room & Unit</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Turned ON (In)</th>
                <th className="px-4 py-3">Turned OFF (Out)</th>
                <th className="px-4 py-3">Duration & Energy</th>
                <th className="px-4 py-3">Settings</th>
                {profile?.role === 'admin' && <th className="px-4 py-3 text-right">Action</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 font-sans">
              {filteredSessions.length === 0 ? (
                <tr>
                  <td colSpan={profile?.role === 'admin' ? 7 : 6} className="px-4 py-12 text-center text-zinc-400">
                    <Snowflake className="w-8 h-8 text-zinc-300 mx-auto mb-2" />
                    <p className="font-medium text-zinc-600">No air-conditioner usage logs found.</p>
                    <p className="text-[11px] text-zinc-400 mt-0.5">Turn on an AC unit or scan a wall QR code to start tracking.</p>
                  </td>
                </tr>
              ) : (
                filteredSessions.map((s) => {
                  const onDate = s.turnedOnAt.toDate();
                  const offDate = s.turnedOffAt ? s.turnedOffAt.toDate() : null;
                  const durMinutes = s.durationMinutes || (offDate ? differenceInMinutes(offDate, onDate) : differenceInMinutes(currentTime, onDate));
                  const durHours = (durMinutes / 60).toFixed(1);
                  const estKWh = s.estimatedKWh || ((durMinutes / 60) * 2.2).toFixed(2);

                  return (
                    <tr key={s.id} className="hover:bg-zinc-50/80 transition-colors">
                      {/* Room & Unit */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="font-semibold text-zinc-900">{s.labName || 'Laboratory'}</div>
                        <div className="text-[10px] text-zinc-400 font-mono">{s.acUnit}</div>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          s.status === 'active'
                            ? 'bg-cyan-50 text-cyan-700 border border-cyan-200'
                            : 'bg-zinc-100 text-zinc-600'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${s.status === 'active' ? 'bg-cyan-500 animate-pulse' : 'bg-zinc-400'}`} />
                          {s.status === 'active' ? 'Active' : 'Completed'}
                        </span>
                      </td>

                      {/* Turned ON */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="font-mono text-zinc-800 text-xs">
                          {format(onDate, 'MMM d, hh:mm a')}
                        </div>
                        <div className="text-[10px] text-zinc-500 flex items-center gap-1">
                          <User className="w-2.5 h-2.5 text-zinc-400" />
                          <span>{s.turnedOnByName}</span>
                        </div>
                      </td>

                      {/* Turned OFF */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        {offDate ? (
                          <>
                            <div className="font-mono text-zinc-800 text-xs">
                              {format(offDate, 'MMM d, hh:mm a')}
                            </div>
                            <div className="text-[10px] text-zinc-500 flex items-center gap-1">
                              <User className="w-2.5 h-2.5 text-zinc-400" />
                              <span>{s.turnedOffByName || s.turnedOnByName}</span>
                            </div>
                          </>
                        ) : (
                          <span className="text-cyan-600 font-semibold text-[11px] animate-pulse">
                            Still Cooling...
                          </span>
                        )}
                      </td>

                      {/* Duration & Energy */}
                      <td className="px-4 py-3 whitespace-nowrap font-mono">
                        <span className="font-bold text-zinc-900">{durHours}h</span>
                        <span className="text-zinc-400 text-[11px]"> ({durMinutes}m)</span>
                        <div className="text-[10px] text-amber-600">~{estKWh} kWh</div>
                      </td>

                      {/* Settings & Notes */}
                      <td className="px-4 py-3 whitespace-nowrap text-zinc-600">
                        <div className="flex items-center gap-1">
                          <span className="font-mono font-bold text-zinc-800">{s.temperature || 23}°C</span>
                          <span className="text-zinc-400">·</span>
                          <span className="text-[11px]">{s.mode || 'Cool'}</span>
                        </div>
                        {s.notes && (
                          <div className="text-[10px] text-zinc-400 truncate max-w-xs" title={s.notes}>
                            {s.notes}
                          </div>
                        )}
                      </td>

                      {/* Actions */}
                      {profile?.role === 'admin' && (
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          {onDeleteAcSession && (
                            <button
                              type="button"
                              onClick={() => onDeleteAcSession(s.id)}
                              className="p-1 hover:bg-red-50 text-zinc-400 hover:text-red-600 rounded transition-colors"
                              title="Delete log record"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      <AcCheckInModal
        isOpen={checkInModal.isOpen}
        onClose={() => setCheckInModal({ isOpen: false })}
        laboratories={laboratories}
        initialLabId={checkInModal.labId}
        initialUnit={checkInModal.unit}
        profile={profile}
        onSubmit={onTurnOnAc}
      />

      <AcCheckOutModal
        isOpen={checkOutModal.isOpen}
        onClose={() => setCheckOutModal({ isOpen: false, session: null })}
        session={checkOutModal.session}
        laboratories={laboratories}
        onSubmit={onTurnOffAc}
      />

      <AcQrCodeModal
        isOpen={qrCodeModal.isOpen}
        onClose={() => setQrCodeModal({ isOpen: false, laboratory: null })}
        laboratory={qrCodeModal.laboratory}
      />

      <AcQrScannerModal
        isOpen={scannerModal}
        onClose={() => setScannerModal(false)}
        laboratories={laboratories}
        onSelectLab={(labId) => {
          const activeSession = acSessions.find(s => s.labId === labId && s.status === 'active');
          if (activeSession) {
            setCheckOutModal({ isOpen: true, session: activeSession });
          } else {
            setCheckInModal({ isOpen: true, labId });
          }
        }}
      />
    </div>
  );
};
