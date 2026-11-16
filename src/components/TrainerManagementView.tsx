import React, { useState, useMemo, useRef } from 'react';
import { Trainer, Section, Subject, Schedule, Laboratory, UserProfile } from '../types';
import { compressImageFile } from '../utils/image';
import { 
  Users, 
  Plus, 
  Pencil, 
  Trash2, 
  Search, 
  Clock, 
  Monitor, 
  Camera, 
  Upload, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  ShieldCheck, 
  IdCard, 
  Layers,
  BookOpen,
  GraduationCap,
  Sparkles,
  Building2,
  Mail,
  Phone,
  Calendar,
  FileText,
  BadgeCheck,
  Printer
} from 'lucide-react';
import { format } from 'date-fns';
import { SchoolComputerLogo } from './SchoolComputerLogo';

export type AcademicSubTab = 'trainers' | 'sections' | 'subjects';

interface TrainerManagementViewProps {
  trainers: Trainer[];
  sections?: Section[];
  subjects?: Subject[];
  schedules: Schedule[];
  laboratories: Laboratory[];
  profile: UserProfile | null;
  onAddTrainer: () => void;
  onEditTrainer: (trainer: Trainer) => void;
  onDeleteTrainer: (id: string) => void;
  onQuickUpdatePhoto?: (id: string, photoUrl: string) => Promise<void>;
  onFilterScheduleByTrainer: (trainerId: string) => void;
  onOpenPrintModal?: (mode?: 'room' | 'faculty', targetId?: string) => void;
  // Section CRUD
  onAddSection?: () => void;
  onEditSection?: (section: Section) => void;
  onDeleteSection?: (id: string) => void;
  onSeedSampleSections?: () => void;
  // Subject CRUD
  onAddSubject?: () => void;
  onEditSubject?: (subject: Subject) => void;
  onDeleteSubject?: (id: string) => void;
  onSeedSampleSubjects?: () => void;
}

type PhotoFilter = 'all' | 'verified' | 'missing' | 'teaching';

