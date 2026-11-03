import type {
  AuditLogEntry,
  CandidateDossier,
  NotificationActionLabel,
  NotificationCategory,
  NotificationItem,
  SharedPlatformState,
  ThesisSubject,
  UserAccount,
  UserRole,
} from '../types/gcd.ts';
import { diffInCalendarDays, formatDateFR, getTodayISO } from '../utils/formatters.ts';

export interface CreateNotificationInput {
  recipientAccountId: string;
  recipientRole?: UserRole;
  title: string;
  message: string;
  category: NotificationCategory;
  urgent?: boolean;
  actionRequired?: boolean;
  deadline?: string;
  actionTab?: string;
  actionLabel?: NotificationActionLabel;
  targetDossierId?: string;
  targetSubjectId?: string;
  targetRequirementId?: string;
  dedupeKey?: string;
  createdAt?: string;
}

/**
 * Crée une notification uniquement si aucune notification identique (même destinataire + dedupeKey)
 * n'existe déjà dans l'historique actif, évitant tout doublon inutile (Section 1 & Section 8).
 */
export function appendDeduplicatedNotification(
  existingNotifications: NotificationItem[],
  input: CreateNotificationInput
): { notifications: NotificationItem[]; created: NotificationItem | null } {
  if (input.dedupeKey) {
    const alreadyExists = existingNotifications.some(
      (n) =>
        n.recipientAccountId === input.recipientAccountId &&
        n.dedupeKey === input.dedupeKey
    );
    if (alreadyExists) {
      return { notifications: existingNotifications, created: null };
    }
  } else {
    // Fallback anti-duplicate within 60 seconds for identical title + message
    const recentCutoff = Date.now() - 60_000;
    const duplicateRecent = existingNotifications.some(
      (n) =>
        n.recipientAccountId === input.recipientAccountId &&
        n.title === input.title &&
        n.message === input.message &&
        new Date(n.createdAt).getTime() >= recentCutoff
    );
    if (duplicateRecent) {
      return { notifications: existingNotifications, created: null };
    }
  }

  const created: NotificationItem = {
    id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    recipientAccountId: input.recipientAccountId,
    recipientRole: input.recipientRole,
    title: input.title,
    message: input.message,
    createdAt: input.createdAt || new Date().toISOString(),
    read: false,
    category: input.category,
    urgent: Boolean(input.urgent),
    actionRequired: Boolean(input.actionRequired),
    deadline: input.deadline,
    actionTab: input.actionTab,
    actionLabel: input.actionLabel,
    targetDossierId: input.targetDossierId,
    targetSubjectId: input.targetSubjectId,
    targetRequirementId: input.targetRequirementId,
    dedupeKey: input.dedupeKey,
  };

  return {
    notifications: [created, ...existingNotifications],
    created,
  };
}

export function createAuditEntry(params: {
  actorName: string;
  actorRole: UserRole | 'systeme';
  eventType: AuditLogEntry['eventType'];
  summary: string;
  dossierNumber?: string;
  targetAccountId?: string;
  timestamp?: string;
}): AuditLogEntry {
  return {
    id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    timestamp: params.timestamp || new Date().toISOString(),
    actorName: params.actorName,
    actorRole: params.actorRole,
    eventType: params.eventType,
    summary: params.summary,
    dossierNumber: params.dossierNumber,
    targetAccountId: params.targetAccountId,
  };
}

/**
 * Trie les notifications en plaçant en priorité les notifications non lues urgentes
 * ou nécessitant une action, puis les non lues récentes, puis l'historique lu (Section 4).
 */
export function sortNotificationsByPriority(
  items: NotificationItem[],
  referenceISO?: string
): NotificationItem[] {
  const getPriorityScore = (n: NotificationItem): number => {
    const daysLeft = n.deadline ? diffInCalendarDays(n.deadline, referenceISO) : null;
    const isDeadlineCritical = daysLeft !== null && daysLeft <= 3;
    const isUrgentOrAction = Boolean(n.urgent || n.actionRequired || isDeadlineCritical);

    if (!n.read && isUrgentOrAction) return 3;
    if (!n.read) return 2;
    if (isUrgentOrAction) return 1;
    return 0;
  };

  return [...items].sort((a, b) => {
    const pa = getPriorityScore(a);
    const pb = getPriorityScore(b);
    if (pb !== pa) return pb - pa;
    return b.createdAt.localeCompare(a.createdAt);
  });
}

