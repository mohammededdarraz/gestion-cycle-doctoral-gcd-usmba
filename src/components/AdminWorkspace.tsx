import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  BarChart3,
  Bell,
  BookOpen,
  CalendarClock,
  Check,
  CheckCircle2,
  Clock,
  Edit3,
  FileCheck2,
  Mail,
  Megaphone,
  MessageSquare,
  Plus,
  RefreshCw,
  Search,
  Send,
  Settings,
  ShieldCheck,
  Trash2,
  Users,
} from 'lucide-react';
import { useGCD } from '../context/GCDContext';
import {
  ApplicationStatus,
  CandidateDossier,
  DocumentStage,
  NotificationActionLabel,
  ThesisSubject,
  UserRole,
} from '../types/gcd';
import {
  addDaysISO,
  computeDeadlineInfo,
  formatDateFR,
  formatFileSize,
  getActiveCorrectionRequest,
  getDocStatusPresentation,
  getStatusPresentation,
  getTodayISO,
} from '../utils/formatters';
import { NavItem, WorkspaceShell } from './WorkspaceShell';

type AdminTab =
  | 'dashboard'
  | 'verification'
  | 'notifications'
  | 'sujets'
  | 'configuration'
  | 'comptes'
  | 'support';

type AdminCommSubTab = 'boite' | 'envoyer' | 'annonces' | 'journal';

function hasExpiredPendingCorrection(dossier: CandidateDossier): boolean {
  return (dossier.correctionRequests || []).some(
    (req) => req.status === 'pending' && (computeDeadlineInfo(req.deadline)?.isExpired ?? false)
  );
}

function countActivePendingCorrections(dossier: CandidateDossier): number {
  const ids = new Set<string>();
  for (const doc of dossier.documents) {
    if (doc.status === 'a_corriger') ids.add(doc.requirementId);
  }
  for (const req of dossier.correctionRequests || []) {
    if (req.status === 'pending') ids.add(req.requirementId);
  }
  return ids.size;
}

