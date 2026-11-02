import React, { useMemo, useState } from 'react';
import {
  ArrowRight,
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  FileCheck2,
  GraduationCap,
  Menu,
  Plus,
  Search,
  Shield,
  Users,
  X,
} from 'lucide-react';
import { useGCD } from '../context/GCDContext';
import { formatDateFR } from '../utils/formatters';
import { AuthModal } from './AuthModal';
import { HelpCenter } from './HelpCenter';
import { UsmbaLogo } from './UsmbaLogo';

export const PublicPortal: React.FC = () => {
  const { subjects, campaignConfig, accounts, loginAsAccount } = useGCD();

  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [preselectedIds, setPreselectedIds] = useState<string[]>([]);
  const [authModalState, setAuthModalState] = useState<{
    open: boolean;
    mode: 'login' | 'register' | 'recover';
    subjectIds?: string[];
  }>({ open: false, mode: 'login' });

  // Thesis search & filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFormation, setSelectedFormation] = useState('Toutes');
  const [selectedLab, setSelectedLab] = useState('Tous');
  const [selectedDomain, setSelectedDomain] = useState('Tous');
  const [expandedSubjectId, setExpandedSubjectId] = useState<string | null>(subjects[0]?.id || null);

  const requiredChoices = Math.max(1, campaignConfig.requiredSubjectChoices || 3);
  const openSubjects = useMemo(() => subjects.filter((s) => s.open), [subjects]);

  const formations = useMemo(
    () => ['Toutes', ...Array.from(new Set(subjects.map((s) => s.formationDoctorale)))],
    [subjects]
  );
  const laboratories = useMemo(
    () => ['Tous', ...Array.from(new Set(subjects.map((s) => s.laboratoire)))],
    [subjects]
  );
  const domains = useMemo(
    () => ['Tous', ...Array.from(new Set(subjects.map((s) => s.domaine)))],
    [subjects]
  );

  const filteredSubjects = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return subjects.filter((s) => {
      if (selectedFormation !== 'Toutes' && s.formationDoctorale !== selectedFormation) return false;
      if (selectedLab !== 'Tous' && s.laboratoire !== selectedLab) return false;
      if (selectedDomain !== 'Tous' && s.domaine !== selectedDomain) return false;
      if (!q) return true;
      return (
        s.title.toLowerCase().includes(q) ||
        s.code.toLowerCase().includes(q) ||
        s.supervisor.toLowerCase().includes(q) ||
        s.laboratoire.toLowerCase().includes(q) ||
        s.etablissement.toLowerCase().includes(q) ||
        s.keywords.some((k) => k.toLowerCase().includes(q))
      );
    });
  }, [subjects, searchQuery, selectedFormation, selectedLab, selectedDomain]);

  const totalPlaces = useMemo(
    () => openSubjects.reduce((acc, s) => acc + s.places, 0),
    [openSubjects]
  );

  const handleToggleSubjectChoice = (subjectId: string) => {
    setPreselectedIds((prev) => {
      if (prev.includes(subjectId)) {
        return prev.filter((id) => id !== subjectId);
      }
      if (prev.length >= requiredChoices) {
        return prev;
      }
      return [...prev, subjectId];
    });
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      {/* Top Bar Contract: strictly 3 zones separated by gap-8 */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-xs border-b border-slate-200">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-8 px-4 sm:px-6 lg:px-8 h-16">
          {/* Zone 1: Official brand lockup */}
          <a
            href="#accueil"
            className="flex items-center gap-2.5 text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0"
          >
            <UsmbaLogo variant="emblem" className="h-9" />
            <span>GCD USMBA</span>
          </a>

          {/* Zone 2: 4 concise single-line text links */}
          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600">
            <a
              href="#sujets"
              className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Sujets de thèse
            </a>
            <a
              href="#calendrier"
              className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Calendrier
            </a>
            <a
              href="#espaces"
              className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Espaces démo
            </a>
            <a
              href="#aide"
              className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Aide & FAQ
            </a>
          </nav>

          {/* Zone 3: 1 primary action (+ mobile hamburger) */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => setAuthModalState({ open: true, mode: 'login' })}
              className="px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              Se connecter
            </button>
            <button
              type="button"
              onClick={() => setMobileNavOpen((v) => !v)}
              aria-label="Ouvrir le menu"
              className="md:hidden p-2 text-slate-600 hover:text-slate-900 rounded-lg"
            >
              {mobileNavOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {mobileNavOpen && (
          <div className="md:hidden border-t border-slate-200 bg-white px-4 py-3 flex flex-col gap-2 text-sm font-medium text-slate-700">
            <a href="#sujets" onClick={() => setMobileNavOpen(false)} className="py-2">
              Sujets de thèse
            </a>
            <a href="#calendrier" onClick={() => setMobileNavOpen(false)} className="py-2">
              Calendrier de la campagne
            </a>
            <a href="#espaces" onClick={() => setMobileNavOpen(false)} className="py-2">
              Explorer les espaces de démonstration
            </a>
            <a href="#aide" onClick={() => setMobileNavOpen(false)} className="py-2">
              Aide, Guide & Support
            </a>
          </div>
        )}
      </header>

      <main id="accueil" className="flex-1">
        {/* HERO SECTION */}
        <section className="bg-white border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-stretch">
              <div className="lg:col-span-7 flex flex-col justify-between space-y-6">
                <div className="space-y-4">
                  <UsmbaLogo variant="full" className="h-11 sm:h-14" />

                  <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-600">
                    <span>Pôle d’Études Doctorales</span>
                    <span aria-hidden="true">·</span>
                    <span>Plateforme de Gestion du Cycle Doctoral</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono text-blue-700 font-semibold">
                      Campagne {campaignConfig.academicYear}
                    </span>
                  </div>

                  <h1 className="text-3xl sm:text-4xl lg:text-[2.65rem] font-bold tracking-tight text-slate-900 leading-[1.15] text-balance max-w-2xl">
                    Préinscription et inscription au cycle doctoral, guidées étape par étape.
                  </h1>

                  <p className="text-base text-slate-600 leading-relaxed max-w-2xl">
                    Consultez les sujets proposés par les laboratoires accrédités de l’USMBA, sélectionnez vos{' '}
                    <strong className="font-semibold text-slate-900">
                      {requiredChoices} sujets de thèse par ordre de priorité
                    </strong>
                    , enregistrez votre dossier en brouillon à votre rythme et suivez vos entretiens et pièces justificatives en ligne.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() =>
                      setAuthModalState({
                        open: true,
                        mode: 'register',
                        subjectIds: preselectedIds,
                      })
                    }
                    className="px-5 py-3 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-2"
                  >
                    Créer mon dossier candidat
                    <ArrowRight className="w-4 h-4" />
                  </button>
                  <a
                    href="#sujets"
                    className="px-5 py-3 text-sm font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200/80 rounded-lg transition-colors whitespace-nowrap shrink-0"
                  >
                    Choisir mes {requiredChoices} sujets ({openSubjects.length} ouverts)
                  </a>
                </div>
              </div>

              {/* Right column: Campaign Timeline & Rules Summary */}
              <div
                id="calendrier"
                className="lg:col-span-5 bg-slate-50 border border-slate-200 rounded-xl p-6 flex flex-col justify-between space-y-6"
              >
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-blue-700" />
                      Calendrier officiel {campaignConfig.academicYear}
                    </span>
                    <span className="font-medium text-emerald-700">
                      {campaignConfig.campaignOpen ? '✓ Campagne ouverte' : 'Campagne clôturée'}
                    </span>
                  </div>
                </div>

                <div className="divide-y divide-slate-200 text-sm">
                  <div className="py-3 flex items-center justify-between gap-4">
                    <span className="text-slate-600">Ouverture des candidatures</span>
                    <span className="font-mono font-medium text-slate-900 tabular-nums">
                      {formatDateFR(campaignConfig.openDate)}
                    </span>
                  </div>
                  <div className="py-3 flex items-center justify-between gap-4">
                    <span className="text-slate-600">Date limite de soumission</span>
                    <span className="font-mono font-semibold text-blue-700 tabular-nums">
                      {formatDateFR(campaignConfig.submissionDeadline)}
                    </span>
                  </div>
                  <div className="py-3 flex items-center justify-between gap-4">
                    <span className="text-slate-600">Présélection & entretiens</span>
                    <span className="font-medium text-slate-900 text-right">
                      {campaignConfig.interviewPeriod}
                    </span>
                  </div>
                  <div className="py-3 flex items-center justify-between gap-4">
                    <span className="text-slate-600">Dépôt d’inscription définitive</span>
                    <span className="font-mono font-medium text-slate-900 tabular-nums">
                      {formatDateFR(campaignConfig.enrollmentDeadline)}
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200 text-xs text-slate-600 flex flex-wrap items-center justify-between gap-2">
                  <span>
                    Vœux requis : <strong className="font-mono text-slate-900">{requiredChoices} sujets</strong>
                  </span>
                  <span>
                    Pondération : <strong className="font-mono text-slate-900">{campaignConfig.dossierWeight}%</strong> dossier ·{' '}
                    <strong className="font-mono text-slate-900">{campaignConfig.interviewWeight}%</strong> oral
                  </span>
                </div>
              </div>
            </div>

            {/* Full-width 4-column KPI strip below hero */}
            <div className="mt-10 pt-8 border-t border-slate-200 grid grid-cols-2 lg:grid-cols-4 gap-6">
              <div>
                <p className="text-2xl font-bold font-mono text-slate-900 tabular-nums">
                  {openSubjects.length}
                </p>
                <p className="text-xs text-slate-600 mt-1">
                  Sujets de thèse ouverts à la candidature
                </p>
              </div>
              <div>
                <p className="text-2xl font-bold font-mono text-blue-700 tabular-nums">
                  {requiredChoices} sujets
                </p>
                <p className="text-xs text-slate-600 mt-1">
                  Sélectionnés par chaque candidat (Choix 1, 2 et 3)
                </p>
              </div>
              <div>
                <p className="text-2xl font-bold font-mono text-slate-900 tabular-nums">
                  {totalPlaces} places
                </p>
                <p className="text-xs text-slate-600 mt-1">
                  Réparties sur les formations doctorales USMBA
                </p>
              </div>
              <div>
                <p className="text-2xl font-bold font-mono text-slate-900 tabular-nums">
                  {campaignConfig.documentRequirements.filter((r) => r.stage === 'preinscription' && r.required).length} pièces
                </p>
                <p className="text-xs text-slate-600 mt-1">
                  Un seul dossier numérique valable pour vos {requiredChoices} choix
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* DEMO WORKSPACES QUICK SWITCHER SECTION */}
        <section id="espaces" className="py-12 border-b border-slate-200 bg-slate-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
            <div className="max-w-2xl">
              <p className="text-xs font-medium text-blue-700 mb-1">
                Démonstration interactive des 3 espaces acteurs
              </p>
              <h2 className="text-2xl font-bold tracking-tight text-slate-900">
                Testez la plateforme selon chaque rôle du diagramme GCD
              </h2>
              <p className="text-sm text-slate-600 mt-1">
                Chaque candidat sélectionne {requiredChoices} sujets. Toute décision prise dans l’espace Commission (par sujet) ou Administration est immédiatement visible côté Candidat.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Espace 1 : Candidat */}
              <div className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col justify-between space-y-5">
                <div className="space-y-3">
                  <div className="flex items-center gap-2.5 text-slate-900">
                    <GraduationCap className="w-5 h-5 text-blue-700 shrink-0" />
                    <h3 className="text-base font-bold">1. Espace Candidat</h3>
                  </div>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    Sélectionner et ordonner ses {requiredChoices} sujets (Choix 1, 2, 3), enregistrer son dossier en brouillon, déposer ses pièces et suivre ses convocations et résultats par sujet.
                  </p>
                </div>

                <div className="space-y-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => loginAsAccount('acc-cand-1')}
                    className="w-full py-2 px-3 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-blue-50 hover:text-blue-800 rounded-lg transition-colors flex items-center justify-between"
                  >
                    <span>Tester : Salma Bennani (Brouillon · 2/3 sujets choisis)</span>
                    <ArrowRight className="w-3.5 h-3.5 shrink-0" />
                  </button>
                  <button
                    type="button"
                    onClick={() => loginAsAccount('acc-cand-2')}
                    className="w-full py-2 px-3 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-blue-50 hover:text-blue-800 rounded-lg transition-colors flex items-center justify-between"
                  >
                    <span>Tester : Youssef El Amrani (3 choix · Entretien + Pièce à corriger)</span>
                    <ArrowRight className="w-3.5 h-3.5 shrink-0" />
                  </button>
                  <button
                    type="button"
                    onClick={() => loginAsAccount('acc-cand-3')}
                    className="w-full py-2 px-3 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-blue-50 hover:text-blue-800 rounded-lg transition-colors flex items-center justify-between"
                  >
                    <span>Tester : Kenza Tazi (Admise Choix 1 — Inscription finale)</span>
                    <ArrowRight className="w-3.5 h-3.5 shrink-0" />
                  </button>
                </div>
              </div>

              {/* Espace 2 : Commission */}
              <div className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col justify-between space-y-5">
                <div className="space-y-3">
                  <div className="flex items-center gap-2.5 text-slate-900">
                    <Users className="w-5 h-5 text-blue-700 shrink-0" />
                    <h3 className="text-base font-bold">2. Commission de sélection</h3>
                  </div>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    Consulter les candidatures regroupées par sujet (avec rang du vœu 1, 2 ou 3), examiner les pièces, planifier les entretiens, évaluer et exporter les listes.
                  </p>
                </div>

                <div className="space-y-2 pt-3 border-t border-slate-100">
                  {accounts
                    .filter((a) => a.role === 'commission')
                    .map((comm) => (
                      <button
                        key={comm.id}
                        type="button"
                        onClick={() => loginAsAccount(comm.id)}
                        className="w-full py-2.5 px-3 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-blue-50 hover:text-blue-800 rounded-lg transition-colors flex items-center justify-between"
                      >
                        <span className="truncate">
                          Ouvrir : {comm.fullName} ({comm.etablissement})
                        </span>
                        <ArrowRight className="w-3.5 h-3.5 shrink-0" />
                      </button>
                    ))}
                </div>
              </div>

              {/* Espace 3 : Administration */}
              <div className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col justify-between space-y-5">
                <div className="space-y-3">
                  <div className="flex items-center gap-2.5 text-slate-900">
                    <Shield className="w-5 h-5 text-blue-700 shrink-0" />
                    <h3 className="text-base font-bold">3. Administration CEDoc</h3>
                  </div>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    Suivre le tableau de bord des candidatures et vœux, paramétrer le nombre de sujets requis ({requiredChoices}), les pièces obligatoires, et valider les inscriptions définitives.
                  </p>
                </div>

                <div className="space-y-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => loginAsAccount('acc-admin-1')}
                    className="w-full py-3 px-4 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors flex items-center justify-between"
                  >
                    <span>Ouvrir l’espace Administration (Dr. Nadia Chraibi)</span>
                    <ArrowRight className="w-4 h-4 shrink-0" />
                  </button>
                  <p className="text-xs text-slate-500 flex items-center gap-1.5 pt-1">
                    <FileCheck2 className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                    Règles, quotas de choix et pièces modifiables en direct
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* THESIS SUBJECTS CATALOGUE */}
        <section id="sujets" className="py-14 bg-white border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div>
                <p className="text-xs font-medium text-blue-700 mb-1">
                  Offre de recherche {campaignConfig.academicYear} · Sélection jusqu’à {requiredChoices} sujets par candidat
                </p>
                <h2 className="text-2xl font-bold tracking-tight text-slate-900">
                  Catalogue des sujets de thèse proposés
                </h2>
                <p className="text-sm text-slate-600 mt-1">
                  Recherchez par formation doctorale, laboratoire ou domaine et présélectionnez vos{' '}
                  <strong>{requiredChoices} sujets</strong> par ordre de priorité avant de créer votre dossier.
                </p>
              </div>
              <p className="text-xs font-mono text-slate-500 tabular-nums">
                {filteredSubjects.length} sujet(s) affiché(s) sur {subjects.length}
              </p>
            </div>

            {/* Active 3-Subject Selection Bar */}
            {preselectedIds.length > 0 && (
              <div className="p-4 sm:p-5 rounded-xl bg-blue-50/70 border border-blue-200 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="space-y-1.5">
                  <p className="text-xs font-bold text-blue-950 font-mono tabular-nums">
                    Ma sélection : {preselectedIds.length} / {requiredChoices} sujets choisis
                  </p>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-blue-900">
                    {preselectedIds.map((id, idx) => {
                      const s = subjects.find((item) => item.id === id);
                      return (
                        <span key={id} className="inline-flex items-center gap-1.5">
                          <strong className="font-mono">Choix {idx + 1} :</strong> {s?.code || id}
                          <button
                            type="button"
                            onClick={() => handleToggleSubjectChoice(id)}
                            className="text-blue-700 hover:text-red-700 underline text-[11px]"
                          >
                            retirer
                          </button>
                        </span>
                      );
                    })}
                  </div>
                </div>
                <div className="flex items-center gap-2.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => setPreselectedIds([])}
                    className="px-3 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors whitespace-nowrap"
                  >
                    Vider
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setAuthModalState({
                        open: true,
                        mode: 'register',
                        subjectIds: preselectedIds,
                      })
                    }
                    className="px-4 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5"
                  >
                    Candidater avec cette sélection ({preselectedIds.length}/{requiredChoices})
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* Search & Filter Controls */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 p-4 bg-slate-50 border border-slate-200 rounded-xl">
              <div className="md:col-span-5 relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Titre, code sujet, encadrant, mot-clé, établissement..."
                  className="w-full pl-10 pr-3.5 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div className="md:col-span-3">
                <select
                  aria-label="Filtrer par formation doctorale"
                  value={selectedFormation}
                  onChange={(e) => setSelectedFormation(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  {formations.map((f) => (
                    <option key={f} value={f}>
                      {f === 'Toutes' ? 'Toutes les formations doctorales' : f}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <select
                  aria-label="Filtrer par laboratoire"
                  value={selectedLab}
                  onChange={(e) => setSelectedLab(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  {laboratories.map((l) => (
                    <option key={l} value={l}>
                      {l === 'Tous' ? 'Tous les laboratoires' : l}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <select
                  aria-label="Filtrer par domaine"
                  value={selectedDomain}
                  onChange={(e) => setSelectedDomain(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  {domains.map((d) => (
                    <option key={d} value={d}>
                      {d === 'Tous' ? 'Tous les domaines' : d}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Thesis list — Zero-Pill metadata discipline */}
            <div className="border border-slate-200 rounded-xl divide-y divide-slate-200 bg-white">
              {filteredSubjects.length === 0 ? (
                <div className="p-10 text-center space-y-3">
                  <p className="text-sm font-semibold text-slate-900">
                    Aucun sujet de thèse ne correspond aux filtres sélectionnés.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedFormation('Toutes');
                      setSelectedLab('Tous');
                      setSelectedDomain('Tous');
                    }}
                    className="px-4 py-2 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                  >
                    Réinitialiser les critères de recherche
                  </button>
                </div>
              ) : (
                filteredSubjects.map((suj) => {
                  const isExpanded = expandedSubjectId === suj.id;
                  const choiceIndex = preselectedIds.indexOf(suj.id);
                  const isSelected = choiceIndex !== -1;
                  const isSelectionFull = preselectedIds.length >= requiredChoices && !isSelected;

                  return (
                    <div
                      key={suj.id}
                      className={`p-6 space-y-3 ${isSelected ? 'bg-blue-50/30' : 'bg-white'}`}
                    >
                      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                        <div className="space-y-1.5 max-w-3xl">
                          {/* Unboxed static metadata with middle dots */}
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
                            <span className="font-mono font-semibold text-blue-700">{suj.code}</span>
                            <span aria-hidden="true">·</span>
                            <span>{suj.domaine}</span>
                            <span aria-hidden="true">·</span>
                            <span>{suj.etablissement}</span>
                            <span aria-hidden="true">·</span>
                            <span className="font-mono tabular-nums text-slate-700">
                              {suj.places} {suj.places > 1 ? 'places' : 'place'}
                            </span>
                            <span aria-hidden="true">·</span>
                            <span
                              className={
                                suj.open ? 'text-emerald-700 font-medium' : 'text-red-700 font-medium'
                              }
                            >
                              {suj.open ? 'Ouvert' : 'Clôturé'}
                            </span>
                          </div>

                          <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-snug">
                            {suj.title}
                          </h3>

                          <p className="text-xs text-slate-600">
                            <span className="font-medium text-slate-800">Encadrant :</span>{' '}
                            {suj.supervisor} ·{' '}
                            <span className="font-medium text-slate-800">Laboratoire :</span>{' '}
                            {suj.laboratoire}
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => setExpandedSubjectId(isExpanded ? null : suj.id)}
                            className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200/80 rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5"
                          >
                            Détails & prérequis
                            <ChevronDown
                              className={`w-3.5 h-3.5 transition-transform duration-150 ${
                                isExpanded ? 'rotate-180' : ''
                              }`}
                            />
                          </button>

                          {suj.open && (
                            <button
                              type="button"
                              disabled={isSelectionFull}
                              onClick={() => handleToggleSubjectChoice(suj.id)}
                              className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                                isSelected
                                  ? 'bg-emerald-50 text-emerald-900 border border-emerald-300 hover:bg-emerald-100'
                                  : isSelectionFull
                                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                  : 'bg-blue-700 text-white hover:bg-blue-800'
                              }`}
                            >
                              {isSelected ? (
                                <>
                                  <Check className="w-3.5 h-3.5 text-emerald-700" />
                                  Choix n°{choiceIndex + 1} (Retirer)
                                </>
                              ) : isSelectionFull ? (
                                `${requiredChoices}/${requiredChoices} choix atteints`
                              ) : (
                                <>
                                  <Plus className="w-3.5 h-3.5" />
                                  Ajouter en Choix n°{preselectedIds.length + 1}
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="pt-4 mt-3 border-t border-slate-100 grid grid-cols-1 lg:grid-cols-12 gap-6 text-sm">
                          <div className="lg:col-span-7 space-y-2">
                            <p className="text-xs font-semibold text-slate-900">
                              Résumé scientifique du projet doctoral
                            </p>
                            <p className="text-slate-600 leading-relaxed">{suj.description}</p>
                            <p className="text-xs text-slate-500 pt-1">
                              Mots-clés : {suj.keywords.join(' · ')}
                            </p>
                          </div>
                          <div className="lg:col-span-5 space-y-2 bg-slate-50 border border-slate-200 rounded-lg p-4">
                            <p className="text-xs font-semibold text-slate-900">
                              Formation doctorale & Profil requis
                            </p>
                            <p className="text-xs text-slate-700">
                              <strong>Formation :</strong> {suj.formationDoctorale} ({suj.cedoc})
                            </p>
                            <p className="text-xs text-slate-600 leading-relaxed">
                              <strong>Prérequis :</strong> {suj.prerequisites}
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
        </section>

        {/* EMBEDDED HELP, GUIDE & SUPPORT SECTION */}
        <section id="aide" className="py-14 bg-slate-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <HelpCenter />
          </div>
        </section>
      </main>

      {/* Clean institutional footer */}
      <footer className="bg-white border-t border-slate-200 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6 text-xs text-slate-500">
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <UsmbaLogo variant="full" className="h-9 sm:h-10" />
            <div className="hidden sm:block h-6 w-px bg-slate-200" aria-hidden="true" />
            <span>Pôle d’Études Doctorales · Plateforme GCD</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1 text-slate-600">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
              Assistance : reclamation.gcd@usmba.ac.ma
            </span>
          </div>
        </div>
      </footer>

      {authModalState.open && (
        <AuthModal
          initialMode={authModalState.mode}
          preselectedSubjectIds={authModalState.subjectIds ?? preselectedIds}
          onClose={() => setAuthModalState((prev) => ({ ...prev, open: false }))}
        />
      )}
    </div>
  );
};
