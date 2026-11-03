import type {
  ApplicationStatus,
  CampaignConfig,
  CandidateDossier,
  DocumentCorrectionRequest,
  DocumentRequirement,
  DocumentStatus,
  SubjectChoice,
  SubjectChoiceStatus,
  ThesisSubject,
} from '../types/gcd.ts';

export function formatDateFR(dateStr?: string, withTime = false): string {
  if (!dateStr) return '—';
  // Handle YYYY-MM-DD cleanly without timezone shift
  if (!withTime && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [y, m, d] = dateStr.split('-').map(Number);
    const localDate = new Date(y, m - 1, d);
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    }).format(localDate);
  }
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return dateStr;
  if (withTime) {
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  }
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

export function getTodayISO(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function addDaysISO(baseDateISO: string, daysToAdd: number): string {
  const parts = baseDateISO.slice(0, 10).split('-').map(Number);
  const base =
    parts.length === 3 && !parts.some((n) => Number.isNaN(n))
      ? new Date(parts[0], parts[1] - 1, parts[2])
      : new Date();
  base.setDate(base.getDate() + daysToAdd);
  return getTodayISO(base);
}

export function diffInCalendarDays(deadlineISO: string, referenceISO?: string): number | null {
  if (!deadlineISO || !/^\d{4}-\d{2}-\d{2}/.test(deadlineISO)) return null;
  const [dy, dm, dd] = deadlineISO.slice(0, 10).split('-').map(Number);
  const refStr = referenceISO && /^\d{4}-\d{2}-\d{2}/.test(referenceISO)
    ? referenceISO.slice(0, 10)
    : getTodayISO();
  const [ry, rm, rd] = refStr.split('-').map(Number);
  const targetMs = Date.UTC(dy, dm - 1, dd);
  const refMs = Date.UTC(ry, rm - 1, rd);
  return Math.round((targetMs - refMs) / 86_400_000);
}

export interface DeadlineInfo {
  daysLeft: number;
  isExpired: boolean;
  isUrgent: boolean;
  isWarning: boolean;
  shortCountdown: string;
  statusLabel: string;
  textClass: string;
}

export function computeDeadlineInfo(deadlineISO?: string, referenceISO?: string): DeadlineInfo | null {
  if (!deadlineISO) return null;
  const daysLeft = diffInCalendarDays(deadlineISO, referenceISO);
  if (daysLeft === null) return null;

  if (daysLeft < 0) {
    const overdue = Math.abs(daysLeft);
    return {
      daysLeft,
      isExpired: true,
      isUrgent: true,
      isWarning: false,
      shortCountdown: `Expiré (${overdue} j)`,
      statusLabel:
        overdue === 1
          ? 'Délai expiré depuis 1 jour'
          : `Délai expiré depuis ${overdue} jours`,
      textClass: 'text-red-700',
    };
  }

  if (daysLeft === 0) {
    return {
      daysLeft: 0,
      isExpired: false,
      isUrgent: true,
      isWarning: true,
      shortCountdown: 'Aujourd’hui (J-0)',
      statusLabel: 'Expire aujourd’hui',
      textClass: 'text-red-700',
    };
  }

  if (daysLeft <= 3) {
    return {
      daysLeft,
      isExpired: false,
      isUrgent: true,
      isWarning: true,
      shortCountdown: `J-${daysLeft}`,
      statusLabel: `${daysLeft} jour${daysLeft > 1 ? 's' : ''} restant${daysLeft > 1 ? 's' : ''} (J-${daysLeft})`,
      textClass: 'text-amber-700',
    };
  }

  if (daysLeft <= 7) {
    return {
      daysLeft,
      isExpired: false,
      isUrgent: false,
      isWarning: true,
      shortCountdown: `J-${daysLeft}`,
      statusLabel: `${daysLeft} jours restants (J-${daysLeft})`,
      textClass: 'text-amber-700',
    };
  }

  return {
    daysLeft,
    isExpired: false,
    isUrgent: false,
    isWarning: false,
    shortCountdown: `J-${daysLeft}`,
    statusLabel: `${daysLeft} jours restants`,
    textClass: 'text-slate-600',
  };
}

export function formatFileSize(kb: number): string {
  if (kb >= 1024) {
    return `${(kb / 1024).toFixed(2).replace('.', ',')} Mo`;
  }
  return `${Math.round(kb)} Ko`;
}

export interface StatusPresentation {
  label: string;
  shortLabel: string;
  description: string;
  textClass: string;
  surfaceClass: string;
  stepIndex: number;
}

export function getStatusPresentation(status: ApplicationStatus | SubjectChoiceStatus): StatusPresentation {
  switch (status) {
    case 'brouillon':
      return {
        label: 'Brouillon en cours',
        shortLabel: 'Brouillon',
        description: 'Votre dossier est sauvegardé mais n’a pas encore été transmis aux commissions.',
        textClass: 'text-slate-700',
        surfaceClass: 'bg-slate-100 border-slate-200 text-slate-800',
        stepIndex: 0,
      };
    case 'soumis':
      return {
        label: 'Candidature soumise',
        shortLabel: 'Soumis',
        description: 'Votre dossier et vos choix de sujets sont enregistrés et transmis aux commissions.',
        textClass: 'text-blue-700',
        surfaceClass: 'bg-blue-50 border-blue-200 text-blue-900',
        stepIndex: 1,
      };
    case 'en_cours':
      return {
        label: 'En cours de traitement',
        shortLabel: 'Présélectionné',
        description: 'La commission pédagogique examine vos prérequis et pièces académiques.',
        textClass: 'text-amber-700',
        surfaceClass: 'bg-amber-50 border-amber-200 text-amber-900',
        stepIndex: 2,
      };
    case 'entretien':
      return {
        label: 'Convoqué(e) à l’entretien',
        shortLabel: 'Entretien',
        description: 'Vous êtes présélectionné(e). Consultez vos convocations pour les auditions orales.',
        textClass: 'text-blue-700',
        surfaceClass: 'bg-blue-50 border-blue-200 text-blue-900',
        stepIndex: 3,
      };
    case 'admis':
      return {
        label: 'Admis(e) en liste principale',
        shortLabel: 'Admis',
        description: 'Vous êtes retenu(e) en liste principale. Complétez votre dossier d’inscription définitive.',
        textClass: 'text-emerald-700',
        surfaceClass: 'bg-emerald-50 border-emerald-200 text-emerald-900',
        stepIndex: 4,
      };
    case 'liste_attente':
      return {
        label: 'Inscrit(e) sur liste d’attente',
        shortLabel: 'Liste d’attente',
        description: 'Vous serez contacté(e) par ordre de mérite si une place se libère en liste principale.',
        textClass: 'text-amber-700',
        surfaceClass: 'bg-amber-50 border-amber-200 text-amber-900',
        stepIndex: 4,
      };
    case 'non_retenu':
      return {
        label: 'Candidature non retenue',
        shortLabel: 'Non retenu',
        description: 'Cette candidature n’a pas été retenue au terme de la session de sélection.',
        textClass: 'text-red-700',
        surfaceClass: 'bg-red-50 border-red-200 text-red-900',
        stepIndex: 4,
      };
    case 'inscrit':
      return {
        label: 'Inscription définitive validée',
        shortLabel: 'Inscrit(e)',
        description: 'Votre dossier administratif est conforme et votre inscription au cycle doctoral est effective.',
        textClass: 'text-emerald-800',
        surfaceClass: 'bg-emerald-50 border-emerald-300 text-emerald-950',
        stepIndex: 5,
      };
  }
}

export function deriveGlobalDossierStatus(
  choices: SubjectChoice[],
  currentStatus: ApplicationStatus
): ApplicationStatus {
  if (currentStatus === 'brouillon' || currentStatus === 'inscrit') {
    return currentStatus;
  }
  if (!choices || choices.length === 0) {
    return 'soumis';
  }
  if (choices.some((c) => c.status === 'admis')) return 'admis';
  if (choices.some((c) => c.status === 'liste_attente')) return 'liste_attente';
  if (choices.some((c) => c.status === 'entretien')) return 'entretien';
  if (choices.some((c) => c.status === 'en_cours')) return 'en_cours';
  if (choices.every((c) => c.status === 'non_retenu')) return 'non_retenu';
  return 'soumis';
}

export function getDocStatusPresentation(status: DocumentStatus): {
  label: string;
  textClass: string;
  boxClass: string;
} {
  switch (status) {
    case 'manquante':
      return {
        label: 'Manquante',
        textClass: 'text-amber-700',
        boxClass: 'bg-amber-50/70 border-amber-200',
      };
    case 'deposee':
      return {
        label: 'Déposée',
        textClass: 'text-blue-700',
        boxClass: 'bg-white border-slate-200',
      };
    case 'a_corriger':
      return {
        label: 'À corriger',
        textClass: 'text-red-700',
        boxClass: 'bg-red-50/70 border-red-300',
      };
    case 'validee':
      return {
        label: 'Validée conforme',
        textClass: 'text-emerald-700',
        boxClass: 'bg-emerald-50/40 border-emerald-200',
      };
  }
}

export interface DossierCorrectionDiag {
  requirement: DocumentRequirement;
  comment: string;
  deadline?: string;
  deadlineInfo?: DeadlineInfo | null;
  request?: DocumentCorrectionRequest;
}

export interface DossierDiagnostics {
  completionPercent: number;
  personalMissing: string[];
  academicMissing: string[];
  academicRuleWarnings: string[];
  selectedSubjectsCount: number;
  requiredSubjectsCount: number;
  subjectsMissingCount: number;
  subjectMissing: boolean;
  motivationMissing: boolean;
  missingPreinscriptionDocs: DocumentRequirement[];
  missingInscriptionDocs: DocumentRequirement[];
  docsToCorrect: DossierCorrectionDiag[];
  canSubmitPreinscription: boolean;
  canSubmitEnrollment: boolean;
}

export function getActiveCorrectionRequest(
  dossier: CandidateDossier,
  requirementId: string
): DocumentCorrectionRequest | undefined {
  return (dossier.correctionRequests || []).find(
    (req) => req.requirementId === requirementId && req.status === 'pending'
  );
}

export function computeDossierDiagnostics(
  dossier: CandidateDossier,
  config: CampaignConfig,
  subjects: ThesisSubject[]
): DossierDiagnostics {
  const p = dossier.personalInfo;
  const personalMissing: string[] = [];
  if (!p.lastName.trim()) personalMissing.push('Nom');
  if (!p.firstName.trim()) personalMissing.push('Prénom');
  if (!p.cin.trim()) personalMissing.push('CIN / Passeport');
  if (!p.cne.trim()) personalMissing.push('Code CNE / Massar');
  if (!p.birthDate.trim()) personalMissing.push('Date de naissance');
  if (!p.birthPlace.trim()) personalMissing.push('Lieu de naissance');
  if (!p.email.trim() || !p.email.includes('@')) personalMissing.push('Adresse e-mail valide');
  if (!p.phone.trim()) personalMissing.push('Téléphone');
  if (!p.address.trim()) personalMissing.push('Adresse postale');
  if (p.employmentStatus !== 'etudiant' && !p.employerName?.trim()) {
    personalMissing.push('Organisme employeur');
  }

  const a = dossier.academicInfo;
  const academicMissing: string[] = [];
  const academicRuleWarnings: string[] = [];
  if (!a.bacSeries.trim()) academicMissing.push('Série du Baccalauréat');
  if (!a.bacYear.trim()) academicMissing.push('Année du Baccalauréat');
  if (!a.bacAverage.trim()) academicMissing.push('Moyenne du Baccalauréat');
  if (!a.licenceTitle.trim()) academicMissing.push('Intitulé de la Licence (Bac+3)');
  if (!a.licenceInstitution.trim()) academicMissing.push('Établissement de la Licence');
  if (!a.licenceAverage.trim()) academicMissing.push('Moyenne de la Licence');
  if (!a.masterTitle.trim()) academicMissing.push('Intitulé du Master / Diplôme Bac+5');
  if (!a.masterInstitution.trim()) academicMissing.push('Établissement du Master');
  if (!a.masterYear.trim()) academicMissing.push('Année d’obtention Bac+5');
  if (!a.masterAverage.trim()) {
    academicMissing.push('Moyenne générale Bac+5');
  } else {
    const parsedAvg = Number.parseFloat(a.masterAverage.replace(',', '.'));
    if (Number.isNaN(parsedAvg) || parsedAvg < 0 || parsedAvg > 20) {
      academicRuleWarnings.push('La moyenne générale Bac+5 doit être comprise entre 0 et 20.');
    } else if (parsedAvg < config.minMasterAverage) {
      academicRuleWarnings.push(
        `La moyenne Bac+5 saisie (${parsedAvg.toFixed(2)}/20) est inférieure au seuil minimal fixé pour cette campagne (${config.minMasterAverage}/20).`
      );
    }
  }
  if (!a.pfeTitle.trim()) academicMissing.push('Sujet du mémoire / PFE');

  const requiredSubjectsCount = Math.max(1, config.requiredSubjectChoices || 3);
  const validChoices = (dossier.subjectChoices || []).filter((c) =>
    subjects.some((s) => s.id === c.subjectId)
  );
  const distinctSubjectIds = Array.from(new Set(validChoices.map((c) => c.subjectId)));
  const selectedSubjectsCount = distinctSubjectIds.length;
  const subjectsMissingCount = Math.max(0, requiredSubjectsCount - selectedSubjectsCount);
  const subjectMissing = subjectsMissingCount > 0;

  const motivationMissing = dossier.motivation.trim().length < 30;

  const preReqs = config.documentRequirements.filter(
    (r) => r.stage === 'preinscription' && r.required
  );
  const inscReqs = config.documentRequirements.filter(
    (r) => r.stage === 'inscription' && r.required
  );

  const missingPreinscriptionDocs = preReqs.filter(
    (req) => !dossier.documents.some((d) => d.requirementId === req.id)
  );
  const missingInscriptionDocs = inscReqs.filter(
    (req) => !dossier.documents.some((d) => d.requirementId === req.id)
  );

  const docsToCorrectMap = new Map<string, DossierCorrectionDiag>();

  for (const doc of dossier.documents) {
    if (doc.status === 'a_corriger') {
      const req = config.documentRequirements.find((r) => r.id === doc.requirementId);
      const activeReq = getActiveCorrectionRequest(dossier, doc.requirementId);
      const deadline = activeReq?.deadline || doc.correctionDeadline;
      if (req) {
        docsToCorrectMap.set(req.id, {
          requirement: req,
          comment:
            activeReq?.reason ||
            doc.reviewComment ||
            'Merci de déposer une version lisible et conforme.',
          deadline,
          deadlineInfo: computeDeadlineInfo(deadline),
          request: activeReq,
        });
      }
    }
  }

  // Also include pending correction requests on missing documents (Section 2: document manquant signalé)
  for (const corrReq of dossier.correctionRequests || []) {
    if (corrReq.status === 'pending' && !docsToCorrectMap.has(corrReq.requirementId)) {
      const req = config.documentRequirements.find((r) => r.id === corrReq.requirementId);
      if (req) {
        docsToCorrectMap.set(req.id, {
          requirement: req,
          comment: corrReq.reason,
          deadline: corrReq.deadline,
          deadlineInfo: computeDeadlineInfo(corrReq.deadline),
          request: corrReq,
        });
      }
    }
  }

  const docsToCorrect = Array.from(docsToCorrectMap.values()).sort((a, b) => {
    const da = a.deadlineInfo?.daysLeft ?? 999;
    const db = b.deadlineInfo?.daysLeft ?? 999;
    return da - db;
  });

  const totalChecks = 4 + preReqs.length;
  let passedChecks = 0;
  if (personalMissing.length === 0) passedChecks += 1;
  else if (personalMissing.length <= 3) passedChecks += 0.5;

  if (academicMissing.length === 0 && academicRuleWarnings.length === 0) passedChecks += 1;
  else if (academicMissing.length <= 3) passedChecks += 0.5;

  passedChecks += Math.min(1, selectedSubjectsCount / requiredSubjectsCount);
  if (!motivationMissing) passedChecks += 1;

  for (const req of preReqs) {
    const uploaded = dossier.documents.find((d) => d.requirementId === req.id);
    if (uploaded && uploaded.status !== 'a_corriger') {
      passedChecks += 1;
    } else if (uploaded && uploaded.status === 'a_corriger') {
      passedChecks += 0.4;
    }
  }

  const completionPercent = Math.min(
    100,
    Math.round((passedChecks / Math.max(1, totalChecks)) * 100)
  );

  const canSubmitPreinscription =
    config.campaignOpen &&
    personalMissing.length === 0 &&
    academicMissing.length === 0 &&
    academicRuleWarnings.length === 0 &&
    !subjectMissing &&
    !motivationMissing &&
    missingPreinscriptionDocs.length === 0 &&
    docsToCorrect.length === 0;

  const canSubmitEnrollment =
    (dossier.status === 'admis' || dossier.status === 'inscrit') &&
    missingPreinscriptionDocs.length === 0 &&
    missingInscriptionDocs.length === 0 &&
    docsToCorrect.length === 0;

  return {
    completionPercent,
    personalMissing,
    academicMissing,
    academicRuleWarnings,
    selectedSubjectsCount,
    requiredSubjectsCount,
    subjectsMissingCount,
    subjectMissing,
    motivationMissing,
    missingPreinscriptionDocs,
    missingInscriptionDocs,
    docsToCorrect,
    canSubmitPreinscription,
    canSubmitEnrollment,
  };
}
