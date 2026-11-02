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
}

export interface NotificationItem {
  id: string;
  recipientAccountId: string;
  title: string;
  message: string;
  createdAt: string;
  read: boolean;
  category: 'resultat' | 'entretien' | 'correction' | 'info';
  actionTab?: 'suivi' | 'dossier' | 'pieces' | 'sujets';
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
