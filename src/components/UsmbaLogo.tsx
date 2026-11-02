import React, { useState } from 'react';
import { GraduationCap } from 'lucide-react';

const USMBA_LOGO_SRC =
  '/assets/aistudio/Universite-Sidi-Mohamed-Ben-Abdellah-Concours-Emploi-Recrutement_1b7b4939.png';

interface UsmbaLogoProps {
  /**
   * 'full' renders the complete trilingual USMBA wordmark + emblem (cropped from whitespace).
   * 'emblem' renders only the official USMBA crest/emblem for compact headers & sidebars.
   */
  variant?: 'full' | 'emblem';
  className?: string;
}

export const UsmbaLogo: React.FC<UsmbaLogoProps> = ({
  variant = 'full',
  className = '',
}) => {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <span
        className={`inline-flex items-center gap-2 font-display font-bold text-blue-900 ${className}`}
      >
        <GraduationCap className="w-5 h-5 text-blue-700 shrink-0" />
        {variant === 'full' && <span>Université Sidi Mohamed Ben Abdellah — Fès</span>}
      </span>
    );
  }

  if (variant === 'emblem') {
    return (
      <span
        className={`relative inline-block overflow-hidden aspect-[188/220] shrink-0 select-none ${className}`}
      >
        <img
          src={USMBA_LOGO_SRC}
          alt="Emblème Université Sidi Mohamed Ben Abdellah de Fès"
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
          className="absolute max-w-none w-[638.3%] -left-[516%] -top-[89.1%] mix-blend-multiply pointer-events-none"
        />
      </span>
    );
  }

  return (
    <span
      className={`relative inline-block overflow-hidden aspect-[1108/220] shrink-0 select-none ${className}`}
    >
      <img
        src={USMBA_LOGO_SRC}
        alt="Université Sidi Mohamed Ben Abdellah de Fès — جامعة سيدي محمد بن عبد الله بفاس"
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
        className="absolute max-w-none w-[108.3%] -left-[4.51%] -top-[89.1%] mix-blend-multiply pointer-events-none"
      />
    </span>
  );
};
