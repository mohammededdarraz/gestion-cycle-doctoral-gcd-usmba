import React, { useMemo, useState } from 'react';
import {
  CheckCircle2,
  ChevronDown,
  Download,
  FileText,
  HelpCircle,
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
    supportTickets,
    submitSupportTicket,
  } = useGCD();

  const [activeSection, setActiveSection] = useState<'documents' | 'faq' | 'support'>('documents');
  const [showOfficialDiagram, setShowOfficialDiagram] = useState(false);
  const [diagramLoadError, setDiagramLoadError] = useState(false);

  // FAQ state
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
    if (!senderName.trim()) errors.senderName = 'Nom requis.';
    if (!senderEmail.trim() || !senderEmail.includes('@')) {
      errors.senderEmail = 'E-mail valide requis.';
    }
    if (subject.trim().length < 5) {
      errors.subject = 'Objet requis (min. 5 caractères).';
    }
    if (message.trim().length < 20) {
      errors.message = 'Message requis (min. 20 caractères).';
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
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        {!compactHeader ? (
          <h2 className="text-xl font-bold tracking-tight text-slate-900">
            Documents, FAQ & Support
          </h2>
        ) : (
          <span className="text-xs text-slate-500 font-mono">
            reclamation.gcd@usmba.ac.ma
          </span>
        )}

        <div className="inline-flex items-center p-1 bg-slate-100 border border-slate-200 rounded-lg self-start">
          <button
            type="button"
            onClick={() => setActiveSection('documents')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer ${
              activeSection === 'documents'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            Documents
          </button>
          <button
            type="button"
            onClick={() => setActiveSection('faq')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer ${
              activeSection === 'faq'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5" />
            FAQ
          </button>
          <button
            type="button"
            onClick={() => setActiveSection('support')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer ${
              activeSection === 'support'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            Support
          </button>
        </div>
      </div>

      {/* SECTION 1: DOCUMENTS OFFICIELS */}
      {activeSection === 'documents' && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-200">
            <div className="p-4 sm:p-5 flex items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  Procédure d’inscription au cycle doctoral
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">PDF officiel USMBA</p>
              </div>
              <a
                href="/assets/gcd_docs/Procedure_Inscription_GCD_2026_2027.pdf"
                download="Procedure_Inscription_GCD_USMBA.pdf"
                className="px-3.5 py-2 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0 inline-flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                Télécharger
              </a>
            </div>

            <div className="p-4 sm:p-5 flex items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  Charte des Thèses USMBA – Fès
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  À signer pour l’inscription définitive (PDF)
                </p>
              </div>
              <a
                href="/assets/gcd_docs/Charte_Theses_USMBA_2026_2027.pdf"
                download="Charte_Theses_USMBA.pdf"
                className="px-3.5 py-2 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0 inline-flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                Télécharger
              </a>
            </div>

            <div className="p-4 sm:p-5 flex items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  Guide d’utilisation — Professeurs & Commissions
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">PDF officiel USMBA</p>
              </div>
              <a
                href="/assets/aistudio/Guide_dUtilisation_pour_Professeurs_5c5f779c.pdf"
                download="Guide_Utilisation_Professeurs_GCD_USMBA.pdf"
                className="px-3.5 py-2 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0 inline-flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                Télécharger
              </a>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <button
              type="button"
              onClick={() => setShowOfficialDiagram((v) => !v)}
              className="w-full px-5 py-3.5 flex items-center justify-between text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <Workflow className="w-4 h-4 text-blue-700" />
                Circuit de validation (Candidat · Commission · Administration)
              </span>
              <ChevronDown
                className={`w-4 h-4 text-slate-400 transition-transform duration-150 ${
                  showOfficialDiagram ? 'rotate-180' : ''
                }`}
              />
            </button>

            {showOfficialDiagram && (
              <div className="p-5 border-t border-slate-200 bg-slate-50/60">
                {!diagramLoadError ? (
                  <img
                    src="/assets/aistudio/diagramme_acteurs_GCD_a768f128.png"
                    alt="Diagramme des acteurs GCD USMBA"
                    referrerPolicy="no-referrer"
                    onError={() => setDiagramLoadError(true)}
                    className="max-w-full h-auto mx-auto max-h-[500px] object-contain"
                  />
                ) : (
                  <p className="text-xs text-slate-600 text-center">
                    Candidat → Plateforme GCD → Commission de sélection → Administration CEDoc.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* SECTION 2: FAQ */}
      {activeSection === 'faq' && (
        <div className="space-y-4">
          <div className="flex flex-col lg:flex-row gap-3 justify-between">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={faqQuery}
                onChange={(e) => setFaqQuery(e.target.value)}
                placeholder="Rechercher..."
                className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
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
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
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
              <div className="p-8 text-center text-sm text-slate-500">Aucun résultat.</div>
            ) : (
              filteredFaqs.map((item) => {
                const isOpen = openFaqId === item.id;
                return (
                  <div key={item.id} className="p-4 sm:p-5">
                    <button
                      type="button"
                      onClick={() => setOpenFaqId(isOpen ? null : item.id)}
                      className="w-full flex items-start justify-between gap-4 text-left cursor-pointer"
                    >
                      <div className="space-y-0.5">
                        <span className="text-[11px] text-slate-500">{item.category}</span>
                        <h4 className="text-sm font-semibold text-slate-900">{item.question}</h4>
                      </div>
                      <ChevronDown
                        className={`w-4 h-4 text-slate-400 shrink-0 mt-1 transition-transform duration-150 ${
                          isOpen ? 'rotate-180' : ''
                        }`}
                      />
                    </button>
                    {isOpen && (
                      <p className="mt-2.5 text-sm text-slate-600 leading-relaxed max-w-3xl">
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

      {/* SECTION 3: SUPPORT */}
      {activeSection === 'support' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <form
            onSubmit={handleSupportSubmit}
            noValidate
            className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-5 sm:p-6 space-y-4"
          >
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-slate-900">Nouvelle demande</h3>
              <span className="text-xs font-mono text-slate-500">reclamation.gcd@usmba.ac.ma</span>
            </div>

            {submittedRef && (
              <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center gap-2.5 text-xs text-emerald-950">
                <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                <span>
                  Demande transmise (<strong className="font-mono">{submittedRef}</strong>).
                </span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nom complet <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value)}
                  className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 ${
                    formErrors.senderName ? 'border-red-400 bg-red-50/40' : 'border-slate-200 bg-white'
                  }`}
                />
                {formErrors.senderName && (
                  <p className="text-xs text-red-600 mt-1">{formErrors.senderName}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  E-mail <span className="text-red-600">*</span>
                </label>
                <input
                  type="email"
                  value={senderEmail}
                  onChange={(e) => setSenderEmail(e.target.value)}
                  className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 ${
                    formErrors.senderEmail ? 'border-red-400 bg-red-50/40' : 'border-slate-200 bg-white'
                  }`}
                />
                {formErrors.senderEmail && (
                  <p className="text-xs text-red-600 mt-1">{formErrors.senderEmail}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Catégorie
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as SupportTicket['category'])}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
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
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  N° de dossier
                </label>
                <input
                  type="text"
                  value={dossierNumber}
                  onChange={(e) => setDossierNumber(e.target.value)}
                  placeholder="GCD-2026-..."
                  className="w-full px-3 py-2 text-sm font-mono bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Objet <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 ${
                  formErrors.subject ? 'border-red-400 bg-red-50/40' : 'border-slate-200 bg-white'
                }`}
              />
              {formErrors.subject && (
                <p className="text-xs text-red-600 mt-1">{formErrors.subject}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Message <span className="text-red-600">*</span>
              </label>
              <textarea
                rows={4}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 ${
                  formErrors.message ? 'border-red-400 bg-red-50/40' : 'border-slate-200 bg-white'
                }`}
              />
              {formErrors.message && (
                <p className="text-xs text-red-600 mt-1">{formErrors.message}</p>
              )}
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                Envoyer
              </button>
            </div>
          </form>

          {/* Recent Tickets */}
          <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl divide-y divide-slate-200">
            <div className="p-4">
              <h4 className="text-sm font-semibold text-slate-900">Mes demandes</h4>
            </div>

            {userTickets.length === 0 ? (
              <div className="p-5 text-xs text-slate-500">Aucune demande enregistrée.</div>
            ) : (
              userTickets.map((ticket) => (
                <div key={ticket.id} className="p-4 space-y-1.5">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-mono font-medium text-slate-700">{ticket.reference}</span>
                    <span
                      className={`font-semibold ${
                        ticket.status === 'repondu' ? 'text-emerald-700' : 'text-amber-700'
                      }`}
                    >
                      {ticket.status === 'repondu' ? 'Répondu' : 'En attente'}
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-slate-900">{ticket.subject}</p>
                  <p className="text-xs text-slate-600">{ticket.message}</p>
                  <p className="text-[11px] text-slate-400 tabular-nums">
                    {formatDateFR(ticket.createdAt, true)}
                  </p>
                  {ticket.reply && (
                    <div className="mt-2 p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700">
                      <span className="font-semibold text-slate-900">Réponse : </span>
                      {ticket.reply}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