/**
 * Identifie les comptes commission pertinents pour un ensemble de sujets choisis.
 */
export function getRelevantCommissionAccounts(
  accounts: UserAccount[],
  subjects: ThesisSubject[],
  subjectIds: string[]
): UserAccount[] {
  const activeCommissions = accounts.filter((a) => a.active && a.role === 'commission');
  if (activeCommissions.length === 0) return [];

  const targetSubjects = subjects.filter((s) => subjectIds.includes(s.id));
  const matched = activeCommissions.filter((comm) =>
    targetSubjects.some(
      (s) =>
        s.supervisorEmail.toLowerCase() === comm.email.toLowerCase() ||
        (comm.laboratoire &&
          s.laboratoire.toLowerCase() === comm.laboratoire.toLowerCase())
    )
  );

  return matched.length > 0 ? matched : [activeCommissions[0]];
}

export function getActiveAdminAccounts(accounts: UserAccount[]): UserAccount[] {
  return accounts.filter((a) => a.active && a.role === 'admin');
}

export interface DeadlineReconciliationResult {
  state: SharedPlatformState;
  newNotifications: NotificationItem[];
  newAuditLogs: AuditLogEntry[];
  changed: boolean;
}

/**
 * Évalue les délais (demandes de correction, clôture de campagne, entretiens),
 * génère les rappels configurés (ex. J-7, J-3, J-1) et signale les délais expirés
 * sans jamais rejeter automatiquement un candidat sauf si la règle administrative
 * `autoRejectOnExpiredCorrection` est explicitement activée (Section 3).
 */
