import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  INITIAL_ACCOUNTS,
  INITIAL_ANNOUNCEMENTS,
  INITIAL_AUDIT_LOGS,
  INITIAL_CAMPAIGN_CONFIG,
  INITIAL_DOSSIERS,
  INITIAL_NOTIFICATIONS,
  INITIAL_SUBJECTS,
  INITIAL_SUPPORT_TICKETS,
} from '../data/demoData';
import {
  appendDeduplicatedNotification,
  createAuditEntry,
  getActiveAdminAccounts,
  getRelevantCommissionAccounts,
  reconcileDeadlinesAndReminders,
  sortNotificationsByPriority,
} from '../services/notificationEngine';
import {
  AcademicInfo,
  ApplicationStatus,
  AuditLogEntry,
  CampaignConfig,
  CandidateDossier,
  DeadlinePolicyConfig,
  DocumentCorrectionRequest,
  DocumentRequirement,
  EmailServiceStatus,
  InterviewInfo,
  NotificationActionLabel,
  NotificationItem,
  PersonalInfo,
  PublicAnnouncement,
  SharedPlatformState,
  SubjectChoice,
  SubjectChoiceStatus,
  SupportTicket,
  ThesisSubject,
  UserAccount,
  UserRole,
} from '../types/gcd';
import {
  addDaysISO,
  deriveGlobalDossierStatus,
  formatDateFR,
  getTodayISO,
} from '../utils/formatters';

const SESSION_ACCOUNT_KEY = 'gcd_usmba_session_account_v3';
const LOCAL_CACHE_KEY = 'gcd_usmba_shared_cache_v3';

export interface RegisterCandidatePayload {
  firstName: string;
  lastName: string;
  firstNameAr?: string;
  lastNameAr?: string;
  cin: string;
  cne: string;
  email: string;
  phone: string;
  password: string;
  preselectedSubjectIds?: string[];
}

export interface AdminNotificationPayload {
  targetType: 'individual' | 'all_candidates' | 'correction_pending' | 'status' | 'subject';
  targetAccountId?: string;
  targetStatus?: ApplicationStatus;
  targetSubjectId?: string;
  title: string;
  message: string;
  urgent?: boolean;
  deadline?: string;
  actionTab?: string;
  actionLabel?: NotificationActionLabel;
  sendEmail?: boolean;
}

export interface NavigationFocus {
  tab: string;
  dossierId?: string;
  subjectId?: string;
  requirementId?: string;
  timestamp: number;
}

interface GCDContextValue {
  accounts: UserAccount[];
  subjects: ThesisSubject[];
  dossiers: CandidateDossier[];
  /** Notifications filtrées et triées par priorité pour le compte connecté */
  notifications: NotificationItem[];
  campaignConfig: CampaignConfig;
  supportTickets: SupportTicket[];
  announcements: PublicAnnouncement[];
  auditLogs: AuditLogEntry[];
  emailStatus: EmailServiceStatus;
  syncMode: 'connecting' | 'synced' | 'local_only';
  currentUser: UserAccount | null;
  currentCandidateDossier: CandidateDossier | null;
  navigationFocus: NavigationFocus | null;
  clearNavigationFocus: () => void;
  openNotificationTarget: (notif: NotificationItem) => void;

  // Auth
  loginWithCredentials: (identifier: string, password: string) => { ok: boolean; error?: string };
  loginAsAccount: (accountId: string) => void;
  registerCandidate: (payload: RegisterCandidatePayload) => { ok: boolean; error?: string };
  resetAccountPassword: (email: string, cinOrCne: string, newPassword: string) => { ok: boolean; error?: string };
  logout: () => void;

  // Candidate actions
  saveCandidateDraft: (
    dossierId: string,
    updates: {
      personalInfo?: PersonalInfo;
      academicInfo?: AcademicInfo;
      subjectChoices?: SubjectChoice[];
      confirmedSubjectId?: string;
      motivation?: string;
      researchProposalSummary?: string;
    }
  ) => void;
  confirmAdmissionSubject: (dossierId: string, subjectId: string) => void;
  uploadCandidateDocument: (
    dossierId: string,
    requirementId: string,
    file: { fileName: string; fileSizeKB: number; mimeType: string }
  ) => { ok: boolean; error?: string; resubmittedCorrection?: boolean };
  submitCandidateApplication: (dossierId: string) => { ok: boolean; error?: string };
  submitFinalEnrollment: (dossierId: string) => void;
  markNotificationRead: (notificationId: string) => void;
  markAllNotificationsRead: (accountId: string) => void;

  // Commission & Dossier Inspection actions
  setPreselectionDecision: (
    dossierId: string,
    subjectId: string,
    retained: boolean,
    note: string
  ) => void;
  scheduleCandidateInterview: (
    dossierId: string,
    subjectId: string,
    interview: InterviewInfo
  ) => { modified: boolean };
  saveCandidateEvaluation: (
    dossierId: string,
    subjectId: string,
    academicScore: number,
    interviewScore: number,
    observations: string,
    evaluatorName: string
  ) => void;
  setCommissionFinalDecision: (
    dossierId: string,
    subjectId: string,
    decision: 'admis' | 'liste_attente' | 'non_retenu',
    options?: { waitlistRank?: number; rejectionReason?: string }
  ) => void;
  callNextOnWaitlist: (subjectId: string) => { ok: boolean; promotedName?: string; error?: string };

  // Document Correction & Deadlines (usable by both Commission and Admin)
  requestDocumentCorrection: (
    dossierId: string,
    requirementId: string,
    reason: string,
    deadlineISO?: string
  ) => { ok: boolean; deadline?: string; error?: string };
  extendCorrectionDeadline: (
    dossierId: string,
    requirementId: string,
    newDeadlineISO: string
  ) => { ok: boolean; error?: string };
  reviewDocumentStatus: (
    dossierId: string,
    requirementId: string,
    status: 'validee' | 'a_corriger',
    comment?: string,
    deadlineISO?: string
  ) => void;
  updateDeadlinePolicy: (partial: Partial<DeadlinePolicyConfig>) => void;
  runDeadlineCheck: (referenceDateISO?: string) => Promise<{ generatedCount: number }>;

  // Admin actions
  validateAdministrativeEnrollment: (dossierId: string) => { ok: boolean; enrollmentNumber?: string; error?: string };
  requestDossierCorrections: (dossierId: string, globalMessage: string, deadlineISO?: string) => void;
  sendAdminNotification: (payload: AdminNotificationPayload) => { ok: boolean; sentCount: number; error?: string };
  publishAnnouncement: (payload: {
    title: string;
    message: string;
    important: boolean;
    notifyCandidates: boolean;
  }) => { ok: boolean; error?: string };
  toggleAnnouncementActive: (announcementId: string) => void;
  upsertThesisSubject: (subject: Omit<ThesisSubject, 'id'> & { id?: string }) => void;
  toggleSubjectOpen: (subjectId: string) => void;
  updateCampaignSettings: (
    partial: Partial<Omit<CampaignConfig, 'documentRequirements'>>,
    options?: { notifyCandidates?: boolean }
  ) => void;
  upsertDocumentRequirement: (req: Omit<DocumentRequirement, 'id'> & { id?: string }) => void;
  deleteDocumentRequirement: (reqId: string) => void;
  upsertIntervenantAccount: (payload: {
    id?: string;
    fullName: string;
    email: string;
    role: Extract<UserRole, 'commission' | 'admin'>;
    title: string;
    laboratoire?: string;
    etablissement: string;
    password?: string;
  }) => void;
  toggleAccountActive: (accountId: string) => void;
  publishCampaignResults: (published: boolean) => void;

  // Support & Demo
  submitSupportTicket: (ticket: {
    senderName: string;
    senderEmail: string;
    dossierNumber?: string;
    category: SupportTicket['category'];
    subject: string;
    message: string;
  }) => SupportTicket;
  replyToSupportTicket: (ticketId: string, reply: string) => void;
  resetDemoData: () => void;
}

const GCDContext = createContext<GCDContextValue | undefined>(undefined);

function buildDefaultSharedState(): SharedPlatformState {
  const base: SharedPlatformState = {
    accounts: INITIAL_ACCOUNTS,
    subjects: INITIAL_SUBJECTS,
    dossiers: INITIAL_DOSSIERS,
    notifications: INITIAL_NOTIFICATIONS,
    campaignConfig: INITIAL_CAMPAIGN_CONFIG,
    supportTickets: INITIAL_SUPPORT_TICKETS,
    announcements: INITIAL_ANNOUNCEMENTS,
    auditLogs: INITIAL_AUDIT_LOGS,
  };
  return reconcileDeadlinesAndReminders(base).state;
}

function getInitialSharedState(): SharedPlatformState {
  try {
    const cached = localStorage.getItem(LOCAL_CACHE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached) as SharedPlatformState;
      if (
        parsed &&
        Array.isArray(parsed.accounts) &&
        Array.isArray(parsed.dossiers) &&
        Array.isArray(parsed.notifications) &&
        parsed.campaignConfig?.deadlinePolicy
      ) {
        return parsed;
      }
    }
  } catch {
    // ignore local cache read failure
  }
  return buildDefaultSharedState();
}

function getInitialSessionAccountId(): string | null {
  try {
    return sessionStorage.getItem(SESSION_ACCOUNT_KEY);
  } catch {
    return null;
  }
}

function containsPersonalIdentifier(text: string): boolean {
  const cinLike = /\b[A-Z]{1,2}\d{5,7}\b/i;
  const cneLike = /\b[A-Z]\d{8,10}\b/i;
  const dossierLike = /\bGCD-\d{4}-\d{3,6}\b/i;
  return cinLike.test(text) || cneLike.test(text) || dossierLike.test(text);
}

