import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  INITIAL_ACCOUNTS,
  INITIAL_CAMPAIGN_CONFIG,
  INITIAL_DOSSIERS,
  INITIAL_NOTIFICATIONS,
  INITIAL_SUBJECTS,
  INITIAL_SUPPORT_TICKETS,
} from '../data/demoData';
import {
  AcademicInfo,
  CampaignConfig,
  CandidateDossier,
  DocumentRequirement,
  InterviewInfo,
  NotificationItem,
  PersonalInfo,
  SubjectChoice,
  SubjectChoiceStatus,
  SupportTicket,
  ThesisSubject,
  UserAccount,
  UserRole,
} from '../types/gcd';
import { deriveGlobalDossierStatus } from '../utils/formatters';

const STORAGE_KEY = 'gcd_usmba_state_v2';

interface PersistedState {
  accounts: UserAccount[];
  subjects: ThesisSubject[];
  dossiers: CandidateDossier[];
  notifications: NotificationItem[];
  campaignConfig: CampaignConfig;
  supportTickets: SupportTicket[];
  currentAccountId: string | null;
}

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

interface GCDContextValue {
  accounts: UserAccount[];
  subjects: ThesisSubject[];
  dossiers: CandidateDossier[];
  notifications: NotificationItem[];
  campaignConfig: CampaignConfig;
  supportTickets: SupportTicket[];
  currentUser: UserAccount | null;
  currentCandidateDossier: CandidateDossier | null;

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
  ) => { ok: boolean; error?: string };
  submitCandidateApplication: (dossierId: string) => { ok: boolean; error?: string };
  submitFinalEnrollment: (dossierId: string) => void;
  markNotificationRead: (notificationId: string) => void;
  markAllNotificationsRead: (accountId: string) => void;

  // Commission actions (par dossier ET par sujet parmi les 3 choix)
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
  ) => void;
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

  // Admin actions
  reviewDocumentStatus: (
    dossierId: string,
    requirementId: string,
    status: 'validee' | 'a_corriger',
    comment?: string
  ) => void;
  validateAdministrativeEnrollment: (dossierId: string) => { ok: boolean; enrollmentNumber?: string; error?: string };
  requestDossierCorrections: (dossierId: string, globalMessage: string) => void;
  upsertThesisSubject: (subject: Omit<ThesisSubject, 'id'> & { id?: string }) => void;
  toggleSubjectOpen: (subjectId: string) => void;
  updateCampaignSettings: (partial: Partial<Omit<CampaignConfig, 'documentRequirements'>>) => void;
  upsertDocumentRequirement: (req: Omit<DocumentRequirement, 'id'> & { id?: string }) => void;
  deleteDocumentRequirement: (reqId: string) => void;
  upsertIntervenantAccount: (
    payload: {
      id?: string;
      fullName: string;
      email: string;
      role: Extract<UserRole, 'commission' | 'admin'>;
      title: string;
      laboratoire?: string;
      etablissement: string;
      password?: string;
    }
  ) => void;
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

function getInitialState(): PersistedState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as PersistedState;
      if (
        parsed &&
        Array.isArray(parsed.accounts) &&
        Array.isArray(parsed.dossiers) &&
        parsed.dossiers.every((d) => Array.isArray(d.subjectChoices)) &&
        typeof parsed.campaignConfig?.requiredSubjectChoices === 'number'
      ) {
        return parsed;
      }
    }
  } catch {
    // ignore storage read issues
  }
  return {
    accounts: INITIAL_ACCOUNTS,
    subjects: INITIAL_SUBJECTS,
    dossiers: INITIAL_DOSSIERS,
    notifications: INITIAL_NOTIFICATIONS,
    campaignConfig: INITIAL_CAMPAIGN_CONFIG,
    supportTickets: INITIAL_SUPPORT_TICKETS,
    currentAccountId: null,
  };
}