export const AdminWorkspace: React.FC = () => {
  const {
    currentUser,
    dossiers,
    subjects,
    accounts,
    notifications,
    announcements,
    auditLogs,
    emailStatus,
    campaignConfig,
    supportTickets,
    navigationFocus,
    clearNavigationFocus,
    openNotificationTarget,
    markNotificationRead,
    markAllNotificationsRead,
    reviewDocumentStatus,
    requestDocumentCorrection,
    extendCorrectionDeadline,
    updateDeadlinePolicy,
    runDeadlineCheck,
    sendAdminNotification,
    publishAnnouncement,
    toggleAnnouncementActive,
    validateAdministrativeEnrollment,
    upsertThesisSubject,
    toggleSubjectOpen,
    updateCampaignSettings,
    upsertDocumentRequirement,
    deleteDocumentRequirement,
    upsertIntervenantAccount,
    toggleAccountActive,
    publishCampaignResults,
    replyToSupportTicket,
  } = useGCD();

  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
  const [commSubTab, setCommSubTab] = useState<AdminCommSubTab>('boite');
  const [notifFilter, setNotifFilter] = useState<'all' | 'unread'>('all');
  const [banner, setBanner] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);

  // Verification tab state
  const [verifFilter, setVerifFilter] = useState<
    'ALL' | 'ADMIS' | 'A_VERIFIER' | 'DELAI_EXPIRE' | 'INSCRIT'
  >('ALL');
  const [verifSearch, setVerifSearch] = useState('');
  const nonDraftDossiers = useMemo(
    () => dossiers.filter((d) => d.status !== 'brouillon'),
    [dossiers]
  );
  const [selectedDossierId, setSelectedDossierId] = useState<string>(
    dossiers.find((d) => d.status === 'admis')?.id || nonDraftDossiers[0]?.id || ''
  );
  const [correctionTargetReqId, setCorrectionTargetReqId] = useState<string | null>(null);
  const [correctionReason, setCorrectionReason] = useState('');
  const [correctionDeadline, setCorrectionDeadline] = useState(() =>
    addDaysISO(getTodayISO(), campaignConfig.deadlinePolicy.defaultCorrectionDays)
  );
  const [extendTargetReqId, setExtendTargetReqId] = useState<string | null>(null);
  const [extendNewDeadline, setExtendNewDeadline] = useState('');

  // Thesis subject form state
  const [showSubjectForm, setShowSubjectForm] = useState(false);
  const [editingSubjectId, setEditingSubjectId] = useState<string | undefined>(undefined);
  const [sujForm, setSujForm] = useState<Omit<ThesisSubject, 'id'>>({
    code: 'ST-LAB-2026-07',
    title: '',
    cedoc: 'CEDoc Sciences et Techniques et Sciences Médicales',
    formationDoctorale: 'Informatique, Intelligence Artificielle et Analyse de Données',
    laboratoire: '',
    etablissement: 'Faculté des Sciences Dhar El Mehraz (FSDM - Fès)',
    domaine: 'Informatique & Intelligence Artificielle',
    supervisor: '',
    supervisorEmail: '',
    places: 1,
    prerequisites: '',
    description: '',
    keywords: ['Recherche doctorale', 'USMBA'],
    open: true,
    validationStatus: {
      structure: 'validee',
      centre: 'validee',
      pole: 'validee',
    },
  });

  // New Document Requirement form
  const [newReqCode, setNewReqCode] = useState('');
  const [newReqLabel, setNewReqLabel] = useState('');
  const [newReqDesc, setNewReqDesc] = useState('');
  const [newReqInstructions, setNewReqInstructions] = useState('');
  const [newReqStage, setNewReqStage] = useState<DocumentStage>('preinscription');
  const [newReqRequired, setNewReqRequired] = useState(true);
  const [newReqFormats, setNewReqFormats] = useState<string[]>(['PDF']);
  const [newReqMaxMB, setNewReqMaxMB] = useState(5);

  // New Intervenant account form
  const [staffFullName, setStaffFullName] = useState('');
  const [staffEmail, setStaffEmail] = useState('');
  const [staffRole, setStaffRole] = useState<Extract<UserRole, 'commission' | 'admin'>>('commission');
  const [staffTitle, setStaffTitle] = useState('Membre de Commission Pédagogique');
  const [staffLab, setStaffLab] = useState('');
  const [staffEtab, setStaffEtab] = useState('FSDM - Fès');

  // Support reply map
  const [ticketReplies, setTicketReplies] = useState<Record<string, string>>({});

  // Calendar controlled draft state (prevents firing notifications on every keystroke)
  const [calDraft, setCalDraft] = useState({
    openDate: campaignConfig.openDate,
    submissionDeadline: campaignConfig.submissionDeadline,
    interviewPeriod: campaignConfig.interviewPeriod,
    enrollmentDeadline: campaignConfig.enrollmentDeadline,
    waitlistEnrollmentPeriod: campaignConfig.waitlistEnrollmentPeriod || '',
  });
  const [notifyCalendarCandidates, setNotifyCalendarCandidates] = useState(true);

  useEffect(() => {
    setCalDraft({
      openDate: campaignConfig.openDate,
      submissionDeadline: campaignConfig.submissionDeadline,
      interviewPeriod: campaignConfig.interviewPeriod,
      enrollmentDeadline: campaignConfig.enrollmentDeadline,
      waitlistEnrollmentPeriod: campaignConfig.waitlistEnrollmentPeriod || '',
    });
  }, [
    campaignConfig.openDate,
    campaignConfig.submissionDeadline,
    campaignConfig.interviewPeriod,
    campaignConfig.enrollmentDeadline,
    campaignConfig.waitlistEnrollmentPeriod,
  ]);

  // Targeted / collective notification form state
  const candidateAccounts = useMemo(
    () => accounts.filter((a) => a.role === 'candidat' && a.active),
    [accounts]
  );
  const [msgTargetType, setMsgTargetType] = useState<
    'individual' | 'all_candidates' | 'correction_pending' | 'status' | 'subject'
  >('individual');
  const [msgTargetAccountId, setMsgTargetAccountId] = useState<string>(
    candidateAccounts[0]?.id || ''
  );
  const [msgTargetStatus, setMsgTargetStatus] = useState<ApplicationStatus>('entretien');
  const [msgTargetSubjectId, setMsgTargetSubjectId] = useState<string>(subjects[0]?.id || '');
  const [msgTitle, setMsgTitle] = useState('');
  const [msgBody, setMsgBody] = useState('');
  const [msgDeadline, setMsgDeadline] = useState('');
  const [msgActionLabel, setMsgActionLabel] = useState<NotificationActionLabel>('Voir');
  const [msgUrgent, setMsgUrgent] = useState(false);
  const [msgSendEmail, setMsgSendEmail] = useState(false);

  // Public announcement form state
  const [annTitle, setAnnTitle] = useState('');
  const [annMessage, setAnnMessage] = useState('');
  const [annImportant, setAnnImportant] = useState(true);
  const [annNotifyCandidates, setAnnNotifyCandidates] = useState(false);

  // Navigation focus from notification clicks
  useEffect(() => {
    if (!navigationFocus) return;
    const validTabs: AdminTab[] = [
      'dashboard',
      'verification',
      'notifications',
      'sujets',
      'configuration',
      'comptes',
      'support',
    ];
    if (validTabs.includes(navigationFocus.tab as AdminTab)) {
      setActiveTab(navigationFocus.tab as AdminTab);
    }
    if (navigationFocus.dossierId) {
      setVerifFilter('ALL');
      setVerifSearch('');
      setSelectedDossierId(navigationFocus.dossierId);
      setCorrectionTargetReqId(null);
      setExtendTargetReqId(null);
    }
    clearNavigationFocus();
  }, [navigationFocus, clearNavigationFocus]);

  // Stats
  const stats = useMemo(() => {
    const total = dossiers.length;
    const soumisEnExamen = dossiers.filter(
      (d) => d.status === 'soumis' || d.status === 'en_cours' || d.status === 'entretien'
    ).length;
    const admis = dossiers.filter((d) => d.status === 'admis').length;
    const attente = dossiers.filter((d) => d.status === 'liste_attente').length;
    const inscrits = dossiers.filter((d) => d.status === 'inscrit').length;
    const docsPendingReview = nonDraftDossiers.reduce(
      (acc, d) => acc + d.documents.filter((doc) => doc.status === 'deposee').length,
      0
    );
    const docsToCorrect = dossiers.reduce(
      (acc, d) => acc + countActivePendingCorrections(d),
      0
    );
    const expiredDeadlines = dossiers.filter((d) => hasExpiredPendingCorrection(d)).length;
    return {
      total,
      soumisEnExamen,
      admis,
      attente,
      inscrits,
      docsPendingReview,
      docsToCorrect,
      expiredDeadlines,
    };
  }, [dossiers, nonDraftDossiers]);

  const openTicketsCount = supportTickets.filter((t) => t.status === 'ouvert').length;
  const unreadNotifCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications]
  );
  const hasUrgentUnread = useMemo(
    () => notifications.some((n) => !n.read && (n.urgent || n.actionRequired)),
    [notifications]
  );
  const filteredNotifications = useMemo(
    () => (notifFilter === 'unread' ? notifications.filter((n) => !n.read) : notifications),
    [notifications, notifFilter]
  );

  const navItems: NavItem[] = [
    {
      id: 'dashboard',
      label: 'Vue d’ensemble',
      icon: <BarChart3 className="w-4 h-4" />,
    },
    {
      id: 'verification',
      label: 'Candidatures & Pièces',
      icon: <FileCheck2 className="w-4 h-4" />,
      badgeCount: stats.docsPendingReview + stats.expiredDeadlines + stats.admis,
      badgeTone: stats.expiredDeadlines > 0 ? 'alert' : 'neutral',
    },
    {
      id: 'notifications',
      label: 'Notifications & Annonces',
      icon: <Bell className="w-4 h-4" />,
      badgeCount: unreadNotifCount,
      badgeTone: hasUrgentUnread ? 'alert' : 'neutral',
    },
    {
      id: 'sujets',
      label: 'Sujets',
      icon: <BookOpen className="w-4 h-4" />,
    },
    {
      id: 'configuration',
      label: 'Paramètres',
      icon: <Settings className="w-4 h-4" />,
    },
    {
      id: 'comptes',
      label: 'Utilisateurs',
      icon: <Users className="w-4 h-4" />,
    },
    {
      id: 'support',
      label: 'Support',
      icon: <MessageSquare className="w-4 h-4" />,
      badgeCount: openTicketsCount,
      badgeTone: openTicketsCount > 0 ? 'alert' : 'neutral',
    },
  ];

  const filteredVerificationDossiers = useMemo(() => {
    const q = verifSearch.trim().toLowerCase();
    return nonDraftDossiers.filter((d) => {
      if (verifFilter === 'ADMIS' && d.status !== 'admis') return false;
      if (verifFilter === 'INSCRIT' && d.status !== 'inscrit') return false;
      if (verifFilter === 'DELAI_EXPIRE' && !hasExpiredPendingCorrection(d)) return false;
      if (
        verifFilter === 'A_VERIFIER' &&
        !d.documents.some((doc) => doc.status === 'deposee' || doc.status === 'a_corriger') &&
        countActivePendingCorrections(d) === 0
      ) {
        return false;
      }
      if (!q) return true;
      const fullName = `${d.personalInfo.firstName} ${d.personalInfo.lastName}`.toLowerCase();
      return (
        fullName.includes(q) ||
        d.dossierNumber.toLowerCase().includes(q) ||
        d.personalInfo.cne.toLowerCase().includes(q) ||
        d.personalInfo.cin.toLowerCase().includes(q)
      );
    });
  }, [nonDraftDossiers, verifFilter, verifSearch]);

  const selectedDossier =
    nonDraftDossiers.find((d) => d.id === selectedDossierId) || filteredVerificationDossiers[0];

  const handleOpenEditSubject = (s: ThesisSubject) => {
    setEditingSubjectId(s.id);
    const { id: _unused, ...rest } = s;
    setSujForm({
      ...rest,
      validationStatus: rest.validationStatus || {
        structure: 'validee',
        centre: 'validee',
        pole: 'validee',
      },
    });
    setShowSubjectForm(true);
  };

  const handleSaveSubject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sujForm.title.trim() || !sujForm.supervisor.trim() || !sujForm.laboratoire.trim()) {
      setBanner({
        tone: 'error',
        text: 'Intitulé, laboratoire et encadrant requis.',
      });
      return;
    }
    upsertThesisSubject({ ...sujForm, id: editingSubjectId });
    setShowSubjectForm(false);
    setEditingSubjectId(undefined);
    setBanner({
      tone: 'success',
      text: editingSubjectId ? 'Sujet mis à jour.' : 'Sujet publié.',
    });
  };

  const handleAddDocumentRequirement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReqCode.trim() || !newReqLabel.trim() || newReqFormats.length === 0) {
      setBanner({
        tone: 'error',
        text: 'Code, intitulé et format requis.',
      });
      return;
    }
    upsertDocumentRequirement({
      code: newReqCode.trim().toUpperCase(),
      label: newReqLabel.trim(),
      description: newReqDesc.trim() || 'Pièce justificative demandée.',
      instructions:
        newReqInstructions.trim() || 'Document lisible au format requis.',
      stage: newReqStage,
      required: newReqRequired,
      acceptedFormats: newReqFormats,
      maxSizeMB: Math.max(1, newReqMaxMB),
    });
    setNewReqCode('');
    setNewReqLabel('');
    setNewReqDesc('');
    setNewReqInstructions('');
    setBanner({
      tone: 'success',
      text: 'Pièce ajoutée.',
    });
  };

  const handleCreateIntervenant = (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffFullName.trim() || !staffEmail.trim().includes('@')) {
      setBanner({ tone: 'error', text: 'Nom et e-mail valide requis.' });
      return;
    }
    upsertIntervenantAccount({
      fullName: staffFullName.trim(),
      email: staffEmail.trim(),
      role: staffRole,
      title: staffTitle.trim(),
      laboratoire: staffLab.trim() || undefined,
      etablissement: staffEtab.trim(),
    });
    setStaffFullName('');
    setStaffEmail('');
    setStaffLab('');
    setBanner({ tone: 'success', text: 'Compte créé.' });
  };

  return (
    <WorkspaceShell
      workspaceTitle="Administration"
      activeTab={activeTab}
      onSelectTab={(id) => setActiveTab(id as AdminTab)}
      navItems={navItems}
      headerAction={
        <button
          type="button"
          onClick={() => {
            publishCampaignResults(!campaignConfig.resultsPublished);
            setBanner({
              tone: 'success',
              text: !campaignConfig.resultsPublished
                ? 'Résultats publiés.'
                : 'Publication suspendue.',
            });
          }}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            campaignConfig.resultsPublished
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
              : 'bg-blue-700 text-white hover:bg-blue-800'
          }`}
        >
          {campaignConfig.resultsPublished ? '✓ Résultats publiés' : 'Publier les résultats'}
        </button>
      }
    >
      <div className="space-y-5">
        {banner && (
          <div
            className={`px-4 py-3 rounded-xl border text-xs sm:text-sm flex items-center justify-between gap-4 ${
              banner.tone === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                : 'bg-red-50 border-red-200 text-red-950'
            }`}
          >
            <span className="flex items-center gap-2">
              {banner.tone === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-red-700 shrink-0" />
              )}
              {banner.text}
            </span>
            <button
              type="button"
              onClick={() => setBanner(null)}
              className="text-xs font-semibold underline shrink-0 cursor-pointer"
            >
              Fermer
            </button>
          </div>
        )}

        {/* TAB 1: VUE D'ENSEMBLE */}
        {activeTab === 'dashboard' && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h1 className="text-lg sm:text-xl font-bold text-slate-900">
                Session {campaignConfig.academicYear}
              </h1>

              <div className="flex flex-wrap items-center gap-2">
                {stats.expiredDeadlines > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setVerifFilter('DELAI_EXPIRE');
                      setActiveTab('verification');
                    }}
                    className="px-3.5 py-1.5 text-xs font-semibold text-red-700 bg-red-50 border border-red-200 hover:bg-red-100 rounded-lg transition-colors cursor-pointer"
                  >
                    Délais expirés ({stats.expiredDeadlines})
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setVerifFilter('A_VERIFIER');
                    setActiveTab('verification');
                  }}
                  className="px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors cursor-pointer"
                >
                  Vérifier les pièces ({stats.docsPendingReview})
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setVerifFilter('ADMIS');
                    setActiveTab('verification');
                  }}
                  className="px-3.5 py-1.5 text-xs font-semibold text-slate-800 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
                >
                  Inscriptions ({stats.admis})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('notifications')}
                  className="px-3.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                >
                  Notifications ({unreadNotifCount})
                </button>
              </div>
            </div>

            {/* Single Consolidated Metric Strip */}
            <div className="bg-white border border-slate-200 rounded-xl grid grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
              <div className="p-4 sm:p-5">
                <p className="text-xs text-slate-500">Dossiers enregistrés</p>
                <p className="text-2xl font-bold font-mono text-slate-900 tabular-nums mt-1">
                  {stats.total}
                </p>
              </div>
              <div className="p-4 sm:p-5">
                <p className="text-xs text-slate-500">En sélection</p>
                <p className="text-2xl font-bold font-mono text-blue-700 tabular-nums mt-1">
                  {stats.soumisEnExamen}
                </p>
              </div>
              <div className="p-4 sm:p-5">
                <p className="text-xs text-slate-500">Admis (liste principale)</p>
                <p className="text-2xl font-bold font-mono text-emerald-700 tabular-nums mt-1">
                  {stats.admis}{' '}
                  {stats.attente > 0 && (
                    <span className="text-xs font-normal text-amber-700">
                      (+{stats.attente} attente)
                    </span>
                  )}
                </p>
              </div>
              <div className="p-4 sm:p-5">
                <p className="text-xs text-slate-500">Inscrits définitifs</p>
                <p className="text-2xl font-bold font-mono text-slate-900 tabular-nums mt-1">
                  {stats.inscrits}
                </p>
              </div>
            </div>

            {/* Consolidated Subjects & Enrollments Table */}
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-900">
                  Suivi des sujets et inscriptions
                </h2>
                <button
                  type="button"
                  onClick={() => setActiveTab('sujets')}
                  className="text-xs font-semibold text-blue-700 hover:underline cursor-pointer"
                >
                  Gérer les sujets
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                      <th className="py-3 px-4">Code & Intitulé</th>
                      <th className="py-3 px-4">Laboratoire</th>
                      <th className="py-3 px-4 text-right">Places</th>
                      <th className="py-3 px-4 text-right">Vœux</th>
                      <th className="py-3 px-4 text-right">Admis / Inscrits</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {subjects.map((suj) => {
                      const candsWithChoice = nonDraftDossiers.filter((d) =>
                        d.subjectChoices.some((c) => c.subjectId === suj.id)
                      );
                      const admisOrInscrit = nonDraftDossiers.filter(
                        (d) =>
                          d.subjectChoices.some(
                            (c) => c.subjectId === suj.id && c.status === 'admis'
                          ) ||
                          (d.status === 'inscrit' && d.confirmedSubjectId === suj.id)
                      ).length;

                      return (
                        <tr key={suj.id} className="hover:bg-slate-50">
                          <td className="py-3 px-4 max-w-sm">
                            <span className="font-mono font-semibold text-blue-700">
                              {suj.code}
                            </span>
                            <p className="text-slate-900 font-medium truncate mt-0.5">
                              {suj.title}
                            </p>
                          </td>
                          <td className="py-3 px-4 text-slate-600 truncate max-w-[220px]">
                            {suj.laboratoire}
                          </td>
                          <td className="py-3 px-4 text-right font-mono tabular-nums">
                            {suj.places}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-semibold text-slate-900 tabular-nums">
                            {candsWithChoice.length}
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-emerald-700 font-semibold tabular-nums">
                            {admisOrInscrit} / {suj.places}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: CANDIDATURES & PIÈCES */}
        {activeTab === 'verification' && (
          <div className="space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <h1 className="text-lg sm:text-xl font-bold text-slate-900">
                Candidatures, pièces & inscriptions
              </h1>

              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={verifSearch}
                    onChange={(e) => setVerifSearch(e.target.value)}
                    placeholder="Rechercher..."
                    className="pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div className="inline-flex flex-wrap p-1 bg-white border border-slate-200 rounded-lg">
                  {(
                    [
                      { id: 'ALL', label: 'Tous' },
                      { id: 'A_VERIFIER', label: 'À vérifier' },
                      { id: 'DELAI_EXPIRE', label: `Expirés (${stats.expiredDeadlines})` },
                      { id: 'ADMIS', label: 'Admis' },
                      { id: 'INSCRIT', label: 'Inscrits' },
                    ] as const
                  ).map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setVerifFilter(tab.id)}
                      className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                        verifFilter === tab.id
                          ? 'bg-slate-900 text-white'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
              {/* Dossiers List */}
              <div className="lg:col-span-4 bg-white border border-slate-200 rounded-xl divide-y divide-slate-200">
                <div className="px-4 py-3 text-xs font-semibold text-slate-600">
                  Dossiers ({filteredVerificationDossiers.length})
                </div>
                {filteredVerificationDossiers.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-500">Aucun dossier.</div>
                ) : (
                  <div className="divide-y divide-slate-200 max-h-[680px] overflow-y-auto">
                    {filteredVerificationDossiers.map((d) => {
                      const st = getStatusPresentation(d.status);
                      const pendingDocs = d.documents.filter(
                        (doc) => doc.status === 'deposee'
                      ).length;
                      const corrDocs = countActivePendingCorrections(d);
                      const isExpired = hasExpiredPendingCorrection(d);
                      const resubmittedCount = (d.correctionRequests || []).filter(
                        (r) => r.status === 'resubmitted'
                      ).length;
                      return (
                        <button
                          key={d.id}
                          type="button"
                          onClick={() => {
                            setSelectedDossierId(d.id);
                            setCorrectionTargetReqId(null);
                            setExtendTargetReqId(null);
                          }}
                          className={`w-full text-left px-4 py-3.5 transition-colors cursor-pointer ${
                            selectedDossier?.id === d.id ? 'bg-blue-50/60' : 'hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm font-semibold text-slate-900 truncate">
                              {d.personalInfo.firstName} {d.personalInfo.lastName}
                            </span>
                            <span className={`text-xs font-semibold shrink-0 ${st.textClass}`}>
                              {st.shortLabel}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-xs mt-1">
                            <span className="font-mono text-slate-500">{d.dossierNumber}</span>
                            {isExpired ? (
                              <span className="text-red-700 font-semibold">Délai expiré</span>
                            ) : corrDocs > 0 ? (
                              <span className="text-red-700 font-medium">
                                {corrDocs} à corriger
                              </span>
                            ) : resubmittedCount > 0 ? (
                              <span className="text-blue-700 font-semibold">
                                Corrigé soumis
                              </span>
                            ) : pendingDocs > 0 ? (
                              <span className="text-blue-700 font-medium">
                                {pendingDocs} à vérifier
                              </span>
                            ) : (
                              <span className="text-emerald-700">Conforme</span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Dossier Inspection */}
              <div className="lg:col-span-8">
                {selectedDossier ? (
                  <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-200">
                    <div className="p-5 space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <p className="text-xs font-mono text-slate-500">
                            {selectedDossier.dossierNumber} · CNE {selectedDossier.personalInfo.cne}{' '}
                            · CIN {selectedDossier.personalInfo.cin}
                          </p>
                          <h2 className="text-lg font-bold text-slate-900 mt-0.5">
                            {selectedDossier.personalInfo.firstName}{' '}
                            {selectedDossier.personalInfo.lastName}
                          </h2>
                          <p className="text-xs text-slate-600">
                            Statut :{' '}
                            <strong className={getStatusPresentation(selectedDossier.status).textClass}>
                              {getStatusPresentation(selectedDossier.status).label}
                            </strong>
                            {selectedDossier.enrollmentNumber &&
                              ` · Matricule ${selectedDossier.enrollmentNumber}`}
                          </p>
                        </div>

                        {(selectedDossier.status === 'admis' ||
                          selectedDossier.status === 'inscrit') && (
                          <button
                            type="button"
                            onClick={() => {
                              const res = validateAdministrativeEnrollment(selectedDossier.id);
                              if (!res.ok) {
                                setBanner({
                                  tone: 'error',
                                  text: res.error || 'Dossier non conforme.',
                                });
                              } else {
                                setBanner({
                                  tone: 'success',
                                  text: `Inscription validée (${res.enrollmentNumber}).`,
                                });
                              }
                            }}
                            className="px-4 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer"
                          >
                            <ShieldCheck className="w-4 h-4" />
                            {selectedDossier.status === 'inscrit'
                              ? 'Inscription validée'
                              : 'Valider l’inscription'}
                          </button>
                        )}
                      </div>

                      {/* Chosen Subjects */}
                      <div className="pt-2 border-t border-slate-100 space-y-1 text-xs">
                        {[...selectedDossier.subjectChoices]
                          .sort((a, b) => a.priority - b.priority)
                          .map((ch) => {
                            const s = subjects.find((item) => item.id === ch.subjectId);
                            const st = getStatusPresentation(ch.status);
                            const isConfirmed =
                              selectedDossier.confirmedSubjectId === ch.subjectId;
                            return (
                              <div
                                key={ch.subjectId}
                                className="flex flex-wrap items-center justify-between gap-2"
                              >
                                <span className="text-slate-700 truncate max-w-lg">
                                  <strong className="font-mono">Choix {ch.priority} :</strong>{' '}
                                  <span className="font-mono text-blue-700">
                                    {s?.code || ch.subjectId}
                                  </span>{' '}
                                  — {s?.title || 'Sujet'}
                                </span>
                                <span className={`font-semibold ${st.textClass}`}>
                                  {st.shortLabel}
                                  {isConfirmed ? ' (Retenu)' : ''}
                                </span>
                              </div>
                            );
                          })}
                      </div>
                    </div>

                    {/* Documents Checklist */}
                    <div className="divide-y divide-slate-200">
                      {campaignConfig.documentRequirements.map((req) => {
                        const uploaded = selectedDossier.documents.find(
                          (doc) => doc.requirementId === req.id
                        );
                        const activeCorr = getActiveCorrectionRequest(selectedDossier, req.id);
                        const resubmittedCorr = (
                          selectedDossier.correctionRequests || []
                        ).find((cr) => cr.requirementId === req.id && cr.status === 'resubmitted');
                        const status = uploaded
                          ? uploaded.status
                          : activeCorr
                          ? 'a_corriger'
                          : 'manquante';
                        const pres = getDocStatusPresentation(status);
                        const deadlineISO = activeCorr?.deadline || uploaded?.correctionDeadline;
                        const dlInfo = computeDeadlineInfo(deadlineISO);
                        const isAskingCorrection = correctionTargetReqId === req.id;
                        const isExtending = extendTargetReqId === req.id;

                        return (
                          <div key={req.id} className="p-4 sm:p-5 space-y-2.5">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                              <div className="space-y-0.5 min-w-0">
                                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                                  <span className="font-mono font-semibold text-slate-700">
                                    {req.code}
                                  </span>
                                  <span>·</span>
                                  <span>
                                    {req.stage === 'preinscription'
                                      ? 'Préinscription'
                                      : 'Inscription'}
                                  </span>
                                  <span>·</span>
                                  <span className={`font-semibold ${pres.textClass}`}>
                                    {pres.label}
                                  </span>
                                  {resubmittedCorr && uploaded?.status === 'deposee' && (
                                    <>
                                      <span>·</span>
                                      <span className="font-semibold text-blue-700">
                                        Nouvelle version déposée
                                      </span>
                                    </>
                                  )}
                                </div>
                                <h3 className="text-sm font-semibold text-slate-900">
                                  {req.label}
                                </h3>
                                {uploaded ? (
                                  <p className="text-xs font-mono text-slate-500 truncate">
                                    {uploaded.fileName} ({formatFileSize(uploaded.fileSizeKB)}) ·{' '}
                                    {formatDateFR(uploaded.uploadedAt, true)}
                                  </p>
                                ) : (
                                  <p className="text-xs text-amber-700">Non déposé</p>
                                )}
                                {(activeCorr?.reason || uploaded?.reviewComment) &&
                                  status === 'a_corriger' && (
                                    <div className="text-xs space-y-0.5 pt-0.5">
                                      <p className="text-red-700">
                                        Motif : {activeCorr?.reason || uploaded?.reviewComment}
                                      </p>
                                      {deadlineISO && (
                                        <p className="font-mono text-slate-600">
                                          Date limite : {formatDateFR(deadlineISO)}
                                          {dlInfo && (
                                            <span className={`font-semibold ${dlInfo.textClass}`}>
                                              {' '}
                                              · {dlInfo.statusLabel}
                                            </span>
                                          )}
                                          {dlInfo?.isExpired &&
                                            !campaignConfig.deadlinePolicy
                                              .autoRejectOnExpiredCorrection && (
                                              <span className="font-sans text-slate-500">
                                                {' '}
                                                · Aucun rejet automatique
                                              </span>
                                            )}
                                        </p>
                                      )}
                                    </div>
                                  )}
                              </div>

                              <div className="flex flex-wrap items-center gap-2 shrink-0">
                                {uploaded && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      reviewDocumentStatus(selectedDossier.id, req.id, 'validee');
                                      setCorrectionTargetReqId(null);
                                      setExtendTargetReqId(null);
                                      setBanner({
                                        tone: 'success',
                                        text: `${req.code} validé conforme.`,
                                      });
                                    }}
                                    className="px-3 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                    Conforme
                                  </button>
                                )}

                                {activeCorr && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setCorrectionTargetReqId(null);
                                      if (isExtending) {
                                        setExtendTargetReqId(null);
                                      } else {
                                        setExtendTargetReqId(req.id);
                                        const baseDate =
                                          dlInfo?.isExpired ? getTodayISO() : activeCorr.deadline;
                                        setExtendNewDeadline(addDaysISO(baseDate, 7));
                                      }
                                    }}
                                    className="px-3 py-1.5 text-xs font-semibold text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition-colors inline-flex items-center gap-1 cursor-pointer"
                                  >
                                    <CalendarClock className="w-3.5 h-3.5" />
                                    Prolonger
                                  </button>
                                )}

                                <button
                                  type="button"
                                  onClick={() => {
                                    setExtendTargetReqId(null);
                                    if (isAskingCorrection) {
                                      setCorrectionTargetReqId(null);
                                    } else {
                                      setCorrectionTargetReqId(req.id);
                                      setCorrectionReason(
                                        activeCorr?.reason ||
                                          uploaded?.reviewComment ||
                                          (uploaded
                                            ? `Votre ${req.label.toLowerCase()} est incomplet ou illisible.`
                                            : `Pièce manquante : veuillez déposer ${req.label.toLowerCase()}.`)
                                      );
                                      setCorrectionDeadline(
                                        activeCorr?.deadline ||
                                          addDaysISO(
                                            getTodayISO(),
                                            campaignConfig.deadlinePolicy.defaultCorrectionDays
                                          )
                                      );
                                    }
                                  }}
                                  className="px-3 py-1.5 text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-colors cursor-pointer"
                                >
                                  {uploaded ? 'À corriger' : 'Signaler manquant'}
                                </button>
                              </div>
                            </div>

                            {isAskingCorrection && (
                              <div className="p-3 rounded-lg bg-red-50/70 border border-red-200 space-y-2">
                                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                                  <input
                                    type="text"
                                    value={correctionReason}
                                    onChange={(e) => setCorrectionReason(e.target.value)}
                                    placeholder="Motif précis du refus ou de la correction..."
                                    className="sm:col-span-8 px-3 py-1.5 text-xs bg-white border border-red-300 rounded-lg"
                                  />
                                  <input
                                    type="date"
                                    aria-label="Date limite de régularisation"
                                    value={correctionDeadline}
                                    onChange={(e) => setCorrectionDeadline(e.target.value)}
                                    className="sm:col-span-4 px-3 py-1.5 text-xs font-mono bg-white border border-red-300 rounded-lg"
                                  />
                                </div>
                                <div className="flex items-center justify-end gap-2">
                                  <button
                                    type="button"
                                    onClick={() => setCorrectionTargetReqId(null)}
                                    className="px-2.5 py-1.5 text-xs text-slate-600 cursor-pointer"
                                  >
                                    Annuler
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const res = requestDocumentCorrection(
                                        selectedDossier.id,
                                        req.id,
                                        correctionReason,
                                        correctionDeadline
                                      );
                                      if (res.ok) {
                                        setCorrectionTargetReqId(null);
                                        setBanner({
                                          tone: 'success',
                                          text: `Demande envoyée au candidat (échéance : ${formatDateFR(res.deadline)}).`,
                                        });
                                      } else {
                                        setBanner({
                                          tone: 'error',
                                          text: res.error || 'Erreur lors de la demande.',
                                        });
                                      }
                                    }}
                                    className="px-3 py-1.5 text-xs font-semibold text-white bg-red-700 hover:bg-red-800 rounded-lg cursor-pointer"
                                  >
                                    Notifier le candidat
                                  </button>
                                </div>
                              </div>
                            )}

                            {isExtending && activeCorr && (
                              <div className="p-3 rounded-lg bg-amber-50/70 border border-amber-200 flex flex-wrap items-center justify-between gap-2 text-xs">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="font-semibold text-amber-950">
                                    Nouvelle date limite :
                                  </span>
                                  <input
                                    type="date"
                                    value={extendNewDeadline}
                                    onChange={(e) => setExtendNewDeadline(e.target.value)}
                                    className="px-2.5 py-1 font-mono bg-white border border-amber-300 rounded-md"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const base = dlInfo?.isExpired
                                        ? getTodayISO()
                                        : activeCorr.deadline;
                                      setExtendNewDeadline(addDaysISO(base, 3));
                                    }}
                                    className="px-2 py-1 font-mono font-semibold text-amber-900 bg-white border border-amber-300 rounded-md cursor-pointer"
                                  >
                                    +3 j
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const base = dlInfo?.isExpired
                                        ? getTodayISO()
                                        : activeCorr.deadline;
                                      setExtendNewDeadline(addDaysISO(base, 7));
                                    }}
                                    className="px-2 py-1 font-mono font-semibold text-amber-900 bg-white border border-amber-300 rounded-md cursor-pointer"
                                  >
                                    +7 j
                                  </button>
                                </div>
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => setExtendTargetReqId(null)}
                                    className="px-2.5 py-1 text-slate-600 cursor-pointer"
                                  >
                                    Annuler
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const res = extendCorrectionDeadline(
                                        selectedDossier.id,
                                        req.id,
                                        extendNewDeadline
                                      );
                                      if (res.ok) {
                                        setExtendTargetReqId(null);
                                        setBanner({
                                          tone: 'success',
                                          text: `Délai prolongé jusqu’au ${formatDateFR(extendNewDeadline)}.`,
                                        });
                                      } else {
                                        setBanner({
                                          tone: 'error',
                                          text: res.error || 'Date invalide.',
                                        });
                                      }
                                    }}
                                    className="px-3 py-1 font-semibold text-white bg-amber-800 hover:bg-amber-900 rounded-md cursor-pointer"
                                  >
                                    Enregistrer
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-sm text-slate-500">
                    Aucun dossier sélectionné.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB: NOTIFICATIONS, ENVOIS CIBLÉS, ANNONCES & TRAÇABILITÉ */}
        {activeTab === 'notifications' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h1 className="text-lg sm:text-xl font-bold text-slate-900">
                Notifications & Annonces
              </h1>

              <div className="inline-flex flex-wrap p-1 bg-white border border-slate-200 rounded-lg text-xs">
                {(
                  [
                    { id: 'boite', label: `Réception (${unreadNotifCount})` },
                    { id: 'envoyer', label: 'Envoyer aux candidats' },
                    { id: 'annonces', label: `Annonces publiques (${announcements.length})` },
                    { id: 'journal', label: 'Traçabilité' },
                  ] as const
                ).map((sub) => (
                  <button
                    key={sub.id}
                    type="button"
                    onClick={() => setCommSubTab(sub.id)}
                    className={`px-3 py-1.5 font-semibold rounded-md transition-colors cursor-pointer ${
                      commSubTab === sub.id
                        ? 'bg-slate-900 text-white'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {sub.label}
                  </button>
                ))}
              </div>
            </div>

            {/* SUBTAB 1: RÉCEPTION ADMIN */}
            {commSubTab === 'boite' && (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="inline-flex p-1 bg-white border border-slate-200 rounded-lg text-xs">
                    <button
                      type="button"
                      onClick={() => setNotifFilter('all')}
                      className={`px-2.5 py-1 font-semibold rounded-md cursor-pointer ${
                        notifFilter === 'all'
                          ? 'bg-slate-900 text-white'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Toutes ({notifications.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setNotifFilter('unread')}
                      className={`px-2.5 py-1 font-semibold rounded-md cursor-pointer ${
                        notifFilter === 'unread'
                          ? 'bg-slate-900 text-white'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Non lues ({unreadNotifCount})
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={async () => {
                        const res = await runDeadlineCheck();
                        setBanner({
                          tone: 'success',
                          text:
                            res.generatedCount > 0
                              ? `${res.generatedCount} rappel(s) ou alerte(s) d’échéance généré(s).`
                              : 'Échéances à jour (aucun nouveau rappel à déclencher).',
                        });
                      }}
                      className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      Vérifier les délais
                    </button>

                    {unreadNotifCount > 0 && currentUser && (
                      <button
                        type="button"
                        onClick={() => markAllNotificationsRead(currentUser.id)}
                        className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg cursor-pointer"
                      >
                        Tout marquer comme lu
                      </button>
                    )}
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-200">
                  {filteredNotifications.length === 0 ? (
                    <div className="p-8 text-center text-sm text-slate-500">
                      Aucune notification.
                    </div>
                  ) : (
                    filteredNotifications.map((n) => {
                      const dlInfo = computeDeadlineInfo(n.deadline);
                      return (
                        <div
                          key={n.id}
                          className={`p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                            !n.read ? 'bg-blue-50/30' : ''
                          }`}
                        >
                          <div className="space-y-1 min-w-0 max-w-2xl">
                            <div className="flex flex-wrap items-center gap-1.5 text-xs">
                              <span
                                className={
                                  !n.read
                                    ? 'font-semibold text-blue-700'
                                    : 'font-medium text-slate-400'
                                }
                              >
                                {!n.read ? 'Non lu' : 'Lu'}
                              </span>
                              <span className="text-slate-300">·</span>
                              <span className="font-mono text-slate-500">
                                {formatDateFR(n.createdAt, true)}
                              </span>
                              {n.urgent && (
                                <>
                                  <span className="text-slate-300">·</span>
                                  <span className="font-semibold text-red-700">Prioritaire</span>
                                </>
                              )}
                              {n.deadline && (
                                <>
                                  <span className="text-slate-300">·</span>
                                  <span
                                    className={`font-mono font-medium ${
                                      dlInfo?.textClass || 'text-slate-600'
                                    }`}
                                  >
                                    Échéance {formatDateFR(n.deadline)}
                                    {dlInfo ? ` (${dlInfo.shortCountdown})` : ''}
                                  </span>
                                </>
                              )}
                            </div>
                            <h2 className="text-sm font-semibold text-slate-900">{n.title}</h2>
                            <p className="text-xs sm:text-sm text-slate-600">{n.message}</p>
                          </div>

                          <div className="flex items-center gap-3 shrink-0">
                            {!n.read && (
                              <button
                                type="button"
                                onClick={() => markNotificationRead(n.id)}
                                className="text-xs font-medium text-slate-500 hover:text-slate-800 underline cursor-pointer"
                              >
                                Marquer comme lu
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => openNotificationTarget(n)}
                              className="px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors cursor-pointer"
                            >
                              {n.actionLabel || 'Voir'}
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* SUBTAB 2: ENVOYER UNE NOTIFICATION CIBLÉE OU COLLECTIVE */}
            {commSubTab === 'envoyer' && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const res = sendAdminNotification({
                    targetType: msgTargetType,
                    targetAccountId: msgTargetType === 'individual' ? msgTargetAccountId : undefined,
                    targetStatus: msgTargetType === 'status' ? msgTargetStatus : undefined,
                    targetSubjectId: msgTargetType === 'subject' ? msgTargetSubjectId : undefined,
                    title: msgTitle,
                    message: msgBody,
                    urgent: msgUrgent,
                    deadline: msgDeadline || undefined,
                    actionLabel: msgActionLabel,
                    actionTab:
                      msgActionLabel === 'Corriger'
                        ? 'documents'
                        : msgActionLabel === 'Consulter le résultat'
                        ? 'suivi'
                        : 'apercu',
                    sendEmail: emailStatus.configured ? msgSendEmail : false,
                  });
                  if (!res.ok) {
                    setBanner({
                      tone: 'error',
                      text: res.error || 'Envoi impossible.',
                    });
                  } else {
                    setMsgTitle('');
                    setMsgBody('');
                    setMsgDeadline('');
                    setBanner({
                      tone: 'success',
                      text: `Notification envoyée à ${res.sentCount} candidat(s).`,
                    });
                  }
                }}
                className="bg-white border border-slate-200 rounded-xl p-5 space-y-4 max-w-3xl"
              >
                <h2 className="text-sm font-bold text-slate-900">
                  Notification individuelle ou collective aux candidats
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Destinataires</label>
                    <select
                      value={msgTargetType}
                      onChange={(e) =>
                        setMsgTargetType(
                          e.target.value as
                            | 'individual'
                            | 'all_candidates'
                            | 'correction_pending'
                            | 'status'
                            | 'subject'
                        )
                      }
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg"
                    >
                      <option value="individual">Un candidat précis</option>
                      <option value="all_candidates">Tous les candidats actifs</option>
                      <option value="correction_pending">
                        Candidats avec pièce à régulariser
                      </option>
                      <option value="status">Par statut de candidature</option>
                      <option value="subject">Par sujet de thèse choisi</option>
                    </select>
                  </div>

                  {msgTargetType === 'individual' && (
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Candidat</label>
                      <select
                        value={msgTargetAccountId}
                        onChange={(e) => setMsgTargetAccountId(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg"
                      >
                        {candidateAccounts.map((acc) => {
                          const dos = dossiers.find((d) => d.accountId === acc.id);
                          return (
                            <option key={acc.id} value={acc.id}>
                              {acc.fullName} {dos ? `(${dos.dossierNumber})` : ''}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                  )}

                  {msgTargetType === 'status' && (
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Statut ciblé</label>
                      <select
                        value={msgTargetStatus}
                        onChange={(e) => setMsgTargetStatus(e.target.value as ApplicationStatus)}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg"
                      >
                        <option value="soumis">Soumis</option>
                        <option value="en_cours">Présélectionné</option>
                        <option value="entretien">Convoqué à l’entretien</option>
                        <option value="admis">Admis en liste principale</option>
                        <option value="liste_attente">Liste d’attente</option>
                        <option value="inscrit">Inscrit définitif</option>
                      </select>
                    </div>
                  )}

                  {msgTargetType === 'subject' && (
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Sujet ciblé</label>
                      <select
                        value={msgTargetSubjectId}
                        onChange={(e) => setMsgTargetSubjectId(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg"
                      >
                        {subjects.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.code} — {s.title.slice(0, 45)}...
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="sm:col-span-2">
                    <label className="block font-semibold text-slate-700 mb-1">Titre court *</label>
                    <input
                      type="text"
                      value={msgTitle}
                      onChange={(e) => setMsgTitle(e.target.value)}
                      placeholder="Ex. Document complémentaire requis"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Échéance (optionnel)
                    </label>
                    <input
                      type="date"
                      value={msgDeadline}
                      onChange={(e) => setMsgDeadline(e.target.value)}
                      className="w-full px-3 py-2 font-mono border border-slate-200 rounded-lg"
                    />
                  </div>
                </div>

                <div className="text-xs">
                  <label className="block font-semibold text-slate-700 mb-1">Message clair *</label>
                  <textarea
                    rows={3}
                    value={msgBody}
                    onChange={(e) => setMsgBody(e.target.value)}
                    placeholder="Rédigez un message concis indiquant l’action attendue..."
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center text-xs">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Bouton d’action affiché au candidat
                    </label>
                    <select
                      value={msgActionLabel}
                      onChange={(e) =>
                        setMsgActionLabel(e.target.value as NotificationActionLabel)
                      }
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg"
                    >
                      <option value="Voir">Voir</option>
                      <option value="Corriger">Corriger</option>
                      <option value="Consulter le résultat">Consulter le résultat</option>
                    </select>
                  </div>

                  <div className="space-y-2 pt-2 sm:pt-5">
                    <label className="inline-flex items-center gap-2 font-semibold text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={msgUrgent}
                        onChange={(e) => setMsgUrgent(e.target.checked)}
                      />
                      Marquer comme prioritaire / urgent
                    </label>

                    <label
                      className={`flex items-center gap-2 ${
                        emailStatus.configured
                          ? 'text-slate-700 cursor-pointer'
                          : 'text-slate-400 cursor-not-allowed'
                      }`}
                    >
                      <input
                        type="checkbox"
                        disabled={!emailStatus.configured}
                        checked={emailStatus.configured && msgSendEmail}
                        onChange={(e) => setMsgSendEmail(e.target.checked)}
                      />
                      <Mail className="w-3.5 h-3.5 shrink-0" />
                      <span>
                        {emailStatus.configured
                          ? `Envoyer également par e-mail (${emailStatus.host})`
                          : 'Canal e-mail non configuré (notification interne uniquement)'}
                      </span>
                    </label>
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    className="px-4 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    Envoyer la notification
                  </button>
                </div>
              </form>
            )}

            {/* SUBTAB 3: ANNONCES PUBLIQUES (SANS DONNÉES PERSONNELLES) */}
            {commSubTab === 'annonces' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const res = publishAnnouncement({
                      title: annTitle,
                      message: annMessage,
                      important: annImportant,
                      notifyCandidates: annNotifyCandidates,
                    });
                    if (!res.ok) {
                      setBanner({
                        tone: 'error',
                        text: res.error || 'Publication refusée.',
                      });
                    } else {
                      setAnnTitle('');
                      setAnnMessage('');
                      setBanner({
                        tone: 'success',
                        text: 'Annonce publique publiée sur le portail.',
                      });
                    }
                  }}
                  className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-5 space-y-3.5 text-xs"
                >
                  <div className="flex items-center gap-2">
                    <Megaphone className="w-4 h-4 text-blue-700" />
                    <h2 className="text-sm font-bold text-slate-900">Nouvelle annonce officielle</h2>
                  </div>
                  <p className="text-slate-500">
                    Affichée publiquement sur la page d’accueil. Aucune donnée personnelle (nom,
                    CIN, CNE, e-mail) ne doit y figurer.
                  </p>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Titre *</label>
                    <input
                      type="text"
                      value={annTitle}
                      onChange={(e) => setAnnTitle(e.target.value)}
                      placeholder="Ex. Ouverture des candidatures 2026–2027"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Message institutionnel *
                    </label>
                    <textarea
                      rows={3}
                      value={annMessage}
                      onChange={(e) => setAnnMessage(e.target.value)}
                      placeholder="Information générale de campagne..."
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="flex items-center gap-2 font-medium text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={annImportant}
                        onChange={(e) => setAnnImportant(e.target.checked)}
                      />
                      Mettre en évidence sur la page d’accueil
                    </label>
                    <label className="flex items-center gap-2 font-medium text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={annNotifyCandidates}
                        onChange={(e) => setAnnNotifyCandidates(e.target.checked)}
                      />
                      Notifier également tous les candidats inscrits
                    </label>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2 px-4 font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg cursor-pointer"
                  >
                    Publier l’annonce
                  </button>
                </form>

                <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl divide-y divide-slate-200">
                  <div className="px-5 py-3.5 text-xs font-semibold text-slate-600">
                    Annonces enregistrées ({announcements.length})
                  </div>
                  {announcements.length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-500">Aucune annonce.</div>
                  ) : (
                    announcements.map((ann) => (
                      <div
                        key={ann.id}
                        className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                      >
                        <div className="space-y-1 max-w-xl">
                          <div className="flex flex-wrap items-center gap-1.5 text-slate-500">
                            <span
                              className={
                                ann.active
                                  ? 'font-semibold text-emerald-700'
                                  : 'font-semibold text-slate-400'
                              }
                            >
                              {ann.active ? 'Publiée' : 'Masquée'}
                            </span>
                            <span>·</span>
                            <span className="font-mono">{formatDateFR(ann.publishedAt, true)}</span>
                            <span>·</span>
                            <span>{ann.publishedBy}</span>
                          </div>
                          <h3 className="text-sm font-semibold text-slate-900">{ann.title}</h3>
                          <p className="text-slate-600">{ann.message}</p>
                        </div>

                        <button
                          type="button"
                          onClick={() => toggleAnnouncementActive(ann.id)}
                          className="px-3 py-1.5 font-semibold text-slate-700 border border-slate-200 hover:bg-slate-50 rounded-lg shrink-0 cursor-pointer"
                        >
                          {ann.active ? 'Masquer' : 'Publier'}
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* SUBTAB 4: JOURNAL DE TRAÇABILITÉ */}
            {commSubTab === 'journal' && (
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-900">
                    Historique des événements et notifications ({auditLogs.length})
                  </span>
                  <span className="text-slate-500">Traçabilité horodatée</span>
                </div>
                <div className="overflow-x-auto max-h-[540px] overflow-y-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                        <th className="py-2.5 px-4">Date & Heure</th>
                        <th className="py-2.5 px-4">Acteur</th>
                        <th className="py-2.5 px-4">Dossier</th>
                        <th className="py-2.5 px-4">Opération</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {auditLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-slate-50">
                          <td className="py-2.5 px-4 font-mono text-slate-500 whitespace-nowrap">
                            {formatDateFR(log.timestamp, true)}
                          </td>
                          <td className="py-2.5 px-4 font-medium text-slate-900 whitespace-nowrap">
                            {log.actorName}
                          </td>
                          <td className="py-2.5 px-4 font-mono text-blue-700 whitespace-nowrap">
                            {log.dossierNumber || '—'}
                          </td>
                          <td className="py-2.5 px-4 text-slate-700">{log.summary}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: GESTION DES SUJETS */}
        {activeTab === 'sujets' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <h1 className="text-lg sm:text-xl font-bold text-slate-900">
                Sujets de thèse ({subjects.length})
              </h1>
              <button
                type="button"
                onClick={() => {
                  setEditingSubjectId(undefined);
                  setSujForm({
                    code: `ST-USMBA-2026-0${subjects.length + 1}`,
                    title: '',
                    cedoc: 'CEDoc Sciences et Techniques et Sciences Médicales',
                    formationDoctorale:
                      'Informatique, Intelligence Artificielle et Analyse de Données',
                    laboratoire: '',
                    etablissement: 'Faculté des Sciences Dhar El Mehraz (FSDM - Fès)',
                    domaine: 'Informatique & Intelligence Artificielle',
                    supervisor: '',
                    supervisorEmail: '',
                    places: 2,
                    prerequisites: '',
                    description: '',
                    keywords: ['USMBA', 'Doctorat'],
                    open: true,
                    validationStatus: {
                      structure: 'validee',
                      centre: 'validee',
                      pole: 'validee',
                    },
                  });
                  setShowSubjectForm((v) => !v);
                }}
                className="px-3.5 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                {showSubjectForm ? 'Fermer' : 'Nouveau sujet'}
              </button>
            </div>

            {showSubjectForm && (
              <form
                onSubmit={handleSaveSubject}
                className="bg-white border border-slate-200 rounded-xl p-5 space-y-4"
              >
                <h2 className="text-sm font-bold text-slate-900">
                  {editingSubjectId ? 'Modifier le sujet' : 'Nouveau sujet'}
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Code *
                    </label>
                    <input
                      type="text"
                      value={sujForm.code}
                      onChange={(e) => setSujForm({ ...sujForm, code: e.target.value })}
                      className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-lg"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Formation doctorale *
                    </label>
                    <input
                      type="text"
                      value={sujForm.formationDoctorale}
                      onChange={(e) =>
                        setSujForm({ ...sujForm, formationDoctorale: e.target.value })
                      }
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Places *
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={sujForm.places}
                      onChange={(e) =>
                        setSujForm({
                          ...sujForm,
                          places: Math.max(1, Number.parseInt(e.target.value, 10) || 1),
                        })
                      }
                      className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-lg"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Intitulé *
                  </label>
                  <input
                    type="text"
                    value={sujForm.title}
                    onChange={(e) => setSujForm({ ...sujForm, title: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Encadrant *
                    </label>
                    <input
                      type="text"
                      value={sujForm.supervisor}
                      onChange={(e) => setSujForm({ ...sujForm, supervisor: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Laboratoire *
                    </label>
                    <input
                      type="text"
                      value={sujForm.laboratoire}
                      onChange={(e) => setSujForm({ ...sujForm, laboratoire: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Établissement *
                    </label>
                    <input
                      type="text"
                      value={sujForm.etablissement}
                      onChange={(e) => setSujForm({ ...sujForm, etablissement: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Validation Structure
                    </label>
                    <select
                      value={sujForm.validationStatus?.structure || 'validee'}
                      onChange={(e) =>
                        setSujForm({
                          ...sujForm,
                          validationStatus: {
                            structure: e.target.value as 'validee' | 'en_attente',
                            centre: sujForm.validationStatus?.centre || 'validee',
                            pole: sujForm.validationStatus?.pole || 'validee',
                          },
                        })
                      }
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg"
                    >
                      <option value="validee">Validée</option>
                      <option value="en_attente">En attente</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Validation Centre
                    </label>
                    <select
                      value={sujForm.validationStatus?.centre || 'validee'}
                      onChange={(e) =>
                        setSujForm({
                          ...sujForm,
                          validationStatus: {
                            structure: sujForm.validationStatus?.structure || 'validee',
                            centre: e.target.value as 'validee' | 'en_attente',
                            pole: sujForm.validationStatus?.pole || 'validee',
                          },
                        })
                      }
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg"
                    >
                      <option value="validee">Validée</option>
                      <option value="en_attente">En attente</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Validation Pôle
                    </label>
                    <select
                      value={sujForm.validationStatus?.pole || 'validee'}
                      onChange={(e) =>
                        setSujForm({
                          ...sujForm,
                          validationStatus: {
                            structure: sujForm.validationStatus?.structure || 'validee',
                            centre: sujForm.validationStatus?.centre || 'validee',
                            pole: e.target.value as 'validee' | 'en_attente',
                          },
                        })
                      }
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg"
                    >
                      <option value="validee">Validée</option>
                      <option value="en_attente">En attente</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Prérequis
                    </label>
                    <textarea
                      rows={2}
                      value={sujForm.prerequisites}
                      onChange={(e) => setSujForm({ ...sujForm, prerequisites: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Description
                    </label>
                    <textarea
                      rows={2}
                      value={sujForm.description}
                      onChange={(e) => setSujForm({ ...sujForm, description: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowSubjectForm(false)}
                    className="px-3.5 py-2 text-xs font-semibold text-slate-600 bg-slate-100 rounded-lg cursor-pointer"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg cursor-pointer"
                  >
                    Enregistrer
                  </button>
                </div>
              </form>
            )}

            <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-200">
              {subjects.map((suj) => (
                <div
                  key={suj.id}
                  className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1 max-w-3xl">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <span className="font-mono font-semibold text-blue-700">{suj.code}</span>
                      <span>·</span>
                      <span className="font-mono">{suj.places} place(s)</span>
                      <span>·</span>
                      <span
                        className={
                          suj.open ? 'text-emerald-700 font-semibold' : 'text-red-700 font-semibold'
                        }
                      >
                        {suj.open ? 'Ouvert' : 'Clôturé'}
                      </span>
                    </div>
                    <h3 className="text-sm font-semibold text-slate-900">{suj.title}</h3>
                    <p className="text-xs text-slate-600">
                      {suj.supervisor} · {suj.laboratoire}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleOpenEditSubject(suj)}
                      className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center gap-1 cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      Modifier
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleSubjectOpen(suj.id)}
                      className="px-3 py-1.5 text-xs font-semibold text-slate-700 border border-slate-200 hover:bg-slate-50 rounded-lg cursor-pointer"
                    >
                      {suj.open ? 'Clôturer' : 'Ouvrir'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: PARAMÈTRES */}
        {activeTab === 'configuration' && (
          <div className="space-y-6">
            <h1 className="text-lg sm:text-xl font-bold text-slate-900">Paramètres</h1>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Dates */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  updateCampaignSettings(calDraft, {
                    notifyCandidates: notifyCalendarCandidates,
                  });
                  setBanner({
                    tone: 'success',
                    text: notifyCalendarCandidates
                      ? 'Calendrier mis à jour et candidats notifiés.'
                      : 'Calendrier mis à jour.',
                  });
                }}
                className="bg-white border border-slate-200 rounded-xl p-5 space-y-4"
              >
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold text-slate-900">Calendrier universitaire</h2>
                  <button
                    type="button"
                    onClick={() =>
                      updateCampaignSettings({ campaignOpen: !campaignConfig.campaignOpen })
                    }
                    className={`px-2.5 py-1 text-xs font-semibold rounded-md border cursor-pointer ${
                      campaignConfig.campaignOpen
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                        : 'bg-red-50 border-red-200 text-red-800'
                    }`}
                  >
                    {campaignConfig.campaignOpen ? 'Campagne ouverte' : 'Campagne fermée'}
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Ouverture</label>
                    <input
                      type="date"
                      value={calDraft.openDate}
                      onChange={(e) => setCalDraft({ ...calDraft, openDate: e.target.value })}
                      className="w-full px-3 py-2 font-mono border border-slate-200 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Date limite de candidature
                    </label>
                    <input
                      type="date"
                      value={calDraft.submissionDeadline}
                      onChange={(e) =>
                        setCalDraft({ ...calDraft, submissionDeadline: e.target.value })
                      }
                      className="w-full px-3 py-2 font-mono border border-slate-200 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Entretiens</label>
                    <input
                      type="text"
                      value={calDraft.interviewPeriod}
                      onChange={(e) =>
                        setCalDraft({ ...calDraft, interviewPeriod: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Inscription définitive
                    </label>
                    <input
                      type="date"
                      value={calDraft.enrollmentDeadline}
                      onChange={(e) =>
                        setCalDraft({ ...calDraft, enrollmentDeadline: e.target.value })
                      }
                      className="w-full px-3 py-2 font-mono border border-slate-200 rounded-lg"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block font-semibold text-slate-700 mb-1">
                      Liste d’attente
                    </label>
                    <input
                      type="text"
                      value={calDraft.waitlistEnrollmentPeriod}
                      onChange={(e) =>
                        setCalDraft({ ...calDraft, waitlistEnrollmentPeriod: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                    />
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <label className="inline-flex items-center gap-2 font-medium text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={notifyCalendarCandidates}
                      onChange={(e) => setNotifyCalendarCandidates(e.target.checked)}
                    />
                    Notifier automatiquement les candidats du changement
                  </label>
                  <button
                    type="submit"
                    className="px-3.5 py-1.5 font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg cursor-pointer"
                  >
                    Enregistrer le calendrier
                  </button>
                </div>
              </form>

              {/* Rules */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
                <h2 className="text-sm font-bold text-slate-900">Règles de sélection</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="sm:col-span-2">
                    <label className="block font-semibold text-slate-700 mb-1">
                      Nombre de choix par candidat
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="5"
                      value={campaignConfig.requiredSubjectChoices}
                      onChange={(e) => {
                        const val = Math.min(
                          5,
                          Math.max(1, Number.parseInt(e.target.value, 10) || 3)
                        );
                        updateCampaignSettings({ requiredSubjectChoices: val });
                      }}
                      className="w-24 px-3 py-2 font-mono font-bold border border-slate-200 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Pondération dossier (%)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={campaignConfig.dossierWeight}
                      onChange={(e) => {
                        const val = Math.min(100, Math.max(0, Number(e.target.value) || 0));
                        updateCampaignSettings({
                          dossierWeight: val,
                          interviewWeight: 100 - val,
                        });
                      }}
                      className="w-full px-3 py-2 font-mono border border-slate-200 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Pondération entretien (%)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={campaignConfig.interviewWeight}
                      onChange={(e) => {
                        const val = Math.min(100, Math.max(0, Number(e.target.value) || 0));
                        updateCampaignSettings({
                          interviewWeight: val,
                          dossierWeight: 100 - val,
                        });
                      }}
                      className="w-full px-3 py-2 font-mono border border-slate-200 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Moyenne min. Bac+5 (/20)
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      min="10"
                      max="18"
                      value={campaignConfig.minMasterAverage}
                      onChange={(e) =>
                        updateCampaignSettings({
                          minMasterAverage: Number(e.target.value) || 10,
                        })
                      }
                      className="w-full px-3 py-2 font-mono border border-slate-200 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Seuil éliminatoire oral (/20)
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      max="16"
                      value={campaignConfig.eliminatoryInterviewScore}
                      onChange={(e) =>
                        updateCampaignSettings({
                          eliminatoryInterviewScore: Number(e.target.value) || 0,
                        })
                      }
                      className="w-full px-3 py-2 font-mono border border-slate-200 rounded-lg"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Deadlines, Reminders & SMTP Status */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-blue-700" />
                  <h2 className="text-sm font-bold text-slate-900">
                    Gestion des délais de régularisation, rappels & e-mails
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    const res = await runDeadlineCheck();
                    setBanner({
                      tone: 'success',
                      text:
                        res.generatedCount > 0
                          ? `${res.generatedCount} rappel(s) ou alerte(s) généré(s).`
                          : 'Aucun nouveau rappel à générer aujourd’hui.',
                    });
                  }}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Vérifier les délais maintenant
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Délai par défaut de correction (jours)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="30"
                    value={campaignConfig.deadlinePolicy.defaultCorrectionDays}
                    onChange={(e) =>
                      updateDeadlinePolicy({
                        defaultCorrectionDays: Math.min(
                          30,
                          Math.max(1, Number.parseInt(e.target.value, 10) || 7)
                        ),
                      })
                    }
                    className="w-28 px-3 py-2 font-mono font-semibold border border-slate-200 rounded-lg"
                  />
                </div>

                <div>
                  <span className="block font-semibold text-slate-700 mb-1.5">
                    Rappels automatiques avant expiration
                  </span>
                  <div className="flex flex-wrap items-center gap-3 pt-1">
                    {[7, 3, 1].map((dayThreshold) => {
                      const active =
                        campaignConfig.deadlinePolicy.reminderDaysBefore.includes(dayThreshold);
                      return (
                        <label
                          key={dayThreshold}
                          className="inline-flex items-center gap-1.5 font-mono font-semibold text-slate-800 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={active}
                            onChange={(e) => {
                              const current = campaignConfig.deadlinePolicy.reminderDaysBefore;
                              const next = e.target.checked
                                ? Array.from(new Set([...current, dayThreshold])).sort(
                                    (a, b) => b - a
                                  )
                                : current.filter((d) => d !== dayThreshold);
                              updateDeadlinePolicy({ reminderDaysBefore: next });
                            }}
                          />
                          J-{dayThreshold}
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <span className="block font-semibold text-slate-700 mb-1">
                    Canal e-mail (SMTP)
                  </span>
                  <p className="text-slate-600 pt-1">
                    {emailStatus.configured ? (
                      <span className="text-emerald-700 font-semibold">
                        Actif ({emailStatus.host} · {emailStatus.fromAddress})
                      </span>
                    ) : (
                      <span className="text-slate-500">
                        Non configuré (variables SMTP absentes) — notifications internes actives.
                      </span>
                    )}
                  </p>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <label className="inline-flex items-start sm:items-center gap-2 font-medium text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={campaignConfig.deadlinePolicy.autoRejectOnExpiredCorrection}
                    onChange={(e) =>
                      updateDeadlinePolicy({
                        autoRejectOnExpiredCorrection: e.target.checked,
                      })
                    }
                  />
                  <span>
                    Rejeter automatiquement un dossier en cas de délai de correction expiré
                  </span>
                </label>
                <span className="text-slate-500">
                  {campaignConfig.deadlinePolicy.autoRejectOnExpiredCorrection
                    ? 'Règle active : rejet automatique après expiration.'
                    : 'Désactivé (recommandé) : signalement administratif sans rejet automatique.'}
                </span>
              </div>
            </div>

            {/* Document Requirements */}
            <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-200">
              <div className="p-5">
                <h2 className="text-sm font-bold text-slate-900">Pièces justificatives</h2>
              </div>

              {campaignConfig.documentRequirements.map((req) => (
                <div
                  key={req.id}
                  className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-0.5 max-w-xl">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-blue-700">{req.code}</span>
                      <span className="font-semibold text-sm text-slate-900">{req.label}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                    <select
                      value={req.stage}
                      onChange={(e) =>
                        upsertDocumentRequirement({
                          ...req,
                          stage: e.target.value as DocumentStage,
                        })
                      }
                      className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-md font-medium"
                    >
                      <option value="preinscription">Préinscription</option>
                      <option value="inscription">Inscription</option>
                    </select>

                    <button
                      type="button"
                      onClick={() =>
                        upsertDocumentRequirement({ ...req, required: !req.required })
                      }
                      className={`px-2.5 py-1.5 rounded-md font-semibold border cursor-pointer ${
                        req.required
                          ? 'bg-blue-50 border-blue-200 text-blue-800'
                          : 'bg-slate-50 border-slate-200 text-slate-600'
                      }`}
                    >
                      {req.required ? 'Obligatoire' : 'Facultatif'}
                    </button>

                    <div className="inline-flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-md p-1">
                      {(['PDF', 'JPG', 'PNG'] as const).map((fmt) => {
                        const active = req.acceptedFormats.includes(fmt);
                        return (
                          <button
                            key={fmt}
                            type="button"
                            onClick={() => {
                              const next = active
                                ? req.acceptedFormats.filter((f) => f !== fmt)
                                : [...req.acceptedFormats, fmt];
                              if (next.length > 0) {
                                upsertDocumentRequirement({ ...req, acceptedFormats: next });
                              }
                            }}
                            className={`px-2 py-0.5 rounded font-mono font-semibold cursor-pointer ${
                              active ? 'bg-slate-900 text-white' : 'text-slate-500'
                            }`}
                          >
                            {fmt}
                          </button>
                        );
                      })}
                    </div>

                    <div className="inline-flex items-center gap-1">
                      <input
                        type="number"
                        min="1"
                        max="25"
                        value={req.maxSizeMB}
                        onChange={(e) =>
                          upsertDocumentRequirement({
                            ...req,
                            maxSizeMB: Math.max(1, Number(e.target.value) || 5),
                          })
                        }
                        className="w-14 px-2 py-1 font-mono border border-slate-200 rounded-md"
                      />
                      <span className="text-slate-500">Mo</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => deleteDocumentRequirement(req.id)}
                      aria-label={`Supprimer ${req.label}`}
                      className="p-1.5 text-slate-400 hover:text-red-700 rounded-md cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}

              <form onSubmit={handleAddDocumentRequirement} className="p-5 bg-slate-50/70 space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Ajouter une pièce
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                  <input
                    type="text"
                    value={newReqCode}
                    onChange={(e) => setNewReqCode(e.target.value)}
                    placeholder="Code (ex. ATTESTATION) *"
                    className="px-3 py-2 font-mono bg-white border border-slate-200 rounded-lg"
                  />
                  <input
                    type="text"
                    value={newReqLabel}
                    onChange={(e) => setNewReqLabel(e.target.value)}
                    placeholder="Intitulé de la pièce *"
                    className="sm:col-span-2 px-3 py-2 bg-white border border-slate-200 rounded-lg"
                  />
                  <select
                    value={newReqStage}
                    onChange={(e) => setNewReqStage(e.target.value as DocumentStage)}
                    className="px-3 py-2 bg-white border border-slate-200 rounded-lg"
                  >
                    <option value="preinscription">Préinscription</option>
                    <option value="inscription">Inscription</option>
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center text-xs">
                  <input
                    type="text"
                    value={newReqInstructions}
                    onChange={(e) => setNewReqInstructions(e.target.value)}
                    placeholder="Consigne courte (optionnel)..."
                    className="sm:col-span-5 px-3 py-2 bg-white border border-slate-200 rounded-lg"
                  />
                  <div className="sm:col-span-3 flex items-center gap-2">
                    {(['PDF', 'JPG', 'PNG'] as const).map((fmt) => (
                      <label key={fmt} className="inline-flex items-center gap-1 font-mono">
                        <input
                          type="checkbox"
                          checked={newReqFormats.includes(fmt)}
                          onChange={(e) => {
                            if (e.target.checked) setNewReqFormats([...newReqFormats, fmt]);
                            else if (newReqFormats.length > 1) {
                              setNewReqFormats(newReqFormats.filter((f) => f !== fmt));
                            }
                          }}
                        />
                        {fmt}
                      </label>
                    ))}
                  </div>
                  <label className="sm:col-span-2 inline-flex items-center gap-1.5 font-semibold text-slate-700">
                    <input
                      type="checkbox"
                      checked={newReqRequired}
                      onChange={(e) => setNewReqRequired(e.target.checked)}
                    />
                    Obligatoire
                  </label>
                  <button
                    type="submit"
                    className="sm:col-span-2 py-2 px-3 font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Ajouter
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* TAB 5: UTILISATEURS */}
        {activeTab === 'comptes' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            <form
              onSubmit={handleCreateIntervenant}
              className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-5 space-y-3.5"
            >
              <h2 className="text-sm font-bold text-slate-900">Nouvel intervenant</h2>
              <div className="space-y-3 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Nom complet *</label>
                  <input
                    type="text"
                    value={staffFullName}
                    onChange={(e) => setStaffFullName(e.target.value)}
                    placeholder="Pr. Nom Prénom"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">E-mail *</label>
                  <input
                    type="email"
                    value={staffEmail}
                    onChange={(e) => setStaffEmail(e.target.value)}
                    placeholder="prenom.nom@usmba.ac.ma"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Rôle</label>
                    <select
                      value={staffRole}
                      onChange={(e) =>
                        setStaffRole(e.target.value as 'commission' | 'admin')
                      }
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg"
                    >
                      <option value="commission">Commission</option>
                      <option value="admin">Administration</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Établissement</label>
                    <input
                      type="text"
                      value={staffEtab}
                      onChange={(e) => setStaffEtab(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                    />
                  </div>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Fonction</label>
                  <input
                    type="text"
                    value={staffTitle}
                    onChange={(e) => setStaffTitle(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Laboratoire</label>
                  <input
                    type="text"
                    value={staffLab}
                    onChange={(e) => setStaffLab(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-2 px-4 font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg cursor-pointer"
                >
                  Créer le compte
                </button>
              </div>
            </form>

            <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl divide-y divide-slate-200">
              <div className="px-5 py-4">
                <h2 className="text-sm font-bold text-slate-900">
                  Utilisateurs ({accounts.length})
                </h2>
              </div>
              <div className="divide-y divide-slate-200 max-h-[520px] overflow-y-auto">
                {accounts.map((acc) => (
                  <div
                    key={acc.id}
                    className="px-5 py-3.5 flex items-center justify-between gap-4 text-xs"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900 truncate">
                        {acc.fullName} ·{' '}
                        <span className="font-normal text-slate-500">
                          {acc.role === 'candidat'
                            ? `Candidat (${acc.cin || ''})`
                            : acc.role === 'commission'
                            ? 'Commission'
                            : 'Administration'}
                        </span>
                      </p>
                      <p className="text-slate-500 font-mono truncate">{acc.email}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleAccountActive(acc.id)}
                      className={`px-2.5 py-1 rounded-md font-semibold shrink-0 border cursor-pointer ${
                        acc.active
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                          : 'bg-red-50 border-red-200 text-red-800'
                      }`}
                    >
                      {acc.active ? 'Actif' : 'Suspendu'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: SUPPORT */}
        {activeTab === 'support' && (
          <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-200">
            <div className="px-5 py-4">
              <h1 className="text-base font-bold text-slate-900">
                Demandes d’assistance ({supportTickets.length})
              </h1>
            </div>

            {supportTickets.map((ticket) => (
              <div key={ticket.id} className="p-5 space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                  <span>
                    <strong className="font-mono text-slate-900">{ticket.reference}</strong> ·{' '}
                    {ticket.senderName} ({ticket.senderEmail}){' '}
                    {ticket.dossierNumber ? `· ${ticket.dossierNumber}` : ''}
                  </span>
                  <span
                    className={`font-semibold ${
                      ticket.status === 'repondu' ? 'text-emerald-700' : 'text-amber-700'
                    }`}
                  >
                    {ticket.status === 'repondu' ? 'Répondu' : 'Ouvert'}
                  </span>
                </div>
                <h3 className="text-sm font-semibold text-slate-900">
                  [{ticket.category}] {ticket.subject}
                </h3>
                <p className="text-xs sm:text-sm text-slate-600">{ticket.message}</p>

                {ticket.reply ? (
                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700">
                    <strong>Réponse :</strong> {ticket.reply}
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row gap-2 pt-1">
                    <input
                      type="text"
                      value={ticketReplies[ticket.id] || ''}
                      onChange={(e) =>
                        setTicketReplies({ ...ticketReplies, [ticket.id]: e.target.value })
                      }
                      placeholder="Réponse..."
                      className="flex-1 px-3 py-1.5 text-xs border border-slate-200 rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const text = (ticketReplies[ticket.id] || '').trim();
                        if (!text) return;
                        replyToSupportTicket(ticket.id, text);
                        setBanner({
                          tone: 'success',
                          text: 'Réponse envoyée.',
                        });
                      }}
                      className="px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg flex items-center gap-1.5 shrink-0 cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                      Répondre
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </WorkspaceShell>
  );
};
