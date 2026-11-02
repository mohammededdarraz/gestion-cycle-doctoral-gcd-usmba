import React, { useMemo, useState } from 'react';
import {
  BookOpen,
  CheckCircle2,
  ChevronDown,
  Download,
  FileText,
  FileWarning,
  HelpCircle,
  Mail,
  MessageSquare,
  Search,
  Send,
  Workflow,
} from 'lucide-react';
import { useGCD } from '../context/GCDContext';
import { FAQ_ENTRIES } from '../data/demoData';
import { FaqEntry, SupportTicket } from '../types/gcd';
import { formatDateFR } from '../utils/formatters';

interface HelpCenterProps {
  compactHeader?: boolean;
}

export const HelpCenter: React.FC<HelpCenterProps> = ({ compactHeader = false }) => {
  const {
    currentUser,
    currentCandidateDossier,
    campaignConfig,
    supportTickets,
    submitSupportTicket,
  } = useGCD();

  const [activeSection, setActiveSection] = useState<'guide' | 'faq' | 'support'>('guide');
  const [showOfficialDiagram, setShowOfficialDiagram] = useState(false);
  const [diagramLoadError, setDiagramLoadError] = useState(false);

  // FAQ filter state
  const [faqQuery, setFaqQuery] = useState('');
  const [faqCategory, setFaqCategory] = useState<'Tous' | FaqEntry['category']>('Tous');
  const [openFaqId, setOpenFaqId] = useState<string | null>(FAQ_ENTRIES[0]?.id || null);

  // Support form state
  const [senderName, setSenderName] = useState(currentUser?.fullName || '');
  const [senderEmail, setSenderEmail] = useState(currentUser?.email || '');
  const [dossierNumber, setDossierNumber] = useState(currentCandidateDossier?.dossierNumber || '');
  const [category, setCategory] = useState<SupportTicket['category']>(
    'Choix des 3 sujets & éligibilité'
  );
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submittedRef, setSubmittedRef] = useState<string | null>(null);

  const filteredFaqs = useMemo(() => {
    const q = faqQuery.trim().toLowerCase();
    return FAQ_ENTRIES.filter((entry) => {
      const catMatch = faqCategory === 'Tous' || entry.category === faqCategory;
      const textMatch =
        !q ||
        entry.question.toLowerCase().includes(q) ||
        entry.answer.toLowerCase().includes(q);
      return catMatch && textMatch;
    });
  }, [faqQuery, faqCategory]);

  const userTickets = useMemo(() => {
    if (!currentUser) return supportTickets.slice(0, 2);
    return supportTickets.filter(
      (t) =>
        t.accountId === currentUser.id ||
        t.senderEmail.toLowerCase() === currentUser.email.toLowerCase()
    );
  }, [currentUser, supportTickets]);

  const handleSupportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};
    if (!senderName.trim()) errors.senderName = 'Veuillez indiquer votre nom complet.';
    if (!senderEmail.trim() || !senderEmail.includes('@')) {
      errors.senderEmail = 'Veuillez saisir une adresse e-mail valide.';
    }
    if (subject.trim().length < 5) {
      errors.subject = 'Précisez l’objet de votre demande (minimum 5 caractères).';
    }
    if (message.trim().length < 20) {
      errors.message = 'Décrivez votre difficulté en détail (minimum 20 caractères).';
    }

    setFormErrors(errors);
    if (Object.keys(errors).length > 0) return;

    const created = submitSupportTicket({
      senderName: senderName.trim(),
      senderEmail: senderEmail.trim(),
      dossierNumber: dossierNumber.trim() || undefined,
      category,
      subject: subject.trim(),
      message: message.trim(),
    });

    setSubmittedRef(created.reference);
    setSubject('');
    setMessage('');
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          {!compactHeader && (
            <p className="text-xs font-medium text-blue-700 mb-1">
              Assistance & Accompagnement des Candidats
            </p>
          )}
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">
            Guide d’utilisation, Documents officiels, FAQ et Support GCD
          </h2>
          <p className="text-sm text-slate-600 mt-1 max-w-2xl">
            Instructions claires pour choisir vos {campaignConfig.requiredSubjectChoices} sujets de thèse, constituer votre dossier sans erreur et contacter la cellule technique du Pôle d’Études Doctorales.
          </p>
        </div>

        {/* Interactive segmented control */}
        <div className="inline-flex items-center p-1 bg-slate-100 border border-slate-200 rounded-lg self-start">
          <button
            type="button"
            onClick={() => setActiveSection('guide')}
            className={`px-3.5 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
              activeSection === 'guide'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            Guide & Étapes
          </button>
          <button
            type="button"
            onClick={() => setActiveSection('faq')}
            className={`px-3.5 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
              activeSection === 'faq'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5" />
            Questions fréquentes
          </button>
          <button
            type="button"
            onClick={() => setActiveSection('support')}
            className={`px-3.5 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
              activeSection === 'support'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            Contacter le support
          </button>
        </div>
      </div>

      {/* SECTION 1: GUIDE & WORKFLOW */}
      {activeSection === 'guide' && (
        <div className="space-y-8">
          <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-200">
            <div className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-semibold text-slate-900">
                  Parcours complet de préinscription ({campaignConfig.requiredSubjectChoices} sujets) et d’inscription doctorale
                </h3>
                <p className="text-sm text-slate-600 mt-0.5">
                  Les 6 étapes clés entre le Candidat, la Plateforme GCD, les Commissions de sélection et l’Administration CEDoc.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowOfficialDiagram((v) => !v)}
                className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-2"
              >
                <Workflow className="w-4 h-4 text-blue-700" />
                {showOfficialDiagram
                  ? 'Masquer le diagramme d’activité'
                  : 'Voir le diagramme officiel des acteurs'}
              </button>
            </div>

            {showOfficialDiagram && (
              <div className="p-6 bg-slate-50/70">
                <p className="text-xs text-slate-600 mb-4">
                  Diagramme d’activité de référence illustrant les rôles du Candidat, de la Plateforme GCD, de la Commission pédagogique et de l’Administration :
                </p>
                {!diagramLoadError ? (
                  <div className="bg-white border border-slate-200 rounded-lg p-4 overflow-x-auto">
                    <img
                      src="/assets/aistudio/diagramme_acteurs_GCD_a768f128.png"
                      alt="Diagramme d'activité - Préinscription et inscription GCD USMBA"
                      referrerPolicy="no-referrer"
                      onError={() => setDiagramLoadError(true)}
                      className="max-w-full h-auto mx-auto max-h-[560px] object-contain"
                    />
                  </div>
                ) : (
                  <div className="bg-white border border-slate-200 rounded-lg p-6 text-center text-sm text-slate-600">
                    Schéma du circuit de validation : Candidat → Plateforme GCD → Commission de sélection → Administration CEDoc.
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-200">
              <div className="p-6 space-y-2">
                <div className="text-xs font-mono font-semibold text-blue-700">
                  01 · Création & Brouillon
                </div>
                <h4 className="text-sm font-semibold text-slate-900">
                  Ouvrir son dossier à son rythme
                </h4>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Créez votre compte avec votre CIN et code CNE/Massar (ou e-mail académique @usmba.ac.ma). Remplissez votre parcours et enregistrez votre brouillon pour reprendre plus tard.
                </p>
              </div>
              <div className="p-6 space-y-2">
                <div className="text-xs font-mono font-semibold text-blue-700">
                  02 · Choix des {campaignConfig.requiredSubjectChoices} sujets & Pièces
                </div>
                <h4 className="text-sm font-semibold text-slate-900">
                  Classer ses {campaignConfig.requiredSubjectChoices} sujets et téléverser une seule fois
                </h4>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Sélectionnez {campaignConfig.requiredSubjectChoices} sujets de thèse par ordre de priorité (Choix 1, Choix 2, Choix 3) et déposez un dossier unique de pièces justificatives (CIN, CV, diplômes, relevés, photo).
                </p>
              </div>
              <div className="p-6 space-y-2">
                <div className="text-xs font-mono font-semibold text-blue-700">
                  03 · Présélection & Entretiens
                </div>
                <h4 className="text-sm font-semibold text-slate-900">
                  Examen indépendant par chaque commission
                </h4>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Chacun de vos {campaignConfig.requiredSubjectChoices} choix est examiné par la commission du sujet concerné. En cas de présélection, vous recevez une convocation précisant la date, l’horaire et la salle.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-200">
              <div className="p-6 space-y-2">
                <div className="text-xs font-mono font-semibold text-blue-700">
                  04 · Classement & Liste d’attente
                </div>
                <h4 className="text-sm font-semibold text-slate-900">
                  Résultats par sujet et ordre de mérite
                </h4>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Vous suivez le résultat de chacun de vos {campaignConfig.requiredSubjectChoices} vœux (admis en liste principale, rang sur liste d’attente ou non retenu). Si vous êtes admis sur plusieurs sujets, vous confirmez un seul sujet définitif.
                </p>
              </div>
              <div className="p-6 space-y-2">
                <div className="text-xs font-mono font-semibold text-blue-700">
                  05 · Régularisation sans rejet
                </div>
                <h4 className="text-sm font-semibold text-slate-900">
                  Correction guidée des pièces
                </h4>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Si un scan est flou ou incomplet, l’administration marque uniquement la pièce concernée « À corriger » avec une explication précise, sans annuler votre dossier.
                </p>
              </div>
              <div className="p-6 space-y-2">
                <div className="text-xs font-mono font-semibold text-blue-700">
                  06 · Inscription définitive
                </div>
                <h4 className="text-sm font-semibold text-slate-900">
                  Validation & Matricule doctoral
                </h4>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Une fois admis(e), téléchargez et déposez la Charte des thèses signée. Après contrôle par l’administration du CEDoc, votre matricule doctoral officiel USMBA est généré.
                </p>
              </div>
            </div>
          </div>

          {/* Documents officiels USMBA à télécharger */}
          <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-200">
            <div className="p-6">
              <h3 className="text-base font-semibold text-slate-900">
                Documents et guides officiels USMBA à télécharger (PDF)
              </h3>
              <p className="text-xs text-slate-600 mt-0.5">
                Consultez la procédure réglementaire, la Charte des thèses et le guide officiel des commissions pédagogiques.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-200">
              <div className="p-5 flex flex-col justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs font-mono text-blue-700 font-semibold">
                    <FileText className="w-4 h-4 shrink-0" />
                    PROCÉDURE CANDIDATS
                  </div>
                  <h4 className="text-sm font-semibold text-slate-900">
                    Procédure d’inscription au cycle doctoral
                  </h4>
                  <p className="text-xs text-slate-600">
                    Calendrier, conditions d’accès, choix des 3 sujets et constitution du dossier administratif.
                  </p>
                </div>
                <a
                  href="/assets/gcd_docs/Procedure_Inscription_GCD_2026_2027.pdf"
                  download="Procedure_Inscription_GCD_USMBA.pdf"
                  className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap"
                >
                  <Download className="w-3.5 h-3.5" />
                  Télécharger la procédure (PDF)
                </a>
              </div>

              <div className="p-5 flex flex-col justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs font-mono text-blue-700 font-semibold">
                    <FileText className="w-4 h-4 shrink-0" />
                    CHARTE DES THÈSES
                  </div>
                  <h4 className="text-sm font-semibold text-slate-900">
                    Charte des Thèses USMBA Fès
                  </h4>
                  <p className="text-xs text-slate-600">
                    Engagements réciproques du doctorant, du directeur de thèse et du laboratoire (obligatoire pour les admis).
                  </p>
                </div>
                <a
                  href="/assets/gcd_docs/Charte_Theses_USMBA_2026_2027.pdf"
                  download="Charte_Theses_USMBA.pdf"
                  className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap"
                >
                  <Download className="w-3.5 h-3.5" />
                  Télécharger la Charte (PDF)
                </a>
              </div>

              <div className="p-5 flex flex-col justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs font-mono text-blue-700 font-semibold">
                    <FileText className="w-4 h-4 shrink-0" />
                    GUIDE PROFESSEURS
                  </div>
                  <h4 className="text-sm font-semibold text-slate-900">
                    Guide d’utilisation pour Professeurs & Commissions
                  </h4>
                  <p className="text-xs text-slate-600">
                    Dépôt de sujets, suivi de la validation tripartite et gestion des candidatures regroupées par sujet.
                  </p>
                </div>
                <a
                  href="/assets/aistudio/Guide_dUtilisation_pour_Professeurs_5c5f779c.pdf"
                  download="Guide_Utilisation_Professeurs_GCD_USMBA.pdf"
                  className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap"
                >
                  <Download className="w-3.5 h-3.5" />
                  Télécharger le guide (PDF)
                </a>
              </div>
            </div>
          </div>

          {/* Conseils pour éviter les blocages */}
          <div className="bg-white border border-slate-200 rounded-xl p-6">
            <div className="flex items-center gap-2.5 mb-4">
              <FileWarning className="w-5 h-5 text-amber-600 shrink-0" />
              <h3 className="text-base font-semibold text-slate-900">
                Prévenir les 4 erreurs les plus fréquentes des candidats
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
              <div className="space-y-1">
                <p className="font-semibold text-slate-900">
                  1. Sélection incomplète des {campaignConfig.requiredSubjectChoices} sujets de thèse
                </p>
                <p className="text-slate-600">
                  Assurez-vous d’avoir bien sélectionné {campaignConfig.requiredSubjectChoices} sujets distincts et vérifié leur ordre de priorité (Choix 1, Choix 2, Choix 3) avant la soumission finale.
                </p>
              </div>
              <div className="space-y-1">
                <p className="font-semibold text-slate-900">
                  2. Relevés de notes incomplets ou taille PDF dépassée
                </p>
                <p className="text-slate-600">
                  Numérisez tous les semestres cachetés en 150 DPI afin de rester sous la limite configurée (5 à 10 Mo) et saisissez la moyenne exacte figurant sur le relevé officiel.
                </p>
              </div>
              <div className="space-y-1">
                <p className="font-semibold text-slate-900">
                  3. Candidats salariés ou fonctionnaires
                </p>
                <p className="text-slate-600">
                  Déclarez votre statut professionnel réel dès la préinscription et anticipez l’autorisation officielle de votre employeur pour l’inscription administrative.
                </p>
              </div>
              <div className="space-y-1">
                <p className="font-semibold text-slate-900">
                  4. Oubli de soumettre le brouillon
                </p>
                <p className="text-slate-600">
                  L’enregistrement en brouillon conserve vos données mais ne transmet pas vos {campaignConfig.requiredSubjectChoices} vœux aux laboratoires. Cliquez sur « Soumettre ma candidature » avant la date limite.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 2: FAQ */}
      {activeSection === 'faq' && (
        <div className="space-y-6">
          <div className="flex flex-col lg:flex-row gap-4 justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={faqQuery}
                onChange={(e) => setFaqQuery(e.target.value)}
                placeholder="Rechercher un mot-clé (ex. 3 sujets, Massar, PDF, salarié, liste d’attente)..."
                className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 border border-slate-200 rounded-lg">
              {(
                [
                  'Tous',
                  'Compte & Accès',
                  'Choix des 3 sujets',
                  'Pièces justificatives',
                  'Sélection & Inscription',
                ] as const
              ).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setFaqCategory(cat)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                    faqCategory === cat
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-200">
            {filteredFaqs.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-sm font-medium text-slate-900">
                  Aucune question ne correspond à votre recherche.
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Essayez un autre terme ou posez directement votre question via l’onglet « Contacter le support ».
                </p>
              </div>
            ) : (
              filteredFaqs.map((item) => {
                const isOpen = openFaqId === item.id;
                return (
                  <div key={item.id} className="p-5">
                    <button
                      type="button"
                      onClick={() => setOpenFaqId(isOpen ? null : item.id)}
                      className="w-full flex items-start justify-between gap-4 text-left"
                    >
                      <div className="space-y-1">
                        <span className="text-xs text-slate-500">{item.category}</span>
                        <h4 className="text-sm font-semibold text-slate-900">{item.question}</h4>
                      </div>
                      <ChevronDown
                        className={`w-4 h-4 text-slate-500 shrink-0 mt-1 transition-transform duration-150 ${
                          isOpen ? 'rotate-180' : ''
                        }`}
                      />
                    </button>
                    {isOpen && (
                      <p className="mt-3 text-sm text-slate-600 leading-relaxed max-w-3xl">
                        {item.answer}
                      </p>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* SECTION 3: SUPPORT TICKET FORM */}
      {activeSection === 'support' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <form
            onSubmit={handleSupportSubmit}
            noValidate
            className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6 space-y-5"
          >
            <div>
              <h3 className="text-base font-semibold text-slate-900">
                Écrire à la cellule d’assistance GCD
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Contact officiel :{' '}
                <span className="font-mono text-slate-700">reclamation.gcd@usmba.ac.ma</span> · Les champs marqués d’un astérisque (*) sont obligatoires.
              </p>
            </div>

            {submittedRef && (
              <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
                <div className="text-sm text-emerald-950">
                  <p className="font-semibold">
                    Demande enregistrée sous la référence{' '}
                    <span className="font-mono">{submittedRef}</span>
                  </p>
                  <p className="text-xs text-emerald-800 mt-0.5">
                    L’administration du CEDoc traitera votre ticket dans les meilleurs délais. Vous recevrez une notification dès qu’une réponse sera publiée.
                  </p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Nom complet <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value)}
                  placeholder="Ex. Salma Bennani"
                  className={`w-full px-3.5 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 ${
                    formErrors.senderName ? 'border-red-400 bg-red-50/40' : 'border-slate-200 bg-white'
                  }`}
                />
                {formErrors.senderName && (
                  <p className="text-xs text-red-600 mt-1">{formErrors.senderName}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Adresse e-mail de réponse <span className="text-red-600">*</span>
                </label>
                <input
                  type="email"
                  value={senderEmail}
                  onChange={(e) => setSenderEmail(e.target.value)}
                  placeholder="prenom.nom@usmba.ac.ma"
                  className={`w-full px-3.5 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 ${
                    formErrors.senderEmail ? 'border-red-400 bg-red-50/40' : 'border-slate-200 bg-white'
                  }`}
                />
                {formErrors.senderEmail && (
                  <p className="text-xs text-red-600 mt-1">{formErrors.senderEmail}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Catégorie du problème <span className="text-red-600">*</span>
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as SupportTicket['category'])}
                  className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  <option value="Choix des 3 sujets & éligibilité">
                    Choix des 3 sujets & éligibilité
                  </option>
                  <option value="Identifiants & CNE">Identifiants & CNE</option>
                  <option value="Téléversement de pièces">Téléversement de pièces</option>
                  <option value="Entretien & résultats">Entretien & résultats</option>
                  <option value="Inscription administrative">Inscription administrative</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Numéro de dossier (si existant)
                </label>
                <input
                  type="text"
                  value={dossierNumber}
                  onChange={(e) => setDossierNumber(e.target.value)}
                  placeholder="Ex. GCD-2026-0841"
                  className="w-full px-3.5 py-2 text-sm font-mono bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Objet de la demande <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Ex. Modification de l’ordre de mes 3 sujets avant soumission"
                className={`w-full px-3.5 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 ${
                  formErrors.subject ? 'border-red-400 bg-red-50/40' : 'border-slate-200 bg-white'
                }`}
              />
              {formErrors.subject && (
                <p className="text-xs text-red-600 mt-1">{formErrors.subject}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Description détaillée <span className="text-red-600">*</span>
              </label>
              <textarea
                rows={4}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Expliquez le message d’erreur rencontré, les codes sujets concernés ou la pièce justificative en question..."
                className={`w-full px-3.5 py-2.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 ${
                  formErrors.message ? 'border-red-400 bg-red-50/40' : 'border-slate-200 bg-white'
                }`}
              />
              {formErrors.message && (
                <p className="text-xs text-red-600 mt-1">{formErrors.message}</p>
              )}
            </div>

            <div className="pt-2 flex items-center justify-end">
              <button
                type="submit"
                className="px-5 py-2.5 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-2"
              >
                <Send className="w-4 h-4" />
                Envoyer ma demande au support
              </button>
            </div>
          </form>

          {/* Suivi des demandes et coordonnées */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-3">
              <div className="flex items-center gap-2 text-slate-900 font-semibold text-sm">
                <Mail className="w-4 h-4 text-blue-700" />
                Permanence Pôle d’Études Doctorales — USMBA Fès
              </div>
              <p className="text-sm text-slate-600 leading-relaxed">
                Présidence de l’Université Sidi Mohamed Ben Abdellah, Route d’Imouzzer, B.P. 2626, Fès.
              </p>
              <div className="text-xs text-slate-500 space-y-1 pt-2 border-t border-slate-100">
                <p>Horaires d’assistance : Lundi – Vendredi, 09h00 – 16h30</p>
                <p>
                  Courriel direct :{' '}
                  <span className="font-mono text-slate-700">reclamation.gcd@usmba.ac.ma</span>
                </p>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-200">
              <div className="p-5">
                <h4 className="text-sm font-semibold text-slate-900">
                  Suivi des demandes d’assistance récentes
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Historique des échanges avec le support technique et administratif.
                </p>
              </div>

              {userTickets.length === 0 ? (
                <div className="p-6 text-sm text-slate-500">
                  Aucune demande enregistrée pour le moment.
                </div>
              ) : (
                userTickets.map((ticket) => (
                  <div key={ticket.id} className="p-5 space-y-2">
                    <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
                      <span className="font-mono font-medium text-slate-700">
                        {ticket.reference}
                      </span>
                      <span>·</span>
                      <span className="truncate">{ticket.category}</span>
                      <span className="ml-auto font-medium text-slate-700">
                        {ticket.status === 'repondu' ? '✓ Répondu' : '◷ En attente'}
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-slate-900">{ticket.subject}</p>
                    <p className="text-xs text-slate-600">{ticket.message}</p>
                    <p className="text-xs text-slate-400 tabular-nums">
                      Envoyé le {formatDateFR(ticket.createdAt, true)}
                    </p>
                    {ticket.reply && (
                      <div className="mt-2 p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700 space-y-1">
                        <p className="font-semibold text-slate-900">Réponse du support CEDoc :</p>
                        <p>{ticket.reply}</p>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
