import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  BarChart3,
  BookOpen,
  Check,
  CheckCircle2,
  Edit3,
  FileCheck2,
  MessageSquare,
  Plus,
  Send,
  Settings,
  ShieldCheck,
  Trash2,
  Users,
} from 'lucide-react';
import { useGCD } from '../context/GCDContext';
import { DocumentStage, ThesisSubject, UserRole } from '../types/gcd';
import {
  formatDateFR,
  formatFileSize,
  getDocStatusPresentation,
  getStatusPresentation,
} from '../utils/formatters';
import { NavItem, WorkspaceShell } from './WorkspaceShell';

type AdminTab = 'dashboard' | 'verification' | 'sujets' | 'configuration' | 'comptes' | 'support';

function getProgressBarWidthClass(pct: number): string {
  if (pct <= 0) return 'w-0';
  if (pct <= 10) return 'w-[10%]';
  if (pct <= 20) return 'w-[20%]';
  if (pct <= 30) return 'w-[30%]';
  if (pct <= 40) return 'w-[40%]';
  if (pct <= 50) return 'w-1/2';
  if (pct <= 60) return 'w-[60%]';
  if (pct <= 70) return 'w-[70%]';
  if (pct <= 80) return 'w-[80%]';
  if (pct <= 90) return 'w-[90%]';
  return 'w-full';
}

