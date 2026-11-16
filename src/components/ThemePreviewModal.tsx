import React, { useState } from 'react';
import { 
  X, 
  Check, 
  Palette, 
  Eye, 
  Sparkles, 
  ArrowRight, 
  Layout, 
  ShieldCheck, 
  Layers, 
  Monitor, 
  Calendar,
  ExternalLink
} from 'lucide-react';
import previewMockupImage from '../assets/images/preview_white_navy_theme_1794319712916.jpg';
import beforeMockupImage from '../assets/images/theme_before_dark_zinc_1794321164062.jpg';
import schoolSeal from '../assets/images/mma_school_seal.png';
import ictLogo from '../assets/images/mma_ict_logo.png';

interface ThemePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  isLivePreview: boolean;
  onToggleLivePreview: (active: boolean) => void;
  onConfirmImplementation?: () => void;
}

export const ThemePreviewModal: React.FC<ThemePreviewModalProps> = ({
  isOpen,
  onClose,
  isLivePreview,
  onToggleLivePreview,
  onConfirmImplementation,
}) => {
  const [activeTab, setActiveTab] = useState<'mockup' | 'palette' | 'comparison'>('mockup');
  const [photoViewMode, setPhotoViewMode] = useState<'side-by-side' | 'before' | 'after'>('side-by-side');
  const [isZoomed, setIsZoomed] = useState(false);

  if (!isOpen) return null;

  const colorPalette = [
    {
      name: 'Deep Academic Navy',
      hex: '#0A192F',
      tailwind: 'bg-[#0A192F]',
      role: 'Sidebar background, primary buttons, high-contrast headers, and modal bars',
      textColor: 'text-white',
    },
    {
      name: 'Royal Academy Blue',
      hex: '#1D4ED8',
      tailwind: 'bg-blue-700',
      role: 'Active tab accents, icons, hover links, and focus rings',
      textColor: 'text-white',
    },
    {
      name: 'Soft Ice Blue',
      hex: '#EFF6FF',
      tailwind: 'bg-blue-50 border border-blue-200',
      role: 'Active navigation item backdrop, timetable schedule cell badges',
      textColor: 'text-blue-900',
    },
    {
      name: 'Pure Crisp White',
      hex: '#FFFFFF',
      tailwind: 'bg-white border border-slate-200',
      role: 'Main workspace cards, dropdowns, table bodies, and modals',
      textColor: 'text-slate-900',
    },
    {
      name: 'Soft Slate Canvas',
      hex: '#F8FAFC',
      tailwind: 'bg-slate-50 border border-slate-200',
      role: 'Main application background field and structural separators',
      textColor: 'text-slate-800',
    },
    {
      name: 'Academy Crest Gold',
      hex: '#D97706',
      tailwind: 'bg-amber-600',
      role: 'Official Mary Mediatrix seals, motto highlights, and warning tags',
      textColor: 'text-white',
    },
  ];

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-6 overflow-y-auto bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-5xl bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col max-h-[92vh] overflow-hidden my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Bar */}
        <div className="px-6 py-4 bg-[#0A192F] text-white flex items-center justify-between border-b border-blue-950/80 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-white p-0.5 shadow-sm flex items-center justify-center shrink-0">
              <img src={schoolSeal} alt="MMA Seal" className="w-full h-full object-contain" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-amber-400">
                  Theme Redesign Proposal
                </span>
                <span className="text-[10px] bg-blue-900/60 text-blue-200 px-2 py-0.5 rounded font-mono">
                  Preview Stage
                </span>
              </div>
              <h2 className="text-base font-bold text-white tracking-tight">
                White & Navy Blue Academic Theme
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onToggleLivePreview(!isLivePreview)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                isLivePreview
                  ? 'bg-emerald-500 text-white shadow-sm'
                  : 'bg-blue-900/70 hover:bg-blue-800 text-blue-100 border border-blue-700/50'
              }`}
              title="Toggle interactive live preview mode in the browser"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>{isLivePreview ? 'Live Preview: ON' : 'Try Live Preview'}</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
              title="Close Preview"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="px-6 py-2.5 bg-slate-100 border-b border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setActiveTab('mockup')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 ${
                activeTab === 'mockup'
                  ? 'bg-white text-[#0A192F] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layout className="w-3.5 h-3.5" />
              <span>UI Mockup Preview</span>
            </button>
            <button
              onClick={() => setActiveTab('palette')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 ${
                activeTab === 'palette'
                  ? 'bg-white text-[#0A192F] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Palette className="w-3.5 h-3.5" />
              <span>Color System & Tokens</span>
            </button>
            <button
              onClick={() => setActiveTab('comparison')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 ${
                activeTab === 'comparison'
                  ? 'bg-white text-[#0A192F] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Before vs. After</span>
            </button>
          </div>

          <div className="text-[11px] font-mono text-slate-500 hidden sm:block">
            Mary Mediatrix of All Graces Academy · ICT TrackLab
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* TAB 1: UI Mockup Preview */}
          {activeTab === 'mockup' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-2 border-b border-slate-100">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Visual Design Comparison: Before vs. After
                  </h3>
                  <p className="text-xs text-slate-500">
                    Compare the original dark charcoal/zinc look against the new White & Deep Navy Blue theme.
                  </p>
                </div>

                <div className="flex items-center gap-1.5 self-stretch sm:self-auto">
                  {/* Photo Mode Switcher */}
                  <div className="flex items-center p-0.5 bg-slate-100 rounded-lg border border-slate-200 text-xs">
                    <button
                      onClick={() => setPhotoViewMode('side-by-side')}
                      className={`px-2.5 py-1 rounded-md font-bold transition-all ${
                        photoViewMode === 'side-by-side'
                          ? 'bg-white text-[#0A192F] shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Side-by-Side
                    </button>
                    <button
                      onClick={() => setPhotoViewMode('before')}
                      className={`px-2.5 py-1 rounded-md font-bold transition-all ${
                        photoViewMode === 'before'
                          ? 'bg-white text-zinc-950 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Before (Dark Zinc)
                    </button>
                    <button
                      onClick={() => setPhotoViewMode('after')}
                      className={`px-2.5 py-1 rounded-md font-bold transition-all ${
                        photoViewMode === 'after'
                          ? 'bg-white text-blue-900 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      After (White & Navy)
                    </button>
                  </div>

                  <button
                    onClick={() => setIsZoomed(!isZoomed)}
                    className="px-2.5 py-1 text-xs font-medium text-blue-700 hover:bg-blue-50 rounded-md border border-blue-200 transition-colors inline-flex items-center gap-1 shrink-0"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>{isZoomed ? 'Reset' : 'Enlarge'}</span>
                  </button>
                </div>
              </div>

              {/* SIDE BY SIDE VIEW */}
              {photoViewMode === 'side-by-side' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* BEFORE PHOTO */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between px-1">
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-zinc-800 uppercase tracking-wider font-mono">
                        <span className="w-2.5 h-2.5 rounded-full bg-zinc-600 inline-block" />
                        BEFORE: Dark Charcoal & Zinc Theme
                      </span>
                      <span className="text-[10px] font-mono text-zinc-500 bg-zinc-100 px-2 py-0.5 rounded">
                        Previous Layout
                      </span>
                    </div>
                    <div className="relative rounded-xl overflow-hidden border border-zinc-300 shadow-md bg-zinc-950 aspect-16/9 group">
                      <img
                        src={beforeMockupImage}
                        alt="Previous Dark Zinc Application Layout"
                        className="w-full h-full object-cover select-none transition-transform duration-500 group-hover:scale-102"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute bottom-2 left-2 bg-zinc-950/85 backdrop-blur-xs text-zinc-300 px-2.5 py-1 rounded text-[10px] font-mono border border-zinc-700">
                        Dark Zinc-950 Sidebar & Charcoal Buttons
                      </div>
                    </div>
                    <p className="text-[11px] text-zinc-500 leading-snug px-1">
                      Used a dark charcoal sidebar, neutral zinc gray cards, and high-density dark UI styling.
                    </p>
                  </div>

                  {/* AFTER PHOTO */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between px-1">
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0A192F] uppercase tracking-wider font-mono">
                        <span className="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block" />
                        AFTER: White & Deep Navy Blue Theme
                      </span>
                      <span className="text-[10px] font-mono text-blue-900 bg-blue-100 px-2 py-0.5 rounded font-bold">
                        Current Approved
                      </span>
                    </div>
                    <div className="relative rounded-xl overflow-hidden border border-blue-200 shadow-md bg-slate-900 aspect-16/9 group">
                      <img
                        src={previewMockupImage}
                        alt="New White and Navy Blue Laboratory Management UI Layout"
                        className="w-full h-full object-cover select-none transition-transform duration-500 group-hover:scale-102"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute bottom-2 right-2 bg-[#0A192F]/90 backdrop-blur-xs text-white px-2.5 py-1 rounded text-[10px] font-mono border border-blue-400/40">
                        Mary Mediatrix Crest · Deep Navy & Crisp White
                      </div>
                    </div>
                    <p className="text-[11px] text-blue-900/80 leading-snug px-1">
                      Clean white canvas, deep academic navy blue (#0A192F), soft ice blue highlights, and academy seal.
                    </p>
                  </div>
                </div>
              )}

              {/* SINGLE PHOTO: BEFORE */}
              {photoViewMode === 'before' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-xs font-bold text-zinc-900 font-mono uppercase tracking-wider">
                      BEFORE: Original Dark Zinc Theme Photo
                    </span>
                    <span className="text-xs text-zinc-500 font-mono">
                      Zinc-950 / Slate-900 Base
                    </span>
                  </div>
                  <div className={`relative rounded-xl overflow-hidden border border-zinc-300 shadow-md bg-zinc-950 ${
                    isZoomed ? 'scale-100' : 'max-h-[500px]'
                  }`}>
                    <img
                      src={beforeMockupImage}
                      alt="Previous Dark Zinc Application Layout"
                      className="w-full h-auto object-cover select-none"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <p className="text-xs text-zinc-600">
                    The previous design featured dark charcoal side navigation, black header buttons, and neutral zinc cards.
                  </p>
                </div>
              )}

              {/* SINGLE PHOTO: AFTER */}
              {photoViewMode === 'after' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-xs font-bold text-blue-950 font-mono uppercase tracking-wider">
                      AFTER: Redesigned White & Deep Navy Blue Theme Photo
                    </span>
                    <span className="text-xs text-blue-700 font-mono font-bold">
                      Mary Mediatrix Academy Institutional Palette
                    </span>
                  </div>
                  <div className={`relative rounded-xl overflow-hidden border border-blue-200 shadow-md bg-slate-900 ${
                    isZoomed ? 'scale-100' : 'max-h-[500px]'
                  }`}>
                    <img
                      src={previewMockupImage}
                      alt="New White and Navy Blue Laboratory Management UI Layout"
                      className="w-full h-auto object-cover select-none"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <p className="text-xs text-slate-600">
                    The redesigned layout features pure white canvas, deep academic navy blue (#0A192F), royal ice blue highlights, and official crest branding.
                  </p>
                </div>
              )}

              {/* Key Features of this Design */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#0A192F] mb-1">
                    <Monitor className="w-4 h-4 text-blue-700" />
                    <span>Deep Navy Sidebar</span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Provides strong institutional branding anchor with Mary Mediatrix Academy crest, high legibility, and ice blue active tabs.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#0A192F] mb-1">
                    <Layout className="w-4 h-4 text-blue-700" />
                    <span>Crisp White Canvas</span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Clean, spacious cards with 1px soft hairline borders and generous padding, eliminating visual clutter.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#0A192F] mb-1">
                    <Calendar className="w-4 h-4 text-blue-700" />
                    <span>Luminous Schedule Matrix</span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Edge-to-edge class schedule allocation in soft navy tones with high-contrast text matching printable requirements.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Color Palette Tokens */}
          {activeTab === 'palette' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  White & Navy Blue Institutional Palette
                </h3>
                <p className="text-xs text-slate-500">
                  Calibrated to the 60-30-10 color distribution rule (60% white/slate canvas, 30% deep navy structural surfaces, 10% active accents).
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {colorPalette.map((col, idx) => (
                  <div key={idx} className="p-3.5 rounded-xl border border-slate-200 bg-white shadow-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-7 h-7 rounded-lg ${col.tailwind} shadow-xs shrink-0`} />
                        <div>
                          <div className="text-xs font-bold text-slate-900">{col.name}</div>
                          <div className="text-[10px] font-mono text-slate-500">{col.hex}</div>
                        </div>
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-600 leading-snug">
                      {col.role}
                    </p>
                  </div>
                ))}
              </div>

              <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-200 text-xs text-blue-950 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-blue-700" />
                  <span>Accessibility & Contrast Compliance</span>
                </div>
                <p className="text-blue-900/80">
                  Every text and surface pairing achieves WCAG AA & AAA contrast ratios ($&gt; 7:1$ for navy on white, $&gt; 9:1$ for white on navy).
                </p>
              </div>
            </div>
          )}

          {/* TAB 3: Before vs. After Comparison */}
          {activeTab === 'comparison' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Design Architecture Comparison
                </h3>
                <p className="text-xs text-slate-500">
                  How the transition will elevate the application from dark zinc to institutional white & navy.
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border border-slate-200 rounded-xl overflow-hidden">
                  <thead className="bg-[#0A192F] text-white">
                    <tr>
                      <th className="p-3 font-semibold">Interface Element</th>
                      <th className="p-3 font-semibold text-slate-300">Current Zinc Theme</th>
                      <th className="p-3 font-semibold text-blue-200">New White & Navy Theme</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    <tr>
                      <td className="p-3 font-bold text-slate-900">Sidebar & Nav</td>
                      <td className="p-3 text-slate-600">Pure black / Zinc-950 with gray borders</td>
                      <td className="p-3 text-blue-900 font-semibold bg-blue-50/50">
                        Deep Institutional Navy (#0A192F) with Academy Crest & soft blue active states
                      </td>
                    </tr>
                    <tr>
                      <td className="p-3 font-bold text-slate-900">Dashboard Canvas</td>
                      <td className="p-3 text-slate-600">Light zinc-50 / zinc-100 neutral</td>
                      <td className="p-3 text-blue-900 font-semibold bg-blue-50/50">
                        Luminous Pure White with Soft Slate-50 background for maximum readability
                      </td>
                    </tr>
                    <tr>
                      <td className="p-3 font-bold text-slate-900">Action Buttons</td>
                      <td className="p-3 text-slate-600">Zinc-900 / dark charcoal buttons</td>
                      <td className="p-3 text-blue-900 font-semibold bg-blue-50/50">
                        Deep Navy (#0A192F) primary buttons with Royal Blue hover transition
                      </td>
                    </tr>
                    <tr>
                      <td className="p-3 font-bold text-slate-900">Timetable Cells</td>
                      <td className="p-3 text-slate-600">White boxes with dark charcoal text</td>
                      <td className="p-3 text-blue-900 font-semibold bg-blue-50/50">
                        Edge-to-edge Navy-accented cells with crisp typography & clear lab badges
                      </td>
                    </tr>
                    <tr>
                      <td className="p-3 font-bold text-slate-900">Brand Identity</td>
                      <td className="p-3 text-slate-600">Generic computer tech look</td>
                      <td className="p-3 text-blue-900 font-semibold bg-blue-50/50">
                        Mary Mediatrix of All Graces Academy official navy blue and gold identity
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-600">
              Live Browser Preview:
            </span>
            <button
              onClick={() => onToggleLivePreview(!isLivePreview)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                isLivePreview
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-100'
              }`}
            >
              {isLivePreview ? '✓ Live Navy & White Active' : 'Enable Live Preview'}
            </button>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={onClose}
              className="flex-1 sm:flex-none px-4 py-2 rounded-xl border border-slate-300 bg-white text-slate-700 text-xs font-bold hover:bg-slate-100 transition-colors"
            >
              Close Preview
            </button>
            <button
              onClick={() => {
                if (onConfirmImplementation) onConfirmImplementation();
                onClose();
              }}
              className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-[#0A192F] hover:bg-blue-900 text-white text-xs font-bold shadow-sm transition-colors flex items-center justify-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5 text-amber-400" />
              <span>Implement This Theme</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
