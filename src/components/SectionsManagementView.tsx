import React, { useState, useMemo } from 'react';
import { Section, Schedule, UserProfile } from '../types';
import {
  Layers,
  Plus,
  Pencil,
  Trash2,
  Search,
  Sparkles,
  Users,
  Building2,
  Calendar,
} from 'lucide-react';

interface SectionsManagementViewProps {
  sections: Section[];
  schedules: Schedule[];
  profile: UserProfile | null;
  onAddSection: () => void;
  onEditSection: (section: Section) => void;
  onDeleteSection: (id: string) => void;
  onSeedSampleSections?: () => void;
  onOpenTimetable?: () => void;
}

export const SectionsManagementView: React.FC<SectionsManagementViewProps> = ({
  sections,
  schedules,
  profile,
  onAddSection,
  onEditSection,
  onDeleteSection,
  onSeedSampleSections,
  onOpenTimetable,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLevel, setSelectedLevel] = useState<string>('all');

  const isAuthorized = profile?.role === 'admin' || profile?.role === 'teacher';

  const yearLevels = useMemo(() => {
    const levels = Array.from(
      new Set(sections.map((s) => s.yearLevel).filter((v): v is string => Boolean(v)))
    );
    return levels;
  }, [sections]);

  const totalStudents = useMemo(() => {
    return sections.reduce((sum, s) => sum + (s.studentCount || 0), 0);
  }, [sections]);

  const filteredSections = useMemo(() => {
    return sections.filter((sec) => {
      if (selectedLevel !== 'all' && sec.yearLevel !== selectedLevel) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const nameMatch = sec.name.toLowerCase().includes(q);
        const levelMatch = sec.yearLevel && sec.yearLevel.toLowerCase().includes(q);
        const deptMatch = sec.department && sec.department.toLowerCase().includes(q);
        const adviserMatch = sec.adviser && sec.adviser.toLowerCase().includes(q);
        const roomMatch = sec.room && sec.room.toLowerCase().includes(q);
        if (!nameMatch && !levelMatch && !deptMatch && !adviserMatch && !roomMatch) return false;
      }
      return true;
    });
  }, [sections, selectedLevel, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-zinc-900 text-white flex items-center justify-center shadow-xs">
            <Layers className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h2 className="text-base font-bold text-zinc-900 tracking-tight">
              Academic Sections & Cohorts
            </h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              Organize student cohorts, faculty advisers, headcounts, and designated laboratory rooms.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {onOpenTimetable && (
            <button
              type="button"
              onClick={onOpenTimetable}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white border border-zinc-200 text-zinc-800 rounded-xl text-xs font-semibold hover:bg-zinc-50 transition-colors shadow-2xs cursor-pointer"
            >
              <Calendar className="w-3.5 h-3.5 text-amber-600" />
              <span>View Timetable</span>
            </button>
          )}
          {isAuthorized && sections.length === 0 && onSeedSampleSections && (
            <button
              onClick={onSeedSampleSections}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span>Seed Standard Sections</span>
            </button>
          )}
          {isAuthorized && (
            <button
              onClick={onAddSection}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-zinc-900 text-white rounded-xl text-xs font-semibold hover:bg-zinc-800 transition-colors shadow-xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Section</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white border border-zinc-200 rounded-xl p-3.5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          <button
            onClick={() => setSelectedLevel('all')}
            className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
              selectedLevel === 'all'
                ? 'bg-zinc-900 text-white'
                : 'text-zinc-600 hover:bg-zinc-100'
            }`}
          >
            All Sections ({sections.length})
          </button>
          {yearLevels.map((lvl) => (
            <button
              key={lvl}
              onClick={() => setSelectedLevel(lvl)}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                selectedLevel === lvl
                  ? 'bg-zinc-900 text-white'
                  : 'text-zinc-600 hover:bg-zinc-100'
              }`}
            >
              {lvl}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <span className="hidden lg:inline-flex items-center gap-1.5 text-[11px] font-mono text-zinc-500">
            <Users className="w-3.5 h-3.5 text-zinc-400" />
            {totalStudents} Total Students
          </span>
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search section name, level, or adviser..."
              className="w-full pl-8 pr-3 py-1.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-900"
            />
          </div>
        </div>
      </div>

      {/* Sections Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredSections.length === 0 ? (
          <div className="col-span-full bg-white border border-zinc-200 rounded-2xl p-12 text-center">
            <Layers className="w-10 h-10 text-zinc-300 mx-auto mb-3" />
            <p className="text-sm font-semibold text-zinc-900">No academic sections found</p>
            <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
              {searchQuery || selectedLevel !== 'all'
                ? 'No sections matched your search query or level filter.'
                : 'Add student sections and cohorts to organize laboratory class timetables.'}
            </p>
            {isAuthorized && !searchQuery && selectedLevel === 'all' && (
              <div className="mt-4 flex items-center justify-center gap-3">
                {onSeedSampleSections && (
                  <button
                    onClick={onSeedSampleSections}
                    className="px-4 py-2 bg-amber-500 text-white rounded-xl text-xs font-semibold hover:bg-amber-600 transition-colors shadow-xs cursor-pointer flex items-center gap-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Load Standard ICT Sections</span>
                  </button>
                )}
                <button
                  onClick={onAddSection}
                  className="px-4 py-2 bg-zinc-900 text-white rounded-xl text-xs font-semibold hover:bg-zinc-800 transition-colors shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Section</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          filteredSections.map((section) => {
            const assignedSchedules = schedules.filter(
              (s) => s.yearSection && s.yearSection.toLowerCase() === section.name.toLowerCase()
            );

            return (
              <div
                key={section.id}
                className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between hover:border-zinc-300 hover:shadow-md transition-all group"
              >
                <div>
                  {/* Section Card Top */}
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2 py-0.5 rounded-md bg-zinc-900 text-white text-[10px] font-bold font-mono">
                          {section.yearLevel || 'Cohort'}
                        </span>
                        {section.department && (
                          <span
                            className="text-[10px] text-zinc-500 font-medium truncate max-w-[170px]"
                            title={section.department}
                          >
                            {section.department}
                          </span>
                        )}
                      </div>
                      <h3 className="font-bold text-base text-zinc-900 mt-1">
                        {section.name}
                      </h3>
                    </div>

                    {/* Actions */}
                    {isAuthorized && (
                      <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => onEditSection(section)}
                          className="p-1.5 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg cursor-pointer"
                          title="Edit Section"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onDeleteSection(section.id)}
                          className="p-1.5 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-lg cursor-pointer"
                          title="Delete Section"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Headcount & Personnel Stats */}
                  <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2.5 bg-zinc-50 rounded-xl border border-zinc-100">
                      <span className="text-[10px] text-zinc-400 uppercase font-semibold block">
                        Headcount
                      </span>
                      <span className="font-bold text-zinc-900 text-sm font-mono mt-0.5 block">
                        {section.studentCount ? `${section.studentCount} Students` : 'Unspecified'}
                      </span>
                    </div>

                    <div className="p-2.5 bg-zinc-50 rounded-xl border border-zinc-100">
                      <span className="text-[10px] text-zinc-400 uppercase font-semibold block">
                        Lab Classes
                      </span>
                      <span className="font-bold text-zinc-900 text-sm font-mono mt-0.5 block">
                        {assignedSchedules.length} Sessions
                      </span>
                    </div>
                  </div>

                  {/* Key Attributes: Adviser & Home Room */}
                  <div className="mt-3 space-y-1.5 text-xs text-zinc-600">
                    {section.adviser && (
                      <div className="flex items-center gap-2">
                        <Users className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                        <span className="truncate">
                          Adviser: <strong className="text-zinc-800">{section.adviser}</strong>
                        </span>
                      </div>
                    )}

                    {section.room && (
                      <div className="flex items-center gap-2">
                        <Building2 className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                        <span className="truncate">
                          Designated Lab: <strong className="text-zinc-800">{section.room}</strong>
                        </span>
                      </div>
                    )}

                    {section.notes && (
                      <p className="text-[11px] text-zinc-500 italic mt-2 line-clamp-2 bg-zinc-50 p-2 rounded-lg border border-zinc-100">
                        "{section.notes}"
                      </p>
                    )}
                  </div>
                </div>

                {/* Bottom Scheduled Classes Preview */}
                <div className="mt-4 pt-3 border-t border-zinc-100 flex items-center justify-between text-xs">
                  <span className="text-[11px] text-zinc-400">Active in Timetable</span>
                  <span className="text-[11px] font-semibold text-zinc-700">
                    {assignedSchedules.length > 0
                      ? `${assignedSchedules.length} schedule slot(s)`
                      : 'Ready for scheduling'}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
