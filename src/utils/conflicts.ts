import { Schedule, Laboratory, Trainer } from '../types';

export interface ScheduleConflict {
  type: 'room_overlap' | 'trainer_overlap' | 'invalid_time';
  conflictingSchedule?: Schedule;
  message: string;
  severity: 'error' | 'warning';
}

/**
 * Converts "HH:mm" time string into total minutes since midnight
 */
export function timeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const [hours, minutes] = timeStr.split(':').map(Number);
  return (hours || 0) * 60 + (minutes || 0);
}

/**
 * Converts total minutes since midnight back into "HH:mm"
 */
export function minutesToTime(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60) % 24;
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

/**
 * Formats "HH:mm" (24-hour) to user-friendly "h:mm a" (e.g., "8:00 AM", "2:30 PM")
 */
export function formatTime12(timeStr: string): string {
  if (!timeStr) return '';
  const total = timeToMinutes(timeStr);
  const hours24 = Math.floor(total / 60);
  const mins = total % 60;
  const period = hours24 >= 12 ? 'PM' : 'AM';
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
  return `${hours12}:${String(mins).padStart(2, '0')} ${period}`;
}

/**
 * Checks whether two time intervals [startA, endA) and [startB, endB) overlap.
 */
export function doTimesOverlap(
  startA: string,
  endA: string,
  startB: string,
  endB: string
): boolean {
  const aStart = timeToMinutes(startA);
  const aEnd = timeToMinutes(endA);
  const bStart = timeToMinutes(startB);
  const bEnd = timeToMinutes(endB);

  return Math.max(aStart, bStart) < Math.min(aEnd, bEnd);
}

/**
 * Finds all conflicts for a proposed schedule.
 */
export function findScheduleConflicts(
  proposed: {
    id?: string;
    labId: string;
    day: Schedule['day'];
    startTime: string;
    endTime: string;
    trainerId?: string;
    teacherName?: string;
  },
  schedules: Schedule[],
  laboratories: Laboratory[],
  trainers: Trainer[]
): ScheduleConflict[] {
  const conflicts: ScheduleConflict[] = [];

  const proposedStart = timeToMinutes(proposed.startTime);
  const proposedEnd = timeToMinutes(proposed.endTime);

  if (proposedEnd <= proposedStart) {
    conflicts.push({
      type: 'invalid_time',
      message: 'End time must be later than start time.',
      severity: 'error',
    });
    return conflicts;
  }

  if (proposedEnd - proposedStart < 15) {
    conflicts.push({
      type: 'invalid_time',
      message: 'Class duration must be at least 15 minutes.',
      severity: 'error',
    });
  }

  for (const existing of schedules) {
    // Skip self when updating an existing schedule
    if (proposed.id && existing.id === proposed.id) continue;

    // Must be on the exact same day
    if (existing.day !== proposed.day) continue;

    // Check time overlap
    if (doTimesOverlap(proposed.startTime, proposed.endTime, existing.startTime, existing.endTime)) {
      // 1. Room Double-Booking Conflict (Hard Error)
      if (existing.labId === proposed.labId) {
        const labName = laboratories.find(l => l.id === existing.labId)?.name || 'This Laboratory';
        conflicts.push({
          type: 'room_overlap',
          conflictingSchedule: existing,
          message: `${labName} is already booked for "${existing.subject}" (${existing.yearSection}) by ${existing.teacherName} from ${existing.startTime} to ${existing.endTime}.`,
          severity: 'error',
        });
      }

      // 2. Instructor Double-Booking Conflict (Simultaneous Rooms Warning)
      if (
        proposed.trainerId &&
        existing.trainerId &&
        proposed.trainerId === existing.trainerId &&
        existing.labId !== proposed.labId
      ) {
        const trainerName = trainers.find(t => t.id === proposed.trainerId)?.name || proposed.teacherName || 'Faculty';
        const otherLabName = laboratories.find(l => l.id === existing.labId)?.name || 'another laboratory';
        conflicts.push({
          type: 'trainer_overlap',
          conflictingSchedule: existing,
          message: `${trainerName} is already scheduled to teach in ${otherLabName} from ${existing.startTime} to ${existing.endTime}.`,
          severity: 'warning',
        });
      }
    }
  }

  return conflicts;
}

/**
 * Suggests an available slot after the conflicting schedule in the target room.
 */
export function getSuggestedNextSlot(
  conflictingEndTime: string,
  durationMinutes: number
): { startTime: string; endTime: string } {
  const startMin = timeToMinutes(conflictingEndTime);
  const endMin = Math.min(22 * 60, startMin + durationMinutes); // Cap at 22:00
  return {
    startTime: minutesToTime(startMin),
    endTime: minutesToTime(endMin),
  };
}

/**
 * Finds alternative laboratories that are completely vacant/available for the specified day and time interval.
 */
export function findAlternativeAvailableLabs(
  params: {
    day: Schedule['day'];
    startTime: string;
    endTime: string;
    excludeLabId: string;
    proposedScheduleId?: string;
  },
  schedules: Schedule[],
  laboratories: Laboratory[]
): Laboratory[] {
  if (!params.startTime || !params.endTime) return [];
  const proposedStart = timeToMinutes(params.startTime);
  const proposedEnd = timeToMinutes(params.endTime);
  if (proposedEnd <= proposedStart) return [];

  return laboratories.filter(lab => {
    if (lab.id === params.excludeLabId) return false;

    // Check if this lab has any overlapping schedule on this day
    const hasCollision = schedules.some(s => {
      if (params.proposedScheduleId && s.id === params.proposedScheduleId) return false;
      if (s.labId !== lab.id) return false;
      if (s.day !== params.day) return false;
      return doTimesOverlap(params.startTime, params.endTime, s.startTime, s.endTime);
    });

    return !hasCollision;
  });
}

