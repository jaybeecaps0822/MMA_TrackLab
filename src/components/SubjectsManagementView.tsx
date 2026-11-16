import React, { useState, useMemo } from 'react';
import { Subject, Schedule, UserProfile } from '../types';
import {
  BookOpen,
  Plus,
  Pencil,
  Trash2,
  Search,
  Sparkles,
  Calendar,
} from 'lucide-react';

interface SubjectsManagementViewProps {
  subjects: Subject[];
  schedules: Schedule[];
  profile: UserProfile | null;
  onAddSubject: () => void;
  onEditSubject: (subject: Subject) => void;
  onDeleteSubject: (id: string) => void;
  onSeedSampleSubjects?: () => void;
  onOpenTimetable?: () => void;
}

const SUBJECT_CATEGORIES = [
  'all',
  'Major Specialization',
  'Laboratory Practical',
  'Core ICT',
  'General Education',
  'Elective',
];

export const SubjectsManagementView: React.FC<SubjectsManagementViewProps> = ({
  subjects,
  schedules,
  profile,
  onAddSubject,
  onEditSubject,
  onDeleteSubject,
  onSeedSampleSubjects,
  onOpenTimetable,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubjectCategory, setSelectedSubjectCategory] = useState<string>('all');

  const isAuthorized = profile?.role === 'admin' || profile?.role === 'teacher';

  const filteredSubjects = useMemo(() => {
    return subjects.filter((subj) => {
      if (selectedSubjectCategory !== 'all' && subj.category !== selectedSubjectCategory) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const nameMatch = subj.name.toLowerCase().includes(q);
        const codeMatch = subj.code && subj.code.toLowerCase().includes(q);
        const catMatch = subj.category && subj.category.toLowerCase().includes(q);
        const descMatch = subj.description && subj.description.toLowerCase().includes(q);
        if (!nameMatch && !codeMatch && !catMatch && !descMatch) return false;
      }
      return true;
    });
  }, [subjects, selectedSubjectCategory, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-zinc-900 text-white flex items-center justify-center shadow-xs">
            <BookOpen className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h2 className="text-base font-bold text-zinc-900 tracking-tight">
              Curriculum Subjects Catalog
            </h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              Manage course codes, academic units, weekly contact hours, and laboratory syllabi.
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
          {isAuthorized && subjects.length === 0 && onSeedSampleSubjects && (
            <button
              onClick={onSeedSampleSubjects}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span>Seed Standard Subjects</span>
            </button>
          )}
          {isAuthorized && (
            <button
              onClick={onAddSubject}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-zinc-900 text-white rounded-xl text-xs font-semibold hover:bg-zinc-800 transition-colors shadow-xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Subject</span>
            </button>
          )}
        </div>
      </div>

      {/* Category Filter Chips & Search */}
      <div className="bg-white border border-zinc-200 rounded-xl p-3.5 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar text-xs py-0.5">
          {SUBJECT_CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedSubjectCategory(cat)}
              className={`px-3 py-1 rounded-lg font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                selectedSubjectCategory === cat
                  ? 'bg-zinc-900 text-white'
                  : 'text-zinc-600 hover:bg-zinc-100'
              }`}
            >
              {cat === 'all' ? `All Classifications (${subjects.length})` : cat}
            </button>
          ))}
        </div>

        <div className="relative w-full lg:w-64 shrink-0">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search subject code or title..."
            className="w-full pl-8 pr-3 py-1.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-900"
          />
        </div>
      </div>

      {/* Subjects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredSubjects.length === 0 ? (
          <div className="col-span-full bg-white border border-zinc-200 rounded-2xl p-12 text-center">
            <BookOpen className="w-10 h-10 text-zinc-300 mx-auto mb-3" />
            <p className="text-sm font-semibold text-zinc-900">No curriculum subjects found</p>
            <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
              {searchQuery || selectedSubjectCategory !== 'all'
                ? 'No subjects matched your search or classification filter.'
                : 'Add subjects to populate autocomplete and auto-link laboratory curriculum.'}
            </p>
            {isAuthorized && !searchQuery && selectedSubjectCategory === 'all' && (
              <div className="mt-4 flex items-center justify-center gap-3">
                {onSeedSampleSubjects && (
                  <button
                    onClick={onSeedSampleSubjects}
                    className="px-4 py-2 bg-amber-500 text-white rounded-xl text-xs font-semibold hover:bg-amber-600 transition-colors shadow-xs cursor-pointer flex items-center gap-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Load Standard Subjects</span>
                  </button>
                )}
                <button
                  onClick={onAddSubject}
                  className="px-4 py-2 bg-zinc-900 text-white rounded-xl text-xs font-semibold hover:bg-zinc-800 transition-colors shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Subject</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          filteredSubjects.map((subject) => {
            const assignedSchedules = schedules.filter(
              (s) =>
                s.subject &&
                (s.subject.toLowerCase().includes(subject.name.toLowerCase()) ||
                  (subject.code && s.subject.toLowerCase().includes(subject.code.toLowerCase())))
            );

            return (
              <div
                key={subject.id}
                className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between hover:border-zinc-300 hover:shadow-md transition-all group"
              >
                <div>
                  {/* Code Pill & Classification Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {subject.code ? (
                          <span className="px-2 py-0.5 bg-zinc-900 text-white text-[10px] font-mono font-bold rounded-md">
                            {subject.code}
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-zinc-100 text-zinc-600 text-[10px] font-mono font-bold rounded-md">
                            GENERAL
                          </span>
                        )}

                        {subject.category && (
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-amber-50 text-amber-900 border border-amber-200/60">
                            {subject.category}
                          </span>
                        )}
                      </div>

                      <h3 className="font-bold text-base text-zinc-900 leading-snug pt-1">
                        {subject.name}
                      </h3>
                    </div>

                    {/* Actions */}
                    {isAuthorized && (
                      <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => onEditSubject(subject)}
                          className="p-1.5 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg cursor-pointer"
                          title="Edit Subject"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onDeleteSubject(subject.id)}
                          className="p-1.5 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-lg cursor-pointer"
                          title="Delete Subject"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Units & Lab Hours Grid */}
                  <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2.5 bg-zinc-50 rounded-xl border border-zinc-100">
                      <span className="text-[10px] text-zinc-400 uppercase font-semibold block">
                        Academic Units
                      </span>
                      <span className="font-bold text-zinc-900 text-sm font-mono mt-0.5 block">
                        {subject.units !== undefined ? `${subject.units}.0 Units` : '3.0 Units'}
                      </span>
                    </div>

                    <div className="p-2.5 bg-zinc-50 rounded-xl border border-zinc-100">
                      <span className="text-[10px] text-zinc-400 uppercase font-semibold block">
                        Contact Hours
                      </span>
                      <span className="font-bold text-zinc-900 text-sm font-mono mt-0.5 block">
                        {subject.hoursPerWeek ? `${subject.hoursPerWeek} hrs/wk` : '3 hrs/wk'}
                      </span>
                    </div>
                  </div>

                  {/* Description / Competencies */}
                  {subject.description ? (
                    <p className="mt-3 text-xs text-zinc-600 leading-relaxed line-clamp-3 bg-zinc-50/70 p-2.5 rounded-xl border border-zinc-100">
                      {subject.description}
                    </p>
                  ) : (
                    <p className="mt-3 text-[11px] text-zinc-400 italic">
                      Standard syllabus with laboratory practicals and hands-on workstation exercises.
                    </p>
                  )}
                </div>

                {/* Footer Timetable link */}
                <div className="mt-4 pt-3 border-t border-zinc-100 flex items-center justify-between text-xs">
                  <span className="text-[11px] text-zinc-400 font-mono">
                    {assignedSchedules.length} Class Section(s)
                  </span>
                  <span className="text-[11px] font-semibold text-zinc-700">
                    {assignedSchedules.length > 0 ? 'Active in timetable' : 'Available to schedule'}
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
