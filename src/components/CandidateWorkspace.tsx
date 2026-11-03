import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Bell,
  BookOpen,
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock,
  Download,
  FileCheck,
  FileText,
  FileUp,
  FolderOpen,
  HelpCircle,
  MapPin,
  Plus,
  Printer,
  RotateCcw,
  Save,
  Search,
  Send,
  Trash2,
  User,
} from 'lucide-react';
import { useGCD } from '../context/GCDContext';
import { AcademicInfo, DocumentRequirement, PersonalInfo, SubjectChoice } from '../types/gcd';
import {
  computeDeadlineInfo,
  computeDossierDiagnostics,
  formatDateFR,
  formatFileSize,
  getActiveCorrectionRequest,
  getDocStatusPresentation,
  getStatusPresentation,
} from '../utils/formatters';
import { HelpCenter } from './HelpCenter';
import { NavItem, WorkspaceShell } from './WorkspaceShell';

type CandidateTab = 'suivi' | 'dossier' | 'sujets' | 'pieces' | 'notifications' | 'aide';

const WIDTH_STEPS: Record<number, string> = {
  0: 'w-0',
  5: 'w-[5%]',
  10: 'w-[10%]',
  15: 'w-[15%]',
  20: 'w-[20%]',
  25: 'w-1/4',
  30: 'w-[30%]',
  35: 'w-[35%]',
  40: 'w-2/5',
  45: 'w-[45%]',
  50: 'w-1/2',
  55: 'w-[55%]',
  60: 'w-3/5',
  65: 'w-[65%]',
  70: 'w-[70%]',
  75: 'w-3/4',
  80: 'w-4/5',
  85: 'w-[85%]',
  90: 'w-[90%]',
  95: 'w-[95%]',
  100: 'w-full',
};

function getWidthClass(percent: number): string {
  const clamped = Math.max(0, Math.min(100, Math.round(percent / 5) * 5));
  return WIDTH_STEPS[clamped] || 'w-0';
}

