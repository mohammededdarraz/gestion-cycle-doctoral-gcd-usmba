import {
  ApplicationStatus,
  CampaignConfig,
  CandidateDossier,
  DocumentRequirement,
  DocumentStatus,
  SubjectChoice,
  SubjectChoiceStatus,
  ThesisSubject,
} from '../types/gcd';

export function formatDateFR(dateStr?: string, withTime = false): string {
  if (!dateStr) return '—';
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

/**
 * Calcule le statut global d'un dossier candidat à partir de l'état de ses 3 choix de sujets.
 */
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
  docsToCorrect: { requirement: DocumentRequirement; comment: string }[];
  canSubmitPreinscription: boolean;
  canSubmitEnrollment: boolean;
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
  // Count distinct valid subjects
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

  const docsToCorrect: { requirement: DocumentRequirement; comment: string }[] = [];
  for (const doc of dossier.documents) {
    if (doc.status === 'a_corriger') {
      const req = config.documentRequirements.find((r) => r.id === doc.requirementId);
      if (req) {
        docsToCorrect.push({
          requirement: req,
          comment: doc.reviewComment || 'Merci de fournir une version lisible et conforme.',
        });
      }
    }
  }

  // Compute weighted completion percentage for preinscription
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