export function reconcileDeadlinesAndReminders(
  current: SharedPlatformState,
  referenceDateISO?: string
): DeadlineReconciliationResult {
  const refDate = referenceDateISO || getTodayISO();
  const nowISO = new Date().toISOString();
  const policy = current.campaignConfig.deadlinePolicy || {
    defaultCorrectionDays: 7,
    reminderDaysBefore: [7, 3, 1],
    autoRejectOnExpiredCorrection: false,
  };
  const reminderSet = new Set(policy.reminderDaysBefore);

  let notifications = [...current.notifications];
  const createdNotifications: NotificationItem[] = [];
  const createdAudits: AuditLogEntry[] = [];
  let dossiersChanged = false;

  const pushNotif = (input: CreateNotificationInput) => {
    const res = appendDeduplicatedNotification(notifications, {
      ...input,
      createdAt: nowISO,
    });
    notifications = res.notifications;
    if (res.created) {
      createdNotifications.push(res.created);
    }
    return res.created;
  };

  const admins = getActiveAdminAccounts(current.accounts);

  const nextDossiers: CandidateDossier[] = current.dossiers.map((dossier) => {
    let dossierUpdated = dossier;

    // 1. Demandes de correction actives (status === 'pending')
    for (const corr of dossier.correctionRequests || []) {
      if (corr.status !== 'pending' || !corr.deadline) continue;
      const daysLeft = diffInCalendarDays(corr.deadline, refDate);
      if (daysLeft === null) continue;

      // Rappels configurables avant expiration (ex: J-7, J-3, J-1 ou J-0)
      if (daysLeft >= 0 && (reminderSet.has(daysLeft) || daysLeft === 0)) {
        const tag = daysLeft === 0 ? 'J0' : `J${daysLeft}`;
        const created = pushNotif({
          recipientAccountId: dossier.accountId,
          recipientRole: 'candidat',
          title:
            daysLeft === 0
              ? `Dernier jour — Document à corriger (${corr.documentCode})`
              : `Rappel J-${daysLeft} — Document à corriger (${corr.documentCode})`,
          message:
            daysLeft === 0
              ? `Date limite aujourd’hui (${formatDateFR(corr.deadline)}) pour déposer la version corrigée de « ${corr.documentLabel} ».`
              : `Il vous reste ${daysLeft} jour${daysLeft > 1 ? 's' : ''} pour déposer une nouvelle version de « ${corr.documentLabel} » (avant le ${formatDateFR(corr.deadline)}).`,
          category: 'rappel',
          urgent: daysLeft <= 3,
          actionRequired: true,
          deadline: corr.deadline,
          actionTab: 'pieces',
          actionLabel: 'Corriger',
          targetDossierId: dossier.id,
          targetRequirementId: corr.requirementId,
          dedupeKey: `reminder-corr-${dossier.id}-${corr.requirementId}-${corr.deadline}-${tag}`,
        });
        if (created) {
          createdAudits.push(
            createAuditEntry({
              actorName: 'Système des délais',
              actorRole: 'systeme',
              eventType: 'rappel_echeance',
              summary: `Rappel ${daysLeft === 0 ? 'J-0' : `J-${daysLeft}`} envoyé pour ${corr.documentCode} (échéance ${corr.deadline}).`,
              dossierNumber: dossier.dossierNumber,
              targetAccountId: dossier.accountId,
              timestamp: nowISO,
            })
          );
        }
      }

      // Délai expiré
      if (daysLeft < 0) {
        const candAlert = pushNotif({
          recipientAccountId: dossier.accountId,
          recipientRole: 'candidat',
          title: `Délai expiré — ${corr.documentCode}`,
          message: `La date limite du ${formatDateFR(corr.deadline)} pour corriger « ${corr.documentLabel} » est dépassée. Régularisez votre pièce ou contactez le CEDoc.`,
          category: 'correction',
          urgent: true,
          actionRequired: true,
          deadline: corr.deadline,
          actionTab: 'pieces',
          actionLabel: 'Corriger',
          targetDossierId: dossier.id,
          targetRequirementId: corr.requirementId,
          dedupeKey: `expired-cand-${dossier.id}-${corr.requirementId}-${corr.deadline}`,
        });

        for (const admin of admins) {
          pushNotif({
            recipientAccountId: admin.id,
            recipientRole: 'admin',
            title: `Délai expiré — ${dossier.dossierNumber} (${corr.documentCode})`,
            message: `${dossier.personalInfo.firstName} ${dossier.personalInfo.lastName} n’a pas déposé « ${corr.documentLabel} » avant le ${formatDateFR(corr.deadline)}.`,
            category: 'correction',
            urgent: true,
            actionRequired: true,
            deadline: corr.deadline,
            actionTab: 'verification',
            actionLabel: 'Voir',
            targetDossierId: dossier.id,
            targetRequirementId: corr.requirementId,
            dedupeKey: `expired-admin-${admin.id}-${dossier.id}-${corr.requirementId}-${corr.deadline}`,
          });
        }

        if (candAlert) {
          createdAudits.push(
            createAuditEntry({
              actorName: 'Système des délais',
              actorRole: 'systeme',
              eventType: 'rappel_echeance',
              summary: `Délai de correction expiré signalé pour ${corr.documentCode} (échéance ${corr.deadline}).`,
              dossierNumber: dossier.dossierNumber,
              targetAccountId: dossier.accountId,
              timestamp: nowISO,
            })
          );
        }

        // Application stricte de la règle administrative : AUCUN rejet automatique sauf si explicitement configuré
        if (
          policy.autoRejectOnExpiredCorrection &&
          dossierUpdated.status !== 'non_retenu' &&
          dossierUpdated.status !== 'inscrit'
        ) {
          dossiersChanged = true;
          const rejectionNote = `Dossier non régularisé avant l’échéance administrative du ${formatDateFR(corr.deadline)} (${corr.documentCode}).`;
          dossierUpdated = {
            ...dossierUpdated,
            status: 'non_retenu',
            subjectChoices: dossierUpdated.subjectChoices.map((ch) => ({
              ...ch,
              status: 'non_retenu',
              rejectionReason: rejectionNote,
            })),
            updatedAt: nowISO,
          };

          pushNotif({
            recipientAccountId: dossier.accountId,
            recipientRole: 'candidat',
            title: 'Candidature non retenue — Délai expiré',
            message: rejectionNote,
            category: 'resultat',
            urgent: true,
            actionTab: 'suivi',
            actionLabel: 'Consulter le résultat',
            targetDossierId: dossier.id,
            dedupeKey: `autoreject-${dossier.id}-${corr.requirementId}-${corr.deadline}`,
          });

          createdAudits.push(
            createAuditEntry({
              actorName: 'Règle administrative automatique',
              actorRole: 'systeme',
              eventType: 'statut_candidature',
              summary: `Rejet automatique appliqué suite à l’expiration du délai de correction (${corr.documentCode}).`,
              dossierNumber: dossier.dossierNumber,
              targetAccountId: dossier.accountId,
              timestamp: nowISO,
            })
          );
        }
      }
    }

    // 2. Rappels de date limite de candidature pour les brouillons en cours
    if (
      dossierUpdated.status === 'brouillon' &&
      current.campaignConfig.campaignOpen &&
      current.campaignConfig.submissionDeadline
    ) {
      const subDaysLeft = diffInCalendarDays(
        current.campaignConfig.submissionDeadline,
        refDate
      );
      if (
        subDaysLeft !== null &&
        subDaysLeft >= 0 &&
        (reminderSet.has(subDaysLeft) || subDaysLeft <= 2)
      ) {
        pushNotif({
          recipientAccountId: dossier.accountId,
          recipientRole: 'candidat',
          title:
            subDaysLeft === 0
              ? 'Dernier jour — Soumission de candidature'
              : `Rappel J-${subDaysLeft} — Clôture des candidatures`,
          message: `Votre dossier ${dossier.dossierNumber} est encore en brouillon. Date limite de soumission : ${formatDateFR(current.campaignConfig.submissionDeadline)}.`,
          category: 'rappel',
          urgent: subDaysLeft <= 3,
          actionRequired: true,
          deadline: current.campaignConfig.submissionDeadline,
          actionTab: 'suivi',
          actionLabel: 'Voir',
          targetDossierId: dossier.id,
          dedupeKey: `reminder-sub-${dossier.id}-${current.campaignConfig.submissionDeadline}-J${subDaysLeft}`,
        });
      }
    }

    // 3. Rappels d'entretiens proches (J-3, J-1)
    for (const choice of dossierUpdated.subjectChoices) {
      if (choice.status === 'entretien' && choice.interview?.date) {
        const intDays = diffInCalendarDays(choice.interview.date, refDate);
        if (intDays !== null && intDays >= 0 && intDays <= 3 && reminderSet.has(intDays)) {
          const subject = current.subjects.find((s) => s.id === choice.subjectId);
          pushNotif({
            recipientAccountId: dossier.accountId,
            recipientRole: 'candidat',
            title: `Rappel J-${intDays} — Entretien (${subject?.code || choice.subjectId})`,
            message: `Entretien prévu le ${formatDateFR(choice.interview.date)} à ${choice.interview.time} (${choice.interview.location}).`,
            category: 'entretien',
            urgent: intDays <= 1,
            deadline: choice.interview.date,
            actionTab: 'suivi',
            actionLabel: 'Voir',
            targetDossierId: dossier.id,
            targetSubjectId: choice.subjectId,
            dedupeKey: `reminder-int-${dossier.id}-${choice.subjectId}-${choice.interview.date}-J${intDays}`,
          });
        }
      }
    }

    return dossierUpdated;
  });

  const changed =
    dossiersChanged || createdNotifications.length > 0 || createdAudits.length > 0;

  if (!changed) {
    return {
      state: current,
      newNotifications: [],
      newAuditLogs: [],
      changed: false,
    };
  }

  return {
    state: {
      ...current,
      dossiers: nextDossiers,
      notifications,
      auditLogs: [...createdAudits, ...current.auditLogs].slice(0, 250),
    },
    newNotifications: createdNotifications,
    newAuditLogs: createdAudits,
    changed: true,
  };
}
