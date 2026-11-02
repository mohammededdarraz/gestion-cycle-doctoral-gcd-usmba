import React, { useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  KeyRound,
  Lock,
  LogIn,
  MailCheck,
  ShieldCheck,
  UserPlus,
  Users,
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
      setErrorMsg('Veuillez renseigner votre identifiant (e-mail, CIN ou CNE) et votre mot de passe.');
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
      setErrorMsg('Le nom et le prénom sont obligatoires.');
      return;
    }
    if (cin.trim().length < 5) {
      setErrorMsg('Veuillez saisir un numéro de CIN ou de passeport valide.');
      return;
    }
    if (cne.trim().length < 6) {
      setErrorMsg('Veuillez saisir votre code CNE ou Massar (ex. N138492015).');
      return;
    }
    if (!email.trim().includes('@')) {
      setErrorMsg('Veuillez saisir une adresse e-mail valide.');
      return;
    }
    if (phone.trim().length < 8) {
      setErrorMsg('Veuillez indiquer un numéro de téléphone joignable.');
      return;
    }
    if (regPassword.length < 6) {
      setErrorMsg('Le mot de passe doit contenir au moins 6 caractères.');
      return;
    }
    if (regPassword !== regPasswordConfirm) {
      setErrorMsg('La confirmation du mot de passe ne correspond pas.');
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
      setErrorMsg('Veuillez saisir votre adresse e-mail ainsi que votre numéro CIN ou CNE.');
      return;
    }
    const matching = accounts.find(
      (a) =>
        a.email.toLowerCase() === recEmail.trim().toLowerCase() &&
        ((a.cin && a.cin.toLowerCase() === recCinOrCne.trim().toLowerCase()) ||
          (a.cne && a.cne.toLowerCase() === recCinOrCne.trim().toLowerCase()))
    );
    if (!matching) {
      setErrorMsg('Aucun compte ne correspond à cette combinaison E-mail + CIN/CNE.');
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
      setErrorMsg('Le nouveau mot de passe doit comporter au moins 6 caractères.');
      return;
    }
    const res = resetAccountPassword(recEmail, recCinOrCne, newPassword);
    if (!res.ok) {
      setErrorMsg(res.error || 'Erreur lors de la réinitialisation.');
      return;
    }
    setSuccessMsg('Votre mot de passe a été mis à jour. Vous pouvez maintenant vous connecter.');
    setIdentifier(recEmail);
    setPassword(newPassword);
    setMode('login');
    setRecStep(1);
  };

  const demoCandidates = accounts.filter((a) => a.role === 'candidat').slice(0, 4);
  const demoStaff = accounts.filter((a) => a.role !== 'candidat');

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-4xl overflow-hidden my-8">
        {/* Top bar */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
          <div className="space-y-1.5">
            <UsmbaLogo variant="full" className="h-9 sm:h-10" />
            <p className="text-xs text-slate-600 font-medium">
              Portail d’authentification GCD — Candidats, Enseignants-Chercheurs et Administration CEDoc
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer la fenêtre"
            className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
          {/* Left column: Real forms */}
          <div className="lg:col-span-7 p-6 sm:p-8 space-y-6">
            {preselectedSubjects.length > 0 && (
              <div className="p-3.5 rounded-lg bg-blue-50 border border-blue-200 text-xs text-blue-950 space-y-1.5">
                <p className="font-semibold">
                  Sujets présélectionnés ({preselectedSubjects.length}/{campaignConfig.requiredSubjectChoices}) :
                </p>
                <div className="space-y-1">
                  {preselectedSubjects.map((s, idx) => (
                    <p key={s.id} className="truncate">
                      <span className="font-mono font-bold text-blue-800">Choix n°{idx + 1} :</span>{' '}
                      <span className="font-mono">{s.code}</span> — {s.title}
                    </p>
                  ))}
                </div>
                {preselectedSubjects.length < campaignConfig.requiredSubjectChoices && (
                  <p className="text-[11px] text-blue-800">
                    Vous pourrez compléter vos {campaignConfig.requiredSubjectChoices} choix de sujets dans votre espace candidat.
                  </p>
                )}
              </div>
            )}

            {/* Mode switcher */}
            <div className="inline-flex flex-wrap p-1 bg-slate-100 border border-slate-200 rounded-lg">
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setErrorMsg(null);
                }}
                className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                  mode === 'login'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <LogIn className="w-3.5 h-3.5" />
                Se connecter
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('register');
                  setErrorMsg(null);
                  setSuccessMsg(null);
                }}
                className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                  mode === 'register'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <UserPlus className="w-3.5 h-3.5" />
                Créer un compte candidat
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('recover');
                  setErrorMsg(null);
                  setSuccessMsg(null);
                }}
                className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                  mode === 'recover'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <KeyRound className="w-3.5 h-3.5" />
                Mot de passe oublié
              </button>
            </div>

            {errorMsg && (
              <div className="p-3.5 rounded-lg bg-red-50 border border-red-200 flex items-start gap-2.5 text-xs text-red-900">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 flex items-start gap-2.5 text-xs text-emerald-900">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* LOGIN FORM */}
            {mode === 'login' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => setShowAcademicSSO((v) => !v)}
                    className="w-full py-2.5 px-4 text-xs font-semibold text-slate-800 bg-slate-50 hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <MailCheck className="w-4 h-4 text-blue-700" />
                    Connexion Google Académique (@usmba.ac.ma)
                  </button>

                  {showAcademicSSO && (
                    <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
                      <p className="text-xs text-slate-600">
                        Sélectionnez votre compte institutionnel <strong className="font-mono">@usmba.ac.ma</strong> (Étudiant ou Enseignant-Chercheur) :
                      </p>
                      <div className="grid grid-cols-1 gap-1.5">
                        {usmbaAccounts.map((acc) => (
                          <button
                            key={acc.id}
                            type="button"
                            onClick={() => {
                              loginAsAccount(acc.id);
                              onClose();
                            }}
                            className="text-left px-3 py-2 bg-white hover:bg-blue-50 border border-slate-200 rounded-lg text-xs flex items-center justify-between gap-2 transition-colors"
                          >
                            <span className="truncate">
                              <strong className="text-slate-900">{acc.fullName}</strong> ·{' '}
                              <span className="font-mono text-slate-500">{acc.email}</span>
                            </span>
                            <span className="text-[11px] font-semibold text-blue-700 shrink-0">
                              {acc.role === 'candidat'
                                ? 'Candidat'
                                : acc.role === 'commission'
                                ? 'Professeur / Commission'
                                : 'Admin CEDoc'}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-3 text-xs text-slate-400">
                  <div className="h-px flex-1 bg-slate-200" />
                  <span>ou par identifiants GCD</span>
                  <div className="h-px flex-1 bg-slate-200" />
                </div>

                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      E-mail académique/personnel, CIN ou code CNE <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="text"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      placeholder="Ex. salma.bennani@usmba.ac.ma ou CD648219"
                      className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-semibold text-slate-700">
                        Mot de passe <span className="text-red-600">*</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setMode('recover');
                          setErrorMsg(null);
                        }}
                        className="text-xs font-medium text-blue-700 hover:underline"
                      >
                        Mot de passe oublié ?
                      </button>
                    </div>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 px-4 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <Lock className="w-4 h-4" />
                    Accéder à mon espace
                  </button>
                </form>
              </div>
            )}

            {/* REGISTER FORM */}
            {mode === 'register' && (
              <form onSubmit={handleRegister} className="space-y-3.5">
                <p className="text-xs text-slate-600">
                  Créez votre dossier de préinscription. Vous pourrez sélectionner vos{' '}
                  <strong>{campaignConfig.requiredSubjectChoices} sujets de thèse</strong> par ordre de priorité et enregistrer votre brouillon.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Prénom (Français) <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="Ex. Amine"
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Nom (Français) <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="Ex. Mansouri"
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      الاسم الشخصي (Prénom en arabe)
                    </label>
                    <input
                      type="text"
                      dir="rtl"
                      value={firstNameAr}
                      onChange={(e) => setFirstNameAr(e.target.value)}
                      placeholder="أمين"
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      الاسم العائلي (Nom en arabe)
                    </label>
                    <input
                      type="text"
                      dir="rtl"
                      value={lastNameAr}
                      onChange={(e) => setLastNameAr(e.target.value)}
                      placeholder="المنصوري"
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      N° CIN ou Passeport <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="text"
                      value={cin}
                      onChange={(e) => setCin(e.target.value.toUpperCase())}
                      placeholder="Ex. CD741820"
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
                      placeholder="Ex. N137482910"
                      className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Adresse e-mail <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="amine.mansouri@usmba.ac.ma"
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Téléphone mobile <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="06 61 00 00 00"
                      className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Mot de passe (min. 6 car.) <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="password"
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Confirmer le mot de passe <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="password"
                      value={regPasswordConfirm}
                      onChange={(e) => setRegPasswordConfirm(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 px-4 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <UserPlus className="w-4 h-4" />
                  Créer mon dossier de candidature
                </button>
              </form>
            )}

            {/* RECOVER PASSWORD FORM */}
            {mode === 'recover' && (
              <div className="space-y-4">
                {recStep === 1 ? (
                  <form onSubmit={handleSendRecoveryCode} className="space-y-4">
                    <p className="text-xs text-slate-600">
                      Saisissez l’adresse e-mail associée à votre compte ainsi que votre CIN ou CNE pour vérifier votre identité.
                    </p>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                        Adresse e-mail du compte <span className="text-red-600">*</span>
                      </label>
                      <input
                        type="email"
                        value={recEmail}
                        onChange={(e) => setRecEmail(e.target.value)}
                        placeholder="Ex. salma.bennani@usmba.ac.ma"
                        className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                        Numéro CIN ou code CNE <span className="text-red-600">*</span>
                      </label>
                      <input
                        type="text"
                        value={recCinOrCne}
                        onChange={(e) => setRecCinOrCne(e.target.value)}
                        placeholder="Ex. CD648219 ou N138492015"
                        className="w-full px-3.5 py-2 text-sm font-mono border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                      />
                    </div>
                    <button
                      type="submit"
                      className="w-full py-2.5 px-4 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors"
                    >
                      Générer un code de récupération
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handleConfirmReset} className="space-y-4">
                    <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 text-xs text-blue-900">
                      Mode démonstration : votre code de vérification à usage unique est{' '}
                      <span className="font-mono font-bold">{generatedCode}</span> (pré-rempli ci-dessous).
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Code de vérification reçu <span className="text-red-600">*</span>
                      </label>
                      <input
                        type="text"
                        value={recCodeInput}
                        onChange={(e) => setRecCodeInput(e.target.value)}
                        className="w-full px-3.5 py-2 text-sm font-mono border border-slate-200 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Nouveau mot de passe <span className="text-red-600">*</span>
                      </label>
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Minimum 6 caractères"
                        className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-lg"
                      />
                    </div>
                    <button
                      type="submit"
                      className="w-full py-2.5 px-4 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors"
                    >
                      Enregistrer mon nouveau mot de passe
                    </button>
                  </form>
                )}
              </div>
            )}
          </div>

          {/* Right column: Instant Demo Profiles */}
          <div className="lg:col-span-5 bg-slate-50 p-6 sm:p-8 space-y-5">
            <div>
              <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
                <Users className="w-4 h-4 text-blue-700" />
                Connexion rapide (Données de démonstration)
              </div>
              <p className="text-xs text-slate-600 mt-1">
                Explorez en un clic les 3 espaces acteurs avec des dossiers illustrant chaque étape du cycle doctoral et les 3 choix de sujets.
              </p>
            </div>

            <div className="space-y-2.5">
              <p className="text-xs font-semibold text-slate-500">1. Espace Candidat (différents statuts)</p>
              {demoCandidates.map((acc) => (
                <button
                  key={acc.id}
                  type="button"
                  onClick={() => {
                    loginAsAccount(acc.id);
                    onClose();
                  }}
                  className="w-full text-left p-3 bg-white hover:bg-blue-50/50 border border-slate-200 hover:border-blue-300 rounded-xl transition-colors group"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-slate-900 group-hover:text-blue-800">
                      {acc.fullName}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-700 shrink-0" />
                  </div>
                  <p className="text-xs text-slate-600 mt-0.5">{acc.demoHighlight}</p>
                </button>
              ))}
            </div>

            <div className="space-y-2.5 pt-2 border-t border-slate-200">
              <p className="text-xs font-semibold text-slate-500">2. Commission & Administration CEDoc</p>
              {demoStaff
                .filter((a) => a.demoHighlight)
                .map((acc) => (
                  <button
                    key={acc.id}
                    type="button"
                    onClick={() => {
                      loginAsAccount(acc.id);
                      onClose();
                    }}
                    className="w-full text-left p-3 bg-white hover:bg-blue-50/50 border border-slate-200 hover:border-blue-300 rounded-xl transition-colors group"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-slate-900 group-hover:text-blue-800 flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-blue-700" />
                        {acc.role === 'commission' ? 'Commission :' : 'Administration :'} {acc.fullName}
                      </span>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-700 shrink-0" />
                    </div>
                    <p className="text-xs text-slate-600 mt-0.5">{acc.demoHighlight}</p>
                  </button>
                ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
