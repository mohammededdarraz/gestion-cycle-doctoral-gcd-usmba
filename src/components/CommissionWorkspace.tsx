import React, { useEffect, useMemo, useState } from 'react';
import {
  Award,
  Calendar,
  CheckCircle2,
  ClipboardCheck,
  Download,
  Eye,
  FileText,
  HelpCircle,
  Layers,
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
  formatDateFR,
  formatFileSize,
  getDocStatusPresentation,
  getStatusPresentation,
} from '../utils/formatters';
import { HelpCenter } from './HelpCenter';
import { NavItem, WorkspaceShell } from './WorkspaceShell';

type CommissionTab = 'sujets_groupes' | 'candidatures' | 'entretiens' | 'classement' | 'aide';

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
    campaignConfig,
    setPreselectionDecision,
    scheduleCandidateInterview,
    saveCandidateEvaluation,
    setCommissionFinalDecision,
    callNextOnWaitlist,
  } = useGCD();

  const [activeTab, setActiveTab] = useState<CommissionTab>('candidatures');
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<string>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Submitted/active dossiers (exclude unsubmitted drafts)
  const submittedDossiers = useMemo(
    () => dossiers.filter((d) => d.status !== 'brouillon'),
    [dossiers]
  );

  // Flatten each candidate's 3 subject choices into individual commission candidatures
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

  // Local forms for selected (dossier, subject) candidature
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
    'Présentation orale de 10 minutes (support PDF) suivie de 15 minutes d’échanges scientifiques. Munissez-vous de votre CIN et de vos originaux.'
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

  // Ranking tab subject selection
  const [rankingSubjectId, setRankingSubjectId] = useState<string>(subjects[0]?.id || '');

  useEffect(() => {
    if (!selectedEntry) return;
    const { dossier, choice } = selectedEntry;
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
      id: 'sujets_groupes',
      label: 'Par sujet (Vue groupée)',
      icon: <Layers className="w-4 h-4" />,
      badgeCount: subjects.length,
    },
    {
      id: 'candidatures',
      label: 'Examen des candidatures',
      icon: <ClipboardCheck className="w-4 h-4" />,
      badgeCount: pendingPreselectionCount,
      badgeTone: 'neutral',
    },
    {
      id: 'entretiens',
      label: 'Planning des entretiens',
      icon: <Calendar className="w-4 h-4" />,
      badgeCount: scheduledInterviews.length,
    },
    {
      id: 'classement',
      label: 'Évaluation & Classement',
      icon: <Award className="w-4 h-4" />,
    },
    {
      id: 'aide',
      label: 'Guide & Support',
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
    scheduleCandidateInterview(
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
      `Convocation d’entretien envoyée à ${selectedEntry.dossier.personalInfo.firstName} ${selectedEntry.dossier.personalInfo.lastName} (Choix n°${selectedEntry.choice.priority} · ${selectedEntry.subject?.code || ''}) pour le ${formatDateFR(intDate)} à ${intTime}.`
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
      currentUser?.fullName || 'Commission Pédagogique'
    );
    setBannerMsg(
      `Évaluation enregistrée pour ${selectedEntry.dossier.personalInfo.firstName} ${selectedEntry.dossier.personalInfo.lastName} sur le sujet ${selectedEntry.subject?.code || ''}.`
    );
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
        'Statut sur ce sujet',
        'Note Dossier (/20)',
        'Note Entretien (/20)',
        'Note Finale Pondérée (/20)',
      ],
      entries.map(({ dossier, choice }) => [
        dossier.dossierNumber,
        dossier.personalInfo.lastName,
        dossier.personalInfo.firstName,
        dossier.personalInfo.cin,
        dossier.personalInfo.cne,
        dossier.personalInfo.email,
        dossier.personalInfo.phone,
        `Choix n°${choice.priority}`,
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

    setBannerMsg(`Liste CSV exportée pour le sujet ${subject.code} (${entries.length} candidature(s)).`);
  };

  // Ranking candidates for selected subject
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

  return (
    <WorkspaceShell
      workspaceTitle="Commission de Sélection"
      activeTab={activeTab}
      onSelectTab={(id) => setActiveTab(id as CommissionTab)}
      navItems={navItems}
      headerAction={
        <span className="text-xs text-slate-600 hidden sm:inline truncate max-w-xs">
          {currentUser?.laboratoire || 'Commission Pédagogique USMBA'}
        </span>
      }
    >
      <div className="space-y-6">
        {bannerMsg && (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-sm text-emerald-950 flex items-center justify-between gap-4">
            <span className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
              {bannerMsg}
            </span>
            <button
              type="button"
              onClick={() => setBannerMsg(null)}
              className="text-xs font-semibold underline shrink-0"
            >
              Fermer
            </button>
          </div>
        )}

        {/* TAB 0: CANDIDATURES REGROUPÉES PAR SUJET (Guide Professeurs USMBA) */}
        {activeTab === 'sujets_groupes' && (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div>
                <h1 className="text-xl font-bold text-slate-900">
                  Candidatures regroupées par sujet de thèse
                </h1>
                <p className="text-xs text-slate-600 mt-1">
                  Chaque candidat sélectionne {campaignConfig.requiredSubjectChoices} sujets par ordre de priorité (Choix 1 à {campaignConfig.requiredSubjectChoices}). Consultez les effectifs par rang de vœu ou exportez la liste CSV par sujet.
                </p>
              </div>
              <div className="text-xs font-mono text-slate-500 tabular-nums">
                {submittedDossiers.length} dossiers soumis · {allCandidatureEntries.length} vœux exprimés
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-semibold">
                      <th className="py-3 px-4">Code & Intitulé du sujet</th>
                      <th className="py-3 px-4">Encadrant & Laboratoire</th>
                      <th className="py-3 px-4">Validation (Struct. · Centre · Pôle)</th>
                      <th className="py-3 px-4 text-right">Places</th>
                      <th className="py-3 px-4 text-right">Vœux (C1 · C2 · C3)</th>
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
                      const val = suj.validationStatus || {
                        structure: 'validee',
                        centre: 'validee',
                        pole: 'validee',
                      };

                      return (
                        <tr key={suj.id} className="hover:bg-slate-50">
                          <td className="py-3.5 px-4 max-w-xs">
                            <p className="font-mono font-bold text-blue-700">{suj.code}</p>
                            <p className="font-semibold text-slate-900 line-clamp-2 mt-0.5">
                              {suj.title}
                            </p>
                          </td>
                          <td className="py-3.5 px-4 max-w-[220px]">
                            <p className="font-medium text-slate-900 truncate">{suj.supervisor}</p>
                            <p className="text-slate-500 truncate mt-0.5">{suj.laboratoire}</p>
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap text-slate-600">
                            <span
                              className={
                                val.structure === 'validee' ? 'text-emerald-700 font-medium' : 'text-amber-700'
                              }
                            >
                              {val.structure === 'validee' ? '✓ Struct.' : '◷ Struct.'}
                            </span>
                            <span className="mx-1 text-slate-300">·</span>
                            <span
                              className={
                                val.centre === 'validee' ? 'text-emerald-700 font-medium' : 'text-amber-700'
                              }
                            >
                              {val.centre === 'validee' ? '✓ Centre' : '◷ Centre'}
                            </span>
                            <span className="mx-1 text-slate-300">·</span>
                            <span
                              className={
                                val.pole === 'validee' ? 'text-emerald-700 font-medium' : 'text-amber-700'
                              }
                            >
                              {val.pole === 'validee' ? '✓ Pôle' : '◷ Pôle'}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono font-semibold text-slate-900 tabular-nums">
                            {suj.places}
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono tabular-nums whitespace-nowrap">
                            <span className="font-bold text-slate-900">{entries.length}</span>{' '}
                            <span className="text-slate-500">
                              ({c1} · {c2} · {c3})
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right whitespace-nowrap">
                            <div className="inline-flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleExportSubjectCandidatesCsv(suj)}
                                className="px-2.5 py-1.5 font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors inline-flex items-center gap-1"
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
                                className="px-3 py-1.5 font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-md transition-colors"
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

        {/* TAB 1: EXAMEN DES CANDIDATURES */}
        {activeTab === 'candidatures' && (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div>
                <h1 className="text-xl font-bold text-slate-900">
                  Examen scientifique des candidatures (par sujet et ordre de vœu)
                </h1>
                <p className="text-xs text-slate-600 mt-1">
                  Examinez le cursus, les pièces déposées et les {campaignConfig.requiredSubjectChoices} sujets demandés par chaque candidat, puis statuez sur le vœu sélectionné.
                </p>
              </div>
              <div className="text-xs text-slate-500 font-mono tabular-nums">
                Règles actives : {campaignConfig.dossierWeight}% Dossier · {campaignConfig.interviewWeight}% Entretien · Seuil Master {campaignConfig.minMasterAverage}/20
              </div>
            </div>

            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 p-4 bg-white border border-slate-200 rounded-xl">
              <div className="md:col-span-4 relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Candidat, N° dossier, CNE, code sujet..."
                  className="w-full pl-10 pr-3.5 py-2 text-sm border border-slate-200 rounded-lg"
                />
              </div>
              <div className="md:col-span-4">
                <select
                  value={selectedSubjectFilter}
                  onChange={(e) => setSelectedSubjectFilter(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg"
                >
                  <option value="ALL">
                    Tous les sujets ({allCandidatureEntries.length} vœux)
                  </option>
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.code} — {s.title.slice(0, 44)}...
                    </option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-2">
                <select
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg"
                >
                  <option value="ALL">Tous les vœux</option>
                  <option value="1">Choix n°1</option>
                  <option value="2">Choix n°2</option>
                  <option value="3">Choix n°3</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg"
                >
                  <option value="ALL">Tous statuts</option>
                  <option value="soumis">Nouveaux soumis</option>
                  <option value="en_cours">Présélectionnés</option>
                  <option value="entretien">Convoqués</option>
                  <option value="admis">Admis</option>
                  <option value="liste_attente">Liste d’attente</option>
                  <option value="non_retenu">Non retenus</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Candidature List */}
              <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl divide-y divide-slate-200">
                <div className="p-4 flex items-center justify-between text-xs font-semibold text-slate-600">
                  <span>Vœux reçus ({filteredEntries.length})</span>
                  <span>Moy. Bac+5</span>
                </div>

                {filteredEntries.length === 0 ? (
                  <div className="p-8 text-center text-sm text-slate-500">
                    Aucune candidature ne correspond aux filtres sélectionnés.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-200 max-h-[760px] overflow-y-auto">
                    {filteredEntries.map((entry) => {
                      const { dossier: d, choice, subject: suj } = entry;
                      const isSelected = selectedEntry?.key === entry.key;
                      const st = getStatusPresentation(choice.status);
                      return (
                        <button
                          key={entry.key}
                          type="button"
                          onClick={() => setSelectedEntryKey(entry.key)}
                          className={`w-full text-left p-4 transition-colors ${
                            isSelected ? 'bg-blue-50/60' : 'hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-sm font-bold text-slate-900 truncate">
                                {d.personalInfo.firstName} {d.personalInfo.lastName}
                              </p>
                              <p className="text-xs text-slate-600 font-mono mt-0.5 truncate">
                                Choix n°{choice.priority} ·{' '}
                                <span className="font-semibold text-blue-700">
                                  {suj?.code || choice.subjectId}
                                </span>{' '}
                                · {d.dossierNumber}
                              </p>
                            </div>
                            <span className="text-xs font-mono font-bold text-slate-900 tabular-nums shrink-0">
                              {d.academicInfo.masterAverage}/20
                            </span>
                          </div>
                          <div className="mt-2 flex items-center justify-between text-xs">
                            <span className="text-slate-500 truncate">
                              {d.academicInfo.masterType} · {d.academicInfo.masterInstitution}
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

              {/* Candidate Detail & Per-Subject Actions Panel */}
              <div className="lg:col-span-7 space-y-6">
                {selectedEntry ? (
                  <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-200">
                    {/* Header */}
                    <div className="p-6 space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-xs font-mono font-semibold text-blue-700">
                          {selectedEntry.dossier.dossierNumber} · CNE{' '}
                          {selectedEntry.dossier.personalInfo.cne} · CIN{' '}
                          {selectedEntry.dossier.personalInfo.cin}
                        </span>
                        <span
                          className={`text-xs font-semibold ${
                            getStatusPresentation(selectedEntry.choice.status).textClass
                          }`}
                        >
                          Statut sur ce sujet :{' '}
                          {getStatusPresentation(selectedEntry.choice.status).label}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <h2 className="text-xl font-bold text-slate-900">
                          {selectedEntry.dossier.personalInfo.firstName}{' '}
                          {selectedEntry.dossier.personalInfo.lastName}
                        </h2>
                        {(selectedEntry.dossier.personalInfo.firstNameAr ||
                          selectedEntry.dossier.personalInfo.lastNameAr) && (
                          <span className="text-sm font-medium text-slate-600" dir="rtl">
                            {selectedEntry.dossier.personalInfo.firstNameAr}{' '}
                            {selectedEntry.dossier.personalInfo.lastNameAr}
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-600">
                        {selectedEntry.dossier.personalInfo.email} ·{' '}
                        {selectedEntry.dossier.personalInfo.phone} ·{' '}
                        {selectedEntry.dossier.personalInfo.employmentStatus === 'etudiant'
                          ? 'Étudiant(e) non salarié(e)'
                          : `${selectedEntry.dossier.personalInfo.employmentStatus} (${
                              selectedEntry.dossier.personalInfo.employerName ||
                              'Employeur non précisé'
                            })`}
                      </p>
                    </div>

                    {/* Active Subject Choice & Candidate's 3 Wishes Switcher */}
                    <div className="p-6 space-y-3 bg-slate-50/60">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="text-xs font-bold text-slate-900">
                          Les {selectedEntry.dossier.subjectChoices.length} sujets demandés par ce candidat (cliquez un vœu pour l’examiner)
                        </h3>
                        <span className="text-xs font-mono text-blue-700 font-semibold">
                          Vœu actif : Choix n°{selectedEntry.choice.priority}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
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
                                className={`text-left p-3 rounded-lg border transition-colors ${
                                  active
                                    ? 'bg-white border-blue-600 ring-1 ring-blue-600'
                                    : 'bg-white border-slate-200 hover:border-slate-300'
                                }`}
                              >
                                <div className="flex items-center justify-between text-xs">
                                  <span className="font-mono font-bold text-slate-900">
                                    Choix n°{ch.priority}
                                  </span>
                                  <span className={`font-semibold ${st.textClass}`}>
                                    {st.shortLabel}
                                  </span>
                                </div>
                                <p className="text-xs font-mono text-blue-700 mt-1 truncate">
                                  {s?.code || ch.subjectId}
                                </p>
                                <p className="text-xs text-slate-600 truncate mt-0.5">
                                  {s?.title || 'Sujet'}
                                </p>
                              </button>
                            );
                          })}
                      </div>

                      {selectedEntry.subject && (
                        <div className="pt-2 text-xs text-slate-700">
                          <strong>Sujet examiné ({selectedEntry.subject.code}) :</strong>{' '}
                          {selectedEntry.subject.title} ·{' '}
                          <span className="text-slate-500">
                            {selectedEntry.subject.supervisor} ({selectedEntry.subject.laboratoire})
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Academic Summary */}
                    <div className="p-6 space-y-4">
                      <h3 className="text-sm font-bold text-slate-900">
                        Parcours universitaire et adéquation scientifique
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                        <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                          <span className="text-slate-500 block">
                            Baccalauréat ({selectedEntry.dossier.academicInfo.bacYear})
                          </span>
                          <strong className="text-slate-900 block mt-0.5">
                            {selectedEntry.dossier.academicInfo.bacSeries}
                          </strong>
                          <span className="font-mono font-semibold text-slate-800 tabular-nums">
                            Moyenne : {selectedEntry.dossier.academicInfo.bacAverage}/20
                          </span>
                        </div>
                        <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                          <span className="text-slate-500 block">
                            Licence ({selectedEntry.dossier.academicInfo.licenceYear})
                          </span>
                          <strong className="text-slate-900 block mt-0.5 truncate">
                            {selectedEntry.dossier.academicInfo.licenceTitle}
                          </strong>
                          <span className="font-mono font-semibold text-slate-800 tabular-nums">
                            Moyenne : {selectedEntry.dossier.academicInfo.licenceAverage}/20
                          </span>
                        </div>
                        <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                          <span className="text-slate-500 block">
                            {selectedEntry.dossier.academicInfo.masterType} (
                            {selectedEntry.dossier.academicInfo.masterYear})
                          </span>
                          <strong className="text-slate-900 block mt-0.5 truncate">
                            {selectedEntry.dossier.academicInfo.masterInstitution}
                          </strong>
                          <span className="font-mono font-bold text-blue-700 tabular-nums">
                            Moyenne : {selectedEntry.dossier.academicInfo.masterAverage}/20
                          </span>
                        </div>
                      </div>

                      <div className="text-xs space-y-1.5 text-slate-700">
                        <p>
                          <strong>Mémoire / PFE :</strong>{' '}
                          {selectedEntry.dossier.academicInfo.pfeTitle}
                        </p>
                        <p>
                          <strong>Motivation du candidat :</strong>{' '}
                          {selectedEntry.dossier.motivation}
                        </p>
                      </div>
                    </div>

                    {/* Uploaded Documents Viewer */}
                    <div className="p-6 space-y-3">
                      <h3 className="text-sm font-bold text-slate-900">
                        Pièces justificatives déposées ({selectedEntry.dossier.documents.length})
                      </h3>
                      <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg">
                        {selectedEntry.dossier.documents.map((doc) => {
                          const req = campaignConfig.documentRequirements.find(
                            (r) => r.id === doc.requirementId
                          );
                          const pres = getDocStatusPresentation(doc.status);
                          return (
                            <div
                              key={doc.requirementId}
                              className="p-3 flex items-center justify-between gap-3 text-xs"
                            >
                              <div className="min-w-0">
                                <p className="font-semibold text-slate-900 truncate">
                                  {req?.label || doc.requirementId}
                                </p>
                                <p className="text-slate-500 font-mono truncate">
                                  {doc.fileName} · {formatFileSize(doc.fileSizeKB)} ·{' '}
                                  <span className={pres.textClass}>{pres.label}</span>
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() =>
                                  setPreviewDoc({
                                    doc,
                                    label: req?.label || 'Document',
                                    candidateName: `${selectedEntry.dossier.personalInfo.firstName} ${selectedEntry.dossier.personalInfo.lastName}`,
                                  })
                                }
                                className="px-3 py-1.5 font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors shrink-0 flex items-center gap-1.5"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                Consulter
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Step A: Décision de présélection (Retenu ?) */}
                    <div className="p-6 space-y-3">
                      <h3 className="text-sm font-bold text-slate-900">
                        1. Décision de présélection pour le Choix n°{selectedEntry.choice.priority} ({selectedEntry.subject?.code})
                      </h3>
                      <input
                        type="text"
                        value={preselectionNote}
                        onChange={(e) => setPreselectionNote(e.target.value)}
                        placeholder="Observation scientifique ou motif éventuel de refus sur ce sujet..."
                        className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg"
                      />
                      <div className="flex flex-wrap items-center gap-2.5">
                        <button
                          type="button"
                          onClick={() => {
                            setPreselectionDecision(
                              selectedEntry.dossier.id,
                              selectedEntry.choice.subjectId,
                              true,
                              preselectionNote
                            );
                            setBannerMsg(
                              `Candidat retenu en présélection sur le sujet ${selectedEntry.subject?.code || ''}.`
                            );
                          }}
                          className="px-3.5 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors flex items-center gap-1.5"
                        >
                          <UserCheck className="w-3.5 h-3.5" />
                          Retenir pour ce sujet
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setPreselectionDecision(
                              selectedEntry.dossier.id,
                              selectedEntry.choice.subjectId,
                              false,
                              preselectionNote ||
                                'Prérequis pédagogiques insuffisants pour ce sujet.'
                            );
                            setBannerMsg(
                              `Vœu n°${selectedEntry.choice.priority} (${selectedEntry.subject?.code || ''}) marqué non retenu.`
                            );
                          }}
                          className="px-3.5 py-2 text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-colors flex items-center gap-1.5"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          Refuser ce vœu
                        </button>
                      </div>
                    </div>

                    {/* Step B: Organiser l'entretien */}
                    <form onSubmit={handleSaveInterview} className="p-6 space-y-3">
                      <h3 className="text-sm font-bold text-slate-900">
                        2. Organiser et notifier l’entretien oral ({selectedEntry.subject?.code})
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-slate-600 mb-1">
                            Date
                          </label>
                          <input
                            type="date"
                            value={intDate}
                            onChange={(e) => setIntDate(e.target.value)}
                            className="w-full px-3 py-1.5 text-xs font-mono border border-slate-200 rounded-lg"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-600 mb-1">
                            Horaire
                          </label>
                          <input
                            type="time"
                            value={intTime}
                            onChange={(e) => setIntTime(e.target.value)}
                            className="w-full px-3 py-1.5 text-xs font-mono border border-slate-200 rounded-lg"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-600 mb-1">
                            Modalité
                          </label>
                          <select
                            value={intModality}
                            onChange={(e) =>
                              setIntModality(e.target.value as 'presentiel' | 'distanciel')
                            }
                            className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg"
                          >
                            <option value="presentiel">Présentiel</option>
                            <option value="distanciel">Visioconférence</option>
                          </select>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-slate-600 mb-1">
                            Salle ou lien de connexion
                          </label>
                          <input
                            type="text"
                            value={intLocation}
                            onChange={(e) => setIntLocation(e.target.value)}
                            className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-600 mb-1">
                            Membres du jury
                          </label>
                          <input
                            type="text"
                            value={intJury}
                            onChange={(e) => setIntJury(e.target.value)}
                            className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg"
                          />
                        </div>
                      </div>
                      <button
                        type="submit"
                        className="px-4 py-2 text-xs font-semibold text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1.5"
                      >
                        <Calendar className="w-3.5 h-3.5 text-blue-700" />
                        Enregistrer & envoyer la convocation au candidat
                      </button>
                    </form>

                    {/* Step C: Évaluer & Affecter Résultat */}
                    <div className="p-6 space-y-4">
                      <form onSubmit={handleSaveEvaluation} className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h3 className="text-sm font-bold text-slate-900">
                            3. Évaluation chiffrée et décision de classement ({selectedEntry.subject?.code})
                          </h3>
                          {liveWeightedPreview && (
                            <span className="text-xs font-mono font-bold text-blue-700 tabular-nums">
                              Moyenne calculée : {liveWeightedPreview}/20
                            </span>
                          )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-slate-600 mb-1">
                              Note Dossier (/20 · coeff. {campaignConfig.dossierWeight}%)
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
                            <label className="block text-xs font-medium text-slate-600 mb-1">
                              Note Entretien (/20 · coeff. {campaignConfig.interviewWeight}%)
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
                            ⚠ Attention : note d’entretien inférieure au seuil éliminatoire configuré (
                            {campaignConfig.eliminatoryInterviewScore}/20).
                          </p>
                        )}

                        <input
                          type="text"
                          value={evalObs}
                          onChange={(e) => setEvalObs(e.target.value)}
                          placeholder="Appréciation globale de la commission d’audition pour ce sujet..."
                          className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg"
                        />

                        <button
                          type="submit"
                          className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors"
                        >
                          Enregistrer les notes d’évaluation
                        </button>
                      </form>

                      <div className="pt-4 border-t border-slate-100 space-y-3">
                        <p className="text-xs font-semibold text-slate-700">
                          Attribuer la décision finale sur le sujet {selectedEntry.subject?.code} :
                        </p>
                        <div className="flex flex-wrap items-center gap-2.5">
                          <button
                            type="button"
                            onClick={() => {
                              setCommissionFinalDecision(
                                selectedEntry.dossier.id,
                                selectedEntry.choice.subjectId,
                                'admis'
                              );
                              setBannerMsg(
                                `Candidat admis en liste principale sur le sujet ${selectedEntry.subject?.code || ''}.`
                              );
                            }}
                            className="px-3.5 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors"
                          >
                            Admettre en liste principale
                          </button>

                          <div className="inline-flex items-center gap-1.5">
                            <input
                              type="number"
                              min="1"
                              max="20"
                              value={waitlistRankInput}
                              onChange={(e) => setWaitlistRankInput(e.target.value)}
                              aria-label="Rang sur liste d'attente"
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
                                setBannerMsg(
                                  `Candidat inscrit sur liste d’attente (Rang ${rank}) pour ${selectedEntry.subject?.code || ''}.`
                                );
                              }}
                              className="px-3 py-2 text-xs font-semibold text-amber-900 bg-amber-100 hover:bg-amber-200 rounded-lg transition-colors whitespace-nowrap"
                            >
                              Placer en liste d’attente
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
                                    'Classement au-delà de la capacité d’encadrement ouverte sur le sujet.',
                                }
                              );
                              setBannerMsg(
                                `Vœu marqué non retenu sur ${selectedEntry.subject?.code || ''}.`
                              );
                            }}
                            className="px-3 py-2 text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-colors"
                          >
                            Non admis
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white border border-slate-200 rounded-xl p-10 text-center text-sm text-slate-500">
                    Sélectionnez une candidature dans la colonne de gauche pour l’examiner.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: PLANNING DES ENTRETIENS */}
        {activeTab === 'entretiens' && (
          <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-200">
            <div className="p-6">
              <h2 className="text-lg font-bold text-slate-900">
                Calendrier récapitulatif des entretiens programmés
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Liste des convocations par candidat, sujet et rang de vœu avec horaires, salles et membres du jury.
              </p>
            </div>

            {scheduledInterviews.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-500">
                Aucun entretien programmé pour le moment.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-semibold">
                      <th className="py-3 px-4">Date & Heure</th>
                      <th className="py-3 px-4">Candidat</th>
                      <th className="py-3 px-4">Sujet & Ordre du vœu</th>
                      <th className="py-3 px-4">Lieu / Modalité</th>
                      <th className="py-3 px-4">Statut du vœu</th>
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
                          <td className="py-3 px-4 font-mono">
                            <span className="font-semibold text-blue-700">
                              {suj?.code || choice.subjectId}
                            </span>{' '}
                            <span className="text-slate-500">· Choix n°{choice.priority}</span>
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
                              className="font-semibold text-blue-700 hover:underline"
                            >
                              Ouvrir candidature
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
        )}

        {/* TAB 3: ÉVALUATION, CLASSEMENT & GESTION LISTE D'ATTENTE */}
        {activeTab === 'classement' && (
          <div className="space-y-6">
            <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    Classement par sujet, Liste Principale et Liste d’Attente
                  </h2>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Les candidats ayant choisi ce sujet (en Choix 1, 2 ou 3) sont classés par moyenne pondérée décroissante ({campaignConfig.dossierWeight}% dossier + {campaignConfig.interviewWeight}% entretien).
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  <select
                    value={rankingSubject?.id || ''}
                    onChange={(e) => setRankingSubjectId(e.target.value)}
                    className="px-3.5 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg"
                  >
                    {subjects.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.code} ({s.places} place{s.places > 1 ? 's' : ''}) —{' '}
                        {s.title.slice(0, 42)}...
                      </option>
                    ))}
                  </select>

                  {rankingSubject && (
                    <>
                      <button
                        type="button"
                        onClick={() => handleExportSubjectCandidatesCsv(rankingSubject)}
                        className="px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Exporter PV (CSV)
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          const res = callNextOnWaitlist(rankingSubject.id);
                          if (!res.ok) {
                            setBannerMsg(res.error || 'Aucun candidat sur liste d’attente.');
                          } else {
                            setBannerMsg(
                              `Appel effectué : ${res.promotedName} passe de la liste d’attente à la liste principale sur ${rankingSubject.code} et reçoit une notification immédiate.`
                            );
                          }
                        }}
                        className="px-3.5 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5"
                      >
                        <Users className="w-3.5 h-3.5" />
                        Appeler le 1er de la liste d’attente
                      </button>
                    </>
                  )}
                </div>
              </div>

              {rankingSubject && (
                <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700 flex flex-wrap items-center justify-between gap-2">
                  <span>
                    <strong>{rankingSubject.code} :</strong> {rankingSubject.title}
                  </span>
                  <span className="font-mono font-semibold text-slate-900 tabular-nums">
                    Quota ouvert : {rankingSubject.places} place(s) · Admis sur ce sujet :{' '}
                    {
                      rankingEntries.filter(
                        (e) =>
                          e.choice.status === 'admis' ||
                          (e.dossier.status === 'inscrit' &&
                            e.dossier.confirmedSubjectId === rankingSubject.id)
                      ).length
                    }
                  </span>
                </div>
              )}

              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-semibold">
                      <th className="py-3 px-4">Rang</th>
                      <th className="py-3 px-4">Candidat</th>
                      <th className="py-3 px-4">Vœu</th>
                      <th className="py-3 px-4 text-right">Dossier /20</th>
                      <th className="py-3 px-4 text-right">Entretien /20</th>
                      <th className="py-3 px-4 text-right">Note Finale /20</th>
                      <th className="py-3 px-4">Décision sur ce sujet</th>
                      <th className="py-3 px-4 text-right">Actions rapides</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {rankingEntries.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-8 text-center text-slate-500">
                          Aucune candidature soumise sur ce sujet de thèse.
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
                            <td className="py-3 px-4 font-mono font-semibold text-slate-700 whitespace-nowrap">
                              Choix n°{choice.priority}
                            </td>
                            <td className="py-3 px-4 text-right font-mono tabular-nums">
                              {choice.evaluation
                                ? choice.evaluation.academicScore.toFixed(2)
                                : '—'}
                            </td>
                            <td className="py-3 px-4 text-right font-mono tabular-nums">
                              {choice.evaluation
                                ? choice.evaluation.interviewScore.toFixed(2)
                                : '—'}
                            </td>
                            <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 tabular-nums">
                              {choice.evaluation
                                ? choice.evaluation.weightedScore.toFixed(2)
                                : 'Non noté'}
                            </td>
                            <td className={`py-3 px-4 font-semibold ${st.textClass}`}>
                              {choice.status === 'liste_attente'
                                ? `Liste d’attente (Rang ${choice.waitlistRank || 1})`
                                : st.label}
                            </td>
                            <td className="py-3 px-4 text-right whitespace-nowrap">
                              <div className="inline-flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setCommissionFinalDecision(
                                      cand.id,
                                      choice.subjectId,
                                      'admis'
                                    )
                                  }
                                  className="px-2.5 py-1 text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded font-semibold"
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
                                  className="px-2.5 py-1 text-amber-800 bg-amber-50 hover:bg-amber-100 rounded font-semibold"
                                >
                                  Attente
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedEntryKey(entry.key);
                                    setActiveTab('candidatures');
                                  }}
                                  className="px-2.5 py-1 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded font-semibold"
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
          </div>
        )}

        {/* TAB 4: GUIDE & SUPPORT */}
        {activeTab === 'aide' && <HelpCenter compactHeader />}
      </div>

      {/* Document Inspection Modal */}
      {previewDoc && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-lg overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">{previewDoc.label}</h3>
                <p className="text-xs text-slate-500">Candidat : {previewDoc.candidateName}</p>
              </div>
              <button
                type="button"
                onClick={() => setPreviewDoc(null)}
                className="p-1.5 text-slate-500 hover:text-slate-900 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="p-6 rounded-lg bg-slate-50 border border-slate-200 text-center space-y-2">
                <FileText className="w-10 h-10 text-blue-700 mx-auto" />
                <p className="text-sm font-mono font-semibold text-slate-900">
                  {previewDoc.doc.fileName}
                </p>
                <p className="text-xs text-slate-500 font-mono">
                  Taille : {formatFileSize(previewDoc.doc.fileSizeKB)} · Déposé le{' '}
                  {formatDateFR(previewDoc.doc.uploadedAt, true)}
                </p>
                <p className="text-xs text-slate-600 pt-2">
                  Aperçu numérique certifié du document déposé sur le serveur sécurisé GCD USMBA.
                </p>
              </div>
              {previewDoc.doc.reviewComment && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-900">
                  <strong>Note administrative :</strong> {previewDoc.doc.reviewComment}
                </div>
              )}
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setPreviewDoc(null)}
                  className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg"
                >
                  Fermer l’aperçu
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </WorkspaceShell>
  );
};