export const AdminWorkspace: React.FC = () => {
  const {
    dossiers,
    subjects,
    accounts,
    campaignConfig,
    supportTickets,
    reviewDocumentStatus,
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
  const [banner, setBanner] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);

  // Verification tab state
  const [verifFilter, setVerifFilter] = useState<'ALL' | 'ADMIS' | 'A_VERIFIER' | 'INSCRIT'>('ALL');
  const nonDraftDossiers = useMemo(
    () => dossiers.filter((d) => d.status !== 'brouillon'),
    [dossiers]
  );
  const [selectedDossierId, setSelectedDossierId] = useState<string>(
    dossiers.find((d) => d.status === 'admis')?.id || nonDraftDossiers[0]?.id || ''
  );
  const [correctionTargetReqId, setCorrectionTargetReqId] = useState<string | null>(null);
  const [correctionReason, setCorrectionReason] = useState('');

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

  // Stats
  const stats = useMemo(() => {
    const total = dossiers.length;
    const brouillons = dossiers.filter((d) => d.status === 'brouillon').length;
    const soumisEnExamen = dossiers.filter(
      (d) => d.status === 'soumis' || d.status === 'en_cours'
    ).length;
    const entretiens = dossiers.filter((d) => d.status === 'entretien').length;
    const admis = dossiers.filter((d) => d.status === 'admis').length;
    const attente = dossiers.filter((d) => d.status === 'liste_attente').length;
    const inscrits = dossiers.filter((d) => d.status === 'inscrit').length;
    const nonRetenus = dossiers.filter((d) => d.status === 'non_retenu').length;
    const totalWishes = nonDraftDossiers.reduce(
      (acc, d) => acc + d.subjectChoices.length,
      0
    );
    const docsPendingReview = nonDraftDossiers.reduce(
      (acc, d) => acc + d.documents.filter((doc) => doc.status === 'deposee').length,
      0
    );
    const docsToCorrect = dossiers.reduce(
      (acc, d) => acc + d.documents.filter((doc) => doc.status === 'a_corriger').length,
      0
    );
    return {
      total,
      brouillons,
      soumisEnExamen,
      entretiens,
      admis,
      attente,
      inscrits,
      nonRetenus,
      totalWishes,
      docsPendingReview,
      docsToCorrect,
    };
  }, [dossiers, nonDraftDossiers]);

  const openTicketsCount = supportTickets.filter((t) => t.status === 'ouvert').length;

  const navItems: NavItem[] = [
    {
      id: 'dashboard',
      label: 'Tableau de bord',
      icon: <BarChart3 className="w-4 h-4" />,
    },
    {
      id: 'verification',
      label: 'Vérification & Inscriptions',
      icon: <FileCheck2 className="w-4 h-4" />,
      badgeCount: stats.docsPendingReview + stats.admis,
      badgeTone: 'neutral',
    },
    {
      id: 'sujets',
      label: 'Sujets de thèse',
      icon: <BookOpen className="w-4 h-4" />,
    },
    {
      id: 'configuration',
      label: 'Pièces, Règles & Dates',
      icon: <Settings className="w-4 h-4" />,
    },
    {
      id: 'comptes',
      label: 'Candidats & Intervenants',
      icon: <Users className="w-4 h-4" />,
    },
    {
      id: 'support',
      label: 'Support candidats',
      icon: <MessageSquare className="w-4 h-4" />,
      badgeCount: openTicketsCount,
      badgeTone: openTicketsCount > 0 ? 'alert' : 'neutral',
    },
  ];

  const filteredVerificationDossiers = useMemo(() => {
    return nonDraftDossiers.filter((d) => {
      if (verifFilter === 'ADMIS') return d.status === 'admis';
      if (verifFilter === 'INSCRIT') return d.status === 'inscrit';
      if (verifFilter === 'A_VERIFIER') {
        return d.documents.some((doc) => doc.status === 'deposee' || doc.status === 'a_corriger');
      }
      return true;
    });
  }, [nonDraftDossiers, verifFilter]);

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
        text: 'Veuillez renseigner au minimum l’intitulé, le laboratoire et le directeur de thèse.',
      });
      return;
    }
    upsertThesisSubject({ ...sujForm, id: editingSubjectId });
    setShowSubjectForm(false);
    setEditingSubjectId(undefined);
    setBanner({
      tone: 'success',
      text: editingSubjectId
        ? 'Sujet de thèse mis à jour.'
        : 'Nouveau sujet de thèse publié au catalogue.',
    });
  };

  const handleAddDocumentRequirement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReqCode.trim() || !newReqLabel.trim() || newReqFormats.length === 0) {
      setBanner({
        tone: 'error',
        text: 'Précisez un code court, l’intitulé de la pièce et au moins un format accepté.',
      });
      return;
    }
    upsertDocumentRequirement({
      code: newReqCode.trim().toUpperCase(),
      label: newReqLabel.trim(),
      description: newReqDesc.trim() || 'Pièce justificative demandée par l’administration.',
      instructions:
        newReqInstructions.trim() ||
        'Déposez un document lisible respectant le format requis.',
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
      text: 'Nouvelle pièce ajoutée : elle est immédiatement visible dans l’espace des candidats.',
    });
  };

  const handleCreateIntervenant = (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffFullName.trim() || !staffEmail.trim().includes('@')) {
      setBanner({ tone: 'error', text: 'Nom complet et e-mail valide requis pour l’intervenant.' });
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
    setBanner({ tone: 'success', text: 'Compte intervenant créé et activé avec succès.' });
  };

  return (
    <WorkspaceShell
      workspaceTitle="Administration CEDoc"
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
                ? 'Résultats officiels publiés et notifications envoyées aux candidats.'
                : 'Affichage public des notes suspendu.',
            });
          }}
          className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 ${
            campaignConfig.resultsPublished
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
              : 'bg-blue-700 text-white hover:bg-blue-800'
          }`}
        >
          {campaignConfig.resultsPublished
            ? '✓ Résultats publiés'
            : 'Publier officiellement les résultats'}
        </button>
      }
    >
      <div className="space-y-6">
        {banner && (
          <div
            className={`p-4 rounded-xl border text-sm flex items-center justify-between gap-4 ${
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
              className="text-xs font-semibold underline shrink-0"
            >
              Fermer
            </button>
          </div>
        )}

        {/* TAB 1: TABLEAU DE BORD */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            <div>
              <h1 className="text-xl font-bold text-slate-900">
                Tableau de bord du Pôle d’Études Doctorales ({campaignConfig.academicYear})
              </h1>
              <p className="text-xs text-slate-600 mt-1">
                Suivi consolidé des candidats ({campaignConfig.requiredSubjectChoices} sujets choisis par dossier), de l’avancement des commissions et des inscriptions définitives.
              </p>
            </div>

            {/* KPI Stat Grid */}
            <div className="bg-white border border-slate-200 rounded-xl grid grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
              <div className="p-5">
                <p className="text-xs text-slate-500">Candidats & Vœux exprimés</p>
                <p className="text-2xl font-bold font-mono text-slate-900 tabular-nums mt-1">
                  {stats.total}{' '}
                  <span className="text-xs font-normal text-slate-500">
                    ({stats.totalWishes} vœux soumis)
                  </span>
                </p>
              </div>
              <div className="p-5">
                <p className="text-xs text-slate-500">En examen & Entretiens</p>
                <p className="text-2xl font-bold font-mono text-blue-700 tabular-nums mt-1">
                  {stats.soumisEnExamen + stats.entretiens}
                </p>
              </div>
              <div className="p-5">
                <p className="text-xs text-slate-500">Admis & Liste d’attente</p>
                <p className="text-2xl font-bold font-mono text-emerald-700 tabular-nums mt-1">
                  {stats.admis}{' '}
                  <span className="text-xs font-normal text-amber-700">
                    (+{stats.attente} attente)
                  </span>
                </p>
              </div>
              <div className="p-5">
                <p className="text-xs text-slate-500">Inscriptions définitives validées</p>
                <p className="text-2xl font-bold font-mono text-slate-900 tabular-nums mt-1">
                  {stats.inscrits}
                </p>
              </div>
            </div>

            {/* Pipeline Breakdown & Subject Table */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 space-y-4">
                <h2 className="text-base font-bold text-slate-900">
                  Répartition des dossiers candidats par étape
                </h2>
                <div className="space-y-3 text-xs">
                  {[
                    { label: 'Brouillons non soumis', count: stats.brouillons, bar: 'bg-slate-400' },
                    { label: 'Soumis / En présélection', count: stats.soumisEnExamen, bar: 'bg-blue-600' },
                    { label: 'Convoqués à l’entretien', count: stats.entretiens, bar: 'bg-blue-800' },
                    { label: 'Admis (attente inscription)', count: stats.admis, bar: 'bg-emerald-600' },
                    { label: 'Liste d’attente', count: stats.attente, bar: 'bg-amber-500' },
                    { label: 'Inscriptions validées', count: stats.inscrits, bar: 'bg-emerald-800' },
                    { label: 'Non retenus (sur les 3 vœux)', count: stats.nonRetenus, bar: 'bg-red-500' },
                  ].map((row) => {
                    const pct = Math.round((row.count / Math.max(1, stats.total)) * 100);
                    return (
                      <div key={row.label} className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-700 font-medium">{row.label}</span>
                          <span className="font-mono font-semibold text-slate-900 tabular-nums">
                            {row.count} ({pct}%)
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${row.bar} ${getProgressBarWidthClass(pct)}`}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-600">
                    Pièces signalées « À corriger » :{' '}
                    <strong className="font-mono text-red-700">{stats.docsToCorrect}</strong>
                  </span>
                  <button
                    type="button"
                    onClick={() => setActiveTab('verification')}
                    className="font-semibold text-blue-700 hover:underline"
                  >
                    Vérifier les dossiers →
                  </button>
                </div>
              </div>

              <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl overflow-hidden">
                <div className="p-5 border-b border-slate-200 flex items-center justify-between">
                  <h2 className="text-base font-bold text-slate-900">
                    État des vœux et inscriptions par sujet de thèse
                  </h2>
                  <button
                    type="button"
                    onClick={() => setActiveTab('sujets')}
                    className="text-xs font-semibold text-blue-700 hover:underline"
                  >
                    Gérer les sujets
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                        <th className="py-2.5 px-4">Code sujet</th>
                        <th className="py-2.5 px-4">Établissement</th>
                        <th className="py-2.5 px-4 text-right">Places</th>
                        <th className="py-2.5 px-4 text-right">Vœux (C1·C2·C3)</th>
                        <th className="py-2.5 px-4 text-right">Admis / Inscrits</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {subjects.map((suj) => {
                        const candsWithChoice = nonDraftDossiers.filter((d) =>
                          d.subjectChoices.some((c) => c.subjectId === suj.id)
                        );
                        const c1 = nonDraftDossiers.filter((d) =>
                          d.subjectChoices.some(
                            (c) => c.subjectId === suj.id && c.priority === 1
                          )
                        ).length;
                        const c2 = nonDraftDossiers.filter((d) =>
                          d.subjectChoices.some(
                            (c) => c.subjectId === suj.id && c.priority === 2
                          )
                        ).length;
                        const c3 = nonDraftDossiers.filter((d) =>
                          d.subjectChoices.some(
                            (c) => c.subjectId === suj.id && c.priority >= 3
                          )
                        ).length;

                        const admisOrInscrit = nonDraftDossiers.filter(
                          (d) =>
                            d.subjectChoices.some(
                              (c) => c.subjectId === suj.id && c.status === 'admis'
                            ) ||
                            (d.status === 'inscrit' && d.confirmedSubjectId === suj.id)
                        ).length;

                        return (
                          <tr key={suj.id} className="hover:bg-slate-50">
                            <td className="py-3 px-4 font-mono font-semibold text-blue-700">
                              {suj.code}
                            </td>
                            <td className="py-3 px-4 text-slate-700 truncate max-w-[180px]">
                              {suj.etablissement}
                            </td>
                            <td className="py-3 px-4 text-right font-mono tabular-nums">
                              {suj.places}
                            </td>
                            <td className="py-3 px-4 text-right font-mono tabular-nums whitespace-nowrap">
                              <span className="font-semibold text-slate-900">
                                {candsWithChoice.length}
                              </span>{' '}
                              <span className="text-slate-400">
                                ({c1}·{c2}·{c3})
                              </span>
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
          </div>
        )}

        {/* TAB 2: VÉRIFICATION DES DOSSIERS & INSCRIPTIONS ADMINISTRATIVES */}
        {activeTab === 'verification' && (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div>
                <h1 className="text-xl font-bold text-slate-900">
                  Contrôle de conformité des pièces et validation des inscriptions
                </h1>
                <p className="text-xs text-slate-600 mt-1">
                  Vérifiez chaque pièce déposée. En cas d’anomalie, demandez une correction ciblée au candidat ; si tout est conforme pour un admis, validez son inscription définitive sur le sujet confirmé.
                </p>
              </div>

              <div className="inline-flex p-1 bg-white border border-slate-200 rounded-lg self-start">
                {(
                  [
                    { id: 'ALL', label: 'Tous soumis' },
                    { id: 'ADMIS', label: 'Admis à inscrire' },
                    { id: 'A_VERIFIER', label: 'Pièces à vérifier' },
                    { id: 'INSCRIT', label: 'Inscrits validés' },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setVerifFilter(tab.id)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
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

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left list */}
              <div className="lg:col-span-4 bg-white border border-slate-200 rounded-xl divide-y divide-slate-200">
                <div className="p-4 text-xs font-semibold text-slate-600">
                  Dossiers ({filteredVerificationDossiers.length})
                </div>
                {filteredVerificationDossiers.map((d) => {
                  const st = getStatusPresentation(d.status);
                  const pendingDocs = d.documents.filter((doc) => doc.status === 'deposee').length;
                  const corrDocs = d.documents.filter((doc) => doc.status === 'a_corriger').length;
                  return (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => {
                        setSelectedDossierId(d.id);
                        setCorrectionTargetReqId(null);
                      }}
                      className={`w-full text-left p-4 transition-colors ${
                        selectedDossier?.id === d.id ? 'bg-blue-50/60' : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-bold text-slate-900">
                          {d.personalInfo.firstName} {d.personalInfo.lastName}
                        </span>
                        <span className={`text-xs font-semibold ${st.textClass}`}>
                          {st.shortLabel}
                        </span>
                      </div>
                      <p className="text-xs font-mono text-slate-500 mt-0.5">
                        {d.dossierNumber} · {d.subjectChoices.length} vœux · {d.documents.length} fichier(s)
                      </p>
                      <p className="text-xs text-slate-600 mt-1">
                        {corrDocs > 0 ? (
                          <span className="text-red-700 font-medium">
                            ⚠ {corrDocs} pièce(s) en attente de correction
                          </span>
                        ) : pendingDocs > 0 ? (
                          <span className="text-blue-700 font-medium">
                            {pendingDocs} pièce(s) à contrôler
                          </span>
                        ) : (
                          <span className="text-emerald-700">✓ Pièces contrôlées</span>
                        )}
                      </p>
                    </button>
                  );
                })}
              </div>

              {/* Right inspection panel */}
              <div className="lg:col-span-8">
                {selectedDossier ? (
                  <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-200">
                    <div className="p-6 space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                          <p className="text-xs font-mono font-semibold text-blue-700">
                            {selectedDossier.dossierNumber} · CNE {selectedDossier.personalInfo.cne}
                          </p>
                          <h2 className="text-lg font-bold text-slate-900 mt-0.5">
                            {selectedDossier.personalInfo.firstName}{' '}
                            {selectedDossier.personalInfo.lastName}
                          </h2>
                          <p className="text-xs text-slate-600">
                            Statut :{' '}
                            <strong>{getStatusPresentation(selectedDossier.status).label}</strong>
                            {selectedDossier.enrollmentNumber &&
                              ` · Matricule : ${selectedDossier.enrollmentNumber}`}
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
                                  text: `Inscription administrative validée ! Matricule attribué : ${res.enrollmentNumber}`,
                                });
                              }
                            }}
                            className="px-4 py-2.5 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-2"
                          >
                            <ShieldCheck className="w-4 h-4" />
                            {selectedDossier.status === 'inscrit'
                              ? 'Inscription validée'
                              : 'Valider l’inscription définitive'}
                          </button>
                        )}
                      </div>

                      {/* Summary of the 3 chosen thesis subjects */}
                      <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1.5 text-xs">
                        <p className="font-semibold text-slate-800">
                          Vœux de thèse du candidat ({selectedDossier.subjectChoices.length}) :
                        </p>
                        <div className="space-y-1">
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
                                    <strong className="font-mono">Choix n°{ch.priority} :</strong>{' '}
                                    <span className="font-mono text-blue-700">
                                      {s?.code || ch.subjectId}
                                    </span>{' '}
                                    — {s?.title || 'Sujet'}
                                  </span>
                                  <span className={`font-semibold ${st.textClass}`}>
                                    {st.shortLabel}
                                    {isConfirmed ? ' · Sujet d’inscription retenu' : ''}
                                  </span>
                                </div>
                              );
                            })}
                        </div>
                      </div>
                    </div>

                    {/* All configured requirements check */}
                    <div className="divide-y divide-slate-200">
                      {campaignConfig.documentRequirements.map((req) => {
                        const uploaded = selectedDossier.documents.find(
                          (doc) => doc.requirementId === req.id
                        );
                        const status = uploaded ? uploaded.status : 'manquante';
                        const pres = getDocStatusPresentation(status);
                        const isAskingCorrection = correctionTargetReqId === req.id;

                        return (
                          <div key={req.id} className="p-5 space-y-3">
                            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                              <div className="space-y-1">
                                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                                  <span className="font-mono font-semibold text-slate-700">
                                    {req.code}
                                  </span>
                                  <span>·</span>
                                  <span>
                                    {req.stage === 'preinscription'
                                      ? 'Préinscription'
                                      : 'Inscription définitive'}
                                  </span>
                                  <span>·</span>
                                  <span>{req.required ? 'Obligatoire' : 'Facultatif'}</span>
                                  <span>·</span>
                                  <span className={`font-semibold ${pres.textClass}`}>
                                    {pres.label}
                                  </span>
                                </div>
                                <h3 className="text-sm font-bold text-slate-900">{req.label}</h3>
                                {uploaded ? (
                                  <p className="text-xs font-mono text-slate-600">
                                    {uploaded.fileName} ({formatFileSize(uploaded.fileSizeKB)}) · Déposé le{' '}
                                    {formatDateFR(uploaded.uploadedAt, true)}
                                  </p>
                                ) : (
                                  <p className="text-xs text-amber-700">
                                    Aucun fichier téléversé pour cette pièce.
                                  </p>
                                )}
                                {uploaded?.reviewComment && (
                                  <p className="text-xs text-red-700">
                                    Motif signalé : {uploaded.reviewComment}
                                  </p>
                                )}
                              </div>

                              {uploaded && (
                                <div className="flex items-center gap-2 shrink-0">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      reviewDocumentStatus(selectedDossier.id, req.id, 'validee');
                                      setCorrectionTargetReqId(null);
                                      setBanner({
                                        tone: 'success',
                                        text: `Pièce « ${req.code} » marquée conforme.`,
                                      });
                                    }}
                                    className="px-3 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors flex items-center gap-1"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                    Conforme
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      setCorrectionTargetReqId(isAskingCorrection ? null : req.id);
                                      setCorrectionReason(
                                        uploaded.reviewComment ||
                                          'Document flou ou incomplet. Merci de téléverser un scan PDF lisible et cacheté.'
                                      );
                                    }}
                                    className="px-3 py-1.5 text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-colors"
                                  >
                                    Demander correction
                                  </button>
                                </div>
                              )}
                            </div>

                            {isAskingCorrection && (
                              <div className="p-3.5 rounded-lg bg-red-50/70 border border-red-200 space-y-2.5">
                                <label className="block text-xs font-semibold text-red-950">
                                  Précisez l’anomalie au candidat (sera envoyée par notification) :
                                </label>
                                <input
                                  type="text"
                                  value={correctionReason}
                                  onChange={(e) => setCorrectionReason(e.target.value)}
                                  className="w-full px-3 py-1.5 text-xs bg-white border border-red-300 rounded-lg"
                                />
                                <div className="flex items-center justify-end gap-2">
                                  <button
                                    type="button"
                                    onClick={() => setCorrectionTargetReqId(null)}
                                    className="px-3 py-1.5 text-xs text-slate-600"
                                  >
                                    Annuler
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      reviewDocumentStatus(
                                        selectedDossier.id,
                                        req.id,
                                        'a_corriger',
                                        correctionReason
                                      );
                                      setCorrectionTargetReqId(null);
                                      setBanner({
                                        tone: 'success',
                                        text: 'Demande de correction envoyée au candidat.',
                                      });
                                    }}
                                    className="px-3.5 py-1.5 text-xs font-semibold text-white bg-red-700 hover:bg-red-800 rounded-lg"
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
                ) : (
                  <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-sm text-slate-500">
                    Aucun dossier à afficher.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: GESTION DES SUJETS DE THÈSE */}
        {activeTab === 'sujets' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-xl font-bold text-slate-900">
                  Gestion des sujets de thèse ({subjects.length})
                </h1>
                <p className="text-xs text-slate-600 mt-1">
                  Ajoutez de nouveaux sujets proposés par les laboratoires, suivez la validation tripartite (Structure · Centre · Pôle) ou ajustez les quotas de places.
                </p>
              </div>
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
                className="px-4 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors flex items-center gap-1.5 self-start"
              >
                <Plus className="w-4 h-4" />
                {showSubjectForm ? 'Fermer le formulaire' : 'Ajouter un sujet de thèse'}
              </button>
            </div>

            {showSubjectForm && (
              <form
                onSubmit={handleSaveSubject}
                className="bg-white border border-slate-200 rounded-xl p-6 space-y-4"
              >
                <h2 className="text-base font-bold text-slate-900">
                  {editingSubjectId ? 'Modifier le sujet de thèse' : 'Nouveau sujet de thèse'}
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Code sujet *
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
                      Places ouvertes *
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
                    Intitulé complet du sujet de thèse *
                  </label>
                  <input
                    type="text"
                    value={sujForm.title}
                    onChange={(e) => setSujForm({ ...sujForm, title: e.target.value })}
                    placeholder="Intitulé scientifique..."
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Directeur de thèse *
                    </label>
                    <input
                      type="text"
                      value={sujForm.supervisor}
                      onChange={(e) => setSujForm({ ...sujForm, supervisor: e.target.value })}
                      placeholder="Pr. Nom Prénom"
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Laboratoire d’accueil *
                    </label>
                    <input
                      type="text"
                      value={sujForm.laboratoire}
                      onChange={(e) => setSujForm({ ...sujForm, laboratoire: e.target.value })}
                      placeholder="Nom du laboratoire..."
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Établissement USMBA *
                    </label>
                    <input
                      type="text"
                      value={sujForm.etablissement}
                      onChange={(e) => setSujForm({ ...sujForm, etablissement: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Validation Structure (Labo)
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
                      Validation Centre (CEDoc)
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
                      Validation Pôle Doctoral
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

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Prérequis académiques
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
                      Description du sujet
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
                    className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 rounded-lg"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg"
                  >
                    Enregistrer le sujet
                  </button>
                </div>
              </form>
            )}

            <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-200">
              {subjects.map((suj) => {
                const val = suj.validationStatus || {
                  structure: 'validee',
                  centre: 'validee',
                  pole: 'validee',
                };
                return (
                  <div
                    key={suj.id}
                    className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-1 max-w-3xl">
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                        <span className="font-mono font-semibold text-blue-700">{suj.code}</span>
                        <span>·</span>
                        <span>{suj.etablissement}</span>
                        <span>·</span>
                        <span className="font-mono">{suj.places} place(s)</span>
                        <span>·</span>
                        <span
                          className={
                            suj.open
                              ? 'text-emerald-700 font-semibold'
                              : 'text-red-700 font-semibold'
                          }
                        >
                          {suj.open ? 'Ouvert aux candidatures' : 'Clôturé'}
                        </span>
                        <span>·</span>
                        <span>
                          Validation :{' '}
                          {val.structure === 'validee' &&
                          val.centre === 'validee' &&
                          val.pole === 'validee'
                            ? 'Structure · Centre · Pôle ✓'
                            : 'Validation partielle'}
                        </span>
                      </div>
                      <h3 className="text-sm font-bold text-slate-900">{suj.title}</h3>
                      <p className="text-xs text-slate-600">
                        {suj.supervisor} · {suj.laboratoire}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleOpenEditSubject(suj)}
                        className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center gap-1"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        Modifier
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleSubjectOpen(suj.id)}
                        className="px-3 py-1.5 text-xs font-semibold text-slate-700 border border-slate-200 hover:bg-slate-50 rounded-lg"
                      >
                        {suj.open ? 'Clôturer' : 'Réouvrir'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 4: CONFIGURATION DYNAMIQUE (PIÈCES, FORMATS, DATES LIMITES & RÈGLES) */}
        {activeTab === 'configuration' && (
          <div className="space-y-8">
            <div>
              <h1 className="text-xl font-bold text-slate-900">
                Paramétrage de la campagne, du nombre de sujets et des pièces demandées
              </h1>
              <p className="text-xs text-slate-600 mt-1">
                Adaptez les dates limites, le nombre de sujets choisis par candidat (par défaut 3), les pondérations et la liste des documents exigés selon l’établissement.
              </p>
            </div>

            {/* 1. Dates limites & Règles de sélection */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-bold text-slate-900">
                    Dates limites de la campagne
                  </h2>
                  <button
                    type="button"
                    onClick={() =>
                      updateCampaignSettings({ campaignOpen: !campaignConfig.campaignOpen })
                    }
                    className={`px-3 py-1 text-xs font-semibold rounded-md border ${
                      campaignConfig.campaignOpen
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                        : 'bg-red-50 border-red-200 text-red-800'
                    }`}
                  >
                    {campaignConfig.campaignOpen ? 'Campagne ouverte' : 'Campagne fermée'}
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Ouverture des préinscriptions
                    </label>
                    <input
                      type="date"
                      value={campaignConfig.openDate}
                      onChange={(e) => updateCampaignSettings({ openDate: e.target.value })}
                      className="w-full px-3 py-2 font-mono border border-slate-200 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Date limite de candidature
                    </label>
                    <input
                      type="date"
                      value={campaignConfig.submissionDeadline}
                      onChange={(e) =>
                        updateCampaignSettings({ submissionDeadline: e.target.value })
                      }
                      className="w-full px-3 py-2 font-mono border border-slate-200 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Période des entretiens
                    </label>
                    <input
                      type="text"
                      value={campaignConfig.interviewPeriod}
                      onChange={(e) =>
                        updateCampaignSettings({ interviewPeriod: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Limite d’inscription (Liste principale)
                    </label>
                    <input
                      type="date"
                      value={campaignConfig.enrollmentDeadline}
                      onChange={(e) =>
                        updateCampaignSettings({ enrollmentDeadline: e.target.value })
                      }
                      className="w-full px-3 py-2 font-mono border border-slate-200 rounded-lg"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block font-semibold text-slate-700 mb-1">
                      Période d’inscription — Liste d’attente
                    </label>
                    <input
                      type="text"
                      value={campaignConfig.waitlistEnrollmentPeriod || ''}
                      onChange={(e) =>
                        updateCampaignSettings({ waitlistEnrollmentPeriod: e.target.value })
                      }
                      placeholder="Ex. Du 28 novembre au 04 décembre 2026"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
                <h2 className="text-base font-bold text-slate-900">
                  Règles de sélection, vœux et pondérations
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="sm:col-span-2">
                    <label className="block font-semibold text-slate-700 mb-1">
                      Nombre de sujets de thèse à choisir par candidat
                    </label>
                    <div className="flex items-center gap-3">
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
                      <span className="text-slate-500">
                        sujets requis par dossier (standard USMBA : 3 sujets par ordre de priorité).
                      </span>
                    </div>
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Pondération Dossier académique (%)
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
                      Pondération Entretien oral (%)
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
                      Moyenne minimale Bac+5 requise (/20)
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
                      Note éliminatoire d’entretien (/20)
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

            {/* 2. Configuration des pièces justificatives demandées */}
            <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-200">
              <div className="p-6">
                <h2 className="text-base font-bold text-slate-900">
                  Pièces justificatives, caractère obligatoire et formats acceptés
                </h2>
                <p className="text-xs text-slate-600 mt-0.5">
                  Modifiez en direct les exigences documentaires : elles s’appliquent instantanément aux formulaires des candidats.
                </p>
              </div>

              {campaignConfig.documentRequirements.map((req) => (
                <div
                  key={req.id}
                  className="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 text-xs"
                >
                  <div className="space-y-1 max-w-xl">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-blue-700">{req.code}</span>
                      <span className="font-bold text-sm text-slate-900">{req.label}</span>
                    </div>
                    <p className="text-slate-600">{req.instructions}</p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 shrink-0">
                    {/* Stage selector */}
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
                      <option value="preinscription">Étape : Préinscription</option>
                      <option value="inscription">Étape : Inscription finale</option>
                    </select>

                    {/* Required toggle */}
                    <button
                      type="button"
                      onClick={() =>
                        upsertDocumentRequirement({ ...req, required: !req.required })
                      }
                      className={`px-2.5 py-1.5 rounded-md font-semibold border ${
                        req.required
                          ? 'bg-blue-50 border-blue-200 text-blue-800'
                          : 'bg-slate-50 border-slate-200 text-slate-600'
                      }`}
                    >
                      {req.required ? 'Obligatoire *' : 'Facultatif'}
                    </button>

                    {/* Accepted formats toggles */}
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
                            className={`px-2 py-0.5 rounded font-mono font-semibold ${
                              active ? 'bg-slate-900 text-white' : 'text-slate-500'
                            }`}
                          >
                            {fmt}
                          </button>
                        );
                      })}
                    </div>

                    {/* Max size MB */}
                    <div className="inline-flex items-center gap-1">
                      <span className="text-slate-500">Max</span>
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
                      className="p-1.5 text-slate-400 hover:text-red-700 rounded-md"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}

              {/* Add new document requirement */}
              <form onSubmit={handleAddDocumentRequirement} className="p-6 bg-slate-50/70 space-y-4">
                <h3 className="text-sm font-bold text-slate-900">
                  Ajouter une nouvelle pièce demandée aux candidats
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Code court *</label>
                    <input
                      type="text"
                      value={newReqCode}
                      onChange={(e) => setNewReqCode(e.target.value)}
                      placeholder="Ex. AUTORISATION"
                      className="w-full px-3 py-2 font-mono bg-white border border-slate-200 rounded-lg"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block font-semibold text-slate-700 mb-1">
                      Intitulé de la pièce *
                    </label>
                    <input
                      type="text"
                      value={newReqLabel}
                      onChange={(e) => setNewReqLabel(e.target.value)}
                      placeholder="Ex. Attestation de non-emploi ou autorisation employeur"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Étape</label>
                    <select
                      value={newReqStage}
                      onChange={(e) => setNewReqStage(e.target.value as DocumentStage)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg"
                    >
                      <option value="preinscription">Préinscription</option>
                      <option value="inscription">Inscription finale</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end text-xs">
                  <div className="sm:col-span-5">
                    <label className="block font-semibold text-slate-700 mb-1">
                      Instructions d’aide affichées au candidat
                    </label>
                    <input
                      type="text"
                      value={newReqInstructions}
                      onChange={(e) => setNewReqInstructions(e.target.value)}
                      placeholder="Ex. Document daté de moins de 3 mois cacheté..."
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg"
                    />
                  </div>
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
                  <div className="sm:col-span-2 flex items-center gap-1.5">
                    <input
                      type="checkbox"
                      id="new-req-mandatory"
                      checked={newReqRequired}
                      onChange={(e) => setNewReqRequired(e.target.checked)}
                    />
                    <label htmlFor="new-req-mandatory" className="font-semibold text-slate-700">
                      Obligatoire
                    </label>
                  </div>
                  <div className="sm:col-span-2">
                    <button
                      type="submit"
                      className="w-full py-2 px-3 font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg flex items-center justify-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Ajouter
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* TAB 5: COMPTES CANDIDATS & INTERVENANTS */}
        {activeTab === 'comptes' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Create Intervenant */}
              <form
                onSubmit={handleCreateIntervenant}
                className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 space-y-4"
              >
                <h2 className="text-base font-bold text-slate-900">
                  Créer un compte intervenant (Commission / Admin)
                </h2>
                <div className="space-y-3 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Nom complet *</label>
                    <input
                      type="text"
                      value={staffFullName}
                      onChange={(e) => setStaffFullName(e.target.value)}
                      placeholder="Pr. Sanae Bekkali"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      E-mail institutionnel *
                    </label>
                    <input
                      type="email"
                      value={staffEmail}
                      onChange={(e) => setStaffEmail(e.target.value)}
                      placeholder="s.bekkali@usmba.ac.ma"
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
                        <option value="commission">Commission de sélection</option>
                        <option value="admin">Administration CEDoc</option>
                      </select>
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Établissement
                      </label>
                      <input
                        type="text"
                        value={staffEtab}
                        onChange={(e) => setStaffEtab(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Titre / Fonction
                    </label>
                    <input
                      type="text"
                      value={staffTitle}
                      onChange={(e) => setStaffTitle(e.target.value)}
                      placeholder="Membre de Commission Pédagogique"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Laboratoire de rattachement
                    </label>
                    <input
                      type="text"
                      value={staffLab}
                      onChange={(e) => setStaffLab(e.target.value)}
                      placeholder="Ex. Laboratoire LIIAN"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full py-2.5 px-4 font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg"
                  >
                    Créer le compte intervenant
                  </button>
                </div>
              </form>

              {/* Accounts Directory */}
              <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl divide-y divide-slate-200">
                <div className="p-5">
                  <h2 className="text-base font-bold text-slate-900">
                    Comptes enregistrés sur la plateforme ({accounts.length})
                  </h2>
                </div>
                <div className="divide-y divide-slate-200 max-h-[520px] overflow-y-auto">
                  {accounts.map((acc) => (
                    <div
                      key={acc.id}
                      className="p-4 flex items-center justify-between gap-4 text-xs"
                    >
                      <div className="min-w-0">
                        <p className="font-bold text-slate-900 truncate">
                          {acc.fullName} ·{' '}
                          <span className="font-normal text-slate-500">
                            {acc.role === 'candidat'
                              ? `Candidat (${acc.cin || ''})`
                              : acc.role === 'commission'
                              ? 'Commission'
                              : 'Administration'}
                          </span>
                        </p>
                        <p className="text-slate-500 truncate">
                          {acc.email} {acc.etablissement ? `· ${acc.etablissement}` : ''}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => toggleAccountActive(acc.id)}
                        className={`px-3 py-1.5 rounded-md font-semibold shrink-0 border ${
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
          </div>
        )}

        {/* TAB 6: TICKETS DE SUPPORT CANDIDATS */}
        {activeTab === 'support' && (
          <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-200">
            <div className="p-6">
              <h1 className="text-lg font-bold text-slate-900">
                Demandes d’assistance des candidats ({supportTickets.length})
              </h1>
              <p className="text-xs text-slate-600 mt-0.5">
                Répondez directement aux candidats rencontrant une difficulté technique ou administrative.
              </p>
            </div>

            {supportTickets.map((ticket) => (
              <div key={ticket.id} className="p-6 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                  <span>
                    <strong className="font-mono text-slate-900">{ticket.reference}</strong> ·{' '}
                    {ticket.senderName} ({ticket.senderEmail}){' '}
                    {ticket.dossierNumber ? `· Dossier ${ticket.dossierNumber}` : ''}
                  </span>
                  <span
                    className={`font-semibold ${
                      ticket.status === 'repondu' ? 'text-emerald-700' : 'text-amber-700'
                    }`}
                  >
                    {ticket.status === 'repondu' ? '✓ Répondu' : 'En attente de réponse'}
                  </span>
                </div>
                <h3 className="text-sm font-bold text-slate-900">
                  [{ticket.category}] {ticket.subject}
                </h3>
                <p className="text-sm text-slate-700">{ticket.message}</p>

                {ticket.reply ? (
                  <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700">
                    <strong>Réponse envoyée :</strong> {ticket.reply}
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row gap-2 pt-2">
                    <input
                      type="text"
                      value={ticketReplies[ticket.id] || ''}
                      onChange={(e) =>
                        setTicketReplies({ ...ticketReplies, [ticket.id]: e.target.value })
                      }
                      placeholder="Saisissez votre réponse officielle au candidat..."
                      className="flex-1 px-3 py-2 text-xs border border-slate-200 rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const text = (ticketReplies[ticket.id] || '').trim();
                        if (!text) return;
                        replyToSupportTicket(ticket.id, text);
                        setBanner({
                          tone: 'success',
                          text: `Réponse envoyée et notifiée à ${ticket.senderName}.`,
                        });
                      }}
                      className="px-4 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg flex items-center gap-1.5 shrink-0"
                    >
                      <Send className="w-3.5 h-3.5" />
                      Répondre au candidat
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
