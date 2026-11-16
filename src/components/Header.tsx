import React, { useState, useEffect } from 'react';
import { User as FirebaseUser } from 'firebase/auth';
import { UserProfile, LabUsage, ActiveTab, Laboratory } from '../types';
import { getLabCapacityStatus } from '../utils/capacity';
import { 
  Menu, 
  LogIn, 
  LogOut, 
  Clock, 
  Monitor, 
  Calendar, 
  Users, 
  Package, 
  Snowflake, 
  AlertTriangle, 
  Layers, 
  GraduationCap, 
  BarChart3, 
  Tv, 
  FileText, 
  ShieldCheck, 
  MapPin, 
  CheckCircle2, 
  ChevronRight,
  AlertCircle,
  Palette
} from 'lucide-react';
import { SchoolComputerLogo } from './SchoolComputerLogo';
import { format, differenceInMinutes } from 'date-fns';

interface HeaderProps {
  user: FirebaseUser | null;
  profile: UserProfile | null;
  activeTab: ActiveTab;
  onOpenMobileMenu: () => void;
  currentUserSession?: LabUsage;
  laboratories: Laboratory[];
  activeSessions?: LabUsage[];
  openIssuesCount?: number;
  activeAcCount?: number;
  pendingBorrowCount?: number;
  onOpenCheckIn: () => void;
  onCheckOut: (sessionId: string) => void;
  onLogout: () => void;
  onLogin: () => void;
  onOpenThemePreview?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  profile,
  activeTab,
  onOpenMobileMenu,
  currentUserSession,
  laboratories,
  activeSessions = [],
  openIssuesCount = 0,
  activeAcCount = 0,
  pendingBorrowCount = 0,
  onOpenCheckIn,
  onCheckOut,
  onLogout,
  onLogin,
  onOpenThemePreview,
}) => {
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const currentLab = currentUserSession 
    ? laboratories.find(l => l.id === currentUserSession.labId) 
    : null;

  // Capacity Warning check
  const warningLabs = laboratories.filter(lab => {
    const labSessionCount = activeSessions.filter(s => s.labId === lab.id).length;
    return getLabCapacityStatus(labSessionCount, lab.capacity).isWarning;
  });
  const hasCapacityWarning = warningLabs.length > 0;

  // Tab metadata
  const tabInfo: Record<ActiveTab, { title: string; subtitle: string }> = {
    floorplan: {
      title: 'Workstations & Floor Plan',
      subtitle: 'Live visual station occupancy & presence grid',
    },
    schedule: {
      title: 'Weekly Timetable Matrix',
      subtitle: 'Class schedules, instructors, and conflict prevention',
    },
    attendance: {
      title: 'Live Student Attendance',
      subtitle: `${activeSessions.length} active sessions logged across laboratories`,
    },
    items: {
      title: 'Equipment & Permission Tracking',
      subtitle: 'Borrowing approvals, asset QR stickers, and return tracking',
    },
    aircon: {
      title: 'Air-Conditioning In/Out Tracker',
      subtitle: `${activeAcCount} cooling unit(s) currently active`,
    },
    maintenance: {
      title: 'Repairs & Fault Reports',
      subtitle: `${openIssuesCount} unresolved workstation issue(s)`,
    },
    labs: {
      title: 'Laboratory Rooms Management',
      subtitle: 'Room capacity limits, configurations, and quick actions',
    },
    trainers: {
      title: 'Faculty, Sections & Subjects Directory',
      subtitle: 'Manage faculty members, academic class sections, and curriculum subjects',
    },
    analytics: {
      title: 'Utilization & Peak Hours Analytics',
      subtitle: 'Heatmaps, occupancy metrics, and resource planning',
    },
    reports: {
      title: 'Historical Audit Reports',
      subtitle: 'Exportable usage records, logs, and compliance records',
    },
    users: {
      title: 'User Role Administration',
      subtitle: 'Manage administrative and instructor privilege levels',
    },
    kiosk: {
      title: 'Door Display Kiosk Mode',
      subtitle: 'Wall-mounted tablet display for laboratory entrances',
    },
  };

  const currentMeta = tabInfo[activeTab] || {
    title: 'Laboratory Console',
    subtitle: 'MMA ICT Facility Management System',
  };

  return (
    <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-slate-200">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-3">
          {/* Left: Mobile Hamburger & View Breadcrumbs */}
          <div className="flex items-center gap-3 min-w-0">
            {/* Mobile Drawer Toggle */}
            <button
              onClick={onOpenMobileMenu}
              className="lg:hidden p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors shrink-0"
              title="Open Navigation Menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* School Computer Combined Logo */}
            <div className="flex items-center gap-2.5">
              <SchoolComputerLogo size="sm" className="lg:hidden" />
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                  <span className="hidden sm:inline">TrackLab</span>
                  <span className="hidden sm:inline text-slate-300">/</span>
                  <span className="text-blue-900 truncate font-extrabold">{currentMeta.title}</span>
                </div>
                <p className="text-xs text-slate-500 truncate hidden md:block">
                  {currentMeta.subtitle}
                </p>
              </div>
            </div>
          </div>

          {/* Right: Status Badges, Live Clock, and Quick Action */}
          <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
            {/* Capacity Warning Alert Pill */}
            {hasCapacityWarning && (
              <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-50 border border-red-200 text-red-700 text-xs font-semibold animate-pulse">
                <AlertCircle className="w-3.5 h-3.5 text-red-600" />
                <span>High Capacity Warning</span>
              </div>
            )}

            {/* Active Session Badge (If user is currently checked into a workstation) */}
            {currentUserSession && (
              <div className="flex items-center gap-2 px-2.5 py-1 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-xs font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping shrink-0" />
                <span className="font-mono font-bold">{currentUserSession.station}</span>
                <span className="text-blue-700 hidden md:inline">({currentLab?.name || 'Lab'})</span>
                <button
                  onClick={() => onCheckOut(currentUserSession.id)}
                  className="ml-1 text-[11px] font-bold text-blue-950 hover:underline cursor-pointer"
                >
                  End Session
                </button>
              </div>
            )}

            {/* Live Clock Display */}
            <div className="hidden xl:flex items-center gap-1.5 text-xs font-mono text-slate-500 bg-slate-50 border border-slate-200/80 px-2.5 py-1.5 rounded-lg">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>{format(currentTime, 'EEE, MMM d · HH:mm:ss')}</span>
            </div>

            {/* Theme Comparison Button */}
            {onOpenThemePreview && (
              <button
                type="button"
                onClick={onOpenThemePreview}
                title="Compare Before vs After theme designs"
                className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200/80 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <Palette className="w-3.5 h-3.5 text-blue-700" />
                <span className="hidden md:inline font-sans">Theme Compare</span>
              </button>
            )}

            {/* Quick Check-In CTA Button */}
            {!currentUserSession && user && (
              <button
                onClick={onOpenCheckIn}
                className="px-3.5 py-1.5 bg-[#0A192F] hover:bg-[#132C4F] text-white rounded-lg text-xs font-semibold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Station Check-In</span>
                <span className="sm:hidden">Check In</span>
              </button>
            )}

            {/* Sign in button if unauthenticated */}
            {!user && (
              <button
                onClick={onLogin}
                className="px-3.5 py-1.5 bg-[#0A192F] text-white hover:bg-[#132C4F] rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Sign In</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
