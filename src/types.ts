import { Timestamp } from 'firebase/firestore';

export type UserRole = 'student' | 'teacher' | 'admin';

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  role: UserRole;
  lastActive?: Timestamp;
}

export interface Laboratory {
  id: string;
  name: string;
  description?: string;
  capacity?: number;
  location?: string;
  createdAt: Timestamp;
}

export interface Trainer {
  id: string;
  name: string;
  specialization?: string;
  photoUrl?: string;
  email?: string;
  employeeId?: string;
  department?: string;
  phoneNumber?: string;
  status?: 'active' | 'on_leave' | 'adjunct';
  createdAt: Timestamp;
}

export interface Section {
  id: string;
  name: string;
  yearLevel?: string;
  department?: string;
  studentCount?: number;
  adviser?: string;
  room?: string;
  notes?: string;
  createdAt: Timestamp;
}

export interface Subject {
  id: string;
  name: string;
  code?: string;
  category?: string;
  units?: number;
  hoursPerWeek?: number;
  description?: string;
  createdAt: Timestamp;
}

export interface Schedule {
  id: string;
  labId: string;
  trainerId?: string;
  teacherName: string;
  subject: string;
  yearSection: string;
  day: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday';
  startTime: string; // e.g. "08:00"
  endTime: string;   // e.g. "10:00"
  date?: string;
  createdAt?: Timestamp;
}

export interface LabUsage {
  id: string;
  uid: string;
  userName: string;
  labId: string;
  station: string;
  purpose: string;
  checkIn: Timestamp;
  checkOut: Timestamp | null;
}

export type IssueCategory = 'hardware' | 'software' | 'network' | 'peripheral' | 'other';
export type IssueSeverity = 'low' | 'medium' | 'critical';
export type IssueStatus = 'open' | 'in_progress' | 'resolved';

export interface WorkstationIssue {
  id: string;
  labId: string;
  station: string;
  category?: IssueCategory;
  description: string;
  severity?: IssueSeverity;
  reportedByUid: string;
  reportedByName: string;
  status: IssueStatus;
  createdAt: Timestamp;
  resolvedAt?: Timestamp | null;
  resolutionNotes?: string;
  resolvedByName?: string;
}

export type AcMode = 'Cool' | 'Eco' | 'Dry' | 'Fan';

export interface AcUsage {
  id: string;
  labId: string;
  labName?: string;
  acUnit: string; // e.g. "Unit 1 - Inverter Split", "Unit 2", "All Units"
  turnedOnAt: Timestamp;
  turnedOffAt?: Timestamp | null;
  turnedOnByUid: string;
  turnedOnByName: string;
  turnedOffByUid?: string | null;
  turnedOffByName?: string | null;
  temperature?: number; // e.g. 23
  mode?: AcMode;
  notes?: string;
  closingNotes?: string;
  status: 'active' | 'completed';
  durationMinutes?: number | null;
  estimatedKWh?: number | null;
}

export type ItemCategory = 
  | 'Electronics & IoT' 
  | 'Computing & Peripherals' 
  | 'Networking' 
  | 'Audio/Visual' 
  | 'Tools & Testers' 
  | 'Cables & Adapters'
  | 'Other';

export type ItemCondition = 'excellent' | 'good' | 'fair' | 'maintenance';

export interface LabItem {
  id: string;
  labId: string;
  labName?: string;
  name: string;
  category: ItemCategory;
  assetTag: string;
  totalQuantity: number;
  availableQuantity: number;
  condition: ItemCondition;
  location?: string;
  description?: string;
  requiresApproval: boolean;
  createdAt?: Timestamp;
}

export type BorrowStatus = 'pending' | 'approved' | 'rejected' | 'returned' | 'overdue';

export interface BorrowRequest {
  id: string;
  itemId: string;
  itemName: string;
  itemAssetTag?: string;
  labId: string;
  labName?: string;
  borrowerUid: string;
  borrowerName: string;
  borrowerEmail: string;
  borrowerIdNumber?: string;
  borrowerRole: UserRole;
  purpose: string;
  quantity: number;
  status: BorrowStatus;
  requestedAt: Timestamp;
  expectedReturnDate: Timestamp;
  reviewedAt?: Timestamp | null;
  reviewedByUid?: string | null;
  reviewedByName?: string | null;
  reviewNotes?: string | null;
  returnedAt?: Timestamp | null;
  returnedReceivedByUid?: string | null;
  returnedReceivedByName?: string | null;
  returnCondition?: 'good' | 'fair' | 'damaged' | 'missing_parts';
  returnNotes?: string | null;
}

export type ActiveTab = 'floorplan' | 'schedule' | 'attendance' | 'aircon' | 'items' | 'maintenance' | 'labs' | 'trainers' | 'analytics' | 'reports' | 'users' | 'kiosk';
