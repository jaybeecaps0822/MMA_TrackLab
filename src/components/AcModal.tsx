import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { Laboratory, AcUsage, AcMode, UserProfile } from '../types';
import { differenceInMinutes, format } from 'date-fns';
import { 
  Snowflake, 
  Wind, 
  Power, 
  Thermometer, 
  Clock, 
  User, 
  CheckCircle2, 
  AlertTriangle, 
  X, 
  Printer, 
  Download, 
  Copy, 
  Check, 
  QrCode, 
  Zap, 
  Building2, 
  Camera, 
  Sparkles,
  Sliders
} from 'lucide-react';

// ==========================================
// 1. AC Turn ON / In Modal
// ==========================================
interface AcCheckInModalProps {
  isOpen: boolean;
  onClose: () => void;
  laboratories: Laboratory[];
  initialLabId?: string;
  initialUnit?: string;
  profile: UserProfile | null;
  onSubmit: (data: {
    labId: string;
    labName: string;
    acUnit: string;
    temperature: number;
    mode: AcMode;
    notes?: string;
  }) => Promise<void>;
}

export const AcCheckInModal: React.FC<AcCheckInModalProps> = ({
  isOpen,
  onClose,
  laboratories,
  initialLabId,
  initialUnit,
  profile,
  onSubmit,
}) => {
  const [labId, setLabId] = useState(initialLabId || laboratories[0]?.id || '');
  const [acUnit, setAcUnit] = useState(initialUnit || 'Unit 1 - Main Split');
  const [temperature, setTemperature] = useState(23);
  const [mode, setMode] = useState<AcMode>('Cool');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialLabId) {
      setLabId(initialLabId);
    } else if (laboratories.length > 0 && !labId) {
      setLabId(laboratories[0].id);
    }
    if (initialUnit) {
      setAcUnit(initialUnit);
    }
  }, [initialLabId, initialUnit, laboratories, isOpen]);

  if (!isOpen) return null;

  const selectedLab = laboratories.find(l => l.id === labId) || laboratories[0];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!labId) {
      setError('Please select a laboratory.');
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      await onSubmit({
        labId,
        labName: selectedLab?.name || 'Laboratory',
        acUnit,
        temperature,
        mode,
        notes: notes.trim() || undefined,
      });
      onClose();
    } catch (err: unknown) {
      console.error('Failed to log AC turn-on:', err);
      setError((err as Error)?.message || 'Failed to start AC session. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-zinc-200 overflow-hidden transform animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-cyan-600 to-blue-600 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center backdrop-blur-xs border border-white/20 shadow-xs">
              <Snowflake className="w-5 h-5 text-cyan-100 animate-spin-slow" />
            </div>
            <div>
              <h3 className="text-base font-bold tracking-tight">Turn Air-Conditioner ON</h3>
              <p className="text-xs text-cyan-100">Log AC In & Set Temperature</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/10 text-white/80 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-xl text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Laboratory Selection */}
          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1.5 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-zinc-500" />
              Laboratory / Room
            </label>
            <select
              value={labId}
              onChange={(e) => setLabId(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-medium text-zinc-800 focus:outline-none focus:ring-1 focus:ring-blue-600"
            >
              {laboratories.map(lab => (
                <option key={lab.id} value={lab.id}>
                  {lab.name} {lab.location ? `(${lab.location})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* AC Unit Designation */}
          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1.5 flex items-center gap-1.5">
              <Wind className="w-3.5 h-3.5 text-zinc-500" />
              Air-Conditioner Unit
            </label>
            <div className="grid grid-cols-3 gap-2">
              {['Unit 1 - Front', 'Unit 2 - Rear', 'All Units'].map((unit) => (
                <button
                  key={unit}
                  type="button"
                  onClick={() => setAcUnit(unit)}
                  className={`px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-colors cursor-pointer text-center truncate ${
                    acUnit === unit
                      ? 'bg-blue-50 border-blue-600 text-blue-700 font-bold'
                      : 'bg-zinc-50 border-zinc-200 text-zinc-600 hover:bg-zinc-100'
                  }`}
                >
                  {unit}
                </button>
              ))}
            </div>
          </div>

          {/* Target Temperature Slider & Stepper */}
          <div className="bg-cyan-50/60 border border-cyan-100 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-cyan-900 flex items-center gap-1.5">
                <Thermometer className="w-4 h-4 text-cyan-600" />
                Target Temperature
              </span>
              <span className="text-xl font-mono font-black text-blue-700">
                {temperature}°C
              </span>
            </div>
            <input
              type="range"
              min={18}
              max={28}
              step={1}
              value={temperature}
              onChange={(e) => setTemperature(Number(e.target.value))}
              className="w-full accent-blue-600 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-zinc-400 font-mono mt-1">
              <span>18°C (Coldest)</span>
              <span className="text-cyan-700 font-semibold">Recommended: 22°C - 24°C</span>
              <span>28°C (Eco)</span>
            </div>
          </div>

          {/* Mode Selector */}
          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1.5 flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-zinc-500" />
              Operating Mode
            </label>
            <div className="grid grid-cols-4 gap-2">
              {(['Cool', 'Eco', 'Dry', 'Fan'] as AcMode[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  className={`py-1.5 text-xs font-medium rounded-lg border text-center transition-colors cursor-pointer ${
                    mode === m
                      ? 'bg-zinc-900 text-white border-zinc-900 font-bold'
                      : 'bg-zinc-50 text-zinc-600 border-zinc-200 hover:bg-zinc-100'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          {/* Optional Notes */}
          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
              Activity / Reason (Optional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g., MMA 2nd Year Animation class, Faculty meeting"
              className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-blue-600"
            />
          </div>

          {/* User Confirmation Info */}
          <div className="text-[11px] text-zinc-500 flex items-center justify-between border-t border-zinc-100 pt-3">
            <span className="flex items-center gap-1">
              <User className="w-3 h-3 text-zinc-400" />
              Operator: <strong className="text-zinc-700 ml-1">{profile?.displayName || 'User'}</strong>
            </span>
            <span className="font-mono text-zinc-400">{format(new Date(), 'hh:mm a')}</span>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold text-zinc-700 hover:text-zinc-900 bg-zinc-100 hover:bg-zinc-200 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Logging AC ON...</span>
                </>
              ) : (
                <>
                  <Power className="w-3.5 h-3.5" />
                  <span>Turn AC ON (Check In)</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ==========================================
// 2. AC Turn OFF / Out Modal
// ==========================================
interface AcCheckOutModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: AcUsage | null;
  laboratories: Laboratory[];
  onSubmit: (sessionId: string, closingNotes?: string) => Promise<void>;
}

export const AcCheckOutModal: React.FC<AcCheckOutModalProps> = ({
  isOpen,
  onClose,
  session,
  laboratories,
  onSubmit,
}) => {
  const [closingNotes, setClosingNotes] = useState('');
  const [checkedWindows, setCheckedWindows] = useState(true);
  const [checkedRemote, setCheckedRemote] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !session) return null;

  const lab = laboratories.find(l => l.id === session.labId);
  const labName = session.labName || lab?.name || 'Laboratory';

  // Calculate live runtime
  const startedAt = session.turnedOnAt.toDate();
  const runtimeMins = Math.max(1, differenceInMinutes(new Date(), startedAt));
  const runtimeHours = (runtimeMins / 60).toFixed(1);
  const estimatedKWh = ((runtimeMins / 60) * 2.2).toFixed(2); // ~2.2 kW per AC unit average

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      const fullNotes = [
        closingNotes.trim(),
        checkedWindows ? 'Windows checked/closed' : null,
        checkedRemote ? 'Remote returned to dock' : null,
      ].filter(Boolean).join(' · ');

      await onSubmit(session.id, fullNotes || undefined);
      onClose();
    } catch (err: unknown) {
      console.error('Failed to log AC turn-off:', err);
      setError((err as Error)?.message || 'Failed to stop AC session. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-zinc-200 overflow-hidden transform animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-zinc-900 to-zinc-800 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/20 text-red-400 flex items-center justify-center border border-red-500/30">
              <Power className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <h3 className="text-base font-bold tracking-tight">Turn Air-Conditioner OFF</h3>
              <p className="text-xs text-zinc-400">Log AC Out & Finalize Runtime</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/10 text-white/80 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-xl text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Active Session Summary Card */}
          <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[11px] font-mono text-zinc-500 uppercase tracking-wider block">Laboratory</span>
                <span className="font-bold text-sm text-zinc-900">{labName}</span>
              </div>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-cyan-100 text-cyan-800 border border-cyan-200">
                <Snowflake className="w-3 h-3 text-cyan-600" />
                {session.temperature || 23}°C · {session.acUnit}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-zinc-200/80 text-center">
              <div className="bg-white p-2 rounded-lg border border-zinc-200/60">
                <span className="text-[10px] text-zinc-400 block font-mono">Started</span>
                <span className="text-xs font-bold text-zinc-800 font-mono">
                  {format(startedAt, 'hh:mm a')}
                </span>
              </div>
              <div className="bg-white p-2 rounded-lg border border-zinc-200/60">
                <span className="text-[10px] text-zinc-400 block font-mono">Total Runtime</span>
                <span className="text-xs font-bold text-blue-600 font-mono">
                  {runtimeHours} hrs ({runtimeMins}m)
                </span>
              </div>
              <div className="bg-white p-2 rounded-lg border border-zinc-200/60">
                <span className="text-[10px] text-zinc-400 block font-mono">Est. Energy</span>
                <span className="text-xs font-bold text-amber-600 font-mono">
                  ~{estimatedKWh} kWh
                </span>
              </div>
            </div>

            <div className="text-[11px] text-zinc-500 flex items-center gap-1">
              <User className="w-3 h-3 text-zinc-400" />
              <span>Turned on by: <strong>{session.turnedOnByName}</strong></span>
            </div>
          </div>

          {/* Quick Exit Checklist */}
          <div className="space-y-2">
            <span className="text-xs font-semibold text-zinc-700 block">
              Energy Conservation Checklist:
            </span>
            <label className="flex items-center gap-2.5 text-xs text-zinc-600 cursor-pointer p-2 bg-zinc-50 hover:bg-zinc-100 rounded-lg border border-zinc-200/60 transition-colors">
              <input
                type="checkbox"
                checked={checkedWindows}
                onChange={(e) => setCheckedWindows(e.target.checked)}
                className="rounded accent-blue-600"
              />
              <span>All laboratory windows and exit doors are properly closed</span>
            </label>
            <label className="flex items-center gap-2.5 text-xs text-zinc-600 cursor-pointer p-2 bg-zinc-50 hover:bg-zinc-100 rounded-lg border border-zinc-200/60 transition-colors">
              <input
                type="checkbox"
                checked={checkedRemote}
                onChange={(e) => setCheckedRemote(e.target.checked)}
                className="rounded accent-blue-600"
              />
              <span>AC remote control placed back on wall magnetic dock</span>
            </label>
          </div>

          {/* Closing Notes */}
          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
              Closing Remarks / Maintenance Notes (Optional)
            </label>
            <input
              type="text"
              value={closingNotes}
              onChange={(e) => setClosingNotes(e.target.value)}
              placeholder="e.g. Unit running well, slight filter dust noticed"
              className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-900"
            />
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold text-zinc-700 hover:text-zinc-900 bg-zinc-100 hover:bg-zinc-200 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Switching OFF...</span>
                </>
              ) : (
                <>
                  <Power className="w-3.5 h-3.5" />
                  <span>Turn AC OFF & Complete</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ==========================================
// 3. AC QR Code Plaque & Printable Wall Sticker Modal
// ==========================================
interface AcQrCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  laboratory: Laboratory | null;
}

export const AcQrCodeModal: React.FC<AcQrCodeModalProps> = ({
  isOpen,
  onClose,
  laboratory,
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [isGenerating, setIsGenerating] = useState(true);

  const qrUrl = React.useMemo(() => {
    if (typeof window === 'undefined' || !laboratory) return '';
    const base = `${window.location.origin}${window.location.pathname}`;
    const params = new URLSearchParams();
    params.set('acLabId', laboratory.id);
    params.set('action', 'ac-toggle');
    return `${base}?${params.toString()}`;
  }, [laboratory]);

  useEffect(() => {
    if (!isOpen || !laboratory) return;
    setIsGenerating(true);

    QRCode.toDataURL(qrUrl, {
      width: 480,
      margin: 2,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
      errorCorrectionLevel: 'H',
    })
      .then((url) => {
        setQrDataUrl(url);
        setIsGenerating(false);
      })
      .catch((err) => {
        console.error('Failed to generate AC QR code:', err);
        setIsGenerating(false);
      });
  }, [isOpen, laboratory, qrUrl]);

  if (!isOpen || !laboratory) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(qrUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  const handleDownload = () => {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `AC_QRCode_${laboratory.name.replace(/\s+/g, '_')}.png`;
    a.click();
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank', 'width=600,height=750');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Print AC Control Wall Plaque - ${laboratory.name}</title>
          <style>
            @page {
              size: auto;
              margin: 10mm;
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
              margin: 0;
              padding: 24px;
              display: flex;
              align-items: center;
              justify-content: center;
              background-color: #ffffff;
              color: #0f172a;
            }
            .plaque {
              width: 360px;
              border: 3px solid #0284c7;
              border-radius: 20px;
              padding: 28px 24px;
              text-align: center;
              box-sizing: border-box;
              box-shadow: 0 4px 20px rgba(0,0,0,0.06);
            }
            .badge-icon {
              display: inline-block;
              background-color: #0284c7;
              color: white;
              padding: 4px 14px;
              border-radius: 9999px;
              font-size: 11px;
              font-weight: 800;
              text-transform: uppercase;
              letter-spacing: 0.1em;
              margin-bottom: 12px;
            }
            .title {
              font-size: 20px;
              font-weight: 800;
              margin: 0 0 4px 0;
              color: #0f172a;
            }
            .subtitle {
              font-size: 13px;
              color: #0284c7;
              font-weight: 600;
              margin: 0 0 18px 0;
            }
            .qr-image {
              width: 220px;
              height: 220px;
              border: 2px solid #e2e8f0;
              border-radius: 14px;
              padding: 8px;
              background: white;
              margin-bottom: 16px;
            }
            .instructions {
              background: #f0f9ff;
              border: 1px solid #bae6fd;
              border-radius: 12px;
              padding: 12px;
              font-size: 12px;
              color: #0369a1;
              line-height: 1.4;
              margin-bottom: 16px;
              font-weight: 500;
            }
            .footer {
              font-size: 10px;
              color: #94a3b8;
              font-family: monospace;
              border-top: 1px dashed #cbd5e1;
              padding-top: 10px;
            }
          </style>
        </head>
        <body>
          <div class="plaque">
            <div class="badge-icon">❄️ Air-Conditioning Control</div>
            <h1 class="title">${laboratory.name}</h1>
            <p class="subtitle">AIR-CONDITION USE IN & OUT TRACKER</p>
            <img class="qr-image" src="${qrDataUrl}" alt="AC QR Code" />
            <div class="instructions">
              <strong>SCAN TO LOG IN & OUT</strong><br/>
              1. Scan when entering to turn AC ON.<br/>
              2. Scan when leaving to turn AC OFF & save energy.
            </div>
            <div class="footer">
              MMA ICT TrackLab Facilities · ID: ${laboratory.id}
            </div>
          </div>
          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-sm w-full shadow-2xl border border-zinc-200 overflow-hidden transform animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 bg-zinc-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <QrCode className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-bold">Air-Conditioner QR Code</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-white/10 text-white/80 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* QR Code Presentation Plaque */}
        <div className="p-6 text-center space-y-4">
          <div>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-cyan-50 text-cyan-700 border border-cyan-200 uppercase tracking-widest">
              <Snowflake className="w-3 h-3 text-cyan-500" /> Wall Mount QR Sticker
            </span>
            <h4 className="text-lg font-extrabold text-zinc-900 mt-1">{laboratory.name}</h4>
            <p className="text-xs text-zinc-500">Scan to turn AC ON when using room, and OFF when done</p>
          </div>

          <div className="flex justify-center">
            <div className="p-3 bg-white border-2 border-zinc-900 rounded-2xl shadow-md inline-block">
              {isGenerating ? (
                <div className="w-48 h-48 flex items-center justify-center">
                  <span className="w-8 h-8 border-3 border-blue-600/30 border-t-blue-600 rounded-full animate-spin" />
                </div>
              ) : (
                <img
                  src={qrDataUrl}
                  alt={`AC QR Code for ${laboratory.name}`}
                  className="w-48 h-48 block"
                />
              )}
            </div>
          </div>

          <div className="p-3 bg-cyan-50/70 border border-cyan-100 rounded-xl text-xs text-cyan-800 text-left space-y-1">
            <p className="font-semibold flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-cyan-600 shrink-0" />
              How it works on mobile:
            </p>
            <p className="text-[11px] text-cyan-900/80 pl-5">
              Point any smartphone camera at this code. It immediately opens the AC log modal to turn ON (set temp) or turn OFF.
            </p>
          </div>

          {/* Action buttons */}
          <div className="grid grid-cols-3 gap-2 pt-1">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center justify-center gap-1 px-3 py-2 text-xs font-semibold text-white bg-zinc-900 hover:bg-zinc-800 rounded-xl transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print</span>
            </button>
            <button
              type="button"
              onClick={handleDownload}
              className="inline-flex items-center justify-center gap-1 px-3 py-2 text-xs font-semibold text-zinc-700 bg-zinc-100 hover:bg-zinc-200 rounded-xl transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Save PNG</span>
            </button>
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center justify-center gap-1 px-3 py-2 text-xs font-semibold text-zinc-700 bg-zinc-100 hover:bg-zinc-200 rounded-xl transition-colors cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied!' : 'Link'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// 4. Quick QR Camera Scanner & Room Selector Modal
// ==========================================
interface AcQrScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  laboratories: Laboratory[];
  onSelectLab: (labId: string) => void;
}

export const AcQrScannerModal: React.FC<AcQrScannerModalProps> = ({
  isOpen,
  onClose,
  laboratories,
  onSelectLab,
}) => {
  const [useCamera, setUseCamera] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    let stream: MediaStream | null = null;
    if (isOpen && useCamera) {
      navigator.mediaDevices?.getUserMedia({ video: { facingMode: 'environment' } })
        .then((s) => {
          stream = s;
          if (videoRef.current) {
            videoRef.current.srcObject = s;
          }
        })
        .catch((err) => {
          console.error('Camera access denied or unavailable:', err);
          setCameraError('Camera access unavailable. You can tap any laboratory below to log AC In/Out.');
        });
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach(t => t.stop());
      }
    };
  }, [isOpen, useCamera]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-zinc-200 overflow-hidden transform animate-in zoom-in-95 duration-150">
        <div className="p-4 bg-zinc-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Camera className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-bold">Scan AC QR Code</h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 text-white/80 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Camera Viewfinder */}
          {useCamera && !cameraError ? (
            <div className="relative aspect-square rounded-2xl overflow-hidden bg-black flex items-center justify-center">
              <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
              <div className="absolute inset-8 border-2 border-cyan-400/80 rounded-2xl pointer-events-none animate-pulse flex items-center justify-center">
                <span className="text-[11px] text-white/80 bg-black/40 px-2 py-1 rounded backdrop-blur-xs">
                  Align QR Code
                </span>
              </div>
            </div>
          ) : (
            <div className="p-6 bg-zinc-50 border border-dashed border-zinc-300 rounded-2xl text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-cyan-100 text-cyan-700 flex items-center justify-center mx-auto">
                <QrCode className="w-6 h-6 text-cyan-600" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-zinc-800">Scan or Select Room</h4>
                <p className="text-xs text-zinc-500 mt-1">
                  Point your camera at the AC QR sticker on the wall, or tap your room below:
                </p>
              </div>
              <button
                type="button"
                onClick={() => setUseCamera(true)}
                className="inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold text-zinc-900 bg-white border border-zinc-200 rounded-xl hover:bg-zinc-100 transition-colors shadow-2xs"
              >
                <Camera className="w-3.5 h-3.5 text-zinc-600" />
                <span>Launch Camera Scanner</span>
              </button>
              {cameraError && (
                <p className="text-[11px] text-amber-600">{cameraError}</p>
              )}
            </div>
          )}

          {/* Quick Laboratory Tap Options */}
          <div>
            <span className="text-xs font-semibold text-zinc-700 block mb-2">
              Select Laboratory Directly:
            </span>
            <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
              {laboratories.map((lab) => (
                <button
                  key={lab.id}
                  type="button"
                  onClick={() => {
                    onSelectLab(lab.id);
                    onClose();
                  }}
                  className="p-2.5 text-left bg-zinc-50 hover:bg-blue-50/80 border border-zinc-200 hover:border-blue-300 rounded-xl transition-all cursor-pointer group"
                >
                  <span className="font-bold text-xs text-zinc-800 group-hover:text-blue-700 block truncate">
                    {lab.name}
                  </span>
                  <span className="text-[10px] text-zinc-400 block truncate">
                    {lab.location || 'ICT Building'}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
