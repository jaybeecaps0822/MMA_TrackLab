import React from 'react';
import { Laboratory, LabUsage, Schedule, UserProfile, AcUsage, LabItem } from '../types';
import { getLabCapacityStatus } from '../utils/capacity';
import { 
  Monitor, 
  Plus, 
  Pencil, 
  Trash2, 
  Users, 
  Clock, 
  ArrowRight, 
  LogIn, 
  AlertTriangle,
  Snowflake,
  Wind,
  Package,
  Printer
} from 'lucide-react';
import { format } from 'date-fns';

interface LabManagementViewProps {
  laboratories: Laboratory[];
  activeSessions: LabUsage[];
  schedules: Schedule[];
  profile: UserProfile | null;
  acSessions?: AcUsage[];
  items?: LabItem[];
  onAddLab: () => void;
  onEditLab: (lab: Laboratory) => void;
  onDeleteLab: (id: string) => void;
  onSelectLabForFloorplan: (labId: string) => void;
  onQuickCheckIn: (labId: string) => void;
  onLaunchKiosk?: (labId: string) => void;
  onOpenAcTracker?: (labId: string) => void;
  onOpenItems?: (labId: string) => void;
  onOpenPrintModal?: (mode?: 'room' | 'faculty', targetId?: string) => void;
}