export const GCDProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<PersistedState>(getInitialState);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // ignore storage quota errors
    }
  }, [state]);

  const currentUser =
    state.accounts.find((a) => a.id === state.currentAccountId) || null;

  const currentCandidateDossier =
    currentUser?.role === 'candidat'
      ? state.dossiers.find((d) => d.accountId === currentUser.id) || null
      : null;

  const pushNotification = (
    recipientAccountId: string,
    title: string,
    message: string,
    category: NotificationItem['category'],
    actionTab?: NotificationItem['actionTab']
  ): NotificationItem => ({
    id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    recipientAccountId,
    title,
    message,
    createdAt: new Date().toISOString(),
    read: false,
    category,
    actionTab,
  });

  const loginWithCredentials = (identifier: string, password: string) => {
    const trimmed = identifier.trim().toLowerCase();
    const account = state.accounts.find(
      (a) =>
        a.email.toLowerCase() === trimmed ||
        (a.cin && a.cin.toLowerCase() === trimmed) ||
        (a.cne && a.cne.toLowerCase() === trimmed)
    );
    if (!account) {
      return {
        ok: false,
        error: 'Aucun compte trouvé avec cet e-mail, CIN ou code CNE.',
      };
    }
    if (!account.active) {
      return {
        ok: false,
        error: 'Ce compte est actuellement désactivé par l’administration.',
      };
    }
    if (account.password !== password) {
      return {
        ok: false,
        error: 'Mot de passe incorrect. Vérifiez votre saisie ou utilisez la récupération de mot de passe.',
      };
    }
    setState((prev) => ({ ...prev, currentAccountId: account.id }));
    return { ok: true };
  };

  const loginAsAccount = (accountId: string) => {
    const account = state.accounts.find((a) => a.id === accountId);
    if (account && account.active) {
      setState((prev) => ({ ...prev, currentAccountId: account.id }));
    }
  };

  const registerCandidate = (payload: RegisterCandidatePayload) => {
    const emailNorm = payload.email.trim().toLowerCase();
    const cinNorm = payload.cin.trim().toUpperCase();
    const cneNorm = payload.cne.trim().toUpperCase();

    if (state.accounts.some((a) => a.email.toLowerCase() === emailNorm)) {
      return { ok: false, error: 'Un compte existe déjà avec cette adresse e-mail.' };
    }
    if (state.accounts.some((a) => a.cin?.toUpperCase() === cinNorm)) {
      return { ok: false, error: 'Un dossier existe déjà avec ce numéro de CIN / Passeport.' };
    }

    const now = new Date().toISOString();
    const accountId = `acc-cand-${Date.now()}`;
    const randomSeq = Math.floor(1000 + Math.random() * 8999);
    const dossierNumber = `GCD-2026-${randomSeq}`;

    const maxChoices = Math.max(1, state.campaignConfig.requiredSubjectChoices || 3);
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
      status: 'brouillon',
      draftSavedAt: now,
      updatedAt: now,
    };

    const welcomeNotif = pushNotification(
      accountId,
      `Bienvenue sur GCD USMBA (${dossierNumber})`,
      `Votre espace candidat est créé. Sélectionnez vos ${maxChoices} sujets de thèse par ordre de priorité, déposez vos pièces justificatives et enregistrez votre brouillon à votre rythme.`,
      'info',
      'sujets'
    );

    setState((prev) => ({
      ...prev,
      accounts: [...prev.accounts, newAccount],
      dossiers: [...prev.dossiers, newDossier],
      notifications: [welcomeNotif, ...prev.notifications],
      currentAccountId: accountId,
    }));

    return { ok: true };
  };

  const resetAccountPassword = (email: string, cinOrCne: string, newPassword: string) => {
    const emailNorm = email.trim().toLowerCase();
    const idNorm = cinOrCne.trim().toLowerCase();
    const target = state.accounts.find(
      (a) =>
        a.email.toLowerCase() === emailNorm &&
        ((a.cin && a.cin.toLowerCase() === idNorm) || (a.cne && a.cne.toLowerCase() === idNorm))
    );
    if (!target) {
      return {
        ok: false,
        error: 'Aucune correspondance trouvée entre cette adresse e-mail et ce numéro CIN / CNE.',
      };
    }
    setState((prev) => ({
      ...prev,
      accounts: prev.accounts.map((a) =>
        a.id === target.id ? { ...a, password: newPassword } : a
      ),
    }));
    return { ok: true };
  };

  const logout = () => {
    setState((prev) => ({ ...prev, currentAccountId: null }));
  };

  const saveCandidateDraft: GCDContextValue['saveCandidateDraft'] = (dossierId, updates) => {
    const now = new Date().toISOString();
    setState((prev) => ({
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
          researchProposalSummary: updates.researchProposalSummary ?? d.researchProposalSummary,
          draftSavedAt: now,
          updatedAt: now,
        };
      }),
    }));
  };

  const confirmAdmissionSubject = (dossierId: string, subjectId: string) => {
    const now = new Date().toISOString();
    setState((prev) => ({
      ...prev,
      dossiers: prev.dossiers.map((d) =>
        d.id === dossierId
          ? {
              ...d,
              confirmedSubjectId: subjectId,
              updatedAt: now,
            }
          : d
      ),
    }));
  };

  const uploadCandidateDocument: GCDContextValue['uploadCandidateDocument'] = (
    dossierId,
    requirementId,
    file
  ) => {
    const req = state.campaignConfig.documentRequirements.find((r) => r.id === requirementId);
    if (!req) {
      return { ok: false, error: 'Type de pièce introuvable dans la configuration.' };
    }

    const ext = file.fileName.split('.').pop()?.toUpperCase() || '';
    const normalizedExt = ext === 'JPEG' ? 'JPG' : ext;
    if (!req.acceptedFormats.includes(normalizedExt)) {
      return {
        ok: false,
        error: `Format non accepté (${ext || 'inconnu'}). Formats autorisés pour cette pièce : ${req.acceptedFormats.join(', ')}.`,
      };
    }

    const maxKB = req.maxSizeMB * 1024;
    if (file.fileSizeKB > maxKB) {
      return {
        ok: false,
        error: `Fichier trop volumineux (${(file.fileSizeKB / 1024).toFixed(1)} Mo). Taille maximale autorisée : ${req.maxSizeMB} Mo.`,
      };
    }

    const now = new Date().toISOString();
    setState((prev) => ({
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
        };
        return {
          ...d,
          documents: exists
            ? d.documents.map((doc) => (doc.requirementId === requirementId ? updatedDoc : doc))
            : [...d.documents, updatedDoc],
          draftSavedAt: now,
          updatedAt: now,
        };
      }),
    }));

    return { ok: true };
  };

  const submitCandidateApplication = (dossierId: string) => {
    if (!state.campaignConfig.campaignOpen) {
      return { ok: false, error: 'La campagne de préinscription est actuellement clôturée.' };
    }
    const target = state.dossiers.find((d) => d.id === dossierId);
    if (!target) return { ok: false, error: 'Dossier introuvable.' };

    const requiredCount = Math.max(1, state.campaignConfig.requiredSubjectChoices || 3);
    if (target.subjectChoices.length < requiredCount) {
      return {
        ok: false,
        error: `Vous devez sélectionner ${requiredCount} sujets de thèse avant de soumettre votre candidature (${target.subjectChoices.length}/${requiredCount} sélectionné(s)).`,
      };
    }

    const now = new Date().toISOString();
    const codesSummary = target.subjectChoices
      .map((ch) => {
        const s = state.subjects.find((sub) => sub.id === ch.subjectId);
        return `Choix ${ch.priority} : ${s?.code || ch.subjectId}`;
      })
      .join(' · ');

    const notif = pushNotification(
      target.accountId,
      `Candidature ${target.dossierNumber} soumise (${target.subjectChoices.length} sujets)`,
      `Vos vœux (${codesSummary}) ont bien été enregistrés et transmis aux commissions de sélection concernées.`,
      'info',
      'suivi'
    );

    setState((prev) => ({
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
      notifications: [notif, ...prev.notifications],
    }));

    return { ok: true };
  };

  const submitFinalEnrollment = (dossierId: string) => {
    const target = state.dossiers.find((d) => d.id === dossierId);
    if (!target) return;
    const now = new Date().toISOString();
    const notif = pushNotification(
      target.accountId,
      'Dossier d’inscription administrative transmis au CEDoc',
      'Vos pièces d’inscription définitive ont été soumises pour contrôle de conformité par l’administration.',
      'info',
      'suivi'
    );

    setState((prev) => ({
      ...prev,
      dossiers: prev.dossiers.map((d) =>
        d.id === dossierId
          ? {
              ...d,
              enrollmentSubmittedAt: now,
              updatedAt: now,
            }
          : d
      ),
      notifications: [notif, ...prev.notifications],
    }));
  };

  const markNotificationRead = (notificationId: string) => {
    setState((prev) => ({
      ...prev,
      notifications: prev.notifications.map((n) =>
        n.id === notificationId ? { ...n, read: true } : n
      ),
    }));
  };

  const markAllNotificationsRead = (accountId: string) => {
    setState((prev) => ({
      ...prev,
      notifications: prev.notifications.map((n) =>
        n.recipientAccountId === accountId ? { ...n, read: true } : n
      ),
    }));
  };

  // Commission actions (par sujet choisi)
  const setPreselectionDecision = (
    dossierId: string,
    subjectId: string,
    retained: boolean,
    note: string
  ) => {
    const target = state.dossiers.find((d) => d.id === dossierId);
    const subject = state.subjects.find((s) => s.id === subjectId);
    const choice = target?.subjectChoices.find((c) => c.subjectId === subjectId);
    if (!target || !choice) return;

    const now = new Date().toISOString();
    const nextChoiceStatus: SubjectChoiceStatus = retained ? 'en_cours' : 'non_retenu';
    const choiceLabel = `Choix n°${choice.priority} (${subject?.code || subjectId})`;

    const notif = pushNotification(
      target.accountId,
      retained
        ? `Présélection favorable — ${choiceLabel}`
        : `Décision de présélection — ${choiceLabel}`,
      retained
        ? `Votre dossier a franchi l’étape d’examen initial pour le sujet ${subject?.code || ''}. Vous serez informé(e) prochainement des modalités d’entretien.`
        : `Après examen de votre dossier pour le sujet ${subject?.code || ''}, ce vœu n’a pas été retenu. Motif : ${note || 'Adéquation scientifique ou seuils réglementaires.'}`,
      'resultat',
      'suivi'
    );

    setState((prev) => ({
      ...prev,
      dossiers: prev.dossiers.map((d) => {
        if (d.id !== dossierId) return d;
        const updatedChoices = d.subjectChoices.map((c) =>
          c.subjectId === subjectId
            ? {
                ...c,
                status: nextChoiceStatus,
                preselectionNote: note,
                rejectionReason: retained ? undefined : note,
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
      notifications: [notif, ...prev.notifications],
    }));
  };

  const scheduleCandidateInterview = (
    dossierId: string,
    subjectId: string,
    interview: InterviewInfo
  ) => {
    const target = state.dossiers.find((d) => d.id === dossierId);
    const subject = state.subjects.find((s) => s.id === subjectId);
    const choice = target?.subjectChoices.find((c) => c.subjectId === subjectId);
    if (!target || !choice) return;

    const now = new Date().toISOString();
    const notif = pushNotification(
      target.accountId,
      `Convocation entretien [Choix n°${choice.priority} · ${subject?.code || ''}] le ${interview.date} à ${interview.time}`,
      `Modalité : ${interview.modality === 'presentiel' ? 'Présentiel' : 'Visioconférence'} — ${interview.location}. Consultez l’onglet Suivi pour les consignes.`,
      'entretien',
      'suivi'
    );

    setState((prev) => ({
      ...prev,
      dossiers: prev.dossiers.map((d) => {
        if (d.id !== dossierId) return d;
        const updatedChoices = d.subjectChoices.map((c) =>
          c.subjectId === subjectId
            ? {
                ...c,
                status: 'entretien' as const,
                interview,
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
      notifications: [notif, ...prev.notifications],
    }));
  };

  const saveCandidateEvaluation = (
    dossierId: string,
    subjectId: string,
    academicScore: number,
    interviewScore: number,
    observations: string,
    evaluatorName: string
  ) => {
    const { dossierWeight, interviewWeight } = state.campaignConfig;
    const weightedScore = Number(
      (
        (academicScore * dossierWeight + interviewScore * interviewWeight) /
        Math.max(1, dossierWeight + interviewWeight)
      ).toFixed(2)
    );
    const now = new Date().toISOString();

    setState((prev) => ({
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
        return {
          ...d,
          subjectChoices: updatedChoices,
          updatedAt: now,
        };
      }),
    }));
  };

  const setCommissionFinalDecision: GCDContextValue['setCommissionFinalDecision'] = (
    dossierId,
    subjectId,
    decision,
    options
  ) => {
    const target = state.dossiers.find((d) => d.id === dossierId);
    const subject = state.subjects.find((s) => s.id === subjectId);
    const choice = target?.subjectChoices.find((c) => c.subjectId === subjectId);
    if (!target || !choice) return;

    const now = new Date().toISOString();
    const choiceTag = `Choix n°${choice.priority} · ${subject?.code || subjectId}`;

    let title = '';
    let message = '';
    if (decision === 'admis') {
      title = `Admis(e) en liste principale [${choiceTag}]`;
      message = `Félicitations ! Vous êtes retenu(e) en liste principale sur le sujet « ${subject?.title || ''} ». Déposez vos pièces d’inscription définitive avant la date limite.`;
    } else if (decision === 'liste_attente') {
      title = `Liste d’attente — Rang ${options?.waitlistRank || 1} [${choiceTag}]`;
      message = `Vous figurez au rang ${options?.waitlistRank || 1} de la liste d’attente officielle pour le sujet ${subject?.code || ''}. Vous serez notifié(e) en cas de désistement.`;
    } else {
      title = `Résultat de sélection : Non retenu [${choiceTag}]`;
      message =
        options?.rejectionReason ||
        `Au terme des auditions et du classement pour le sujet ${subject?.code || ''}, ce choix n’a pas pu être retenu.`;
    }

    const notif = pushNotification(target.accountId, title, message, 'resultat', 'suivi');

    setState((prev) => ({
      ...prev,
      dossiers: prev.dossiers.map((d) => {
        if (d.id !== dossierId) return d;
        const updatedChoices = d.subjectChoices.map((c) =>
          c.subjectId === subjectId
            ? {
                ...c,
                status: decision,
                waitlistRank: decision === 'liste_attente' ? options?.waitlistRank || 1 : undefined,
                rejectionReason: decision === 'non_retenu' ? options?.rejectionReason : undefined,
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
      notifications: [notif, ...prev.notifications],
    }));
  };

  const callNextOnWaitlist = (subjectId: string) => {
    const subject = state.subjects.find((s) => s.id === subjectId);
    const waitlistedEntries = state.dossiers
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
    const notif = pushNotification(
      promoted.dossier.accountId,
      `Appel liste d’attente : Admission en liste principale [${subject?.code || ''}] !`,
      `Suite à une place disponible sur votre Choix n°${promoted.choice.priority} (${subject?.code || ''}), vous passez en liste principale. Vous pouvez déposer votre dossier d’inscription définitive.`,
      'resultat',
      'pieces'
    );

    setState((prev) => ({
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
      notifications: [notif, ...prev.notifications],
    }));

    return {
      ok: true,
      promotedName: `${promoted.dossier.personalInfo.firstName} ${promoted.dossier.personalInfo.lastName}`,
    };
  };

  // Admin actions
  const reviewDocumentStatus: GCDContextValue['reviewDocumentStatus'] = (
    dossierId,
    requirementId,
    status,
    comment
  ) => {
    const target = state.dossiers.find((d) => d.id === dossierId);
    const req = state.campaignConfig.documentRequirements.find((r) => r.id === requirementId);
    if (!target || !req) return;
    const now = new Date().toISOString();
    const reviewer = currentUser?.fullName || 'Administration CEDoc';

    const newNotifications = [...state.notifications];
    if (status === 'a_corriger') {
      newNotifications.unshift(
        pushNotification(
          target.accountId,
          `Pièce à corriger : ${req.label}`,
          comment || 'Merci de déposer une version lisible et conforme de ce document.',
          'correction',
          'pieces'
        )
      );
    }

    setState((prev) => ({
      ...prev,
      dossiers: prev.dossiers.map((d) => {
        if (d.id !== dossierId) return d;
        return {
          ...d,
          documents: d.documents.map((doc) =>
            doc.requirementId === requirementId
              ? {
                  ...doc,
                  status,
                  reviewComment: status === 'a_corriger' ? comment : undefined,
                  reviewedBy: reviewer,
                  reviewedAt: now,
                }
              : doc
          ),
          updatedAt: now,
        };
      }),
      notifications: newNotifications,
    }));
  };

  const validateAdministrativeEnrollment = (dossierId: string) => {
    const target = state.dossiers.find((d) => d.id === dossierId);
    if (!target) return { ok: false, error: 'Dossier introuvable.' };

    const hasCorrection = target.documents.some((doc) => doc.status === 'a_corriger');
    if (hasCorrection) {
      return {
        ok: false,
        error: 'Impossible de valider : au moins une pièce est encore marquée « À corriger ».',
      };
    }

    const requiredIds = state.campaignConfig.documentRequirements
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

    const notif = pushNotification(
      target.accountId,
      `Inscription doctorale validée (${enrollmentNumber})`,
      'Votre dossier est déclaré conforme par l’administration du CEDoc. Votre attestation d’inscription au cycle doctoral est disponible.',
      'resultat',
      'suivi'
    );

    setState((prev) => ({
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
              enrollmentValidatedAt: now,
              enrollmentNumber,
              updatedAt: now,
            }
          : d
      ),
      notifications: [notif, ...prev.notifications],
    }));

    return { ok: true, enrollmentNumber };
  };

  const requestDossierCorrections = (dossierId: string, globalMessage: string) => {
    const target = state.dossiers.find((d) => d.id === dossierId);
    if (!target) return;
    const notif = pushNotification(
      target.accountId,
      'Demande de régularisation administrative sur votre dossier',
      globalMessage,
      'correction',
      'pieces'
    );
    setState((prev) => ({
      ...prev,
      notifications: [notif, ...prev.notifications],
    }));
  };

  const upsertThesisSubject: GCDContextValue['upsertThesisSubject'] = (subject) => {
    setState((prev) => {
      if (subject.id) {
        return {
          ...prev,
          subjects: prev.subjects.map((s) =>
            s.id === subject.id ? ({ ...subject, id: subject.id } as ThesisSubject) : s
          ),
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
        ...prev,
        subjects: [created, ...prev.subjects],
      };
    });
  };

  const toggleSubjectOpen = (subjectId: string) => {
    setState((prev) => ({
      ...prev,
      subjects: prev.subjects.map((s) =>
        s.id === subjectId ? { ...s, open: !s.open } : s
      ),
    }));
  };

  const updateCampaignSettings: GCDContextValue['updateCampaignSettings'] = (partial) => {
    setState((prev) => ({
      ...prev,
      campaignConfig: {
        ...prev.campaignConfig,
        ...partial,
      },
    }));
  };

  const upsertDocumentRequirement: GCDContextValue['upsertDocumentRequirement'] = (req) => {
    setState((prev) => {
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
        ...prev,
        campaignConfig: {
          ...prev.campaignConfig,
          documentRequirements: updatedList,
        },
      };
    });
  };

  const deleteDocumentRequirement = (reqId: string) => {
    setState((prev) => ({
      ...prev,
      campaignConfig: {
        ...prev.campaignConfig,
        documentRequirements: prev.campaignConfig.documentRequirements.filter(
          (r) => r.id !== reqId
        ),
      },
    }));
  };

  const upsertIntervenantAccount: GCDContextValue['upsertIntervenantAccount'] = (payload) => {
    setState((prev) => {
      if (payload.id) {
        return {
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
        ...prev,
        accounts: [...prev.accounts, created],
      };
    });
  };

  const toggleAccountActive = (accountId: string) => {
    setState((prev) => ({
      ...prev,
      accounts: prev.accounts.map((a) =>
        a.id === accountId ? { ...a, active: !a.active } : a
      ),
    }));
  };

  const publishCampaignResults = (published: boolean) => {
    setState((prev) => {
      const extraNotifs: NotificationItem[] = [];
      if (published && !prev.campaignConfig.resultsPublished) {
        prev.dossiers.forEach((d) => {
          if (
            d.status === 'admis' ||
            d.status === 'liste_attente' ||
            d.status === 'non_retenu'
          ) {
            extraNotifs.push(
              pushNotification(
                d.accountId,
                `Publication officielle des résultats ${prev.campaignConfig.academicYear}`,
                'Les résultats officiels de la campagne doctorale ont été publiés par le Pôle d’Études Doctorales. Consultez le détail de vos 3 choix dans votre espace de suivi.',
                'resultat',
                'suivi'
              )
            );
          }
        });
      }
      return {
        ...prev,
        campaignConfig: {
          ...prev.campaignConfig,
          resultsPublished: published,
        },
        notifications: [...extraNotifs, ...prev.notifications],
      };
    });
  };

  const submitSupportTicket: GCDContextValue['submitSupportTicket'] = (ticket) => {
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
      createdAt: new Date().toISOString(),
      status: 'ouvert',
    };
    setState((prev) => ({
      ...prev,
      supportTickets: [created, ...prev.supportTickets],
    }));
    return created;
  };

  const replyToSupportTicket = (ticketId: string, reply: string) => {
    const target = state.supportTickets.find((t) => t.id === ticketId);
    const now = new Date().toISOString();
    setState((prev) => {
      const nextNotifs = [...prev.notifications];
      if (target?.accountId) {
        nextNotifs.unshift(
          pushNotification(
            target.accountId,
            `Réponse du support GCD (${target.reference})`,
            reply,
            'info',
            'suivi'
          )
        );
      }
      return {
        ...prev,
        supportTickets: prev.supportTickets.map((t) =>
          t.id === ticketId
            ? { ...t, status: 'repondu', reply, repliedAt: now }
            : t
        ),
        notifications: nextNotifs,
      };
    });
  };

  const resetDemoData = () => {
    localStorage.removeItem(STORAGE_KEY);
    setState({
      accounts: INITIAL_ACCOUNTS,
      subjects: INITIAL_SUBJECTS,
      dossiers: INITIAL_DOSSIERS,
      notifications: INITIAL_NOTIFICATIONS,
      campaignConfig: INITIAL_CAMPAIGN_CONFIG,
      supportTickets: INITIAL_SUPPORT_TICKETS,
      currentAccountId: state.currentAccountId,
    });
  };

  return (
    <GCDContext.Provider
      value={{
        accounts: state.accounts,
        subjects: state.subjects,
        dossiers: state.dossiers,
        notifications: state.notifications,
        campaignConfig: state.campaignConfig,
        supportTickets: state.supportTickets,
        currentUser,
        currentCandidateDossier,
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
        reviewDocumentStatus,
        validateAdministrativeEnrollment,
        requestDossierCorrections,
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
