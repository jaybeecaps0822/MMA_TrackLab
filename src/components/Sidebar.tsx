import React, { useState } from 'react';
import { User as FirebaseUser } from 'firebase/auth';
import { UserProfile, LabUsage, ActiveTab, Laboratory } from '../types';
import { getLabCapacityStatus } from '../utils/capacity';
import { 
  Monitor, 
  Calendar, 
  Users, 
  Snowflake, 
  Package, 
  AlertTriangle, 
  Layers, 
  GraduationCap, 
  BarChart3, 
  Tv, 
  FileText, 
  ShieldCheck, 
  LogOut, 
  LogIn, 
  ChevronLeft, 
  ChevronRight, 
  X, 
  Clock, 
  User as UserIcon,
  Sparkles,
  CheckCircle2,
  MapPin,
  Laptop,
  LayoutGrid
} from 'lucide-react';
import { differenceInMinutes, format } from 'date-fns';
import { SchoolComputerLogo } from './SchoolComputerLogo';
import schoolSealImg from '../assets/images/mma_school_seal.png';

interface SidebarProps {
  user: FirebaseUser | null;
  profile: UserProfile | null;
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  currentUserSession?: LabUsage;
  laboratories: Laboratory[];
  activeSessions?: LabUsage[];
  openIssuesCount?: number;
  activeAcCount?: number;
  pendingBorrowCount?: number;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onOpenCheckIn: () => void;
  onCheckOut: (sessionId: string) => void;
  onLogout: () => void;
  onLogin: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  user,
  profile,
  activeTab,
  setActiveTab,
  currentUserSession,
  laboratories,
  activeSessions = [],
  openIssuesCount = 0,
  activeAcCount = 0,
  pendingBorrowCount = 0,
  isOpenMobile,
  onCloseMobile,
  isCollapsed,
  onToggleCollapse,
  onOpenCheckIn,
  onCheckOut,
  onLogout,
  onLogin,
}) => {
  const currentLab = currentUserSession 
    ? laboratories.find(l => l.id === currentUserSession.labId) 
    : null;

  // Capacity warning check
  const warningLabs = laboratories.filter(lab => {
    const labSessionCount = activeSessions.filter(s => s.labId === lab.id).length;
    return getLabCapacityStatus(labSessionCount, lab.capacity).isWarning;
  });
  const hasCapacityWarning = warningLabs.length > 0;

  const handleNavigate = (tab: ActiveTab) => {
    setActiveTab(tab);
    onCloseMobile();
  };

  // Active session timer
  const sessionDuration = currentUserSession
    ? Math.max(0, differenceInMinutes(new Date(), currentUserSession.checkIn.toDate()))
    : 0;

  const navItems = [
    {
      group: 'FACILITIES & WORKSTATIONS',
      items: [
        {
          id: 'floorplan' as ActiveTab,
          label: 'Dashboard',
          icon: LayoutGrid,
          badge: hasCapacityWarning ? 'High Load' : undefined,
          badgeColor: 'bg-red-500 text-white animate-pulse',
        },
        {
          id: 'schedule' as ActiveTab,
          label: 'Timetable',
          icon: Calendar,
        },
        {
          id: 'attendance' as ActiveTab,
          label: 'Live Attendance',
          icon: Users,
          count: activeSessions.length > 0 ? activeSessions.length : undefined,
          countColor: 'bg-zinc-800 text-zinc-300',
        },
      ],
    },
    {
      group: 'OPERATIONS & ASSETS',
      items: [
        {
          id: 'items' as ActiveTab,
          label: 'Equipment & Loans',
          icon: Package,
          count: pendingBorrowCount > 0 ? pendingBorrowCount : undefined,
          countColor: 'bg-amber-500 text-white font-bold animate-pulse',
          highlight: pendingBorrowCount > 0,
        },
        {
          id: 'aircon' as ActiveTab,
          label: 'AC In/Out Tracker',
          icon: Snowflake,
          count: activeAcCount > 0 ? `${activeAcCount} ON` : undefined,
          countColor: 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40',
        },
        {
          id: 'maintenance' as ActiveTab,
          label: 'Repairs & Issues',
          icon: AlertTriangle,
          count: openIssuesCount > 0 ? openIssuesCount : undefined,
          countColor: 'bg-amber-500 text-white',
        },
      ],
    },
    {
      group: 'LABORATORIES & INSIGHTS',
      items: [
        {
          id: 'labs' as ActiveTab,
          label: 'Laboratory Rooms',
          icon: Layers,
          badge: hasCapacityWarning ? '!' : undefined,
          badgeColor: 'bg-red-500 text-white font-bold',
        },
        {
          id: 'trainers' as ActiveTab,
          label: 'Faculty, Sections & Subjects',
          icon: GraduationCap,
        },
        {
          id: 'analytics' as ActiveTab,
          label: 'Utilization & Analytics',
          icon: BarChart3,
        },
        {
          id: 'kiosk' as ActiveTab,
          label: 'Door Display Kiosk',
          icon: Tv,
        },
      ],
    },
  ];

  // Admin exclusive group
  const adminItems = [
    {
      id: 'reports' as ActiveTab,
      label: 'Audit & Reports',
      icon: FileText,
    },
    {
      id: 'users' as ActiveTab,
      label: 'User Roles & Access',
      icon: ShieldCheck,
    },
  ];

  const sidebarContent = (
    <div className="flex flex-col h-full justify-between select-none">
      {/* 1. Header / Brand */}
      <div>
        <div className="py-4 px-3 flex flex-col items-center border-b border-[#1B3A60] bg-[#071324] relative">
          <div className="flex items-center justify-end w-full mb-1">
            {/* Desktop Collapse Toggle */}
            <button
              onClick={onToggleCollapse}
              title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              className="hidden lg:flex p-1 rounded-lg text-blue-200 hover:text-white hover:bg-[#132C4F] transition-colors"
            >
              {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>

            {/* Mobile Close Button */}
            <button
              onClick={onCloseMobile}
              className="lg:hidden p-1 rounded-lg text-blue-200 hover:text-white hover:bg-[#132C4F] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <button
            onClick={() => handleNavigate('floorplan')}
            className="flex flex-col items-center text-center focus:outline-none group cursor-pointer"
          >
            <div className={`rounded-full bg-white p-1 shadow-md ring-2 ring-blue-500/30 flex items-center justify-center transition-transform group-hover:scale-105 ${
              isCollapsed ? 'w-10 h-10' : 'w-14 h-14 mb-1.5'
            }`}>
              <img src={schoolSealImg} alt="MMA Seal" className="w-full h-full object-contain" />
            </div>
            {!isCollapsed && (
              <div className="flex flex-col items-center">
                <span className="text-[11px] font-bold tracking-wider text-white uppercase font-sans leading-tight">
                  MARY MEDIATRIX
                </span>
                <span className="text-[9px] font-bold tracking-widest text-blue-300 uppercase">
                  ACADEMY
                </span>
              </div>
            )}
          </button>
        </div>

        {/* 2. Active Session Card (If user is currently occupying a workstation) */}
        {currentUserSession && (
          <div className={`p-3 m-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 ${
            isCollapsed ? 'text-center p-2' : ''
          }`}>
            {!isCollapsed ? (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping shrink-0" />
                    Live Station
                  </span>
                  <span className="text-[10px] font-mono text-emerald-400/80">
                    {sessionDuration}m ago
                  </span>
                </div>
                <div className="font-bold text-xs text-white flex items-center justify-between">
                  <span>{currentUserSession.station}</span>
                  <span className="text-[11px] font-medium text-emerald-300/80 truncate max-w-[120px]">
                    {currentLab?.name || 'Lab'}
                  </span>
                </div>
                <button
                  onClick={() => onCheckOut(currentUserSession.id)}
                  className="mt-2 w-full py-1 px-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-[11px] shadow-xs transition-colors flex items-center justify-center gap-1 cursor-pointer"
                >
                  <LogOut className="w-3 h-3" />
                  <span>Check Out Now</span>
                </button>
              </div>
            ) : (
              <button
                onClick={() => onCheckOut(currentUserSession.id)}
                title={`Checked in to ${currentUserSession.station}. Click to check out.`}
                className="w-full flex justify-center py-1 text-emerald-400 hover:text-emerald-300"
              >
                <div className="relative">
                  <Monitor className="w-5 h-5" />
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                </div>
              </button>
            )}
          </div>
        )}

        {/* 3. Navigation Groups */}
        <div className="p-3 space-y-6 overflow-y-auto max-h-[calc(100vh-230px)] custom-scrollbar">
          {navItems.map((group, gIdx) => (
            <div key={gIdx} className="space-y-1">
              {!isCollapsed && (
                <div className="px-3 pb-1 text-[10px] font-extrabold uppercase tracking-wider text-blue-300/70 font-mono">
                  {group.group}
                </div>
              )}
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavigate(item.id)}
                    title={isCollapsed ? item.label : undefined}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all relative group ${
                      isActive
                        ? 'bg-[#2563EB] text-white shadow-md font-bold'
                        : 'text-blue-100/70 hover:text-white hover:bg-white/10'
                    } ${isCollapsed ? 'justify-center px-0' : ''}`}
                  >
                    <Icon className={`w-4 h-4 shrink-0 transition-colors ${
                      isActive ? 'text-white' : 'text-blue-200/70 group-hover:text-white'
                    }`} />

                    {!isCollapsed && (
                      <span className="truncate flex-1 text-left">
                        {item.label}
                      </span>
                    )}

                    {!isCollapsed && item.count !== undefined && (
                      <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-mono font-bold shrink-0 ${item.countColor || 'bg-[#1A3860] text-blue-100'}`}>
                        {item.count}
                      </span>
                    )}

                    {!isCollapsed && item.badge && (
                      <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-bold shrink-0 ${item.badgeColor || 'bg-red-500 text-white'}`}>
                        {item.badge}
                      </span>
                    )}

                    {isCollapsed && (item.count !== undefined || item.badge) && (
                      <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-blue-400" />
                    )}
                  </button>
                );
              })}
            </div>
          ))}

          {/* Admin Section */}
          {profile?.role === 'admin' && (
            <div className="space-y-1 pt-2 border-t border-zinc-800/60">
              {!isCollapsed && (
                <div className="px-3 pb-1 text-[10px] font-extrabold uppercase tracking-wider text-amber-500/80 font-mono flex items-center gap-1.5">
                  <ShieldCheck className="w-3 h-3 text-amber-500" />
                  <span>ADMINISTRATION</span>
                </div>
              )}
              {adminItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavigate(item.id)}
                    title={isCollapsed ? item.label : undefined}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all relative group ${
                      isActive
                        ? 'bg-zinc-800 text-white shadow-xs font-bold'
                        : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900/80'
                    } ${isCollapsed ? 'justify-center px-0' : ''}`}
                  >
                    {isActive && (
                      <span className="absolute left-0 top-2 bottom-2 w-1 bg-amber-500 rounded-r-full" />
                    )}
                    <Icon className={`w-4 h-4 shrink-0 ${
                      isActive ? 'text-amber-400' : 'text-zinc-400 group-hover:text-zinc-200'
                    }`} />
                    {!isCollapsed && (
                      <span className="truncate flex-1 text-left">
                        {item.label}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* 4. Footer & User Profile */}
      {/* 4. Footer & User Profile */}
      <div className="p-3 border-t border-[#1B3A60] bg-[#071324]">
        {user ? (
          <div>
            {/* Quick Station Check-In Button */}
            {!currentUserSession && (
              <button
                onClick={onOpenCheckIn}
                title={isCollapsed ? 'Check In to Workstation' : undefined}
                className={`w-full mb-3 py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md shadow-blue-900/40 transition-colors flex items-center justify-center gap-2 cursor-pointer ${
                  isCollapsed ? 'px-0' : ''
                }`}
              >
                <LogIn className="w-4 h-4 shrink-0" />
                {!isCollapsed && <span>Check In to Station</span>}
              </button>
            )}

            {/* User Account Capsule */}
            <div className={`flex items-center gap-2.5 p-2 rounded-xl bg-[#0B1E38] border border-[#1E426D] ${
              isCollapsed ? 'justify-center p-1.5' : ''
            }`}>
              <div className="w-8 h-8 rounded-lg bg-[#16365C] border border-[#214D80] flex items-center justify-center text-xs font-bold text-white shrink-0 overflow-hidden">
                {user.photoURL ? (
                  <img src={user.photoURL} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <span>{user.displayName?.[0]?.toUpperCase() || 'U'}</span>
                )}
              </div>

              {!isCollapsed && (
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-white truncate leading-tight">
                    {user.displayName || 'Authorized User'}
                  </p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className={`inline-block px-1.5 py-0.2 rounded text-[9px] font-bold capitalize ${
                      profile?.role === 'admin' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                      profile?.role === 'teacher' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' :
                      'bg-[#132C4F] text-blue-200'
                    }`}>
                      {profile?.role || 'student'}
                    </span>
                  </div>
                </div>
              )}

              {!isCollapsed && (
                <button
                  onClick={onLogout}
                  title="Sign Out"
                  className="p-1.5 text-blue-200 hover:text-red-400 hover:bg-[#132C4F] rounded-lg transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              )}
            </div>

            {!isCollapsed && (
              <div className="mt-2.5 pt-2 border-t border-[#1B3A60]/80 flex items-center justify-between text-[10px] text-blue-300/70 font-mono">
                <div className="flex items-center gap-1.5 min-w-0">
                  <div className="w-4 h-4 rounded-full bg-white p-0.5 shrink-0 flex items-center justify-center">
                    <img src={schoolSealImg} alt="MMA Seal" className="w-full h-full object-contain" />
                  </div>
                  <span className="truncate text-blue-100 font-medium">Mary Mediatrix Academy</span>
                </div>
                <span className="text-blue-300 font-semibold text-[9px] uppercase tracking-wider shrink-0">ICT</span>
              </div>
            )}
          </div>
        ) : (
          <button
            onClick={onLogin}
            className="w-full py-2.5 px-3 rounded-xl bg-white text-[#0A192F] font-bold text-xs hover:bg-blue-50 transition-colors flex items-center justify-center gap-2 shadow-sm"
          >
            <LogIn className="w-4 h-4" />
            {!isCollapsed && <span>Sign In with Google</span>}
          </button>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sticky Sidebar */}
      <aside
        className={`hidden lg:flex flex-col bg-[#0A192F] border-r border-[#1B3A60] sticky top-0 h-screen z-30 transition-all duration-300 shrink-0 ${
          isCollapsed ? 'w-20' : 'w-64'
        }`}
      >
        {sidebarContent}
      </aside>

      {/* Mobile Drawer (Slide Out with Backdrop) */}
      {isOpenMobile && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop */}
          <div
            onClick={onCloseMobile}
            className="fixed inset-0 bg-[#0A192F]/80 backdrop-blur-xs transition-opacity"
          />

          {/* Drawer Content */}
          <div className="fixed inset-y-0 left-0 w-72 max-w-[85vw] bg-[#0A192F] shadow-2xl border-r border-[#1B3A60] flex flex-col z-50 animate-in slide-in-from-left duration-200">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
