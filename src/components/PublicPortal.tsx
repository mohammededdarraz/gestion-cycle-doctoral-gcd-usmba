import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  Calendar,
  Check,
  ChevronDown,
  Download,
  FileText,
  HelpCircle,
  LogIn,
  Menu,
  Plus,
  RotateCcw,
  Search,
  UserPlus,
  X,
} from 'lucide-react';
import { useGCD } from '../context/GCDContext';
import { formatDateFR } from '../utils/formatters';
import { AuthModal } from './AuthModal';
import { HelpCenter } from './HelpCenter';
import { UsmbaLogo } from './UsmbaLogo';

export const PublicPortal: React.FC = () => {
  const { subjects, campaignConfig, announcements } = useGCD();
  const activeAnnouncements = useMemo(
    () => announcements.filter((a) => a.active),
    [announcements]
  );

  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [preselectedIds, setPreselectedIds] = useState<string[]>([]);
  const [authModalState, setAuthModalState] = useState<{
    open: boolean;
    mode: 'login' | 'register' | 'recover';
    subjectIds?: string[];
  }>({ open: false, mode: 'login' });

  const [helpModalOpen, setHelpModalOpen] = useState(false);

  useEffect(() => {
    if (!helpModalOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setHelpModalOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [helpModalOpen]);

  // Catalogue filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFormation, setSelectedFormation] = useState('Toutes');
  const [selectedLab, setSelectedLab] = useState('Tous');
  const [selectedDomain, setSelectedDomain] = useState('Tous');
  const [expandedSubjectId, setExpandedSubjectId] = useState<string | null>(null);

  const requiredChoices = Math.max(1, campaignConfig.requiredSubjectChoices || 3);

  const campaignDates = useMemo(() => {
    const items: { label: string; value: string; emphasize?: boolean }[] = [];
    if (campaignConfig.openDate?.trim()) {
      items.push({
        label: 'Ouverture des candidatures',
        value: formatDateFR(campaignConfig.openDate),
      });
    }
    if (campaignConfig.submissionDeadline?.trim()) {
      items.push({
        label: 'Date limite de candidature',
        value: formatDateFR(campaignConfig.submissionDeadline),
        emphasize: true,
      });
    }
    if (campaignConfig.interviewPeriod?.trim()) {
      items.push({
        label: 'Entretiens',
        value: campaignConfig.interviewPeriod.trim(),
      });
    }
    if (campaignConfig.enrollmentDeadline?.trim()) {
      items.push({
        label: 'Inscription définitive',
        value: formatDateFR(campaignConfig.enrollmentDeadline),
      });
    }
    return items;
  }, [campaignConfig]);

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

  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    selectedFormation !== 'Toutes' ||
    selectedLab !== 'Tous' ||
    selectedDomain !== 'Tous';

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedFormation('Toutes');
    setSelectedLab('Tous');
    setSelectedDomain('Tous');
  };

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

  const handleMovePreselected = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= preselectedIds.length) return;
    setPreselectedIds((prev) => {
      const next = [...prev];
      const [moved] = next.splice(index, 1);
      next.splice(target, 0, moved);
      return next;
    });
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      {/* Institutional Header */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-xs border-b border-slate-200">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-6 px-4 sm:px-6 lg:px-8 h-16">
          <a
            href="#accueil"
            className="flex items-center gap-2.5 text-sm sm:text-base font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0"
          >
            <UsmbaLogo variant="emblem" className="h-8" />
            <span>GCD USMBA</span>
          </a>

          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600">
            <a
              href="#sujets"
              className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0"
            >
              Sujets
            </a>
            {campaignDates.length > 0 && (
              <a
                href="#calendrier"
                className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0"
              >
                Calendrier
              </a>
            )}
            <a
              href="#documents"
              className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0"
            >
              Documents
            </a>
            <button
              type="button"
              onClick={() => setHelpModalOpen(true)}
              className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Aide
            </button>
          </nav>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() =>
                setAuthModalState({
                  open: true,
                  mode: 'login',
                  subjectIds: preselectedIds,
                })
              }
              className="px-4 py-2 text-xs sm:text-sm font-semibold text-slate-800 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Se connecter
            </button>
            <button
              type="button"
              onClick={() => setMobileNavOpen((v) => !v)}
              aria-label={mobileNavOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
              aria-expanded={mobileNavOpen}
              className="md:hidden p-2 text-slate-600 hover:text-slate-900 rounded-lg"
            >
              {mobileNavOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {mobileNavOpen && (
          <div className="md:hidden border-t border-slate-200 bg-white px-4 py-3 flex flex-col gap-1 text-sm font-medium text-slate-700">
            <a
              href="#sujets"
              onClick={() => setMobileNavOpen(false)}
              className="py-2 hover:text-slate-900"
            >
              Sujets
            </a>
            {campaignDates.length > 0 && (
              <a
                href="#calendrier"
                onClick={() => setMobileNavOpen(false)}
                className="py-2 hover:text-slate-900"
              >
                Calendrier
              </a>
            )}
            <a
              href="#documents"
              onClick={() => setMobileNavOpen(false)}
              className="py-2 hover:text-slate-900"
            >
              Documents
            </a>
            <button
              type="button"
              onClick={() => {
                setMobileNavOpen(false);
                setHelpModalOpen(true);
              }}
              className="py-2 text-left hover:text-slate-900"
            >
              Aide & Support
            </button>
          </div>
        )}
      </header>

      <main id="accueil" className="flex-1">
        {/* HERO & ESSENTIAL DATES */}
        <section className="bg-white border-b border-slate-200">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
              {/* Institutional Identity & Primary Actions */}
              <div className="lg:col-span-7 space-y-6">
                <div className="flex items-center gap-3.5">
                  <UsmbaLogo variant="emblem" className="h-12 sm:h-14" />
                  <div className="min-w-0">
                    <p className="text-sm sm:text-base font-semibold text-slate-800">
                      Université Sidi Mohamed Ben Abdellah – Fès
                    </p>
                    {campaignConfig.academicYear && (
                      <p className="text-xs text-slate-500 font-mono tabular-nums mt-0.5">
                        Session {campaignConfig.academicYear}
                      </p>
                    )}
                  </div>
                </div>

                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-slate-900 leading-[1.12]">
                  Gestion du Cycle Doctoral
                </h1>

                {/* Primary Actions */}
                <div className="flex flex-wrap items-center gap-3 pt-1">
                  <a
                    href="#sujets"
                    className="px-5 py-2.5 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors whitespace-nowrap shrink-0 inline-flex items-center justify-center gap-2"
                  >
                    <span>Consulter les sujets</span>
                    <ArrowRight className="w-4 h-4" />
                  </a>

                  {campaignConfig.campaignOpen && (
                    <button
                      type="button"
                      onClick={() =>
                        setAuthModalState({
                          open: true,
                          mode: 'register',
                          subjectIds: preselectedIds,
                        })
                      }
                      className="px-5 py-2.5 text-sm font-semibold text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors whitespace-nowrap shrink-0 inline-flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <UserPlus className="w-4 h-4 text-blue-700" />
                      <span>Préinscription</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() =>
                      setAuthModalState({
                        open: true,
                        mode: 'login',
                        subjectIds: preselectedIds,
                      })
                    }
                    className="px-5 py-2.5 text-sm font-semibold text-slate-800 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg transition-colors whitespace-nowrap shrink-0 inline-flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <LogIn className="w-4 h-4 text-slate-600" />
                    <span>Se connecter</span>
                  </button>
                </div>
              </div>

              {/* Essential Application Dates */}
              {campaignDates.length > 0 && (
                <div
                  id="calendrier"
                  className="lg:col-span-5 border-t lg:border-t-0 lg:border-l border-slate-200 pt-6 lg:pt-0 lg:pl-10 space-y-4 scroll-mt-20"
                >
                  <div className="flex items-center justify-between gap-4">
                    <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-blue-700 shrink-0" />
                      <span>Calendrier de candidature</span>
                    </h2>
                    <span
                      className={`text-xs font-semibold whitespace-nowrap ${
                        campaignConfig.campaignOpen ? 'text-emerald-700' : 'text-slate-500'
                      }`}
                    >
                      {campaignConfig.campaignOpen ? 'Campagne ouverte' : 'Campagne clôturée'}
                    </span>
                  </div>

                  <dl className="divide-y divide-slate-200 text-sm">
                    {campaignDates.map((item) => (
                      <div
                        key={item.label}
                        className="py-2.5 first:pt-1 last:pb-0 flex items-baseline justify-between gap-4"
                      >
                        <dt className="text-slate-600 text-xs sm:text-sm">{item.label}</dt>
                        <dd
                          className={`text-right text-xs sm:text-sm tabular-nums ${
                            item.emphasize
                              ? 'font-semibold text-blue-700'
                              : 'font-medium text-slate-900'
                          }`}
                        >
                          {item.value}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </div>
              )}
            </div>

            {activeAnnouncements.length > 0 && (
              <div className="mt-8 pt-5 border-t border-slate-200 space-y-2">
                {activeAnnouncements.slice(0, 2).map((ann) => (
                  <div
                    key={ann.id}
                    className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 text-xs sm:text-sm"
                  >
                    <p className="text-slate-700">
                      <strong
                        className={
                          ann.important
                            ? 'font-semibold text-blue-800'
                            : 'font-semibold text-slate-900'
                        }
                      >
                        {ann.title} :
                      </strong>{' '}
                      <span>{ann.message}</span>
                    </p>
                    <span className="text-xs font-mono text-slate-400 tabular-nums shrink-0">
                      {formatDateFR(ann.publishedAt)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* THESIS SUBJECTS CATALOGUE */}
        <section id="sujets" className="py-10 sm:py-14 scroll-mt-16">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
              <h2 className="text-xl font-bold tracking-tight text-slate-900">
                Catalogue des sujets
              </h2>

              <div className="flex items-center gap-3 text-xs text-slate-500">
                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="inline-flex items-center gap-1 font-medium text-blue-700 hover:text-blue-900 hover:underline underline-offset-4 whitespace-nowrap cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Réinitialiser
                  </button>
                )}
                <span className="font-mono tabular-nums">
                  {filteredSubjects.length} sujet{filteredSubjects.length > 1 ? 's' : ''}
                </span>
              </div>
            </div>

            {/* Ordered Priority Selection Bar */}
            {preselectedIds.length > 0 && (
              <div className="p-4 rounded-xl bg-white border border-blue-200 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="space-y-1.5 min-w-0">
                  <p className="text-xs font-semibold text-slate-900 font-mono tabular-nums">
                    Sujets sélectionnés ({preselectedIds.length}/{requiredChoices})
                  </p>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-700">
                    {preselectedIds.map((id, idx) => {
                      const s = subjects.find((item) => item.id === id);
                      return (
                        <span key={id} className="inline-flex items-center gap-1.5">
                          <strong className="font-mono text-blue-700">Choix {idx + 1} :</strong>
                          <span className="font-mono">{s?.code || id}</span>
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => handleMovePreselected(idx, -1)}
                            aria-label="Monter la priorité"
                            className="p-0.5 text-slate-400 hover:text-slate-800 disabled:opacity-30 cursor-pointer"
                          >
                            <ArrowUp className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            disabled={idx === preselectedIds.length - 1}
                            onClick={() => handleMovePreselected(idx, 1)}
                            aria-label="Descendre la priorité"
                            className="p-0.5 text-slate-400 hover:text-slate-800 disabled:opacity-30 cursor-pointer"
                          >
                            <ArrowDown className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggleSubjectChoice(id)}
                            aria-label="Retirer ce sujet"
                            className="text-slate-400 hover:text-red-700 cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </span>
                      );
                    })}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setPreselectedIds([])}
                    className="px-3 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
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
                    className="px-4 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors whitespace-nowrap inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>Continuer la préinscription</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* Filter Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 p-3 bg-white border border-slate-200 rounded-xl">
              <div className="sm:col-span-2 lg:col-span-5 relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Titre, code, encadrant, laboratoire..."
                  className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div className="lg:col-span-3">
                <select
                  aria-label="Formation doctorale"
                  value={selectedFormation}
                  onChange={(e) => setSelectedFormation(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
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
                  aria-label="Laboratoire"
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

              <div className="lg:col-span-2">
                <select
                  aria-label="Domaine"
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

            {/* Subject Rows */}
            <div className="border border-slate-200 rounded-xl divide-y divide-slate-200 bg-white">
              {filteredSubjects.length === 0 ? (
                <div className="p-10 text-center space-y-3">
                  <p className="text-sm text-slate-600">Aucun sujet trouvé.</p>
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="px-4 py-2 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors cursor-pointer"
                  >
                    Réinitialiser les filtres
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
                      className={`p-5 transition-colors ${
                        isSelected ? 'bg-blue-50/30' : 'bg-white'
                      }`}
                    >
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        <div className="space-y-1.5 max-w-3xl">
                          <h3 className="text-base font-semibold text-slate-900 leading-snug">
                            <button
                              type="button"
                              onClick={() => setExpandedSubjectId(isExpanded ? null : suj.id)}
                              className="text-left hover:text-blue-800 transition-colors cursor-pointer"
                            >
                              {suj.title}
                            </button>
                          </h3>

                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-600">
                            <span className="font-semibold text-slate-900">{suj.supervisor}</span>
                            <span aria-hidden="true">·</span>
                            <span>{suj.laboratoire}</span>
                            <span aria-hidden="true">·</span>
                            <span className="font-mono font-semibold text-blue-700 tabular-nums">
                              {suj.places} {suj.places > 1 ? 'places disponibles' : 'place disponible'}
                            </span>
                            {!suj.open && (
                              <>
                                <span aria-hidden="true">·</span>
                                <span className="text-red-700 font-medium">Clôturé</span>
                              </>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => setExpandedSubjectId(isExpanded ? null : suj.id)}
                            className="px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200/80 rounded-lg transition-colors whitespace-nowrap shrink-0 inline-flex items-center gap-1.5 cursor-pointer"
                          >
                            <span>{isExpanded ? 'Masquer les détails' : 'Voir les détails'}</span>
                            <ChevronDown
                              className={`w-3.5 h-3.5 transition-transform duration-150 ${
                                isExpanded ? 'rotate-180' : ''
                              }`}
                            />
                          </button>

                          {suj.open && campaignConfig.campaignOpen && (
                            <button
                              type="button"
                              disabled={isSelectionFull}
                              onClick={() => handleToggleSubjectChoice(suj.id)}
                              className={`px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 inline-flex items-center gap-1.5 ${
                                isSelected
                                  ? 'bg-emerald-50 text-emerald-900 border border-emerald-300 hover:bg-emerald-100 cursor-pointer'
                                  : isSelectionFull
                                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                  : 'bg-blue-700 text-white hover:bg-blue-800 cursor-pointer'
                              }`}
                            >
                              {isSelected ? (
                                <>
                                  <Check className="w-3.5 h-3.5 text-emerald-700" />
                                  <span>Choix {choiceIndex + 1}</span>
                                </>
                              ) : isSelectionFull ? (
                                <span>{requiredChoices}/{requiredChoices} choisis</span>
                              ) : (
                                <>
                                  <Plus className="w-3.5 h-3.5" />
                                  <span>Choisir</span>
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="pt-4 mt-4 border-t border-slate-100 grid grid-cols-1 lg:grid-cols-12 gap-5 text-xs">
                          <div className="lg:col-span-7 space-y-2">
                            <p className="text-slate-500 font-mono">
                              Réf. {suj.code} · {suj.etablissement}
                            </p>
                            <p className="text-slate-700 text-sm leading-relaxed">
                              {suj.description}
                            </p>
                            {suj.keywords.length > 0 && (
                              <p className="text-slate-500">
                                Mots-clés : {suj.keywords.join(' · ')}
                              </p>
                            )}
                          </div>
                          <div className="lg:col-span-5 lg:border-l lg:border-slate-100 lg:pl-5 space-y-2">
                            <div>
                              <p className="font-semibold text-slate-900">Formation doctorale</p>
                              <p className="text-slate-600 mt-0.5">{suj.formationDoctorale}</p>
                            </div>
                            <div>
                              <p className="font-semibold text-slate-900">Prérequis</p>
                              <p className="text-slate-600 mt-0.5 leading-relaxed">
                                {suj.prerequisites}
                              </p>
                            </div>
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

        {/* OFFICIAL DOCUMENTS */}
        <section id="documents" className="pb-12 scroll-mt-20">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-3">
            <h2 className="text-sm font-semibold text-slate-900">Documents officiels</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 bg-white border border-slate-200 rounded-xl divide-y md:divide-y-0 md:divide-x divide-slate-200">
              <a
                href="/assets/gcd_docs/Procedure_Inscription_GCD_2026_2027.pdf"
                download="Procedure_Inscription_GCD_USMBA.pdf"
                className="p-4 flex items-center justify-between gap-3 hover:bg-slate-50 transition-colors group"
              >
                <span className="flex items-center gap-2.5 min-w-0">
                  <FileText className="w-4 h-4 text-blue-700 shrink-0" />
                  <span className="text-xs sm:text-sm font-medium text-slate-800 group-hover:text-blue-800 truncate">
                    Procédure d’inscription (PDF)
                  </span>
                </span>
                <Download className="w-4 h-4 text-slate-400 group-hover:text-blue-700 shrink-0" />
              </a>

              <a
                href="/assets/gcd_docs/Charte_Theses_USMBA_2026_2027.pdf"
                download="Charte_Theses_USMBA.pdf"
                className="p-4 flex items-center justify-between gap-3 hover:bg-slate-50 transition-colors group"
              >
                <span className="flex items-center gap-2.5 min-w-0">
                  <FileText className="w-4 h-4 text-blue-700 shrink-0" />
                  <span className="text-xs sm:text-sm font-medium text-slate-800 group-hover:text-blue-800 truncate">
                    Charte des thèses USMBA (PDF)
                  </span>
                </span>
                <Download className="w-4 h-4 text-slate-400 group-hover:text-blue-700 shrink-0" />
              </a>

              <a
                href="/assets/aistudio/Guide_dUtilisation_pour_Professeurs_5c5f779c.pdf"
                download="Guide_Utilisation_Professeurs_GCD_USMBA.pdf"
                className="p-4 flex items-center justify-between gap-3 hover:bg-slate-50 transition-colors group"
              >
                <span className="flex items-center gap-2.5 min-w-0">
                  <FileText className="w-4 h-4 text-blue-700 shrink-0" />
                  <span className="text-xs sm:text-sm font-medium text-slate-800 group-hover:text-blue-800 truncate">
                    Guide professeurs & commissions (PDF)
                  </span>
                </span>
                <Download className="w-4 h-4 text-slate-400 group-hover:text-blue-700 shrink-0" />
              </a>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-5">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-2.5">
            <UsmbaLogo variant="emblem" className="h-6" />
            <span>Université Sidi Mohamed Ben Abdellah – Fès</span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
            <a
              href="mailto:reclamation.gcd@usmba.ac.ma"
              className="hover:text-slate-900 transition-colors font-mono"
            >
              reclamation.gcd@usmba.ac.ma
            </a>
            <button
              type="button"
              onClick={() => setHelpModalOpen(true)}
              className="hover:text-slate-900 transition-colors inline-flex items-center gap-1 cursor-pointer"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>Aide & Support</span>
            </button>
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

      {helpModalOpen && (
        <div
          onClick={() => setHelpModalOpen(false)}
          className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-label="Aide et Support GCD"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-slate-50 border border-slate-200 rounded-xl w-full max-w-4xl max-h-[88vh] flex flex-col overflow-hidden"
          >
            <div className="px-6 py-4 bg-white border-b border-slate-200 flex items-center justify-between gap-4 shrink-0">
              <div className="flex items-center gap-2.5">
                <UsmbaLogo variant="emblem" className="h-7" />
                <span className="text-sm font-bold text-slate-900">Aide & Support — GCD USMBA</span>
              </div>
              <button
                type="button"
                onClick={() => setHelpModalOpen(false)}
                aria-label="Fermer"
                className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto">
              <HelpCenter compactHeader />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
