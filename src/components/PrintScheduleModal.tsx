import React, { useState, useEffect, useMemo } from 'react';
import { Schedule, Laboratory, Trainer } from '../types';
import { SchoolComputerLogo } from './SchoolComputerLogo';
import { 
  Printer, 
  X, 
  Calendar, 
  Clock, 
  Building2, 
  Users, 
  FileText, 
  Check, 
  Layers, 
  Sparkles, 
  CheckCircle2, 
  Info,
  Download,
  ExternalLink,
  ArrowLeft,
  Settings2,
  ChevronDown,
  ChevronUp,
  RotateCcw
} from 'lucide-react';
import { formatTime12, timeToMinutes, doTimesOverlap } from '../utils/conflicts';

export type PrintMode = 'room' | 'faculty';

export interface HourlySlot {
  id: string;
  label: string;
  startTime: string; // "08:00"
  endTime: string;   // "09:00"
  isBreak?: boolean;
}

export const PRINT_HOURLY_SLOTS: HourlySlot[] = [
  { id: 'slot-1', label: '8:00AM - 9:00AM', startTime: '08:00', endTime: '09:00' },
  { id: 'slot-2', label: '9:00AM - 10:00AM', startTime: '09:00', endTime: '10:00' },
  { id: 'slot-3', label: '10:00AM - 11:00AM', startTime: '10:00', endTime: '11:00' },
  { id: 'slot-4', label: '11:00AM - 12:00NN', startTime: '11:00', endTime: '12:00' },
  { id: 'slot-break', label: '12:00NN - 1:00PM', startTime: '12:00', endTime: '13:00', isBreak: true },
  { id: 'slot-5', label: '1:00PM - 2:00PM', startTime: '13:00', endTime: '14:00' },
  { id: 'slot-6', label: '2:00PM - 3:00PM', startTime: '14:00', endTime: '15:00' },
  { id: 'slot-7', label: '3:00PM - 4:00PM', startTime: '15:00', endTime: '16:00' },
  { id: 'slot-8', label: '4:00PM - 5:00PM', startTime: '16:00', endTime: '17:00' },
];

export const PRINT_DAYS: Schedule['day'][] = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

export interface SignerInfo {
  label: string;
  name: string;
  role: string;
}

export interface PrintSettings {
  headerTitle: string;
  showLogo: boolean;
  showDepEdSubheader: boolean;
  subtitle: string;
  includeSignOff: boolean;
  signer1: SignerInfo;
  signer2: SignerInfo;
  signer3: SignerInfo;
}

export const DEFAULT_PRINT_SETTINGS: PrintSettings = {
  headerTitle: 'MMA - Information Communications Technology Department',
  showLogo: false,
  showDepEdSubheader: false,
  subtitle: '',
  includeSignOff: true,
  signer1: {
    label: 'Prepared by:',
    name: 'MR. JOVITO CAPOY',
    role: 'Laboratory Custodian & ICT In-Charge',
  },
  signer2: {
    label: 'Verified by:',
    name: 'ACADEMIC COORDINATOR',
    role: 'Head of Curriculum & Scheduling',
  },
  signer3: {
    label: 'Approved by:',
    name: 'SCHOOL PRINCIPAL / DIRECTOR',
    role: 'MMA Institute of Technology',
  },
};

const STORAGE_KEY = 'mma_timetable_print_settings_v2';

function loadSavedPrintSettings(): PrintSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        ...DEFAULT_PRINT_SETTINGS,
        ...parsed,
        signer1: { ...DEFAULT_PRINT_SETTINGS.signer1, ...(parsed.signer1 || {}) },
        signer2: { ...DEFAULT_PRINT_SETTINGS.signer2, ...(parsed.signer2 || {}) },
        signer3: { ...DEFAULT_PRINT_SETTINGS.signer3, ...(parsed.signer3 || {}) },
      };
    }
  } catch (e) {
    console.warn('Failed to load saved print settings from localStorage', e);
  }
  return DEFAULT_PRINT_SETTINGS;
}

function savePrintSettings(settings: PrintSettings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (e) {
    console.warn('Failed to persist print settings', e);
  }
}

interface PrintScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  schedules: Schedule[];
  laboratories: Laboratory[];
  trainers: Trainer[];
  initialMode?: PrintMode;
  initialTargetId?: string; // labId or trainerId
}

/**
 * Trigger print via hidden iframe to bypass modal scrolling / visibility clipping bugs.
 */
