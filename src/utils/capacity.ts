export type CapacityWarningLevel = 'normal' | 'near' | 'exceeded';

export interface LabCapacityStatus {
  capacity: number;
  occupiedCount: number;
  availableCount: number;
  occupancyRate: number; // 0 to 100+
  isNear: boolean;
  isExceeded: boolean;
  isWarning: boolean; // true if near or exceeded
  warningLevel: CapacityWarningLevel;
  label: string;
  badgeText: string;
}

/**
 * Calculates whether a laboratory has reached or is nearing capacity.
 * - Exceeded: occupiedCount >= capacity
 * - Nears capacity: >= 85% occupancy OR 2 or fewer seats remaining (with active sessions)
 */
export function getLabCapacityStatus(
  occupiedCount: number,
  capacityConfig?: number
): LabCapacityStatus {
  const capacity = capacityConfig && capacityConfig > 0 ? capacityConfig : 24;
  const occupancyRate = Math.round((occupiedCount / capacity) * 100);
  const isExceeded = occupiedCount >= capacity;
  const isNear = !isExceeded && (occupancyRate >= 85 || (capacity - occupiedCount <= 2 && occupiedCount > 0));
  const isWarning = isExceeded || isNear;

  let warningLevel: CapacityWarningLevel = 'normal';
  let label = 'Normal Capacity';
  let badgeText = `${occupiedCount} / ${capacity}`;

  if (isExceeded) {
    warningLevel = 'exceeded';
    label = occupiedCount > capacity ? 'Capacity Over limit' : 'At Maximum Capacity';
    badgeText = `FULL (${occupiedCount}/${capacity})`;
  } else if (isNear) {
    warningLevel = 'near';
    const remaining = Math.max(0, capacity - occupiedCount);
    label = `Nearing Capacity (${remaining} seat${remaining === 1 ? '' : 's'} left)`;
    badgeText = `NEAR LIMIT (${occupiedCount}/${capacity})`;
  }

  return {
    capacity,
    occupiedCount,
    availableCount: Math.max(0, capacity - occupiedCount),
    occupancyRate,
    isNear,
    isExceeded,
    isWarning,
    warningLevel,
    label,
    badgeText,
  };
}