export const CandidateWorkspace: React.FC = () => {
  const {
    currentUser,
    currentCandidateDossier: dossier,
    subjects,
    campaignConfig,
    notifications,
    navigationFocus,
    clearNavigationFocus,
    openNotificationTarget,
    saveCandidateDraft,
    confirmAdmissionSubject,
    uploadCandidateDocument,
    submitCandidateApplication,
    submitFinalEnrollment,
    markNotificationRead,
    markAllNotificationsRead,
  } = useGCD();

  const [activeTab, setActiveTab] = useState<CandidateTab>('suivi');
  const [formStep, setFormStep] = useState<1 | 2 | 3>(1);
  const [notifFilter, setNotifFilter] = useState<'all' | 'unread' | 'action'>('all');
  const [highlightedReqId, setHighlightedReqId] = useState<string | null>(null);

  const [personalForm, setPersonalForm] = useState<PersonalInfo | null>(
    () => dossier?.personalInfo ?? null
  );
  const [academicForm, setAcademicForm] = useState<AcademicInfo | null>(
    () => dossier?.academicInfo ?? null
  );
  const [choicesDraft, setChoicesDraft] = useState<SubjectChoice[]>(
    () => dossier?.subjectChoices ?? []
  );
  const [motivationText, setMotivationText] = useState(() => dossier?.motivation ?? '');
  const [proposalText, setProposalText] = useState(() => dossier?.researchProposalSummary ?? '');
  const [feedbackBanner, setFeedbackBanner] = useState<{
    tone: 'success' | 'error' | 'info';
    text: string;
  } | null>(null);

  // Subject catalogue filters
  const [subjectQuery, setSubjectQuery] = useState('');
  const [subjectFormation, setSubjectFormation] = useState('Toutes');
  const [subjectDomain, setSubjectDomain] = useState('Tous');
  const [subjectLab, setSubjectLab] = useState('Tous');
  const [expandedSubjectId, setExpandedSubjectId] = useState<string | null>(null);

  // Upload error per requirement
  const [uploadErrors, setUploadErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (dossier) {
      setPersonalForm(dossier.personalInfo);
      setAcademicForm(dossier.academicInfo);
      setChoicesDraft(dossier.subjectChoices);
      setMotivationText(dossier.motivation);
      setProposalText(dossier.researchProposalSummary);
      setFeedbackBanner(null);
      setUploadErrors({});
    }
  }, [dossier?.id]);

  useEffect(() => {
    if (dossier) {
      setChoicesDraft(dossier.subjectChoices);
    }
  }, [dossier?.subjectChoices]);

  useEffect(() => {
    if (!navigationFocus) return;
    const validTabs: CandidateTab[] = [
      'suivi',
      'dossier',
      'sujets',
      'pieces',
      'notifications',
      'aide',
    ];
    if (validTabs.includes(navigationFocus.tab as CandidateTab)) {
      setActiveTab(navigationFocus.tab as CandidateTab);
    }
    if (navigationFocus.requirementId) {
      setHighlightedReqId(navigationFocus.requirementId);
    }
    clearNavigationFocus();
  }, [navigationFocus, clearNavigationFocus]);

  const isEditableDraft = dossier?.status === 'brouillon';
  const requiredChoicesCount = Math.max(1, campaignConfig.requiredSubjectChoices || 3);

  const effectiveDossier = useMemo(() => {
    if (!dossier) return null;
    if (isEditableDraft && personalForm && academicForm) {
      return {
        ...dossier,
        personalInfo: personalForm,
        academicInfo: academicForm,
        subjectChoices: choicesDraft,
        motivation: motivationText,
        researchProposalSummary: proposalText,
      };
    }
    return dossier;
  }, [dossier, isEditableDraft, personalForm, academicForm, choicesDraft, motivationText, proposalText]);

  const diagnostics = useMemo(() => {
    if (!effectiveDossier) return null;
    return computeDossierDiagnostics(effectiveDossier, campaignConfig, subjects);
  }, [effectiveDossier, campaignConfig, subjects]);

  const userNotifications = notifications;

  const filteredSubjects = useMemo(() => {
    const q = subjectQuery.trim().toLowerCase();
    return subjects.filter((s) => {
      if (subjectFormation !== 'Toutes' && s.formationDoctorale !== subjectFormation) return false;
      if (subjectDomain !== 'Tous' && s.domaine !== subjectDomain) return false;
      if (subjectLab !== 'Tous' && s.laboratoire !== subjectLab) return false;
      if (!q) return true;
      return (
        s.title.toLowerCase().includes(q) ||
        s.code.toLowerCase().includes(q) ||
        s.formationDoctorale.toLowerCase().includes(q) ||
        s.supervisor.toLowerCase().includes(q) ||
        s.laboratoire.toLowerCase().includes(q) ||
        s.keywords.some((kw) => kw.toLowerCase().includes(q))
      );
    });
  }, [subjects, subjectQuery, subjectFormation, subjectDomain, subjectLab]);

  const formations = useMemo(
    () => ['Toutes', ...Array.from(new Set(subjects.map((s) => s.formationDoctorale)))],
    [subjects]
  );
  const domains = useMemo(
    () => ['Tous', ...Array.from(new Set(subjects.map((s) => s.domaine)))],
    [subjects]
  );
  const labs = useMemo(
    () => ['Tous', ...Array.from(new Set(subjects.map((s) => s.laboratoire)))],
    [subjects]
  );

  if (
    !currentUser ||
    !dossier ||
    !personalForm ||
    !academicForm ||
    !effectiveDossier ||
    !diagnostics
  ) {
    return null;
  }

  const unreadNotifCount = userNotifications.filter((n) => !n.read).length;
  const actionDocsCount =
    diagnostics.docsToCorrect.length +
    (dossier.status === 'brouillon' ? diagnostics.missingPreinscriptionDocs.length : 0) +
    (dossier.status === 'admis' ? diagnostics.missingInscriptionDocs.length : 0);

  const activeChoices = isEditableDraft ? choicesDraft : dossier.subjectChoices;
  const confirmedSubject = subjects.find(
    (s) =>
      s.id ===
      (dossier.confirmedSubjectId ||
        dossier.subjectChoices.find((c) => c.status === 'admis')?.subjectId)
  );
  const admittedChoices = dossier.subjectChoices.filter((c) => c.status === 'admis');
  const statusMeta = getStatusPresentation(dossier.status);

  const navItems: NavItem[] = [
    {
      id: 'suivi',
      label: 'Tableau de bord',
      icon: <Clock className="w-4 h-4" />,
    },
    {
      id: 'dossier',
      label: 'Mon dossier',
      icon: <User className="w-4 h-4" />,
    },
    {
      id: 'sujets',
      label: 'Choix des sujets',
      icon: <BookOpen className="w-4 h-4" />,
      badgeCount: isEditableDraft ? diagnostics.subjectsMissingCount : undefined,
      badgeTone: 'neutral',
    },
    {
      id: 'pieces',
      label: 'Pièces jointes',
      icon: <FolderOpen className="w-4 h-4" />,
      badgeCount: actionDocsCount,
      badgeTone: diagnostics.docsToCorrect.length > 0 ? 'alert' : 'neutral',
    },
    {
      id: 'notifications',
      label: 'Notifications',
      icon: <Bell className="w-4 h-4" />,
      badgeCount: unreadNotifCount,
      badgeTone: userNotifications.some((n) => !n.read && (n.urgent || n.actionRequired))
        ? 'alert'
        : 'neutral',
    },
    {
      id: 'aide',
      label: 'Aide & Support',
      icon: <HelpCircle className="w-4 h-4" />,
    },
  ];

  const persistChoices = (nextChoices: SubjectChoice[], bannerMessage?: string) => {
    const normalized = nextChoices.map((ch, idx) => ({
      ...ch,
      priority: idx + 1,
    }));
    setChoicesDraft(normalized);
    saveCandidateDraft(dossier.id, {
      personalInfo: personalForm,
      academicInfo: academicForm,
      subjectChoices: normalized,
      motivation: motivationText,
      researchProposalSummary: proposalText,
    });
    if (bannerMessage) {
      setFeedbackBanner({ tone: 'success', text: bannerMessage });
    }
  };

  const handleSaveDraft = () => {
    saveCandidateDraft(dossier.id, {
      personalInfo: personalForm,
      academicInfo: academicForm,
      subjectChoices: choicesDraft,
      motivation: motivationText,
      researchProposalSummary: proposalText,
    });
    setFeedbackBanner({
      tone: 'success',
      text: 'Brouillon enregistré.',
    });
  };

  const handleAddSubjectChoice = (subjectId: string) => {
    if (!isEditableDraft) return;
    if (choicesDraft.some((c) => c.subjectId === subjectId)) return;
    if (choicesDraft.length >= requiredChoicesCount) {
      setFeedbackBanner({
        tone: 'error',
        text: `Maximum de ${requiredChoicesCount} sujets atteint.`,
      });
      return;
    }
    const sub = subjects.find((s) => s.id === subjectId);
    const nextRank = choicesDraft.length + 1;
    const nextList: SubjectChoice[] = [
      ...choicesDraft,
      {
        priority: nextRank,
        subjectId,
        status: 'soumis',
      },
    ];
    persistChoices(nextList, `Sujet ${sub?.code || ''} ajouté en Choix ${nextRank}.`);
  };

  const handleRemoveSubjectChoice = (subjectId: string) => {
    if (!isEditableDraft) return;
    const nextList = choicesDraft.filter((c) => c.subjectId !== subjectId);
    persistChoices(nextList, 'Sujet retiré.');
  };

  const handleMoveChoice = (index: number, direction: -1 | 1) => {
    if (!isEditableDraft) return;
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= choicesDraft.length) return;
    const copy = [...choicesDraft];
    const [moved] = copy.splice(index, 1);
    copy.splice(targetIndex, 0, moved);
    persistChoices(copy);
  };

  const handleFileInputChange = (
    req: DocumentRequirement,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadErrors((prev) => ({ ...prev, [req.id]: '' }));

    const res = uploadCandidateDocument(dossier.id, req.id, {
      fileName: file.name,
      fileSizeKB: file.size / 1024,
      mimeType: file.type || 'application/octet-stream',
    });

    if (!res.ok) {
      setUploadErrors((prev) => ({ ...prev, [req.id]: res.error || 'Fichier non valide.' }));
    } else {
      setHighlightedReqId(null);
      setFeedbackBanner({
        tone: 'success',
        text: res.resubmittedCorrection
          ? `${req.code} corrigé transmis à l’administration (${file.name}).`
          : `${req.code} déposé (${file.name}).`,
      });
    }
    e.target.value = '';
  };

  const handleSimulateValidFile = (req: DocumentRequirement) => {
    const preferredExt = req.acceptedFormats[0]?.toLowerCase() || 'pdf';
    const cleanLastName = personalForm.lastName.replace(/\s+/g, '_') || 'Candidat';
    const simulatedName = `${req.code}_${cleanLastName}_2026.${preferredExt}`;
    const res = uploadCandidateDocument(dossier.id, req.id, {
      fileName: simulatedName,
      fileSizeKB: preferredExt === 'pdf' ? 840 : 320,
      mimeType: preferredExt === 'pdf' ? 'application/pdf' : 'image/jpeg',
    });
    if (res.ok) {
      setUploadErrors((prev) => ({ ...prev, [req.id]: '' }));
      setHighlightedReqId(null);
      setFeedbackBanner({
        tone: 'success',
        text: res.resubmittedCorrection
          ? `Nouvelle version de ${req.code} transmise à l’administration.`
          : `${simulatedName} ajouté.`,
      });
    }
  };

  const handleFinalSubmitPreinscription = () => {
    saveCandidateDraft(dossier.id, {
      personalInfo: personalForm,
      academicInfo: academicForm,
      subjectChoices: choicesDraft,
      motivation: motivationText,
      researchProposalSummary: proposalText,
    });

    if (!diagnostics.canSubmitPreinscription) {
      setFeedbackBanner({
        tone: 'error',
        text: 'Dossier incomplet : vérifiez les champs obligatoires, vos sujets et vos pièces.',
      });
      return;
    }

    const res = submitCandidateApplication(dossier.id);
    if (!res.ok) {
      setFeedbackBanner({ tone: 'error', text: res.error || 'Erreur lors de la soumission.' });
    } else {
      setFeedbackBanner({
        tone: 'success',
        text: 'Candidature soumise.',
      });
      setActiveTab('suivi');
    }
  };

  const lifecycleSteps = [
    { index: 0, title: 'Brouillon' },
    { index: 1, title: 'Soumis' },
    { index: 2, title: 'Présélection' },
    { index: 3, title: 'Entretien' },
    {
      index: 4,
      title:
        dossier.status === 'liste_attente'
          ? 'Liste d’attente'
          : dossier.status === 'non_retenu'
          ? 'Non retenu'
          : 'Décision',
    },
    { index: 5, title: 'Inscrit' },
  ];

  const preinscriptionRequirements = campaignConfig.documentRequirements.filter(
    (r) => r.stage === 'preinscription'
  );
  const inscriptionRequirements = campaignConfig.documentRequirements.filter(
    (r) => r.stage === 'inscription'
  );

  const hasSubjectFilters =
    subjectQuery.trim() !== '' ||
    subjectFormation !== 'Toutes' ||
    subjectDomain !== 'Tous' ||
    subjectLab !== 'Tous';

  const resetSubjectFilters = () => {
    setSubjectQuery('');
    setSubjectFormation('Toutes');
    setSubjectDomain('Tous');
    setSubjectLab('Tous');
  };

  return (
    <WorkspaceShell
      workspaceTitle="Espace Candidat"
      activeTab={activeTab}
      onSelectTab={(id) => setActiveTab(id as CandidateTab)}
      navItems={navItems}
      headerAction={
        <div className="flex items-center gap-2.5">
          <span className="hidden sm:inline text-xs font-mono text-slate-500 tabular-nums">
            {dossier.dossierNumber}
          </span>
          {isEditableDraft && (
            <button
              type="button"
              onClick={handleSaveDraft}
              className="px-3 py-1.5 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer"
            >
              <Save className="w-3.5 h-3.5 text-blue-700" />
              Enregistrer
            </button>
          )}
        </div>
      }
    >
      <div className="space-y-5">
        {/* Feedback Toast */}
        {feedbackBanner && (
          <div
            className={`px-4 py-3 rounded-xl border text-xs sm:text-sm flex items-center justify-between gap-3 ${
              feedbackBanner.tone === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                : feedbackBanner.tone === 'error'
                ? 'bg-red-50 border-red-200 text-red-950'
                : 'bg-blue-50 border-blue-200 text-blue-950'
            }`}
          >
            <div className="flex items-center gap-2">
              {feedbackBanner.tone === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-red-700 shrink-0" />
              )}
              <span>{feedbackBanner.text}</span>
            </div>
            <button
              type="button"
              onClick={() => setFeedbackBanner(null)}
              className="text-xs font-semibold underline shrink-0 cursor-pointer"
            >
              Fermer
            </button>
          </div>
        )}

        {/* Urgent Document Correction Alert with Deadlines & Remaining Time */}
        {diagnostics.docsToCorrect.length > 0 && (
          <div className="p-4 rounded-xl bg-red-50/80 border border-red-200 space-y-2.5">
            {diagnostics.docsToCorrect.map((item) => (
              <div
                key={item.requirement.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div className="flex items-start gap-2.5 text-red-950 min-w-0">
                  <AlertTriangle className="w-4 h-4 text-red-700 shrink-0 mt-0.5" />
                  <div className="space-y-0.5 min-w-0">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                      <span className="font-semibold">
                        Document à corriger — {item.requirement.code}
                      </span>
                      {item.deadline && (
                        <>
                          <span className="text-red-400">·</span>
                          <span className="font-mono tabular-nums text-red-900">
                            Avant le {formatDateFR(item.deadline)}
                          </span>
                        </>
                      )}
                      {item.deadlineInfo && (
                        <>
                          <span className="text-red-400">·</span>
                          <span className={`font-semibold font-mono tabular-nums ${item.deadlineInfo.textClass}`}>
                            {item.deadlineInfo.statusLabel}
                          </span>
                        </>
                      )}
                    </div>
                    <p className="text-red-800">{item.comment}</p>
                  </div>
                </div>
                {activeTab !== 'pieces' && (
                  <button
                    type="button"
                    onClick={() => {
                      setHighlightedReqId(item.requirement.id);
                      setActiveTab('pieces');
                    }}
                    className="px-3.5 py-1.5 text-xs font-semibold text-white bg-red-700 hover:bg-red-800 rounded-lg transition-colors whitespace-nowrap shrink-0 self-start sm:self-center cursor-pointer"
                  >
                    Corriger mon dossier
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* TAB 1: TABLEAU DE BORD ESSENTIEL */}
        {activeTab === 'suivi' && (
          <div className="space-y-5">
            {/* Essential Status & Progress Card */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h1 className="text-lg sm:text-xl font-bold text-slate-900">
                    {personalForm.firstName} {personalForm.lastName}
                  </h1>
                  <p className="text-xs text-slate-500 font-mono tabular-nums mt-0.5">
                    Dossier {dossier.dossierNumber} · Session {campaignConfig.academicYear}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <span className={`text-xs sm:text-sm font-semibold ${statusMeta.textClass}`}>
                    {statusMeta.label}
                  </span>
                  {isEditableDraft && diagnostics.canSubmitPreinscription && (
                    <button
                      type="button"
                      onClick={handleFinalSubmitPreinscription}
                      className="px-4 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors whitespace-nowrap shrink-0 inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                      Soumettre ma candidature
                    </button>
                  )}
                </div>
              </div>

              {/* Compact Progress Bar */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-600">Progression du dossier</span>
                  <span className="font-mono font-semibold text-slate-900 tabular-nums">
                    {diagnostics.completionPercent}%
                  </span>
                </div>
                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full bg-blue-700 rounded-full ${getWidthClass(
                      diagnostics.completionPercent
                    )}`}
                  />
                </div>
              </div>

              {/* Minimal Horizontal Lifecycle Strip */}
              <div className="pt-3 border-t border-slate-100 grid grid-cols-3 sm:grid-cols-6 gap-2">
                {lifecycleSteps.map((step) => {
                  const isCompleted =
                    dossier.status !== 'non_retenu' && statusMeta.stepIndex > step.index;
                  const isCurrent = statusMeta.stepIndex === step.index;
                  const isRejected = isCurrent && dossier.status === 'non_retenu';

                  return (
                    <div key={step.index} className="flex items-center gap-1.5 text-xs">
                      <span
                        className={`w-5 h-5 rounded-full flex items-center justify-center font-mono text-[11px] shrink-0 ${
                          isRejected
                            ? 'bg-red-100 text-red-700 font-bold'
                            : isCurrent
                            ? 'bg-blue-700 text-white font-bold'
                            : isCompleted
                            ? 'bg-emerald-100 text-emerald-800 font-bold'
                            : 'bg-slate-100 text-slate-400'
                        }`}
                      >
                        {isCompleted ? <Check className="w-3 h-3" /> : step.index + 1}
                      </span>
                      <span
                        className={`truncate ${
                          isCurrent
                            ? 'font-semibold text-slate-900'
                            : isCompleted
                            ? 'text-slate-700'
                            : 'text-slate-400'
                        }`}
                      >
                        {step.title}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Required Actions (Shown ONLY when incomplete draft or admitted) */}
            {isEditableDraft && !diagnostics.canSubmitPreinscription && (
              <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-200">
                <div className="px-5 py-3.5 flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-slate-900">Actions nécessaires</h2>
                  {campaignConfig.submissionDeadline && (
                    <span className="text-xs text-slate-500 tabular-nums">
                      Date limite : {formatDateFR(campaignConfig.submissionDeadline)}
                    </span>
                  )}
                </div>

                {diagnostics.personalMissing.length > 0 && (
                  <div className="px-5 py-3 flex items-center justify-between gap-4 text-xs">
                    <div className="min-w-0">
                      <span className="font-semibold text-slate-900">État civil : </span>
                      <span className="text-slate-600">
                        {diagnostics.personalMissing.join(', ')}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setFormStep(1);
                        setActiveTab('dossier');
                      }}
                      className="font-semibold text-blue-700 hover:underline shrink-0 cursor-pointer"
                    >
                      Compléter
                    </button>
                  </div>
                )}

                {(diagnostics.academicMissing.length > 0 ||
                  diagnostics.academicRuleWarnings.length > 0) && (
                  <div className="px-5 py-3 flex items-center justify-between gap-4 text-xs">
                    <div className="min-w-0">
                      <span className="font-semibold text-slate-900">Parcours académique : </span>
                      <span className="text-slate-600">
                        {[...diagnostics.academicMissing, ...diagnostics.academicRuleWarnings].join(
                          ' · '
                        )}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setFormStep(2);
                        setActiveTab('dossier');
                      }}
                      className="font-semibold text-blue-700 hover:underline shrink-0 cursor-pointer"
                    >
                      Compléter
                    </button>
                  </div>
                )}

                {diagnostics.subjectMissing && (
                  <div className="px-5 py-3 flex items-center justify-between gap-4 text-xs">
                    <div>
                      <span className="font-semibold text-slate-900">Sujets de thèse : </span>
                      <span className="text-slate-600">
                        {diagnostics.selectedSubjectsCount}/{diagnostics.requiredSubjectsCount}{' '}
                        sélectionné(s)
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveTab('sujets')}
                      className="font-semibold text-blue-700 hover:underline shrink-0 cursor-pointer"
                    >
                      Choisir
                    </button>
                  </div>
                )}

                {diagnostics.motivationMissing && (
                  <div className="px-5 py-3 flex items-center justify-between gap-4 text-xs">
                    <div>
                      <span className="font-semibold text-slate-900">Motivation : </span>
                      <span className="text-slate-600">Texte de motivation requis</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setFormStep(3);
                        setActiveTab('dossier');
                      }}
                      className="font-semibold text-blue-700 hover:underline shrink-0 cursor-pointer"
                    >
                      Rédiger
                    </button>
                  </div>
                )}

                {diagnostics.missingPreinscriptionDocs.length > 0 && (
                  <div className="px-5 py-3 flex items-center justify-between gap-4 text-xs">
                    <div className="min-w-0">
                      <span className="font-semibold text-slate-900">Pièces obligatoires : </span>
                      <span className="text-slate-600">
                        {diagnostics.missingPreinscriptionDocs.length} pièce(s) manquante(s)
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveTab('pieces')}
                      className="font-semibold text-blue-700 hover:underline shrink-0 cursor-pointer"
                    >
                      Déposer
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Admission & Final Enrollment Block */}
            {(dossier.status === 'admis' || dossier.status === 'inscrit') && (
              <div className="bg-white border border-emerald-200 rounded-xl p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold text-emerald-700">
                      {dossier.status === 'inscrit'
                        ? `Inscription validée · Matricule ${dossier.enrollmentNumber || ''}`
                        : 'Admission en liste principale'}
                    </p>
                    <h2 className="text-sm sm:text-base font-bold text-slate-900 mt-0.5">
                      {confirmedSubject
                        ? `${confirmedSubject.code} — ${confirmedSubject.title}`
                        : 'Sujet d’inscription à confirmer'}
                    </h2>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <a
                      href="/assets/gcd_docs/Charte_Theses_USMBA_2026_2027.pdf"
                      download="Charte_des_Theses_USMBA.pdf"
                      className="px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap inline-flex items-center gap-1.5"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Charte PDF
                    </a>
                    <button
                      type="button"
                      onClick={() => window.print()}
                      className="px-3 py-2 text-xs font-semibold text-slate-800 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      Imprimer
                    </button>
                    {dossier.status === 'admis' && (
                      <button
                        type="button"
                        onClick={() => setActiveTab('pieces')}
                        className="px-3.5 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
                      >
                        Finaliser l’inscription
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Chosen Subjects Summary */}
            <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-200">
              <div className="px-5 py-4 flex items-center justify-between gap-3">
                <h2 className="text-sm font-semibold text-slate-900">
                  Sujets choisis ({activeChoices.length}/{requiredChoicesCount})
                </h2>
                <button
                  type="button"
                  onClick={() => setActiveTab('sujets')}
                  className="text-xs font-semibold text-blue-700 hover:underline cursor-pointer"
                >
                  {isEditableDraft ? 'Modifier la sélection' : 'Catalogue'}
                </button>
              </div>

              {activeChoices.length === 0 ? (
                <div className="p-8 text-center space-y-3">
                  <p className="text-sm text-slate-500">Aucun sujet sélectionné.</p>
                  <button
                    type="button"
                    onClick={() => setActiveTab('sujets')}
                    className="px-4 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors cursor-pointer"
                  >
                    Choisir mes sujets
                  </button>
                </div>
              ) : (
                activeChoices.map((choice) => {
                  const suj = subjects.find((s) => s.id === choice.subjectId);
                  const choicePres = getStatusPresentation(
                    isEditableDraft ? 'brouillon' : choice.status
                  );
                  const isConfirmedChoice =
                    (dossier.confirmedSubjectId || admittedChoices[0]?.subjectId) ===
                    choice.subjectId;

                  return (
                    <div key={choice.subjectId} className="p-5 space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        <div className="space-y-1 max-w-3xl">
                          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                            <span className="font-mono font-bold text-slate-900">
                              Choix {choice.priority}
                            </span>
                            <span aria-hidden="true">·</span>
                            <span className="font-mono text-blue-700 font-semibold">
                              {suj?.code || choice.subjectId}
                            </span>
                            <span aria-hidden="true">·</span>
                            <span className={`font-semibold ${choicePres.textClass}`}>
                              {choice.status === 'liste_attente' && !isEditableDraft
                                ? `Liste d’attente (Rang ${choice.waitlistRank || 1})`
                                : choicePres.shortLabel}
                            </span>
                          </div>

                          <h3 className="text-sm sm:text-base font-semibold text-slate-900">
                            {suj?.title || 'Sujet'}
                          </h3>

                          <p className="text-xs text-slate-600">
                            {suj?.supervisor || '—'} · {suj?.laboratoire || '—'}
                          </p>
                        </div>

                        {choice.status === 'admis' &&
                          !isEditableDraft &&
                          admittedChoices.length > 1 &&
                          dossier.status !== 'inscrit' && (
                            <button
                              type="button"
                              onClick={() => confirmAdmissionSubject(dossier.id, choice.subjectId)}
                              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                                isConfirmedChoice
                                  ? 'bg-emerald-50 text-emerald-900 border border-emerald-300'
                                  : 'bg-blue-700 text-white hover:bg-blue-800'
                              }`}
                            >
                              {isConfirmedChoice ? '✓ Sujet retenu' : 'Retenir ce sujet'}
                            </button>
                          )}
                      </div>

                      {!isEditableDraft && choice.interview && (
                        <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-700">
                          <span className="flex items-center gap-1.5 font-medium text-slate-900">
                            <Calendar className="w-3.5 h-3.5 text-blue-700 shrink-0" />
                            Entretien : {formatDateFR(choice.interview.date)} à{' '}
                            {choice.interview.time}
                          </span>
                          <span className="flex items-center gap-1.5 text-slate-600">
                            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            {choice.interview.location}
                          </span>
                        </div>
                      )}

                      {!isEditableDraft &&
                        choice.evaluation &&
                        (campaignConfig.resultsPublished ||
                          choice.status === 'admis' ||
                          dossier.status === 'inscrit') && (
                          <div className="text-xs font-mono tabular-nums text-slate-600 flex flex-wrap items-center gap-x-4 gap-y-1">
                            <span>Dossier : {choice.evaluation.academicScore}/20</span>
                            <span>Entretien : {choice.evaluation.interviewScore}/20</span>
                            <span className="font-bold text-slate-900">
                              Moyenne : {choice.evaluation.weightedScore}/20
                            </span>
                          </div>
                        )}

                      {!isEditableDraft && choice.status === 'non_retenu' && choice.rejectionReason && (
                        <p className="text-xs text-red-800">{choice.rejectionReason}</p>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* TAB 2: MON DOSSIER (SIMPLIFIED FORMS, ALL FIELDS PRESERVED) */}
        {activeTab === 'dossier' && (
          <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-bold text-slate-900">Mon dossier</h2>
                {!isEditableDraft && (
                  <span className="text-xs text-slate-500">Lecture seule</span>
                )}
              </div>

              <div className="inline-flex p-1 bg-slate-100 border border-slate-200 rounded-lg self-start">
                <button
                  type="button"
                  onClick={() => setFormStep(1)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    formStep === 1 ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  État civil
                </button>
                <button
                  type="button"
                  onClick={() => setFormStep(2)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    formStep === 2 ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  Parcours
                </button>
                <button
                  type="button"
                  onClick={() => setFormStep(3)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    formStep === 3 ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  Motivation
                </button>
              </div>
            </div>

            {/* STEP 1: ÉTAT CIVIL */}
            {formStep === 1 && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Nom <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="text"
                      disabled={!isEditableDraft}
                      value={personalForm.lastName}
                      onChange={(e) =>
                        setPersonalForm({ ...personalForm, lastName: e.target.value })
                      }
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg disabled:bg-slate-50"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Prénom <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="text"
                      disabled={!isEditableDraft}
                      value={personalForm.firstName}
                      onChange={(e) =>
                        setPersonalForm({ ...personalForm, firstName: e.target.value })
                      }
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg disabled:bg-slate-50"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      الاسم العائلي (Nom arabe)
                    </label>
                    <input
                      type="text"
                      dir="rtl"
                      disabled={!isEditableDraft}
                      value={personalForm.lastNameAr || ''}
                      onChange={(e) =>
                        setPersonalForm({ ...personalForm, lastNameAr: e.target.value })
                      }
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg disabled:bg-slate-50"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      الاسم الشخصي (Prénom arabe)
                    </label>
                    <input
                      type="text"
                      dir="rtl"
                      disabled={!isEditableDraft}
                      value={personalForm.firstNameAr || ''}
                      onChange={(e) =>
                        setPersonalForm({ ...personalForm, firstNameAr: e.target.value })
                      }
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg disabled:bg-slate-50"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      CIN / Passeport <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="text"
                      disabled={!isEditableDraft}
                      value={personalForm.cin}
                      onChange={(e) =>
                        setPersonalForm({ ...personalForm, cin: e.target.value.toUpperCase() })
                      }
                      className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-lg disabled:bg-slate-50"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Code CNE / Massar <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="text"
                      disabled={!isEditableDraft}
                      value={personalForm.cne}
                      onChange={(e) =>
                        setPersonalForm({ ...personalForm, cne: e.target.value.toUpperCase() })
                      }
                      className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-lg disabled:bg-slate-50"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Date de naissance <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="date"
                      disabled={!isEditableDraft}
                      value={personalForm.birthDate}
                      onChange={(e) =>
                        setPersonalForm({ ...personalForm, birthDate: e.target.value })
                      }
                      className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-lg disabled:bg-slate-50"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Lieu de naissance <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="text"
                      disabled={!isEditableDraft}
                      value={personalForm.birthPlace}
                      onChange={(e) =>
                        setPersonalForm({ ...personalForm, birthPlace: e.target.value })
                      }
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg disabled:bg-slate-50"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Nationalité
                    </label>
                    <input
                      type="text"
                      disabled={!isEditableDraft}
                      value={personalForm.nationality}
                      onChange={(e) =>
                        setPersonalForm({ ...personalForm, nationality: e.target.value })
                      }
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg disabled:bg-slate-50"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      E-mail <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="email"
                      disabled={!isEditableDraft}
                      value={personalForm.email}
                      onChange={(e) =>
                        setPersonalForm({ ...personalForm, email: e.target.value })
                      }
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg disabled:bg-slate-50"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Téléphone <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="tel"
                      disabled={!isEditableDraft}
                      value={personalForm.phone}
                      onChange={(e) =>
                        setPersonalForm({ ...personalForm, phone: e.target.value })
                      }
                      className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-lg disabled:bg-slate-50"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Situation professionnelle <span className="text-red-600">*</span>
                    </label>
                    <select
                      disabled={!isEditableDraft}
                      value={personalForm.employmentStatus}
                      onChange={(e) =>
                        setPersonalForm({
                          ...personalForm,
                          employmentStatus: e.target.value as PersonalInfo['employmentStatus'],
                        })
                      }
                      className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg disabled:bg-slate-50"
                    >
                      <option value="etudiant">Étudiant(e)</option>
                      <option value="salarie">Salarié(e)</option>
                      <option value="fonctionnaire">Fonctionnaire</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Ville
                    </label>
                    <input
                      type="text"
                      disabled={!isEditableDraft}
                      value={personalForm.city}
                      onChange={(e) =>
                        setPersonalForm({ ...personalForm, city: e.target.value })
                      }
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg disabled:bg-slate-50"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Adresse <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="text"
                      disabled={!isEditableDraft}
                      value={personalForm.address}
                      onChange={(e) =>
                        setPersonalForm({ ...personalForm, address: e.target.value })
                      }
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg disabled:bg-slate-50"
                    />
                  </div>
                </div>

                {personalForm.employmentStatus !== 'etudiant' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Organisme employeur <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="text"
                      disabled={!isEditableDraft}
                      value={personalForm.employerName || ''}
                      onChange={(e) =>
                        setPersonalForm({ ...personalForm, employerName: e.target.value })
                      }
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg disabled:bg-slate-50"
                    />
                  </div>
                )}
              </div>
            )}

            {/* STEP 2: PARCOURS ACADÉMIQUE */}
            {formStep === 2 && (
              <div className="space-y-6">
                {diagnostics.academicRuleWarnings.length > 0 && (
                  <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-900 space-y-1">
                    {diagnostics.academicRuleWarnings.map((w, idx) => (
                      <p key={idx} className="font-medium">
                        {w}
                      </p>
                    ))}
                  </div>
                )}

                {/* Baccalauréat */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Baccalauréat
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Série <span className="text-red-600">*</span>
                      </label>
                      <input
                        type="text"
                        disabled={!isEditableDraft}
                        value={academicForm.bacSeries}
                        onChange={(e) =>
                          setAcademicForm({ ...academicForm, bacSeries: e.target.value })
                        }
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg disabled:bg-slate-50"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Année <span className="text-red-600">*</span>
                      </label>
                      <input
                        type="text"
                        disabled={!isEditableDraft}
                        value={academicForm.bacYear}
                        onChange={(e) =>
                          setAcademicForm({ ...academicForm, bacYear: e.target.value })
                        }
                        className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-lg disabled:bg-slate-50"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Moyenne /20 <span className="text-red-600">*</span>
                      </label>
                      <input
                        type="text"
                        disabled={!isEditableDraft}
                        value={academicForm.bacAverage}
                        onChange={(e) =>
                          setAcademicForm({ ...academicForm, bacAverage: e.target.value })
                        }
                        className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-lg disabled:bg-slate-50"
                      />
                    </div>
                  </div>
                </div>

                {/* Licence */}
                <div className="space-y-3 pt-4 border-t border-slate-200">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Licence / Bac+3
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Filière <span className="text-red-600">*</span>
                      </label>
                      <input
                        type="text"
                        disabled={!isEditableDraft}
                        value={academicForm.licenceTitle}
                        onChange={(e) =>
                          setAcademicForm({ ...academicForm, licenceTitle: e.target.value })
                        }
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg disabled:bg-slate-50"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Établissement <span className="text-red-600">*</span>
                      </label>
                      <input
                        type="text"
                        disabled={!isEditableDraft}
                        value={academicForm.licenceInstitution}
                        onChange={(e) =>
                          setAcademicForm({
                            ...academicForm,
                            licenceInstitution: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg disabled:bg-slate-50"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Moyenne /20 <span className="text-red-600">*</span>
                      </label>
                      <input
                        type="text"
                        disabled={!isEditableDraft}
                        value={academicForm.licenceAverage}
                        onChange={(e) =>
                          setAcademicForm({ ...academicForm, licenceAverage: e.target.value })
                        }
                        className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-lg disabled:bg-slate-50"
                      />
                    </div>
                  </div>
                </div>

                {/* Master / Ingénieur */}
                <div className="space-y-3 pt-4 border-t border-slate-200">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Master / Ingénieur / Bac+5
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Diplôme <span className="text-red-600">*</span>
                      </label>
                      <select
                        disabled={!isEditableDraft}
                        value={academicForm.masterType}
                        onChange={(e) =>
                          setAcademicForm({
                            ...academicForm,
                            masterType: e.target.value as AcademicInfo['masterType'],
                          })
                        }
                        className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg disabled:bg-slate-50"
                      >
                        <option value="Master Recherche">Master Recherche</option>
                        <option value="Master Spécialisé">Master Spécialisé</option>
                        <option value="Diplôme d'Ingénieur">Diplôme d’Ingénieur</option>
                        <option value="Médecine / Pharmacie">Médecine / Pharmacie</option>
                        <option value="Équivalence Étrangère">Équivalence Étrangère</option>
                      </select>
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Intitulé <span className="text-red-600">*</span>
                      </label>
                      <input
                        type="text"
                        disabled={!isEditableDraft}
                        value={academicForm.masterTitle}
                        onChange={(e) =>
                          setAcademicForm({ ...academicForm, masterTitle: e.target.value })
                        }
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg disabled:bg-slate-50"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Établissement <span className="text-red-600">*</span>
                      </label>
                      <input
                        type="text"
                        disabled={!isEditableDraft}
                        value={academicForm.masterInstitution}
                        onChange={(e) =>
                          setAcademicForm({
                            ...academicForm,
                            masterInstitution: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg disabled:bg-slate-50"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Année <span className="text-red-600">*</span>
                      </label>
                      <input
                        type="text"
                        disabled={!isEditableDraft}
                        value={academicForm.masterYear}
                        onChange={(e) =>
                          setAcademicForm({ ...academicForm, masterYear: e.target.value })
                        }
                        className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-lg disabled:bg-slate-50"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Moyenne /20 <span className="text-slate-400 font-normal">(min. {campaignConfig.minMasterAverage})</span>{' '}
                        <span className="text-red-600">*</span>
                      </label>
                      <input
                        type="text"
                        disabled={!isEditableDraft}
                        value={academicForm.masterAverage}
                        onChange={(e) =>
                          setAcademicForm({ ...academicForm, masterAverage: e.target.value })
                        }
                        className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-lg disabled:bg-slate-50"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Sujet du mémoire / PFE <span className="text-red-600">*</span>
                      </label>
                      <input
                        type="text"
                        disabled={!isEditableDraft}
                        value={academicForm.pfeTitle}
                        onChange={(e) =>
                          setAcademicForm({ ...academicForm, pfeTitle: e.target.value })
                        }
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg disabled:bg-slate-50"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Langues
                      </label>
                      <input
                        type="text"
                        disabled={!isEditableDraft}
                        value={academicForm.languages}
                        onChange={(e) =>
                          setAcademicForm({ ...academicForm, languages: e.target.value })
                        }
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg disabled:bg-slate-50"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 3: MOTIVATION */}
            {formStep === 3 && (
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-700">
                      Motivation scientifique <span className="text-red-600">*</span>
                    </label>
                    <span className="text-xs font-mono text-slate-400 tabular-nums">
                      {motivationText.trim().length} car. (min. 30)
                    </span>
                  </div>
                  <textarea
                    rows={5}
                    disabled={!isEditableDraft}
                    value={motivationText}
                    onChange={(e) => setMotivationText(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg disabled:bg-slate-50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Pistes méthodologiques (facultatif)
                  </label>
                  <textarea
                    rows={3}
                    disabled={!isEditableDraft}
                    value={proposalText}
                    onChange={(e) => setProposalText(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg disabled:bg-slate-50"
                  />
                </div>
              </div>
            )}

            {/* Form Navigation Footer */}
            <div className="pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                {formStep > 1 && (
                  <button
                    type="button"
                    onClick={() => setFormStep((s) => (s === 3 ? 2 : 1))}
                    className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                  >
                    Précédent
                  </button>
                )}
                {formStep < 3 ? (
                  <button
                    type="button"
                    onClick={() => setFormStep((s) => (s === 1 ? 2 : 3))}
                    className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                  >
                    Suivant
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      if (isEditableDraft) handleSaveDraft();
                      setActiveTab(diagnostics.subjectMissing ? 'sujets' : 'pieces');
                    }}
                    className="px-4 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors cursor-pointer"
                  >
                    {diagnostics.subjectMissing ? 'Choisir mes sujets' : 'Pièces jointes'}
                  </button>
                )}
              </div>

              {isEditableDraft && (
                <button
                  type="button"
                  onClick={handleSaveDraft}
                  className="px-3.5 py-2 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  Enregistrer
                </button>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: CHOIX DES SUJETS */}
        {activeTab === 'sujets' && (
          <div className="space-y-5">
            {/* Priority Selection Slots */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-base font-bold text-slate-900">
                  Sujets sélectionnés par priorité
                </h2>
                <span className="text-xs font-mono font-semibold text-blue-700 tabular-nums">
                  {activeChoices.length} / {requiredChoicesCount}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {Array.from({ length: requiredChoicesCount }).map((_, slotIdx) => {
                  const choice = activeChoices[slotIdx];
                  const suj = choice ? subjects.find((s) => s.id === choice.subjectId) : undefined;

                  if (!choice || !suj) {
                    return (
                      <div
                        key={`empty-slot-${slotIdx}`}
                        className="p-3.5 rounded-lg border border-dashed border-slate-300 bg-slate-50/60 flex items-center justify-between text-xs text-slate-500"
                      >
                        <span className="font-mono font-semibold text-slate-700">
                          Choix {slotIdx + 1}
                        </span>
                        <span>Non sélectionné</span>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={choice.subjectId}
                      className="p-3.5 rounded-lg border border-blue-200 bg-blue-50/30 flex flex-col justify-between space-y-2.5"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center justify-between gap-2 text-xs font-mono">
                          <span className="font-bold text-blue-800">Choix {choice.priority}</span>
                          <span className="text-slate-500">{suj.code}</span>
                        </div>
                        <h3 className="text-xs font-semibold text-slate-900 line-clamp-2">
                          {suj.title}
                        </h3>
                        <p className="text-[11px] text-slate-600 truncate">
                          {suj.supervisor} · {suj.laboratoire}
                        </p>
                      </div>

                      {isEditableDraft && (
                        <div className="pt-2 border-t border-blue-200/60 flex items-center justify-between">
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              disabled={slotIdx === 0}
                              onClick={() => handleMoveChoice(slotIdx, -1)}
                              aria-label="Monter"
                              className="p-1 text-slate-700 bg-white hover:bg-slate-100 disabled:opacity-40 border border-slate-200 rounded cursor-pointer"
                            >
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              disabled={slotIdx === activeChoices.length - 1}
                              onClick={() => handleMoveChoice(slotIdx, 1)}
                              aria-label="Descendre"
                              className="p-1 text-slate-700 bg-white hover:bg-slate-100 disabled:opacity-40 border border-slate-200 rounded cursor-pointer"
                            >
                              <ArrowDown className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleRemoveSubjectChoice(choice.subjectId)}
                            className="text-xs font-semibold text-red-700 hover:underline flex items-center gap-1 cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" />
                            Retirer
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Catalogue */}
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-base font-bold text-slate-900">
                  Catalogue des sujets ({filteredSubjects.length})
                </h3>
                {hasSubjectFilters && (
                  <button
                    type="button"
                    onClick={resetSubjectFilters}
                    className="text-xs font-medium text-blue-700 hover:underline inline-flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Réinitialiser
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 p-3 bg-white border border-slate-200 rounded-xl">
                <div className="sm:col-span-2 lg:col-span-5 relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={subjectQuery}
                    onChange={(e) => setSubjectQuery(e.target.value)}
                    placeholder="Titre, code, encadrant, laboratoire..."
                    className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
                <div className="lg:col-span-3">
                  <select
                    value={subjectFormation}
                    onChange={(e) => setSubjectFormation(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg"
                  >
                    {formations.map((f) => (
                      <option key={f} value={f}>
                        {f === 'Toutes' ? 'Toutes les formations' : f}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="lg:col-span-2">
                  <select
                    value={subjectLab}
                    onChange={(e) => setSubjectLab(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg"
                  >
                    {labs.map((l) => (
                      <option key={l} value={l}>
                        {l === 'Tous' ? 'Tous les laboratoires' : l}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="lg:col-span-2">
                  <select
                    value={subjectDomain}
                    onChange={(e) => setSubjectDomain(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg"
                  >
                    {domains.map((d) => (
                      <option key={d} value={d}>
                        {d === 'Tous' ? 'Tous les domaines' : d}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="bg-white divide-y divide-slate-200 border border-slate-200 rounded-xl">
                {filteredSubjects.length === 0 ? (
                  <div className="p-8 text-center text-sm text-slate-500">Aucun sujet trouvé.</div>
                ) : (
                  filteredSubjects.map((suj) => {
                    const existingChoice = activeChoices.find((c) => c.subjectId === suj.id);
                    const isQuotaReached =
                      activeChoices.length >= requiredChoicesCount && !existingChoice;
                    const isExpanded = expandedSubjectId === suj.id;

                    return (
                      <div
                        key={suj.id}
                        className={`p-5 transition-colors ${
                          existingChoice ? 'bg-blue-50/30' : 'bg-white'
                        }`}
                      >
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                          <div className="space-y-1.5 max-w-3xl">
                            <h4 className="text-sm sm:text-base font-semibold text-slate-900 leading-snug">
                              <button
                                type="button"
                                onClick={() => setExpandedSubjectId(isExpanded ? null : suj.id)}
                                className="text-left hover:text-blue-800 transition-colors cursor-pointer"
                              >
                                {suj.title}
                              </button>
                            </h4>

                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-600">
                              <span className="font-semibold text-slate-900">{suj.supervisor}</span>
                              <span aria-hidden="true">·</span>
                              <span>{suj.laboratoire}</span>
                              <span aria-hidden="true">·</span>
                              <span className="font-mono font-semibold text-blue-700 tabular-nums">
                                {suj.places} {suj.places > 1 ? 'places disponibles' : 'place disponible'}
                              </span>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => setExpandedSubjectId(isExpanded ? null : suj.id)}
                              className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap inline-flex items-center gap-1 cursor-pointer"
                            >
                              <span>{isExpanded ? 'Masquer les détails' : 'Voir les détails'}</span>
                              <ChevronDown
                                className={`w-3.5 h-3.5 transition-transform duration-150 ${
                                  isExpanded ? 'rotate-180' : ''
                                }`}
                              />
                            </button>

                            {existingChoice ? (
                              <div className="flex items-center gap-2">
                                <span className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg whitespace-nowrap">
                                  <Check className="w-3.5 h-3.5" />
                                  Choix {existingChoice.priority}
                                </span>
                                {isEditableDraft && (
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveSubjectChoice(suj.id)}
                                    className="px-2 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 rounded-lg cursor-pointer"
                                  >
                                    Retirer
                                  </button>
                                )}
                              </div>
                            ) : isEditableDraft && suj.open ? (
                              <button
                                type="button"
                                disabled={isQuotaReached}
                                onClick={() => handleAddSubjectChoice(suj.id)}
                                className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                                  isQuotaReached
                                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                    : 'text-white bg-blue-700 hover:bg-blue-800 cursor-pointer'
                                }`}
                              >
                                {isQuotaReached ? (
                                  `${requiredChoicesCount}/${requiredChoicesCount}`
                                ) : (
                                  <>
                                    <Plus className="w-3.5 h-3.5" />
                                    Choisir
                                  </>
                                )}
                              </button>
                            ) : (
                              <span className="text-xs text-slate-400">
                                {!suj.open ? 'Clôturé' : 'Verrouillé'}
                              </span>
                            )}
                          </div>
                        </div>

                        {isExpanded && (
                          <div className="pt-3.5 mt-3.5 border-t border-slate-100 grid grid-cols-1 lg:grid-cols-12 gap-4 text-xs">
                            <div className="lg:col-span-7 space-y-1.5">
                              <p className="font-mono text-slate-500">
                                {suj.code} · {suj.etablissement}
                              </p>
                              <p className="text-slate-700 leading-relaxed">{suj.description}</p>
                            </div>
                            <div className="lg:col-span-5 lg:border-l lg:border-slate-100 lg:pl-4 space-y-1.5">
                              <p className="text-slate-600">
                                <strong className="text-slate-900">Formation :</strong>{' '}
                                {suj.formationDoctorale}
                              </p>
                              <p className="text-slate-600">
                                <strong className="text-slate-900">Prérequis :</strong>{' '}
                                {suj.prerequisites}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: PIÈCES JOINTES */}
        {activeTab === 'pieces' && (
          <div className="space-y-5">
            {/* Preinscription Documents */}
            <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-200">
              <div className="px-5 py-4 flex items-center justify-between gap-2">
                <h2 className="text-base font-bold text-slate-900">Pièces de candidature</h2>
                <span className="text-xs text-slate-500 font-mono tabular-nums">
                  {preinscriptionRequirements.length - diagnostics.missingPreinscriptionDocs.length}/
                  {preinscriptionRequirements.filter((r) => r.required).length} obligatoires
                </span>
              </div>

              {preinscriptionRequirements.map((req) => {
                const uploaded = dossier.documents.find((d) => d.requirementId === req.id);
                const activeCorr = getActiveCorrectionRequest(dossier, req.id);
                const resubmittedCorr = (dossier.correctionRequests || []).find(
                  (c) => c.requirementId === req.id && c.status === 'resubmitted'
                );
                const status = activeCorr
                  ? 'a_corriger'
                  : uploaded
                  ? uploaded.status
                  : 'manquante';
                const docPres = getDocStatusPresentation(status);
                const corrDeadline = activeCorr?.deadline || uploaded?.correctionDeadline;
                const corrDeadlineInfo = computeDeadlineInfo(corrDeadline);
                const corrReason = activeCorr?.reason || uploaded?.reviewComment;
                const isHighlighted = highlightedReqId === req.id;

                const canUploadThis =
                  isEditableDraft ||
                  status === 'a_corriger' ||
                  (status === 'manquante' &&
                    dossier.status !== 'non_retenu' &&
                    dossier.status !== 'inscrit');

                return (
                  <div
                    key={req.id}
                    className={`p-4 sm:p-5 space-y-2 transition-colors ${
                      isHighlighted
                        ? 'bg-red-50/50'
                        : status === 'a_corriger'
                        ? 'bg-red-50/20'
                        : 'bg-white'
                    }`}
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                      <div className="space-y-1 max-w-2xl">
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <h3 className="text-sm font-semibold text-slate-900">
                            {req.label}
                            {req.required && <span className="text-red-600 ml-0.5">*</span>}
                          </h3>
                        </div>

                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
                          <span className={`font-semibold ${docPres.textClass}`}>
                            {docPres.label}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono">
                            {req.acceptedFormats.join(', ')} (max. {req.maxSizeMB} Mo)
                          </span>
                          {uploaded && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="font-mono text-slate-700 inline-flex items-center gap-1">
                                <FileText className="w-3 h-3 text-blue-700" />
                                {uploaded.fileName} ({formatFileSize(uploaded.fileSizeKB)})
                              </span>
                            </>
                          )}
                          {resubmittedCorr && status === 'deposee' && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="text-blue-700 font-medium">
                                Version corrigée transmise
                              </span>
                            </>
                          )}
                        </div>

                        {(status === 'manquante' || status === 'a_corriger') && (
                          <p className="text-xs text-slate-500">{req.instructions}</p>
                        )}
                      </div>

                      {canUploadThis && (
                        <div className="flex flex-wrap items-center gap-2 shrink-0">
                          <label
                            className={`cursor-pointer px-3.5 py-1.5 text-xs font-semibold text-white rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                              status === 'a_corriger'
                                ? 'bg-red-700 hover:bg-red-800'
                                : 'bg-blue-700 hover:bg-blue-800'
                            }`}
                          >
                            <FileUp className="w-3.5 h-3.5" />
                            {status === 'a_corriger'
                              ? 'Déposer la version corrigée'
                              : uploaded
                              ? 'Remplacer'
                              : 'Téléverser'}
                            <input
                              type="file"
                              className="hidden"
                              accept={req.acceptedFormats.map((f) => `.${f.toLowerCase()}`).join(',')}
                              onChange={(e) => handleFileInputChange(req, e)}
                            />
                          </label>

                          <button
                            type="button"
                            onClick={() => handleSimulateValidFile(req)}
                            className="px-2.5 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
                          >
                            Scan démo
                          </button>
                        </div>
                      )}
                    </div>

                    {status === 'a_corriger' && (corrReason || corrDeadline) && (
                      <div className="pt-1 flex flex-wrap items-baseline gap-x-2 gap-y-1 text-xs">
                        {corrReason && (
                          <span className="text-red-700 font-medium">Motif : {corrReason}</span>
                        )}
                        {corrDeadline && (
                          <>
                            <span className="text-slate-400">·</span>
                            <span className="font-mono tabular-nums text-slate-700">
                              Date limite : {formatDateFR(corrDeadline)}
                            </span>
                          </>
                        )}
                        {corrDeadlineInfo && (
                          <>
                            <span className="text-slate-400">·</span>
                            <span
                              className={`font-mono font-semibold tabular-nums ${corrDeadlineInfo.textClass}`}
                            >
                              {corrDeadlineInfo.statusLabel}
                            </span>
                          </>
                        )}
                      </div>
                    )}

                    {uploadErrors[req.id] && (
                      <p className="text-xs text-red-700 font-medium">{uploadErrors[req.id]}</p>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Final Enrollment Documents (only when relevant or configured) */}
            {inscriptionRequirements.length > 0 && (
              <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-200">
                <div className="px-5 py-4 flex items-center justify-between gap-2">
                  <h2 className="text-base font-bold text-slate-900">
                    Inscription définitive (Candidats admis)
                  </h2>
                  {campaignConfig.enrollmentDeadline && (
                    <span className="text-xs text-slate-500 tabular-nums">
                      Date limite : {formatDateFR(campaignConfig.enrollmentDeadline)}
                    </span>
                  )}
                </div>

                {inscriptionRequirements.map((req) => {
                  const uploaded = dossier.documents.find((d) => d.requirementId === req.id);
                  const activeCorr = getActiveCorrectionRequest(dossier, req.id);
                  const status = activeCorr
                    ? 'a_corriger'
                    : uploaded
                    ? uploaded.status
                    : 'manquante';
                  const docPres = getDocStatusPresentation(status);
                  const corrDeadline = activeCorr?.deadline || uploaded?.correctionDeadline;
                  const corrDeadlineInfo = computeDeadlineInfo(corrDeadline);
                  const corrReason = activeCorr?.reason || uploaded?.reviewComment;
                  const unlocked = dossier.status === 'admis' || status === 'a_corriger';

                  return (
                    <div key={req.id} className="p-4 sm:p-5 space-y-2">
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                        <div className="space-y-1 max-w-2xl">
                          <h3 className="text-sm font-semibold text-slate-900">{req.label}</h3>
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
                            <span className={`font-semibold ${docPres.textClass}`}>
                              {docPres.label}
                            </span>
                            <span aria-hidden="true">·</span>
                            <span className="font-mono">
                              {req.acceptedFormats.join(', ')} (max. {req.maxSizeMB} Mo)
                            </span>
                            {uploaded && (
                              <>
                                <span aria-hidden="true">·</span>
                                <span className="font-mono text-slate-700">
                                  {uploaded.fileName} ({formatFileSize(uploaded.fileSizeKB)})
                                </span>
                              </>
                            )}
                          </div>
                          {unlocked && (status === 'manquante' || status === 'a_corriger') && (
                            <p className="text-xs text-slate-500">{req.instructions}</p>
                          )}
                        </div>

                        {unlocked ? (
                          <div className="flex flex-wrap items-center gap-2 shrink-0">
                            <label
                              className={`cursor-pointer px-3.5 py-1.5 text-xs font-semibold text-white rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                                status === 'a_corriger'
                                  ? 'bg-red-700 hover:bg-red-800'
                                  : 'bg-emerald-700 hover:bg-emerald-800'
                              }`}
                            >
                              <FileUp className="w-3.5 h-3.5" />
                              {status === 'a_corriger'
                                ? 'Déposer la version corrigée'
                                : uploaded
                                ? 'Remplacer'
                                : 'Téléverser'}
                              <input
                                type="file"
                                className="hidden"
                                accept={req.acceptedFormats
                                  .map((f) => `.${f.toLowerCase()}`)
                                  .join(',')}
                                onChange={(e) => handleFileInputChange(req, e)}
                              />
                            </label>
                            <button
                              type="button"
                              onClick={() => handleSimulateValidFile(req)}
                              className="px-2.5 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                            >
                              Scan démo
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">
                            {dossier.status === 'inscrit' ? 'Validé' : 'Après admission'}
                          </span>
                        )}
                      </div>

                      {status === 'a_corriger' && (corrReason || corrDeadline) && (
                        <div className="pt-1 flex flex-wrap items-baseline gap-x-2 gap-y-1 text-xs">
                          {corrReason && (
                            <span className="text-red-700 font-medium">Motif : {corrReason}</span>
                          )}
                          {corrDeadline && (
                            <>
                              <span className="text-slate-400">·</span>
                              <span className="font-mono tabular-nums text-slate-700">
                                Date limite : {formatDateFR(corrDeadline)}
                              </span>
                            </>
                          )}
                          {corrDeadlineInfo && (
                            <>
                              <span className="text-slate-400">·</span>
                              <span
                                className={`font-mono font-semibold tabular-nums ${corrDeadlineInfo.textClass}`}
                              >
                                {corrDeadlineInfo.statusLabel}
                              </span>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Submit Actions */}
            {isEditableDraft && (
              <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="text-xs text-slate-600">
                  {diagnostics.canSubmitPreinscription ? (
                    <span className="font-semibold text-emerald-700">
                      Dossier complet et prêt à être soumis.
                    </span>
                  ) : (
                    <span>
                      Complétez les éléments requis avant de soumettre votre candidature.
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2.5 shrink-0">
                  <button
                    type="button"
                    onClick={handleSaveDraft}
                    className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                  >
                    Enregistrer
                  </button>
                  <button
                    type="button"
                    onClick={handleFinalSubmitPreinscription}
                    className="px-4 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    Soumettre ma candidature
                  </button>
                </div>
              </div>
            )}

            {dossier.status === 'admis' && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <span className="text-xs font-semibold text-emerald-950">
                  Transmettre le dossier d’inscription définitive à l’administration
                </span>
                <button
                  type="button"
                  disabled={!diagnostics.canSubmitEnrollment}
                  onClick={() => {
                    submitFinalEnrollment(dossier.id);
                    setFeedbackBanner({
                      tone: 'success',
                      text: 'Dossier d’inscription définitive transmis.',
                    });
                  }}
                  className="px-4 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer"
                >
                  <FileCheck className="w-4 h-4" />
                  Confirmer l’inscription
                </button>
              </div>
            )}
          </div>
        )}

        {/* TAB 5: CENTRE DE NOTIFICATIONS */}
        {activeTab === 'notifications' && (
          <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-200">
            <div className="px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <Bell className="w-4 h-4 text-blue-700 shrink-0" />
                <h2 className="text-base font-bold text-slate-900">Notifications</h2>
                <span className="text-xs font-mono text-slate-500 tabular-nums">
                  ({unreadNotifCount} non lue{unreadNotifCount > 1 ? 's' : ''})
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="inline-flex p-0.5 bg-slate-100 border border-slate-200 rounded-lg text-xs">
                  {(
                    [
                      { id: 'all', label: 'Toutes' },
                      { id: 'unread', label: 'Non lues' },
                      { id: 'action', label: 'Action requise' },
                    ] as const
                  ).map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setNotifFilter(f.id)}
                      className={`px-2.5 py-1 font-semibold rounded-md transition-colors cursor-pointer ${
                        notifFilter === f.id
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>

                {unreadNotifCount > 0 && (
                  <button
                    type="button"
                    onClick={() => markAllNotificationsRead(currentUser.id)}
                    className="text-xs font-semibold text-blue-700 hover:underline cursor-pointer"
                  >
                    Tout marquer comme lu
                  </button>
                )}
              </div>
            </div>

            {(() => {
              const displayed = userNotifications.filter((n) => {
                if (notifFilter === 'unread') return !n.read;
                if (notifFilter === 'action') return Boolean(n.actionRequired || n.urgent);
                return true;
              });

              if (displayed.length === 0) {
                return (
                  <div className="p-8 text-center text-sm text-slate-500">
                    Aucune notification dans cette vue.
                  </div>
                );
              }

              return displayed.map((notif) => {
                const dl = computeDeadlineInfo(notif.deadline);
                const actionLabel =
                  notif.actionLabel ||
                  (notif.category === 'correction'
                    ? 'Corriger'
                    : notif.category === 'resultat'
                    ? 'Consulter le résultat'
                    : 'Voir');
                const isCorrectionOrExpired =
                  actionLabel === 'Corriger' || Boolean(dl?.isExpired);

                return (
                  <div
                    key={notif.id}
                    className={`p-4 sm:p-5 flex flex-col sm:flex-row sm:items-start justify-between gap-4 ${
                      !notif.read && isCorrectionOrExpired
                        ? 'bg-red-50/30'
                        : !notif.read
                        ? 'bg-blue-50/30'
                        : 'bg-white'
                    }`}
                  >
                    <div className="space-y-1 max-w-3xl min-w-0">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
                        <span className="font-mono tabular-nums">
                          {formatDateFR(notif.createdAt, true)}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span
                          className={
                            !notif.read
                              ? 'font-semibold text-blue-700'
                              : 'text-slate-400'
                          }
                        >
                          {!notif.read ? 'Non lu' : 'Lu'}
                        </span>
                        {notif.deadline && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="font-mono tabular-nums text-slate-700">
                              Date limite : {formatDateFR(notif.deadline)}
                            </span>
                          </>
                        )}
                        {dl && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className={`font-mono font-semibold tabular-nums ${dl.textClass}`}>
                              {dl.shortCountdown}
                            </span>
                          </>
                        )}
                      </div>

                      <h3 className="text-sm font-semibold text-slate-900">{notif.title}</h3>
                      <p className="text-xs sm:text-sm text-slate-600">{notif.message}</p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
                      {notif.actionTab && (
                        <button
                          type="button"
                          onClick={() => openNotificationTarget(notif)}
                          className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                            actionLabel === 'Corriger'
                              ? 'bg-red-700 text-white hover:bg-red-800'
                              : actionLabel === 'Consulter le résultat'
                              ? 'bg-blue-700 text-white hover:bg-blue-800'
                              : 'bg-blue-50 text-blue-800 hover:bg-blue-100'
                          }`}
                        >
                          {actionLabel}
                        </button>
                      )}
                      {!notif.read && (
                        <button
                          type="button"
                          onClick={() => markNotificationRead(notif.id)}
                          className="px-2 py-1.5 text-xs text-slate-500 hover:text-slate-900 whitespace-nowrap cursor-pointer"
                        >
                          Marquer comme lu
                        </button>
                      )}
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        )}

        {/* TAB 6: AIDE & SUPPORT */}
        {activeTab === 'aide' && <HelpCenter compactHeader />}
      </div>
    </WorkspaceShell>
  );
};
