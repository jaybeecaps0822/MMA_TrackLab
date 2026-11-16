import React, { useState, useMemo } from 'react';
import { WorkstationIssue, Laboratory, UserProfile, IssueStatus, IssueCategory, IssueSeverity } from '../types';
import { format } from 'date-fns';
import { 
  Wrench, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Search, 
  Plus, 
  Monitor, 
  Filter, 
  Trash2, 
  Check, 
  ChevronRight,
  ShieldAlert,
  ArrowUpRight,
  RotateCcw
} from 'lucide-react';

interface MaintenanceViewProps {
  issues: WorkstationIssue[];
  laboratories: Laboratory[];
  profile: UserProfile | null;
  onOpenReportModal: (labId?: string, station?: string) => void;
  onResolveIssue: (issueId: string, notes?: string) => Promise<void>;
  onUpdateIssueStatus: (issueId: string, status: IssueStatus) => Promise<void>;
  onDeleteIssue: (issueId: string) => void;
}

export const MaintenanceView: React.FC<MaintenanceViewProps> = ({
  issues,
  laboratories,
  profile,
  onOpenReportModal,
  onResolveIssue,
  onUpdateIssueStatus,
  onDeleteIssue,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLabFilter, setSelectedLabFilter] = useState('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<'all' | IssueStatus>('open');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');
  const [selectedSeverityFilter, setSelectedSeverityFilter] = useState<string>('all');

  const [resolvingIssue, setResolvingIssue] = useState<WorkstationIssue | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [isSubmittingResolve, setIsSubmittingResolve] = useState(false);

  const isTeacherOrAdmin = profile?.role === 'teacher' || profile?.role === 'admin';

  // Fast KPI metrics
  const openIssuesCount = useMemo(() => {
    return issues.filter(i => i.status === 'open' || i.status === 'in_progress').length;
  }, [issues]);

  const criticalIssuesCount = useMemo(() => {
    return issues.filter(i => (i.status === 'open' || i.status === 'in_progress') && i.severity === 'critical').length;
  }, [issues]);

  const resolvedIssuesCount = useMemo(() => {
    return issues.filter(i => i.status === 'resolved').length;
  }, [issues]);

  const affectedStationsCount = useMemo(() => {
    const activeIssues = issues.filter(i => i.status !== 'resolved');
    const uniqueStations = new Set(activeIssues.map(i => `${i.labId}_${i.station}`));
    return uniqueStations.size;
  }, [issues]);

  // Filtered issues list
  const filteredIssues = useMemo(() => {
    return issues.filter(issue => {
      // Lab filter
      if (selectedLabFilter !== 'all' && issue.labId !== selectedLabFilter) return false;

      // Status filter
      if (selectedStatusFilter !== 'all') {
        if (selectedStatusFilter === 'open' && (issue.status !== 'open' && issue.status !== 'in_progress')) {
          return false;
        } else if (selectedStatusFilter !== 'open' && issue.status !== selectedStatusFilter) {
          return false;
        }
      }

      // Category filter
      if (selectedCategoryFilter !== 'all' && issue.category !== selectedCategoryFilter) return false;

      // Severity filter
      if (selectedSeverityFilter !== 'all' && issue.severity !== selectedSeverityFilter) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const stationMatch = issue.station.toLowerCase().includes(q);
        const descMatch = issue.description.toLowerCase().includes(q);
        const reporterMatch = issue.reportedByName.toLowerCase().includes(q);
        const labName = laboratories.find(l => l.id === issue.labId)?.name.toLowerCase() || '';
        const labMatch = labName.includes(q);
        if (!stationMatch && !descMatch && !reporterMatch && !labMatch) return false;
      }

      return true;
    });
  }, [issues, selectedLabFilter, selectedStatusFilter, selectedCategoryFilter, selectedSeverityFilter, searchQuery, laboratories]);

  const handleConfirmResolve = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolvingIssue) return;
    setIsSubmittingResolve(true);
    try {
      await onResolveIssue(resolvingIssue.id, resolutionNotes.trim() || undefined);
      setResolvingIssue(null);
      setResolutionNotes('');
    } catch (err) {
      console.error('Error resolving issue:', err);
    } finally {
      setIsSubmittingResolve(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white border border-zinc-200 rounded-xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center font-bold">
              <Wrench className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-zinc-900 tracking-tight">
                Workstation Maintenance & Fault Reports
              </h2>
              <p className="text-xs text-zinc-500 mt-0.5">
                Track computer hardware, peripheral, software, and network issues reported in laboratories.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={() => onOpenReportModal()}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-zinc-900 text-white rounded-lg text-xs font-semibold hover:bg-zinc-800 transition-colors shadow-xs shrink-0 self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Report Workstation Fault</span>
        </button>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-zinc-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-zinc-500 text-xs mb-1 font-medium">
            <span>Active Issues</span>
            <AlertTriangle className={`w-4 h-4 ${openIssuesCount > 0 ? 'text-amber-500' : 'text-zinc-400'}`} />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono tabular-nums text-zinc-900">
              {openIssuesCount}
            </span>
            <span className="text-[11px] text-zinc-400">pending repair</span>
          </div>
        </div>

        <div className="bg-white border border-zinc-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-zinc-500 text-xs mb-1 font-medium">
            <span>Critical Faults</span>
            <ShieldAlert className={`w-4 h-4 ${criticalIssuesCount > 0 ? 'text-red-500' : 'text-zinc-400'}`} />
          </div>
          <div className="flex items-baseline gap-2">
            <span className={`text-2xl font-bold font-mono tabular-nums ${criticalIssuesCount > 0 ? 'text-red-600' : 'text-zinc-900'}`}>
              {criticalIssuesCount}
            </span>
            <span className="text-[11px] text-zinc-400">stations offline</span>
          </div>
        </div>

        <div className="bg-white border border-zinc-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-zinc-500 text-xs mb-1 font-medium">
            <span>Affected Workstations</span>
            <Monitor className="w-4 h-4 text-zinc-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono tabular-nums text-zinc-900">
              {affectedStationsCount}
            </span>
            <span className="text-[11px] text-zinc-400">total seats</span>
          </div>
        </div>

        <div className="bg-white border border-zinc-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-zinc-500 text-xs mb-1 font-medium">
            <span>Resolved Repairs</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono tabular-nums text-zinc-900">
              {resolvedIssuesCount}
            </span>
            <span className="text-[11px] text-zinc-400">restored to service</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-zinc-200 rounded-xl p-4 shadow-xs space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Status Segmented Buttons */}
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
            <button
              onClick={() => setSelectedStatusFilter('open')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                selectedStatusFilter === 'open'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-zinc-600 hover:bg-zinc-100'
              }`}
            >
              Open Issues ({openIssuesCount})
            </button>
            <button
              onClick={() => setSelectedStatusFilter('resolved')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                selectedStatusFilter === 'resolved'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-zinc-600 hover:bg-zinc-100'
              }`}
            >
              Resolved History ({resolvedIssuesCount})
            </button>
            <button
              onClick={() => setSelectedStatusFilter('all')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                selectedStatusFilter === 'all'
                  ? 'bg-zinc-900 text-white shadow-xs'
                  : 'text-zinc-600 hover:bg-zinc-100'
              }`}
            >
              All Reports ({issues.length})
            </button>
          </div>

          {/* Search box */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search station, issue, or reporter..."
              className="w-full pl-8 pr-3 py-1.5 bg-zinc-50 border border-zinc-200 rounded-lg text-xs placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-900"
            />
          </div>
        </div>

        {/* Secondary dropdown filters */}
        <div className="pt-3 border-t border-zinc-100 flex flex-wrap items-center gap-2.5 text-xs">
          <span className="text-zinc-400 font-medium">Filter by:</span>

          {/* Lab filter */}
          <select
            value={selectedLabFilter}
            onChange={(e) => setSelectedLabFilter(e.target.value)}
            className="px-2.5 py-1 bg-zinc-50 border border-zinc-200 rounded-md text-zinc-700 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-zinc-900"
          >
            <option value="all">All Laboratories</option>
            {laboratories.map(lab => (
              <option key={lab.id} value={lab.id}>{lab.name}</option>
            ))}
          </select>

          {/* Category filter */}
          <select
            value={selectedCategoryFilter}
            onChange={(e) => setSelectedCategoryFilter(e.target.value)}
            className="px-2.5 py-1 bg-zinc-50 border border-zinc-200 rounded-md text-zinc-700 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-zinc-900"
          >
            <option value="all">All Fault Categories</option>
            <option value="hardware">Hardware (Monitor, CPU, Power)</option>
            <option value="peripheral">Peripherals (Keyboard, Mouse, Headset)</option>
            <option value="network">Network & Internet</option>
            <option value="software">Software & OS</option>
            <option value="other">Other Faults</option>
          </select>

          {/* Severity filter */}
          <select
            value={selectedSeverityFilter}
            onChange={(e) => setSelectedSeverityFilter(e.target.value)}
            className="px-2.5 py-1 bg-zinc-50 border border-zinc-200 rounded-md text-zinc-700 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-zinc-900"
          >
            <option value="all">All Severities</option>
            <option value="critical">Critical (Unusable)</option>
            <option value="medium">Medium (Impaired)</option>
            <option value="low">Low (Minor issue)</option>
          </select>

          {(selectedLabFilter !== 'all' || selectedCategoryFilter !== 'all' || selectedSeverityFilter !== 'all' || searchQuery) && (
            <button
              onClick={() => {
                setSelectedLabFilter('all');
                setSelectedCategoryFilter('all');
                setSelectedSeverityFilter('all');
                setSearchQuery('');
              }}
              className="text-xs text-zinc-500 hover:text-zinc-900 flex items-center gap-1 font-medium ml-auto"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset Filters</span>
            </button>
          )}
        </div>
      </div>

      {/* Issues Table / Cards */}
      <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 uppercase tracking-wider font-semibold">
                <th className="px-4 py-3 font-mono">Station & Lab</th>
                <th className="px-4 py-3">Issue Description</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Severity</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 font-mono">Reported</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 font-sans">
              {filteredIssues.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-zinc-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                      <p className="text-sm font-semibold text-zinc-900">
                        {selectedStatusFilter === 'open' 
                          ? 'No active maintenance issues!' 
                          : 'No issues match your current filters.'}
                      </p>
                      <p className="text-xs text-zinc-500">
                        {selectedStatusFilter === 'open'
                          ? 'All workstations in monitored laboratories are operating nominally.'
                          : 'Try changing your search terms or filter selection.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredIssues.map(issue => {
                  const lab = laboratories.find(l => l.id === issue.labId);
                  const isResolved = issue.status === 'resolved';

                  return (
                    <tr 
                      key={issue.id} 
                      className={`hover:bg-zinc-50/80 transition-colors ${
                        issue.severity === 'critical' && !isResolved ? 'bg-red-50/20' : ''
                      }`}
                    >
                      {/* Station and Lab */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded font-mono font-bold text-xs ${
                            isResolved
                              ? 'bg-zinc-100 text-zinc-700'
                              : issue.severity === 'critical'
                              ? 'bg-red-100 text-red-800 border border-red-200'
                              : 'bg-amber-100 text-amber-800 border border-amber-200'
                          }`}>
                            {issue.station}
                          </span>
                        </div>
                        <span className="text-[11px] text-zinc-500 block mt-0.5">
                          {lab?.name || 'Unknown Lab'}
                        </span>
                      </td>

                      {/* Description */}
                      <td className="px-4 py-3">
                        <p className="font-semibold text-zinc-900 leading-snug">
                          {issue.description}
                        </p>
                        {isResolved && issue.resolutionNotes && (
                          <div className="mt-1 text-[11px] text-emerald-800 bg-emerald-50 px-2 py-1 rounded border border-emerald-200 flex items-start gap-1">
                            <Check className="w-3 h-3 text-emerald-600 mt-0.5 shrink-0" />
                            <span><strong>Resolution:</strong> {issue.resolutionNotes}</span>
                          </div>
                        )}
                      </td>

                      {/* Category */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-[11px] font-medium text-zinc-700 capitalize bg-zinc-100 px-2 py-0.5 rounded">
                          {issue.category || 'General'}
                        </span>
                      </td>

                      {/* Severity */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        {issue.severity === 'critical' ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold uppercase text-red-700 bg-red-50 px-2 py-0.5 rounded border border-red-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse" />
                            <span>Critical</span>
                          </span>
                        ) : issue.severity === 'medium' ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-mono font-semibold uppercase text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                            <span>Medium</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-mono text-zinc-600 bg-zinc-100 px-2 py-0.5 rounded">
                            <span>Low</span>
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        {isResolved ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-semibold">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Resolved</span>
                          </span>
                        ) : issue.status === 'in_progress' ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-mono text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 font-semibold">
                            <Clock className="w-3 h-3" />
                            <span>Repairing</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-mono text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 font-semibold">
                            <AlertTriangle className="w-3 h-3" />
                            <span>Open Fault</span>
                          </span>
                        )}
                      </td>

                      {/* Reported date and author */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="font-mono text-zinc-600 block text-[11px]">
                          {issue.createdAt ? format(issue.createdAt.toDate(), 'MMM d, h:mm a') : '—'}
                        </span>
                        <span className="text-[10px] text-zinc-400 block truncate max-w-[120px]">
                          by {issue.reportedByName}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {!isResolved && isTeacherOrAdmin && (
                            <button
                              onClick={() => {
                                setResolvingIssue(issue);
                                setResolutionNotes('');
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-semibold transition-colors shadow-xs"
                              title="Mark issue as resolved"
                            >
                              <Check className="w-3 h-3" />
                              <span>Resolve</span>
                            </button>
                          )}

                          {!isResolved && issue.status === 'open' && isTeacherOrAdmin && (
                            <button
                              onClick={() => onUpdateIssueStatus(issue.id, 'in_progress')}
                              className="px-2 py-1 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded text-xs font-medium transition-colors"
                              title="Set status to in progress"
                            >
                              In Progress
                            </button>
                          )}

                          {isTeacherOrAdmin && (
                            <button
                              onClick={() => onDeleteIssue(issue.id)}
                              className="p-1.5 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                              title="Delete record"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* -------------------------------------------------------------
       * Modal: Resolve Issue with Notes
       * ----------------------------------------------------------- */}
      {resolvingIssue && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl w-full max-w-md shadow-xl border border-zinc-200 overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-5 border-b border-zinc-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-zinc-900">
                  Mark Fault as Resolved
                </h3>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Confirm workstation {resolvingIssue.station} is repaired and ready for use.
                </p>
              </div>
              <button 
                onClick={() => setResolvingIssue(null)}
                className="p-1 text-zinc-400 hover:text-zinc-700 rounded-md"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleConfirmResolve} className="p-5 space-y-4 text-xs">
              <div className="p-3 bg-zinc-50 rounded-lg border border-zinc-200">
                <span className="text-[10px] font-mono uppercase text-zinc-400 block mb-0.5">Reported Issue</span>
                <p className="font-semibold text-zinc-900">{resolvingIssue.description}</p>
                <div className="mt-1 text-[11px] text-zinc-500 flex items-center gap-2">
                  <span>Station: {resolvingIssue.station}</span>
                  <span>·</span>
                  <span className="capitalize">Category: {resolvingIssue.category || 'General'}</span>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-zinc-700 uppercase tracking-wider text-[10px] mb-1.5">
                  Maintenance & Repair Notes (Optional)
                </label>
                <textarea
                  rows={3}
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  placeholder="e.g. Replaced optical mouse with spare Logitech unit. Tested left and right click."
                  className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-xs text-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900 resize-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-3 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setResolvingIssue(null)}
                  className="flex-1 py-2 bg-zinc-100 text-zinc-700 rounded-lg font-semibold hover:bg-zinc-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingResolve}
                  className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold transition-colors shadow-xs flex items-center justify-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{isSubmittingResolve ? 'Resolving...' : 'Confirm Restored'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
