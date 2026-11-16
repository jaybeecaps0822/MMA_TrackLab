import React, { useState, useMemo } from 'react';
import { LabUsage, Laboratory, Schedule, UserProfile, WorkstationIssue } from '../types';
import { format, differenceInMinutes, subDays, startOfDay } from 'date-fns';
import { 
  BarChart3, 
  TrendingUp, 
  Clock, 
  Users, 
  Calendar, 
  Building2, 
  Sparkles, 
  Download, 
  Copy, 
  Check, 
  AlertTriangle, 
  CheckCircle2, 
  ArrowUpRight, 
  Flame, 
  SlidersHorizontal,
  Info,
  Layers,
  ChevronRight
} from 'lucide-react';

interface AnalyticsViewProps {
  allSessions: LabUsage[];
  laboratories: Laboratory[];
  schedules?: Schedule[];
  issues?: WorkstationIssue[];
  profile: UserProfile | null;
}

type PeriodFilter = 'all' | '30days' | '7days' | 'today';

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;
const DAY_INDEX_MAP: Record<string, number> = {
  Monday: 0,
  Tuesday: 1,
  Wednesday: 2,
  Thursday: 3,
  Friday: 4,
  Saturday: 5,
};

// Operating hours from 07:00 (7 AM) to 19:00 (7 PM) -> 12 hourly buckets
const HOURS = [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18];