function triggerDirectPrint(elementId: string, title: string): boolean {
  const container = document.getElementById(elementId);
  if (!container) return false;

  try {
    const iframe = document.createElement('iframe');
    iframe.setAttribute('style', 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden;');
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) {
      document.body.removeChild(iframe);
      return false;
    }

    let stylesHtml = '';
    document.querySelectorAll('style, link[rel="stylesheet"]').forEach(el => {
      stylesHtml += el.outerHTML;
    });

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8">
          <title>${title}</title>
          ${stylesHtml}
          <style>
            @page { size: landscape; margin: 6mm; }
            * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            body { background: white !important; margin: 0 !important; padding: 4mm !important; font-family: ui-sans-serif, system-ui, sans-serif; }
            .print-sheet { page-break-after: always !important; break-after: page !important; margin: 0 !important; padding: 6mm !important; box-shadow: none !important; border: none !important; width: 100% !important; box-sizing: border-box !important; }
            .print-sheet:last-child { page-break-after: auto !important; break-after: auto !important; }
          </style>
        </head>
        <body>
          ${container.innerHTML}
        </body>
      </html>
    `);
    doc.close();

    setTimeout(() => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch (err) {
        console.warn('Iframe print call error:', err);
      } finally {
        setTimeout(() => {
          try {
            document.body.removeChild(iframe);
          } catch (_) {}
        }, 3000);
      }
    }, 300);

    return true;
  } catch (err) {
    console.warn('triggerDirectPrint encountered error:', err);
    return false;
  }
}

/**
 * Download self-contained HTML file that auto-triggers print when opened.
 */
function downloadPrintableHtml(elementId: string, title: string, headerTitle: string) {
  const container = document.getElementById(elementId);
  if (!container) return;

  let stylesHtml = '';
  document.querySelectorAll('style, link[rel="stylesheet"]').forEach(el => {
    stylesHtml += el.outerHTML;
  });

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  ${stylesHtml}
  <style>
    @page { size: landscape; margin: 6mm; }
    * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    body { background: #f4f4f5; margin: 0; padding: 20px; font-family: ui-sans-serif, system-ui, sans-serif; }
    .print-sheet { background: white; margin: 0 auto 24px auto; padding: 24px; max-width: 1200px; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); border-radius: 12px; }
    .print-toolbar { position: sticky; top: 0; z-index: 100; background: #18181b; color: white; padding: 12px 20px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; border-radius: 10px; box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.2); }
    .print-btn { background: #f59e0b; color: #18181b; font-weight: bold; border: none; padding: 8px 18px; border-radius: 8px; cursor: pointer; font-size: 13px; display: inline-flex; align-items: center; gap: 6px; }
    .print-btn:hover { background: #d97706; }
    @media print {
      body { background: white !important; padding: 0 !important; }
      .print-toolbar { display: none !important; }
      .print-sheet { box-shadow: none !important; border-radius: 0 !important; margin: 0 !important; padding: 6mm !important; page-break-after: always !important; }
      .print-sheet:last-child { page-break-after: auto !important; }
    }
  </style>
</head>
<body>
  <div class="print-toolbar">
    <div>
      <strong style="font-size: 15px;">${headerTitle}</strong>
      <div style="font-size: 12px; color: #a1a1aa;">Official Weekly Timetable Document · Ready for Printing</div>
    </div>
    <button class="print-btn" onclick="window.print()">
      🖨️ Print Document (Landscape)
    </button>
  </div>
  ${container.innerHTML}
</body>
</html>`;

  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${title.replace(/\s+/g, '_')}_Weekly_Schedule.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export const PrintScheduleModal: React.FC<PrintScheduleModalProps> = ({
  isOpen,
  onClose,
  schedules,
  laboratories,
  trainers,
  initialMode = 'room',
  initialTargetId,
}) => {
  const [printMode, setPrintMode] = useState<PrintMode>(initialMode);
  const [selectedTargetId, setSelectedTargetId] = useState<string>(
    initialTargetId || (initialMode === 'room' ? laboratories[0]?.id || 'all' : trainers[0]?.id || 'all')
  );
  const [academicTerm, setAcademicTerm] = useState('First Semester, A.Y. 2024–2025');
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  // Settings for customizable header and sign-off block
  const [settings, setSettings] = useState<PrintSettings>(loadSavedPrintSettings);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Synchronize when modal is opened with new props
  useEffect(() => {
    if (isOpen) {
      const mode = initialMode || 'room';
      setPrintMode(mode);
      if (initialTargetId) {
        setSelectedTargetId(initialTargetId);
      } else {
        setSelectedTargetId(mode === 'room' ? laboratories[0]?.id || 'all' : trainers[0]?.id || 'all');
      }
      setFeedbackMessage(null);
    }
  }, [isOpen, initialMode, initialTargetId, laboratories, trainers]);

  // Update setting helper
  const handleUpdateSettings = (updates: Partial<PrintSettings>) => {
    setSettings(prev => {
      const next = { ...prev, ...updates };
      savePrintSettings(next);
      return next;
    });
  };

  const handleUpdateSigner = (key: 'signer1' | 'signer2' | 'signer3', field: keyof SignerInfo, val: string) => {
    setSettings(prev => {
      const next = {
        ...prev,
        [key]: {
          ...prev[key],
          [field]: val,
        },
      };
      savePrintSettings(next);
      return next;
    });
  };

  const handleResetSettings = () => {
    setSettings(DEFAULT_PRINT_SETTINGS);
    savePrintSettings(DEFAULT_PRINT_SETTINGS);
  };

  // Sync mode switch
  const handleModeChange = (mode: PrintMode) => {
    setPrintMode(mode);
    if (mode === 'room') {
      setSelectedTargetId(laboratories[0]?.id || 'all');
    } else {
      setSelectedTargetId(trainers[0]?.id || 'all');
    }
  };

  // Determine which entities to generate print sheets for
  const targetSheets = useMemo(() => {
    if (printMode === 'room') {
      if (selectedTargetId === 'all') {
        return laboratories.map(lab => ({
          type: 'room' as const,
          entity: lab,
          schedules: schedules.filter(s => s.labId === lab.id),
        }));
      }
      const singleLab = laboratories.find(l => l.id === selectedTargetId);
      if (!singleLab) return [];
      return [{
        type: 'room' as const,
        entity: singleLab,
        schedules: schedules.filter(s => s.labId === singleLab.id),
      }];
    } else {
      if (selectedTargetId === 'all') {
        return trainers.map(trainer => ({
          type: 'faculty' as const,
          entity: trainer,
          schedules: schedules.filter(s => s.trainerId === trainer.id || s.teacherName.toLowerCase() === trainer.name.toLowerCase()),
        }));
      }
      const singleTrainer = trainers.find(t => t.id === selectedTargetId);
      if (!singleTrainer) return [];
      return [{
        type: 'faculty' as const,
        entity: singleTrainer,
        schedules: schedules.filter(s => s.trainerId === singleTrainer.id || s.teacherName.toLowerCase() === singleTrainer.name.toLowerCase()),
      }];
    }
  }, [printMode, selectedTargetId, laboratories, trainers, schedules]);

  const handlePrint = () => {
    setFeedbackMessage('Initiating print dialog...');
    triggerDirectPrint('printable-schedule-document', settings.headerTitle);
    
    try {
      window.print();
    } catch (e) {
      console.warn('Native window.print() exception:', e);
    }

    setTimeout(() => {
      setFeedbackMessage('If the print preview dialog is blocked by the browser iframe, please use "Open in New Tab" or "Download HTML".');
    }, 1200);
  };

  const handleDownload = () => {
    const titleName = printMode === 'room' 
      ? (selectedTargetId === 'all' ? 'All_Laboratories' : laboratories.find(l => l.id === selectedTargetId)?.name || 'Laboratory')
      : (selectedTargetId === 'all' ? 'All_Faculty' : trainers.find(t => t.id === selectedTargetId)?.name || 'Faculty');
    
    downloadPrintableHtml('printable-schedule-document', `MMA_${titleName}`, settings.headerTitle);
    setFeedbackMessage('HTML schedule file downloaded successfully.');
  };

  const standaloneUrl = useMemo(() => {
    const params = new URLSearchParams();
    params.set('printView', 'true');
    params.set('mode', printMode);
    params.set('targetId', selectedTargetId);
    params.set('term', academicTerm);
    return `${window.location.pathname}?${params.toString()}`;
  }, [printMode, selectedTargetId, academicTerm]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-zinc-950/75 backdrop-blur-xs overflow-y-auto print:p-0 print:bg-white print:static print:inset-auto">
      {/* Container Dialog */}
      <div className="bg-white rounded-2xl w-full max-w-5xl shadow-2xl border border-zinc-200 overflow-hidden my-4 sm:my-8 flex flex-col max-h-[94vh] print:max-h-none print:shadow-none print:border-none print:m-0 print:w-full print:rounded-none">
        
        {/* Modal Top Control Bar (Screen Only) */}
        <div className="p-4 sm:p-5 border-b border-zinc-200 bg-zinc-50 flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0 print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-zinc-900 text-white flex items-center justify-center shadow-xs">
              <Printer className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-zinc-900">
                  Print Weekly Timetable Schedule
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 bg-amber-100 text-amber-900 font-bold rounded-md uppercase">
                  Institutional Standard
                </span>
              </div>
              <p className="text-xs text-zinc-500">
                Full-cell edge-to-edge timetable layout with Monday–Saturday hourly periods, 12–1PM Health Break, and signature endorsement.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Customize Header & Sign-Off Button */}
            <button
              type="button"
              onClick={() => setIsSettingsOpen(!isSettingsOpen)}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer border ${
                isSettingsOpen 
                  ? 'bg-zinc-900 text-white border-zinc-900 shadow-xs' 
                  : 'bg-white hover:bg-zinc-100 text-zinc-800 border-zinc-300'
              }`}
              title="Customize Header & Sign-Off Block"
            >
              <Settings2 className="w-3.5 h-3.5 text-amber-500" />
              <span>Header & Sign-Off Settings</span>
              {isSettingsOpen ? <ChevronUp className="w-3.5 h-3.5 ml-0.5" /> : <ChevronDown className="w-3.5 h-3.5 ml-0.5" />}
            </button>

            {/* Primary Print Button */}
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer active:scale-95"
              title="Trigger browser print preview"
            >
              <Printer className="w-4 h-4 text-amber-400" />
              <span>Print Schedule Document</span>
            </button>

            {/* Standalone Tab Link */}
            <a
              href={standaloneUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              title="Open full page in standalone tab without iframe constraints"
            >
              <ExternalLink className="w-3.5 h-3.5 text-blue-600" />
              <span>Open in New Tab</span>
            </a>

            {/* Download HTML Button */}
            <button
              type="button"
              onClick={handleDownload}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 border border-zinc-300 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              title="Download print-ready standalone HTML file"
            >
              <Download className="w-3.5 h-3.5 text-zinc-700" />
              <span>Download HTML</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-200 rounded-xl transition-colors cursor-pointer"
              aria-label="Close dialog"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Collapsible Header & Sign-Off Settings Panel (Screen Only) */}
        {isSettingsOpen && (
          <div className="bg-zinc-100 border-b border-zinc-300 p-4 sm:p-5 shrink-0 print:hidden text-xs animate-in slide-in-from-top-2 duration-150">
            <div className="max-w-4xl mx-auto space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-300 pb-2">
                <div className="flex items-center gap-2">
                  <Settings2 className="w-4 h-4 text-amber-600" />
                  <span className="font-extrabold text-zinc-900 uppercase tracking-wide text-xs">
                    Document Header & Sign-Off Customization
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleResetSettings}
                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-zinc-200 text-zinc-700 border border-zinc-300 rounded-lg text-[11px] font-semibold cursor-pointer transition-colors"
                  title="Reset to default requested format"
                >
                  <RotateCcw className="w-3 h-3 text-zinc-500" />
                  <span>Reset to Defaults</span>
                </button>
              </div>

              {/* Header Settings Section */}
              <div className="bg-white p-3.5 rounded-xl border border-zinc-200 shadow-2xs space-y-3">
                <div className="font-bold text-zinc-900 text-xs flex items-center justify-between">
                  <span>1. Header Title & Layout Elements</span>
                  <span className="text-[10px] text-zinc-400 font-normal">Changes appear immediately in the document preview</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-700 mb-1">
                      Header Title:
                    </label>
                    <input
                      type="text"
                      value={settings.headerTitle}
                      onChange={(e) => handleUpdateSettings({ headerTitle: e.target.value })}
                      placeholder="e.g. MMA - Information Communications Technology Department"
                      className="w-full px-3 py-1.5 bg-zinc-50 border border-zinc-300 rounded-lg text-xs font-semibold text-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-700 mb-1">
                      Subtitle / Department Tagline:
                    </label>
                    <input
                      type="text"
                      value={settings.subtitle}
                      onChange={(e) => handleUpdateSettings({ subtitle: e.target.value })}
                      placeholder="Optional subtitle (leave blank to omit)"
                      className="w-full px-3 py-1.5 bg-zinc-50 border border-zinc-300 rounded-lg text-xs text-zinc-800 focus:outline-none focus:ring-1 focus:ring-zinc-900"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-6 pt-1 border-t border-zinc-100">
                  <label className="flex items-center gap-2 cursor-pointer select-none text-zinc-700 font-medium">
                    <input
                      type="checkbox"
                      checked={settings.showLogo}
                      onChange={(e) => handleUpdateSettings({ showLogo: e.target.checked })}
                      className="rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900 w-4 h-4 cursor-pointer"
                    />
                    <span>Include School & Computer Logo</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer select-none text-zinc-700 font-medium">
                    <input
                      type="checkbox"
                      checked={settings.showDepEdSubheader}
                      onChange={(e) => handleUpdateSettings({ showDepEdSubheader: e.target.checked })}
                      className="rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900 w-4 h-4 cursor-pointer"
                    />
                    <span>Include "Republic of the Philippines · Department of Education" bar</span>
                  </label>
                </div>
              </div>

              {/* Sign-Off Block Customization */}
              <div className="bg-white p-3.5 rounded-xl border border-zinc-200 shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-zinc-900 text-xs">
                    <span>2. Sign-Off Certification Block</span>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer select-none text-zinc-800 font-semibold">
                    <input
                      type="checkbox"
                      checked={settings.includeSignOff}
                      onChange={(e) => handleUpdateSettings({ includeSignOff: e.target.checked })}
                      className="rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900 w-4 h-4 cursor-pointer"
                    />
                    <span>Show Sign-Off Block</span>
                  </label>
                </div>

                {settings.includeSignOff && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
                    {/* Signer 1 */}
                    <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-lg space-y-2">
                      <div className="font-bold text-zinc-800 text-[11px] uppercase tracking-wider">
                        Left Signatory (1)
                      </div>
                      <div>
                        <label className="block text-[10px] text-zinc-500 font-semibold mb-0.5">Title / Action:</label>
                        <input
                          type="text"
                          value={settings.signer1.label}
                          onChange={(e) => handleUpdateSigner('signer1', 'label', e.target.value)}
                          className="w-full px-2 py-1 bg-white border border-zinc-300 rounded text-xs font-medium text-zinc-800"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-zinc-500 font-semibold mb-0.5">Full Name:</label>
                        <input
                          type="text"
                          value={settings.signer1.name}
                          onChange={(e) => handleUpdateSigner('signer1', 'name', e.target.value)}
                          className="w-full px-2 py-1 bg-white border border-zinc-300 rounded text-xs font-bold text-zinc-950"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-zinc-500 font-semibold mb-0.5">Designation / Role:</label>
                        <input
                          type="text"
                          value={settings.signer1.role}
                          onChange={(e) => handleUpdateSigner('signer1', 'role', e.target.value)}
                          className="w-full px-2 py-1 bg-white border border-zinc-300 rounded text-xs text-zinc-700"
                        />
                      </div>
                    </div>

                    {/* Signer 2 */}
                    <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-lg space-y-2">
                      <div className="font-bold text-zinc-800 text-[11px] uppercase tracking-wider">
                        Middle Signatory (2)
                      </div>
                      <div>
                        <label className="block text-[10px] text-zinc-500 font-semibold mb-0.5">Title / Action:</label>
                        <input
                          type="text"
                          value={settings.signer2.label}
                          onChange={(e) => handleUpdateSigner('signer2', 'label', e.target.value)}
                          className="w-full px-2 py-1 bg-white border border-zinc-300 rounded text-xs font-medium text-zinc-800"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-zinc-500 font-semibold mb-0.5">Full Name:</label>
                        <input
                          type="text"
                          value={settings.signer2.name}
                          onChange={(e) => handleUpdateSigner('signer2', 'name', e.target.value)}
                          className="w-full px-2 py-1 bg-white border border-zinc-300 rounded text-xs font-bold text-zinc-950"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-zinc-500 font-semibold mb-0.5">Designation / Role:</label>
                        <input
                          type="text"
                          value={settings.signer2.role}
                          onChange={(e) => handleUpdateSigner('signer2', 'role', e.target.value)}
                          className="w-full px-2 py-1 bg-white border border-zinc-300 rounded text-xs text-zinc-700"
                        />
                      </div>
                    </div>

                    {/* Signer 3 */}
                    <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-lg space-y-2">
                      <div className="font-bold text-zinc-800 text-[11px] uppercase tracking-wider">
                        Right Signatory (3)
                      </div>
                      <div>
                        <label className="block text-[10px] text-zinc-500 font-semibold mb-0.5">Title / Action:</label>
                        <input
                          type="text"
                          value={settings.signer3.label}
                          onChange={(e) => handleUpdateSigner('signer3', 'label', e.target.value)}
                          className="w-full px-2 py-1 bg-white border border-zinc-300 rounded text-xs font-medium text-zinc-800"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-zinc-500 font-semibold mb-0.5">Full Name:</label>
                        <input
                          type="text"
                          value={settings.signer3.name}
                          onChange={(e) => handleUpdateSigner('signer3', 'name', e.target.value)}
                          className="w-full px-2 py-1 bg-white border border-zinc-300 rounded text-xs font-bold text-zinc-950"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-zinc-500 font-semibold mb-0.5">Designation / Role:</label>
                        <input
                          type="text"
                          value={settings.signer3.role}
                          onChange={(e) => handleUpdateSigner('signer3', 'role', e.target.value)}
                          className="w-full px-2 py-1 bg-white border border-zinc-300 rounded text-xs text-zinc-700"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Configuration Filters Strip (Screen Only) */}
        <div className="px-5 py-3 bg-white border-b border-zinc-200 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0 print:hidden">
          {/* Format Selection Tab */}
          <div className="flex items-center gap-2">
            <span className="font-semibold text-zinc-500 uppercase tracking-wider text-[10px]">Print Mode:</span>
            <div className="inline-flex p-1 bg-zinc-100 rounded-xl">
              <button
                type="button"
                onClick={() => handleModeChange('room')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  printMode === 'room'
                    ? 'bg-white text-zinc-900 shadow-xs'
                    : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                <Building2 className="w-3.5 h-3.5 text-blue-600" />
                <span>By Room / Laboratory</span>
              </button>
              <button
                type="button"
                onClick={() => handleModeChange('faculty')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  printMode === 'faculty'
                    ? 'bg-white text-zinc-900 shadow-xs'
                    : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                <Users className="w-3.5 h-3.5 text-emerald-600" />
                <span>By Faculty Member</span>
              </button>
            </div>
          </div>

          {/* Scope Dropdown */}
          <div className="flex items-center gap-2">
            <span className="font-semibold text-zinc-500 uppercase tracking-wider text-[10px]">
              {printMode === 'room' ? 'Select Room:' : 'Select Faculty:'}
            </span>
            <select
              value={selectedTargetId}
              onChange={(e) => setSelectedTargetId(e.target.value)}
              className="px-3 py-1.5 bg-zinc-50 border border-zinc-200 rounded-xl font-semibold text-zinc-900 text-xs focus:outline-none focus:ring-1 focus:ring-zinc-900 cursor-pointer min-w-[200px]"
            >
              {printMode === 'room' ? (
                <>
                  <option value="all">★ All Laboratories ({laboratories.length} Rooms)</option>
                  {laboratories.map(lab => (
                    <option key={lab.id} value={lab.id}>
                      {lab.name} {lab.capacity ? `(${lab.capacity} stations)` : ''}
                    </option>
                  ))}
                </>
              ) : (
                <>
                  <option value="all">★ All Faculty ({trainers.length} Instructors)</option>
                  {trainers.map(trainer => (
                    <option key={trainer.id} value={trainer.id}>
                      {trainer.name} {trainer.employeeId ? `[${trainer.employeeId}]` : ''}
                    </option>
                  ))}
                </>
              )}
            </select>
          </div>

          {/* Term label */}
          <div className="flex items-center gap-2">
            <span className="font-semibold text-zinc-500 uppercase tracking-wider text-[10px]">Term:</span>
            <input
              type="text"
              value={academicTerm}
              onChange={(e) => setAcademicTerm(e.target.value)}
              placeholder="Academic Term"
              className="px-2.5 py-1 bg-zinc-50 border border-zinc-200 rounded-lg text-xs font-medium text-zinc-800 w-44"
            />
          </div>
        </div>

        {/* Feedback / Instructions Strip */}
        {feedbackMessage && (
          <div className="px-5 py-2.5 bg-amber-50 border-b border-amber-200 text-xs text-amber-900 flex items-center justify-between shrink-0 print:hidden animate-in fade-in">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-amber-700 shrink-0" />
              <span>{feedbackMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => setFeedbackMessage(null)}
              className="text-amber-800 hover:text-amber-950 font-bold ml-2 text-xs"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Scrollable Document Preview & Printable Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-zinc-100/70 print:p-0 print:bg-white print:overflow-visible">
          <div id="printable-schedule-document" className="space-y-8 print:space-y-0">
            {targetSheets.map((sheet, idx) => (
              <ScheduleDocumentSheet
                key={idx}
                sheet={sheet}
                laboratories={laboratories}
                trainers={trainers}
                academicTerm={academicTerm}
                settings={settings}
              />
            ))}
          </div>
        </div>

        {/* Modal Footer Controls (Screen Only) */}
        <div className="p-4 bg-zinc-50 border-t border-zinc-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0 print:hidden text-xs">
          <div className="text-zinc-500 text-center sm:text-left flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>Header set to <strong>"{settings.headerTitle}"</strong>. Select <strong>Landscape</strong> orientation when printing.</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-zinc-200 hover:bg-zinc-300 text-zinc-800 rounded-xl font-semibold transition-colors cursor-pointer"
            >
              Close
            </button>
            <a
              href={standaloneUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all shadow-xs cursor-pointer inline-flex items-center gap-1.5"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Open in New Tab</span>
            </a>
            <button
              type="button"
              onClick={handlePrint}
              className="px-5 py-2 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl font-bold transition-all shadow-sm cursor-pointer flex items-center gap-1.5 active:scale-95"
            >
              <Printer className="w-4 h-4 text-amber-400" />
              <span>Print Timetable Now</span>
            </button>
          </div>
        </div>
      </div>

      {/* Global Print Style Injection */}
      <style>{`
        @media print {
          /* Hide non-print application chrome */
          nav, header, footer, aside, .print-hidden, [role="dialog"] > div > div.print\\:hidden {
            display: none !important;
          }

          /* Reset body and layout */
          html, body {
            background: white !important;
            color: black !important;
            margin: 0 !important;
            padding: 0 !important;
            height: auto !important;
            min-height: 100% !important;
            overflow: visible !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          /* Allow modal container to flow freely without fixed clipping */
          .fixed.inset-0 {
            position: static !important;
            overflow: visible !important;
            background: white !important;
            padding: 0 !important;
            margin: 0 !important;
            height: auto !important;
            max-height: none !important;
          }

          .max-h-\\[94vh\\] {
            max-height: none !important;
            overflow: visible !important;
            box-shadow: none !important;
            border: none !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            max-width: none !important;
          }

          .overflow-y-auto {
            overflow: visible !important;
            height: auto !important;
            max-height: none !important;
          }

          #printable-schedule-document {
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
          }

          .print-sheet {
            page-break-after: always !important;
            break-after: page !important;
            margin: 0 !important;
            padding: 6mm !important;
            border: none !important;
            box-shadow: none !important;
            width: 100% !important;
            box-sizing: border-box !important;
          }

          .print-sheet:last-child {
            page-break-after: auto !important;
            break-after: auto !important;
          }

          @page {
            size: landscape;
            margin: 6mm;
          }
        }
      `}</style>
    </div>
  );
};

/* -------------------------------------------------------------------------
 * Standalone Print View (For rendering directly when opened with ?printView=true)
 * ----------------------------------------------------------------------- */
interface StandalonePrintViewProps {
  schedules: Schedule[];
  laboratories: Laboratory[];
  trainers: Trainer[];
  initialMode?: PrintMode;
  initialTargetId?: string;
  initialTerm?: string;
  initialSignOff?: boolean;
  onBack: () => void;
}

export const StandalonePrintView: React.FC<StandalonePrintViewProps> = ({
  schedules,
  laboratories,
  trainers,
  initialMode = 'room',
  initialTargetId,
  initialTerm = 'First Semester, A.Y. 2024–2025',
  initialSignOff,
  onBack,
}) => {
  const [printMode, setPrintMode] = useState<PrintMode>(initialMode);
  const [selectedTargetId, setSelectedTargetId] = useState<string>(
    initialTargetId || (initialMode === 'room' ? laboratories[0]?.id || 'all' : trainers[0]?.id || 'all')
  );
  const [academicTerm, setAcademicTerm] = useState(initialTerm);
  const [settings, setSettings] = useState<PrintSettings>(() => {
    const saved = loadSavedPrintSettings();
    if (initialSignOff !== undefined) {
      return { ...saved, includeSignOff: initialSignOff };
    }
    return saved;
  });
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const handleUpdateSettings = (updates: Partial<PrintSettings>) => {
    setSettings(prev => {
      const next = { ...prev, ...updates };
      savePrintSettings(next);
      return next;
    });
  };

  const handleUpdateSigner = (key: 'signer1' | 'signer2' | 'signer3', field: keyof SignerInfo, val: string) => {
    setSettings(prev => {
      const next = {
        ...prev,
        [key]: {
          ...prev[key],
          [field]: val,
        },
      };
      savePrintSettings(next);
      return next;
    });
  };

  const handleResetSettings = () => {
    setSettings(DEFAULT_PRINT_SETTINGS);
    savePrintSettings(DEFAULT_PRINT_SETTINGS);
  };

  const targetSheets = useMemo(() => {
    if (printMode === 'room') {
      if (selectedTargetId === 'all') {
        return laboratories.map(lab => ({
          type: 'room' as const,
          entity: lab,
          schedules: schedules.filter(s => s.labId === lab.id),
        }));
      }
      const singleLab = laboratories.find(l => l.id === selectedTargetId);
      if (!singleLab) return [];
      return [{
        type: 'room' as const,
        entity: singleLab,
        schedules: schedules.filter(s => s.labId === singleLab.id),
      }];
    } else {
      if (selectedTargetId === 'all') {
        return trainers.map(trainer => ({
          type: 'faculty' as const,
          entity: trainer,
          schedules: schedules.filter(s => s.trainerId === trainer.id || s.teacherName.toLowerCase() === trainer.name.toLowerCase()),
        }));
      }
      const singleTrainer = trainers.find(t => t.id === selectedTargetId);
      if (!singleTrainer) return [];
      return [{
        type: 'faculty' as const,
        entity: singleTrainer,
        schedules: schedules.filter(s => s.trainerId === singleTrainer.id || s.teacherName.toLowerCase() === singleTrainer.name.toLowerCase()),
      }];
    }
  }, [printMode, selectedTargetId, laboratories, trainers, schedules]);

  return (
    <div className="min-h-screen bg-zinc-100 font-sans text-zinc-900 print:bg-white print:p-0">
      {/* Sticky Action Toolbar (Screen Only) */}
      <div className="sticky top-0 z-50 bg-zinc-900 text-white px-4 sm:px-8 py-3.5 shadow-md flex flex-wrap items-center justify-between gap-4 print:hidden">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Dashboard</span>
          </button>
          <div className="border-l border-zinc-700 pl-3">
            <h1 className="text-sm font-bold tracking-tight">{settings.headerTitle}</h1>
            <p className="text-[11px] text-zinc-400">Standalone Print Mode · Landscape Format</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs">
          {/* Settings Toggle */}
          <button
            type="button"
            onClick={() => setIsSettingsOpen(!isSettingsOpen)}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer border ${
              isSettingsOpen ? 'bg-amber-500 text-zinc-950 border-amber-400' : 'bg-zinc-800 text-zinc-200 border-zinc-700 hover:bg-zinc-700'
            }`}
          >
            <Settings2 className="w-3.5 h-3.5" />
            <span>Settings</span>
          </button>

          {/* Mode Switcher */}
          <div className="inline-flex p-0.5 bg-zinc-800 rounded-lg">
            <button
              type="button"
              onClick={() => {
                setPrintMode('room');
                setSelectedTargetId(laboratories[0]?.id || 'all');
              }}
              className={`px-2.5 py-1 rounded-md font-bold transition-all cursor-pointer ${
                printMode === 'room' ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:text-white'
              }`}
            >
              By Room
            </button>
            <button
              type="button"
              onClick={() => {
                setPrintMode('faculty');
                setSelectedTargetId(trainers[0]?.id || 'all');
              }}
              className={`px-2.5 py-1 rounded-md font-bold transition-all cursor-pointer ${
                printMode === 'faculty' ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:text-white'
              }`}
            >
              By Faculty
            </button>
          </div>

          {/* Target Select */}
          <select
            value={selectedTargetId}
            onChange={(e) => setSelectedTargetId(e.target.value)}
            className="px-2.5 py-1 bg-zinc-800 border border-zinc-700 rounded-lg font-semibold text-white text-xs focus:outline-none cursor-pointer"
          >
            {printMode === 'room' ? (
              <>
                <option value="all">★ All Laboratories ({laboratories.length})</option>
                {laboratories.map(lab => (
                  <option key={lab.id} value={lab.id}>{lab.name}</option>
                ))}
              </>
            ) : (
              <>
                <option value="all">★ All Faculty ({trainers.length})</option>
                {trainers.map(trainer => (
                  <option key={trainer.id} value={trainer.id}>{trainer.name}</option>
                ))}
              </>
            )}
          </select>

          {/* Primary Action Button */}
          <button
            type="button"
            onClick={() => window.print()}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black rounded-lg text-xs shadow-md transition-all cursor-pointer flex items-center gap-2 active:scale-95"
          >
            <Printer className="w-4 h-4 text-zinc-950" />
            <span>PRINT TIMETABLE (Ctrl + P)</span>
          </button>
        </div>
      </div>

      {/* Collapsible Settings in Standalone View */}
      {isSettingsOpen && (
        <div className="bg-white border-b border-zinc-300 p-4 sm:p-6 print:hidden shadow-sm">
          <div className="max-w-5xl mx-auto space-y-4 text-xs">
            <div className="flex items-center justify-between border-b pb-2">
              <h2 className="font-extrabold text-zinc-900 text-sm flex items-center gap-2">
                <Settings2 className="w-4 h-4 text-amber-600" />
                <span>Document Header & Sign-Off Customization</span>
              </h2>
              <button
                type="button"
                onClick={handleResetSettings}
                className="px-2.5 py-1 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded text-xs font-semibold"
              >
                Reset to Defaults
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-zinc-600 font-bold mb-1">Header Title:</label>
                <input
                  type="text"
                  value={settings.headerTitle}
                  onChange={(e) => handleUpdateSettings({ headerTitle: e.target.value })}
                  className="w-full px-3 py-1.5 border border-zinc-300 rounded font-bold text-zinc-900"
                />
              </div>

              <div>
                <label className="block text-zinc-600 font-bold mb-1">Subtitle / Department Tagline:</label>
                <input
                  type="text"
                  value={settings.subtitle}
                  onChange={(e) => handleUpdateSettings({ subtitle: e.target.value })}
                  placeholder="Optional subtitle"
                  className="w-full px-3 py-1.5 border border-zinc-300 rounded text-zinc-800"
                />
              </div>
            </div>

            <div className="flex items-center gap-6 pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-zinc-700 font-medium">
                <input
                  type="checkbox"
                  checked={settings.showLogo}
                  onChange={(e) => handleUpdateSettings({ showLogo: e.target.checked })}
                  className="rounded text-zinc-900"
                />
                <span>Show School Logo</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-zinc-700 font-medium">
                <input
                  type="checkbox"
                  checked={settings.showDepEdSubheader}
                  onChange={(e) => handleUpdateSettings({ showDepEdSubheader: e.target.checked })}
                  className="rounded text-zinc-900"
                />
                <span>Show DepEd Subtitle</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-zinc-700 font-medium">
                <input
                  type="checkbox"
                  checked={settings.includeSignOff}
                  onChange={(e) => handleUpdateSettings({ includeSignOff: e.target.checked })}
                  className="rounded text-zinc-900"
                />
                <span>Include Sign-Off Block</span>
              </label>
            </div>

            {settings.includeSignOff && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
                <div className="p-2.5 bg-zinc-50 border rounded space-y-1.5">
                  <div className="font-bold text-zinc-700">Signatory 1 (Left)</div>
                  <input
                    type="text"
                    value={settings.signer1.label}
                    onChange={(e) => handleUpdateSigner('signer1', 'label', e.target.value)}
                    placeholder="Action/Label"
                    className="w-full px-2 py-1 border rounded text-xs"
                  />
                  <input
                    type="text"
                    value={settings.signer1.name}
                    onChange={(e) => handleUpdateSigner('signer1', 'name', e.target.value)}
                    placeholder="Signer Name"
                    className="w-full px-2 py-1 border rounded font-bold text-xs"
                  />
                  <input
                    type="text"
                    value={settings.signer1.role}
                    onChange={(e) => handleUpdateSigner('signer1', 'role', e.target.value)}
                    placeholder="Role"
                    className="w-full px-2 py-1 border rounded text-xs"
                  />
                </div>

                <div className="p-2.5 bg-zinc-50 border rounded space-y-1.5">
                  <div className="font-bold text-zinc-700">Signatory 2 (Middle)</div>
                  <input
                    type="text"
                    value={settings.signer2.label}
                    onChange={(e) => handleUpdateSigner('signer2', 'label', e.target.value)}
                    placeholder="Action/Label"
                    className="w-full px-2 py-1 border rounded text-xs"
                  />
                  <input
                    type="text"
                    value={settings.signer2.name}
                    onChange={(e) => handleUpdateSigner('signer2', 'name', e.target.value)}
                    placeholder="Signer Name"
                    className="w-full px-2 py-1 border rounded font-bold text-xs"
                  />
                  <input
                    type="text"
                    value={settings.signer2.role}
                    onChange={(e) => handleUpdateSigner('signer2', 'role', e.target.value)}
                    placeholder="Role"
                    className="w-full px-2 py-1 border rounded text-xs"
                  />
                </div>

                <div className="p-2.5 bg-zinc-50 border rounded space-y-1.5">
                  <div className="font-bold text-zinc-700">Signatory 3 (Right)</div>
                  <input
                    type="text"
                    value={settings.signer3.label}
                    onChange={(e) => handleUpdateSigner('signer3', 'label', e.target.value)}
                    placeholder="Action/Label"
                    className="w-full px-2 py-1 border rounded text-xs"
                  />
                  <input
                    type="text"
                    value={settings.signer3.name}
                    onChange={(e) => handleUpdateSigner('signer3', 'name', e.target.value)}
                    placeholder="Signer Name"
                    className="w-full px-2 py-1 border rounded font-bold text-xs"
                  />
                  <input
                    type="text"
                    value={settings.signer3.role}
                    onChange={(e) => handleUpdateSigner('signer3', 'role', e.target.value)}
                    placeholder="Role"
                    className="w-full px-2 py-1 border rounded text-xs"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Printable Sheet Viewport */}
      <div className="max-w-6xl mx-auto p-4 sm:p-8 space-y-8 print:p-0 print:space-y-0 print:max-w-none">
        <div id="printable-schedule-document" className="space-y-8 print:space-y-0">
          {targetSheets.map((sheet, idx) => (
            <ScheduleDocumentSheet
              key={idx}
              sheet={sheet}
              laboratories={laboratories}
              trainers={trainers}
              academicTerm={academicTerm}
              settings={settings}
            />
          ))}
        </div>
      </div>

      <style>{`
        @media print {
          body {
            background: white !important;
            padding: 0 !important;
            margin: 0 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .print-sheet {
            page-break-after: always !important;
            break-after: page !important;
            margin: 0 !important;
            padding: 6mm !important;
            box-shadow: none !important;
            border: none !important;
            width: 100% !important;
            box-sizing: border-box !important;
          }
          .print-sheet:last-child {
            page-break-after: auto !important;
            break-after: auto !important;
          }
          @page {
            size: landscape;
            margin: 6mm;
          }
        }
      `}</style>
    </div>
  );
};

/* -------------------------------------------------------------------------
 * ScheduleDocumentSheet: Single Printable Document Sheet Component
 * ----------------------------------------------------------------------- */
interface ScheduleDocumentSheetProps {
  sheet: {
    type: 'room' | 'faculty';
    entity: Laboratory | Trainer;
    schedules: Schedule[];
  };
  laboratories: Laboratory[];
  trainers: Trainer[];
  academicTerm: string;
  settings: PrintSettings;
}

const ScheduleDocumentSheet: React.FC<ScheduleDocumentSheetProps> = ({
  sheet,
  laboratories,
  trainers,
  academicTerm,
  settings,
}) => {
  const isRoom = sheet.type === 'room';
  const lab = isRoom ? (sheet.entity as Laboratory) : null;
  const trainer = !isRoom ? (sheet.entity as Trainer) : null;
  const sheetSchedules = sheet.schedules;

  return (
    <div className="print-sheet bg-white border border-zinc-200 shadow-md rounded-2xl p-6 sm:p-8 max-w-5xl mx-auto print:border-none print:shadow-none print:rounded-none print:p-2 print:max-w-none print:mx-0">
      {/* Institutional Header */}
      <div className="border-b-2 border-zinc-950 pb-4 mb-4">
        <div className="flex items-center justify-between gap-4">
          {/* Header Title with optional Logo and Subheader */}
          <div className="flex items-center gap-3">
            {settings.showLogo && (
              <div className="shrink-0">
                <SchoolComputerLogo size="md" />
              </div>
            )}
            <div>
              {settings.showDepEdSubheader && (
                <p className="text-[11px] font-mono font-bold tracking-widest text-zinc-500 uppercase mb-0.5">
                  Republic of the Philippines · Department of Education
                </p>
              )}
              <h1 className="text-lg sm:text-xl font-black text-zinc-950 uppercase tracking-tight">
                {settings.headerTitle}
              </h1>
              {settings.subtitle && (
                <p className="text-xs font-bold text-zinc-700 mt-0.5">
                  {settings.subtitle}
                </p>
              )}
            </div>
          </div>

          {/* Header Badge */}
          <div className="text-right hidden sm:block">
            <span className="inline-block px-3 py-1 bg-zinc-950 text-white rounded-lg text-xs font-bold uppercase tracking-wider font-mono">
              {isRoom ? 'Room Timetable' : 'Faculty Timetable'}
            </span>
            <p className="text-[10px] font-mono text-zinc-500 mt-1 font-semibold">
              MMA TrackLab Official Schedule
            </p>
          </div>
        </div>

        {/* Target Information Ribbon */}
        <div className="mt-4 pt-3 border-t border-zinc-200 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-zinc-50 p-3 rounded-xl border border-zinc-200">
          {isRoom ? (
            <>
              <div>
                <span className="text-[10px] font-mono text-zinc-500 uppercase block font-bold">Laboratory Room</span>
                <span className="font-black text-zinc-950 text-sm">{lab?.name}</span>
              </div>
              <div>
                <span className="text-[10px] font-mono text-zinc-500 uppercase block font-bold">Station Capacity</span>
                <span className="font-bold text-zinc-800">{lab?.capacity || 24} Workstations</span>
              </div>
              <div>
                <span className="text-[10px] font-mono text-zinc-500 uppercase block font-bold">Academic Term</span>
                <span className="font-bold text-zinc-800">{academicTerm}</span>
              </div>
              <div>
                <span className="text-[10px] font-mono text-zinc-500 uppercase block font-bold">Weekly Load</span>
                <span className="font-bold text-zinc-800">{sheetSchedules.length} Scheduled Class(es)</span>
              </div>
            </>
          ) : (
            <>
              <div>
                <span className="text-[10px] font-mono text-zinc-500 uppercase block font-bold">Faculty / Instructor</span>
                <span className="font-black text-zinc-950 text-sm">{trainer?.name}</span>
              </div>
              <div>
                <span className="text-[10px] font-mono text-zinc-500 uppercase block font-bold">Employee ID / Dept</span>
                <span className="font-bold text-zinc-800">
                  {trainer?.employeeId || 'FAC-REG'} · {trainer?.department || 'ICT Dept'}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-mono text-zinc-500 uppercase block font-bold">Specialization</span>
                <span className="font-bold text-zinc-800 truncate block" title={trainer?.specialization}>
                  {trainer?.specialization || 'General ICT & Multimedia'}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-mono text-zinc-500 uppercase block font-bold">Teaching Load</span>
                <span className="font-bold text-zinc-800">{sheetSchedules.length} Assigned Class(es)</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Timetable Table Grid - Fixed layout with full-cell edge-to-edge allocation */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left border-2 border-zinc-950 text-xs table-fixed">
          <colgroup>
            <col className="w-28 sm:w-32" />
            <col className="w-[14.28%]" />
            <col className="w-[14.28%]" />
            <col className="w-[14.28%]" />
            <col className="w-[14.28%]" />
            <col className="w-[14.28%]" />
            <col className="w-[14.28%]" />
          </colgroup>
          <thead>
            <tr className="bg-zinc-950 text-white border-b-2 border-zinc-950">
              <th className="py-2.5 px-2 font-mono font-bold uppercase text-[10px] tracking-wider border-r border-zinc-700 text-center">
                Time Slot
              </th>
              {PRINT_DAYS.map(day => (
                <th 
                  key={day} 
                  className="py-2.5 px-2 font-black uppercase text-xs tracking-wider border-r border-zinc-700 text-center last:border-r-0"
                >
                  {day}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <PrintTableBody
              schedules={sheetSchedules}
              laboratories={laboratories}
              trainers={trainers}
              isRoomView={isRoom}
            />
          </tbody>
        </table>
      </div>

      {/* Sign-off & Certification Block */}
      {settings.includeSignOff && (
        <div className="mt-8 pt-6 border-t-2 border-zinc-950 break-inside-avoid">
          <div className="grid grid-cols-3 gap-6 text-center text-xs">
            <div>
              <p className="text-[11px] text-zinc-500 mb-10 font-medium">{settings.signer1.label}</p>
              <div className="border-t border-zinc-900 pt-1 font-black text-zinc-950 uppercase tracking-tight">
                {settings.signer1.name}
              </div>
              <p className="text-[10px] text-zinc-600 font-medium mt-0.5">{settings.signer1.role}</p>
            </div>

            <div>
              <p className="text-[11px] text-zinc-500 mb-10 font-medium">{settings.signer2.label}</p>
              <div className="border-t border-zinc-900 pt-1 font-black text-zinc-950 uppercase tracking-tight">
                {settings.signer2.name}
              </div>
              <p className="text-[10px] text-zinc-600 font-medium mt-0.5">{settings.signer2.role}</p>
            </div>

            <div>
              <p className="text-[11px] text-zinc-500 mb-10 font-medium">{settings.signer3.label}</p>
              <div className="border-t border-zinc-900 pt-1 font-black text-zinc-950 uppercase tracking-tight">
                {settings.signer3.name}
              </div>
              <p className="text-[10px] text-zinc-600 font-medium mt-0.5">{settings.signer3.role}</p>
            </div>
          </div>

          <div className="mt-6 pt-3 border-t border-zinc-200 flex items-center justify-between text-[9px] font-mono text-zinc-400">
            <span>MMA TRACKLAB SYSTEM · VERIFIED TIMETABLE DOCUMENT</span>
            <span>GENERATED: {new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}</span>
          </div>
        </div>
      )}
    </div>
  );
};

/* -------------------------------------------------------------------------
 * Helper Component: Renders Table Rows with Edge-to-Edge Full Cell Allocation
 * ----------------------------------------------------------------------- */
interface PrintTableBodyProps {
  schedules: Schedule[];
  laboratories: Laboratory[];
  trainers: Trainer[];
  isRoomView: boolean;
}

const PrintTableBody: React.FC<PrintTableBodyProps> = ({
  schedules,
  laboratories,
  trainers,
  isRoomView,
}) => {
  // Track cells skipped due to multi-slot rowSpan: set of "day-slotIndex"
  const skippedCells = useMemo(() => {
    const skipped = new Set<string>();

    PRINT_DAYS.forEach(day => {
      PRINT_HOURLY_SLOTS.forEach((slot, slotIdx) => {
        if (slot.isBreak) return;

        // Find schedules overlapping this slot
        const matchingSchedules = schedules.filter(s => 
          s.day === day && 
          doTimesOverlap(s.startTime, s.endTime, slot.startTime, slot.endTime)
        );

        if (matchingSchedules.length === 1) {
          const sched = matchingSchedules[0];
          // Check if this slot is the first slot covering this schedule
          const isFirstSlot = slotIdx === 0 || 
            PRINT_HOURLY_SLOTS[slotIdx - 1].isBreak || 
            !doTimesOverlap(sched.startTime, sched.endTime, PRINT_HOURLY_SLOTS[slotIdx - 1].startTime, PRINT_HOURLY_SLOTS[slotIdx - 1].endTime);

          if (isFirstSlot) {
            // Count how many consecutive non-break slots it covers
            for (let nextIdx = slotIdx + 1; nextIdx < PRINT_HOURLY_SLOTS.length; nextIdx++) {
              const nextSlot = PRINT_HOURLY_SLOTS[nextIdx];
              if (nextSlot.isBreak) break;
              if (doTimesOverlap(sched.startTime, sched.endTime, nextSlot.startTime, nextSlot.endTime)) {
                skipped.add(`${day}-${nextIdx}`);
              } else {
                break;
              }
            }
          }
        }
      });
    });

    return skipped;
  }, [schedules]);

  return (
    <>
      {PRINT_HOURLY_SLOTS.map((slot, slotIdx) => {
        // Special render for Health Break row
        if (slot.isBreak) {
          return (
            <tr key={slot.id} className="bg-amber-100/70 border-y-2 border-zinc-950">
              <td className="py-2.5 px-2 text-center font-mono font-black text-[10px] sm:text-[11px] text-amber-950 border-r-2 border-zinc-950 bg-amber-200/90 whitespace-nowrap">
                {slot.label}
              </td>
              <td 
                colSpan={6} 
                className="py-2.5 px-4 text-center font-black font-mono tracking-widest uppercase text-xs text-amber-950 bg-amber-100/70 border-b border-zinc-950"
              >
                ★ 12:00NN – 1:00PM HEALTH BREAK (LUNCH RECESS) ★
              </td>
            </tr>
          );
        }

        return (
          <tr 
            key={slot.id} 
            className="border-b border-zinc-900 bg-white"
          >
            {/* Leftmost Time Column */}
            <td className="py-2 px-2 text-center font-mono font-bold text-[10px] text-zinc-950 border-r-2 border-zinc-950 bg-zinc-100/90 whitespace-nowrap align-middle">
              {slot.label}
            </td>

            {/* Day Columns */}
            {PRINT_DAYS.map(day => {
              const cellKey = `${day}-${slotIdx}`;
              if (skippedCells.has(cellKey)) {
                // Covered by rowSpan from an earlier slot
                return null;
              }

              // Overlapping schedules for this day and slot
              const matchingSchedules = schedules.filter(s => 
                s.day === day && 
                doTimesOverlap(s.startTime, s.endTime, slot.startTime, slot.endTime)
              );

              // Calculate rowSpan if single schedule
              let rowSpan = 1;
              if (matchingSchedules.length === 1 && !slot.isBreak) {
                const sched = matchingSchedules[0];
                for (let nextIdx = slotIdx + 1; nextIdx < PRINT_HOURLY_SLOTS.length; nextIdx++) {
                  const nextSlot = PRINT_HOURLY_SLOTS[nextIdx];
                  if (nextSlot.isBreak) break;
                  if (doTimesOverlap(sched.startTime, sched.endTime, nextSlot.startTime, nextSlot.endTime)) {
                    rowSpan++;
                  } else {
                    break;
                  }
                }
              }

              if (matchingSchedules.length === 0) {
                return (
                  <td
                    key={day}
                    className="p-0 border-r border-b border-zinc-300 last:border-r-0 align-middle bg-white"
                    style={{ height: '78px' }}
                  >
                    <div className="w-full h-full min-h-[78px] flex items-center justify-center text-zinc-200 font-mono text-[9px] select-none">
                      —
                    </div>
                  </td>
                );
              }

              // Non-nested full-cell edge-to-edge allocation
              return (
                <td
                  key={day}
                  rowSpan={rowSpan}
                  className="p-0 border-r-2 border-b-2 border-zinc-950 last:border-r-0 align-top bg-white"
                  style={{ verticalAlign: 'top', height: '1px' }}
                >
                  <div className="h-full w-full min-h-[78px] flex flex-col justify-between bg-zinc-50 border-l-[6px] border-l-zinc-950 p-2 sm:p-2.5 text-left">
                    {matchingSchedules.length === 1 ? (
                      (() => {
                        const sched = matchingSchedules[0];
                        const lab = laboratories.find(l => l.id === sched.labId);
                        const trainer = trainers.find(t => t.id === sched.trainerId);
                        const facultyName = trainer ? trainer.name : sched.teacherName;
                        const labName = lab ? lab.name : 'Computer Laboratory';

                        return (
                          <>
                            <div className="space-y-1">
                              {/* Subject Name - Edge-to-edge, uppercase, crisp font */}
                              <div className="font-black text-zinc-950 text-[11px] sm:text-xs leading-snug uppercase tracking-tight">
                                {sched.subject}
                              </div>

                              {/* Section, Room, Faculty Details */}
                              <div className="text-[10px] space-y-0.5 text-zinc-800 pt-0.5 font-sans">
                                <div className="flex items-center gap-1.5 leading-none">
                                  <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider">Sec:</span>
                                  <span className="font-mono font-black text-zinc-950 px-1 py-0.5 bg-zinc-200/90 rounded-xs">
                                    {sched.yearSection}
                                  </span>
                                </div>

                                <div className="flex items-baseline gap-1.5 leading-none truncate">
                                  <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider">Room:</span>
                                  <span className="font-semibold text-zinc-900 truncate">{labName}</span>
                                </div>

                                <div className="flex items-baseline gap-1.5 leading-none truncate">
                                  <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider">Faculty:</span>
                                  <span className="font-bold text-zinc-950 truncate">{facultyName}</span>
                                </div>
                              </div>
                            </div>

                            {/* Bottom duration stripe filling full cell width */}
                            <div className="mt-2 pt-1 border-t border-zinc-300 flex items-center justify-between text-[9px] font-mono font-bold text-zinc-600">
                              <span>{formatTime12(sched.startTime)} – {formatTime12(sched.endTime)}</span>
                              {rowSpan > 1 && (
                                <span className="px-1 py-0.2 bg-zinc-200 text-zinc-950 font-black rounded-xs text-[8px] uppercase tracking-wider">
                                  {rowSpan}h Block
                                </span>
                              )}
                            </div>
                          </>
                        );
                      })()
                    ) : (
                      // Multi-class split cell (cleanly divided, no nested cards)
                      <div className="h-full w-full flex flex-col divide-y-2 divide-zinc-300">
                        {matchingSchedules.map(sched => {
                          const lab = laboratories.find(l => l.id === sched.labId);
                          const trainer = trainers.find(t => t.id === sched.trainerId);
                          const facultyName = trainer ? trainer.name : sched.teacherName;
                          const labName = lab ? lab.name : 'Computer Lab';

                          return (
                            <div key={sched.id} className="p-1.5 flex flex-col justify-between flex-1">
                              <div>
                                <div className="font-black text-zinc-950 text-[10px] uppercase leading-tight">
                                  {sched.subject}
                                </div>
                                <div className="text-[9px] text-zinc-700 flex items-center gap-1 mt-0.5">
                                  <span className="font-mono font-bold">{sched.yearSection}</span>
                                  <span>·</span>
                                  <span className="truncate">{facultyName}</span>
                                </div>
                              </div>
                              <div className="text-[8px] font-mono text-zinc-500 mt-1">
                                {formatTime12(sched.startTime)} – {formatTime12(sched.endTime)}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </td>
              );
            })}
          </tr>
        );
      })}
    </>
  );
};