export const GCDProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const clientIdRef = useRef<string>(`gcd-${Math.random().toString(36).slice(2, 10)}`);

  const [sharedState, setSharedState] = useState<SharedPlatformState>(getInitialSharedState);
  const sharedStateRef = useRef<SharedPlatformState>(sharedState);
  sharedStateRef.current = sharedState;

  const [currentAccountId, setCurrentAccountId] = useState<string | null>(
    getInitialSessionAccountId
  );
  const [emailStatus, setEmailStatus] = useState<EmailServiceStatus>({
    configured: false,
    host: null,
    fromAddress: null,
  });
  const [syncMode, setSyncMode] = useState<'connecting' | 'synced' | 'local_only'>('connecting');
  const [navigationFocus, setNavigationFocus] = useState<NavigationFocus | null>(null);

  useEffect(() => {
    try {
      if (currentAccountId) {
        sessionStorage.setItem(SESSION_ACCOUNT_KEY, currentAccountId);
      } else {
        sessionStorage.removeItem(SESSION_ACCOUNT_KEY);
      }
    } catch {
      // ignore sessionStorage errors
    }
  }, [currentAccountId]);

  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_CACHE_KEY, JSON.stringify(sharedState));
    } catch {
      // ignore cache quota errors
    }
  }, [sharedState]);

  // Initial fetch + WebSocket real-time synchronization across sessions/devices
  useEffect(() => {
    let cancelled = false;
    let ws: WebSocket | null = null;
    let reconnectTimer: number | undefined;

    const fetchServerState = async () => {
      try {
        const res = await fetch('/api/state');
        if (!res.ok) throw new Error('HTTP error');
        const data = (await res.json()) as {
          ok: boolean;
          state: SharedPlatformState;
          emailStatus: EmailServiceStatus;
        };
        if (!cancelled && data?.ok && data.state) {
          sharedStateRef.current = data.state;
          setSharedState(data.state);
          if (data.emailStatus) setEmailStatus(data.emailStatus);
          setSyncMode('synced');
        }
      } catch {
        if (!cancelled) {
          setSyncMode('local_only');
        }
      }
    };

    const connectWs = () => {
      if (cancelled) return;
      try {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        ws = new WebSocket(`${protocol}//${window.location.host}/api/ws`);

        ws.onopen = () => {
          if (!cancelled) setSyncMode('synced');
        };

        ws.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data) as {
              type: 'state:init' | 'state:updated';
              state?: SharedPlatformState;
              emailStatus?: EmailServiceStatus;
              sourceClientId?: string | null;
            };
            if (!msg.state) return;
            if (msg.emailStatus) setEmailStatus(msg.emailStatus);
            if (msg.type === 'state:updated' && msg.sourceClientId === clientIdRef.current) {
              return;
            }
            sharedStateRef.current = msg.state;
            setSharedState(msg.state);
            setSyncMode('synced');
          } catch {
            // ignore malformed frames
          }
        };

        ws.onclose = () => {
          if (!cancelled) {
            reconnectTimer = window.setTimeout(connectWs, 3500);
          }
        };
      } catch {
        if (!cancelled) setSyncMode('local_only');
      }
    };

    fetchServerState();
    connectWs();

    return () => {
      cancelled = true;
      if (reconnectTimer) window.clearTimeout(reconnectTimer);
      if (ws) ws.close();
    };
  }, []);

  const persistToBackend = useCallback(
    async (nextState: SharedPlatformState, emailNotificationIds?: string[]) => {
      try {
        const res = await fetch('/api/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            state: nextState,
            clientId: clientIdRef.current,
            emailNotificationIds,
          }),
        });
        if (!res.ok) throw new Error('Sync failed');
        const data = (await res.json()) as {
          ok: boolean;
          state?: SharedPlatformState;
          emailStatus?: EmailServiceStatus;
        };
        if (data.emailStatus) setEmailStatus(data.emailStatus);
        if (data.ok && data.state) {
          sharedStateRef.current = data.state;
          setSharedState(data.state);
        }
        setSyncMode('synced');
      } catch {
        setSyncMode('local_only');
      }
    },
    []
  );

  const commitStateUpdate = useCallback(
    (
      updater: (prev: SharedPlatformState) => {
        next: SharedPlatformState;
        emailNotificationIds?: string[];
      }
    ) => {
      const { next, emailNotificationIds } = updater(sharedStateRef.current);
      const reconciled = reconcileDeadlinesAndReminders(next).state;
      sharedStateRef.current = reconciled;
      setSharedState(reconciled);
      void persistToBackend(reconciled, emailNotificationIds);
    },
    [persistToBackend]
  );

  const currentUser = useMemo(
    () => sharedState.accounts.find((a) => a.id === currentAccountId) || null,
    [sharedState.accounts, currentAccountId]
  );

  const currentCandidateDossier = useMemo(
    () =>
      currentUser?.role === 'candidat'
        ? sharedState.dossiers.find((d) => d.accountId === currentUser.id) || null
        : null,
    [currentUser, sharedState.dossiers]
  );

  // Strict role-scoped & priority-ordered notifications
  const scopedNotifications = useMemo(() => {
    if (!currentUser) return [];
    const mine = sharedState.notifications.filter(
      (n) => n.recipientAccountId === currentUser.id
    );
    return sortNotificationsByPriority(mine);
  }, [currentUser, sharedState.notifications]);

  const clearNavigationFocus = useCallback(() => {
    setNavigationFocus(null);
  }, []);

  const markNotificationRead = useCallback(
    (notificationId: string) => {
      const now = new Date().toISOString();
      commitStateUpdate((prev) => ({
        next: {
          ...prev,
          notifications: prev.notifications.map((n) =>
            n.id === notificationId && !n.read ? { ...n, read: true, readAt: now } : n
          ),
        },
      }));
    },
    [commitStateUpdate]
  );

  const openNotificationTarget = useCallback(
    (notif: NotificationItem) => {
      if (!notif.read) {
        markNotificationRead(notif.id);
      }
      if (notif.actionTab) {
        setNavigationFocus({
          tab: notif.actionTab,
          dossierId: notif.targetDossierId,
          subjectId: notif.targetSubjectId,
          requirementId: notif.targetRequirementId,
          timestamp: Date.now(),
        });
      }
    },
    [markNotificationRead]
  );

  const markAllNotificationsRead = useCallback(
    (accountId: string) => {
      const now = new Date().toISOString();
      commitStateUpdate((prev) => ({
        next: {
          ...prev,
          notifications: prev.notifications.map((n) =>
            n.recipientAccountId === accountId && !n.read
              ? { ...n, read: true, readAt: now }
              : n
          ),
        },
      }));
    },
    [commitStateUpdate]
  );

  // AUTH
  const loginWithCredentials = (identifier: string, password: string) => {
    const trimmed = identifier.trim().toLowerCase();
    const account = sharedStateRef.current.accounts.find(
      (a) =>
        a.email.toLowerCase() === trimmed ||
        (a.cin && a.cin.toLowerCase() === trimmed) ||
        (a.cne && a.cne.toLowerCase() === trimmed)
    );
    if (!account) {
      return { ok: false, error: 'Aucun compte trouvé avec cet identifiant.' };
    }
    if (!account.active) {
      return { ok: false, error: 'Ce compte est désactivé par l’administration.' };
    }
    if (account.password !== password) {
      return { ok: false, error: 'Mot de passe incorrect.' };
    }
    setCurrentAccountId(account.id);
    return { ok: true };
  };

  const loginAsAccount = (accountId: string) => {
    const account = sharedStateRef.current.accounts.find((a) => a.id === accountId);
    if (account && account.active) {
      setCurrentAccountId(account.id);
      setNavigationFocus(null);
    }
  };

  const registerCandidate = (payload: RegisterCandidatePayload) => {
    const cur = sharedStateRef.current;
    const emailNorm = payload.email.trim().toLowerCase();
    const cinNorm = payload.cin.trim().toUpperCase();
    const cneNorm = payload.cne.trim().toUpperCase();

    if (cur.accounts.some((a) => a.email.toLowerCase() === emailNorm)) {
      return { ok: false, error: 'Un compte existe déjà avec cette adresse e-mail.' };
    }
    if (cur.accounts.some((a) => a.cin?.toUpperCase() === cinNorm)) {
      return { ok: false, error: 'Un dossier existe déjà avec ce numéro de CIN / Passeport.' };
    }

    const now = new Date().toISOString();
    const accountId = `acc-cand-${Date.now()}`;
    const randomSeq = Math.floor(1000 + Math.random() * 8999);
    const dossierNumber = `GCD-2026-${randomSeq}`;

    const maxChoices = Math.max(1, cur.campaignConfig.requiredSubjectChoices || 3);
    const distinctIds = Array.from(new Set(payload.preselectedSubjectIds || [])).slice(
      0,
      maxChoices
    );
    const initialChoices: SubjectChoice[] = distinctIds.map((subjectId, idx) => ({
      priority: idx + 1,
      subjectId,
      status: 'soumis',
    }));

    const newAccount: UserAccount = {
      id: accountId,
      role: 'candidat',
      fullName: `${payload.firstName.trim()} ${payload.lastName.trim()}`,
      email: payload.email.trim(),
      cin: cinNorm,
      cne: cneNorm,
      password: payload.password,
      active: true,
      emailNotificationsOptIn: true,
    };

    const newDossier: CandidateDossier = {
      id: `dos-${Date.now()}`,
      accountId,
      dossierNumber,
      personalInfo: {
        lastName: payload.lastName.trim(),
        firstName: payload.firstName.trim(),
        lastNameAr: payload.lastNameAr?.trim() || '',
        firstNameAr: payload.firstNameAr?.trim() || '',
        cin: cinNorm,
        cne: cneNorm,
        birthDate: '',
        birthPlace: '',
        nationality: 'Marocaine',
        email: payload.email.trim(),
        phone: payload.phone.trim(),
        city: '',
        address: '',
        employmentStatus: 'etudiant',
      },
      academicInfo: {
        bacSeries: '',
        bacYear: '',
        bacMention: 'Bien',
        bacAverage: '',
        licenceTitle: '',
        licenceInstitution: '',
        licenceUniversity: 'Université Sidi Mohamed Ben Abdellah - Fès',
        licenceYear: '',
        licenceAverage: '',
        masterType: 'Master Recherche',
        masterTitle: '',
        masterSpecialty: '',
        masterInstitution: '',
        masterUniversity: 'Université Sidi Mohamed Ben Abdellah - Fès',
        masterYear: '',
        masterAverage: '',
        pfeTitle: '',
        languages: 'Arabe, Français, Anglais',
      },
      subjectChoices: initialChoices,
      motivation: '',
      researchProposalSummary: '',
      documents: [],
      correctionRequests: [],
      status: 'brouillon',
      draftSavedAt: now,
      updatedAt: now,
    };

    commitStateUpdate((prev) => {
      const { notifications } = appendDeduplicatedNotification(prev.notifications, {
        recipientAccountId: accountId,
        recipientRole: 'candidat',
        title: `Dossier créé (${dossierNumber})`,
        message: `Sélectionnez vos ${maxChoices} sujets de thèse et déposez vos pièces avant le ${formatDateFR(prev.campaignConfig.submissionDeadline)}.`,
        category: 'info',
        actionRequired: true,
        deadline: prev.campaignConfig.submissionDeadline,
        actionTab: 'sujets',
        actionLabel: 'Voir',
        targetDossierId: newDossier.id,
        dedupeKey: `welcome-${newDossier.id}`,
      });

      return {
        next: {
          ...prev,
          accounts: [...prev.accounts, newAccount],
          dossiers: [...prev.dossiers, newDossier],
          notifications,
        },
      };
    });

    setCurrentAccountId(accountId);
    return { ok: true };
  };

  const resetAccountPassword = (email: string, cinOrCne: string, newPassword: string) => {
    const emailNorm = email.trim().toLowerCase();
    const idNorm = cinOrCne.trim().toLowerCase();
    const target = sharedStateRef.current.accounts.find(
      (a) =>
        a.email.toLowerCase() === emailNorm &&
        ((a.cin && a.cin.toLowerCase() === idNorm) || (a.cne && a.cne.toLowerCase() === idNorm))
    );
    if (!target) {
      return {
        ok: false,
        error: 'Aucune correspondance trouvée entre cet e-mail et ce CIN / CNE.',
      };
    }
    commitStateUpdate((prev) => ({
      next: {
        ...prev,
        accounts: prev.accounts.map((a) =>
          a.id === target.id ? { ...a, password: newPassword } : a
        ),
      },
    }));
    return { ok: true };
  };

  const logout = () => {
    setCurrentAccountId(null);
    setNavigationFocus(null);
  };

  // CANDIDATE ACTIONS
  const saveCandidateDraft: GCDContextValue['saveCandidateDraft'] = (dossierId, updates) => {
    const now = new Date().toISOString();
    commitStateUpdate((prev) => ({
      next: {
        ...prev,
        dossiers: prev.dossiers.map((d) => {
          if (d.id !== dossierId) return d;
          const normalizedChoices = updates.subjectChoices
            ? updates.subjectChoices.map((ch, idx) => ({
                ...ch,
                priority: idx + 1,
              }))
            : d.subjectChoices;
          return {
            ...d,
            personalInfo: updates.personalInfo ?? d.personalInfo,
            academicInfo: updates.academicInfo ?? d.academicInfo,
            subjectChoices: normalizedChoices,
            confirmedSubjectId: updates.confirmedSubjectId ?? d.confirmedSubjectId,
            motivation: updates.motivation ?? d.motivation,
            researchProposalSummary:
              updates.researchProposalSummary ?? d.researchProposalSummary,
            draftSavedAt: now,
            updatedAt: now,
          };
        }),
      },
    }));
  };

  const confirmAdmissionSubject = (dossierId: string, subjectId: string) => {
    const now = new Date().toISOString();
    commitStateUpdate((prev) => ({
      next: {
        ...prev,
        dossiers: prev.dossiers.map((d) =>
          d.id === dossierId ? { ...d, confirmedSubjectId: subjectId, updatedAt: now } : d
        ),
      },
    }));
  };

  const uploadCandidateDocument: GCDContextValue['uploadCandidateDocument'] = (
    dossierId,
    requirementId,
    file
  ) => {
    const cur = sharedStateRef.current;
    const req = cur.campaignConfig.documentRequirements.find((r) => r.id === requirementId);
    const targetDossier = cur.dossiers.find((d) => d.id === dossierId);
    if (!req || !targetDossier) {
      return { ok: false, error: 'Pièce ou dossier introuvable.' };
    }

    const ext = file.fileName.split('.').pop()?.toUpperCase() || '';
    const normalizedExt = ext === 'JPEG' ? 'JPG' : ext;
    if (!req.acceptedFormats.includes(normalizedExt)) {
      return {
        ok: false,
        error: `Format non accepté (${ext || 'inconnu'}). Formats autorisés : ${req.acceptedFormats.join(', ')}.`,
      };
    }

    const maxKB = req.maxSizeMB * 1024;
    if (file.fileSizeKB > maxKB) {
      return {
        ok: false,
        error: `Fichier trop volumineux (${(file.fileSizeKB / 1024).toFixed(1)} Mo). Max : ${req.maxSizeMB} Mo.`,
      };
    }

    const existingDoc = targetDossier.documents.find((d) => d.requirementId === requirementId);
    const pendingCorr = (targetDossier.correctionRequests || []).find(
      (c) => c.requirementId === requirementId && (c.status === 'pending' || c.status === 'resubmitted')
    );
    const isCorrectionResubmission =
      existingDoc?.status === 'a_corriger' || Boolean(pendingCorr);

    const now = new Date().toISOString();

    commitStateUpdate((prev) => {
      let notifications = prev.notifications.map((n) =>
        n.recipientAccountId === targetDossier.accountId &&
        n.targetRequirementId === requirementId &&
        (n.category === 'correction' || n.category === 'rappel')
          ? { ...n, read: true, readAt: n.readAt || now, actionRequired: false, urgent: false }
          : n
      );
      const emailIds: string[] = [];
      const audits: AuditLogEntry[] = [];

      if (isCorrectionResubmission) {
        const candidateName = `${targetDossier.personalInfo.firstName} ${targetDossier.personalInfo.lastName}`;
        const admins = getActiveAdminAccounts(prev.accounts);
        for (const admin of admins) {
          const res = appendDeduplicatedNotification(notifications, {
            recipientAccountId: admin.id,
            recipientRole: 'admin',
            title: `Document corrigé soumis — ${targetDossier.dossierNumber}`,
            message: `${candidateName} a déposé une nouvelle version pour ${req.code} (${file.fileName}).`,
            category: 'correction',
            actionRequired: true,
            actionTab: 'verification',
            actionLabel: 'Voir',
            targetDossierId: targetDossier.id,
            targetRequirementId: req.id,
            dedupeKey: `admin-resub-${admin.id}-${targetDossier.id}-${req.id}-${now.slice(0, 16)}`,
          });
          notifications = res.notifications;
          if (res.created) emailIds.push(res.created.id);
        }

        const commissions = getRelevantCommissionAccounts(
          prev.accounts,
          prev.subjects,
          targetDossier.subjectChoices.map((c) => c.subjectId)
        );
        for (const comm of commissions) {
          const res = appendDeduplicatedNotification(notifications, {
            recipientAccountId: comm.id,
            recipientRole: 'commission',
            title: `Document régularisé — ${targetDossier.dossierNumber}`,
            message: `${candidateName} a mis à jour la pièce ${req.code}.`,
            category: 'correction',
            actionTab: 'candidatures',
            actionLabel: 'Voir',
            targetDossierId: targetDossier.id,
            targetRequirementId: req.id,
            dedupeKey: `comm-resub-${comm.id}-${targetDossier.id}-${req.id}-${now.slice(0, 16)}`,
          });
          notifications = res.notifications;
        }

        audits.push(
          createAuditEntry({
            actorName: candidateName,
            actorRole: 'candidat',
            eventType: 'document_resoumis',
            summary: `Nouveau fichier déposé pour ${req.code} (${file.fileName}).`,
            dossierNumber: targetDossier.dossierNumber,
            targetAccountId: targetDossier.accountId,
            timestamp: now,
          })
        );
      }

      return {
        next: {
          ...prev,
          dossiers: prev.dossiers.map((d) => {
            if (d.id !== dossierId) return d;
            const exists = d.documents.some((doc) => doc.requirementId === requirementId);
            const updatedDoc = {
              requirementId,
              fileName: file.fileName,
              fileSizeKB: Math.max(12, Math.round(file.fileSizeKB)),
              mimeType: file.mimeType,
              uploadedAt: now,
              status: 'deposee' as const,
              reviewComment: undefined,
              correctionDeadline: undefined,
            };
            const updatedCorr = (d.correctionRequests || []).map((c) =>
              c.requirementId === requirementId && c.status === 'pending'
                ? { ...c, status: 'resubmitted' as const, resubmittedAt: now }
                : c
            );
            return {
              ...d,
              documents: exists
                ? d.documents.map((doc) =>
                    doc.requirementId === requirementId ? updatedDoc : doc
                  )
                : [...d.documents, updatedDoc],
              correctionRequests: updatedCorr,
              draftSavedAt: now,
              updatedAt: now,
            };
          }),
          notifications,
          auditLogs: [...audits, ...prev.auditLogs].slice(0, 250),
        },
        emailNotificationIds: emailIds,
      };
    });

    return { ok: true, resubmittedCorrection: isCorrectionResubmission };
  };

  const submitCandidateApplication = (dossierId: string) => {
    const cur = sharedStateRef.current;
    if (!cur.campaignConfig.campaignOpen) {
      return { ok: false, error: 'La campagne de préinscription est clôturée.' };
    }
    const target = cur.dossiers.find((d) => d.id === dossierId);
    if (!target) return { ok: false, error: 'Dossier introuvable.' };

    const requiredCount = Math.max(1, cur.campaignConfig.requiredSubjectChoices || 3);
    if (target.subjectChoices.length < requiredCount) {
      return {
        ok: false,
        error: `Sélectionnez ${requiredCount} sujets avant de soumettre (${target.subjectChoices.length}/${requiredCount}).`,
      };
    }

    const now = new Date().toISOString();
    const codesSummary = target.subjectChoices
      .map((ch) => {
        const s = cur.subjects.find((sub) => sub.id === ch.subjectId);
        return `Choix ${ch.priority} : ${s?.code || ch.subjectId}`;
      })
      .join(' · ');

    commitStateUpdate((prev) => {
      let notifications = [...prev.notifications];
      const emailIds: string[] = [];

      const candRes = appendDeduplicatedNotification(notifications, {
        recipientAccountId: target.accountId,
        recipientRole: 'candidat',
        title: `Candidature soumise (${target.dossierNumber})`,
        message: `Dossier transmis aux commissions (${codesSummary}).`,
        category: 'dossier',
        actionTab: 'suivi',
        actionLabel: 'Voir',
        targetDossierId: target.id,
        dedupeKey: `cand-submit-${target.id}`,
      });
      notifications = candRes.notifications;
      if (candRes.created) emailIds.push(candRes.created.id);

      const commissions = getRelevantCommissionAccounts(
        prev.accounts,
        prev.subjects,
        target.subjectChoices.map((c) => c.subjectId)
      );
      for (const comm of commissions) {
        const commRes = appendDeduplicatedNotification(notifications, {
          recipientAccountId: comm.id,
          recipientRole: 'commission',
          title: `Nouvelle candidature — ${target.dossierNumber}`,
          message: `${target.personalInfo.firstName} ${target.personalInfo.lastName} a soumis sa candidature (${codesSummary}).`,
          category: 'dossier',
          actionRequired: true,
          actionTab: 'candidatures',
          actionLabel: 'Voir',
          targetDossierId: target.id,
          targetSubjectId: target.subjectChoices[0]?.subjectId,
          dedupeKey: `comm-submit-${comm.id}-${target.id}`,
        });
        notifications = commRes.notifications;
      }

      for (const admin of getActiveAdminAccounts(prev.accounts)) {
        const admRes = appendDeduplicatedNotification(notifications, {
          recipientAccountId: admin.id,
          recipientRole: 'admin',
          title: `Dossier soumis — ${target.dossierNumber}`,
          message: `Pièces justificatives à contrôler pour ${target.personalInfo.firstName} ${target.personalInfo.lastName}.`,
          category: 'dossier',
          actionTab: 'verification',
          actionLabel: 'Voir',
          targetDossierId: target.id,
          dedupeKey: `admin-submit-${admin.id}-${target.id}`,
        });
        notifications = admRes.notifications;
      }

      const audit = createAuditEntry({
        actorName: `${target.personalInfo.firstName} ${target.personalInfo.lastName}`,
        actorRole: 'candidat',
        eventType: 'statut_candidature',
        summary: `Soumission officielle du dossier (${target.subjectChoices.length} sujets).`,
        dossierNumber: target.dossierNumber,
        targetAccountId: target.accountId,
        timestamp: now,
      });

      return {
        next: {
          ...prev,
          dossiers: prev.dossiers.map((d) =>
            d.id === dossierId
              ? {
                  ...d,
                  status: 'soumis',
                  subjectChoices: d.subjectChoices.map((ch, idx) => ({
                    ...ch,
                    priority: idx + 1,
                    status: 'soumis',
                  })),
                  submittedAt: now,
                  draftSavedAt: now,
                  updatedAt: now,
                }
              : d
          ),
          notifications,
          auditLogs: [audit, ...prev.auditLogs].slice(0, 250),
        },
        emailNotificationIds: emailIds,
      };
    });

    return { ok: true };
  };

  const submitFinalEnrollment = (dossierId: string) => {
    const target = sharedStateRef.current.dossiers.find((d) => d.id === dossierId);
    if (!target) return;
    const now = new Date().toISOString();

    commitStateUpdate((prev) => {
      let notifications = [...prev.notifications];
      const candRes = appendDeduplicatedNotification(notifications, {
        recipientAccountId: target.accountId,
        recipientRole: 'candidat',
        title: 'Dossier d’inscription transmis',
        message: 'Vos pièces d’inscription définitive sont en cours de vérification par le CEDoc.',
        category: 'dossier',
        actionTab: 'suivi',
        actionLabel: 'Voir',
        targetDossierId: target.id,
        dedupeKey: `cand-enroll-sub-${target.id}`,
      });
      notifications = candRes.notifications;

      for (const admin of getActiveAdminAccounts(prev.accounts)) {
        const admRes = appendDeduplicatedNotification(notifications, {
          recipientAccountId: admin.id,
          recipientRole: 'admin',
          title: `Inscription définitive à valider — ${target.dossierNumber}`,
          message: `${target.personalInfo.firstName} ${target.personalInfo.lastName} a transmis son dossier d’inscription définitive.`,
          category: 'dossier',
          actionRequired: true,
          deadline: prev.campaignConfig.enrollmentDeadline,
          actionTab: 'verification',
          actionLabel: 'Voir',
          targetDossierId: target.id,
          dedupeKey: `admin-enroll-sub-${admin.id}-${target.id}`,
        });
        notifications = admRes.notifications;
      }

      const audit = createAuditEntry({
        actorName: `${target.personalInfo.firstName} ${target.personalInfo.lastName}`,
        actorRole: 'candidat',
        eventType: 'inscription',
        summary: 'Dossier d’inscription définitive transmis au CEDoc.',
        dossierNumber: target.dossierNumber,
        targetAccountId: target.accountId,
        timestamp: now,
      });

      return {
        next: {
          ...prev,
          dossiers: prev.dossiers.map((d) =>
            d.id === dossierId ? { ...d, enrollmentSubmittedAt: now, updatedAt: now } : d
          ),
          notifications,
          auditLogs: [audit, ...prev.auditLogs].slice(0, 250),
        },
      };
    });
  };

  // COMMISSION ACTIONS
  const setPreselectionDecision = (
    dossierId: string,
    subjectId: string,
    retained: boolean,
    note: string
  ) => {
    const cur = sharedStateRef.current;
    const target = cur.dossiers.find((d) => d.id === dossierId);
    const subject = cur.subjects.find((s) => s.id === subjectId);
    const choice = target?.subjectChoices.find((c) => c.subjectId === subjectId);
    if (!target || !choice) return;

    const now = new Date().toISOString();
    const nextChoiceStatus: SubjectChoiceStatus = retained ? 'en_cours' : 'non_retenu';
    const cleanNote = note.trim();
    const codeLabel = subject?.code || subjectId;

    commitStateUpdate((prev) => {
      let notifications = [...prev.notifications];
      const emailIds: string[] = [];

      const notifRes = appendDeduplicatedNotification(notifications, {
        recipientAccountId: target.accountId,
        recipientRole: 'candidat',
        title: retained
          ? `Présélection retenue (${codeLabel})`
          : `Dossier non retenu (${codeLabel})`,
        message: retained
          ? `Votre Choix ${choice.priority} est présélectionné pour un entretien.`
          : `Choix ${choice.priority} non retenu. Motif : ${cleanNote || 'Prérequis scientifiques non remplis.'}`,
        category: 'resultat',
        actionTab: 'suivi',
        actionLabel: retained ? 'Voir' : 'Consulter le résultat',
        targetDossierId: target.id,
        targetSubjectId: subjectId,
        dedupeKey: `presel-${target.id}-${subjectId}-${nextChoiceStatus}-${cleanNote.slice(0, 24)}`,
      });
      notifications = notifRes.notifications;
      if (notifRes.created) emailIds.push(notifRes.created.id);

      const audit = createAuditEntry({
        actorName: currentUser?.fullName || 'Commission de sélection',
        actorRole: currentUser?.role || 'commission',
        eventType: 'statut_candidature',
        summary: `${retained ? 'Présélection retenue' : 'Refus présélection'} sur ${codeLabel} (Choix ${choice.priority}).`,
        dossierNumber: target.dossierNumber,
        targetAccountId: target.accountId,
        timestamp: now,
      });

      return {
        next: {
          ...prev,
          dossiers: prev.dossiers.map((d) => {
            if (d.id !== dossierId) return d;
            const updatedChoices = d.subjectChoices.map((c) =>
              c.subjectId === subjectId
                ? {
                    ...c,
                    status: nextChoiceStatus,
                    preselectionNote: cleanNote || undefined,
                    rejectionReason: retained
                      ? undefined
                      : cleanNote || 'Prérequis scientifiques non remplis.',
                  }
                : c
            );
            return {
              ...d,
              subjectChoices: updatedChoices,
              status: deriveGlobalDossierStatus(updatedChoices, d.status),
              updatedAt: now,
            };
          }),
          notifications,
          auditLogs: [audit, ...prev.auditLogs].slice(0, 250),
        },
        emailNotificationIds: emailIds,
      };
    });
  };

  const scheduleCandidateInterview = (
    dossierId: string,
    subjectId: string,
    interview: InterviewInfo
  ): { modified: boolean } => {
    const cur = sharedStateRef.current;
    const target = cur.dossiers.find((d) => d.id === dossierId);
    const subject = cur.subjects.find((s) => s.id === subjectId);
    const choice = target?.subjectChoices.find((c) => c.subjectId === subjectId);
    if (!target || !choice) return { modified: false };

    const previousInterview = choice.interview;
    const isModified = Boolean(
      previousInterview &&
        (previousInterview.date !== interview.date ||
          previousInterview.time !== interview.time ||
          previousInterview.modality !== interview.modality ||
          previousInterview.location !== interview.location)
    );

    const now = new Date().toISOString();
    const codeLabel = subject?.code || subjectId;
    const modalityLabel =
      interview.modality === 'presentiel' ? 'Présentiel' : 'Visioconférence';

    commitStateUpdate((prev) => {
      let notifications = [...prev.notifications];
      const emailIds: string[] = [];

      const candRes = appendDeduplicatedNotification(notifications, {
        recipientAccountId: target.accountId,
        recipientRole: 'candidat',
        title: isModified
          ? `Modification d’entretien (${codeLabel})`
          : `Convocation à l’entretien (${codeLabel})`,
        message: isModified
          ? `Nouvel horaire Choix ${choice.priority} : ${formatDateFR(interview.date)} à ${interview.time} (${modalityLabel} — ${interview.location}).`
          : `Entretien Choix ${choice.priority} prévu le ${formatDateFR(interview.date)} à ${interview.time} (${modalityLabel} — ${interview.location}).`,
        category: 'entretien',
        urgent: isModified,
        actionRequired: true,
        deadline: interview.date,
        actionTab: 'suivi',
        actionLabel: 'Voir',
        targetDossierId: target.id,
        targetSubjectId: subjectId,
        dedupeKey: `int-${target.id}-${subjectId}-${interview.date}-${interview.time}-${interview.modality}-${interview.location}`,
      });
      notifications = candRes.notifications;
      if (candRes.created) emailIds.push(candRes.created.id);

      const commissions = getRelevantCommissionAccounts(prev.accounts, prev.subjects, [
        subjectId,
      ]);
      for (const comm of commissions) {
        if (comm.id === currentUser?.id) continue;
        const commRes = appendDeduplicatedNotification(notifications, {
          recipientAccountId: comm.id,
          recipientRole: 'commission',
          title: `${isModified ? 'Horaire modifié' : 'Entretien planifié'} — ${codeLabel}`,
          message: `${target.personalInfo.firstName} ${target.personalInfo.lastName} : ${formatDateFR(interview.date)} à ${interview.time}.`,
          category: 'entretien',
          deadline: interview.date,
          actionTab: 'entretiens',
          actionLabel: 'Voir',
          targetDossierId: target.id,
          targetSubjectId: subjectId,
          dedupeKey: `comm-int-${comm.id}-${target.id}-${subjectId}-${interview.date}-${interview.time}`,
        });
        notifications = commRes.notifications;
      }

      const audit = createAuditEntry({
        actorName: currentUser?.fullName || 'Commission de sélection',
        actorRole: currentUser?.role || 'commission',
        eventType: 'entretien',
        summary: `${isModified ? 'Modification' : 'Programmation'} d’entretien sur ${codeLabel} (${interview.date} ${interview.time}).`,
        dossierNumber: target.dossierNumber,
        targetAccountId: target.accountId,
        timestamp: now,
      });

      return {
        next: {
          ...prev,
          dossiers: prev.dossiers.map((d) => {
            if (d.id !== dossierId) return d;
            const updatedChoices = d.subjectChoices.map((c) =>
              c.subjectId === subjectId
                ? { ...c, status: 'entretien' as const, interview }
                : c
            );
            return {
              ...d,
              subjectChoices: updatedChoices,
              status: deriveGlobalDossierStatus(updatedChoices, d.status),
              updatedAt: now,
            };
          }),
          notifications,
          auditLogs: [audit, ...prev.auditLogs].slice(0, 250),
        },
        emailNotificationIds: emailIds,
      };
    });

    return { modified: isModified };
  };

  const saveCandidateEvaluation = (
    dossierId: string,
    subjectId: string,
    academicScore: number,
    interviewScore: number,
    observations: string,
    evaluatorName: string
  ) => {
    const cur = sharedStateRef.current;
    const { dossierWeight, interviewWeight } = cur.campaignConfig;
    const weightedScore = Number(
      (
        (academicScore * dossierWeight + interviewScore * interviewWeight) /
        Math.max(1, dossierWeight + interviewWeight)
      ).toFixed(2)
    );
    const now = new Date().toISOString();
    const target = cur.dossiers.find((d) => d.id === dossierId);
    const subject = cur.subjects.find((s) => s.id === subjectId);

    commitStateUpdate((prev) => {
      const audit = createAuditEntry({
        actorName: evaluatorName,
        actorRole: currentUser?.role || 'commission',
        eventType: 'resultat',
        summary: `Notes enregistrées sur ${subject?.code || subjectId} : Moyenne ${weightedScore}/20.`,
        dossierNumber: target?.dossierNumber,
        targetAccountId: target?.accountId,
        timestamp: now,
      });

      return {
        next: {
          ...prev,
          dossiers: prev.dossiers.map((d) => {
            if (d.id !== dossierId) return d;
            const updatedChoices = d.subjectChoices.map((c) =>
              c.subjectId === subjectId
                ? {
                    ...c,
                    evaluation: {
                      academicScore,
                      interviewScore,
                      weightedScore,
                      observations,
                      evaluatedBy: evaluatorName,
                      evaluatedAt: now,
                    },
                  }
                : c
            );
            return { ...d, subjectChoices: updatedChoices, updatedAt: now };
          }),
          auditLogs: [audit, ...prev.auditLogs].slice(0, 250),
        },
      };
    });
  };

  const setCommissionFinalDecision: GCDContextValue['setCommissionFinalDecision'] = (
    dossierId,
    subjectId,
    decision,
    options
  ) => {
    const cur = sharedStateRef.current;
    const target = cur.dossiers.find((d) => d.id === dossierId);
    const subject = cur.subjects.find((s) => s.id === subjectId);
    const choice = target?.subjectChoices.find((c) => c.subjectId === subjectId);
    if (!target || !choice) return;

    const now = new Date().toISOString();
    const codeLabel = subject?.code || subjectId;
    const rank = options?.waitlistRank || 1;
    const reason =
      options?.rejectionReason?.trim() || 'Classement au-delà des places ouvertes.';

    let title = '';
    let message = '';
    if (decision === 'admis') {
      title = `Admis(e) en liste principale (${codeLabel})`;
      message = `Choix ${choice.priority} retenu. Déposez votre dossier d’inscription définitive avant le ${formatDateFR(cur.campaignConfig.enrollmentDeadline)}.`;
    } else if (decision === 'liste_attente') {
      title = `Liste d’attente — Rang ${rank} (${codeLabel})`;
      message = `Classé(e) au rang ${rank} sur le Choix ${choice.priority}. Notification automatique en cas de désistement.`;
    } else {
      title = `Candidature non retenue (${codeLabel})`;
      message = `Choix ${choice.priority} non retenu. Motif : ${reason}`;
    }

    commitStateUpdate((prev) => {
      let notifications = [...prev.notifications];
      const emailIds: string[] = [];

      const res = appendDeduplicatedNotification(notifications, {
        recipientAccountId: target.accountId,
        recipientRole: 'candidat',
        title,
        message,
        category: 'resultat',
        urgent: decision === 'admis',
        actionRequired: decision === 'admis',
        deadline: decision === 'admis' ? prev.campaignConfig.enrollmentDeadline : undefined,
        actionTab: 'suivi',
        actionLabel: 'Consulter le résultat',
        targetDossierId: target.id,
        targetSubjectId: subjectId,
        dedupeKey: `final-${target.id}-${subjectId}-${decision}-${decision === 'liste_attente' ? rank : ''}`,
      });
      notifications = res.notifications;
      if (res.created) emailIds.push(res.created.id);

      const audit = createAuditEntry({
        actorName: currentUser?.fullName || 'Commission de sélection',
        actorRole: currentUser?.role || 'commission',
        eventType: 'resultat',
        summary: `Décision ${decision} sur ${codeLabel} (Choix ${choice.priority}).`,
        dossierNumber: target.dossierNumber,
        targetAccountId: target.accountId,
        timestamp: now,
      });

      return {
        next: {
          ...prev,
          dossiers: prev.dossiers.map((d) => {
            if (d.id !== dossierId) return d;
            const updatedChoices = d.subjectChoices.map((c) =>
              c.subjectId === subjectId
                ? {
                    ...c,
                    status: decision,
                    waitlistRank: decision === 'liste_attente' ? rank : undefined,
                    rejectionReason: decision === 'non_retenu' ? reason : undefined,
                  }
                : c
            );
            const nextGlobalStatus = deriveGlobalDossierStatus(updatedChoices, d.status);
            const nextConfirmedSubjectId =
              decision === 'admis'
                ? d.confirmedSubjectId || subjectId
                : d.confirmedSubjectId === subjectId
                ? updatedChoices.find((c) => c.status === 'admis')?.subjectId
                : d.confirmedSubjectId;

            return {
              ...d,
              subjectChoices: updatedChoices,
              confirmedSubjectId: nextConfirmedSubjectId,
              status: nextGlobalStatus,
              updatedAt: now,
            };
          }),
          notifications,
          auditLogs: [audit, ...prev.auditLogs].slice(0, 250),
        },
        emailNotificationIds: emailIds,
      };
    });
  };

  const callNextOnWaitlist = (subjectId: string) => {
    const cur = sharedStateRef.current;
    const subject = cur.subjects.find((s) => s.id === subjectId);
    const waitlistedEntries = cur.dossiers
      .filter((d) => d.status !== 'brouillon')
      .map((d) => ({
        dossier: d,
        choice: d.subjectChoices.find(
          (c) => c.subjectId === subjectId && c.status === 'liste_attente'
        ),
      }))
      .filter(
        (item): item is { dossier: CandidateDossier; choice: SubjectChoice } =>
          Boolean(item.choice)
      )
      .sort((a, b) => (a.choice.waitlistRank ?? 99) - (b.choice.waitlistRank ?? 99));

    if (waitlistedEntries.length === 0) {
      return { ok: false, error: 'Aucun candidat en liste d’attente pour ce sujet.' };
    }

    const promoted = waitlistedEntries[0];
    const now = new Date().toISOString();
    const codeLabel = subject?.code || subjectId;

    commitStateUpdate((prev) => {
      let notifications = [...prev.notifications];
      const emailIds: string[] = [];

      const res = appendDeduplicatedNotification(notifications, {
        recipientAccountId: promoted.dossier.accountId,
        recipientRole: 'candidat',
        title: `Admission en liste principale (${codeLabel})`,
        message: `Suite à une place libérée sur votre Choix ${promoted.choice.priority}, vous passez en liste principale. Déposez vos pièces d’inscription avant le ${formatDateFR(prev.campaignConfig.enrollmentDeadline)}.`,
        category: 'resultat',
        urgent: true,
        actionRequired: true,
        deadline: prev.campaignConfig.enrollmentDeadline,
        actionTab: 'pieces',
        actionLabel: 'Consulter le résultat',
        targetDossierId: promoted.dossier.id,
        targetSubjectId: subjectId,
        dedupeKey: `waitlist-promo-${promoted.dossier.id}-${subjectId}`,
      });
      notifications = res.notifications;
      if (res.created) emailIds.push(res.created.id);

      const audit = createAuditEntry({
        actorName: currentUser?.fullName || 'Commission de sélection',
        actorRole: currentUser?.role || 'commission',
        eventType: 'resultat',
        summary: `Promotion depuis la liste d’attente vers la liste principale sur ${codeLabel}.`,
        dossierNumber: promoted.dossier.dossierNumber,
        targetAccountId: promoted.dossier.accountId,
        timestamp: now,
      });

      return {
        next: {
          ...prev,
          dossiers: prev.dossiers.map((d) => {
            if (d.id === promoted.dossier.id) {
              const updatedChoices = d.subjectChoices.map((c) =>
                c.subjectId === subjectId
                  ? { ...c, status: 'admis' as const, waitlistRank: undefined }
                  : c
              );
              return {
                ...d,
                subjectChoices: updatedChoices,
                confirmedSubjectId: d.confirmedSubjectId || subjectId,
                status: deriveGlobalDossierStatus(updatedChoices, d.status),
                updatedAt: now,
              };
            }
            const hasWaitlistOnSubject = d.subjectChoices.some(
              (c) => c.subjectId === subjectId && c.status === 'liste_attente'
            );
            if (hasWaitlistOnSubject) {
              return {
                ...d,
                subjectChoices: d.subjectChoices.map((c) =>
                  c.subjectId === subjectId &&
                  c.status === 'liste_attente' &&
                  c.waitlistRank &&
                  c.waitlistRank > 1
                    ? { ...c, waitlistRank: c.waitlistRank - 1 }
                    : c
                ),
              };
            }
            return d;
          }),
          notifications,
          auditLogs: [audit, ...prev.auditLogs].slice(0, 250),
        },
        emailNotificationIds: emailIds,
      };
    });

    return {
      ok: true,
      promotedName: `${promoted.dossier.personalInfo.firstName} ${promoted.dossier.personalInfo.lastName}`,
    };
  };

  // DOCUMENT CORRECTION & DEADLINES (Section 2 & Section 3)
  const requestDocumentCorrection: GCDContextValue['requestDocumentCorrection'] = (
    dossierId,
    requirementId,
    reason,
    deadlineISO
  ) => {
    const cur = sharedStateRef.current;
    const target = cur.dossiers.find((d) => d.id === dossierId);
    const req = cur.campaignConfig.documentRequirements.find((r) => r.id === requirementId);
    if (!target || !req) {
      return { ok: false, error: 'Dossier ou pièce introuvable.' };
    }

    const cleanReason = reason.trim();
    if (!cleanReason) {
      return { ok: false, error: 'Veuillez indiquer le motif de la correction.' };
    }

    const defaultDays = cur.campaignConfig.deadlinePolicy?.defaultCorrectionDays || 7;
    const effectiveDeadline =
      deadlineISO && /^\d{4}-\d{2}-\d{2}$/.test(deadlineISO)
        ? deadlineISO
        : addDaysISO(getTodayISO(), defaultDays);

    const now = new Date().toISOString();
    const actorName = currentUser?.fullName || 'Administration CEDoc';
    const actorRole: 'commission' | 'admin' =
      currentUser?.role === 'commission' ? 'commission' : 'admin';

    const reasonWithPeriod = /[.!?]$/.test(cleanReason) ? cleanReason : `${cleanReason}.`;

    commitStateUpdate((prev) => {
      let notifications = [...prev.notifications];
      const emailIds: string[] = [];

      const res = appendDeduplicatedNotification(notifications, {
        recipientAccountId: target.accountId,
        recipientRole: 'candidat',
        title: 'Document à corriger',
        message: `${reasonWithPeriod} Veuillez déposer une nouvelle version avant le ${formatDateFR(effectiveDeadline)}.`,
        category: 'correction',
        urgent: true,
        actionRequired: true,
        deadline: effectiveDeadline,
        actionTab: 'pieces',
        actionLabel: 'Corriger',
        targetDossierId: target.id,
        targetRequirementId: req.id,
        dedupeKey: `corr-${target.id}-${req.id}-${effectiveDeadline}-${cleanReason.slice(0, 30)}`,
      });
      notifications = res.notifications;
      if (res.created) emailIds.push(res.created.id);

      const audit = createAuditEntry({
        actorName,
        actorRole,
        eventType: 'document_correction',
        summary: `Demande de correction sur ${req.code} (motif : ${cleanReason} · délai : ${effectiveDeadline}).`,
        dossierNumber: target.dossierNumber,
        targetAccountId: target.accountId,
        timestamp: now,
      });

      return {
        next: {
          ...prev,
          dossiers: prev.dossiers.map((d) => {
            if (d.id !== dossierId) return d;

            const existingRequests = d.correctionRequests || [];
            const hasExistingReq = existingRequests.some(
              (c) => c.requirementId === requirementId && c.status !== 'resolved'
            );

            const nextReqEntry: DocumentCorrectionRequest = {
              id: `corr-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              requirementId: req.id,
              documentCode: req.code,
              documentLabel: req.label,
              reason: cleanReason,
              deadline: effectiveDeadline,
              requestedBy: actorName,
              requestedByRole: actorRole,
              requestedAt: now,
              status: 'pending',
            };

            const nextCorrectionRequests = hasExistingReq
              ? existingRequests.map((c) =>
                  c.requirementId === requirementId && c.status !== 'resolved'
                    ? {
                        ...c,
                        reason: cleanReason,
                        deadline: effectiveDeadline,
                        requestedBy: actorName,
                        requestedByRole: actorRole,
                        requestedAt: now,
                        status: 'pending' as const,
                      }
                    : c
                )
              : [nextReqEntry, ...existingRequests];

            const nextDocuments = d.documents.map((doc) =>
              doc.requirementId === requirementId
                ? {
                    ...doc,
                    status: 'a_corriger' as const,
                    reviewComment: cleanReason,
                    reviewedBy: actorName,
                    reviewedAt: now,
                    correctionDeadline: effectiveDeadline,
                  }
                : doc
            );

            return {
              ...d,
              documents: nextDocuments,
              correctionRequests: nextCorrectionRequests,
              updatedAt: now,
            };
          }),
          notifications,
          auditLogs: [audit, ...prev.auditLogs].slice(0, 250),
        },
        emailNotificationIds: emailIds,
      };
    });

    return { ok: true, deadline: effectiveDeadline };
  };

  const extendCorrectionDeadline: GCDContextValue['extendCorrectionDeadline'] = (
    dossierId,
    requirementId,
    newDeadlineISO
  ) => {
    if (!newDeadlineISO || !/^\d{4}-\d{2}-\d{2}$/.test(newDeadlineISO)) {
      return { ok: false, error: 'Date limite invalide.' };
    }
    const cur = sharedStateRef.current;
    const target = cur.dossiers.find((d) => d.id === dossierId);
    const req = cur.campaignConfig.documentRequirements.find((r) => r.id === requirementId);
    if (!target || !req) {
      return { ok: false, error: 'Dossier ou pièce introuvable.' };
    }

    const now = new Date().toISOString();
    const actorName = currentUser?.fullName || 'Administration CEDoc';

    commitStateUpdate((prev) => {
      // Clear expired alerts for the previous deadline on both candidate and admin
      let notifications = prev.notifications.map((n) =>
        n.targetDossierId === target.id &&
        n.targetRequirementId === requirementId &&
        n.title.startsWith('Délai expiré')
          ? { ...n, read: true, readAt: n.readAt || now, actionRequired: false, urgent: false }
          : n
      );
      const emailIds: string[] = [];

      const res = appendDeduplicatedNotification(notifications, {
        recipientAccountId: target.accountId,
        recipientRole: 'candidat',
        title: `Délai prolongé (${req.code})`,
        message: `Nouveau délai accordé jusqu’au ${formatDateFR(newDeadlineISO)} pour déposer une version conforme de « ${req.label} ».`,
        category: 'correction',
        actionRequired: true,
        deadline: newDeadlineISO,
        actionTab: 'pieces',
        actionLabel: 'Corriger',
        targetDossierId: target.id,
        targetRequirementId: req.id,
        dedupeKey: `ext-${target.id}-${req.id}-${newDeadlineISO}`,
      });
      notifications = res.notifications;
      if (res.created) emailIds.push(res.created.id);

      const audit = createAuditEntry({
        actorName,
        actorRole: currentUser?.role || 'admin',
        eventType: 'prolongation_delai',
        summary: `Prolongation du délai sur ${req.code} jusqu’au ${newDeadlineISO}.`,
        dossierNumber: target.dossierNumber,
        targetAccountId: target.accountId,
        timestamp: now,
      });

      return {
        next: {
          ...prev,
          dossiers: prev.dossiers.map((d) => {
            if (d.id !== dossierId) return d;
            return {
              ...d,
              documents: d.documents.map((doc) =>
                doc.requirementId === requirementId
                  ? { ...doc, correctionDeadline: newDeadlineISO }
                  : doc
              ),
              correctionRequests: (d.correctionRequests || []).map((c) =>
                c.requirementId === requirementId && c.status !== 'resolved'
                  ? {
                      ...c,
                      previousDeadline: c.deadline,
                      deadline: newDeadlineISO,
                      extendedAt: now,
                      status: 'pending' as const,
                    }
                  : c
              ),
              updatedAt: now,
            };
          }),
          notifications,
          auditLogs: [audit, ...prev.auditLogs].slice(0, 250),
        },
        emailNotificationIds: emailIds,
      };
    });

    return { ok: true };
  };

  const reviewDocumentStatus: GCDContextValue['reviewDocumentStatus'] = (
    dossierId,
    requirementId,
    status,
    comment,
    deadlineISO
  ) => {
    if (status === 'a_corriger') {
      requestDocumentCorrection(
        dossierId,
        requirementId,
        comment || 'Document incomplet ou illisible.',
        deadlineISO
      );
      return;
    }

    const cur = sharedStateRef.current;
    const target = cur.dossiers.find((d) => d.id === dossierId);
    const req = cur.campaignConfig.documentRequirements.find((r) => r.id === requirementId);
    if (!target || !req) return;

    const now = new Date().toISOString();
    const reviewer = currentUser?.fullName || 'Administration CEDoc';
    const hadCorrection =
      target.documents.some(
        (doc) => doc.requirementId === requirementId && doc.status === 'a_corriger'
      ) ||
      (target.correctionRequests || []).some(
        (c) => c.requirementId === requirementId && c.status !== 'resolved'
      );

    commitStateUpdate((prev) => {
      let notifications = [...prev.notifications];

      // Check if all required preinscription documents will now be validated
      const updatedDocs = target.documents.map((doc) =>
        doc.requirementId === requirementId
          ? {
              ...doc,
              status: 'validee' as const,
              reviewComment: undefined,
              correctionDeadline: undefined,
              reviewedBy: reviewer,
              reviewedAt: now,
            }
          : doc
      );
      const preReqs = prev.campaignConfig.documentRequirements.filter(
        (r) => r.stage === 'preinscription' && r.required
      );
      const allPreValidated =
        preReqs.length > 0 &&
        preReqs.every((r) =>
          updatedDocs.some((doc) => doc.requirementId === r.id && doc.status === 'validee')
        );

      if (allPreValidated) {
        const res = appendDeduplicatedNotification(notifications, {
          recipientAccountId: target.accountId,
          recipientRole: 'candidat',
          title: 'Dossier administratif validé',
          message: 'L’ensemble de vos pièces justificatives de candidature a été déclaré conforme.',
          category: 'dossier',
          actionTab: 'suivi',
          actionLabel: 'Voir',
          targetDossierId: target.id,
          dedupeKey: `all-docs-valid-${target.id}`,
        });
        notifications = res.notifications;
      } else if (hadCorrection) {
        const res = appendDeduplicatedNotification(notifications, {
          recipientAccountId: target.accountId,
          recipientRole: 'candidat',
          title: `Document validé (${req.code})`,
          message: `La nouvelle version de « ${req.label} » a été acceptée.`,
          category: 'dossier',
          actionTab: 'pieces',
          actionLabel: 'Voir',
          targetDossierId: target.id,
          targetRequirementId: req.id,
          dedupeKey: `doc-valid-after-corr-${target.id}-${req.id}-${now.slice(0, 10)}`,
        });
        notifications = res.notifications;
      }

      const audit = createAuditEntry({
        actorName: reviewer,
        actorRole: currentUser?.role || 'admin',
        eventType: 'document_valide',
        summary: `Pièce ${req.code} déclarée conforme.`,
        dossierNumber: target.dossierNumber,
        targetAccountId: target.accountId,
        timestamp: now,
      });

      return {
        next: {
          ...prev,
          dossiers: prev.dossiers.map((d) =>
            d.id === dossierId
              ? {
                  ...d,
                  documents: updatedDocs,
                  correctionRequests: (d.correctionRequests || []).map((c) =>
                    c.requirementId === requirementId ? { ...c, status: 'resolved' as const } : c
                  ),
                  updatedAt: now,
                }
              : d
          ),
          notifications,
          auditLogs: [audit, ...prev.auditLogs].slice(0, 250),
        },
      };
    });
  };

  const updateDeadlinePolicy: GCDContextValue['updateDeadlinePolicy'] = (partial) => {
    commitStateUpdate((prev) => ({
      next: {
        ...prev,
        campaignConfig: {
          ...prev.campaignConfig,
          deadlinePolicy: {
            ...prev.campaignConfig.deadlinePolicy,
            ...partial,
          },
        },
      },
    }));
  };

  const runDeadlineCheck: GCDContextValue['runDeadlineCheck'] = async (referenceDateISO) => {
    try {
      const res = await fetch('/api/deadlines/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          referenceDateISO,
          clientId: clientIdRef.current,
        }),
      });
      if (res.ok) {
        const data = (await res.json()) as {
          ok: boolean;
          generatedCount: number;
          state?: SharedPlatformState;
          emailStatus?: EmailServiceStatus;
        };
        if (data.state) {
          sharedStateRef.current = data.state;
          setSharedState(data.state);
        }
        if (data.emailStatus) setEmailStatus(data.emailStatus);
        return { generatedCount: data.generatedCount || 0 };
      }
    } catch {
      // Fallback local check
    }

    const localResult = reconcileDeadlinesAndReminders(
      sharedStateRef.current,
      referenceDateISO
    );
    if (localResult.changed) {
      sharedStateRef.current = localResult.state;
      setSharedState(localResult.state);
    }
    return { generatedCount: localResult.newNotifications.length };
  };

  // ADMIN ACTIONS
  const validateAdministrativeEnrollment = (dossierId: string) => {
    const cur = sharedStateRef.current;
    const target = cur.dossiers.find((d) => d.id === dossierId);
    if (!target) return { ok: false, error: 'Dossier introuvable.' };

    const hasCorrection =
      target.documents.some((doc) => doc.status === 'a_corriger') ||
      (target.correctionRequests || []).some((c) => c.status === 'pending');
    if (hasCorrection) {
      return {
        ok: false,
        error: 'Impossible de valider : au moins une pièce est encore marquée « À corriger ».',
      };
    }

    const requiredIds = cur.campaignConfig.documentRequirements
      .filter((r) => r.required)
      .map((r) => r.id);
    const missingRequired = requiredIds.filter(
      (reqId) => !target.documents.some((doc) => doc.requirementId === reqId)
    );
    if (missingRequired.length > 0) {
      return {
        ok: false,
        error: `Il manque encore ${missingRequired.length} pièce(s) obligatoire(s) au dossier.`,
      };
    }

    const now = new Date().toISOString();
    const enrollmentNumber =
      target.enrollmentNumber ||
      `DOC-USMBA-2026-${String(Math.floor(100 + Math.random() * 899)).padStart(4, '0')}`;

    const admittedChoice = target.subjectChoices.find((c) => c.status === 'admis');
    const confirmedId = target.confirmedSubjectId || admittedChoice?.subjectId;

    commitStateUpdate((prev) => {
      let notifications = [...prev.notifications];
      const emailIds: string[] = [];

      const res = appendDeduplicatedNotification(notifications, {
        recipientAccountId: target.accountId,
        recipientRole: 'candidat',
        title: `Inscription définitive validée (${enrollmentNumber})`,
        message: 'Votre inscription au cycle doctoral USMBA est effective. Consultez votre attestation.',
        category: 'resultat',
        urgent: true,
        actionTab: 'suivi',
        actionLabel: 'Consulter le résultat',
        targetDossierId: target.id,
        dedupeKey: `insc-validee-${target.id}`,
      });
      notifications = res.notifications;
      if (res.created) emailIds.push(res.created.id);

      const audit = createAuditEntry({
        actorName: currentUser?.fullName || 'Administration CEDoc',
        actorRole: 'admin',
        eventType: 'inscription',
        summary: `Validation définitive de l’inscription (${enrollmentNumber}).`,
        dossierNumber: target.dossierNumber,
        targetAccountId: target.accountId,
        timestamp: now,
      });

      return {
        next: {
          ...prev,
          dossiers: prev.dossiers.map((d) =>
            d.id === dossierId
              ? {
                  ...d,
                  status: 'inscrit',
                  confirmedSubjectId: confirmedId,
                  documents: d.documents.map((doc) => ({
                    ...doc,
                    status: 'validee',
                    reviewedBy: currentUser?.fullName || 'Administration CEDoc',
                    reviewedAt: now,
                  })),
                  correctionRequests: (d.correctionRequests || []).map((c) => ({
                    ...c,
                    status: 'resolved',
                  })),
                  enrollmentValidatedAt: now,
                  enrollmentNumber,
                  updatedAt: now,
                }
              : d
          ),
          notifications,
          auditLogs: [audit, ...prev.auditLogs].slice(0, 250),
        },
        emailNotificationIds: emailIds,
      };
    });

    return { ok: true, enrollmentNumber };
  };

  const requestDossierCorrections = (
    dossierId: string,
    globalMessage: string,
    deadlineISO?: string
  ) => {
    const cur = sharedStateRef.current;
    const target = cur.dossiers.find((d) => d.id === dossierId);
    if (!target || !globalMessage.trim()) return;
    const defaultDays = cur.campaignConfig.deadlinePolicy?.defaultCorrectionDays || 7;
    const effectiveDeadline = deadlineISO || addDaysISO(getTodayISO(), defaultDays);

    commitStateUpdate((prev) => {
      const res = appendDeduplicatedNotification(prev.notifications, {
        recipientAccountId: target.accountId,
        recipientRole: 'candidat',
        title: 'Régularisation de dossier demandée',
        message: `${globalMessage.trim()} (Date limite : ${formatDateFR(effectiveDeadline)})`,
        category: 'correction',
        urgent: true,
        actionRequired: true,
        deadline: effectiveDeadline,
        actionTab: 'pieces',
        actionLabel: 'Corriger',
        targetDossierId: target.id,
        dedupeKey: `global-corr-${target.id}-${effectiveDeadline}-${globalMessage.trim().slice(0, 24)}`,
      });
      return {
        next: {
          ...prev,
          notifications: res.notifications,
        },
        emailNotificationIds: res.created ? [res.created.id] : undefined,
      };
    });
  };

  const sendAdminNotification: GCDContextValue['sendAdminNotification'] = (payload) => {
    const title = payload.title.trim();
    const message = payload.message.trim();
    if (!title || !message) {
      return { ok: false, sentCount: 0, error: 'Titre et message requis.' };
    }

    const cur = sharedStateRef.current;
    const activeCandidates = cur.accounts.filter((a) => a.active && a.role === 'candidat');
    let recipients: UserAccount[] = [];

    if (payload.targetType === 'individual') {
      const found = activeCandidates.find((a) => a.id === payload.targetAccountId);
      if (found) recipients = [found];
    } else if (payload.targetType === 'all_candidates') {
      recipients = activeCandidates;
    } else if (payload.targetType === 'correction_pending') {
      const accountIdsWithCorr = new Set(
        cur.dossiers
          .filter(
            (d) =>
              d.documents.some((doc) => doc.status === 'a_corriger') ||
              (d.correctionRequests || []).some((c) => c.status === 'pending')
          )
          .map((d) => d.accountId)
      );
      recipients = activeCandidates.filter((a) => accountIdsWithCorr.has(a.id));
    } else if (payload.targetType === 'status' && payload.targetStatus) {
      const accountIdsWithStatus = new Set(
        cur.dossiers
          .filter((d) => d.status === payload.targetStatus)
          .map((d) => d.accountId)
      );
      recipients = activeCandidates.filter((a) => accountIdsWithStatus.has(a.id));
    } else if (payload.targetType === 'subject' && payload.targetSubjectId) {
      const accountIdsWithSubj = new Set(
        cur.dossiers
          .filter((d) =>
            d.subjectChoices.some((c) => c.subjectId === payload.targetSubjectId)
          )
          .map((d) => d.accountId)
      );
      recipients = activeCandidates.filter((a) => accountIdsWithSubj.has(a.id));
    }

    if (recipients.length === 0) {
      return { ok: false, sentCount: 0, error: 'Aucun candidat ne correspond à cette cible.' };
    }

    let createdCount = 0;
    const now = new Date().toISOString();

    commitStateUpdate((prev) => {
      let notifications = [...prev.notifications];
      const emailIds: string[] = [];

      for (const acc of recipients) {
        const res = appendDeduplicatedNotification(notifications, {
          recipientAccountId: acc.id,
          recipientRole: 'candidat',
          title,
          message,
          category: payload.deadline ? 'rappel' : 'info',
          urgent: Boolean(payload.urgent),
          actionRequired: Boolean(payload.deadline || payload.urgent),
          deadline: payload.deadline || undefined,
          actionTab: payload.actionTab || 'suivi',
          actionLabel: payload.actionLabel || 'Voir',
          dedupeKey: `admin-msg-${acc.id}-${title}-${message.slice(0, 32)}-${payload.deadline || ''}`,
        });
        notifications = res.notifications;
        if (res.created) {
          createdCount += 1;
          if (payload.sendEmail) {
            emailIds.push(res.created.id);
          }
        }
      }

      const audit = createAuditEntry({
        actorName: currentUser?.fullName || 'Administration CEDoc',
        actorRole: 'admin',
        eventType: 'notification_admin',
        summary: `Notification « ${title} » envoyée à ${recipients.length} candidat(s).`,
        timestamp: now,
      });

      return {
        next: {
          ...prev,
          notifications,
          auditLogs: [audit, ...prev.auditLogs].slice(0, 250),
        },
        emailNotificationIds: emailIds.length > 0 ? emailIds : undefined,
      };
    });

    return { ok: true, sentCount: createdCount || recipients.length };
  };

  const publishAnnouncement: GCDContextValue['publishAnnouncement'] = (payload) => {
    const title = payload.title.trim();
    const message = payload.message.trim();
    if (!title || !message) {
      return { ok: false, error: 'Titre et message requis.' };
    }

    // Strict zero-PII enforcement on public announcements (Section 5)
    if (containsPersonalIdentifier(`${title} ${message}`)) {
      return {
        ok: false,
        error:
          'Une annonce publique ne doit contenir aucune donnée personnelle (CIN, CNE ou N° de dossier).',
      };
    }

    const now = new Date().toISOString();
    const createdAnn: PublicAnnouncement = {
      id: `ann-${Date.now()}`,
      title,
      message,
      publishedAt: now,
      publishedBy: currentUser?.fullName || 'Pôle d’Études Doctorales — USMBA',
      important: payload.important,
      active: true,
    };

    commitStateUpdate((prev) => {
      let notifications = [...prev.notifications];
      if (payload.notifyCandidates) {
        const activeCandidates = prev.accounts.filter(
          (a) => a.active && a.role === 'candidat'
        );
        for (const acc of activeCandidates) {
          const res = appendDeduplicatedNotification(notifications, {
            recipientAccountId: acc.id,
            recipientRole: 'candidat',
            title: `Annonce officielle : ${title}`,
            message,
            category: 'annonce',
            urgent: payload.important,
            actionTab: 'suivi',
            actionLabel: 'Voir',
            dedupeKey: `ann-${acc.id}-${title}`,
          });
          notifications = res.notifications;
        }
      }

      const audit = createAuditEntry({
        actorName: currentUser?.fullName || 'Administration CEDoc',
        actorRole: 'admin',
        eventType: 'annonce',
        summary: `Annonce officielle publiée : « ${title} ».`,
        timestamp: now,
      });

      return {
        next: {
          ...prev,
          announcements: [createdAnn, ...prev.announcements],
          notifications,
          auditLogs: [audit, ...prev.auditLogs].slice(0, 250),
        },
      };
    });

    return { ok: true };
  };

  const toggleAnnouncementActive = (announcementId: string) => {
    commitStateUpdate((prev) => ({
      next: {
        ...prev,
        announcements: prev.announcements.map((a) =>
          a.id === announcementId ? { ...a, active: !a.active } : a
        ),
      },
    }));
  };

  const upsertThesisSubject: GCDContextValue['upsertThesisSubject'] = (subject) => {
    commitStateUpdate((prev) => {
      if (subject.id) {
        return {
          next: {
            ...prev,
            subjects: prev.subjects.map((s) =>
              s.id === subject.id ? ({ ...subject, id: subject.id } as ThesisSubject) : s
            ),
          },
        };
      }
      const created: ThesisSubject = {
        ...subject,
        id: `suj-${Date.now()}`,
        validationStatus: subject.validationStatus || {
          structure: 'validee',
          centre: 'validee',
          pole: 'validee',
        },
      };
      return {
        next: {
          ...prev,
          subjects: [created, ...prev.subjects],
        },
      };
    });
  };

  const toggleSubjectOpen = (subjectId: string) => {
    commitStateUpdate((prev) => ({
      next: {
        ...prev,
        subjects: prev.subjects.map((s) =>
          s.id === subjectId ? { ...s, open: !s.open } : s
        ),
      },
    }));
  };

  const updateCampaignSettings: GCDContextValue['updateCampaignSettings'] = (
    partial,
    options
  ) => {
    const now = new Date().toISOString();
    commitStateUpdate((prev) => {
      const nextConfig: CampaignConfig = {
        ...prev.campaignConfig,
        ...partial,
      };

      const calendarChanged =
        nextConfig.openDate !== prev.campaignConfig.openDate ||
        nextConfig.submissionDeadline !== prev.campaignConfig.submissionDeadline ||
        nextConfig.enrollmentDeadline !== prev.campaignConfig.enrollmentDeadline ||
        nextConfig.interviewPeriod !== prev.campaignConfig.interviewPeriod ||
        nextConfig.campaignOpen !== prev.campaignConfig.campaignOpen;

      let notifications = [...prev.notifications];
      const audits: AuditLogEntry[] = [];

      if (calendarChanged && options?.notifyCandidates) {
        const activeCandidates = prev.accounts.filter(
          (a) => a.active && a.role === 'candidat'
        );
        const calSummary = !nextConfig.campaignOpen
          ? 'La campagne de préinscription est clôturée.'
          : `Clôture des candidatures : ${formatDateFR(nextConfig.submissionDeadline)} · Inscriptions définitives : ${formatDateFR(nextConfig.enrollmentDeadline)}.`;

        for (const acc of activeCandidates) {
          const res = appendDeduplicatedNotification(notifications, {
            recipientAccountId: acc.id,
            recipientRole: 'candidat',
            title: 'Mise à jour du calendrier universitaire',
            message: calSummary,
            category: 'calendrier',
            deadline: nextConfig.submissionDeadline,
            actionTab: 'suivi',
            actionLabel: 'Voir',
            dedupeKey: `cal-${acc.id}-${nextConfig.openDate}-${nextConfig.submissionDeadline}-${nextConfig.enrollmentDeadline}-${nextConfig.campaignOpen}`,
          });
          notifications = res.notifications;
        }

        audits.push(
          createAuditEntry({
            actorName: currentUser?.fullName || 'Administration CEDoc',
            actorRole: 'admin',
            eventType: 'calendrier',
            summary: `Mise à jour du calendrier (${calSummary})`,
            timestamp: now,
          })
        );
      }

      return {
        next: {
          ...prev,
          campaignConfig: nextConfig,
          notifications,
          auditLogs: [...audits, ...prev.auditLogs].slice(0, 250),
        },
      };
    });
  };

  const upsertDocumentRequirement: GCDContextValue['upsertDocumentRequirement'] = (req) => {
    commitStateUpdate((prev) => {
      const existing = req.id
        ? prev.campaignConfig.documentRequirements.some((r) => r.id === req.id)
        : false;
      const updatedList = existing
        ? prev.campaignConfig.documentRequirements.map((r) =>
            r.id === req.id ? ({ ...req, id: req.id } as DocumentRequirement) : r
          )
        : [
            ...prev.campaignConfig.documentRequirements,
            { ...req, id: `req-${Date.now()}` } as DocumentRequirement,
          ];
      return {
        next: {
          ...prev,
          campaignConfig: {
            ...prev.campaignConfig,
            documentRequirements: updatedList,
          },
        },
      };
    });
  };

  const deleteDocumentRequirement = (reqId: string) => {
    commitStateUpdate((prev) => ({
      next: {
        ...prev,
        campaignConfig: {
          ...prev.campaignConfig,
          documentRequirements: prev.campaignConfig.documentRequirements.filter(
            (r) => r.id !== reqId
          ),
        },
      },
    }));
  };

  const upsertIntervenantAccount: GCDContextValue['upsertIntervenantAccount'] = (payload) => {
    commitStateUpdate((prev) => {
      if (payload.id) {
        return {
          next: {
            ...prev,
            accounts: prev.accounts.map((a) =>
              a.id === payload.id
                ? {
                    ...a,
                    fullName: payload.fullName,
                    email: payload.email,
                    role: payload.role,
                    title: payload.title,
                    laboratoire: payload.laboratoire,
                    etablissement: payload.etablissement,
                  }
                : a
            ),
          },
        };
      }
      const created: UserAccount = {
        id: `acc-staff-${Date.now()}`,
        role: payload.role,
        fullName: payload.fullName,
        email: payload.email,
        password: payload.password || 'Usmba2026!',
        title: payload.title,
        laboratoire: payload.laboratoire,
        etablissement: payload.etablissement,
        active: true,
      };
      return {
        next: {
          ...prev,
          accounts: [...prev.accounts, created],
        },
      };
    });
  };

  const toggleAccountActive = (accountId: string) => {
    commitStateUpdate((prev) => ({
      next: {
        ...prev,
        accounts: prev.accounts.map((a) =>
          a.id === accountId ? { ...a, active: !a.active } : a
        ),
      },
    }));
  };

  const publishCampaignResults = (published: boolean) => {
    const now = new Date().toISOString();
    commitStateUpdate((prev) => {
      let notifications = [...prev.notifications];
      const emailIds: string[] = [];

      if (published && !prev.campaignConfig.resultsPublished) {
        for (const d of prev.dossiers) {
          if (d.status !== 'brouillon') {
            const res = appendDeduplicatedNotification(notifications, {
              recipientAccountId: d.accountId,
              recipientRole: 'candidat',
              title: `Résultats publiés (${prev.campaignConfig.academicYear})`,
              message:
                'Les résultats officiels de sélection doctorale sont disponibles dans votre espace candidat.',
              category: 'resultat',
              actionTab: 'suivi',
              actionLabel: 'Consulter le résultat',
              targetDossierId: d.id,
              dedupeKey: `pub-res-${prev.campaignConfig.academicYear}-${d.id}`,
            });
            notifications = res.notifications;
            if (res.created) emailIds.push(res.created.id);
          }
        }
      }

      const audit = createAuditEntry({
        actorName: currentUser?.fullName || 'Administration CEDoc',
        actorRole: 'admin',
        eventType: 'resultat',
        summary: published
          ? `Publication officielle des résultats (${prev.campaignConfig.academicYear}).`
          : 'Suspension de l’affichage des résultats.',
        timestamp: now,
      });

      return {
        next: {
          ...prev,
          campaignConfig: {
            ...prev.campaignConfig,
            resultsPublished: published,
          },
          notifications,
          auditLogs: [audit, ...prev.auditLogs].slice(0, 250),
        },
        emailNotificationIds: emailIds.length > 0 ? emailIds : undefined,
      };
    });
  };

  // SUPPORT & DEMO RESET
  const submitSupportTicket: GCDContextValue['submitSupportTicket'] = (ticket) => {
    const now = new Date().toISOString();
    const created: SupportTicket = {
      id: `tick-${Date.now()}`,
      reference: `SUP-2026-${Math.floor(200 + Math.random() * 799)}`,
      accountId: currentUser?.id,
      senderName: ticket.senderName,
      senderEmail: ticket.senderEmail,
      dossierNumber: ticket.dossierNumber,
      category: ticket.category,
      subject: ticket.subject,
      message: ticket.message,
      createdAt: now,
      status: 'ouvert',
    };

    commitStateUpdate((prev) => {
      let notifications = [...prev.notifications];
      for (const admin of getActiveAdminAccounts(prev.accounts)) {
        const res = appendDeduplicatedNotification(notifications, {
          recipientAccountId: admin.id,
          recipientRole: 'admin',
          title: `Nouveau ticket support (${created.reference})`,
          message: `${created.senderName} : ${created.subject}`,
          category: 'info',
          actionRequired: true,
          actionTab: 'support',
          actionLabel: 'Voir',
          dedupeKey: `ticket-${admin.id}-${created.id}`,
        });
        notifications = res.notifications;
      }

      return {
        next: {
          ...prev,
          supportTickets: [created, ...prev.supportTickets],
          notifications,
        },
      };
    });

    return created;
  };

  const replyToSupportTicket = (ticketId: string, reply: string) => {
    const target = sharedStateRef.current.supportTickets.find((t) => t.id === ticketId);
    const now = new Date().toISOString();

    commitStateUpdate((prev) => {
      let notifications = [...prev.notifications];
      if (target?.accountId) {
        const res = appendDeduplicatedNotification(notifications, {
          recipientAccountId: target.accountId,
          recipientRole: 'candidat',
          title: `Réponse support (${target.reference})`,
          message: reply.trim(),
          category: 'info',
          actionTab: 'aide',
          actionLabel: 'Voir',
          dedupeKey: `ticket-reply-${target.id}-${reply.trim().slice(0, 24)}`,
        });
        notifications = res.notifications;
      }

      return {
        next: {
          ...prev,
          supportTickets: prev.supportTickets.map((t) =>
            t.id === ticketId ? { ...t, status: 'repondu', reply: reply.trim(), repliedAt: now } : t
          ),
          notifications,
        },
      };
    });
  };

  const resetDemoData = () => {
    localStorage.removeItem(LOCAL_CACHE_KEY);
    const fresh = buildDefaultSharedState();
    sharedStateRef.current = fresh;
    setSharedState(fresh);

    void (async () => {
      try {
        const res = await fetch('/api/reset', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ clientId: clientIdRef.current }),
        });
        if (res.ok) {
          const data = (await res.json()) as {
            ok: boolean;
            state?: SharedPlatformState;
            emailStatus?: EmailServiceStatus;
          };
          if (data.state) {
            sharedStateRef.current = data.state;
            setSharedState(data.state);
          }
          if (data.emailStatus) setEmailStatus(data.emailStatus);
          setSyncMode('synced');
        }
      } catch {
        setSyncMode('local_only');
      }
    })();
  };

  return (
    <GCDContext.Provider
      value={{
        accounts: sharedState.accounts,
        subjects: sharedState.subjects,
        dossiers: sharedState.dossiers,
        notifications: scopedNotifications,
        campaignConfig: sharedState.campaignConfig,
        supportTickets: sharedState.supportTickets,
        announcements: sharedState.announcements,
        auditLogs: sharedState.auditLogs,
        emailStatus,
        syncMode,
        currentUser,
        currentCandidateDossier,
        navigationFocus,
        clearNavigationFocus,
        openNotificationTarget,
        loginWithCredentials,
        loginAsAccount,
        registerCandidate,
        resetAccountPassword,
        logout,
        saveCandidateDraft,
        confirmAdmissionSubject,
        uploadCandidateDocument,
        submitCandidateApplication,
        submitFinalEnrollment,
        markNotificationRead,
        markAllNotificationsRead,
        setPreselectionDecision,
        scheduleCandidateInterview,
        saveCandidateEvaluation,
        setCommissionFinalDecision,
        callNextOnWaitlist,
        requestDocumentCorrection,
        extendCorrectionDeadline,
        reviewDocumentStatus,
        updateDeadlinePolicy,
        runDeadlineCheck,
        validateAdministrativeEnrollment,
        requestDossierCorrections,
        sendAdminNotification,
        publishAnnouncement,
        toggleAnnouncementActive,
        upsertThesisSubject,
        toggleSubjectOpen,
        updateCampaignSettings,
        upsertDocumentRequirement,
        deleteDocumentRequirement,
        upsertIntervenantAccount,
        toggleAccountActive,
        publishCampaignResults,
        submitSupportTicket,
        replyToSupportTicket,
        resetDemoData,
      }}
    >
      {children}
    </GCDContext.Provider>
  );
};

export function useGCD(): GCDContextValue {
  const ctx = useContext(GCDContext);
  if (!ctx) {
    throw new Error('useGCD must be used inside a GCDProvider');
  }
  return ctx;
}
