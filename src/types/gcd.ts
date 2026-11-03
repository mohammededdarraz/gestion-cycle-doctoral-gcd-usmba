export type UserRole = 'candidat' | 'commission' | 'admin';

export type DocumentStatus = 'manquante' | 'deposee' | 'a_corriger' | 'validee';

export type ApplicationStatus =
  | 'brouillon'
  | 'soumis'
  | 'en_cours'
  | 'entretien'
  | 'admis'
  | 'liste_attente'
  | 'non_retenu'
  | 'inscrit';

export type SubjectChoiceStatus = Exclude<ApplicationStatus, 'brouillon' | 'inscrit'>;

export type DocumentStage = 'preinscription' | 'inscription';

export interface DocumentRequirement {
  id: string;
  code: string;
  label: string;
  description: string;
  instructions: string;
  stage: DocumentStage;
  required: boolean;
  acceptedFormats: string[]; // ex: ['PDF', 'JPG', 'PNG']
  maxSizeMB: number;
}

export interface UploadedDocument {
  requirementId: string;
  fileName: string;
  fileSizeKB: number;
  mimeType: string;
  uploadedAt: string;
  status: Exclude<DocumentStatus, 'manquante'>; // 'deposee' | 'a_corriger' | 'validee'
  reviewComment?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  correctionDeadline?: string; // YYYY-MM-DD
}

export interface DocumentCorrectionRequest {
  id: string;
  requirementId: string;
  documentCode: string;
  documentLabel: string;
  reason: string;
  deadline: string; // YYYY-MM-DD
  requestedBy: string;
  requestedByRole: 'commission' | 'admin';
  requestedAt: string;
  status: 'pending' | 'resubmitted' | 'resolved';
  resubmittedAt?: string;
  extendedAt?: string;
  previousDeadline?: string;
}

export interface PersonalInfo {
  lastName: string;
  firstName: string;
  lastNameAr?: string;
  firstNameAr?: string;
  cin: string;
  cne: string;
  birthDate: string;
  birthPlace: string;
  nationality: string;
  email: string;
  phone: string;
  city: string;
  address: string;
  employmentStatus: 'etudiant' | 'salarie' | 'fonctionnaire';
  employerName?: string;
}

export interface AcademicInfo {
  bacSeries: string;
  bacYear: string;
  bacMention: string;
  bacAverage: string;
  licenceTitle: string;
  licenceInstitution: string;
  licenceUniversity: string;
  licenceYear: string;
  licenceAverage: string;
  masterType:
    | 'Master Recherche'
    | 'Master Spécialisé'
    | "Diplôme d'Ingénieur"
    | 'Médecine / Pharmacie'
    | 'Équivalence Étrangère';
  masterTitle: string;
  masterSpecialty: string;
  masterInstitution: string;
  masterUniversity: string;
  masterYear: string;
  masterAverage: string;
  pfeTitle: string;
  languages: string;
}

export interface InterviewInfo {
  date: string;
  time: string;
  modality: 'presentiel' | 'distanciel';
  location: string;
  juryMembers: string;
  instructions: string;
}

export interface EvaluationInfo {
  academicScore: number; // /20
  interviewScore: number; // /20
  weightedScore: number; // /20
  observations: string;
  evaluatedBy: string;
  evaluatedAt: string;
}

export interface SubjectChoice {
  priority: number; // 1, 2, 3
  subjectId: string;
  status: SubjectChoiceStatus;
  preselectionNote?: string;
  interview?: InterviewInfo;
  evaluation?: EvaluationInfo;
  waitlistRank?: number;
  rejectionReason?: string;
}

export interface CandidateDossier {
  id: string;
  accountId: string;
  dossierNumber: string;
  personalInfo: PersonalInfo;
  academicInfo: AcademicInfo;
  /** Les 3 sujets choisis par ordre de priorité (Choix 1, Choix 2, Choix 3) */
  subjectChoices: SubjectChoice[];
  /** Sujet retenu pour l'inscription administrative définitive (lorsqu'admis) */
  confirmedSubjectId?: string;
  motivation: string;
  researchProposalSummary: string;
  documents: UploadedDocument[];
  correctionRequests?: DocumentCorrectionRequest[];
  status: ApplicationStatus;
  draftSavedAt: string;
  submittedAt?: string;
  updatedAt: string;
  enrollmentSubmittedAt?: string;
  enrollmentValidatedAt?: string;
  enrollmentNumber?: string;
}