export interface DayTimelineSlot {
  schedule?: Schedule;
  label: string;
  startTime: string;
  endTime: string;
  startMinutes: number;
  endMinutes: number;
  leftPercent: number;
  widthPercent: number;
  isProposed?: boolean;
  isConflict?: boolean;
}

/**
 * Generates visual timeline blocks for a lab on a given day (across 7:00 to 19:00 = 12 hours)
 */
export function getLabDayTimeline(
  labId: string,
  day: Schedule['day'],
  schedules: Schedule[],
  proposed?: {
    startTime: string;
    endTime: string;
    subject?: string;
    excludeScheduleId?: string;
  }
): {
  existingSlots: DayTimelineSlot[];
  proposedSlot: DayTimelineSlot | null;
  dayStartMinutes: number;
  dayEndMinutes: number;
} {
  const dayStartMinutes = 7 * 60; // 07:00 AM
  const dayEndMinutes = 19 * 60;  // 07:00 PM
  const totalRange = dayEndMinutes - dayStartMinutes;

  const relevantSchedules = schedules.filter(s => {
    if (s.labId !== labId || s.day !== day) return false;
    if (proposed?.excludeScheduleId && s.id === proposed.excludeScheduleId) return false;
    return true;
  });

  const existingSlots: DayTimelineSlot[] = relevantSchedules.map(s => {
    const startM = timeToMinutes(s.startTime);
    const endM = timeToMinutes(s.endTime);
    const clampedStart = Math.max(dayStartMinutes, startM);
    const clampedEnd = Math.min(dayEndMinutes, endM);
    const leftPercent = Math.max(0, ((clampedStart - dayStartMinutes) / totalRange) * 100);
    const widthPercent = Math.max(2, ((clampedEnd - clampedStart) / totalRange) * 100);

    return {
      schedule: s,
      label: s.subject || 'Class',
      startTime: s.startTime,
      endTime: s.endTime,
      startMinutes: startM,
      endMinutes: endM,
      leftPercent,
      widthPercent,
    };
  });

  let proposedSlot: DayTimelineSlot | null = null;
  if (proposed && proposed.startTime && proposed.endTime) {
    const startM = timeToMinutes(proposed.startTime);
    const endM = timeToMinutes(proposed.endTime);

    if (endM > startM) {
      const isConflict = relevantSchedules.some(s =>
        doTimesOverlap(proposed.startTime, proposed.endTime, s.startTime, s.endTime)
      );
      const clampedStart = Math.max(dayStartMinutes, startM);
      const clampedEnd = Math.min(dayEndMinutes, endM);
      const leftPercent = Math.max(0, Math.min(100, ((clampedStart - dayStartMinutes) / totalRange) * 100));
      const widthPercent = Math.max(2, Math.min(100 - leftPercent, ((clampedEnd - clampedStart) / totalRange) * 100));

      proposedSlot = {
        label: proposed.subject || 'New Class',
        startTime: proposed.startTime,
        endTime: proposed.endTime,
        startMinutes: startM,
        endMinutes: endM,
        leftPercent,
        widthPercent,
        isProposed: true,
        isConflict,
      };
    }
  }

  return {
    existingSlots,
    proposedSlot,
    dayStartMinutes,
    dayEndMinutes,
  };
}

/**
 * Returns a map of schedule IDs that are in conflict with another schedule in the list,
 * along with their conflict reasons.
 */
export function getConflictingScheduleMap(schedules: Schedule[]): Map<string, ScheduleConflict[]> {
  const conflictMap = new Map<string, ScheduleConflict[]>();

  for (let i = 0; i < schedules.length; i++) {
    for (let j = i + 1; j < schedules.length; j++) {
      const a = schedules[i];
      const b = schedules[j];

      if (a.day === b.day && doTimesOverlap(a.startTime, a.endTime, b.startTime, b.endTime)) {
        // Room collision
        if (a.labId === b.labId) {
          const msgA = `Double-booked with "${b.subject}" (${b.yearSection}, ${b.startTime}–${b.endTime})`;
          const msgB = `Double-booked with "${a.subject}" (${a.yearSection}, ${a.startTime}–${a.endTime})`;

          const listA = conflictMap.get(a.id) || [];
          listA.push({ type: 'room_overlap', conflictingSchedule: b, message: msgA, severity: 'error' });
          conflictMap.set(a.id, listA);

          const listB = conflictMap.get(b.id) || [];
          listB.push({ type: 'room_overlap', conflictingSchedule: a, message: msgB, severity: 'error' });
          conflictMap.set(b.id, listB);
        }
        // Trainer collision in different rooms
        else if (a.trainerId && b.trainerId && a.trainerId === b.trainerId) {
          const msgA = `Instructor double-booked with "${b.subject}" (${b.startTime}–${b.endTime})`;
          const msgB = `Instructor double-booked with "${a.subject}" (${a.startTime}–${a.endTime})`;

          const listA = conflictMap.get(a.id) || [];
          listA.push({ type: 'trainer_overlap', conflictingSchedule: b, message: msgA, severity: 'warning' });
          conflictMap.set(a.id, listA);

          const listB = conflictMap.get(b.id) || [];
          listB.push({ type: 'trainer_overlap', conflictingSchedule: a, message: msgB, severity: 'warning' });
          conflictMap.set(b.id, listB);
        }
      }
    }
  }

  return conflictMap;
}

/**
 * Returns a set of schedule IDs that are in conflict with another schedule in the list.
 */
export function getConflictingScheduleIds(schedules: Schedule[]): Set<string> {
  const map = getConflictingScheduleMap(schedules);
  return new Set(map.keys());
}
