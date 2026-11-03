import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Award,
  Bell,
  Calendar,
  CheckCircle2,
  ClipboardCheck,
  Download,
  Eye,
  FileText,
  HelpCircle,
  Layers,
  RotateCcw,
  Search,
  UserCheck,
  Users,
  X,
  XCircle,
} from 'lucide-react';
import { useGCD } from '../context/GCDContext';
import {
  CandidateDossier,
  SubjectChoice,
  ThesisSubject,
  UploadedDocument,
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
import { HelpCenter } from './HelpCenter';
import { NavItem, WorkspaceShell } from './WorkspaceShell';

type CommissionTab =
  | 'sujets_groupes'
  | 'candidatures'
  | 'entretiens'
  | 'classement'
  | 'notifications'
  | 'aide';

interface CandidatureEntry {
  key: string;
  dossier: CandidateDossier;
  choice: SubjectChoice;
  subject: ThesisSubject | undefined;
}

function downloadCsvFile(filename: string, headers: string[], rows: string[][]): void {
  const escapeCsv = (val: string) => `"${String(val ?? '').replace(/"/g, '""')}"`;
  const csvLines = [
    headers.map(escapeCsv).join(';'),
    ...rows.map((r) => r.map(escapeCsv).join(';')),
  ];
  const blob = new Blob(['\uFEFF' + csvLines.join('\n')], {
    type: 'text/csv;charset=utf-8;',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export const CommissionWorkspace: React.FC = () => {
  const {
    currentUser,
    dossiers,
    subjects,
    notifications,
    campaignConfig,
    navigationFocus,
    clearNavigationFocus,
    openNotificationTarget,
    markNotificationRead,
    markAllNotificationsRead,
    setPreselectionDecision,
    scheduleCandidateInterview,
    saveCandidateEvaluation,
    setCommissionFinalDecision,
    callNextOnWaitlist,
    requestDocumentCorrection,
  } = useGCD();

  const [activeTab, setActiveTab] = useState<CommissionTab>('candidatures');
  const [notifFilter, setNotifFilter] = useState<'all' | 'unread'>('all');
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<string>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const submittedDossiers = useMemo(
    () => dossiers.filter((d) => d.status !== 'brouillon'),
    [dossiers]
  );

  const allCandidatureEntries: CandidatureEntry[] = useMemo(() => {
    const list: CandidatureEntry[] = [];
    for (const dossier of submittedDossiers) {
      const sortedChoices = [...dossier.subjectChoices].sort(
        (a, b) => a.priority - b.priority
      );
      for (const choice of sortedChoices) {
        const subject = subjects.find((s) => s.id === choice.subjectId);
        list.push({
          key: `${dossier.id}::${choice.subjectId}`,
          dossier,
          choice,
          subject,
        });
      }
    }
    return list;
  }, [submittedDossiers, subjects]);

  const [selectedEntryKey, setSelectedEntryKey] = useState<string>(
    allCandidatureEntries[0]?.key || ''
  );

  const filteredEntries = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return allCandidatureEntries.filter((entry) => {
      if (
        selectedSubjectFilter !== 'ALL' &&
        entry.choice.subjectId !== selectedSubjectFilter
      ) {
        return false;
      }
      if (
        priorityFilter !== 'ALL' &&
        String(entry.choice.priority) !== priorityFilter
      ) {
        return false;
      }
      if (statusFilter !== 'ALL' && entry.choice.status !== statusFilter) {
        return false;
      }
      if (!q) return true;
      const d = entry.dossier;
      const fullName = `${d.personalInfo.firstName} ${d.personalInfo.lastName}`.toLowerCase();
      return (
        fullName.includes(q) ||
        d.dossierNumber.toLowerCase().includes(q) ||
        d.personalInfo.cne.toLowerCase().includes(q) ||
        d.personalInfo.cin.toLowerCase().includes(q) ||
        d.academicInfo.masterInstitution.toLowerCase().includes(q) ||
        (entry.subject?.code.toLowerCase().includes(q) ?? false)
      );
    });
  }, [
    allCandidatureEntries,
    selectedSubjectFilter,
    priorityFilter,
    statusFilter,
    searchQuery,
  ]);

  const selectedEntry: CandidatureEntry | undefined = useMemo(
    () =>
      allCandidatureEntries.find((e) => e.key === selectedEntryKey) ||
      filteredEntries[0] ||
      allCandidatureEntries[0],
    [allCandidatureEntries, filteredEntries, selectedEntryKey]
  );

  // Evaluation & scheduling form states
  const [preselectionNote, setPreselectionNote] = useState('');
  const [intDate, setIntDate] = useState('2026-11-14');
  const [intTime, setIntTime] = useState('10:00');
  const [intModality, setIntModality] = useState<'presentiel' | 'distanciel'>('presentiel');
  const [intLocation, setIntLocation] = useState(
    'Salle des Soutenances CEDoc — FSDM Dhar El Mehraz, Fès'
  );
  const [intJury, setIntJury] = useState(
    `${currentUser?.fullName || 'Pr. Hassan Ouazzani'}, Pr. Sanae Bekkali`
  );
  const [intInstructions, setIntInstructions] = useState(
    'Présentation orale de 10 minutes suivie d’échanges scientifiques.'
  );

  const [acadScore, setAcadScore] = useState('15.0');
  const [oralScore, setOralScore] = useState('15.0');
  const [evalObs, setEvalObs] = useState('');
  const [waitlistRankInput, setWaitlistRankInput] = useState('1');
  const [rejectionReasonInput, setRejectionReasonInput] = useState('');

  const [previewDoc, setPreviewDoc] = useState<{
    doc: UploadedDocument;
    label: string;
    candidateName: string;
  } | null>(null);

  const [bannerMsg, setBannerMsg] = useState<string | null>(null);
  const [rankingSubjectId, setRankingSubjectId] = useState<string>(subjects[0]?.id || '');

  // Document correction inline form state (Commission)
  const [commCorrReqId, setCommCorrReqId] = useState<string | null>(null);
  const [commCorrReason, setCommCorrReason] = useState('');
  const [commCorrDeadline, setCommCorrDeadline] = useState(() =>
    addDaysISO(getTodayISO(), campaignConfig.deadlinePolicy.defaultCorrectionDays)
  );

  useEffect(() => {
    if (!navigationFocus) return;
    const validTabs: CommissionTab[] = [
      'sujets_groupes',
      'candidatures',
      'entretiens',
      'classement',
      'notifications',
      'aide',
    ];
    if (validTabs.includes(navigationFocus.tab as CommissionTab)) {
      setActiveTab(navigationFocus.tab as CommissionTab);
    }
    if (navigationFocus.dossierId) {
      setSearchQuery('');
      setSelectedSubjectFilter('ALL');
      setPriorityFilter('ALL');
      setStatusFilter('ALL');
      if (navigationFocus.subjectId) {
        setSelectedEntryKey(`${navigationFocus.dossierId}::${navigationFocus.subjectId}`);
      } else {
        const firstEntry = allCandidatureEntries.find(
          (e) => e.dossier.id === navigationFocus.dossierId
        );
        if (firstEntry) setSelectedEntryKey(firstEntry.key);
      }
    }
    clearNavigationFocus();
  }, [navigationFocus, allCandidatureEntries, clearNavigationFocus]);

  useEffect(() => {
    if (!selectedEntry) return;
    const { dossier, choice } = selectedEntry;
    setCommCorrReqId(null);
    setPreselectionNote(choice.preselectionNote || '');
    if (choice.interview) {
      setIntDate(choice.interview.date);
      setIntTime(choice.interview.time);
      setIntModality(choice.interview.modality);
      setIntLocation(choice.interview.location);
      setIntJury(choice.interview.juryMembers);
      setIntInstructions(choice.interview.instructions);
    } else {
      setIntDate('2026-11-14');
      setIntTime('10:00');
      setIntModality('presentiel');
      setIntLocation('Salle des Soutenances CEDoc — FSDM Dhar El Mehraz, Fès');
      setIntJury(`${currentUser?.fullName || 'Pr. Hassan Ouazzani'}, Pr. Sanae Bekkali`);
    }

    if (choice.evaluation) {
      setAcadScore(String(choice.evaluation.academicScore));
      setOralScore(String(choice.evaluation.interviewScore));
      setEvalObs(choice.evaluation.observations);
    } else {
      setAcadScore(dossier.academicInfo.masterAverage || '14.5');
      setOralScore('15.0');
      setEvalObs('');
    }
    setWaitlistRankInput(String(choice.waitlistRank || 1));
    setRejectionReasonInput(choice.rejectionReason || '');
  }, [selectedEntry?.key, currentUser?.fullName]);

  const pendingPreselectionCount = allCandidatureEntries.filter(
    (e) => e.choice.status === 'soumis'
  ).length;

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

  const scheduledInterviews = useMemo(
    () =>
      allCandidatureEntries
        .filter((e) => Boolean(e.choice.interview))
        .sort((a, b) => {
          const da = `${a.choice.interview?.date || ''}T${a.choice.interview?.time || ''}`;
          const db = `${b.choice.interview?.date || ''}T${b.choice.interview?.time || ''}`;
          return da.localeCompare(db);
        }),
    [allCandidatureEntries]
  );

  const navItems: NavItem[] = [
    {
      id: 'candidatures',
      label: 'Candidatures',
      icon: <ClipboardCheck className="w-4 h-4" />,
      badgeCount: pendingPreselectionCount,
      badgeTone: 'neutral',
    },
    {
      id: 'sujets_groupes',
      label: 'Par sujet',
      icon: <Layers className="w-4 h-4" />,
    },
    {
      id: 'entretiens',
      label: 'Entretiens',
      icon: <Calendar className="w-4 h-4" />,
      badgeCount: scheduledInterviews.length,
    },
    {
      id: 'classement',
      label: 'Classement',
      icon: <Award className="w-4 h-4" />,
    },
    {
      id: 'notifications',
      label: 'Notifications',
      icon: <Bell className="w-4 h-4" />,
      badgeCount: unreadNotifCount,
      badgeTone: hasUrgentUnread ? 'alert' : 'neutral',
    },
    {
      id: 'aide',
      label: 'Aide & Support',
      icon: <HelpCircle className="w-4 h-4" />,
    },
  ];

  const liveWeightedPreview = useMemo(() => {
    const a = Number.parseFloat(acadScore.replace(',', '.'));
    const o = Number.parseFloat(oralScore.replace(',', '.'));
    if (Number.isNaN(a) || Number.isNaN(o)) return null;
    const { dossierWeight, interviewWeight } = campaignConfig;
    return (
      (a * dossierWeight + o * interviewWeight) /
      Math.max(1, dossierWeight + interviewWeight)
    ).toFixed(2);
  }, [acadScore, oralScore, campaignConfig]);

  const handleSaveInterview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEntry) return;
    const { modified } = scheduleCandidateInterview(
      selectedEntry.dossier.id,
      selectedEntry.choice.subjectId,
      {
        date: intDate,
        time: intTime,
        modality: intModality,
        location: intLocation,
        juryMembers: intJury,
        instructions: intInstructions,
      }
    );
    setBannerMsg(
      modified
        ? `Entretien modifié et candidat notifié (${selectedEntry.dossier.personalInfo.firstName} ${selectedEntry.dossier.personalInfo.lastName} · ${formatDateFR(intDate)} à ${intTime}).`
        : `Convocation envoyée (${selectedEntry.dossier.personalInfo.firstName} ${selectedEntry.dossier.personalInfo.lastName} · ${formatDateFR(intDate)} à ${intTime}).`
    );
  };

  const handleSaveEvaluation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEntry) return;
    const a = Math.min(20, Math.max(0, Number.parseFloat(acadScore.replace(',', '.')) || 0));
    const o = Math.min(20, Math.max(0, Number.parseFloat(oralScore.replace(',', '.')) || 0));
    saveCandidateEvaluation(
      selectedEntry.dossier.id,
      selectedEntry.choice.subjectId,
      a,
      o,
      evalObs,
      currentUser?.fullName || 'Commission'
    );
    setBannerMsg('Notes enregistrées.');
  };

  const handleExportSubjectCandidatesCsv = (subject: ThesisSubject) => {
    const entries = allCandidatureEntries
      .filter((e) => e.choice.subjectId === subject.id)
      .sort((a, b) => a.choice.priority - b.choice.priority);

    downloadCsvFile(
      `Candidatures_${subject.code}.csv`,
      [
        'N° Dossier',
        'Nom',
        'Prénom',
        'CIN',
        'CNE / Massar',
        'E-mail',
        'Téléphone',
        'Ordre du vœu',
        'Code Sujet',
        'Diplôme Bac+5',
        'Établissement Bac+5',
        'Moyenne Bac+5 (/20)',
        'Statut',
        'Note Dossier (/20)',
        'Note Entretien (/20)',
        'Note Finale (/20)',
      ],
      entries.map(({ dossier, choice }) => [
        dossier.dossierNumber,
        dossier.personalInfo.lastName,
        dossier.personalInfo.firstName,
        dossier.personalInfo.cin,
        dossier.personalInfo.cne,
        dossier.personalInfo.email,
        dossier.personalInfo.phone,
        `Choix ${choice.priority}`,
        subject.code,
        dossier.academicInfo.masterTitle,
        dossier.academicInfo.masterInstitution,
        dossier.academicInfo.masterAverage,
        getStatusPresentation(choice.status).shortLabel,
        choice.evaluation ? choice.evaluation.academicScore.toFixed(2) : '',
        choice.evaluation ? choice.evaluation.interviewScore.toFixed(2) : '',
        choice.evaluation ? choice.evaluation.weightedScore.toFixed(2) : '',
      ])
    );

    setBannerMsg(`CSV exporté (${subject.code}).`);
  };

  const rankingSubject = subjects.find((s) => s.id === rankingSubjectId) || subjects[0];
  const rankingEntries = useMemo(() => {
    if (!rankingSubject) return [];
    return allCandidatureEntries
      .filter((e) => e.choice.subjectId === rankingSubject.id)
      .sort((a, b) => {
        const scoreA = a.choice.evaluation?.weightedScore ?? -1;
        const scoreB = b.choice.evaluation?.weightedScore ?? -1;
        if (scoreB !== scoreA) return scoreB - scoreA;
        return a.choice.priority - b.choice.priority;
      });
  }, [allCandidatureEntries, rankingSubject]);

  const hasFilters =
    searchQuery.trim() !== '' ||
    selectedSubjectFilter !== 'ALL' ||
    priorityFilter !== 'ALL' ||
    statusFilter !== 'ALL';

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedSubjectFilter('ALL');
    setPriorityFilter('ALL');
    setStatusFilter('ALL');
  };

  return (
    <WorkspaceShell
      workspaceTitle="Commission de sélection"
      activeTab={activeTab}
      onSelectTab={(id) => setActiveTab(id as CommissionTab)}
      navItems={navItems}
      headerAction={
        <span className="text-xs text-slate-500 hidden sm:inline truncate max-w-xs">
          {currentUser?.laboratoire || 'USMBA – Fès'}
        </span>
      }
    >
      <div className="space-y-5">
        {bannerMsg && (
          <div className="px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs sm:text-sm text-emerald-950 flex items-center justify-between gap-4">
            <span className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
              {bannerMsg}
            </span>
            <button
              type="button"
              onClick={() => setBannerMsg(null)}
              className="text-xs font-semibold underline shrink-0 cursor-pointer"
            >
              Fermer
            </button>
          </div>
        )}

        {/* TAB: PAR SUJET */}
        {activeTab === 'sujets_groupes' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <h1 className="text-lg sm:text-xl font-bold text-slate-900">
                Candidatures par sujet
              </h1>
              <span className="text-xs font-mono text-slate-500 tabular-nums">
                {submittedDossiers.length} dossiers · {allCandidatureEntries.length} vœux
              </span>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-semibold">
                      <th className="py-3 px-4">Sujet</th>
                      <th className="py-3 px-4">Encadrant & Laboratoire</th>
                      <th className="py-3 px-4 text-right">Places</th>
                      <th className="py-3 px-4 text-right">Candidatures (C1·C2·C3)</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {subjects.map((suj) => {
                      const entries = allCandidatureEntries.filter(
                        (e) => e.choice.subjectId === suj.id
                      );
                      const c1 = entries.filter((e) => e.choice.priority === 1).length;
                      const c2 = entries.filter((e) => e.choice.priority === 2).length;
                      const c3 = entries.filter((e) => e.choice.priority >= 3).length;

                      return (
                        <tr key={suj.id} className="hover:bg-slate-50">
                          <td className="py-3.5 px-4 max-w-sm">
                            <span className="font-mono font-semibold text-blue-700">
                              {suj.code}
                            </span>
                            <p className="font-semibold text-slate-900 line-clamp-1 mt-0.5">
                              {suj.title}
                            </p>
                          </td>
                          <td className="py-3.5 px-4 max-w-[240px]">
                            <p className="font-medium text-slate-900 truncate">{suj.supervisor}</p>
                            <p className="text-slate-500 truncate">{suj.laboratoire}</p>
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono font-semibold text-slate-900 tabular-nums">
                            {suj.places}
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono tabular-nums whitespace-nowrap">
                            <span className="font-bold text-slate-900">{entries.length}</span>{' '}
                            <span className="text-slate-400">
                              ({c1}·{c2}·{c3})
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right whitespace-nowrap">
                            <div className="inline-flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleExportSubjectCandidatesCsv(suj)}
                                className="px-2.5 py-1.5 font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors inline-flex items-center gap-1 cursor-pointer"
                              >
                                <Download className="w-3.5 h-3.5" />
                                CSV
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedSubjectFilter(suj.id);
                                  const first = allCandidatureEntries.find(
                                    (e) => e.choice.subjectId === suj.id
                                  );
                                  if (first) setSelectedEntryKey(first.key);
                                  setActiveTab('candidatures');
                                }}
                                className="px-3 py-1.5 font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-md transition-colors cursor-pointer"
                              >
                                Examiner ({entries.length})
                              </button>
                            </div>
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

        {/* TAB: EXAMEN DES CANDIDATURES */}
        {activeTab === 'candidatures' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h1 className="text-lg sm:text-xl font-bold text-slate-900">Candidatures</h1>
              <div className="flex items-center gap-3 text-xs text-slate-500">
                {hasFilters && (
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="font-medium text-blue-700 hover:underline inline-flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Réinitialiser
                  </button>
                )}
                <span className="font-mono tabular-nums">
                  Pondération {campaignConfig.dossierWeight}% / {campaignConfig.interviewWeight}% · Seuil{' '}
                  {campaignConfig.minMasterAverage}/20
                </span>
              </div>
            </div>

            {/* Filter Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 p-3 bg-white border border-slate-200 rounded-xl">
              <div className="sm:col-span-2 lg:col-span-4 relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Nom, N° dossier, CNE, CIN..."
                  className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
              <div className="lg:col-span-4">
                <select
                  value={selectedSubjectFilter}
                  onChange={(e) => setSelectedSubjectFilter(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg"
                >
                  <option value="ALL">Tous les sujets ({allCandidatureEntries.length})</option>
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.code} — {s.title.slice(0, 42)}...
                    </option>
                  ))}
                </select>
              </div>
              <div className="lg:col-span-2">
                <select
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg"
                >
                  <option value="ALL">Tous les choix</option>
                  <option value="1">Choix 1</option>
                  <option value="2">Choix 2</option>
                  <option value="3">Choix 3</option>
                </select>
              </div>
              <div className="lg:col-span-2">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg"
                >
                  <option value="ALL">Tous statuts</option>
                  <option value="soumis">Soumis</option>
                  <option value="en_cours">Présélectionné</option>
                  <option value="entretien">Entretien</option>
                  <option value="admis">Admis</option>
                  <option value="liste_attente">Liste d’attente</option>
                  <option value="non_retenu">Non retenu</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
              {/* Left List */}
              <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl divide-y divide-slate-200">
                <div className="px-4 py-3 flex items-center justify-between text-xs font-semibold text-slate-600">
                  <span>Candidatures ({filteredEntries.length})</span>
                  <span>Bac+5</span>
                </div>

                {filteredEntries.length === 0 ? (
                  <div className="p-8 text-center text-sm text-slate-500">Aucun résultat.</div>
                ) : (
                  <div className="divide-y divide-slate-200 max-h-[720px] overflow-y-auto">
                    {filteredEntries.map((entry) => {
                      const { dossier: d, choice, subject: suj } = entry;
                      const isSelected = selectedEntry?.key === entry.key;
                      const st = getStatusPresentation(choice.status);
                      const hasPendingCorr =
                        d.documents.some((doc) => doc.status === 'a_corriger') ||
                        (d.correctionRequests || []).some((r) => r.status === 'pending');
                      const hasResubmitted = (d.correctionRequests || []).some(
                        (r) => r.status === 'resubmitted'
                      );
                      return (
                        <button
                          key={entry.key}
                          type="button"
                          onClick={() => setSelectedEntryKey(entry.key)}
                          className={`w-full text-left px-4 py-3.5 transition-colors cursor-pointer ${
                            isSelected ? 'bg-blue-50/60' : 'hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-slate-900 truncate">
                                {d.personalInfo.firstName} {d.personalInfo.lastName}
                              </p>
                              <p className="text-xs text-slate-500 font-mono mt-0.5 truncate">
                                Choix {choice.priority} ·{' '}
                                <span className="font-semibold text-blue-700">
                                  {suj?.code || choice.subjectId}
                                </span>
                                {hasPendingCorr && (
                                  <span className="text-red-700 font-sans font-medium">
                                    {' '}
                                    · Pièce à corriger
                                  </span>
                                )}
                                {!hasPendingCorr && hasResubmitted && (
                                  <span className="text-blue-700 font-sans font-medium">
                                    {' '}
                                    · Corrigé déposé
                                  </span>
                                )}
                              </p>
                            </div>
                            <span className="text-xs font-mono font-bold text-slate-900 tabular-nums shrink-0">
                              {d.academicInfo.masterAverage}/20
                            </span>
                          </div>
                          <div className="mt-1.5 flex items-center justify-between text-xs">
                            <span className="text-slate-500 truncate">
                              {d.academicInfo.masterInstitution}
                            </span>
                            <span className={`font-semibold shrink-0 ml-2 ${st.textClass}`}>
                              {st.shortLabel}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Right Evaluation Panel */}
              <div className="lg:col-span-7">
                {selectedEntry ? (
                  <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-200">
                    {/* Candidate Header */}
                    <div className="p-5 space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-xs font-mono text-slate-500">
                          {selectedEntry.dossier.dossierNumber} · CNE{' '}
                          {selectedEntry.dossier.personalInfo.cne} · CIN{' '}
                          {selectedEntry.dossier.personalInfo.cin}
                        </span>
                        <span
                          className={`text-xs font-semibold ${
                            getStatusPresentation(selectedEntry.choice.status).textClass
                          }`}
                        >
                          {getStatusPresentation(selectedEntry.choice.status).label}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <h2 className="text-lg font-bold text-slate-900">
                          {selectedEntry.dossier.personalInfo.firstName}{' '}
                          {selectedEntry.dossier.personalInfo.lastName}
                        </h2>
                        {(selectedEntry.dossier.personalInfo.firstNameAr ||
                          selectedEntry.dossier.personalInfo.lastNameAr) && (
                          <span className="text-sm text-slate-500" dir="rtl">
                            {selectedEntry.dossier.personalInfo.firstNameAr}{' '}
                            {selectedEntry.dossier.personalInfo.lastNameAr}
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-600">
                        {selectedEntry.dossier.personalInfo.email} ·{' '}
                        {selectedEntry.dossier.personalInfo.phone} ·{' '}
                        {selectedEntry.dossier.personalInfo.employmentStatus === 'etudiant'
                          ? 'Étudiant(e)'
                          : `${selectedEntry.dossier.personalInfo.employmentStatus} (${
                              selectedEntry.dossier.personalInfo.employerName || '—'
                            })`}
                      </p>
                    </div>

                    {/* 3 Wishes Switcher */}
                    <div className="p-5 space-y-2.5 bg-slate-50/50">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        {[...selectedEntry.dossier.subjectChoices]
                          .sort((a, b) => a.priority - b.priority)
                          .map((ch) => {
                            const s = subjects.find((item) => item.id === ch.subjectId);
                            const active = ch.subjectId === selectedEntry.choice.subjectId;
                            const st = getStatusPresentation(ch.status);
                            return (
                              <button
                                key={ch.subjectId}
                                type="button"
                                onClick={() =>
                                  setSelectedEntryKey(`${selectedEntry.dossier.id}::${ch.subjectId}`)
                                }
                                className={`text-left p-2.5 rounded-lg border transition-colors cursor-pointer ${
                                  active
                                    ? 'bg-white border-blue-600 ring-1 ring-blue-600'
                                    : 'bg-white border-slate-200 hover:border-slate-300'
                                }`}
                              >
                                <div className="flex items-center justify-between text-xs">
                                  <span className="font-mono font-bold text-slate-900">
                                    Choix {ch.priority}
                                  </span>
                                  <span className={`font-semibold ${st.textClass}`}>
                                    {st.shortLabel}
                                  </span>
                                </div>
                                <p className="text-xs font-mono text-blue-700 mt-0.5 truncate">
                                  {s?.code || ch.subjectId}
                                </p>
                              </button>
                            );
                          })}
                      </div>

                      {selectedEntry.subject && (
                        <p className="text-xs text-slate-700 pt-1">
                          <strong className="text-slate-900">{selectedEntry.subject.title}</strong>{' '}
                          · {selectedEntry.subject.supervisor}
                        </p>
                      )}
                    </div>

                    {/* Concise Academic Table & Documents */}
                    <div className="p-5 space-y-4">
                      <div className="grid grid-cols-3 divide-x divide-slate-200 border border-slate-200 rounded-lg text-xs">
                        <div className="p-2.5">
                          <span className="text-slate-500 block">
                            Bac ({selectedEntry.dossier.academicInfo.bacYear})
                          </span>
                          <strong className="font-mono text-slate-900 tabular-nums">
                            {selectedEntry.dossier.academicInfo.bacAverage}/20
                          </strong>
                        </div>
                        <div className="p-2.5">
                          <span className="text-slate-500 block truncate">
                            Licence ({selectedEntry.dossier.academicInfo.licenceInstitution})
                          </span>
                          <strong className="font-mono text-slate-900 tabular-nums">
                            {selectedEntry.dossier.academicInfo.licenceAverage}/20
                          </strong>
                        </div>
                        <div className="p-2.5">
                          <span className="text-slate-500 block truncate">
                            {selectedEntry.dossier.academicInfo.masterType}
                          </span>
                          <strong className="font-mono text-blue-700 tabular-nums">
                            {selectedEntry.dossier.academicInfo.masterAverage}/20
                          </strong>
                        </div>
                      </div>

                      <div className="text-xs space-y-1 text-slate-700">
                        <p>
                          <strong className="text-slate-900">Diplôme :</strong>{' '}
                          {selectedEntry.dossier.academicInfo.masterTitle} (
                          {selectedEntry.dossier.academicInfo.masterInstitution},{' '}
                          {selectedEntry.dossier.academicInfo.masterYear})
                        </p>
                        <p>
                          <strong className="text-slate-900">PFE :</strong>{' '}
                          {selectedEntry.dossier.academicInfo.pfeTitle}
                        </p>
                        <p className="text-slate-600">
                          <strong className="text-slate-900">Motivation :</strong>{' '}
                          {selectedEntry.dossier.motivation}
                        </p>
                      </div>

                      {/* Documents & Demande de correction */}
                      <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg">
                        <div className="px-3 py-2 bg-slate-50/70 flex items-center justify-between text-xs">
                          <span className="font-semibold text-slate-700">
                            Pièces du dossier (préinscription)
                          </span>
                          <span className="text-slate-500">
                            Signalez toute pièce manquante ou non conforme
                          </span>
                        </div>
                        {campaignConfig.documentRequirements
                          .filter(
                            (r) =>
                              r.stage === 'preinscription' ||
                              selectedEntry.dossier.documents.some((d) => d.requirementId === r.id) ||
                              (selectedEntry.dossier.correctionRequests || []).some(
                                (cr) => cr.requirementId === r.id
                              )
                          )
                          .map((req) => {
                            const doc = selectedEntry.dossier.documents.find(
                              (d) => d.requirementId === req.id
                            );
                            const activeCorr = getActiveCorrectionRequest(
                              selectedEntry.dossier,
                              req.id
                            );
                            const resubmittedCorr = (
                              selectedEntry.dossier.correctionRequests || []
                            ).find((cr) => cr.requirementId === req.id && cr.status === 'resubmitted');
                            const effectiveStatus = doc
                              ? doc.status
                              : activeCorr
                              ? 'a_corriger'
                              : 'manquante';
                            const pres = getDocStatusPresentation(effectiveStatus);
                            const deadlineISO = activeCorr?.deadline || doc?.correctionDeadline;
                            const deadlineInfo = computeDeadlineInfo(deadlineISO);
                            const isEditingCorr = commCorrReqId === req.id;

                            return (
                              <div key={req.id} className="px-3 py-2.5 space-y-2 text-xs">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <div className="min-w-0 space-y-0.5">
                                    <div className="flex flex-wrap items-center gap-1.5">
                                      <span className="font-mono font-semibold text-slate-900">
                                        {req.code}
                                      </span>
                                      <span className="text-slate-400">·</span>
                                      <span className="text-slate-700 truncate">{req.label}</span>
                                      <span className="text-slate-400">·</span>
                                      <span className={`font-semibold ${pres.textClass}`}>
                                        {pres.label}
                                      </span>
                                      {resubmittedCorr && doc?.status === 'deposee' && (
                                        <>
                                          <span className="text-slate-400">·</span>
                                          <span className="font-semibold text-blue-700">
                                            Nouvelle version déposée
                                          </span>
                                        </>
                                      )}
                                    </div>
                                    {doc ? (
                                      <p className="text-slate-500 font-mono truncate">
                                        {doc.fileName} ({formatFileSize(doc.fileSizeKB)})
                                      </p>
                                    ) : (
                                      <p className="text-amber-700">Aucun fichier déposé</p>
                                    )}
                                    {(activeCorr?.reason || doc?.reviewComment) &&
                                      effectiveStatus === 'a_corriger' && (
                                        <p className="text-red-700">
                                          Motif : {activeCorr?.reason || doc?.reviewComment}
                                          {deadlineISO && (
                                            <span className="font-mono">
                                              {' '}
                                              · Échéance {formatDateFR(deadlineISO)}
                                              {deadlineInfo
                                                ? ` (${deadlineInfo.shortCountdown})`
                                                : ''}
                                            </span>
                                          )}
                                        </p>
                                      )}
                                  </div>

                                  <div className="flex items-center gap-1.5 shrink-0">
                                    {doc && (
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setPreviewDoc({
                                            doc,
                                            label: req.label,
                                            candidateName: `${selectedEntry.dossier.personalInfo.firstName} ${selectedEntry.dossier.personalInfo.lastName}`,
                                          })
                                        }
                                        className="px-2.5 py-1 font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded transition-colors inline-flex items-center gap-1 cursor-pointer"
                                      >
                                        <Eye className="w-3.5 h-3.5" />
                                        Voir
                                      </button>
                                    )}
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (isEditingCorr) {
                                          setCommCorrReqId(null);
                                        } else {
                                          setCommCorrReqId(req.id);
                                          setCommCorrReason(
                                            activeCorr?.reason ||
                                              doc?.reviewComment ||
                                              (doc
                                                ? `Votre ${req.label.toLowerCase()} est incomplet ou illisible.`
                                                : `Pièce manquante : veuillez déposer ${req.label.toLowerCase()}.`)
                                          );
                                          setCommCorrDeadline(
                                            activeCorr?.deadline ||
                                              addDaysISO(
                                                getTodayISO(),
                                                campaignConfig.deadlinePolicy.defaultCorrectionDays
                                              )
                                          );
                                        }
                                      }}
                                      className="px-2.5 py-1 font-semibold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded transition-colors cursor-pointer"
                                    >
                                      {doc ? 'À corriger' : 'Signaler'}
                                    </button>
                                  </div>
                                </div>

                                {isEditingCorr && (
                                  <div className="p-2.5 rounded-lg bg-red-50/60 border border-red-200 space-y-2">
                                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                                      <input
                                        type="text"
                                        value={commCorrReason}
                                        onChange={(e) => setCommCorrReason(e.target.value)}
                                        placeholder="Motif précis du refus ou de la correction..."
                                        className="sm:col-span-8 px-2.5 py-1.5 text-xs bg-white border border-red-300 rounded-md"
                                      />
                                      <input
                                        type="date"
                                        aria-label="Date limite de régularisation"
                                        value={commCorrDeadline}
                                        onChange={(e) => setCommCorrDeadline(e.target.value)}
                                        className="sm:col-span-4 px-2.5 py-1.5 text-xs font-mono bg-white border border-red-300 rounded-md"
                                      />
                                    </div>
                                    <div className="flex items-center justify-end gap-2">
                                      <button
                                        type="button"
                                        onClick={() => setCommCorrReqId(null)}
                                        className="px-2.5 py-1 text-xs text-slate-600 cursor-pointer"
                                      >
                                        Annuler
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const res = requestDocumentCorrection(
                                            selectedEntry.dossier.id,
                                            req.id,
                                            commCorrReason,
                                            commCorrDeadline
                                          );
                                          if (res.ok) {
                                            setCommCorrReqId(null);
                                            setBannerMsg(
                                              `Demande de correction envoyée au candidat (échéance : ${formatDateFR(res.deadline)}).`
                                            );
                                          }
                                        }}
                                        className="px-3 py-1 text-xs font-semibold text-white bg-red-700 hover:bg-red-800 rounded-md cursor-pointer"
                                      >
                                        Notifier le candidat
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                      </div>
                    </div>

                    {/* 1. Présélection */}
                    <div className="p-5 space-y-2.5">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                        1. Présélection
                      </h3>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <input
                          type="text"
                          value={preselectionNote}
                          onChange={(e) => setPreselectionNote(e.target.value)}
                          placeholder="Observation ou motif (optionnel)..."
                          className="flex-1 px-3 py-1.5 text-xs border border-slate-200 rounded-lg"
                        />
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              setPreselectionDecision(
                                selectedEntry.dossier.id,
                                selectedEntry.choice.subjectId,
                                true,
                                preselectionNote
                              );
                              setBannerMsg('Candidat présélectionné.');
                            }}
                            className="px-3 py-1.5 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                          >
                            <UserCheck className="w-3.5 h-3.5" />
                            Retenir
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setPreselectionDecision(
                                selectedEntry.dossier.id,
                                selectedEntry.choice.subjectId,
                                false,
                                preselectionNote || 'Prérequis insuffisants.'
                              );
                              setBannerMsg('Vœu refusé.');
                            }}
                            className="px-3 py-1.5 text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            Refuser
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* 2. Entretien */}
                    <form onSubmit={handleSaveInterview} className="p-5 space-y-2.5">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                        2. Convocation à l’entretien
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                        <input
                          type="date"
                          aria-label="Date d'entretien"
                          value={intDate}
                          onChange={(e) => setIntDate(e.target.value)}
                          className="px-3 py-1.5 text-xs font-mono border border-slate-200 rounded-lg"
                        />
                        <input
                          type="time"
                          aria-label="Heure d'entretien"
                          value={intTime}
                          onChange={(e) => setIntTime(e.target.value)}
                          className="px-3 py-1.5 text-xs font-mono border border-slate-200 rounded-lg"
                        />
                        <select
                          aria-label="Modalité"
                          value={intModality}
                          onChange={(e) =>
                            setIntModality(e.target.value as 'presentiel' | 'distanciel')
                          }
                          className="px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg"
                        >
                          <option value="presentiel">Présentiel</option>
                          <option value="distanciel">Visioconférence</option>
                        </select>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <input
                          type="text"
                          value={intLocation}
                          onChange={(e) => setIntLocation(e.target.value)}
                          placeholder="Salle ou lien..."
                          className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg"
                        />
                        <input
                          type="text"
                          value={intJury}
                          onChange={(e) => setIntJury(e.target.value)}
                          placeholder="Membres du jury..."
                          className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg"
                        />
                      </div>
                      <button
                        type="submit"
                        className="px-3.5 py-1.5 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <Calendar className="w-3.5 h-3.5 text-blue-700" />
                        {selectedEntry.choice.interview
                          ? 'Modifier l’entretien'
                          : 'Convoquer le candidat'}
                      </button>
                    </form>

                    {/* 3. Notes & Décision finale */}
                    <div className="p-5 space-y-4">
                      <form onSubmit={handleSaveEvaluation} className="space-y-2.5">
                        <div className="flex items-center justify-between">
                          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                            3. Notes & Décision
                          </h3>
                          {liveWeightedPreview && (
                            <span className="text-xs font-mono font-bold text-blue-700 tabular-nums">
                              Moyenne : {liveWeightedPreview}/20
                            </span>
                          )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          <div>
                            <label className="block text-xs text-slate-600 mb-1">
                              Note dossier (/20 · {campaignConfig.dossierWeight}%)
                            </label>
                            <input
                              type="number"
                              step="0.25"
                              min="0"
                              max="20"
                              value={acadScore}
                              onChange={(e) => setAcadScore(e.target.value)}
                              className="w-full px-3 py-1.5 text-xs font-mono border border-slate-200 rounded-lg"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-slate-600 mb-1">
                              Note entretien (/20 · {campaignConfig.interviewWeight}%)
                            </label>
                            <input
                              type="number"
                              step="0.25"
                              min="0"
                              max="20"
                              value={oralScore}
                              onChange={(e) => setOralScore(e.target.value)}
                              className="w-full px-3 py-1.5 text-xs font-mono border border-slate-200 rounded-lg"
                            />
                          </div>
                        </div>

                        {Number.parseFloat(oralScore) <
                          campaignConfig.eliminatoryInterviewScore && (
                          <p className="text-xs text-red-700 font-medium">
                            Note inférieure au seuil éliminatoire (
                            {campaignConfig.eliminatoryInterviewScore}/20).
                          </p>
                        )}

                        <div className="flex flex-col sm:flex-row gap-2">
                          <input
                            type="text"
                            value={evalObs}
                            onChange={(e) => setEvalObs(e.target.value)}
                            placeholder="Appréciation du jury..."
                            className="flex-1 px-3 py-1.5 text-xs border border-slate-200 rounded-lg"
                          />
                          <button
                            type="submit"
                            className="px-3.5 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                          >
                            Enregistrer les notes
                          </button>
                        </div>
                      </form>

                      <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setCommissionFinalDecision(
                              selectedEntry.dossier.id,
                              selectedEntry.choice.subjectId,
                              'admis'
                            );
                            setBannerMsg('Candidat admis en liste principale.');
                          }}
                          className="px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors cursor-pointer"
                        >
                          Admettre
                        </button>

                        <div className="inline-flex items-center gap-1.5">
                          <input
                            type="number"
                            min="1"
                            max="20"
                            value={waitlistRankInput}
                            onChange={(e) => setWaitlistRankInput(e.target.value)}
                            aria-label="Rang liste d'attente"
                            className="w-14 px-2 py-1.5 text-xs font-mono border border-slate-200 rounded-lg"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const rank = Math.max(
                                1,
                                Number.parseInt(waitlistRankInput, 10) || 1
                              );
                              setCommissionFinalDecision(
                                selectedEntry.dossier.id,
                                selectedEntry.choice.subjectId,
                                'liste_attente',
                                { waitlistRank: rank }
                              );
                              setBannerMsg(`Classé en liste d’attente (rang ${rank}).`);
                            }}
                            className="px-3 py-1.5 text-xs font-semibold text-amber-900 bg-amber-100 hover:bg-amber-200 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
                          >
                            Liste d’attente
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setCommissionFinalDecision(
                              selectedEntry.dossier.id,
                              selectedEntry.choice.subjectId,
                              'non_retenu',
                              {
                                rejectionReason:
                                  rejectionReasonInput ||
                                  'Classement au-delà des places ouvertes.',
                              }
                            );
                            setBannerMsg('Candidature non retenue sur ce sujet.');
                          }}
                          className="px-3 py-1.5 text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-colors cursor-pointer"
                        >
                          Non retenu
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white border border-slate-200 rounded-xl p-10 text-center text-sm text-slate-500">
                    Sélectionnez une candidature.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB: ENTRETIENS */}
        {activeTab === 'entretiens' && (
          <div className="space-y-4">
            <h1 className="text-lg sm:text-xl font-bold text-slate-900">
              Planning des entretiens ({scheduledInterviews.length})
            </h1>

            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              {scheduledInterviews.length === 0 ? (
                <div className="p-8 text-center text-sm text-slate-500">
                  Aucun entretien programmé.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-semibold">
                        <th className="py-3 px-4">Date & Heure</th>
                        <th className="py-3 px-4">Candidat</th>
                        <th className="py-3 px-4">Sujet</th>
                        <th className="py-3 px-4">Lieu / Modalité</th>
                        <th className="py-3 px-4">Statut</th>
                        <th className="py-3 px-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {scheduledInterviews.map((entry) => {
                        const { dossier: d, choice, subject: suj } = entry;
                        const st = getStatusPresentation(choice.status);
                        return (
                          <tr key={entry.key} className="hover:bg-slate-50">
                            <td className="py-3 px-4 font-mono font-medium text-slate-900 whitespace-nowrap tabular-nums">
                              {choice.interview?.date} · {choice.interview?.time}
                            </td>
                            <td className="py-3 px-4 font-semibold text-slate-900">
                              {d.personalInfo.firstName} {d.personalInfo.lastName}
                              <span className="block font-mono font-normal text-slate-500">
                                {d.dossierNumber}
                              </span>
                            </td>
                            <td className="py-3 px-4 font-mono whitespace-nowrap">
                              <span className="font-semibold text-blue-700">
                                {suj?.code || choice.subjectId}
                              </span>{' '}
                              <span className="text-slate-500">· Choix {choice.priority}</span>
                            </td>
                            <td className="py-3 px-4 text-slate-600 max-w-xs truncate">
                              {choice.interview?.location}
                            </td>
                            <td className={`py-3 px-4 font-semibold ${st.textClass}`}>
                              {st.shortLabel}
                            </td>
                            <td className="py-3 px-4 text-right whitespace-nowrap">
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedEntryKey(entry.key);
                                  setActiveTab('candidatures');
                                }}
                                className="font-semibold text-blue-700 hover:underline cursor-pointer"
                              >
                                Ouvrir
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB: CLASSEMENT */}
        {activeTab === 'classement' && (
          <div className="space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <h1 className="text-lg sm:text-xl font-bold text-slate-900">Classement par sujet</h1>

              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={rankingSubject?.id || ''}
                  onChange={(e) => setRankingSubjectId(e.target.value)}
                  className="px-3 py-2 text-xs font-semibold bg-white border border-slate-200 rounded-lg"
                >
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.code} ({s.places} place{s.places > 1 ? 's' : ''}) —{' '}
                      {s.title.slice(0, 40)}...
                    </option>
                  ))}
                </select>

                {rankingSubject && (
                  <>
                    <button
                      type="button"
                      onClick={() => handleExportSubjectCandidatesCsv(rankingSubject)}
                      className="px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      CSV
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const res = callNextOnWaitlist(rankingSubject.id);
                        if (!res.ok) {
                          setBannerMsg(res.error || 'Aucun candidat sur liste d’attente.');
                        } else {
                          setBannerMsg(
                            `${res.promotedName} promu(e) en liste principale sur ${rankingSubject.code}.`
                          );
                        }
                      }}
                      className="px-3.5 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors whitespace-nowrap inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <Users className="w-3.5 h-3.5" />
                      Appeler suivant (Attente)
                    </button>
                  </>
                )}
              </div>
            </div>

            {rankingSubject && (
              <div className="px-4 py-3 rounded-xl bg-white border border-slate-200 text-xs text-slate-700 flex flex-wrap items-center justify-between gap-2">
                <span className="font-medium text-slate-900">{rankingSubject.title}</span>
                <span className="font-mono tabular-nums text-slate-600">
                  Places : <strong className="text-slate-900">{rankingSubject.places}</strong> · Admis :{' '}
                  <strong className="text-emerald-700">
                    {
                      rankingEntries.filter(
                        (e) =>
                          e.choice.status === 'admis' ||
                          (e.dossier.status === 'inscrit' &&
                            e.dossier.confirmedSubjectId === rankingSubject.id)
                      ).length
                    }
                  </strong>
                </span>
              </div>
            )}

            <div className="bg-white overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-semibold">
                    <th className="py-3 px-4">Rang</th>
                    <th className="py-3 px-4">Candidat</th>
                    <th className="py-3 px-4">Choix</th>
                    <th className="py-3 px-4 text-right">Dossier</th>
                    <th className="py-3 px-4 text-right">Entretien</th>
                    <th className="py-3 px-4 text-right">Moyenne</th>
                    <th className="py-3 px-4">Statut</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {rankingEntries.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-500">
                        Aucune candidature sur ce sujet.
                      </td>
                    </tr>
                  ) : (
                    rankingEntries.map((entry, index) => {
                      const { dossier: cand, choice } = entry;
                      const st = getStatusPresentation(choice.status);
                      return (
                        <tr key={entry.key} className="hover:bg-slate-50">
                          <td className="py-3 px-4 font-mono font-bold text-slate-700 tabular-nums">
                            #{index + 1}
                          </td>
                          <td className="py-3 px-4">
                            <p className="font-semibold text-slate-900">
                              {cand.personalInfo.firstName} {cand.personalInfo.lastName}
                            </p>
                            <p className="text-slate-500 font-mono">{cand.dossierNumber}</p>
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-700 whitespace-nowrap">
                            Choix {choice.priority}
                          </td>
                          <td className="py-3 px-4 text-right font-mono tabular-nums">
                            {choice.evaluation ? choice.evaluation.academicScore.toFixed(2) : '—'}
                          </td>
                          <td className="py-3 px-4 text-right font-mono tabular-nums">
                            {choice.evaluation ? choice.evaluation.interviewScore.toFixed(2) : '—'}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 tabular-nums">
                            {choice.evaluation ? choice.evaluation.weightedScore.toFixed(2) : '—'}
                          </td>
                          <td className={`py-3 px-4 font-semibold ${st.textClass}`}>
                            {choice.status === 'liste_attente'
                              ? `Attente #${choice.waitlistRank || 1}`
                              : st.shortLabel}
                          </td>
                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            <div className="inline-flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() =>
                                  setCommissionFinalDecision(cand.id, choice.subjectId, 'admis')
                                }
                                className="px-2.5 py-1 text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded font-semibold cursor-pointer"
                              >
                                Admettre
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  setCommissionFinalDecision(
                                    cand.id,
                                    choice.subjectId,
                                    'liste_attente',
                                    { waitlistRank: index + 1 }
                                  )
                                }
                                className="px-2.5 py-1 text-amber-800 bg-amber-50 hover:bg-amber-100 rounded font-semibold cursor-pointer"
                              >
                                Attente
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedEntryKey(entry.key);
                                  setActiveTab('candidatures');
                                }}
                                className="px-2.5 py-1 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded font-semibold cursor-pointer"
                              >
                                Noter
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB: NOTIFICATIONS */}
        {activeTab === 'notifications' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h1 className="text-lg sm:text-xl font-bold text-slate-900">Notifications</h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  Candidatures à examiner, documents corrigés déposés et entretiens programmés.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
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
                  Aucune notification à afficher.
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
                              <span className="font-semibold text-red-700 inline-flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3" />
                                Prioritaire
                              </span>
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

        {/* TAB: AIDE */}
        {activeTab === 'aide' && <HelpCenter compactHeader />}
      </div>

      {/* Document Preview Modal */}
      {previewDoc && (
        <div
          onClick={() => setPreviewDoc(null)}
          className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white border border-slate-200 rounded-xl w-full max-w-md overflow-hidden"
          >
            <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">{previewDoc.label}</h3>
                <p className="text-xs text-slate-500">{previewDoc.candidateName}</p>
              </div>
              <button
                type="button"
                onClick={() => setPreviewDoc(null)}
                className="p-1.5 text-slate-500 hover:text-slate-900 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="p-5 rounded-lg bg-slate-50 border border-slate-200 text-center space-y-1.5">
                <FileText className="w-8 h-8 text-blue-700 mx-auto" />
                <p className="text-xs font-mono font-semibold text-slate-900">
                  {previewDoc.doc.fileName}
                </p>
                <p className="text-xs text-slate-500 font-mono">
                  {formatFileSize(previewDoc.doc.fileSizeKB)} ·{' '}
                  {formatDateFR(previewDoc.doc.uploadedAt, true)}
                </p>
              </div>
              {previewDoc.doc.reviewComment && (
                <p className="text-xs text-red-700">{previewDoc.doc.reviewComment}</p>
              )}
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setPreviewDoc(null)}
                  className="px-3.5 py-1.5 text-xs font-semibold text-white bg-slate-900 rounded-lg cursor-pointer"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </WorkspaceShell>
  );
};