export interface ThesisSubject {
  id: string;
  code: string;
  title: string;
  cedoc: string;
  formationDoctorale: string;
  laboratoire: string;
  etablissement: string;
  domaine: string;
  supervisor: string;
  supervisorEmail: string;
  places: number;
  prerequisites: string;
  description: string;
  keywords: string[];
  open: boolean;
  validationStatus?: {
    structure: 'validee' | 'en_attente';
    centre: 'validee' | 'en_attente';
    pole: 'validee' | 'en_attente';
  };
}

export interface UserAccount {
  id: string;
  role: UserRole;
  fullName: string;
  email: string;
  cin?: string;
  cne?: string;
  password: string;
  laboratoire?: string;
  etablissement?: string;
  title?: string;
  active: boolean;
  demoHighlight?: string;
  emailNotificationsOptIn?: boolean;
}

export type NotificationCategory =
  | 'resultat'
  | 'entretien'
  | 'correction'
  | 'rappel'
  | 'calendrier'
  | 'annonce'
  | 'dossier'
  | 'info';

export type NotificationActionLabel = 'Voir' | 'Corriger' | 'Consulter le résultat';

export interface NotificationItem {
  id: string;
  recipientAccountId: string;
  recipientRole?: UserRole;
  title: string;
  message: string;
  createdAt: string;
  read: boolean;
  readAt?: string;
  category: NotificationCategory;
  urgent?: boolean;
  actionRequired?: boolean;
  deadline?: string; // YYYY-MM-DD
  actionTab?: string;
  actionLabel?: NotificationActionLabel;
  targetDossierId?: string;
  targetSubjectId?: string;
  targetRequirementId?: string;
  dedupeKey?: string;
  emailChannelStatus?: 'not_requested' | 'sent' | 'skipped_unconfigured' | 'failed';
}

export interface DeadlinePolicyConfig {
  /** Nombre de jours accordé par défaut lors d'une demande de correction (ex: 7) */
  defaultCorrectionDays: number;
  /** Seuils de rappels automatiques en jours avant expiration (ex: [7, 3, 1]) */
  reminderDaysBefore: number[];
  /** Règle administrative explicite : rejeter automatiquement un candidat en cas de délai expiré (par défaut: false) */
  autoRejectOnExpiredCorrection: boolean;
}

export interface CampaignConfig {
  academicYear: string;
  campaignOpen: boolean;
  openDate: string;
  submissionDeadline: string;
  interviewPeriod: string;
  enrollmentDeadline: string;
  waitlistEnrollmentPeriod?: string;
  resultsPublished: boolean;
  /** Nombre de sujets que chaque candidat sélectionne (par défaut : 3) */
  requiredSubjectChoices: number;
  dossierWeight: number; // % ex: 50
  interviewWeight: number; // % ex: 50
  minMasterAverage: number; // ex: 12
  eliminatoryInterviewScore: number; // ex: 10
  documentRequirements: DocumentRequirement[];
  deadlinePolicy: DeadlinePolicyConfig;
}

export interface PublicAnnouncement {
  id: string;
  title: string;
  message: string;
  publishedAt: string;
  publishedBy: string;
  important: boolean;
  active: boolean;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  actorName: string;
  actorRole: UserRole | 'systeme';
  eventType:
    | 'statut_candidature'
    | 'document_correction'
    | 'document_resoumis'
    | 'document_valide'
    | 'prolongation_delai'
    | 'rappel_echeance'
    | 'entretien'
    | 'resultat'
    | 'calendrier'
    | 'inscription'
    | 'notification_admin'
    | 'annonce';
  summary: string;
  dossierNumber?: string;
  targetAccountId?: string;
}

export interface EmailServiceStatus {
  configured: boolean;
  host: string | null;
  fromAddress: string | null;
}

export interface SupportTicket {
  id: string;
  reference: string;
  accountId?: string;
  senderName: string;
  senderEmail: string;
  dossierNumber?: string;
  category:
    | 'Identifiants & CNE'
    | 'Téléversement de pièces'
    | 'Choix des 3 sujets & éligibilité'
    | 'Entretien & résultats'
    | 'Inscription administrative';
  subject: string;
  message: string;
  createdAt: string;
  status: 'ouvert' | 'repondu';
  reply?: string;
  repliedAt?: string;
}

export interface FaqEntry {
  id: string;
  category: 'Compte & Accès' | 'Choix des 3 sujets' | 'Pièces justificatives' | 'Sélection & Inscription';
  question: string;
  answer: string;
}

export interface SharedPlatformState {
  accounts: UserAccount[];
  subjects: ThesisSubject[];
  dossiers: CandidateDossier[];
  notifications: NotificationItem[];
  campaignConfig: CampaignConfig;
  supportTickets: SupportTicket[];
  announcements: PublicAnnouncement[];
  auditLogs: AuditLogEntry[];
}
