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
  Clock,
  Download,
  FileCheck,
  FileText,
  FileUp,
  FolderOpen,
  HelpCircle,
  Info,
  MapPin,
  Plus,
  Printer,
  Save,
  Search,
  Send,
  Trash2,
  User,
} from 'lucide-react';
import { useGCD } from '../context/GCDContext';
import { AcademicInfo, DocumentRequirement, PersonalInfo, SubjectChoice } from '../types/gcd';
import {
  computeDossierDiagnostics,
  formatDateFR,
  formatFileSize,
  getDocStatusPresentation,
  getStatusPresentation,
} from '../utils/formatters';
import { HelpCenter } from './HelpCenter';
import { UsmbaLogo } from './UsmbaLogo';
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

  // Local editable form state synced with current dossier
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

  // Subject search in candidate tab
  const [subjectQuery, setSubjectQuery] = useState('');
  const [subjectFormation, setSubjectFormation] = useState('Toutes');
  const [subjectDomain, setSubjectDomain] = useState('Tous');
  const [subjectLab, setSubjectLab] = useState('Tous');

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

  // Keep choicesDraft synced if updated externally while viewing
  useEffect(() => {
    if (dossier) {
      setChoicesDraft(dossier.subjectChoices);
    }
  }, [dossier?.subjectChoices]);

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

  const userNotifications = useMemo(() => {
    if (!currentUser) return [];
    return notifications
      .filter((n) => n.recipientAccountId === currentUser.id)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [notifications, currentUser]);

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
      label: 'Suivi & Progression',
      icon: <Clock className="w-4 h-4" />,
    },
    {
      id: 'dossier',
      label: 'Informations & Parcours',
      icon: <User className="w-4 h-4" />,
    },
    {
      id: 'sujets',
      label: `Mes ${requiredChoicesCount} sujets`,
      icon: <BookOpen className="w-4 h-4" />,
      badgeCount: isEditableDraft ? diagnostics.subjectsMissingCount : undefined,
      badgeTone: 'neutral',
    },
    {
      id: 'pieces',
      label: 'Pièces justificatives',
      icon: <FolderOpen className="w-4 h-4" />,
      badgeCount: actionDocsCount,
      badgeTone: diagnostics.docsToCorrect.length > 0 ? 'alert' : 'neutral',
    },
    {
      id: 'notifications',
      label: 'Notifications',
      icon: <Bell className="w-4 h-4" />,
      badgeCount: unreadNotifCount,
      badgeTone: 'neutral',
    },
    {
      id: 'aide',
      label: 'Aide, FAQ & Support',
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
      text: `Brouillon enregistré avec succès à ${new Date().toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit',
      })}. Vos ${choicesDraft.length}/${requiredChoicesCount} choix de sujets et vos informations sont sauvegardés.`,
    });
  };

  const handleAddSubjectChoice = (subjectId: string) => {
    if (!isEditableDraft) return;
    if (choicesDraft.some((c) => c.subjectId === subjectId)) return;
    if (choicesDraft.length >= requiredChoicesCount) {
      setFeedbackBanner({
        tone: 'error',
        text: `Vous avez déjà sélectionné le maximum autorisé (${requiredChoicesCount} sujets). Retirez un sujet si vous souhaitez le remplacer.`,
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
    persistChoices(
      nextList,
      `Sujet « ${sub?.code || ''} » ajouté en Choix n°${nextRank} (${nextList.length}/${requiredChoicesCount} sélectionnés).`
    );
  };

  const handleRemoveSubjectChoice = (subjectId: string) => {
    if (!isEditableDraft) return;
    const nextList = choicesDraft.filter((c) => c.subjectId !== subjectId);
    persistChoices(nextList, 'Sujet retiré de votre sélection. L’ordre de priorité a été réajusté.');
  };

  const handleMoveChoice = (index: number, direction: -1 | 1) => {
    if (!isEditableDraft) return;
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= choicesDraft.length) return;
    const copy = [...choicesDraft];
    const [moved] = copy.splice(index, 1);
    copy.splice(targetIndex, 0, moved);
    persistChoices(copy, 'Ordre de priorité de vos sujets mis à jour.');
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
      setFeedbackBanner({
        tone: 'success',
        text: `Pièce « ${req.label} » déposée avec succès (${file.name}).`,
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
      setFeedbackBanner({
        tone: 'success',
        text: `Document de démonstration « ${simulatedName} » déposé avec succès.`,
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
        text: `Votre dossier est encore incomplet (assurez-vous d’avoir sélectionné vos ${requiredChoicesCount} sujets et déposé toutes les pièces obligatoires).`,
      });
      return;
    }

    const res = submitCandidateApplication(dossier.id);
    if (!res.ok) {
      setFeedbackBanner({ tone: 'error', text: res.error || 'Erreur lors de la soumission.' });
    } else {
      setFeedbackBanner({
        tone: 'success',
        text: `Candidature soumise officiellement avec vos ${choicesDraft.length} choix de sujets ! Suivez l’avancement de chaque vœu ci-dessous.`,
      });
      setActiveTab('suivi');
    }
  };

  const lifecycleSteps = [
    { index: 0, title: 'Brouillon', desc: `Dossier & ${requiredChoicesCount} sujets` },
    { index: 1, title: 'Soumis', desc: 'Vœux transmis' },
    { index: 2, title: 'Présélection', desc: 'Examen commissions' },
    { index: 3, title: 'Entretien', desc: 'Auditions orales' },
    {
      index: 4,
      title:
        dossier.status === 'liste_attente'
          ? 'Liste d’attente'
          : dossier.status === 'non_retenu'
          ? 'Non retenu'
          : 'Décision',
      desc: 'Classement par sujet',
    },
    { index: 5, title: 'Inscrit(e)', desc: 'Validation CEDoc' },
  ];

  const preinscriptionRequirements = campaignConfig.documentRequirements.filter(
    (r) => r.stage === 'preinscription'
  );
  const inscriptionRequirements = campaignConfig.documentRequirements.filter(
    (r) => r.stage === 'inscription'
  );

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
              className="px-3.5 py-1.5 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5"
            >
              <Save className="w-3.5 h-3.5 text-blue-700" />
              Enregistrer le brouillon
            </button>
          )}
        </div>
      }
    >
      <div className="space-y-6">
        {/* Top persistent progress & status banner */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <span className="font-mono font-semibold text-slate-800">
                  Dossier {dossier.dossierNumber}
                </span>
                <span aria-hidden="true">·</span>
                <span>Campagne {campaignConfig.academicYear}</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono tabular-nums text-blue-700 font-semibold">
                  {activeChoices.length}/{requiredChoicesCount} sujets sélectionnés
                </span>
                <span aria-hidden="true">·</span>
                <span>
                  Dernière sauvegarde :{' '}
                  <span className="font-mono tabular-nums">
                    {formatDateFR(dossier.draftSavedAt, true)}
                  </span>
                </span>
              </div>
              <h1 className="text-xl font-bold text-slate-900 mt-1">
                Bonjour {personalForm.firstName} {personalForm.lastName}
                {personalForm.firstNameAr || personalForm.lastNameAr ? (
                  <span className="text-base font-normal text-slate-500 ml-2.5" dir="rtl">
                    ({personalForm.firstNameAr} {personalForm.lastNameAr})
                  </span>
                ) : null}
              </h1>
            </div>

            <div className={`px-3.5 py-2 rounded-lg border text-xs font-semibold ${statusMeta.surfaceClass}`}>
              Statut global : {statusMeta.label}
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-slate-700">
                Complétude des prérequis du dossier ({diagnostics.selectedSubjectsCount}/{diagnostics.requiredSubjectsCount} sujets · pièces & parcours)
              </span>
              <span className="font-mono font-bold text-blue-700 tabular-nums">
                {diagnostics.completionPercent} %
              </span>
            </div>
            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full bg-blue-700 rounded-full transition-opacity duration-150 ${getWidthClass(
                  diagnostics.completionPercent
                )}`}
              />
            </div>
          </div>
        </div>

        {/* Feedback notification toast inside workspace */}
        {feedbackBanner && (
          <div
            className={`p-4 rounded-xl border text-sm flex items-start justify-between gap-3 ${
              feedbackBanner.tone === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                : feedbackBanner.tone === 'error'
                ? 'bg-red-50 border-red-200 text-red-950'
                : 'bg-blue-50 border-blue-200 text-blue-950'
            }`}
          >
            <div className="flex items-start gap-2.5">
              {feedbackBanner.tone === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-red-700 shrink-0 mt-0.5" />
              )}
              <span>{feedbackBanner.text}</span>
            </div>
            <button
              type="button"
              onClick={() => setFeedbackBanner(null)}
              className="text-xs font-semibold underline shrink-0"
            >
              Fermer
            </button>
          </div>
        )}

        {/* Urgent Alert if any document is marked "À corriger" */}
        {diagnostics.docsToCorrect.length > 0 && (
          <div className="p-5 rounded-xl bg-red-50/80 border border-red-300 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-700 shrink-0 mt-0.5" />
                <div>
                  <h2 className="text-sm font-bold text-red-950">
                    Action requise : {diagnostics.docsToCorrect.length} pièce(s) signalée(s) « À corriger »
                  </h2>
                  <p className="text-xs text-red-900 mt-0.5">
                    Vos {activeChoices.length} choix de sujets restent actifs. Déposez simplement une version corrigée pour lever la réserve administrative.
                  </p>
                </div>
              </div>
              {activeTab !== 'pieces' && (
                <button
                  type="button"
                  onClick={() => setActiveTab('pieces')}
                  className="px-4 py-2 text-xs font-semibold text-white bg-red-700 hover:bg-red-800 rounded-lg transition-colors whitespace-nowrap shrink-0"
                >
                  Régulariser mes pièces
                </button>
              )}
            </div>
            <div className="space-y-2 pt-2 border-t border-red-200/80 text-xs text-red-950">
              {diagnostics.docsToCorrect.map((item) => (
                <div key={item.requirement.id}>
                  <strong>{item.requirement.label} :</strong> {item.comment}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 1: SUIVI & VUE D'ENSEMBLE */}
        {activeTab === 'suivi' && (
          <div className="space-y-6">
            {/* Lifecycle Stepper */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-6">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Suivi des étapes de votre candidature
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">{statusMeta.description}</p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                {lifecycleSteps.map((step) => {
                  const isCompleted =
                    dossier.status !== 'non_retenu' && statusMeta.stepIndex > step.index;
                  const isCurrent = statusMeta.stepIndex === step.index;
                  const isRejectedCurrent = isCurrent && dossier.status === 'non_retenu';

                  return (
                    <div
                      key={step.index}
                      className={`p-3.5 rounded-lg border transition-colors ${
                        isRejectedCurrent
                          ? 'bg-red-50 border-red-300'
                          : isCurrent
                          ? 'bg-blue-50 border-blue-300'
                          : isCompleted
                          ? 'bg-emerald-50/50 border-emerald-200'
                          : 'bg-slate-50 border-slate-200 opacity-75'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs font-mono mb-1.5">
                        <span className="font-semibold text-slate-600">0{step.index + 1}</span>
                        {isCompleted && <Check className="w-3.5 h-3.5 text-emerald-700" />}
                        {isCurrent && !isRejectedCurrent && (
                          <span className="text-blue-700 font-sans font-semibold">Actuel</span>
                        )}
                      </div>
                      <p className="text-xs font-bold text-slate-900">{step.title}</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">{step.desc}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Enrollment / Admission Official Pack */}
            {(dossier.status === 'admis' || dossier.status === 'inscrit') && (
              <div className="bg-white border border-emerald-200 rounded-xl p-6 space-y-5">
                <div className="pb-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <UsmbaLogo variant="full" className="h-9 sm:h-11" />
                  <span className="text-xs font-mono font-semibold text-emerald-800">
                    {dossier.status === 'inscrit'
                      ? `ATTESTATION D’INSCRIPTION VALIDÉE · ${campaignConfig.academicYear}`
                      : `PROCÉDURE D’INSCRIPTION DÉFINITIVE · ${campaignConfig.academicYear}`}
                  </span>
                </div>

                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <h3 className="text-base font-bold text-slate-900">
                      {dossier.status === 'inscrit'
                        ? 'Inscription administrative définitive validée par le CEDoc'
                        : 'Félicitations ! Vous êtes admis(e) en liste principale'}
                    </h3>
                    <p className="text-xs text-slate-600">
                      Sujet d’inscription retenu :{' '}
                      <strong className="text-slate-900">
                        {confirmedSubject
                          ? `${confirmedSubject.code} — ${confirmedSubject.title}`
                          : 'À confirmer'}
                      </strong>
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => window.print()}
                      className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap flex items-center gap-2"
                    >
                      <Printer className="w-4 h-4" />
                      {dossier.status === 'inscrit'
                        ? 'Imprimer l’attestation'
                        : 'Imprimer ma fiche d’inscription'}
                    </button>
                    {dossier.status === 'admis' && (
                      <button
                        type="button"
                        onClick={() => setActiveTab('pieces')}
                        className="px-4 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors whitespace-nowrap"
                      >
                        Déposer mes pièces d’inscription
                      </button>
                    )}
                  </div>
                </div>

                {dossier.status === 'inscrit' && dossier.enrollmentNumber && (
                  <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                    <div>
                      <span className="text-emerald-800 block">Matricule Doctoral USMBA</span>
                      <strong className="font-mono text-sm text-emerald-950 tabular-nums">
                        {dossier.enrollmentNumber}
                      </strong>
                    </div>
                    <div>
                      <span className="text-emerald-800 block">Date de validation CEDoc</span>
                      <strong className="font-mono text-emerald-950 tabular-nums">
                        {formatDateFR(dossier.enrollmentValidatedAt)}
                      </strong>
                    </div>
                    <div>
                      <span className="text-emerald-800 block">Directeur de thèse</span>
                      <strong className="text-emerald-950">
                        {confirmedSubject?.supervisor || '—'}
                      </strong>
                    </div>
                  </div>
                )}

                {/* Official USMBA Downloadable Forms */}
                <div className="pt-3 border-t border-slate-100 space-y-2.5">
                  <p className="text-xs font-semibold text-slate-800">
                    Documents officiels USMBA à télécharger, signer et déposer au CEDoc :
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <a
                      href="/assets/gcd_docs/Procedure_Inscription_GCD_2026_2027.pdf"
                      download="Procedure_Inscription_GCD_USMBA_2026_2027.pdf"
                      className="p-3 rounded-lg bg-slate-50 hover:bg-blue-50 border border-slate-200 flex items-center justify-between gap-2 transition-colors"
                    >
                      <span className="font-medium text-slate-800">
                        Procédure officielle d’inscription & Carte du Doctorant (PDF)
                      </span>
                      <Download className="w-4 h-4 text-blue-700 shrink-0" />
                    </a>
                    <a
                      href="/assets/gcd_docs/Charte_Theses_USMBA_2026_2027.pdf"
                      download="Charte_des_Theses_USMBA_2026_2027.pdf"
                      className="p-3 rounded-lg bg-slate-50 hover:bg-blue-50 border border-slate-200 flex items-center justify-between gap-2 transition-colors"
                    >
                      <span className="font-medium text-slate-800">
                        Charte des Thèses USMBA à signer & légaliser (PDF)
                      </span>
                      <Download className="w-4 h-4 text-blue-700 shrink-0" />
                    </a>
                  </div>
                </div>
              </div>
            )}

            {/* DETAILED TRACKING OF ALL 3 SUBJECT CHOICES */}
            <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-200">
              <div className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Suivi détaillé de vos {requiredChoicesCount} choix de sujets de thèse
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Chaque sujet sélectionné est examiné indépendamment par la commission du laboratoire concerné.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('sujets')}
                  className="px-3.5 py-2 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors self-start whitespace-nowrap"
                >
                  {isEditableDraft
                    ? `Gérer mes ${requiredChoicesCount} sujets (${activeChoices.length}/${requiredChoicesCount})`
                    : 'Voir le détail des sujets'}
                </button>
              </div>

              {activeChoices.length === 0 ? (
                <div className="p-8 text-center space-y-3">
                  <p className="text-sm text-slate-600">
                    Vous n’avez pas encore sélectionné vos {requiredChoicesCount} sujets de thèse.
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveTab('sujets')}
                    className="px-4 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors"
                  >
                    Choisir mes {requiredChoicesCount} sujets maintenant
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
                    <div key={choice.subjectId} className="p-6 space-y-4">
                      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                        <div className="space-y-1 max-w-3xl">
                          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                            <span className="font-mono font-bold text-slate-900">
                              Choix n°{choice.priority}
                            </span>
                            <span aria-hidden="true">·</span>
                            <span className="font-mono font-semibold text-blue-700">
                              {suj?.code || choice.subjectId}
                            </span>
                            <span aria-hidden="true">·</span>
                            <span>{suj?.etablissement || 'USMBA'}</span>
                            <span aria-hidden="true">·</span>
                            <span className={`font-semibold ${choicePres.textClass}`}>
                              {choice.status === 'liste_attente' && !isEditableDraft
                                ? `Liste d’attente (Rang ${choice.waitlistRank || 1})`
                                : choicePres.label}
                            </span>
                          </div>

                          <h4 className="text-sm sm:text-base font-bold text-slate-900">
                            {suj?.title || 'Sujet introuvable'}
                          </h4>

                          <p className="text-xs text-slate-600">
                            <strong>Encadrant :</strong> {suj?.supervisor || '—'} ·{' '}
                            <strong>Laboratoire :</strong> {suj?.laboratoire || '—'}
                          </p>
                        </div>

                        {choice.status === 'admis' &&
                          !isEditableDraft &&
                          admittedChoices.length > 1 &&
                          dossier.status !== 'inscrit' && (
                            <button
                              type="button"
                              onClick={() => confirmAdmissionSubject(dossier.id, choice.subjectId)}
                              className={`px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                                isConfirmedChoice
                                  ? 'bg-emerald-50 text-emerald-900 border border-emerald-300'
                                  : 'bg-blue-700 text-white hover:bg-blue-800'
                              }`}
                            >
                              {isConfirmedChoice
                                ? '✓ Sujet retenu pour inscription'
                                : 'Choisir ce sujet pour mon inscription'}
                            </button>
                          )}
                      </div>

                      {/* Interview Convocation specific to this choice */}
                      {!isEditableDraft && choice.interview && (
                        <div className="p-4 rounded-xl bg-blue-50/50 border border-blue-200 space-y-2.5 text-xs">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="font-bold text-blue-950 flex items-center gap-1.5">
                              <Calendar className="w-4 h-4 text-blue-700" />
                              Convocation à l’entretien oral (Choix n°{choice.priority})
                            </span>
                            <span className="font-mono font-bold text-blue-800 tabular-nums">
                              {formatDateFR(choice.interview.date)} à {choice.interview.time}
                            </span>
                          </div>
                          <p className="text-slate-800 flex items-start gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-blue-700 shrink-0 mt-0.5" />
                            <span>
                              {choice.interview.modality === 'presentiel'
                                ? 'Présentiel : '
                                : 'Visioconférence : '}
                              {choice.interview.location}
                            </span>
                          </p>
                          <p className="text-slate-600">
                            <strong>Jury :</strong> {choice.interview.juryMembers}
                          </p>
                          <p className="text-slate-600">
                            <strong>Consignes :</strong> {choice.interview.instructions}
                          </p>
                        </div>
                      )}

                      {/* Evaluation scores specific to this choice */}
                      {!isEditableDraft &&
                        choice.evaluation &&
                        (campaignConfig.resultsPublished ||
                          choice.status === 'admis' ||
                          dossier.status === 'inscrit') && (
                          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs font-mono tabular-nums text-slate-700">
                            <span>
                              Note Dossier : <strong>{choice.evaluation.academicScore}/20</strong> · Note Entretien :{' '}
                              <strong>{choice.evaluation.interviewScore}/20</strong>
                            </span>
                            <span className="text-slate-900 font-bold">
                              Moyenne pondérée : {choice.evaluation.weightedScore}/20
                            </span>
                          </div>
                        )}

                      {/* Rejection reason if non_retenu */}
                      {!isEditableDraft && choice.status === 'non_retenu' && choice.rejectionReason && (
                        <p className="text-xs text-red-900 bg-red-50/70 border border-red-200 rounded-lg p-3">
                          <strong>Motif communiqué :</strong> {choice.rejectionReason}
                        </p>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Diagnostic Assistant */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-slate-900">
                  Vérification automatique de votre dossier
                </h3>
                <span className="text-xs text-slate-500">Contrôle anti-oubli avant soumission</span>
              </div>

              {diagnostics.canSubmitPreinscription && isEditableDraft ? (
                <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 space-y-3">
                  <p className="text-sm font-semibold text-emerald-950 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                    Vos {requiredChoicesCount} sujets sont choisis et toutes vos pièces obligatoires sont prêtes !
                  </p>
                  <p className="text-xs text-emerald-800">
                    Vous pouvez dès à présent transmettre officiellement votre candidature avant le{' '}
                    {formatDateFR(campaignConfig.submissionDeadline)}.
                  </p>
                  <button
                    type="button"
                    onClick={handleFinalSubmitPreinscription}
                    className="px-4 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors flex items-center gap-2"
                  >
                    <Send className="w-3.5 h-3.5" />
                    Soumettre définitivement ma candidature ({requiredChoicesCount} sujets)
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 text-sm">
                  <div className="py-2.5 flex items-start justify-between gap-4">
                    <div>
                      <p className="font-medium text-slate-900">1. Informations personnelles & Carte du Doctorant</p>
                      <p className="text-xs text-slate-500">
                        {diagnostics.personalMissing.length === 0
                          ? 'Tous les champs obligatoires sont renseignés.'
                          : `Manquant : ${diagnostics.personalMissing.join(', ')}`}
                      </p>
                    </div>
                    {diagnostics.personalMissing.length === 0 ? (
                      <span className="text-xs font-semibold text-emerald-700 shrink-0">✓ Complet</span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setFormStep(1);
                          setActiveTab('dossier');
                        }}
                        className="text-xs font-semibold text-blue-700 hover:underline shrink-0"
                      >
                        Compléter
                      </button>
                    )}
                  </div>

                  <div className="py-2.5 flex items-start justify-between gap-4">
                    <div>
                      <p className="font-medium text-slate-900">2. Parcours universitaire & seuil Bac+5</p>
                      <p className="text-xs text-slate-500">
                        {diagnostics.academicMissing.length === 0 &&
                        diagnostics.academicRuleWarnings.length === 0
                          ? 'Cursus Bac, Licence et Bac+5 conforme.'
                          : [
                              ...diagnostics.academicMissing.map((m) => `Manquant : ${m}`),
                              ...diagnostics.academicRuleWarnings,
                            ].join(' · ')}
                      </p>
                    </div>
                    {diagnostics.academicMissing.length === 0 &&
                    diagnostics.academicRuleWarnings.length === 0 ? (
                      <span className="text-xs font-semibold text-emerald-700 shrink-0">✓ Complet</span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setFormStep(2);
                          setActiveTab('dossier');
                        }}
                        className="text-xs font-semibold text-blue-700 hover:underline shrink-0"
                      >
                        Vérifier
                      </button>
                    )}
                  </div>

                  <div className="py-2.5 flex items-start justify-between gap-4">
                    <div>
                      <p className="font-medium text-slate-900">
                        3. Sélection des {diagnostics.requiredSubjectsCount} sujets de thèse & motivation
                      </p>
                      <p className="text-xs text-slate-500">
                        {diagnostics.subjectMissing
                          ? `${diagnostics.selectedSubjectsCount} / ${diagnostics.requiredSubjectsCount} sujet(s) choisi(s) — il reste ${diagnostics.subjectsMissingCount} sujet(s) à sélectionner.`
                          : diagnostics.motivationMissing
                          ? `${diagnostics.selectedSubjectsCount}/${diagnostics.requiredSubjectsCount} sujets choisis · Veuillez compléter votre motivation scientifique (min. 30 car.).`
                          : `${diagnostics.selectedSubjectsCount}/${diagnostics.requiredSubjectsCount} sujets sélectionnés et motivation renseignée.`}
                      </p>
                    </div>
                    {!diagnostics.subjectMissing && !diagnostics.motivationMissing ? (
                      <span className="text-xs font-semibold text-emerald-700 shrink-0">✓ Complet</span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          if (diagnostics.subjectMissing) {
                            setActiveTab('sujets');
                          } else {
                            setFormStep(3);
                            setActiveTab('dossier');
                          }
                        }}
                        className="text-xs font-semibold text-blue-700 hover:underline shrink-0"
                      >
                        {diagnostics.subjectMissing ? 'Choisir mes sujets' : 'Rédiger'}
                      </button>
                    )}
                  </div>

                  <div className="py-2.5 flex items-start justify-between gap-4">
                    <div>
                      <p className="font-medium text-slate-900">4. Pièces justificatives obligatoires</p>
                      <p className="text-xs text-slate-500">
                        {diagnostics.missingPreinscriptionDocs.length === 0 &&
                        diagnostics.docsToCorrect.length === 0
                          ? 'Toutes les pièces requises de préinscription sont déposées.'
                          : `${diagnostics.missingPreinscriptionDocs.length} pièce(s) manquante(s) · ${diagnostics.docsToCorrect.length} à corriger`}
                      </p>
                    </div>
                    {diagnostics.missingPreinscriptionDocs.length === 0 &&
                    diagnostics.docsToCorrect.length === 0 ? (
                      <span className="text-xs font-semibold text-emerald-700 shrink-0">✓ Complet</span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setActiveTab('pieces')}
                        className="text-xs font-semibold text-blue-700 hover:underline shrink-0"
                      >
                        Déposer
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: INFORMATIONS PERSONNELLES & PARCOURS UNIVERSITAIRE */}
        {activeTab === 'dossier' && (
          <div className="space-y-6">
            <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Formulaire de candidature</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Les champs marqués d’un astérisque (<span className="text-red-600">*</span>) sont obligatoires.{' '}
                    {!isEditableDraft &&
                      'Votre candidature ayant été soumise, ces informations sont en lecture seule.'}
                  </p>
                </div>

                {/* Sub-step selector */}
                <div className="inline-flex p-1 bg-slate-100 border border-slate-200 rounded-lg self-start">
                  <button
                    type="button"
                    onClick={() => setFormStep(1)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
                      formStep === 1 ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                    }`}
                  >
                    01. État civil
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormStep(2)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
                      formStep === 2 ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                    }`}
                  >
                    02. Parcours Bac+5
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormStep(3)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
                      formStep === 3 ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                    }`}
                  >
                    03. Motivation
                  </button>
                </div>
              </div>

              {/* STEP 1: PERSONAL INFO */}
              {formStep === 1 && (
                <div className="space-y-5">
                  <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 flex items-start gap-2.5 text-xs text-slate-700">
                    <Info className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
                    <span>
                      <strong>Instruction Carte du Doctorant USMBA :</strong> Vérifiez soigneusement vos nom et prénom en français et en arabe ainsi que votre CIN et code Massar/CNE tels qu’ils apparaîtront sur votre Carte d’étudiant doctorant.
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Nom (Français) <span className="text-red-600">*</span>
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
                        Prénom (Français) <span className="text-red-600">*</span>
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
                        placeholder="بناني"
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
                        placeholder="سلمى"
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg disabled:bg-slate-50"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        N° CIN ou Passeport <span className="text-red-600">*</span>
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
                        placeholder="Ex. Fès"
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg disabled:bg-slate-50"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Adresse e-mail <span className="text-red-600">*</span>
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
                        Téléphone mobile <span className="text-red-600">*</span>
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
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
                        <option value="etudiant">Étudiant(e) non salarié(e)</option>
                        <option value="salarie">Salarié(e) du secteur privé</option>
                        <option value="fonctionnaire">Fonctionnaire / Secteur public</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Ville de résidence
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
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Adresse postale complète <span className="text-red-600">*</span>
                      </label>
                      <input
                        type="text"
                        disabled={!isEditableDraft}
                        value={personalForm.address}
                        onChange={(e) =>
                          setPersonalForm({ ...personalForm, address: e.target.value })
                        }
                        placeholder="Numéro, rue, quartier, ville"
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg disabled:bg-slate-50"
                      />
                    </div>
                  </div>

                  {personalForm.employmentStatus !== 'etudiant' && (
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Nom de l’employeur / Administration de tutelle <span className="text-red-600">*</span>
                      </label>
                      <input
                        type="text"
                        disabled={!isEditableDraft}
                        value={personalForm.employerName || ''}
                        onChange={(e) =>
                          setPersonalForm({ ...personalForm, employerName: e.target.value })
                        }
                        placeholder="Ex. Ministère de l'Éducation Nationale / Société..."
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg disabled:bg-slate-50"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* STEP 2: ACADEMIC PARCOURS */}
              {formStep === 2 && (
                <div className="space-y-6">
                  <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 flex items-start gap-2.5 text-xs text-slate-700">
                    <Info className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
                    <span>
                      <strong>Instruction :</strong> Saisissez les moyennes générales sur 20 telles qu’elles figurent sur vos relevés officiels. Pour cette campagne, l’administration a fixé un seuil minimal de{' '}
                      <strong className="font-mono">{campaignConfig.minMasterAverage}/20</strong> au diplôme Bac+5.
                    </span>
                  </div>

                  {diagnostics.academicRuleWarnings.length > 0 && (
                    <div className="p-3.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-900 space-y-1">
                      {diagnostics.academicRuleWarnings.map((w, idx) => (
                        <p key={idx} className="font-medium">
                          ⚠ {w}
                        </p>
                      ))}
                    </div>
                  )}

                  {/* Bac */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-bold text-slate-900">1. Baccalauréat</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Série du Baccalauréat <span className="text-red-600">*</span>
                        </label>
                        <input
                          type="text"
                          disabled={!isEditableDraft}
                          value={academicForm.bacSeries}
                          onChange={(e) =>
                            setAcademicForm({ ...academicForm, bacSeries: e.target.value })
                          }
                          placeholder="Ex. Sciences Mathématiques A"
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
                          placeholder="2020"
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
                          placeholder="15.40"
                          className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-lg disabled:bg-slate-50"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Licence */}
                  <div className="space-y-3 pt-4 border-t border-slate-200">
                    <h3 className="text-sm font-bold text-slate-900">
                      2. Diplôme Bac+3 (Licence / Cycle préparatoire)
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Intitulé de la filière <span className="text-red-600">*</span>
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
                          placeholder="Ex. FSDM Fès"
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
                          placeholder="14.20"
                          className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-lg disabled:bg-slate-50"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Master / Ingénieur */}
                  <div className="space-y-3 pt-4 border-t border-slate-200">
                    <h3 className="text-sm font-bold text-slate-900">
                      3. Diplôme donnant accès au doctorat (Master, Ingénieur d’État ou Équivalent)
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Nature du diplôme <span className="text-red-600">*</span>
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
                          <option value="Diplôme d'Ingénieur">Diplôme d’Ingénieur d’État</option>
                          <option value="Médecine / Pharmacie">Doctorat en Médecine / Pharmacie</option>
                          <option value="Équivalence Étrangère">Diplôme étranger avec équivalence</option>
                        </select>
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Intitulé exact du diplôme Bac+5 <span className="text-red-600">*</span>
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
                          Établissement & Université <span className="text-red-600">*</span>
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
                          Année d’obtention <span className="text-red-600">*</span>
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
                          Moyenne générale /20 <span className="text-red-600">*</span>
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

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Titre du mémoire de Master / Projet de Fin d’Études (PFE){' '}
                        <span className="text-red-600">*</span>
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
                  </div>
                </div>
              )}

              {/* STEP 3: MOTIVATION & PROJECT */}
              {formStep === 3 && (
                <div className="space-y-5">
                  <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700 space-y-2">
                    <div className="flex items-center justify-between gap-4">
                      <strong>
                        Vos {activeChoices.length} / {requiredChoicesCount} sujets sélectionnés :
                      </strong>
                      {isEditableDraft && (
                        <button
                          type="button"
                          onClick={() => setActiveTab('sujets')}
                          className="font-semibold text-blue-700 hover:underline shrink-0"
                        >
                          Compléter ou réordonner mes {requiredChoicesCount} choix
                        </button>
                      )}
                    </div>
                    {activeChoices.length === 0 ? (
                      <p className="text-amber-800">
                        Aucun sujet sélectionné pour le moment. Vous devez sélectionner {requiredChoicesCount} sujets.
                      </p>
                    ) : (
                      <div className="space-y-1">
                        {activeChoices.map((ch) => {
                          const s = subjects.find((item) => item.id === ch.subjectId);
                          return (
                            <p key={ch.subjectId} className="truncate">
                              <span className="font-mono font-bold text-blue-700">
                                Choix n°{ch.priority} :
                              </span>{' '}
                              <span className="font-mono">{s?.code}</span> — {s?.title}
                            </p>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Lettre de motivation scientifique et cohérence de vos {requiredChoicesCount} choix (min. 30 caractères){' '}
                      <span className="text-red-600">*</span>
                    </label>
                    <textarea
                      rows={5}
                      disabled={!isEditableDraft}
                      value={motivationText}
                      onChange={(e) => setMotivationText(e.target.value)}
                      placeholder="Présentez vos compétences méthodologiques, vos travaux de Master/PFE et l’articulation avec vos 3 sujets de thèse..."
                      className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-lg disabled:bg-slate-50"
                    />
                    <p className="text-xs text-slate-400 mt-1 font-mono tabular-nums">
                      {motivationText.trim().length} caractères saisis
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Pistes méthodologiques envisagées (facultatif)
                    </label>
                    <textarea
                      rows={3}
                      disabled={!isEditableDraft}
                      value={proposalText}
                      onChange={(e) => setProposalText(e.target.value)}
                      placeholder="Décrivez brièvement votre compréhension des problématiques scientifiques choisies..."
                      className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-lg disabled:bg-slate-50"
                    />
                  </div>
                </div>
              )}

              {/* Footer navigation inside form */}
              <div className="pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  {formStep > 1 && (
                    <button
                      type="button"
                      onClick={() => setFormStep((s) => (s === 3 ? 2 : 1))}
                      className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                    >
                      Étape précédente
                    </button>
                  )}
                  {formStep < 3 ? (
                    <button
                      type="button"
                      onClick={() => setFormStep((s) => (s === 1 ? 2 : 3))}
                      className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors"
                    >
                      Continuer vers l’étape 0{formStep + 1}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        if (isEditableDraft) handleSaveDraft();
                        setActiveTab(diagnostics.subjectMissing ? 'sujets' : 'pieces');
                      }}
                      className="px-4 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors"
                    >
                      {diagnostics.subjectMissing
                        ? `Sélectionner mes ${requiredChoicesCount} sujets`
                        : 'Passer aux pièces justificatives'}
                    </button>
                  )}
                </div>

                {isEditableDraft && (
                  <button
                    type="button"
                    onClick={handleSaveDraft}
                    className="px-4 py-2 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors flex items-center gap-1.5"
                  >
                    <Save className="w-3.5 h-3.5" />
                    Enregistrer comme brouillon
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: MES 3 SUJETS DE THÈSE */}
        {activeTab === 'sujets' && (
          <div className="space-y-6">
            {/* Top Basket: 3 Ordered Choices */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    Mes {requiredChoicesCount} choix de sujets de thèse (par ordre de priorité)
                  </h2>
                  <p className="text-xs text-slate-600 mt-0.5">
                    {isEditableDraft
                      ? `Chaque candidat sélectionne ${requiredChoicesCount} sujets distincts. Utilisez les flèches pour ajuster votre ordre de préférence avant soumission.`
                      : 'Vos choix de sujets sont verrouillés après soumission et en cours d’examen par les commissions respectives.'}
                  </p>
                </div>
                <span className="text-xs font-mono font-bold text-blue-700 tabular-nums shrink-0">
                  {activeChoices.length} / {requiredChoicesCount} sélectionné(s)
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {Array.from({ length: requiredChoicesCount }).map((_, slotIdx) => {
                  const choice = activeChoices[slotIdx];
                  const suj = choice ? subjects.find((s) => s.id === choice.subjectId) : undefined;

                  if (!choice || !suj) {
                    return (
                      <div
                        key={`empty-slot-${slotIdx}`}
                        className="p-4 rounded-xl border border-dashed border-slate-300 bg-slate-50/70 flex flex-col justify-between space-y-3"
                      >
                        <div className="space-y-1">
                          <span className="text-xs font-mono font-bold text-amber-700">
                            Choix n°{slotIdx + 1} — À sélectionner
                          </span>
                          <p className="text-xs text-slate-600 leading-relaxed">
                            Emplacement libre. Parcourez le catalogue ci-dessous et cliquez sur « Ajouter en Choix n°{activeChoices.length + 1} ».
                          </p>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={choice.subjectId}
                      className="p-4 rounded-xl border border-blue-200 bg-blue-50/30 flex flex-col justify-between space-y-3"
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between gap-2 text-xs">
                          <span className="font-mono font-bold text-blue-800">
                            Choix n°{choice.priority}
                          </span>
                          <span className="font-mono text-slate-600">{suj.code}</span>
                        </div>
                        <h3 className="text-xs sm:text-sm font-bold text-slate-900 leading-snug">
                          {suj.title}
                        </h3>
                        <p className="text-[11px] text-slate-600">
                          {suj.supervisor} · {suj.laboratoire}
                        </p>
                      </div>

                      {isEditableDraft && (
                        <div className="pt-2 border-t border-blue-200/60 flex items-center justify-between gap-2">
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              disabled={slotIdx === 0}
                              onClick={() => handleMoveChoice(slotIdx, -1)}
                              title="Monter en priorité"
                              className="p-1.5 text-slate-700 bg-white hover:bg-slate-100 disabled:opacity-40 border border-slate-200 rounded-md"
                            >
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              disabled={slotIdx === activeChoices.length - 1}
                              onClick={() => handleMoveChoice(slotIdx, 1)}
                              title="Descendre en priorité"
                              className="p-1.5 text-slate-700 bg-white hover:bg-slate-100 disabled:opacity-40 border border-slate-200 rounded-md"
                            >
                              <ArrowDown className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleRemoveSubjectChoice(choice.subjectId)}
                            className="px-2.5 py-1 text-xs font-semibold text-red-700 hover:bg-red-50 rounded-md flex items-center gap-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Retirer
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Catalogue Search & Selection */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Catalogue des sujets proposés ({filteredSubjects.length})
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Filtrez par formation doctorale, laboratoire ou domaine disciplinaire.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                <div className="md:col-span-5 relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={subjectQuery}
                    onChange={(e) => setSubjectQuery(e.target.value)}
                    placeholder="Intitulé, code sujet, encadrant, mot-clé..."
                    className="w-full pl-10 pr-3.5 py-2 text-sm border border-slate-200 rounded-lg"
                  />
                </div>
                <div className="md:col-span-3">
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
                <div className="md:col-span-2">
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
                <div className="md:col-span-2">
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
              </div>

              <div className="divide-y divide-slate-200 border border-slate-200 rounded-xl">
                {filteredSubjects.map((suj) => {
                  const existingChoice = activeChoices.find((c) => c.subjectId === suj.id);
                  const isQuotaReached =
                    activeChoices.length >= requiredChoicesCount && !existingChoice;

                  return (
                    <div
                      key={suj.id}
                      className={`p-5 space-y-2.5 ${existingChoice ? 'bg-blue-50/40' : 'bg-white'}`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                        <div className="space-y-1 max-w-3xl">
                          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                            <span className="font-mono font-semibold text-blue-700">{suj.code}</span>
                            <span>·</span>
                            <span>{suj.formationDoctorale}</span>
                            <span>·</span>
                            <span className="font-mono tabular-nums">{suj.places} place(s)</span>
                          </div>
                          <h4 className="text-base font-bold text-slate-900">{suj.title}</h4>
                          <p className="text-xs text-slate-600">
                            <strong>Laboratoire :</strong> {suj.laboratoire} ({suj.etablissement}) ·{' '}
                            <strong>Directeur :</strong> {suj.supervisor}
                          </p>
                          <p className="text-xs text-slate-600 pt-1">
                            <strong>Prérequis :</strong> {suj.prerequisites}
                          </p>
                        </div>

                        <div className="shrink-0">
                          {existingChoice ? (
                            <div className="flex items-center gap-2">
                              <span className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg whitespace-nowrap">
                                <Check className="w-4 h-4" />
                                Sélectionné (Choix n°{existingChoice.priority})
                              </span>
                              {isEditableDraft && (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveSubjectChoice(suj.id)}
                                  className="px-2.5 py-2 text-xs font-semibold text-red-700 hover:bg-red-50 rounded-lg"
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
                              className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                                isQuotaReached
                                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                  : 'text-white bg-blue-700 hover:bg-blue-800'
                              }`}
                            >
                              {isQuotaReached ? (
                                `${requiredChoicesCount}/${requiredChoicesCount} sujets choisis`
                              ) : (
                                <>
                                  <Plus className="w-3.5 h-3.5" />
                                  Ajouter en Choix n°{activeChoices.length + 1}
                                </>
                              )}
                            </button>
                          ) : (
                            <span className="text-xs text-slate-400">
                              {!suj.open ? 'Sujet clôturé' : 'Verrouillé'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: PIÈCES JUSTIFICATIVES & SOUMISSION */}
        {activeTab === 'pieces' && (
          <div className="space-y-6">
            {/* Stage 1: Pièces de préinscription */}
            <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-200">
              <div className="p-6">
                <h2 className="text-lg font-bold text-slate-900">
                  Dépôt des pièces justificatives de préinscription
                </h2>
                <p className="text-xs text-slate-600 mt-1">
                  Un seul dépôt numérique vaut pour vos {requiredChoicesCount} choix de sujets. Chaque pièce affiche son statut en direct :{' '}
                  <strong>Manquante</strong>, <strong>Déposée</strong>, <strong>À corriger</strong> ou{' '}
                  <strong>Validée conforme</strong>.
                </p>
              </div>

              {preinscriptionRequirements.map((req) => {
                const uploaded = dossier.documents.find((d) => d.requirementId === req.id);
                const status = uploaded ? uploaded.status : 'manquante';
                const docPres = getDocStatusPresentation(status);
                const canUploadThis =
                  isEditableDraft ||
                  status === 'a_corriger' ||
                  (status === 'manquante' &&
                    dossier.status !== 'non_retenu' &&
                    dossier.status !== 'inscrit');

                return (
                  <div key={req.id} className={`p-5 sm:p-6 space-y-3 ${docPres.boxClass}`}>
                    <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                      <div className="space-y-1 max-w-2xl">
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <span className="font-mono font-semibold text-slate-700">{req.code}</span>
                          <span>·</span>
                          <span
                            className={
                              req.required ? 'font-semibold text-slate-900' : 'text-slate-500'
                            }
                          >
                            {req.required ? 'Pièce obligatoire *' : 'Pièce facultative'}
                          </span>
                          <span>·</span>
                          <span className="font-mono text-slate-500">
                            Formats : {req.acceptedFormats.join(', ')} · Max {req.maxSizeMB} Mo
                          </span>
                          <span>·</span>
                          <span className={`font-semibold ${docPres.textClass}`}>
                            Statut : {docPres.label}
                          </span>
                        </div>

                        <h3 className="text-sm font-bold text-slate-900">{req.label}</h3>
                        <p className="text-xs text-slate-600">{req.description}</p>
                        <p className="text-xs text-slate-500">{req.instructions}</p>

                        {uploaded && (
                          <div className="pt-1 flex flex-wrap items-center gap-2 text-xs font-mono text-slate-700">
                            <FileText className="w-3.5 h-3.5 text-blue-700" />
                            <span>{uploaded.fileName}</span>
                            <span>·</span>
                            <span>{formatFileSize(uploaded.fileSizeKB)}</span>
                            <span>·</span>
                            <span>Déposé le {formatDateFR(uploaded.uploadedAt, true)}</span>
                          </div>
                        )}
                      </div>

                      {canUploadThis && (
                        <div className="flex flex-wrap items-center gap-2 shrink-0">
                          <label className="cursor-pointer px-3.5 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5">
                            <FileUp className="w-3.5 h-3.5" />
                            {uploaded ? 'Remplacer le fichier' : 'Choisir un fichier'}
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
                            className="px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap"
                          >
                            Démo : joindre scan valide
                          </button>
                        </div>
                      )}
                    </div>

                    {status === 'a_corriger' && uploaded?.reviewComment && (
                      <div className="p-3 rounded-lg bg-white border border-red-200 text-xs text-red-900">
                        <strong>Motif de correction demandé par l’administration :</strong>{' '}
                        {uploaded.reviewComment}
                      </div>
                    )}

                    {uploadErrors[req.id] && (
                      <p className="text-xs font-medium text-red-700">⚠ {uploadErrors[req.id]}</p>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Stage 2: Pièces d'inscription administrative définitive */}
            {inscriptionRequirements.length > 0 && (
              <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-200">
                <div className="p-6">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h2 className="text-base font-bold text-slate-900">
                      Pièces complémentaires d’inscription définitive (Candidats admis)
                    </h2>
                    <span className="text-xs text-slate-500">
                      Échéance : {formatDateFR(campaignConfig.enrollmentDeadline)}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1">
                    Ces documents ne sont exigés qu’une fois votre admission prononcée en liste principale sur l’un de vos {requiredChoicesCount} sujets.
                  </p>
                </div>

                {inscriptionRequirements.map((req) => {
                  const uploaded = dossier.documents.find((d) => d.requirementId === req.id);
                  const status = uploaded ? uploaded.status : 'manquante';
                  const docPres = getDocStatusPresentation(status);
                  const unlocked = dossier.status === 'admis' || status === 'a_corriger';

                  return (
                    <div key={req.id} className="p-5 sm:p-6 space-y-3">
                      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                        <div className="space-y-1 max-w-2xl">
                          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                            <span className="font-mono font-semibold text-slate-700">{req.code}</span>
                            <span>·</span>
                            <span>
                              Formats : {req.acceptedFormats.join(', ')} · Max {req.maxSizeMB} Mo
                            </span>
                            <span>·</span>
                            <span className={`font-semibold ${docPres.textClass}`}>
                              Statut : {docPres.label}
                            </span>
                          </div>
                          <h3 className="text-sm font-bold text-slate-900">{req.label}</h3>
                          <p className="text-xs text-slate-600">{req.instructions}</p>
                          {uploaded && (
                            <p className="text-xs font-mono text-slate-700 pt-1">
                              Fichier déposé : {uploaded.fileName} ({formatFileSize(uploaded.fileSizeKB)})
                            </p>
                          )}
                        </div>

                        {unlocked ? (
                          <div className="flex flex-wrap items-center gap-2 shrink-0">
                            <label className="cursor-pointer px-3.5 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5">
                              <FileUp className="w-3.5 h-3.5" />
                              {uploaded ? 'Remplacer' : 'Déposer le document signé'}
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
                              className="px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                            >
                              Démo : joindre charte signée
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">
                            {dossier.status === 'inscrit'
                              ? '✓ Inscription déjà validée'
                              : 'Débloqué après admission en liste principale'}
                          </span>
                        )}
                      </div>

                      {status === 'a_corriger' && uploaded?.reviewComment && (
                        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-900">
                          <strong>Correction demandée :</strong> {uploaded.reviewComment}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Submission Call-to-Action Footer */}
            {isEditableDraft && (
              <div className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-slate-900">
                    Prêt(e) à transmettre votre candidature ({activeChoices.length}/{requiredChoicesCount} sujets) ?
                  </h3>
                  <p className="text-xs text-slate-600">
                    {diagnostics.canSubmitPreinscription
                      ? `Vos ${requiredChoicesCount} sujets et toutes vos pièces obligatoires sont prêts pour envoi.`
                      : `Vérifiez que vous avez bien sélectionné vos ${requiredChoicesCount} sujets et déposé toutes les pièces obligatoires.`}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <button
                    type="button"
                    onClick={handleSaveDraft}
                    className="px-4 py-2.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                  >
                    Enregistrer le brouillon
                  </button>
                  <button
                    type="button"
                    onClick={handleFinalSubmitPreinscription}
                    className="px-5 py-2.5 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors flex items-center gap-2"
                  >
                    <Send className="w-4 h-4" />
                    Soumettre ma candidature
                  </button>
                </div>
              </div>
            )}

            {dossier.status === 'admis' && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-emerald-950">
                    Transmission du dossier d’inscription administrative
                  </h3>
                  <p className="text-xs text-emerald-900">
                    Une fois la Charte des thèses déposée et toutes vos pièces conformes, notifiez l’administration CEDoc pour validation définitive.
                  </p>
                </div>
                <button
                  type="button"
                  disabled={!diagnostics.canSubmitEnrollment}
                  onClick={() => {
                    submitFinalEnrollment(dossier.id);
                    setFeedbackBanner({
                      tone: 'success',
                      text: 'Votre dossier complet d’inscription définitive a été transmis au service administratif du CEDoc.',
                    });
                  }}
                  className="px-5 py-2.5 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-2"
                >
                  <FileCheck className="w-4 h-4" />
                  Confirmer le dépôt d’inscription définitive
                </button>
              </div>
            )}
          </div>
        )}

        {/* TAB 5: NOTIFICATIONS */}
        {activeTab === 'notifications' && (
          <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-200">
            <div className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Centre de notifications</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Alertes concernant vos entretiens, résultats de sélection sur chacun de vos {requiredChoicesCount} sujets et pièces à régulariser.
                </p>
              </div>
              {unreadNotifCount > 0 && (
                <button
                  type="button"
                  onClick={() => markAllNotificationsRead(currentUser.id)}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors self-start"
                >
                  Tout marquer comme lu ({unreadNotifCount})
                </button>
              )}
            </div>

            {userNotifications.length === 0 ? (
              <div className="p-10 text-center text-sm text-slate-500">
                Vous n’avez aucune notification pour le moment.
              </div>
            ) : (
              userNotifications.map((notif) => (
                <div
                  key={notif.id}
                  className={`p-5 flex flex-col sm:flex-row sm:items-start justify-between gap-4 ${
                    !notif.read ? 'bg-blue-50/30' : 'bg-white'
                  }`}
                >
                  <div className="space-y-1 max-w-3xl">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <span className="font-semibold text-slate-800">
                        {notif.category === 'correction'
                          ? '⚠ Pièce à compléter / corriger'
                          : notif.category === 'entretien'
                          ? 'Entretien oral'
                          : notif.category === 'resultat'
                          ? 'Résultat officiel'
                          : 'Information dossier'}
                      </span>
                      <span>·</span>
                      <span className="font-mono tabular-nums">
                        {formatDateFR(notif.createdAt, true)}
                      </span>
                      {!notif.read && (
                        <>
                          <span>·</span>
                          <span className="font-semibold text-blue-700">Nouveau</span>
                        </>
                      )}
                    </div>
                    <h3 className="text-sm font-bold text-slate-900">{notif.title}</h3>
                    <p className="text-sm text-slate-600">{notif.message}</p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {notif.actionTab && (
                      <button
                        type="button"
                        onClick={() => {
                          markNotificationRead(notif.id);
                          setActiveTab(notif.actionTab as CandidateTab);
                        }}
                        className="px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                      >
                        Ouvrir
                      </button>
                    )}
                    {!notif.read && (
                      <button
                        type="button"
                        onClick={() => markNotificationRead(notif.id)}
                        className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900"
                      >
                        Lu
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* TAB 6: AIDE & SUPPORT */}
        {activeTab === 'aide' && <HelpCenter compactHeader />}
      </div>
    </WorkspaceShell>
  );
};