export const LabManagementView: React.FC<LabManagementViewProps> = ({
  laboratories,
  activeSessions,
  schedules,
  profile,
  acSessions = [],
  items = [],
  onAddLab,
  onEditLab,
  onDeleteLab,
  onSelectLabForFloorplan,
  onQuickCheckIn,
  onLaunchKiosk,
  onOpenAcTracker,
  onOpenItems,
  onOpenPrintModal,
}) => {
  const isAuthorized = profile?.role === 'admin';
  const now = new Date();
  const currentDay = format(now, 'EEEE');
  const currentTime = format(now, 'HH:mm');

  // Summary counts for warning
  const warningLabsCount = laboratories.filter(lab => {
    const labSessions = activeSessions.filter(s => s.labId === lab.id);
    return getLabCapacityStatus(labSessions.length, lab.capacity).isWarning;
  }).length;

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="bg-white border border-zinc-200 rounded-xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-zinc-900 tracking-tight">
              Laboratories & Facilities
            </h2>
            {warningLabsCount > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-[10px] font-bold font-mono uppercase tracking-wider animate-pulse">
                <AlertTriangle className="w-3 h-3" />
                <span>{warningLabsCount} Capacity Alert{warningLabsCount === 1 ? '' : 's'}</span>
              </span>
            )}
          </div>
          <p className="text-xs text-zinc-500 mt-0.5">
            Manage laboratory spaces, capacity parameters, and monitor live room occupancy.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {onOpenPrintModal && (
            <button
              onClick={() => onOpenPrintModal('room')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-zinc-200 text-zinc-800 rounded-lg text-xs font-semibold hover:bg-zinc-50 transition-colors shadow-2xs cursor-pointer"
              title="Print Weekly Timetables for Laboratories"
            >
              <Printer className="w-3.5 h-3.5 text-amber-600" />
              <span>Print Room Timetables</span>
            </button>
          )}
          {isAuthorized && (
            <button
              onClick={onAddLab}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 text-white rounded-lg text-xs font-semibold hover:bg-zinc-800 transition-colors shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Laboratory</span>
            </button>
          )}
        </div>
      </div>

      {/* Capacity Warning Banner if any lab is at or near capacity */}
      {warningLabsCount > 0 && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center justify-between gap-3 text-xs text-red-900">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-red-100 border border-red-200 text-red-600 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold block text-red-950">
                Capacity Warning Active
              </span>
              <p className="text-red-700 text-[11px] mt-0.5">
                {warningLabsCount} {warningLabsCount === 1 ? 'laboratory is' : 'laboratories are'} nearing or exceeding their designated workstation limits. Highlighted in red below.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Lab Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {laboratories.length === 0 ? (
          <div className="col-span-full bg-white border border-zinc-200 rounded-xl p-12 text-center">
            <Monitor className="w-10 h-10 text-zinc-300 mx-auto mb-3" />
            <p className="text-sm font-semibold text-zinc-900">No laboratories found</p>
            <p className="text-xs text-zinc-500 mt-1">
              Add your first laboratory to track student attendance and schedule classes.
            </p>
          </div>
        ) : (
          laboratories.map(lab => {
            const labSessions = activeSessions.filter(s => s.labId === lab.id);
            const status = getLabCapacityStatus(labSessions.length, lab.capacity);

            // Find current class
            const currentClass = schedules.find(s => 
              s.labId === lab.id &&
              s.day === currentDay &&
              currentTime >= s.startTime &&
              currentTime <= s.endTime
            );

            // Total weekly sessions
            const weeklySchedulesCount = schedules.filter(s => s.labId === lab.id).length;

            return (
              <div
                key={lab.id}
                className={`rounded-xl p-5 shadow-xs flex flex-col justify-between transition-all group border ${
                  status.isWarning
                    ? 'bg-red-50/40 border-red-300 ring-2 ring-red-500/80 shadow-md shadow-red-100/50'
                    : 'bg-white border-zinc-200 hover:border-zinc-300'
                }`}
              >
                <div>
                  {/* Capacity Alert Ribbon on Card if near/exceeded */}
                  {status.isWarning && (
                    <div className="mb-3.5 px-3 py-1.5 rounded-lg bg-red-100 border border-red-200/80 text-red-900 flex items-center justify-between text-xs font-semibold">
                      <div className="flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-red-600 shrink-0" />
                        <span className="font-bold tracking-tight">
                          {status.isExceeded ? 'CAPACITY EXCEEDED' : 'CAPACITY WARNING'}
                        </span>
                      </div>
                      <span className="font-mono text-[11px] font-bold tabular-nums text-red-700">
                        {status.badgeText}
                      </span>
                    </div>
                  )}

                  {/* Top row */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-9 h-9 rounded-lg border flex items-center justify-center ${
                        status.isWarning
                          ? 'bg-red-100 border-red-200 text-red-700'
                          : 'bg-zinc-100 border-zinc-200 text-zinc-800'
                      }`}>
                        <Monitor className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="font-bold text-sm text-zinc-900 leading-tight">
                          {lab.name}
                        </h3>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[11px] text-zinc-500 font-mono">
                            {status.capacity} Workstations
                          </span>
                          {(() => {
                            const activeAc = acSessions.find(s => s.labId === lab.id && s.status === 'active');
                            return activeAc ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-cyan-700 bg-cyan-50 border border-cyan-200 px-1.5 py-0.2 rounded-full">
                                <Snowflake className="w-2.5 h-2.5 text-cyan-500 animate-spin-slow" />
                                <span>AC {activeAc.temperature || 23}°C</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-mono text-zinc-400 bg-zinc-100 px-1.5 py-0.2 rounded-full">
                                <span>AC OFF</span>
                              </span>
                            );
                          })()}
                        </div>
                      </div>
                    </div>

                    {isAuthorized && (
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => onEditLab(lab)}
                          className="p-1 text-zinc-400 hover:text-zinc-900 rounded"
                          title="Edit Lab"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onDeleteLab(lab.id)}
                          className="p-1 text-zinc-400 hover:text-red-600 rounded"
                          title="Delete Lab"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Description */}
                  {lab.description && (
                    <p className="text-xs text-zinc-600 mt-3 line-clamp-2 leading-relaxed">
                      {lab.description}
                    </p>
                  )}

                  {/* Live Status indicator */}
                  <div className="mt-4 pt-3 border-t border-zinc-100">
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className={status.isWarning ? 'text-red-700 font-medium' : 'text-zinc-500'}>
                        {status.isWarning ? 'Occupancy (High Density)' : 'Occupancy'}
                      </span>
                      <span className={`font-mono font-semibold ${
                        status.isWarning ? 'text-red-700 font-bold' : 'text-zinc-800'
                      }`}>
                        {status.occupiedCount} / {status.capacity} ({status.occupancyRate}%)
                      </span>
                    </div>
                    <div className="w-full bg-zinc-100 h-2 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-300 ${
                          status.isWarning
                            ? 'bg-red-600 animate-pulse'
                            : status.occupancyRate > 70
                            ? 'bg-amber-500'
                            : 'bg-emerald-500'
                        }`}
                        style={{ width: `${Math.min(100, status.occupancyRate)}%` }}
                      />
                    </div>
                  </div>

                  {/* Current Activity Box */}
                  <div className={`mt-3 rounded-lg p-2.5 border text-xs ${
                    status.isWarning 
                      ? 'bg-red-100/50 border-red-200/70' 
                      : 'bg-zinc-50 border-zinc-100'
                  }`}>
                    {currentClass ? (
                      <div>
                        <div className="flex items-center gap-1 text-[10px] font-mono text-amber-700 font-semibold mb-0.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                          <span>CLASS IN SESSION</span>
                        </div>
                        <p className="font-bold text-zinc-900 truncate">
                          {currentClass.subject}
                        </p>
                        <p className="text-[11px] text-zinc-500 truncate mt-0.5">
                          {currentClass.teacherName} · {currentClass.startTime}–{currentClass.endTime}
                        </p>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between text-zinc-500">
                        <span>No class in session</span>
                        <span className={status.isWarning ? 'text-red-600 font-semibold' : 'text-emerald-600 font-medium'}>
                          {status.isWarning ? 'Limited Seating' : 'Open Lab'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Actions Footer */}
                <div className="mt-5 pt-3 border-t border-slate-100 flex flex-col gap-2.5">
                  {/* Utility & Shortcuts Row */}
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[11px] font-mono text-slate-500">
                      {weeklySchedulesCount} classes / wk
                    </span>
                    <div className="flex items-center gap-1.5 flex-wrap justify-end">
                      {onOpenAcTracker && (
                        <button
                          type="button"
                          onClick={() => onOpenAcTracker(lab.id)}
                          className="px-2 py-1 text-[11px] font-semibold rounded-lg text-cyan-800 bg-cyan-50 hover:bg-cyan-100 border border-cyan-200 transition-colors cursor-pointer flex items-center gap-1"
                          title="View AC In/Out Tracker & QR Code"
                        >
                          <Snowflake className="w-3 h-3 text-cyan-600" />
                          <span>AC</span>
                        </button>
                      )}
                      {onOpenItems && (
                        <button
                          type="button"
                          onClick={() => onOpenItems(lab.id)}
                          className="px-2 py-1 text-[11px] font-semibold rounded-lg text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 transition-colors cursor-pointer flex items-center gap-1"
                          title="View & Borrow Equipment assigned to this Lab"
                        >
                          <Package className="w-3 h-3 text-amber-600" />
                          <span>Items</span>
                        </button>
                      )}
                      {onOpenPrintModal && (
                        <button
                          type="button"
                          onClick={() => onOpenPrintModal('room', lab.id)}
                          className="px-2 py-1 text-[11px] font-semibold rounded-lg text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-colors cursor-pointer flex items-center gap-1"
                          title="Print Weekly Timetable for this Room"
                        >
                          <Printer className="w-3 h-3 text-slate-600" />
                          <span>Print</span>
                        </button>
                      )}
                      {onLaunchKiosk && (
                        <button
                          type="button"
                          onClick={() => onLaunchKiosk(lab.id)}
                          className="px-2 py-1 text-[11px] font-semibold rounded-lg text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-colors cursor-pointer flex items-center gap-1"
                          title="Launch Door Display Tablet View for this Room"
                        >
                          <Monitor className="w-3 h-3 text-blue-600" />
                          <span>Kiosk</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Primary Navigation & Check In Buttons */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => onQuickCheckIn(lab.id)}
                      className={`w-full py-2 px-3 text-xs font-semibold rounded-xl border transition-colors text-center cursor-pointer ${
                        status.isWarning
                          ? 'border-red-300 text-red-700 bg-red-50 hover:bg-red-100'
                          : 'border-slate-200 text-[#0A192F] bg-white hover:bg-slate-50'
                      }`}
                    >
                      {status.isExceeded ? 'Check In (Full)' : 'Quick Check In'}
                    </button>
                    <button
                      type="button"
                      onClick={() => onSelectLabForFloorplan(lab.id)}
                      className={`w-full py-2 px-3 rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer ${
                        status.isWarning
                          ? 'bg-red-600 hover:bg-red-700 text-white'
                          : 'bg-[#0A192F] hover:bg-[#132C4F] text-white'
                      }`}
                    >
                      <span>Floor Plan</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
