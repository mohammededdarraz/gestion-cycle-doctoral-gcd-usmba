import React, { useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  Lock,
  MailCheck,
  UserPlus,
  X,
} from 'lucide-react';
import { useGCD } from '../context/GCDContext';
import { UsmbaLogo } from './UsmbaLogo';

interface AuthModalProps {
  initialMode?: 'login' | 'register' | 'recover';
  preselectedSubjectIds?: string[];
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  initialMode = 'login',
  preselectedSubjectIds = [],
  onClose,
}) => {
  const {
    accounts,
    subjects,
    campaignConfig,
    loginWithCredentials,
    loginAsAccount,
    registerCandidate,
    resetAccountPassword,
  } = useGCD();

  const [mode, setMode] = useState<'login' | 'register' | 'recover'>(initialMode);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [demoExpanded, setDemoExpanded] = useState(false);

  // Login fields
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showAcademicSSO, setShowAcademicSSO] = useState(false);

  // Register fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [firstNameAr, setFirstNameAr] = useState('');
  const [lastNameAr, setLastNameAr] = useState('');
  const [cin, setCin] = useState('');
  const [cne, setCne] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regPasswordConfirm, setRegPasswordConfirm] = useState('');

  // Recover fields
  const [recEmail, setRecEmail] = useState('');
  const [recCinOrCne, setRecCinOrCne] = useState('');
  const [recStep, setRecStep] = useState<1 | 2>(1);
  const [recCodeInput, setRecCodeInput] = useState('');
  const [generatedCode, setGeneratedCode] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const preselectedSubjects = preselectedSubjectIds
    .map((id) => subjects.find((s) => s.id === id))
    .filter((s): s is NonNullable<typeof s> => Boolean(s));

  const usmbaAccounts = accounts.filter(
    (a) => a.active && a.email.toLowerCase().endsWith('@usmba.ac.ma')
  );

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!identifier.trim() || !password) {
      setErrorMsg('Identifiant et mot de passe requis.');
      return;
    }
    const res = loginWithCredentials(identifier, password);
    if (!res.ok) {
      setErrorMsg(res.error || 'Échec de connexion.');
    } else {
      onClose();
    }
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!lastName.trim() || !firstName.trim()) {
      setErrorMsg('Nom et prénom obligatoires.');
      return;
    }
    if (cin.trim().length < 5) {
      setErrorMsg('Numéro CIN / Passeport invalide.');
      return;
    }
    if (cne.trim().length < 6) {
      setErrorMsg('Code CNE / Massar invalide.');
      return;
    }
    if (!email.trim().includes('@')) {
      setErrorMsg('Adresse e-mail invalide.');
      return;
    }
    if (phone.trim().length < 8) {
      setErrorMsg('Numéro de téléphone invalide.');
      return;
    }
    if (regPassword.length < 6) {
      setErrorMsg('Mot de passe trop court (6 caractères minimum).');
      return;
    }
    if (regPassword !== regPasswordConfirm) {
      setErrorMsg('Les mots de passe ne correspondent pas.');
      return;
    }

    const res = registerCandidate({
      firstName,
      lastName,
      firstNameAr,
      lastNameAr,
      cin,
      cne,
      email,
      phone,
      password: regPassword,
      preselectedSubjectIds,
    });

    if (!res.ok) {
      setErrorMsg(res.error || 'Impossible de créer le compte.');
    } else {
      onClose();
    }
  };

  const handleSendRecoveryCode = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!recEmail.trim().includes('@') || !recCinOrCne.trim()) {
      setErrorMsg('E-mail et CIN / CNE requis.');
      return;
    }
    const matching = accounts.find(
      (a) =>
        a.email.toLowerCase() === recEmail.trim().toLowerCase() &&
        ((a.cin && a.cin.toLowerCase() === recCinOrCne.trim().toLowerCase()) ||
          (a.cne && a.cne.toLowerCase() === recCinOrCne.trim().toLowerCase()))
    );
    if (!matching) {
      setErrorMsg('Aucun compte trouvé avec ces informations.');
      return;
    }
    const code = '482910';
    setGeneratedCode(code);
    setRecCodeInput(code);
    setRecStep(2);
  };

  const handleConfirmReset = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (recCodeInput.trim() !== generatedCode) {
      setErrorMsg('Code de vérification invalide.');
      return;
    }
    if (newPassword.length < 6) {
      setErrorMsg('6 caractères minimum requis.');
      return;
    }
    const res = resetAccountPassword(recEmail, recCinOrCne, newPassword);
    if (!res.ok) {
      setErrorMsg(res.error || 'Erreur lors de la réinitialisation.');
      return;
    }
    setSuccessMsg('Mot de passe mis à jour.');
    setIdentifier(recEmail);
    setPassword(newPassword);
    setMode('login');
    setRecStep(1);
  };

  const demoAccounts = [
    ...accounts.filter((a) => a.role === 'candidat').slice(0, 4),
    ...accounts.filter((a) => a.role !== 'candidat' && a.demoHighlight),
  ];

  const getShortDemoRole = (role: string) => {
    if (role === 'candidat') return 'Candidat';
    if (role === 'commission') return 'Commission';
    return 'Administration';
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label="Authentification GCD USMBA"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white border border-slate-200 rounded-xl w-full max-w-lg overflow-hidden my-8"
      >
        {/* Institutional Header with Official USMBA Logo */}
        <div className="px-6 pt-6 pb-4 border-b border-slate-200 relative text-center space-y-2">
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="absolute right-4 top-4 p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex justify-center">
            <UsmbaLogo variant="full" className="h-10 sm:h-11" />
          </div>
          <p className="text-xs text-slate-500">
            Université Sidi Mohamed Ben Abdellah – Fès · Gestion du Cycle Doctoral
          </p>
        </div>

        {/* Main Form Section */}
        <div className="p-6 space-y-5">
          {/* Mode Tabs */}
          <div className="grid grid-cols-2 p-1 bg-slate-100 border border-slate-200 rounded-lg">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setErrorMsg(null);
              }}
              className={`py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                mode === 'login' || mode === 'recover'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Se connecter
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              className={`py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                mode === 'register'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Préinscription
            </button>
          </div>

          {preselectedSubjects.length > 0 && mode === 'register' && (
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700 space-y-1">
              <p className="font-semibold text-slate-900">
                Sujets sélectionnés ({preselectedSubjects.length}/{campaignConfig.requiredSubjectChoices})
              </p>
              {preselectedSubjects.map((s, idx) => (
                <p key={s.id} className="truncate font-mono text-[11px]">
                  Choix {idx + 1} · {s.code} — {s.title}
                </p>
              ))}
            </div>
          )}

          {errorMsg && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 flex items-start gap-2 text-xs text-red-900">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 flex items-start gap-2 text-xs text-emerald-900">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* LOGIN FORM */}
          {mode === 'login' && (
            <div className="space-y-4">
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    E-mail, CIN ou CNE
                  </label>
                  <input
                    type="text"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="prenom.nom@usmba.ac.ma ou CIN / CNE"
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-700">
                      Mot de passe
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setMode('recover');
                        setErrorMsg(null);
                      }}
                      className="text-xs text-blue-700 hover:underline cursor-pointer"
                    >
                      Mot de passe oublié ?
                    </button>
                  </div>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 px-4 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Lock className="w-4 h-4" />
                  <span>Se connecter</span>
                </button>
              </form>

              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setShowAcademicSSO((v) => !v)}
                  className="w-full py-2 px-3 text-xs font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <MailCheck className="w-3.5 h-3.5 text-blue-700" />
                  <span>Compte institutionnel @usmba.ac.ma</span>
                </button>

                {showAcademicSSO && (
                  <div className="mt-2 p-2.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1 max-h-44 overflow-y-auto">
                    {usmbaAccounts.map((acc) => (
                      <button
                        key={acc.id}
                        type="button"
                        onClick={() => {
                          loginAsAccount(acc.id);
                          onClose();
                        }}
                        className="w-full text-left px-2.5 py-1.5 bg-white hover:bg-blue-50 border border-slate-200 rounded-md text-xs flex items-center justify-between gap-2 transition-colors cursor-pointer"
                      >
                        <span className="truncate font-medium text-slate-900">{acc.fullName}</span>
                        <span className="text-[11px] font-mono text-slate-500 shrink-0">
                          {acc.email}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* REGISTER FORM */}
          {mode === 'register' && (
            <form onSubmit={handleRegister} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Prénom <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nom <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    الاسم الشخصي (Prénom arabe)
                  </label>
                  <input
                    type="text"
                    dir="rtl"
                    value={firstNameAr}
                    onChange={(e) => setFirstNameAr(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    الاسم العائلي (Nom arabe)
                  </label>
                  <input
                    type="text"
                    dir="rtl"
                    value={lastNameAr}
                    onChange={(e) => setLastNameAr(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    CIN / Passeport <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    value={cin}
                    onChange={(e) => setCin(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Code CNE / Massar <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    value={cne}
                    onChange={(e) => setCne(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    E-mail <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Téléphone <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Mot de passe <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="password"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="Min. 6 caractères"
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Confirmation <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="password"
                    value={regPasswordConfirm}
                    onChange={(e) => setRegPasswordConfirm(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 px-4 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <UserPlus className="w-4 h-4" />
                <span>Créer mon dossier</span>
              </button>
            </form>
          )}

          {/* RECOVER PASSWORD FORM */}
          {mode === 'recover' && (
            <div className="space-y-4">
              {recStep === 1 ? (
                <form onSubmit={handleSendRecoveryCode} className="space-y-3.5">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-slate-900">
                      Réinitialiser le mot de passe
                    </h3>
                    <button
                      type="button"
                      onClick={() => setMode('login')}
                      className="text-xs text-blue-700 hover:underline cursor-pointer"
                    >
                      Retour
                    </button>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      E-mail du compte
                    </label>
                    <input
                      type="email"
                      value={recEmail}
                      onChange={(e) => setRecEmail(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      CIN ou CNE
                    </label>
                    <input
                      type="text"
                      value={recCinOrCne}
                      onChange={(e) => setRecCinOrCne(e.target.value)}
                      className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full py-2.5 px-4 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors cursor-pointer"
                  >
                    Vérifier mon compte
                  </button>
                </form>
              ) : (
                <form onSubmit={handleConfirmReset} className="space-y-3.5">
                  <p className="text-xs text-slate-600">
                    Code de vérification :{' '}
                    <span className="font-mono font-semibold text-slate-900">{generatedCode}</span>
                  </p>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Code reçu
                    </label>
                    <input
                      type="text"
                      value={recCodeInput}
                      onChange={(e) => setRecCodeInput(e.target.value)}
                      className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Nouveau mot de passe
                    </label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Min. 6 caractères"
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full py-2.5 px-4 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors cursor-pointer"
                  >
                    Enregistrer
                  </button>
                </form>
              )}
            </div>
          )}
        </div>

        {/* Visually Separated & Subordinate Demo Accounts Section */}
        <div className="border-t border-slate-200 bg-slate-50/80 px-6 py-3">
          <button
            type="button"
            onClick={() => setDemoExpanded((v) => !v)}
            className="w-full flex items-center justify-between text-xs text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
          >
            <span>Comptes de démonstration</span>
            <ChevronDown
              className={`w-3.5 h-3.5 transition-transform duration-150 ${
                demoExpanded ? 'rotate-180' : ''
              }`}
            />
          </button>

          {demoExpanded && (
            <div className="pt-3 grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {demoAccounts.map((acc) => (
                <button
                  key={acc.id}
                  type="button"
                  onClick={() => {
                    loginAsAccount(acc.id);
                    onClose();
                  }}
                  className="text-left px-2.5 py-1.5 rounded-md bg-white hover:bg-slate-100 border border-slate-200/80 text-[11px] text-slate-600 hover:text-slate-900 flex items-center justify-between gap-2 transition-colors cursor-pointer"
                >
                  <span className="truncate font-medium">{acc.fullName}</span>
                  <span className="text-slate-400 shrink-0">{getShortDemoRole(acc.role)}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