export const TrainerManagementView: React.FC<TrainerManagementViewProps> = ({
  trainers,
  sections = [],
  subjects = [],
  schedules,
  laboratories,
  profile,
  onAddTrainer,
  onEditTrainer,
  onDeleteTrainer,
  onQuickUpdatePhoto,
  onFilterScheduleByTrainer,
  onOpenPrintModal,
  onAddSection,
  onEditSection,
  onDeleteSection,
  onSeedSampleSections,
  onAddSubject,
  onEditSubject,
  onDeleteSubject,
  onSeedSampleSubjects,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<AcademicSubTab>('trainers');
  const [searchQuery, setSearchQuery] = useState('');
  const [photoFilter, setPhotoFilter] = useState<PhotoFilter>('all');
  const [selectedSubjectCategory, setSelectedSubjectCategory] = useState<string>('all');
  const [selectedBadgeTrainer, setSelectedBadgeTrainer] = useState<Trainer | null>(null);
  const [uploadingTrainerId, setUploadingTrainerId] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeTrainerForUpload, setActiveTrainerForUpload] = useState<string | null>(null);

  const isAuthorized = profile?.role === 'admin' || profile?.role === 'teacher';

  const now = new Date();
  const currentDay = format(now, 'EEEE');
  const currentTime = format(now, 'HH:mm');

  // Fast counts
  const verifiedPhotoCount = useMemo(() => {
    return trainers.filter(t => Boolean(t.photoUrl)).length;
  }, [trainers]);

  const currentlyTeachingTrainers = useMemo(() => {
    return trainers.filter(trainer => {
      const trainerSchedules = schedules.filter(s => s.trainerId === trainer.id);
      return trainerSchedules.some(s => 
        s.day === currentDay &&
        currentTime >= s.startTime &&
        currentTime <= s.endTime
      );
    });
  }, [trainers, schedules, currentDay, currentTime]);

  // Filtered Faculty
  const filteredTrainers = useMemo(() => {
    return trainers.filter(trainer => {
      if (photoFilter === 'verified' && !trainer.photoUrl) return false;
      if (photoFilter === 'missing' && trainer.photoUrl) return false;
      if (photoFilter === 'teaching') {
        const isTeaching = currentlyTeachingTrainers.some(t => t.id === trainer.id);
        if (!isTeaching) return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const nameMatch = trainer.name.toLowerCase().includes(q);
        const specMatch = trainer.specialization && trainer.specialization.toLowerCase().includes(q);
        const deptMatch = trainer.department && trainer.department.toLowerCase().includes(q);
        const empMatch = trainer.employeeId && trainer.employeeId.toLowerCase().includes(q);
        if (!nameMatch && !specMatch && !deptMatch && !empMatch) return false;
      }

      return true;
    });
  }, [trainers, photoFilter, searchQuery, currentlyTeachingTrainers]);

  // Filtered Sections
  const filteredSections = useMemo(() => {
    return sections.filter(sec => {
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
  }, [sections, searchQuery]);

  // Filtered Subjects
  const filteredSubjects = useMemo(() => {
    return subjects.filter(subj => {
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

  const handleTriggerUpload = (trainerId: string) => {
    setActiveTrainerForUpload(trainerId);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const handleCardFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const trainerId = activeTrainerForUpload;
    if (!file || !trainerId || !onQuickUpdatePhoto) return;

    if (!file.type.startsWith('image/')) {
      setNotification('Please select a valid image file (JPG, PNG, WebP).');
      setTimeout(() => setNotification(null), 3000);
      return;
    }

    setUploadingTrainerId(trainerId);
    try {
      const compressedDataUrl = await compressImageFile(file, 360, 0.85);
      await onQuickUpdatePhoto(trainerId, compressedDataUrl);
      
      if (selectedBadgeTrainer?.id === trainerId) {
        setSelectedBadgeTrainer(prev => prev ? { ...prev, photoUrl: compressedDataUrl } : null);
      }

      setNotification('Faculty identification photo updated successfully!');
      setTimeout(() => setNotification(null), 3000);
    } catch (err) {
      console.error('Failed to upload faculty photo:', err);
      setNotification('Failed to process image. Please try another image.');
      setTimeout(() => setNotification(null), 3000);
    } finally {
      setUploadingTrainerId(null);
      setActiveTrainerForUpload(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Hidden global file input for direct card uploads */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        onChange={handleCardFileSelect}
        className="hidden"
      />

      {/* Floating Notification */}
      {notification && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-2 bg-emerald-900 text-white text-xs px-4 py-2.5 rounded-lg shadow-lg border border-emerald-700 animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* Top Header Card */}
      <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-zinc-900 text-white flex items-center justify-center shadow-xs">
              <GraduationCap className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-zinc-900 tracking-tight">
                Academic Management Directory
              </h2>
              <p className="text-xs text-zinc-500 mt-0.5">
                Centralized registry for faculty members, academic class sections, and curriculum subjects.
              </p>
            </div>
          </div>
        </div>

        {/* Global Action Buttons based on Active Sub-Tab */}
        <div className="flex flex-wrap items-center gap-2.5">
          {activeSubTab === 'trainers' && (
            <div className="flex items-center gap-2">
              {onOpenPrintModal && (
                <button
                  type="button"
                  onClick={() => onOpenPrintModal('faculty')}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white border border-zinc-200 text-zinc-800 rounded-xl text-xs font-semibold hover:bg-zinc-50 transition-colors shadow-2xs cursor-pointer"
                  title="Print Weekly Schedules for Faculty"
                >
                  <Printer className="w-3.5 h-3.5 text-amber-600" />
                  <span>Print Faculty Schedules</span>
                </button>
              )}
              {isAuthorized && (
                <button
                  onClick={onAddTrainer}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-zinc-900 text-white rounded-xl text-xs font-semibold hover:bg-zinc-800 transition-colors shadow-xs cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Faculty Member</span>
                </button>
              )}
            </div>
          )}

          {activeSubTab === 'sections' && isAuthorized && (
            <div className="flex items-center gap-2">
              {sections.length === 0 && onSeedSampleSections && (
                <button
                  onClick={onSeedSampleSections}
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                  <span>Seed Standard Sections</span>
                </button>
              )}
              {onAddSection && (
                <button
                  onClick={onAddSection}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-zinc-900 text-white rounded-xl text-xs font-semibold hover:bg-zinc-800 transition-colors shadow-xs cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Section</span>
                </button>
              )}
            </div>
          )}

          {activeSubTab === 'subjects' && isAuthorized && (
            <div className="flex items-center gap-2">
              {subjects.length === 0 && onSeedSampleSubjects && (
                <button
                  onClick={onSeedSampleSubjects}
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                  <span>Seed Standard Subjects</span>
                </button>
              )}
              {onAddSubject && (
                <button
                  onClick={onAddSubject}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-zinc-900 text-white rounded-xl text-xs font-semibold hover:bg-zinc-800 transition-colors shadow-xs cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Subject</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Sub-Tab Navigation Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-2 border border-zinc-200 rounded-2xl shadow-xs">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          <button
            onClick={() => {
              setActiveSubTab('trainers');
              setSearchQuery('');
            }}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeSubTab === 'trainers'
                ? 'bg-zinc-900 text-white shadow-xs'
                : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Faculty & Instructors</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
              activeSubTab === 'trainers' ? 'bg-zinc-800 text-zinc-200' : 'bg-zinc-100 text-zinc-600'
            }`}>
              {trainers.length}
            </span>
          </button>

          <button
            onClick={() => {
              setActiveSubTab('sections');
              setSearchQuery('');
            }}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeSubTab === 'sections'
                ? 'bg-zinc-900 text-white shadow-xs'
                : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Academic Sections</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
              activeSubTab === 'sections' ? 'bg-zinc-800 text-zinc-200' : 'bg-zinc-100 text-zinc-600'
            }`}>
              {sections.length}
            </span>
          </button>

          <button
            onClick={() => {
              setActiveSubTab('subjects');
              setSearchQuery('');
            }}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeSubTab === 'subjects'
                ? 'bg-zinc-900 text-white shadow-xs'
                : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Curriculum Subjects</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
              activeSubTab === 'subjects' ? 'bg-zinc-800 text-zinc-200' : 'bg-zinc-100 text-zinc-600'
            }`}>
              {subjects.length}
            </span>
          </button>
        </div>

        {/* Search Input for Current Tab */}
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              activeSubTab === 'trainers'
                ? 'Search faculty name, ID, or spec...'
                : activeSubTab === 'sections'
                ? 'Search section name, level, or adviser...'
                : 'Search subject code or title...'
            }
            className="w-full pl-8 pr-3 py-1.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-900"
          />
        </div>
      </div>

      {/* =============================================================
       * SUB-TAB 1: FACULTY MEMBERS
       * =========================================================== */}
      {activeSubTab === 'trainers' && (
        <div className="space-y-4">
          {/* Metrics & Filter Bar */}
          <div className="bg-white border border-zinc-200 rounded-xl p-3.5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
              <button
                onClick={() => setPhotoFilter('all')}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                  photoFilter === 'all'
                    ? 'bg-zinc-900 text-white'
                    : 'text-zinc-600 hover:bg-zinc-100'
                }`}
              >
                All Faculty ({trainers.length})
              </button>
              <button
                onClick={() => setPhotoFilter('verified')}
                className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                  photoFilter === 'verified'
                    ? 'bg-emerald-600 text-white'
                    : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Verified ID ({verifiedPhotoCount})</span>
              </button>
              <button
                onClick={() => setPhotoFilter('missing')}
                className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                  photoFilter === 'missing'
                    ? 'bg-amber-600 text-white'
                    : 'text-amber-700 bg-amber-50 hover:bg-amber-100'
                }`}
              >
                <AlertCircle className="w-3.5 h-3.5" />
                <span>Missing Photo ({trainers.length - verifiedPhotoCount})</span>
              </button>
              <button
                onClick={() => setPhotoFilter('teaching')}
                className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                  photoFilter === 'teaching'
                    ? 'bg-zinc-900 text-white'
                    : 'text-zinc-600 hover:bg-zinc-100'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                <span>Teaching Now ({currentlyTeachingTrainers.length})</span>
              </button>
            </div>

            <div className="flex items-center gap-2 text-xs text-zinc-500 shrink-0">
              <IdCard className="w-4 h-4 text-zinc-400" />
              <span className="text-[11px] font-mono">
                {Math.round((verifiedPhotoCount / (trainers.length || 1)) * 100)}% Photo Compliance
              </span>
            </div>
          </div>

          {/* Trainers Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredTrainers.length === 0 ? (
              <div className="col-span-full bg-white border border-zinc-200 rounded-2xl p-12 text-center">
                <Users className="w-10 h-10 text-zinc-300 mx-auto mb-3" />
                <p className="text-sm font-semibold text-zinc-900">No faculty members found</p>
                <p className="text-xs text-zinc-500 mt-1">
                  {searchQuery || photoFilter !== 'all'
                    ? 'Try adjusting your search query or filter options.'
                    : 'Click "Add Faculty Member" above to register an instructor.'}
                </p>
              </div>
            ) : (
              filteredTrainers.map(trainer => {
                const trainerSchedules = schedules.filter(s => s.trainerId === trainer.id);
                const subjectsList = Array.from(new Set(trainerSchedules.map(s => s.subject)));
                
                const currentSession = trainerSchedules.find(s => 
                  s.day === currentDay &&
                  currentTime >= s.startTime &&
                  currentTime <= s.endTime
                );
                const activeLab = currentSession 
                  ? laboratories.find(l => l.id === currentSession.labId) 
                  : null;

                const isUploadingThis = uploadingTrainerId === trainer.id;

                return (
                  <div
                    key={trainer.id}
                    className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between hover:border-zinc-300 hover:shadow-md transition-all group"
                  >
                    <div>
                      {/* Identification Header */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3.5">
                          {/* Photo Identification Avatar */}
                          <div className="relative group/avatar shrink-0">
                            {trainer.photoUrl ? (
                              <div 
                                onClick={() => setSelectedBadgeTrainer(trainer)}
                                className="cursor-pointer relative"
                                title="Click to view Faculty ID Badge"
                              >
                                <img
                                  src={trainer.photoUrl}
                                  alt={trainer.name}
                                  className="w-14 h-14 rounded-2xl object-cover border-2 border-zinc-100 shadow-xs ring-1 ring-zinc-200 group-hover/avatar:ring-zinc-900 transition-all"
                                />
                                <span 
                                  className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 text-white rounded-full flex items-center justify-center border border-white shadow-xs"
                                  title="Verified Photo ID"
                                >
                                  <CheckCircle2 className="w-3 h-3" />
                                </span>
                              </div>
                            ) : (
                              <div
                                onClick={() => isAuthorized && handleTriggerUpload(trainer.id)}
                                className={`w-14 h-14 rounded-2xl bg-zinc-100 border-2 border-dashed border-zinc-300 flex flex-col items-center justify-center text-zinc-400 transition-all ${
                                  isAuthorized ? 'cursor-pointer hover:bg-zinc-200 hover:border-zinc-400' : ''
                                }`}
                                title={isAuthorized ? 'Click to upload photo ID' : 'No photo uploaded'}
                              >
                                <Camera className="w-5 h-5 text-zinc-400" />
                                <span className="text-[8px] font-semibold uppercase tracking-wider text-zinc-500 mt-0.5">
                                  Add Photo
                                </span>
                              </div>
                            )}

                            {isAuthorized && (
                              <button
                                type="button"
                                onClick={() => handleTriggerUpload(trainer.id)}
                                className="absolute -top-1 -right-1 p-1 bg-zinc-900 text-white rounded-full opacity-0 group-hover/avatar:opacity-100 transition-opacity shadow-xs hover:bg-zinc-800 cursor-pointer"
                                title={trainer.photoUrl ? 'Change Photo Identification' : 'Upload Photo Identification'}
                              >
                                <Camera className="w-2.5 h-2.5" />
                              </button>
                            )}

                            {isUploadingThis && (
                              <div className="absolute inset-0 bg-black/50 rounded-2xl flex items-center justify-center">
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              </div>
                            )}
                          </div>

                          {/* Faculty Info */}
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <h3 
                                onClick={() => setSelectedBadgeTrainer(trainer)}
                                className="font-bold text-sm text-zinc-900 leading-tight truncate hover:text-zinc-700 cursor-pointer"
                                title={trainer.name}
                              >
                                {trainer.name}
                              </h3>
                              {trainer.employeeId && (
                                <span className="text-[9px] font-mono text-zinc-500 bg-zinc-100 px-1.5 py-0.2 rounded font-semibold">
                                  {trainer.employeeId}
                                </span>
                              )}
                            </div>

                            {trainer.specialization ? (
                              <span className="text-[11px] text-zinc-500 block truncate mt-0.5">
                                {trainer.specialization}
                              </span>
                            ) : (
                              <span className="text-[11px] text-zinc-400 block italic mt-0.5">
                                General ICT Faculty
                              </span>
                            )}

                            {trainer.department && (
                              <span className="text-[10px] text-zinc-400 block truncate">
                                {trainer.department}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Admin Actions */}
                        {isAuthorized && (
                          <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => onEditTrainer(trainer)}
                              className="p-1.5 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg cursor-pointer"
                              title="Edit Faculty Member"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => onDeleteTrainer(trainer.id)}
                              className="p-1.5 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-lg cursor-pointer"
                              title="Delete Faculty Member"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Live Teaching Status */}
                      <div className="mt-4 pt-3 border-t border-zinc-100">
                        {currentSession ? (
                          <div className="bg-amber-50 border border-amber-200/60 rounded-xl p-2.5 text-xs">
                            <div className="flex items-center gap-1.5 text-[10px] font-mono text-amber-700 font-semibold mb-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                              <span>CURRENTLY TEACHING</span>
                            </div>
                            <p className="font-bold text-zinc-900 truncate">
                              {currentSession.subject}
                            </p>
                            <p className="text-[11px] text-zinc-600 mt-0.5 flex items-center gap-1">
                              <Monitor className="w-3 h-3 text-zinc-400" />
                              <span>{activeLab?.name || 'Lab'} · {currentSession.startTime}–{currentSession.endTime}</span>
                            </p>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between text-xs text-zinc-500 bg-zinc-50 p-2.5 rounded-xl border border-zinc-100">
                            <span>Teaching Status</span>
                            <span className="font-medium text-emerald-700 flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              Available
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Course portfolio */}
                      <div className="mt-3 text-xs">
                        <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider block mb-1">
                          Assigned Classes ({subjectsList.length})
                        </span>
                        {subjectsList.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {subjectsList.map(subj => (
                              <span 
                                key={subj} 
                                className="bg-zinc-100 text-zinc-700 text-[10px] px-2 py-0.5 rounded-md font-medium"
                              >
                                {subj}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-[11px] text-zinc-400 italic">No assigned classes yet</span>
                        )}
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="mt-5 pt-3 border-t border-zinc-100 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setSelectedBadgeTrainer(trainer)}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-zinc-600 hover:text-zinc-900 transition-colors cursor-pointer"
                        >
                          <IdCard className="w-3.5 h-3.5 text-zinc-400" />
                          <span>ID Badge</span>
                        </button>
                        {onOpenPrintModal && (
                          <button
                            onClick={() => onOpenPrintModal('faculty', trainer.id)}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-zinc-600 hover:text-zinc-900 transition-colors cursor-pointer"
                            title="Print Faculty Weekly Timetable"
                          >
                            <Printer className="w-3 h-3 text-amber-600" />
                            <span>Print</span>
                          </button>
                        )}
                      </div>

                      <button
                        onClick={() => onFilterScheduleByTrainer(trainer.id)}
                        className="text-zinc-700 hover:text-zinc-900 font-semibold text-xs transition-colors cursor-pointer"
                      >
                        Timetable ({trainerSchedules.length}) →
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* =============================================================
       * SUB-TAB 2: ACADEMIC SECTIONS & COHORTS
       * =========================================================== */}
      {activeSubTab === 'sections' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredSections.length === 0 ? (
              <div className="col-span-full bg-white border border-zinc-200 rounded-2xl p-12 text-center">
                <Layers className="w-10 h-10 text-zinc-300 mx-auto mb-3" />
                <p className="text-sm font-semibold text-zinc-900">No academic sections found</p>
                <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
                  {searchQuery
                    ? 'No sections matched your search query.'
                    : 'Add student sections and cohorts to organize laboratory class timetables.'}
                </p>
                {isAuthorized && (
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
                    {onAddSection && (
                      <button
                        onClick={onAddSection}
                        className="px-4 py-2 bg-zinc-900 text-white rounded-xl text-xs font-semibold hover:bg-zinc-800 transition-colors shadow-xs cursor-pointer flex items-center gap-1.5"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Section</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            ) : (
              filteredSections.map(section => {
                // Find all schedules assigned to this yearSection
                const assignedSchedules = schedules.filter(s => 
                  s.yearSection && s.yearSection.toLowerCase() === section.name.toLowerCase()
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
                              <span className="text-[10px] text-zinc-500 font-medium truncate max-w-[170px]" title={section.department}>
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
                            {onEditSection && (
                              <button
                                onClick={() => onEditSection(section)}
                                className="p-1.5 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg cursor-pointer"
                                title="Edit Section"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {onDeleteSection && (
                              <button
                                onClick={() => onDeleteSection(section.id)}
                                className="p-1.5 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-lg cursor-pointer"
                                title="Delete Section"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Headcount & Personnel Stats */}
                      <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                        <div className="p-2.5 bg-zinc-50 rounded-xl border border-zinc-100">
                          <span className="text-[10px] text-zinc-400 uppercase font-semibold block">Headcount</span>
                          <span className="font-bold text-zinc-900 text-sm font-mono mt-0.5 block">
                            {section.studentCount ? `${section.studentCount} Students` : 'Unspecified'}
                          </span>
                        </div>

                        <div className="p-2.5 bg-zinc-50 rounded-xl border border-zinc-100">
                          <span className="text-[10px] text-zinc-400 uppercase font-semibold block">Lab Classes</span>
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
                            <span className="truncate">Adviser: <strong className="text-zinc-800">{section.adviser}</strong></span>
                          </div>
                        )}

                        {section.room && (
                          <div className="flex items-center gap-2">
                            <Building2 className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                            <span className="truncate">Designated Lab: <strong className="text-zinc-800">{section.room}</strong></span>
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
                      <span className="text-[11px] text-zinc-400">
                        Active in Timetable
                      </span>
                      <span className="text-[11px] font-semibold text-zinc-700">
                        {assignedSchedules.length > 0 ? (
                          `${assignedSchedules.length} schedule slot(s)`
                        ) : (
                          'Ready for scheduling'
                        )}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* =============================================================
       * SUB-TAB 3: CURRICULUM SUBJECTS
       * =========================================================== */}
      {activeSubTab === 'subjects' && (
        <div className="space-y-4">
          {/* Category Filter Chips */}
          <div className="bg-white border border-zinc-200 rounded-xl p-3 shadow-xs flex items-center gap-1.5 overflow-x-auto no-scrollbar text-xs">
            {['all', 'Major Specialization', 'Laboratory Practical', 'Core ICT', 'General Education', 'Elective'].map(cat => (
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
                {isAuthorized && (
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
                    {onAddSubject && (
                      <button
                        onClick={onAddSubject}
                        className="px-4 py-2 bg-zinc-900 text-white rounded-xl text-xs font-semibold hover:bg-zinc-800 transition-colors shadow-xs cursor-pointer flex items-center gap-1.5"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Subject</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            ) : (
              filteredSubjects.map(subject => {
                const assignedSchedules = schedules.filter(s => 
                  s.subject && (
                    s.subject.toLowerCase().includes(subject.name.toLowerCase()) ||
                    (subject.code && s.subject.toLowerCase().includes(subject.code.toLowerCase()))
                  )
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
                            {onEditSubject && (
                              <button
                                onClick={() => onEditSubject(subject)}
                                className="p-1.5 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg cursor-pointer"
                                title="Edit Subject"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {onDeleteSubject && (
                              <button
                                onClick={() => onDeleteSubject(subject.id)}
                                className="p-1.5 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-lg cursor-pointer"
                                title="Delete Subject"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Units & Lab Hours Grid */}
                      <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                        <div className="p-2.5 bg-zinc-50 rounded-xl border border-zinc-100">
                          <span className="text-[10px] text-zinc-400 uppercase font-semibold block">Academic Units</span>
                          <span className="font-bold text-zinc-900 text-sm font-mono mt-0.5 block">
                            {subject.units !== undefined ? `${subject.units}.0 Units` : '3.0 Units'}
                          </span>
                        </div>

                        <div className="p-2.5 bg-zinc-50 rounded-xl border border-zinc-100">
                          <span className="text-[10px] text-zinc-400 uppercase font-semibold block">Contact Hours</span>
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
      )}

      {/* =============================================================
       * Faculty ID Badge Preview Modal
       * =========================================================== */}
      {selectedBadgeTrainer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl border border-zinc-200 overflow-hidden animate-in fade-in zoom-in-95">
            <div className="px-5 py-3.5 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/80">
              <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-700">
                <IdCard className="w-4 h-4 text-zinc-500" />
                <span>Faculty Identification Credential</span>
              </div>
              <button
                onClick={() => setSelectedBadgeTrainer(null)}
                className="p-1 text-zinc-400 hover:text-zinc-700 rounded-md cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6">
              <div className="border border-zinc-200 rounded-xl overflow-hidden shadow-xs bg-gradient-to-b from-zinc-50/50 to-white">
                <div className="bg-zinc-900 text-white p-3.5 flex items-center justify-center gap-3">
                  <SchoolComputerLogo size="sm" />
                  <div className="text-left">
                    <p className="text-[10px] font-mono tracking-widest uppercase text-amber-400 font-bold">
                      MMA INSTITUTE OF TECHNOLOGY
                    </p>
                    <p className="text-xs font-bold tracking-tight text-white mt-0.5">
                      FACULTY IDENTIFICATION CARD
                    </p>
                  </div>
                </div>

                <div className="p-5 flex flex-col items-center text-center">
                  <div className="relative mb-3">
                    {selectedBadgeTrainer.photoUrl ? (
                      <img
                        src={selectedBadgeTrainer.photoUrl}
                        alt={selectedBadgeTrainer.name}
                        className="w-24 h-24 rounded-2xl object-cover border-4 border-white shadow-md ring-1 ring-zinc-200"
                      />
                    ) : (
                      <div className="w-24 h-24 rounded-2xl bg-zinc-100 border-2 border-dashed border-zinc-300 flex flex-col items-center justify-center text-zinc-400">
                        <Users className="w-8 h-8 text-zinc-300 mb-1" />
                        <span className="text-[9px] font-medium">No Photo</span>
                      </div>
                    )}
                    {selectedBadgeTrainer.photoUrl && (
                      <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-emerald-600 text-white text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded-full shadow-xs whitespace-nowrap">
                        ACTIVE FACULTY
                      </span>
                    )}
                  </div>

                  <h3 className="font-bold text-base text-zinc-900 mt-2">
                    {selectedBadgeTrainer.name}
                  </h3>
                  <p className="text-xs text-zinc-500 font-medium">
                    {selectedBadgeTrainer.specialization || 'Laboratory Instructor & Faculty'}
                  </p>

                  <div className="w-full mt-4 pt-4 border-t border-zinc-100 grid grid-cols-2 gap-2 text-left text-xs">
                    <div className="p-2 bg-zinc-50 rounded-lg">
                      <span className="text-[9px] font-mono uppercase text-zinc-400 block">Faculty ID</span>
                      <span className="font-mono font-bold text-zinc-800 text-[11px]">
                        {selectedBadgeTrainer.employeeId || `FAC-${selectedBadgeTrainer.id.slice(0, 6).toUpperCase()}`}
                      </span>
                    </div>
                    <div className="p-2 bg-zinc-50 rounded-lg">
                      <span className="text-[9px] font-mono uppercase text-zinc-400 block">Department</span>
                      <span className="font-bold text-zinc-800 text-[11px] truncate block">
                        {selectedBadgeTrainer.department || 'MMA ICT Dept.'}
                      </span>
                    </div>
                  </div>

                  <div className="w-full mt-2 p-2 bg-zinc-50 rounded-lg text-left text-xs">
                    <span className="text-[9px] font-mono uppercase text-zinc-400 block">
                      Weekly Laboratory Classes
                    </span>
                    <span className="font-semibold text-zinc-800 text-xs">
                      {schedules.filter(s => s.trainerId === selectedBadgeTrainer.id).length} Scheduled Sessions
                    </span>
                  </div>
                </div>

                <div className="bg-zinc-100 px-4 py-2 border-t border-zinc-200/80 flex items-center justify-between text-[9px] font-mono text-zinc-400">
                  <span>VALID ACADEMIC YEAR</span>
                  <span>TRACKLAB SYSTEM</span>
                </div>
              </div>

              <div className="mt-5 space-y-2">
                {isAuthorized && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        handleTriggerUpload(selectedBadgeTrainer.id);
                      }}
                      className="flex-1 py-2 px-3 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-xs cursor-pointer"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span>{selectedBadgeTrainer.photoUrl ? 'Change Photo' : 'Upload Photo'}</span>
                    </button>
                    <button
                      onClick={() => {
                        const target = selectedBadgeTrainer;
                        setSelectedBadgeTrainer(null);
                        onEditTrainer(target);
                      }}
                      className="py-2 px-3 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>
                  </div>
                )}

                {onOpenPrintModal && (
                  <button
                    onClick={() => {
                      const targetId = selectedBadgeTrainer.id;
                      setSelectedBadgeTrainer(null);
                      onOpenPrintModal('faculty', targetId);
                    }}
                    className="w-full py-2 px-3 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-xs cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5 text-amber-400" />
                    <span>Print Weekly Teaching Schedule</span>
                  </button>
                )}

                <button
                  onClick={() => setSelectedBadgeTrainer(null)}
                  className="w-full py-2 bg-zinc-100 text-zinc-600 rounded-lg text-xs font-semibold hover:bg-zinc-200 transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