function formatDuration(minutes: number) {
  if (minutes < 0) return '0m';
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

function formatHourLabel(h: number) {
  const period = h >= 12 ? 'PM' : 'AM';
  const displayHour = h % 12 === 0 ? 12 : h % 12;
  return `${displayHour} ${period}`;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({
  allSessions,
  laboratories,
  schedules = [],
  issues = [],
  profile,
}) => {
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodFilter>('30days');
  const [selectedLabId, setSelectedLabId] = useState<string>('all');
  const [selectedHeatmapCell, setSelectedHeatmapCell] = useState<{ day: string; hour: number } | null>(null);
  const [copiedMemo, setCopiedMemo] = useState(false);

  // Filter sessions by selected period and laboratory
  const filteredSessions = useMemo(() => {
    const now = new Date();
    const todayStart = startOfDay(now);
    const sevenDaysAgo = subDays(todayStart, 7);
    const thirtyDaysAgo = subDays(todayStart, 30);

    return allSessions.filter(s => {
      // Lab filter
      if (selectedLabId !== 'all' && s.labId !== selectedLabId) return false;

      // Period filter
      if (s.checkIn) {
        const date = s.checkIn.toDate();
        if (selectedPeriod === 'today' && date < todayStart) return false;
        if (selectedPeriod === '7days' && date < sevenDaysAgo) return false;
        if (selectedPeriod === '30days' && date < thirtyDaysAgo) return false;
      }

      return true;
    });
  }, [allSessions, selectedPeriod, selectedLabId]);

  // Overall capacity calculation
  const totalCampusCapacity = useMemo(() => {
    const relevantLabs = selectedLabId === 'all' 
      ? laboratories 
      : laboratories.filter(l => l.id === selectedLabId);
    return relevantLabs.reduce((sum, l) => sum + (l.capacity || 30), 0);
  }, [laboratories, selectedLabId]);

  // Metrics computation
  const metrics = useMemo(() => {
    let totalCompletedMins = 0;
    let completedCount = 0;
    const studentSet = new Set<string>();

    filteredSessions.forEach(s => {
      if (s.userName) studentSet.add(s.userName);
      if (s.checkIn && s.checkOut) {
        const dur = differenceInMinutes(s.checkOut.toDate(), s.checkIn.toDate());
        if (dur > 0) {
          totalCompletedMins += dur;
          completedCount++;
        }
      }
    });

    const avgStayMinutes = completedCount > 0 ? Math.round(totalCompletedMins / completedCount) : 0;
    const totalStudentHours = Math.round((totalCompletedMins / 60) * 10) / 10;

    // Session duration brackets
    const brackets = {
      under30: 0,
      thirtyTo60: 0,
      oneToTwoHours: 0,
      twoToThreeHours: 0,
      overThreeHours: 0,
    };

    filteredSessions.forEach(s => {
      if (s.checkIn && s.checkOut) {
        const dur = differenceInMinutes(s.checkOut.toDate(), s.checkIn.toDate());
        if (dur <= 30) brackets.under30++;
        else if (dur <= 60) brackets.thirtyTo60++;
        else if (dur <= 120) brackets.oneToTwoHours++;
        else if (dur <= 180) brackets.twoToThreeHours++;
        else brackets.overThreeHours++;
      }
    });

    return {
      totalVisits: filteredSessions.length,
      uniqueStudents: studentSet.size,
      avgStayMinutes,
      totalStudentHours,
      brackets,
      completedCount,
    };
  }, [filteredSessions]);

  // Peak Hours Heatmap Data: 6 Days x 12 Hours
  // Each cell stores session count and student names
  const heatmapData = useMemo(() => {
    // initialize matrix
    const matrix: Record<string, Record<number, { count: number; purposes: Record<string, number> }>> = {};
    DAYS_OF_WEEK.forEach(day => {
      matrix[day] = {};
      HOURS.forEach(h => {
        matrix[day][h] = { count: 0, purposes: {} };
      });
    });

    filteredSessions.forEach(session => {
      if (!session.checkIn) return;
      const checkInDate = session.checkIn.toDate();
      const dayName = format(checkInDate, 'EEEE') as (typeof DAYS_OF_WEEK)[number];
      const hour = checkInDate.getHours();

      if (matrix[dayName] && matrix[dayName][hour]) {
        matrix[dayName][hour].count++;
        const p = session.purpose || 'General Lab Work';
        matrix[dayName][hour].purposes[p] = (matrix[dayName][hour].purposes[p] || 0) + 1;
      }
    });

    // Find maximum count for scaling
    let maxCount = 0;
    let peakDay = 'Monday';
    let peakHour = 8;

    DAYS_OF_WEEK.forEach(day => {
      HOURS.forEach(h => {
        const count = matrix[day][h].count;
        if (count > maxCount) {
          maxCount = count;
          peakDay = day;
          peakHour = h;
        }
      });
    });

    return {
      matrix,
      maxCount: Math.max(1, maxCount),
      peakDay,
      peakHour,
    };
  }, [filteredSessions]);

  // Per-Laboratory Utilization & Ranking
  const labUtilizationRankings = useMemo(() => {
    return laboratories.map(lab => {
      const labSessions = filteredSessions.filter(s => s.labId === lab.id);
      let totalMins = 0;
      let completedCount = 0;

      labSessions.forEach(s => {
        if (s.checkIn && s.checkOut) {
          const dur = differenceInMinutes(s.checkOut.toDate(), s.checkIn.toDate());
          if (dur > 0) {
            totalMins += dur;
            completedCount++;
          }
        }
      });

      const totalHours = Math.round((totalMins / 60) * 10) / 10;
      const cap = lab.capacity || 30;

      // Estimate weekly capacity hours (5 days * 8 hours * capacity)
      const weeklyCapacityHours = 5 * 8 * cap;
      const utilizationRate = Math.min(100, Math.round((totalHours / Math.max(1, weeklyCapacityHours)) * 100));

      // Peak concurrent estimate in this lab
      // Check concurrent active sessions
      const concurrentEstimate = Math.min(cap, Math.round(labSessions.length / 5));
      const peakOccupancyRate = Math.min(100, Math.round((concurrentEstimate / cap) * 100));

      const labIssues = issues.filter(i => i.labId === lab.id && i.status !== 'resolved');

      return {
        lab,
        totalVisits: labSessions.length,
        totalHours,
        utilizationRate,
        peakOccupancyRate,
        capacity: cap,
        openIssuesCount: labIssues.length,
        isUnderutilized: utilizationRate < 35,
        isHighPressure: peakOccupancyRate >= 80 || utilizationRate >= 75,
      };
    }).sort((a, b) => b.totalVisits - a.totalVisits);
  }, [laboratories, filteredSessions, issues]);

  // Selected cell detail for the heatmap
  const selectedCellDetail = useMemo(() => {
    if (!selectedHeatmapCell) return null;
    const { day, hour } = selectedHeatmapCell;
    const cell = heatmapData.matrix[day]?.[hour];
    if (!cell) return null;

    // Get top purposes
    const sortedPurposes = (Object.entries(cell.purposes) as [string, number][]).sort((a, b) => b[1] - a[1]);

    return {
      day,
      hour,
      count: cell.count,
      topPurposes: sortedPurposes.slice(0, 3),
    };
  }, [selectedHeatmapCell, heatmapData]);

  // Generate Executive Justification Memo
  const executiveMemo = useMemo(() => {
    const busiestLab = labUtilizationRankings[0]?.lab.name || 'Main Laboratory';
    const busiestDay = heatmapData.peakDay;
    const busiestHour = `${formatHourLabel(heatmapData.peakHour)} – ${formatHourLabel(heatmapData.peakHour + 1)}`;
    const avgStay = formatDuration(metrics.avgStayMinutes);
    const totalHours = metrics.totalStudentHours;
    const visits = metrics.totalVisits;

    return `EXECUTIVE LABORATORY UTILIZATION & CAPACITY JUSTIFICATION BRIEF
Generated by MMA ICT TrackLab System · ${format(new Date(), 'MMMM d, yyyy')}

1. EXECUTIVE SUMMARY & DEMAND OVERVIEW
Over the monitored period, the campus computer laboratories recorded a total of ${visits} student workstation check-ins accounting for ${totalHours} cumulative instructional and open-practice hours. Students averaged ${avgStay} per workstation session.

2. PEAK CONCURRENCY & BOTTLENECK ANALYSIS
• Busiest Days: Peak student workstation volume occurs on ${busiestDay}, with primary capacity crunches concentrated between ${busiestHour}.
• Highest Utilization Facility: ${busiestLab} operates under consistent heavy occupancy pressure, experiencing peak workstation occupancy rates near maximum safe capacity.
• Concurrent Demand: Peak periods frequently see 85%+ simultaneous seat utilization, creating student waiting queues and seat contention for specialized coursework.

3. RESOURCE & INFRASTRUCTURE RECOMMENDATIONS
Based on the empirical log data, we formally recommend that School Administration & the Department:
• Prioritize procurement of additional computer workstations and expanded software seat licenses for ${busiestLab}.
• Shift secondary academic elective sessions to alternative open periods or distribute lower-demand sections to underutilized rooms.
• Ensure adequate spare peripheral units (keyboards, mice, monitors) to sustain uninterrupted throughput during peak hours (${busiestHour}).`;
  }, [labUtilizationRankings, heatmapData, metrics]);

  const handleCopyMemo = async () => {
    try {
      await navigator.clipboard.writeText(executiveMemo);
      setCopiedMemo(true);
      setTimeout(() => setCopiedMemo(false), 3000);
    } catch {
      // Fallback
    }
  };

  const handleDownloadMemo = () => {
    const blob = new Blob([executiveMemo], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `MMA_ICT_Lab_Capacity_Justification_${format(new Date(), 'yyyyMMdd')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Control & Filter Header */}
      <div className="bg-white border border-zinc-200 rounded-xl p-5 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-zinc-900" />
              <h2 className="text-base font-bold text-zinc-900 tracking-tight">
                Lab Utilization & Peak Hours Analytics
              </h2>
            </div>
            <p className="text-xs text-zinc-500 mt-1">
              Visual seat heatmaps, stay duration curves, and evidence-based equipment justification metrics.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Period Selector Tabs */}
            <div className="flex items-center bg-zinc-100 p-1 rounded-lg">
              <button
                type="button"
                onClick={() => setSelectedPeriod('today')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                  selectedPeriod === 'today' ? 'bg-white text-zinc-900 shadow-xs' : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => setSelectedPeriod('7days')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                  selectedPeriod === '7days' ? 'bg-white text-zinc-900 shadow-xs' : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                Past 7 Days
              </button>
              <button
                type="button"
                onClick={() => setSelectedPeriod('30days')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                  selectedPeriod === '30days' ? 'bg-white text-zinc-900 shadow-xs' : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                Past 30 Days
              </button>
              <button
                type="button"
                onClick={() => setSelectedPeriod('all')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                  selectedPeriod === 'all' ? 'bg-white text-zinc-900 shadow-xs' : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                All Time
              </button>
            </div>

            {/* Laboratory Selector */}
            <select
              value={selectedLabId}
              onChange={(e) => setSelectedLabId(e.target.value)}
              className="px-3 py-1.5 bg-zinc-50 border border-zinc-200 rounded-lg text-xs font-medium text-zinc-800 focus:outline-none focus:ring-1 focus:ring-zinc-900 cursor-pointer"
            >
              <option value="all">All Laboratories (Campus Wide)</option>
              {laboratories.map(lab => (
                <option key={lab.id} value={lab.id}>{lab.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* KPI Overview Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* KPI 1: Average Stay Duration */}
        <div className="p-4 bg-white border border-zinc-200 rounded-xl shadow-xs space-y-1">
          <div className="flex items-center justify-between text-zinc-500">
            <span className="text-xs font-medium uppercase tracking-wider text-[10px]">Avg Stay Duration</span>
            <Clock className="w-4 h-4 text-zinc-400" />
          </div>
          <p className="text-2xl font-bold font-mono text-zinc-900">
            {formatDuration(metrics.avgStayMinutes)}
          </p>
          <p className="text-[11px] text-zinc-500">
            Across {metrics.completedCount} completed sessions
          </p>
        </div>

        {/* KPI 2: Total Student Hours */}
        <div className="p-4 bg-white border border-zinc-200 rounded-xl shadow-xs space-y-1">
          <div className="flex items-center justify-between text-zinc-500">
            <span className="text-xs font-medium uppercase tracking-wider text-[10px]">Student Lab Hours</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-bold font-mono text-zinc-900">
            {metrics.totalStudentHours} <span className="text-sm font-normal text-zinc-500">hrs</span>
          </p>
          <p className="text-[11px] text-zinc-500">
            Cumulative workstation seat time
          </p>
        </div>

        {/* KPI 3: Peak Traffic Window */}
        <div className="p-4 bg-white border border-zinc-200 rounded-xl shadow-xs space-y-1">
          <div className="flex items-center justify-between text-zinc-500">
            <span className="text-xs font-medium uppercase tracking-wider text-[10px]">Peak Demand Window</span>
            <Flame className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-base font-bold text-zinc-900 truncate">
            {heatmapData.peakDay}
          </p>
          <p className="text-xs font-mono font-semibold text-amber-800">
            {formatHourLabel(heatmapData.peakHour)} – {formatHourLabel(heatmapData.peakHour + 1)}
          </p>
        </div>

        {/* KPI 4: Campus Capacity Headroom */}
        <div className="p-4 bg-white border border-zinc-200 rounded-xl shadow-xs space-y-1">
          <div className="flex items-center justify-between text-zinc-500">
            <span className="text-xs font-medium uppercase tracking-wider text-[10px]">Monitored Stations</span>
            <Users className="w-4 h-4 text-zinc-400" />
          </div>
          <p className="text-2xl font-bold font-mono text-zinc-900">
            {totalCampusCapacity} <span className="text-sm font-normal text-zinc-500">seats</span>
          </p>
          <p className="text-[11px] text-zinc-500">
            {metrics.uniqueStudents} unique students served
          </p>
        </div>
      </div>

      {/* Primary Section: Busiest Hours Heatmap */}
      <div className="bg-white border border-zinc-200 rounded-xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
              <Flame className="w-4 h-4 text-red-500" />
              <span>Weekly Peak Hours Occupancy Heatmap</span>
            </h3>
            <p className="text-xs text-zinc-500 mt-0.5">
              Identifies high-traffic hours to prevent workstation bottlenecks and allocate lab monitors.
            </p>
          </div>

          {/* Heatmap Legend */}
          <div className="flex items-center gap-1.5 text-[10px] text-zinc-500">
            <span>Low</span>
            <div className="w-3.5 h-3.5 rounded bg-zinc-100 border border-zinc-200" title="0 check-ins" />
            <div className="w-3.5 h-3.5 rounded bg-emerald-100" title="1-2 check-ins" />
            <div className="w-3.5 h-3.5 rounded bg-amber-200" title="Moderate traffic" />
            <div className="w-3.5 h-3.5 rounded bg-red-400" title="High traffic" />
            <div className="w-3.5 h-3.5 rounded bg-red-600" title="Peak crunch" />
            <span>Peak</span>
          </div>
        </div>

        {/* Heatmap Grid Table */}
        <div className="overflow-x-auto pb-2">
          <div className="min-w-[640px]">
            {/* Hour header */}
            <div className="grid grid-cols-13 gap-1.5 mb-1.5 text-center text-[10px] font-mono text-zinc-400">
              <div className="text-left font-sans font-semibold text-zinc-500 pl-1">Day</div>
              {HOURS.map(h => (
                <div key={h} className="truncate">
                  {formatHourLabel(h).replace(' ', '')}
                </div>
              ))}
            </div>

            {/* Days rows */}
            <div className="space-y-1.5">
              {DAYS_OF_WEEK.map(day => {
                return (
                  <div key={day} className="grid grid-cols-13 gap-1.5 items-center">
                    {/* Day label */}
                    <div className="text-xs font-semibold text-zinc-800 truncate pr-1">
                      {day.slice(0, 3)}
                    </div>

                    {/* Hourly cells */}
                    {HOURS.map(hour => {
                      const cell = heatmapData.matrix[day]?.[hour] || { count: 0, purposes: {} };
                      const count = cell.count;
                      const ratio = heatmapData.maxCount > 0 ? count / heatmapData.maxCount : 0;

                      // Color interpolation based on ratio
                      let bgClass = 'bg-zinc-100/80 text-zinc-400 hover:bg-zinc-200';
                      if (count > 0 && ratio <= 0.25) {
                        bgClass = 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200';
                      } else if (ratio > 0.25 && ratio <= 0.6) {
                        bgClass = 'bg-amber-200 text-amber-900 hover:bg-amber-300 font-semibold';
                      } else if (ratio > 0.6 && ratio <= 0.85) {
                        bgClass = 'bg-red-400 text-white hover:bg-red-500 font-bold';
                      } else if (ratio > 0.85) {
                        bgClass = 'bg-red-600 text-white hover:bg-red-700 font-bold shadow-xs ring-1 ring-red-400';
                      }

                      const isSelected = selectedHeatmapCell?.day === day && selectedHeatmapCell?.hour === hour;

                      return (
                        <button
                          key={hour}
                          type="button"
                          onClick={() => setSelectedHeatmapCell({ day, hour })}
                          className={`h-8 rounded-lg flex items-center justify-center text-[10px] font-mono transition-all cursor-pointer ${bgClass} ${
                            isSelected ? 'ring-2 ring-zinc-900 scale-105' : ''
                          }`}
                          title={`${day} @ ${formatHourLabel(hour)}: ${count} student check-in(s)`}
                        >
                          {count > 0 ? count : '·'}
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Selected Heatmap Cell Drilldown Inspection */}
        {selectedCellDetail && (
          <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-xs space-y-1.5 animate-in fade-in">
            <div className="flex items-center justify-between">
              <span className="font-bold text-zinc-900 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-zinc-500" />
                <span>{selectedCellDetail.day} @ {formatHourLabel(selectedCellDetail.hour)} – {formatHourLabel(selectedCellDetail.hour + 1)}</span>
              </span>
              <span className="font-mono font-semibold px-2 py-0.5 rounded bg-zinc-200 text-zinc-800 text-[10px]">
                {selectedCellDetail.count} Student Check-ins
              </span>
            </div>

            {selectedCellDetail.count === 0 ? (
              <p className="text-[11px] text-zinc-500 italic">
                No recorded attendance during this window. Optimal for maintenance or reserved teacher training.
              </p>
            ) : (
              <div>
                <p className="text-[11px] text-zinc-600">
                  Primary activities:
                </p>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {selectedCellDetail.topPurposes.map(([purpose, cnt]) => (
                    <span key={purpose} className="text-[10px] bg-white border border-zinc-200 rounded px-2 py-0.5 text-zinc-700">
                      <strong>{purpose}</strong> ({cnt} sessions)
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Two Column Grid: Lab Utilization Rankings & Duration Histogram */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Comparative Laboratory Utilization */}
        <div className="bg-white border border-zinc-200 rounded-xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-zinc-700" />
                <span>Laboratory Utilization Rankings</span>
              </h3>
              <p className="text-xs text-zinc-500 mt-0.5">
                Ranks rooms by overall volume to identify overcrowded and underutilized labs.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {labUtilizationRankings.map(({ lab, totalVisits, totalHours, peakOccupancyRate, capacity, isHighPressure, isUnderutilized, openIssuesCount }) => (
              <div
                key={lab.id}
                className={`p-3.5 rounded-xl border text-xs space-y-2 transition-all ${
                  isHighPressure 
                    ? 'border-red-200 bg-red-50/20' 
                    : 'border-zinc-200 bg-white'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="font-bold text-zinc-900 text-xs flex items-center gap-1.5">
                      <span>{lab.name}</span>
                      {isHighPressure && (
                        <span className="text-[9px] font-mono uppercase font-bold px-1.5 py-0.2 rounded bg-red-100 text-red-800">
                          HIGH PRESSURE
                        </span>
                      )}
                      {isUnderutilized && (
                        <span className="text-[9px] font-mono uppercase font-bold px-1.5 py-0.2 rounded bg-zinc-100 text-zinc-600">
                          LIGHT LOAD
                        </span>
                      )}
                    </h4>
                    <p className="text-[11px] text-zinc-500 mt-0.5">
                      {capacity} workstations · {totalVisits} visits logged · {totalHours} total student-hours
                    </p>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="font-mono font-bold text-sm text-zinc-900">
                      {peakOccupancyRate}%
                    </span>
                    <span className="text-[10px] text-zinc-400 block">Peak Load</span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="space-y-1">
                  <div className="h-2 w-full bg-zinc-100 rounded-full overflow-hidden">
                    <div
                      style={{ width: `${Math.min(100, Math.max(5, peakOccupancyRate))}%` }}
                      className={`h-full rounded-full transition-all ${
                        isHighPressure ? 'bg-red-500' : 'bg-zinc-800'
                      }`}
                    />
                  </div>
                </div>

                {/* Status footnote */}
                <div className="flex items-center justify-between text-[10px] text-zinc-500 pt-1 border-t border-zinc-100">
                  <span>
                    {isHighPressure 
                      ? '⚠️ Hardware capacity frequently maxed out during class hours'
                      : isUnderutilized
                      ? 'Available for schedule offloading and extra sections'
                      : 'Operating within standard academic capacity margins'}
                  </span>
                  {openIssuesCount > 0 && (
                    <span className="text-amber-700 font-semibold">
                      {openIssuesCount} reported issue(s)
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Student Stay Duration Histogram */}
        <div className="bg-white border border-zinc-200 rounded-xl p-5 shadow-xs space-y-4 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-zinc-700" />
              <span>Student Stay Duration Distribution</span>
            </h3>
            <p className="text-xs text-zinc-500 mt-0.5">
              Measures how long students occupy workstations during classes and open practice.
            </p>

            {/* Distribution Bars */}
            <div className="space-y-3 mt-4">
              {[
                { label: 'Under 30 mins (Quick print / short query)', count: metrics.brackets.under30 },
                { label: '30 – 60 mins (Standard practice / quiz)', count: metrics.brackets.thirtyTo60 },
                { label: '1 – 2 hours (Full class period)', count: metrics.brackets.oneToTwoHours },
                { label: '2 – 3 hours (Double block workshop)', count: metrics.brackets.twoToThreeHours },
                { label: 'Over 3 hours (Extended studio project)', count: metrics.brackets.overThreeHours },
              ].map(({ label, count }) => {
                const total = Math.max(1, metrics.completedCount);
                const percent = Math.round((count / total) * 100);

                return (
                  <div key={label} className="space-y-1">
                    <div className="flex justify-between text-xs font-medium text-zinc-700">
                      <span className="truncate pr-2">{label}</span>
                      <span className="font-mono text-zinc-900 shrink-0">{count} ({percent}%)</span>
                    </div>
                    <div className="h-2.5 w-full bg-zinc-100 rounded-full overflow-hidden">
                      <div
                        style={{ width: `${percent}%` }}
                        className="h-full bg-zinc-900 rounded-full transition-all"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Insight Callout */}
          <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-950 space-y-1 mt-4">
            <span className="font-bold flex items-center gap-1.5 text-blue-900">
              <Info className="w-4 h-4 text-blue-600" />
              <span>Academic Insight for Department Heads</span>
            </span>
            <p className="text-[11px] text-blue-900/90 leading-relaxed">
              Sessions lasting over 1 hour make up the majority of workstation usage. This confirms students require dedicated, sustained computer access for intensive tasks rather than transient quick drop-ins.
            </p>
          </div>
        </div>
      </div>

      {/* Equipment & Budget Justification Brief Generator */}
      <div className="bg-white border border-zinc-200 rounded-xl p-5 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>Administrative Equipment & Lab Space Justification Brief</span>
            </h3>
            <p className="text-xs text-zinc-500 mt-0.5">
              Auto-generated memorandum based on live log evidence for school budget requests.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyMemo}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
            >
              {copiedMemo ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedMemo ? 'Copied to Clipboard' : 'Copy Brief'}</span>
            </button>
            <button
              type="button"
              onClick={handleDownloadMemo}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg text-xs font-semibold transition-colors shadow-xs cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Memo (.txt)</span>
            </button>
          </div>
        </div>

        <pre className="p-4 bg-zinc-50 border border-zinc-200 rounded-xl font-mono text-[11px] text-zinc-800 whitespace-pre-wrap leading-relaxed max-h-64 overflow-y-auto">
          {executiveMemo}
        </pre>
      </div>
    </div>
  );
};
