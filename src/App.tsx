import React, { useState, useEffect, useMemo } from 'react';
import { 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged, 
  User as FirebaseUser 
} from 'firebase/auth';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  doc, 
  serverTimestamp,
  getDoc,
  setDoc,
  getDocFromServer,
  writeBatch
} from 'firebase/firestore';
import { auth, db, googleProvider, OperationType, handleFirestoreError } from './firebase';
import { 
  Laboratory, 
  Trainer, 
  Section,
  Subject,
  Schedule, 
  LabUsage, 
  UserProfile, 
  UserRole, 
  ActiveTab,
  WorkstationIssue,
  IssueCategory,
  IssueSeverity,
  IssueStatus,
  AcUsage,
  AcMode,
  LabItem,
  BorrowRequest
} from './types';
import { differenceInMinutes } from 'date-fns';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { StationGrid } from './components/StationGrid';
import { TimetableMatrix } from './components/TimetableMatrix';
import { LiveAttendanceView } from './components/LiveAttendanceView';
import { MaintenanceView } from './components/MaintenanceView';
import { LabManagementView } from './components/LabManagementView';
import { TrainerManagementView } from './components/TrainerManagementView';
import { SectionsManagementView } from './components/SectionsManagementView';
import { SubjectsManagementView } from './components/SubjectsManagementView';
import { UserManagementView } from './components/UserManagementView';
import { ReportsView } from './components/ReportsView';
import { AnalyticsView } from './components/AnalyticsView';
import { DoorDisplayKiosk } from './components/DoorDisplayKiosk';
import { AirconTrackingView } from './components/AirconTrackingView';
import { ItemBorrowingView } from './components/ItemBorrowingView';
import { DismissClassModal } from './components/DismissClassModal';
import { SchoolComputerLogo } from './components/SchoolComputerLogo';
import { PrintScheduleModal, PrintMode, StandalonePrintView } from './components/PrintScheduleModal';
import { findScheduleConflicts } from './utils/conflicts';
import { 
  CheckInModal, 
  ScheduleModal, 
  LabModal, 
  TrainerModal, 
  SectionModal,
  SubjectModal,
  EditSessionModal, 
  ConfirmDeleteModal,
  ReportIssueModal,
  TrainerFormData,
  SectionFormData,
  SubjectFormData
} from './components/Modals';
import { 
  Monitor, 
  LogIn, 
  Calendar, 
  Users, 
  Clock, 
  ShieldCheck, 
  CheckCircle2, 
  Sparkles,
  ArrowRight,
  AlertCircle,
  ShieldAlert,
  Palette
} from 'lucide-react';
import heroLabImage from './assets/images/hero_ict_laboratory_1790661991315.jpg';
import schoolSealImage from './assets/images/mma_school_seal.png';
import { SplashScreen } from './components/SplashScreen';
import { ThemePreviewModal } from './components/ThemePreviewModal';

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isSplashActive, setIsSplashActive] = useState(() => {
    return new URLSearchParams(window.location.search).get('printView') !== 'true';
  });

  // White and Navy Blue Theme State (Approved & Active)
  const [themePreviewModalOpen, setThemePreviewModalOpen] = useState(false);
  const [isNavyWhiteLive, setIsNavyWhiteLive] = useState(true);

  // Firestore Data State
  const [laboratories, setLaboratories] = useState<Laboratory[]>([]);
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [activeSessions, setActiveSessions] = useState<LabUsage[]>([]);
  const [allSessions, setAllSessions] = useState<LabUsage[]>([]);
  const [issues, setIssues] = useState<WorkstationIssue[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [acSessions, setAcSessions] = useState<AcUsage[]>([]);
  const [selectedAcLabId, setSelectedAcLabId] = useState<string | undefined>(undefined);
  const [items, setItems] = useState<LabItem[]>([]);
  const [borrowRequests, setBorrowRequests] = useState<BorrowRequest[]>([]);
  const [selectedBorrowItemId, setSelectedBorrowItemId] = useState<string | null>(null);

  // Navigation State
  const [activeTab, setActiveTab] = useState<ActiveTab>('floorplan');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);

  // Modals State
  const [checkInModal, setCheckInModal] = useState<{
    isOpen: boolean;
    labId?: string;
    station?: string;
  }>({ isOpen: false });

  const [reportIssueModal, setReportIssueModal] = useState<{
    isOpen: boolean;
    labId?: string;
    station?: string;
  }>({ isOpen: false });

  const [scheduleModal, setScheduleModal] = useState<{
    isOpen: boolean;
    schedule?: Schedule | null;
  }>({ isOpen: false });

  const [labModal, setLabModal] = useState<{
    isOpen: boolean;
    lab?: Laboratory | null;
  }>({ isOpen: false });

  const [trainerModal, setTrainerModal] = useState<{
    isOpen: boolean;
    trainer?: Trainer | null;
  }>({ isOpen: false });

  const [sectionModal, setSectionModal] = useState<{
    isOpen: boolean;
    section?: Section | null;
  }>({ isOpen: false });

  const [subjectModal, setSubjectModal] = useState<{
    isOpen: boolean;
    subject?: Subject | null;
  }>({ isOpen: false });

  const [printScheduleModal, setPrintScheduleModal] = useState<{
    isOpen: boolean;
    mode?: PrintMode;
    targetId?: string;
  }>({ isOpen: false });

  const [editSessionModal, setEditSessionModal] = useState<{
    isOpen: boolean;
    session: LabUsage | null;
  }>({ isOpen: false, session: null });

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

  const [dismissModal, setDismissModal] = useState<{
    isOpen: boolean;
    labId?: string;
  }>({ isOpen: false });

  // Double-booking conflict alert dialog state
  const [conflictAlert, setConflictAlert] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
  }>({ isOpen: false, title: '', message: '' });

  // Door display kiosk selected lab ID
  const [kioskLabId, setKioskLabId] = useState<string | undefined>(undefined);

  // Current user's active session if any
  const currentUserSession = useMemo(() => {
    if (!user) return undefined;
    return activeSessions.find(s => s.uid === user.uid);
  }, [activeSessions, user]);

  // Open maintenance issues count
  const openIssuesCount = useMemo(() => {
    return issues.filter(i => i.status === 'open' || i.status === 'in_progress').length;
  }, [issues]);

  // Check for standalone print view in query params
  const isPrintView = useMemo(() => {
    return new URLSearchParams(window.location.search).get('printView') === 'true';
  }, []);

  // Validate Connection to Firestore on boot
  useEffect(() => {
    async function testConnection() {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
          console.error('Please check your Firebase configuration.');
        }
      }
    }
    testConnection();
  }, []);

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
          if (userDoc.exists()) {
            const data = userDoc.data() as UserProfile;
            // Bootstrap admin if email matches
            const isBootstrappedAdmin =
              currentUser.email === 'kdaveepong@gmail.com' ||
              currentUser.email === 'jaybeecapoy0822@gmail.com';
            if (isBootstrappedAdmin && data.role !== 'admin') {
              const updatedProfile = { ...data, role: 'admin' as const };
              await setDoc(doc(db, 'users', currentUser.uid), updatedProfile);
              setProfile(updatedProfile);
            } else {
              setProfile(data);
            }
          } else {
            const isAdmin =
              currentUser.email === 'kdaveepong@gmail.com' ||
              currentUser.email === 'jaybeecapoy0822@gmail.com';
            const newProfile: UserProfile = {
              uid: currentUser.uid,
              displayName: currentUser.displayName || 'Authorized User',
              email: currentUser.email || '',
              role: isAdmin ? 'admin' : 'student',
            };
            await setDoc(doc(db, 'users', currentUser.uid), newProfile);
            setProfile(newProfile);
          }
        } catch (error) {
          console.error('Error fetching user profile:', error);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
      setIsAuthReady(true);
    });

    return () => unsubscribe();
  }, []);

  // Automatic Quick Check-In when scanning a Workstation QR Code
  useEffect(() => {
    if (!isAuthReady || !user) return;
    try {
      const params = new URLSearchParams(window.location.search);
      const targetLabId = params.get('labId') || params.get('lab');
      const targetStation = params.get('station');
      const targetAcLabId = params.get('acLabId') || params.get('acLab');
      const targetBorrowItemId = params.get('borrowItemId') || params.get('borrowItem');

      if (targetBorrowItemId) {
        setSelectedBorrowItemId(targetBorrowItemId);
        setActiveTab('items');
        window.history.replaceState({}, document.title, window.location.pathname);
      } else if (targetAcLabId) {
        setSelectedAcLabId(targetAcLabId);
        setActiveTab('aircon');
        window.history.replaceState({}, document.title, window.location.pathname);
      } else if (targetLabId && targetStation) {
        setCheckInModal({
          isOpen: true,
          labId: targetLabId,
          station: targetStation,
        });
        // Clean URL query parameters smoothly
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    } catch (e) {
      console.error('Error handling QR check-in params:', e);
    }
  }, [isAuthReady, user]);

  // Real-time Firestore Listeners
  useEffect(() => {
    if (!isAuthReady || !user) return;

    // Laboratories
    const labQuery = query(collection(db, 'laboratories'), orderBy('name'));
    const unsubLabs = onSnapshot(labQuery, (snapshot) => {
      setLaboratories(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Laboratory)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'laboratories'));

    // Trainers
    const trainerQuery = query(collection(db, 'trainers'), orderBy('name'));
    const unsubTrainers = onSnapshot(trainerQuery, (snapshot) => {
      setTrainers(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Trainer)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'trainers'));

    // Academic Sections
    const sectionQuery = query(collection(db, 'sections'), orderBy('name'));
    const unsubSections = onSnapshot(sectionQuery, (snapshot) => {
      setSections(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Section)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'sections'));

    // Curriculum Subjects
    const subjectQuery = query(collection(db, 'subjects'), orderBy('name'));
    const unsubSubjects = onSnapshot(subjectQuery, (snapshot) => {
      setSubjects(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Subject)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'subjects'));

    // Schedules
    const scheduleQuery = query(collection(db, 'schedules'), orderBy('startTime'));
    const unsubSchedules = onSnapshot(scheduleQuery, (snapshot) => {
      setSchedules(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Schedule)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'schedules'));

    // Active Sessions (checkOut is null)
    const activeQuery = query(
      collection(db, 'lab_usage'),
      where('checkOut', '==', null),
      orderBy('checkIn', 'desc')
    );
    const unsubActive = onSnapshot(activeQuery, (snapshot) => {
      setActiveSessions(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as LabUsage)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'lab_usage'));

    // All Sessions (historical audit log)
    const allSessionsQuery = query(
      collection(db, 'lab_usage'),
      orderBy('checkIn', 'desc')
    );
    const unsubAllSessions = onSnapshot(allSessionsQuery, (snapshot) => {
      setAllSessions(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as LabUsage)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'lab_usage'));

    // Workstation Issues & Fault Reports
    const issuesQuery = query(
      collection(db, 'workstation_issues'),
      orderBy('createdAt', 'desc')
    );
    const unsubIssues = onSnapshot(issuesQuery, (snapshot) => {
      setIssues(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as WorkstationIssue)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'workstation_issues'));

    // Air-Conditioning Usage Logs
    const acQuery = query(
      collection(db, 'ac_usage'),
      orderBy('turnedOnAt', 'desc')
    );
    const unsubAc = onSnapshot(acQuery, (snapshot) => {
      setAcSessions(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as AcUsage)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'ac_usage'));

    // Lab Equipment / Items Inventory
    const itemsQuery = query(
      collection(db, 'lab_items'),
      orderBy('name')
    );
    const unsubItems = onSnapshot(itemsQuery, (snapshot) => {
      setItems(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as LabItem)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'lab_items'));

    // Borrow Requests & Tracking
    const borrowQuery = query(
      collection(db, 'borrow_requests'),
      orderBy('requestedAt', 'desc')
    );
    const unsubBorrow = onSnapshot(borrowQuery, (snapshot) => {
      setBorrowRequests(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as BorrowRequest)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'borrow_requests'));

    // Users (admin only)
    let unsubUsers = () => {};
    if (profile?.role === 'admin') {
      const usersQuery = query(collection(db, 'users'), orderBy('displayName'));
      unsubUsers = onSnapshot(usersQuery, (snapshot) => {
        setUsers(snapshot.docs.map(d => d.data() as UserProfile));
      }, (error) => handleFirestoreError(error, OperationType.LIST, 'users'));
    }

    return () => {
      unsubLabs();
      unsubTrainers();
      unsubSections();
      unsubSubjects();
      unsubSchedules();
      unsubActive();
      unsubAllSessions();
      unsubIssues();
      unsubAc();
      unsubItems();
      unsubBorrow();
      unsubUsers();
    };
  }, [isAuthReady, user, profile?.role]);

  // Auth Handlers
  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error('Sign-in failed:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Sign-out failed:', error);
    }
  };

  // Lab Usage Handlers
  const handleCheckIn = async (labId: string, station: string, purpose: string) => {
    if (!user) return;
    try {
      await addDoc(collection(db, 'lab_usage'), {
        uid: user.uid,
        userName: profile?.displayName || user.displayName || 'Student',
        labId,
        station,
        purpose,
        checkIn: serverTimestamp(),
        checkOut: null,
      });
      setCheckInModal({ isOpen: false });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'lab_usage');
    }
  };

  const handleCheckOut = async (sessionId: string) => {
    try {
      await updateDoc(doc(db, 'lab_usage', sessionId), {
        checkOut: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `lab_usage/${sessionId}`);
    }
  };

  const handleBatchCheckOut = async (sessionIds: string[]) => {
    if (sessionIds.length === 0) return;
    try {
      // Process in chunks of 400 for Firestore batch limits
      const chunkSize = 400;
      for (let i = 0; i < sessionIds.length; i += chunkSize) {
        const chunk = sessionIds.slice(i, i + chunkSize);
        const batch = writeBatch(db);
        chunk.forEach(id => {
          const docRef = doc(db, 'lab_usage', id);
          batch.update(docRef, {
            checkOut: serverTimestamp(),
          });
        });
        await batch.commit();
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'lab_usage (batch checkout)');
      throw error;
    }
  };

  const handleUpdateSessionStation = async (id: string, station: string) => {
    try {
      await updateDoc(doc(db, 'lab_usage', id), { station });
      setEditSessionModal({ isOpen: false, session: null });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `lab_usage/${id}`);
    }
  };

  // Laboratory Handlers
  const handleAddLab = async (name: string, description: string, capacity?: number) => {
    try {
      await addDoc(collection(db, 'laboratories'), {
        name,
        description,
        capacity: capacity || 24,
        createdAt: serverTimestamp(),
      });
      setLabModal({ isOpen: false });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'laboratories');
    }
  };

  const handleUpdateLab = async (id: string, name: string, description: string, capacity?: number) => {
    try {
      await updateDoc(doc(db, 'laboratories', id), {
        name,
        description,
        capacity: capacity || 24,
      });
      setLabModal({ isOpen: false });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `laboratories/${id}`);
    }
  };

  const handleDeleteLab = (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Laboratory',
      message: 'Are you sure you want to delete this laboratory? Active stations and historical records referencing this lab will remain, but the room will be removed.',
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'laboratories', id));
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        } catch (error) {
          handleFirestoreError(error, OperationType.DELETE, `laboratories/${id}`);
        }
      },
    });
  };

  // Trainer / Faculty Handlers
  const handleAddTrainer = async (data: TrainerFormData) => {
    try {
      const docData: Record<string, unknown> = {
        name: data.name,
        specialization: data.specialization || '',
        createdAt: serverTimestamp(),
      };
      if (data.employeeId) docData.employeeId = data.employeeId;
      if (data.department) docData.department = data.department;
      if (data.email) docData.email = data.email;
      if (data.phoneNumber) docData.phoneNumber = data.phoneNumber;
      if (data.status) docData.status = data.status;
      if (data.photoUrl) docData.photoUrl = data.photoUrl;

      await addDoc(collection(db, 'trainers'), docData);
      setTrainerModal({ isOpen: false });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'trainers');
    }
  };

  const handleUpdateTrainer = async (id: string, data: TrainerFormData) => {
    try {
      const docData: Record<string, unknown> = {
        name: data.name,
        specialization: data.specialization || '',
      };
      if (data.employeeId !== undefined) docData.employeeId = data.employeeId;
      if (data.department !== undefined) docData.department = data.department;
      if (data.email !== undefined) docData.email = data.email;
      if (data.phoneNumber !== undefined) docData.phoneNumber = data.phoneNumber;
      if (data.status !== undefined) docData.status = data.status;
      if (data.photoUrl !== undefined) docData.photoUrl = data.photoUrl;

      await updateDoc(doc(db, 'trainers', id), docData);
      setTrainerModal({ isOpen: false });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `trainers/${id}`);
    }
  };

  const handleQuickUpdateTrainerPhoto = async (id: string, photoUrl: string) => {
    try {
      await updateDoc(doc(db, 'trainers', id), { photoUrl });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `trainers/${id}`);
    }
  };

  const handleDeleteTrainer = (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Faculty Member',
      message: 'Are you sure you want to delete this faculty member? Existing schedules will retain the teacher name.',
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'trainers', id));
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        } catch (error) {
          handleFirestoreError(error, OperationType.DELETE, `trainers/${id}`);
        }
      },
    });
  };

  // Academic Section Handlers
  const handleAddSection = async (data: SectionFormData) => {
    try {
      const docData: Record<string, unknown> = {
        name: data.name,
        createdAt: serverTimestamp(),
      };
      if (data.yearLevel) docData.yearLevel = data.yearLevel;
      if (data.department) docData.department = data.department;
      if (data.studentCount) docData.studentCount = data.studentCount;
      if (data.adviser) docData.adviser = data.adviser;
      if (data.room) docData.room = data.room;
      if (data.notes) docData.notes = data.notes;

      await addDoc(collection(db, 'sections'), docData);
      setSectionModal({ isOpen: false });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'sections');
    }
  };

  const handleUpdateSection = async (id: string, data: SectionFormData) => {
    try {
      const docData: Record<string, unknown> = {
        name: data.name,
      };
      if (data.yearLevel !== undefined) docData.yearLevel = data.yearLevel;
      if (data.department !== undefined) docData.department = data.department;
      if (data.studentCount !== undefined) docData.studentCount = data.studentCount;
      if (data.adviser !== undefined) docData.adviser = data.adviser;
      if (data.room !== undefined) docData.room = data.room;
      if (data.notes !== undefined) docData.notes = data.notes;

      await updateDoc(doc(db, 'sections', id), docData);
      setSectionModal({ isOpen: false });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `sections/${id}`);
    }
  };

  const handleDeleteSection = (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Academic Section',
      message: 'Are you sure you want to delete this academic section? Timetable schedules referencing this section name will remain intact.',
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'sections', id));
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        } catch (error) {
          handleFirestoreError(error, OperationType.DELETE, `sections/${id}`);
        }
      },
    });
  };

  const handleSeedSampleSections = async () => {
    const samples = [
      {
        name: 'Grade 12 - ICT A',
        yearLevel: 'Grade 12',
        department: 'Information & Communications Technology',
        studentCount: 38,
        adviser: trainers[0]?.name || 'Engr. Carlos Mendoza',
        room: laboratories[0]?.name || 'Multimedia Lab 1',
        notes: 'Specializing in Animation, Web Development, and Digital Illustration practicals.',
      },
      {
        name: 'Grade 12 - ICT B',
        yearLevel: 'Grade 12',
        department: 'Information & Communications Technology',
        studentCount: 36,
        adviser: trainers[1]?.name || 'Prof. Maria Santos',
        room: laboratories[1]?.name || 'Networking & Systems Lab',
        notes: 'Specializing in Cisco Networking, Hardware Servicing, and IoT embedded systems.',
      },
      {
        name: 'Grade 11 - TVL ICT 1',
        yearLevel: 'Grade 11',
        department: 'Technical-Vocational Track',
        studentCount: 40,
        adviser: trainers[2]?.name || 'Mr. Jonathan Cruz',
        room: laboratories[0]?.name || 'Multimedia Lab 1',
        notes: 'Foundations of Computer Programming, Python, and Graphic Design.',
      },
      {
        name: 'BSIT 3-1',
        yearLevel: '3rd Year College',
        department: 'Computer Studies',
        studentCount: 32,
        adviser: trainers[0]?.name || 'Prof. Alexander Reyes',
        room: laboratories[0]?.name || 'Multimedia Lab 2',
        notes: 'Advanced Full-Stack Development and Capstone Laboratory Practicals.',
      },
      {
        name: 'BMA 2-A',
        yearLevel: '2nd Year College',
        department: 'Multimedia Arts',
        studentCount: 30,
        adviser: trainers[1]?.name || 'Ms. Beatrice Lopez',
        room: laboratories[1]?.name || 'Multimedia Lab 1',
        notes: '3D Maya Rigging, After Effects, and Audio-Visual Production Cohort.',
      },
    ];

    try {
      for (const item of samples) {
        await addDoc(collection(db, 'sections'), {
          ...item,
          createdAt: serverTimestamp(),
        });
      }
    } catch (e) {
      console.error('Error seeding sections:', e);
    }
  };

  // Curriculum Subject Handlers
  const handleAddSubject = async (data: SubjectFormData) => {
    try {
      const docData: Record<string, unknown> = {
        name: data.name,
        createdAt: serverTimestamp(),
      };
      if (data.code) docData.code = data.code;
      if (data.category) docData.category = data.category;
      if (data.units) docData.units = data.units;
      if (data.hoursPerWeek) docData.hoursPerWeek = data.hoursPerWeek;
      if (data.description) docData.description = data.description;

      await addDoc(collection(db, 'subjects'), docData);
      setSubjectModal({ isOpen: false });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'subjects');
    }
  };

  const handleUpdateSubject = async (id: string, data: SubjectFormData) => {
    try {
      const docData: Record<string, unknown> = {
        name: data.name,
      };
      if (data.code !== undefined) docData.code = data.code;
      if (data.category !== undefined) docData.category = data.category;
      if (data.units !== undefined) docData.units = data.units;
      if (data.hoursPerWeek !== undefined) docData.hoursPerWeek = data.hoursPerWeek;
      if (data.description !== undefined) docData.description = data.description;

      await updateDoc(doc(db, 'subjects', id), docData);
      setSubjectModal({ isOpen: false });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `subjects/${id}`);
    }
  };

  const handleDeleteSubject = (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Curriculum Subject',
      message: 'Are you sure you want to delete this curriculum subject? Existing schedule slots will retain the subject title.',
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'subjects', id));
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        } catch (error) {
          handleFirestoreError(error, OperationType.DELETE, `subjects/${id}`);
        }
      },
    });
  };

  const handleSeedSampleSubjects = async () => {
    const samples = [
      {
        code: 'MMA-101',
        name: '3D Modeling & Digital Animation',
        category: 'Major Specialization',
        units: 3,
        hoursPerWeek: 4,
        description: 'Comprehensive studio laboratory on polygon modeling, UV unwrapping, texturing, and keyframe animation using Autodesk Maya and Blender.',
      },
      {
        code: 'IT-204',
        name: 'Web Systems & Full-Stack Technologies',
        category: 'Major Specialization',
        units: 3,
        hoursPerWeek: 4,
        description: 'Covers modern frontend reactive frameworks, Node.js server architectures, RESTful APIs, and database integration.',
      },
      {
        code: 'NET-301',
        name: 'Advanced Cisco Routing & Switching',
        category: 'Laboratory Practical',
        units: 3,
        hoursPerWeek: 4,
        description: 'Hands-on configuration of managed Gigabit switches, VLAN segmentation, OSPF routing protocols, and network packet analysis.',
      },
      {
        code: 'PROG-102',
        name: 'Object-Oriented Python Programming',
        category: 'Core ICT',
        units: 3,
        hoursPerWeek: 3,
        description: 'Object-oriented software development paradigms, data structures, algorithms, and automated unit testing.',
      },
      {
        code: 'DIG-202',
        name: 'Digital Audio & Motion Graphics',
        category: 'Major Specialization',
        units: 3,
        hoursPerWeek: 4,
        description: 'Non-linear video editing, multi-track audio workstation sequencing, kinetic typography, and VFX compositing.',
      },
      {
        code: 'IOT-401',
        name: 'Internet of Things & Embedded Systems',
        category: 'Laboratory Practical',
        units: 3,
        hoursPerWeek: 4,
        description: 'Microcontroller sensor interfacing with Arduino Uno and Raspberry Pi, wireless telemetry, and real-time dashboard monitoring.',
      },
    ];

    try {
      for (const item of samples) {
        await addDoc(collection(db, 'subjects'), {
          ...item,
          createdAt: serverTimestamp(),
        });
      }
    } catch (e) {
      console.error('Error seeding subjects:', e);
    }
  };

  // Schedule Handlers
  const handleAddSchedule = async (scheduleData: Omit<Schedule, 'id'>) => {
    // Conflict verification guard
    const conflicts = findScheduleConflicts(
      scheduleData,
      schedules,
      laboratories,
      trainers
    );
    const roomConflict = conflicts.find(c => c.type === 'room_overlap');
    if (roomConflict) {
      setConflictAlert({
        isOpen: true,
        title: 'Double-Booking Conflict Blocked',
        message: roomConflict.message,
      });
      return;
    }

    try {
      await addDoc(collection(db, 'schedules'), {
        ...scheduleData,
        createdAt: serverTimestamp(),
      });
      setScheduleModal({ isOpen: false });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'schedules');
    }
  };

  const handleUpdateSchedule = async (id: string, scheduleData: Omit<Schedule, 'id'>) => {
    // Conflict verification guard
    const conflicts = findScheduleConflicts(
      { ...scheduleData, id },
      schedules,
      laboratories,
      trainers
    );
    const roomConflict = conflicts.find(c => c.type === 'room_overlap');
    if (roomConflict) {
      setConflictAlert({
        isOpen: true,
        title: 'Double-Booking Conflict Blocked',
        message: roomConflict.message,
      });
      return;
    }

    try {
      await updateDoc(doc(db, 'schedules', id), scheduleData);
      setScheduleModal({ isOpen: false });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `schedules/${id}`);
    }
  };

  const handleDeleteSchedule = (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Schedule Entry',
      message: 'Are you sure you want to delete this scheduled class?',
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'schedules', id));
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        } catch (error) {
          handleFirestoreError(error, OperationType.DELETE, `schedules/${id}`);
        }
      },
    });
  };

  // Session Delete Handler for Admin Audits
  const handleDeleteSession = (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Session Record',
      message: 'Are you sure you want to permanently delete this laboratory session record from the audit log?',
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'lab_usage', id));
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        } catch (error) {
          handleFirestoreError(error, OperationType.DELETE, `lab_usage/${id}`);
        }
      },
    });
  };

  // User Role Update Handler (Admin)
  const handleUpdateUserRole = async (uid: string, role: UserRole) => {
    try {
      await updateDoc(doc(db, 'users', uid), { role });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${uid}`);
    }
  };

  // User Remove Handler (Admin)
  const handleRemoveUser = async (uid: string) => {
    try {
      await deleteDoc(doc(db, 'users', uid));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `users/${uid}`);
      throw error;
    }
  };

  // Air-Conditioning Tracking Handlers
  const handleTurnOnAc = async (data: {
    labId: string;
    labName: string;
    acUnit: string;
    temperature: number;
    mode: AcMode;
    notes?: string;
  }) => {
    if (!user) return;
    try {
      await addDoc(collection(db, 'ac_usage'), {
        labId: data.labId,
        labName: data.labName,
        acUnit: data.acUnit,
        temperature: data.temperature,
        mode: data.mode,
        notes: data.notes || '',
        status: 'active',
        turnedOnAt: serverTimestamp(),
        turnedOnByUid: user.uid,
        turnedOnByName: profile?.displayName || user.displayName || 'Instructor/Staff',
        turnedOffAt: null,
        turnedOffByUid: null,
        turnedOffByName: null,
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'ac_usage');
      throw error;
    }
  };

  const handleTurnOffAc = async (sessionId: string, closingNotes?: string) => {
    if (!user) return;
    try {
      const session = acSessions.find(s => s.id === sessionId);
      const now = new Date();
      const startedAt = session ? session.turnedOnAt.toDate() : now;
      const durationMins = Math.max(1, differenceInMinutes(now, startedAt));
      const estimatedKWh = Math.round(((durationMins / 60) * 2.2) * 100) / 100;

      await updateDoc(doc(db, 'ac_usage', sessionId), {
        status: 'completed',
        turnedOffAt: serverTimestamp(),
        turnedOffByUid: user.uid,
        turnedOffByName: profile?.displayName || user.displayName || 'Instructor/Staff',
        closingNotes: closingNotes || '',
        durationMinutes: durationMins,
        estimatedKWh,
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `ac_usage/${sessionId}`);
      throw error;
    }
  };

  const handleDeleteAcSession = async (sessionId: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete AC Usage Record',
      message: 'Are you sure you want to permanently delete this air-conditioning log record from the audit log?',
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'ac_usage', sessionId));
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        } catch (error) {
          handleFirestoreError(error, OperationType.DELETE, `ac_usage/${sessionId}`);
        }
      },
    });
  };

  // Laboratory Equipment & Item Borrowing Handlers
  const handleAddItem = async (data: Partial<LabItem>) => {
    if (!user) return;
    try {
      await addDoc(collection(db, 'lab_items'), {
        ...data,
        createdAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'lab_items');
      throw error;
    }
  };

  const handleUpdateItem = async (itemId: string, data: Partial<LabItem>) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'lab_items', itemId), data);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `lab_items/${itemId}`);
      throw error;
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!user) {
      throw new Error('Please sign in with an instructor or admin account to remove equipment items.');
    }
    try {
      await deleteDoc(doc(db, 'lab_items', itemId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `lab_items/${itemId}`);
      throw error;
    }
  };

  const handleDeleteBorrowRequest = async (requestId: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'borrow_requests', requestId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `borrow_requests/${requestId}`);
      throw error;
    }
  };

  const handleRequestBorrow = async (data: any) => {
    if (!user) return;
    try {
      await addDoc(collection(db, 'borrow_requests'), data);
      if (data.status === 'approved' && data.itemId) {
        const item = items.find(i => i.id === data.itemId);
        if (item) {
          await updateDoc(doc(db, 'lab_items', data.itemId), {
            availableQuantity: Math.max(0, item.availableQuantity - (data.quantity || 1)),
          });
        }
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'borrow_requests');
      throw error;
    }
  };

  const handleApproveBorrow = async (requestId: string, notes?: string) => {
    if (!user) return;
    try {
      const request = borrowRequests.find(r => r.id === requestId);
      await updateDoc(doc(db, 'borrow_requests', requestId), {
        status: 'approved',
        reviewedAt: serverTimestamp(),
        reviewedByUid: user.uid,
        reviewedByName: profile?.displayName || user.displayName || 'Staff',
        reviewNotes: notes || '',
      });

      if (request && request.itemId) {
        const item = items.find(i => i.id === request.itemId);
        if (item) {
          await updateDoc(doc(db, 'lab_items', request.itemId), {
            availableQuantity: Math.max(0, item.availableQuantity - (request.quantity || 1)),
          });
        }
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `borrow_requests/${requestId}`);
      throw error;
    }
  };

  const handleRejectBorrow = async (requestId: string, reason: string) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'borrow_requests', requestId), {
        status: 'rejected',
        reviewedAt: serverTimestamp(),
        reviewedByUid: user.uid,
        reviewedByName: profile?.displayName || user.displayName || 'Staff',
        reviewNotes: reason,
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `borrow_requests/${requestId}`);
      throw error;
    }
  };

  const handleReturnBorrow = async (
    requestId: string,
    condition: 'good' | 'fair' | 'damaged' | 'missing_parts',
    notes?: string
  ) => {
    if (!user) return;
    try {
      const request = borrowRequests.find(r => r.id === requestId);
      await updateDoc(doc(db, 'borrow_requests', requestId), {
        status: 'returned',
        returnedAt: serverTimestamp(),
        returnedReceivedByUid: user.uid,
        returnedReceivedByName: profile?.displayName || user.displayName || 'Staff',
        returnCondition: condition,
        returnNotes: notes || '',
      });

      if (request && request.itemId) {
        const item = items.find(i => i.id === request.itemId);
        if (item) {
          await updateDoc(doc(db, 'lab_items', request.itemId), {
            availableQuantity: Math.min(item.totalQuantity, item.availableQuantity + (request.quantity || 1)),
            ...(condition === 'damaged' ? { condition: 'maintenance' } : {}),
          });
        }
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `borrow_requests/${requestId}`);
      throw error;
    }
  };

  const handleSeedSampleItems = async () => {
    if (!user || laboratories.length === 0) return;
    const defaultLab = laboratories[0];
    const secondLab = laboratories[1] || laboratories[0];

    const sampleItems = [
      {
        name: 'Arduino Uno R3 Microcontroller Starter Kit',
        labId: defaultLab.id,
        labName: defaultLab.name,
        category: 'Electronics & IoT' as const,
        assetTag: 'MMA-IOT-1001',
        totalQuantity: 8,
        availableQuantity: 7,
        condition: 'excellent' as const,
        location: 'Cabinet B, Shelf 1',
        description: 'Includes breadboard, jumper wires, LED pack, resistors, temperature & ultrasonic sensors.',
        requiresApproval: true,
      },
      {
        name: 'Raspberry Pi 4 Model B (4GB RAM) Lab Kit',
        labId: defaultLab.id,
        labName: defaultLab.name,
        category: 'Electronics & IoT' as const,
        assetTag: 'MMA-IOT-1002',
        totalQuantity: 6,
        availableQuantity: 5,
        condition: 'excellent' as const,
        location: 'Cabinet B, Shelf 2',
        description: 'Includes 32GB MicroSD, official power supply, micro-HDMI to HDMI cable, and clear acrylic case.',
        requiresApproval: true,
      },
      {
        name: 'Meta Quest 2 Advanced VR Headset (128GB)',
        labId: secondLab.id,
        labName: secondLab.name,
        category: 'Computing & Peripherals' as const,
        assetTag: 'MMA-VR-2001',
        totalQuantity: 3,
        availableQuantity: 2,
        condition: 'good' as const,
        location: 'Secure Locker 04',
        description: 'Includes Touch controllers, silicone cover, glasses spacer, and 5-meter PC Link Cable.',
        requiresApproval: true,
      },
      {
        name: 'Fluke 117 True-RMS Digital Multimeter',
        labId: defaultLab.id,
        labName: defaultLab.name,
        category: 'Tools & Testers' as const,
        assetTag: 'MMA-TOOL-3001',
        totalQuantity: 5,
        availableQuantity: 5,
        condition: 'excellent' as const,
        location: 'Toolbox Cart A',
        description: 'High-precision volt/ohm/current meter with silicone test leads and magnetic hanger.',
        requiresApproval: false,
      },
      {
        name: 'Logitech StreamCam 1080p 60fps HD Webcam',
        labId: secondLab.id,
        labName: secondLab.name,
        category: 'Audio/Visual' as const,
        assetTag: 'MMA-AV-4001',
        totalQuantity: 10,
        availableQuantity: 9,
        condition: 'excellent' as const,
        location: 'Cabinet A, Drawer 3',
        description: 'USB-C webcam with auto-focus, dual microphones, and monitor clip mount.',
        requiresApproval: false,
      },
      {
        name: 'Cisco Catalyst 24-Port Gigabit Managed Switch',
        labId: defaultLab.id,
        labName: defaultLab.name,
        category: 'Networking' as const,
        assetTag: 'MMA-NET-5001',
        totalQuantity: 4,
        availableQuantity: 3,
        condition: 'good' as const,
        location: 'Server Rack Bay 2',
        description: 'Used for advanced CCNA networking and VLAN packet tracing practicals.',
        requiresApproval: true,
      },
      {
        name: 'Hakko FX-888D Digital Soldering Station',
        labId: defaultLab.id,
        labName: defaultLab.name,
        category: 'Tools & Testers' as const,
        assetTag: 'MMA-TOOL-3002',
        totalQuantity: 4,
        availableQuantity: 4,
        condition: 'good' as const,
        location: 'Electronics Workbench 3',
        description: 'ESD-safe temperature controlled soldering iron, brass wire cleaner, and heat sponge.',
        requiresApproval: true,
      },
      {
        name: 'Cat6 Shielded RJ45 Patch Cable 10-Pack',
        labId: defaultLab.id,
        labName: defaultLab.name,
        category: 'Cables & Adapters' as const,
        assetTag: 'MMA-CAB-6001',
        totalQuantity: 15,
        availableQuantity: 14,
        condition: 'excellent' as const,
        location: 'Cable Bin 1',
        description: 'High speed 1Gbps Ethernet patch cables (2 meters each).',
        requiresApproval: false,
      },
    ];

    try {
      for (const item of sampleItems) {
        await addDoc(collection(db, 'lab_items'), {
          ...item,
          createdAt: serverTimestamp(),
        });
      }
    } catch (e) {
      console.error('Error seeding items:', e);
    }
  };

  // Workstation Issue & Maintenance Handlers
  const handleCreateIssue = async (data: {
    labId: string;
    station: string;
    category: IssueCategory;
    description: string;
    severity: IssueSeverity;
  }) => {
    if (!user) return;
    try {
      await addDoc(collection(db, 'workstation_issues'), {
        labId: data.labId,
        station: data.station,
        category: data.category,
        description: data.description,
        severity: data.severity,
        reportedByUid: user.uid,
        reportedByName: profile?.displayName || user.displayName || 'Lab User',
        status: 'open',
        createdAt: serverTimestamp(),
      });
      setReportIssueModal({ isOpen: false });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'workstation_issues');
    }
  };

  const handleResolveIssue = async (issueId: string, notes?: string) => {
    if (!user) return;
    try {
      const updateData: Record<string, unknown> = {
        status: 'resolved',
        resolvedAt: serverTimestamp(),
        resolvedByName: profile?.displayName || user.displayName || 'Authorized Staff',
      };
      if (notes) updateData.resolutionNotes = notes;
      await updateDoc(doc(db, 'workstation_issues', issueId), updateData);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `workstation_issues/${issueId}`);
    }
  };

  const handleUpdateIssueStatus = async (issueId: string, status: IssueStatus) => {
    try {
      await updateDoc(doc(db, 'workstation_issues', issueId), { status });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `workstation_issues/${issueId}`);
    }
  };

  const handleDeleteIssue = (issueId: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Fault Report',
      message: 'Are you sure you want to delete this fault record from the maintenance log?',
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'workstation_issues', issueId));
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        } catch (error) {
          handleFirestoreError(error, OperationType.DELETE, `workstation_issues/${issueId}`);
        }
      },
    });
  };

  // Splash & Loading Screen on system app entry
  if (isSplashActive) {
    return (
      <SplashScreen
        isLoading={loading}
        onFinished={() => setIsSplashActive(false)}
        statusMessage={loading ? "Connecting to MMA TrackLab..." : "Welcome to TrackLab"}
      />
    );
  }

  // Fallback Loading Screen (if splash ended early but Firebase is still resolving)
  if (loading) {
    return (
      <SplashScreen
        isLoading={loading}
        statusMessage="Connecting to MMA TrackLab..."
      />
    );
  }

  // Login / Welcome Screen
  if (!user) {
    return (
      <div className={`min-h-screen flex flex-col justify-between bg-zinc-50 text-zinc-900 ${isNavyWhiteLive ? 'theme-navy-white' : ''}`}>
        {/* Minimal header */}
        <header className="px-6 py-4 border-b border-zinc-200 bg-white">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-full bg-white p-0.5 border border-zinc-200 shadow-sm flex items-center justify-center shrink-0">
                <img src={schoolSealImage} alt="Mary Mediatrix of All Graces Academy Seal" className="w-full h-full object-contain" />
              </div>
              <SchoolComputerLogo size="md" showText textVariant="header" subtitle="School Laboratory Management" />
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setThemePreviewModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-blue-50 text-blue-900 border border-blue-200 rounded-lg text-xs font-semibold hover:bg-blue-100 transition-colors shadow-2xs cursor-pointer"
                title="View White & Navy Blue Theme Details"
              >
                <Palette className="w-3.5 h-3.5 text-blue-700" />
                <span className="hidden sm:inline">Theme Details</span>
              </button>
              <button
                onClick={handleLogin}
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#0A192F] hover:bg-[#142C4F] text-white rounded-lg text-xs font-semibold transition-colors shadow-xs cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Sign In with Google</span>
              </button>
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex-1 flex items-center">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center w-full">
            {/* Left Content */}
            <div className="lg:col-span-6 space-y-6">
              <div className="flex items-center gap-3.5">
                <div className="relative shrink-0">
                  <div className="w-16 h-16 rounded-full bg-white p-1 border-2 border-blue-500/30 shadow-lg flex items-center justify-center">
                    <img src={schoolSealImage} alt="Mary Mediatrix of All Graces Academy Seal" className="w-full h-full object-contain" />
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-white p-0.5 shadow-md border border-zinc-200 flex items-center justify-center">
                    <SchoolComputerLogo size="xs" />
                  </div>
                </div>
                <div className="inline-flex flex-col">
                  <div className="inline-flex items-center gap-2 text-xs font-semibold text-zinc-700 bg-zinc-100 px-3 py-1 rounded-md border border-zinc-200">
                    <span className="font-mono text-blue-900 font-bold">MMA ICT CONSOLE</span>
                    <span aria-hidden="true">·</span>
                    <span>Real-Time Station & Equipment Tracking</span>
                  </div>
                  <span className="text-[11px] font-mono text-zinc-500 mt-0.5">
                    Mary Mediatrix of All Graces Academy, Inc.
                  </span>
                </div>
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-[#0A192F] leading-tight text-balance">
                Precision laboratory schedules and live workstation attendance.
              </h1>

              <p className="text-sm sm:text-base text-zinc-600 leading-relaxed max-w-xl">
                MMA ICT TrackLab gives teachers, laboratory technicians, and multimedia arts students an interactive map of workstation occupancy, class timetables, and live check-in logs.
              </p>

              <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <button
                  onClick={handleLogin}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#0A192F] hover:bg-[#142C4F] text-white rounded-xl text-sm font-semibold transition-all active:scale-[0.98] shadow-sm cursor-pointer"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Sign In with School Account</span>
                </button>
              </div>

              {/* Three key features with quantitative rigor */}
              <div className="pt-6 border-t border-zinc-200 grid grid-cols-3 gap-4 text-xs">
                <div>
                  <span className="font-bold text-zinc-900 block font-mono text-base tabular-nums">24 / 7</span>
                  <span className="text-zinc-500">Live Workstation Tracking</span>
                </div>
                <div>
                  <span className="font-bold text-zinc-900 block font-mono text-base tabular-nums">100%</span>
                  <span className="text-zinc-500">Class Timetable Matrix</span>
                </div>
                <div>
                  <span className="font-bold text-zinc-900 block font-mono text-base tabular-nums">Instant</span>
                  <span className="text-zinc-500">Check-In & Attendance</span>
                </div>
              </div>
            </div>

            {/* Right Visual Image */}
            <div className="lg:col-span-6">
              <div className="relative rounded-2xl overflow-hidden border border-zinc-200 shadow-xl bg-zinc-900 aspect-16/9 group">
                {/* Floating Institutional Tech Badge */}
                <div className="absolute top-3.5 right-3.5 z-10 flex items-center gap-2 bg-zinc-950/85 backdrop-blur-md px-3 py-1.5 rounded-xl border border-blue-500/30 shadow-lg">
                  <SchoolComputerLogo size="sm" />
                  <div className="flex flex-col text-left">
                    <span className="text-[10px] font-mono font-bold text-amber-400 leading-none">MMA ICT</span>
                    <span className="text-[8px] font-mono text-zinc-400 uppercase tracking-wider">Accredited Lab</span>
                  </div>
                </div>

                <img
                  src={heroLabImage}
                  alt="MMA Institute of Technology Computer Laboratory with Workstations"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-102"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/80 via-zinc-950/20 to-transparent flex items-end p-6">
                  <div className="text-white">
                    <span className="font-mono text-xs uppercase tracking-wider text-amber-300 block mb-1">
                      MMA Institute of Technology · ICT Facilities
                    </span>
                    <p className="font-bold text-base leading-snug">
                      Multimedia Arts & Computer Laboratory Environment
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="border-t border-slate-200 py-6 text-center text-xs text-slate-500 bg-white">
          <span>&copy; {new Date().getFullYear()} MMA ICT TrackLab · Laboratory Management System</span>
        </footer>

        {/* White and Navy Theme Details Modal */}
        <ThemePreviewModal
          isOpen={themePreviewModalOpen}
          onClose={() => setThemePreviewModalOpen(false)}
          isLivePreview={isNavyWhiteLive}
          onToggleLivePreview={setIsNavyWhiteLive}
        />
      </div>
    );
  }

  // Standalone Print View (opened via "Open in New Tab" to bypass iframe modal restrictions)
  if (isPrintView) {
    const searchParams = new URLSearchParams(window.location.search);
    const mode = (searchParams.get('mode') as PrintMode) || 'room';
    const targetId = searchParams.get('targetId') || undefined;
    const term = searchParams.get('term') || 'First Semester, A.Y. 2024–2025';
    const signOff = searchParams.get('signOff') !== '0';

    return (
      <StandalonePrintView
        schedules={schedules}
        laboratories={laboratories}
        trainers={trainers}
        initialMode={mode}
        initialTargetId={targetId}
        initialTerm={term}
        initialSignOff={signOff}
        onBack={() => {
          window.location.href = window.location.pathname;
        }}
      />
    );
  }

  // Authorized Dashboard View
  return (
    <div className={`min-h-screen bg-zinc-50 text-zinc-900 font-sans flex flex-row selection:bg-zinc-900 selection:text-white ${isNavyWhiteLive ? 'theme-navy-white' : ''}`}>
      {/* Navigation Sidebar */}
      <Sidebar
        user={user}
        profile={profile}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        currentUserSession={currentUserSession}
        laboratories={laboratories}
        activeSessions={activeSessions}
        openIssuesCount={openIssuesCount}
        activeAcCount={acSessions.filter(s => s.status === 'active').length}
        pendingBorrowCount={borrowRequests.filter(r => r.status === 'pending').length}
        trainersCount={trainers.length}
        sectionsCount={sections.length}
        subjectsCount={subjects.length}
        isOpenMobile={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(prev => !prev)}
        onOpenCheckIn={() => setCheckInModal({ isOpen: true })}
        onCheckOut={handleCheckOut}
        onLogout={handleLogout}
        onLogin={handleLogin}
      />

      {/* Main Dashboard Canvas & Content */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen justify-between overflow-x-hidden">
        <div>
          {/* Navigation Top Bar (AppBar) */}
          <Header
            user={user}
            profile={profile}
            activeTab={activeTab}
            onOpenMobileMenu={() => setIsMobileSidebarOpen(true)}
            currentUserSession={currentUserSession}
            laboratories={laboratories}
            activeSessions={activeSessions}
            openIssuesCount={openIssuesCount}
            activeAcCount={acSessions.filter(s => s.status === 'active').length}
            pendingBorrowCount={borrowRequests.filter(r => r.status === 'pending').length}
            onOpenCheckIn={() => setCheckInModal({ isOpen: true })}
            onCheckOut={handleCheckOut}
            onLogout={handleLogout}
            onLogin={handleLogin}
            onOpenThemePreview={() => setThemePreviewModalOpen(true)}
          />

          {/* Main Content Viewport */}
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
          {activeTab === 'floorplan' && (
            <StationGrid
              laboratories={laboratories}
              activeSessions={activeSessions}
              schedules={schedules}
              trainers={trainers}
              issues={issues}
              profile={profile}
              currentUserId={user?.uid}
              onCheckInToStation={(labId, station) => {
                setCheckInModal({ isOpen: true, labId, station });
              }}
              onCheckOut={handleCheckOut}
              onBatchCheckOut={handleBatchCheckOut}
              onOpenDismissModal={(labId) => setDismissModal({ isOpen: true, labId })}
              onSelectLabForSchedule={(lab) => {
                setActiveTab('schedule');
              }}
              onReportFault={(labId, station) => {
                setReportIssueModal({ isOpen: true, labId, station });
              }}
              onResolveIssue={handleResolveIssue}
              onNavigateToMaintenance={() => setActiveTab('maintenance')}
              onLaunchKiosk={(labId) => {
                setKioskLabId(labId);
                setActiveTab('kiosk');
              }}
              onNavigateToTab={(tab) => setActiveTab(tab)}
              onOpenScheduleModal={() => setScheduleModal({ isOpen: true, schedule: null })}
              onOpenCheckIn={() => setCheckInModal({ isOpen: true })}
            />
          )}

          {activeTab === 'schedule' && (
            <TimetableMatrix
              schedules={schedules}
              laboratories={laboratories}
              trainers={trainers}
              profile={profile}
              onAddSchedule={(prefill) => setScheduleModal({ isOpen: true, schedule: prefill ? (prefill as Schedule) : null })}
              onEditSchedule={(schedule) => setScheduleModal({ isOpen: true, schedule })}
              onDeleteSchedule={handleDeleteSchedule}
              onOpenPrintModal={(mode, targetId) => setPrintScheduleModal({ isOpen: true, mode: mode || 'room', targetId })}
            />
          )}

          {activeTab === 'attendance' && (
            <LiveAttendanceView
              activeSessions={activeSessions}
              laboratories={laboratories}
              profile={profile}
              currentUserId={user?.uid}
              onOpenCheckIn={() => setCheckInModal({ isOpen: true })}
              onCheckOut={handleCheckOut}
              onBatchCheckOut={handleBatchCheckOut}
              onOpenDismissModal={(labId) => setDismissModal({ isOpen: true, labId })}
              onEditStation={(session) => setEditSessionModal({ isOpen: true, session })}
            />
          )}

          {activeTab === 'maintenance' && (
            <MaintenanceView
              issues={issues}
              laboratories={laboratories}
              profile={profile}
              onOpenReportModal={(labId, station) => {
                setReportIssueModal({ isOpen: true, labId, station });
              }}
              onResolveIssue={handleResolveIssue}
              onUpdateIssueStatus={handleUpdateIssueStatus}
              onDeleteIssue={handleDeleteIssue}
            />
          )}

          {activeTab === 'aircon' && (
            <AirconTrackingView
              laboratories={laboratories}
              acSessions={acSessions}
              profile={profile}
              onTurnOnAc={handleTurnOnAc}
              onTurnOffAc={handleTurnOffAc}
              onDeleteAcSession={profile?.role === 'admin' ? handleDeleteAcSession : undefined}
              initialSelectedLabId={selectedAcLabId}
            />
          )}

          {activeTab === 'items' && (
            <ItemBorrowingView
              laboratories={laboratories}
              items={items}
              borrowRequests={borrowRequests}
              profile={profile}
              currentUserId={user?.uid}
              onAddItem={handleAddItem}
              onUpdateItem={handleUpdateItem}
              onDeleteItem={handleDeleteItem}
              onRequestBorrow={handleRequestBorrow}
              onApproveRequest={handleApproveBorrow}
              onRejectRequest={handleRejectBorrow}
              onReturnRequest={handleReturnBorrow}
              onDeleteBorrowRequest={handleDeleteBorrowRequest}
              onSeedSampleItems={handleSeedSampleItems}
              initialSelectedItemId={selectedBorrowItemId}
            />
          )}

          {activeTab === 'labs' && (
            <LabManagementView
              laboratories={laboratories}
              activeSessions={activeSessions}
              schedules={schedules}
              profile={profile}
              acSessions={acSessions}
              items={items}
              onAddLab={() => setLabModal({ isOpen: true, lab: null })}
              onEditLab={(lab) => setLabModal({ isOpen: true, lab })}
              onDeleteLab={handleDeleteLab}
              onSelectLabForFloorplan={(labId) => {
                setActiveTab('floorplan');
              }}
              onQuickCheckIn={(labId) => {
                setCheckInModal({ isOpen: true, labId });
              }}
              onLaunchKiosk={(labId) => {
                setKioskLabId(labId);
                setActiveTab('kiosk');
              }}
              onOpenAcTracker={(labId) => {
                setSelectedAcLabId(labId);
                setActiveTab('aircon');
              }}
              onOpenItems={() => {
                setActiveTab('items');
              }}
              onOpenPrintModal={(mode, targetId) => setPrintScheduleModal({ isOpen: true, mode: mode || 'room', targetId })}
            />
          )}

          {activeTab === 'analytics' && (
            <AnalyticsView
              allSessions={allSessions}
              laboratories={laboratories}
              schedules={schedules}
              issues={issues}
              profile={profile}
            />
          )}

          {activeTab === 'kiosk' && (
            <DoorDisplayKiosk
              laboratories={laboratories}
              activeSessions={activeSessions}
              schedules={schedules}
              trainers={trainers}
              acSessions={acSessions}
              issues={issues}
              initialLabId={kioskLabId}
              onExitKiosk={() => setActiveTab('floorplan')}
              onOpenCheckInForStation={(labId, station) => {
                setCheckInModal({ isOpen: true, labId, station });
              }}
            />
          )}

          {activeTab === 'trainers' && (
            <TrainerManagementView
              trainers={trainers}
              schedules={schedules}
              laboratories={laboratories}
              profile={profile}
              onAddTrainer={() => setTrainerModal({ isOpen: true, trainer: null })}
              onEditTrainer={(trainer) => setTrainerModal({ isOpen: true, trainer })}
              onDeleteTrainer={handleDeleteTrainer}
              onQuickUpdatePhoto={handleQuickUpdateTrainerPhoto}
              onFilterScheduleByTrainer={(trainerId) => {
                setActiveTab('schedule');
              }}
              onOpenPrintModal={(mode, targetId) => setPrintScheduleModal({ isOpen: true, mode: mode || 'faculty', targetId })}
            />
          )}

          {activeTab === 'sections' && (
            <SectionsManagementView
              sections={sections}
              schedules={schedules}
              profile={profile}
              onAddSection={() => setSectionModal({ isOpen: true, section: null })}
              onEditSection={(section) => setSectionModal({ isOpen: true, section })}
              onDeleteSection={handleDeleteSection}
              onSeedSampleSections={handleSeedSampleSections}
              onOpenTimetable={() => setActiveTab('schedule')}
            />
          )}

          {activeTab === 'subjects' && (
            <SubjectsManagementView
              subjects={subjects}
              schedules={schedules}
              profile={profile}
              onAddSubject={() => setSubjectModal({ isOpen: true, subject: null })}
              onEditSubject={(subject) => setSubjectModal({ isOpen: true, subject })}
              onDeleteSubject={handleDeleteSubject}
              onSeedSampleSubjects={handleSeedSampleSubjects}
              onOpenTimetable={() => setActiveTab('schedule')}
            />
          )}

          {activeTab === 'reports' && profile?.role === 'admin' && (
            <ReportsView
              allSessions={allSessions}
              laboratories={laboratories}
              profile={profile}
              onCheckOutSession={handleCheckOut}
              onDeleteSession={handleDeleteSession}
            />
          )}

          {activeTab === 'users' && profile?.role === 'admin' && (
            <UserManagementView
              users={users}
              currentUserId={user?.uid}
              onUpdateRole={handleUpdateUserRole}
              onRemoveUser={handleRemoveUser}
            />
          )}
        </main>
      </div>

      {/* Main Content Footer */}
      <footer className="border-t border-zinc-200 py-6 text-center text-xs text-zinc-500 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>&copy; {new Date().getFullYear()} MMA ICT TrackLab · Laboratory Management System</span>
          <div className="flex items-center gap-3 text-zinc-400">
            <span>Workstation Occupancy</span>
            <span>·</span>
            <span>Equipment Loans</span>
            <span>·</span>
            <span>AC Tracking</span>
          </div>
        </div>
      </footer>
    </div>

    {/* Global Modals */}
      <CheckInModal
        laboratories={laboratories}
        activeSessions={activeSessions}
        initialLabId={checkInModal.labId}
        initialStation={checkInModal.station}
        isOpen={checkInModal.isOpen}
        onClose={() => setCheckInModal({ isOpen: false })}
        onCheckIn={handleCheckIn}
      />

      <ScheduleModal
        laboratories={laboratories}
        trainers={trainers}
        schedules={schedules}
        sections={sections}
        subjects={subjects}
        initialData={scheduleModal.schedule}
        isOpen={scheduleModal.isOpen}
        onClose={() => setScheduleModal({ isOpen: false })}
        onSubmit={(scheduleData) => {
          if (scheduleModal.schedule?.id) {
            handleUpdateSchedule(scheduleModal.schedule.id, scheduleData);
          } else {
            handleAddSchedule(scheduleData);
          }
        }}
      />

      <LabModal
        initialData={labModal.lab}
        isOpen={labModal.isOpen}
        onClose={() => setLabModal({ isOpen: false })}
        onSubmit={(name, description, capacity) => {
          if (labModal.lab?.id) {
            handleUpdateLab(labModal.lab.id, name, description, capacity);
          } else {
            handleAddLab(name, description, capacity);
          }
        }}
      />

      <TrainerModal
        initialData={trainerModal.trainer}
        isOpen={trainerModal.isOpen}
        onClose={() => setTrainerModal({ isOpen: false })}
        onSubmit={(data) => {
          if (trainerModal.trainer?.id) {
            handleUpdateTrainer(trainerModal.trainer.id, data);
          } else {
            handleAddTrainer(data);
          }
        }}
      />

      <SectionModal
        initialData={sectionModal.section}
        trainers={trainers}
        laboratories={laboratories}
        isOpen={sectionModal.isOpen}
        onClose={() => setSectionModal({ isOpen: false, section: null })}
        onSubmit={(data) => {
          if (sectionModal.section?.id) {
            handleUpdateSection(sectionModal.section.id, data);
          } else {
            handleAddSection(data);
          }
        }}
      />

      <SubjectModal
        initialData={subjectModal.subject}
        isOpen={subjectModal.isOpen}
        onClose={() => setSubjectModal({ isOpen: false, subject: null })}
        onSubmit={(data) => {
          if (subjectModal.subject?.id) {
            handleUpdateSubject(subjectModal.subject.id, data);
          } else {
            handleAddSubject(data);
          }
        }}
      />

      <EditSessionModal
        session={editSessionModal.session}
        isOpen={editSessionModal.isOpen}
        onClose={() => setEditSessionModal({ isOpen: false, session: null })}
        onSubmit={handleUpdateSessionStation}
      />

      <ConfirmDeleteModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModal.onConfirm}
      />

      <ReportIssueModal
        laboratories={laboratories}
        initialLabId={reportIssueModal.labId}
        initialStation={reportIssueModal.station}
        isOpen={reportIssueModal.isOpen}
        onClose={() => setReportIssueModal({ isOpen: false })}
        onSubmit={handleCreateIssue}
      />

      <DismissClassModal
        isOpen={dismissModal.isOpen}
        initialLabId={dismissModal.labId}
        laboratories={laboratories}
        activeSessions={activeSessions}
        schedules={schedules}
        trainers={trainers}
        profile={profile}
        onClose={() => setDismissModal({ isOpen: false })}
        onConfirmBatchCheckout={handleBatchCheckOut}
      />

      {/* Official Weekly Schedule Printable Document Modal */}
      <PrintScheduleModal
        isOpen={printScheduleModal.isOpen}
        onClose={() => setPrintScheduleModal({ isOpen: false })}
        schedules={schedules}
        laboratories={laboratories}
        trainers={trainers}
        initialMode={printScheduleModal.mode || 'room'}
        initialTargetId={printScheduleModal.targetId}
      />

      {/* Double-Booking Safety Alert Modal */}
      {conflictAlert.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-red-200 overflow-hidden animate-in zoom-in-95">
            <div className="p-5 border-b border-red-100 flex items-center gap-3 bg-red-50/70">
              <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-red-950">{conflictAlert.title}</h3>
                <p className="text-xs text-red-700">Room availability collision caught by safety guard</p>
              </div>
            </div>
            <div className="p-5 space-y-3 text-xs text-zinc-700">
              <p className="leading-relaxed bg-red-50/60 p-3 rounded-xl border border-red-200 font-medium text-red-950">
                {conflictAlert.message}
              </p>
              <p className="text-[11px] text-zinc-500">
                Please adjust the class start/end time or assign an alternative vacant laboratory room.
              </p>
              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => setConflictAlert({ isOpen: false, title: '', message: '' })}
                  className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg font-semibold transition-colors cursor-pointer text-xs shadow-xs"
                >
                  Acknowledge & Adjust
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* White and Navy Theme Details Modal */}
      <ThemePreviewModal
        isOpen={themePreviewModalOpen}
        onClose={() => setThemePreviewModalOpen(false)}
        isLivePreview={isNavyWhiteLive}
        onToggleLivePreview={setIsNavyWhiteLive}
      />
    </div>
  );
}
