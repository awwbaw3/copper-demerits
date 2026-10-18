import React from 'react';

export interface TeamBadgeMeta {
  teamName: string;
  shortTitle: string;
  tagline: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  bgGradient: string;
  borderGlow: string;
  iconType: 'red-wings' | 'pistons-bad-boys' | 'lions' | 'tigers' | 'michigan' | 'msu';
}

/**
 * Maps each Demerit Category to a signature Detroit Pro Team / Michigan / Michigan State
 * tongue-in-cheek visual badge matching Copper Athletic Club's memorabilia wall.
 */
export function getMichiganTeamMetaForType(type: string, description = ''): TeamBadgeMeta {
  const lower = `${type} ${description}`.toLowerCase();

  if (lower.includes('red wings') || lower.includes('attendance') || lower.includes('no-show') || lower.includes('no show')) {
    return {
      teamName: 'HOCKEYTOWN PENALTY BOX',
      shortTitle: '5-MIN MAJOR • NO-SHOW',
      tagline: 'Red Wings Watch Party Violation',
      primaryColor: '#CE1126',
      secondaryColor: '#FFFFFF',
      accentColor: '#FF4D5E',
      bgGradient: 'from-[#CE1126]/30 via-[#5A0610]/40 to-[#121212]',
      borderGlow: 'border-[#CE1126]/60 shadow-[0_0_20px_rgba(206,17,38,0.3)]',
      iconType: 'red-wings',
    };
  }

  if (lower.includes('insubordinat') || lower.includes('defian') || lower.includes('back talk') || lower.includes('not caring')) {
    return {
      teamName: 'BAD BOYS TECHNICAL FOUL',
      shortTitle: 'LAIMBEER / MAHORN TECH',
      tagline: 'Detroit Bad Boys Conduct Flag',
      primaryColor: '#1D42BA',
      secondaryColor: '#C8102E',
      accentColor: '#60A5FA',
      bgGradient: 'from-[#1D42BA]/35 via-[#C8102E]/25 to-[#121212]',
      borderGlow: 'border-[#3B82F6]/60 shadow-[0_0_20px_rgba(29,66,186,0.35)]',
      iconType: 'pistons-bad-boys',
    };
  }

  if (lower.includes('seat') || lower.includes('etiquette') || lower.includes('stool')) {
    return {
      teamName: 'LIONS COUNTRY FALSE START',
      shortTitle: 'ILLEGAL SEAT SHIFT',
      tagline: 'Too Many Moves in the Pocket',
      primaryColor: '#0076B6',
      secondaryColor: '#B0B7BC',
      accentColor: '#38BDF8',
      bgGradient: 'from-[#0076B6]/35 via-[#072B42]/40 to-[#121212]',
      borderGlow: 'border-[#0076B6]/60 shadow-[0_0_20px_rgba(0,118,182,0.35)]',
      iconType: 'lions',
    };
  }

  if (lower.includes('drink') || lower.includes('gin') || lower.includes('diet coke') || lower.includes('order')) {
    return {
      teamName: 'COMERICA PARTY FOUL',
      shortTitle: 'SWING & A MISS ORDER',
      tagline: 'Illegal Pour at Copper Bar',
      primaryColor: '#FA4616',
      secondaryColor: '#0C2340',
      accentColor: '#FB923C',
      bgGradient: 'from-[#FA4616]/30 via-[#0C2340]/50 to-[#121212]',
      borderGlow: 'border-[#FA4616]/60 shadow-[0_0_20px_rgba(250,70,22,0.3)]',
      iconType: 'tigers',
    };
  }

  if (lower.includes('headband') || lower.includes('attire') || lower.includes('headgear')) {
    return {
      teamName: 'SPARTAN / WOLVERINE GEAR FOUL',
      shortTitle: 'ILLEGAL HEADGEAR',
      tagline: 'Unapproved Bar Game-Day Attire',
      primaryColor: '#FFCB05',
      secondaryColor: '#18453B',
      accentColor: '#FACC15',
      bgGradient: 'from-[#FFCB05]/25 via-[#18453B]/40 to-[#121212]',
      borderGlow: 'border-[#FFCB05]/60 shadow-[0_0_20px_rgba(255,203,5,0.3)]',
      iconType: 'michigan',
    };
  }

  return {
    teamName: 'EAST LANSING PARTY FOUL',
    shortTitle: 'PENALTY ON THE PLAY',
    tagline: 'House Rule Citation',
    primaryColor: '#18453B',
    secondaryColor: '#FFFFFF',
    accentColor: '#34D399',
    bgGradient: 'from-[#18453B]/40 via-[#0B221D]/40 to-[#121212]',
    borderGlow: 'border-[#34D399]/50 shadow-[0_0_20px_rgba(24,69,59,0.35)]',
    iconType: 'msu',
  };
}

/**
 * Renders animated Detroit Pro Team / Michigan / MSU SVG sports graphics.
 */
export const MichiganTeamEmblem: React.FC<{
  iconType: TeamBadgeMeta['iconType'];
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}> = ({ iconType, size = 'md', className = '' }) => {
  const dim = size === 'sm' ? 'w-8 h-8' : size === 'lg' ? 'w-14 h-14' : 'w-11 h-11';

  if (iconType === 'red-wings') {
    // Winged Hockey Wheel + Crossed Sticks (Red Wings / Hockeytown)
    return (
      <div
        className={`${dim} relative flex items-center justify-center rounded-xl bg-gradient-to-br from-[#CE1126] to-[#7A0714] border border-white/30 shadow-lg group-hover:scale-110 group-hover:-rotate-6 transition-transform duration-300 ${className}`}
        title="Hockeytown Penalty Box — Red Wings"
      >
        <svg viewBox="0 0 64 64" className="w-4/5 h-4/5 drop-shadow">
          {/* Wing feathers */}
          <path
            d="M6 26 C18 16, 36 16, 56 22 C44 26, 36 28, 54 30 C40 34, 34 36, 48 38 C34 42, 20 42, 10 36 Z"
            fill="#FFFFFF"
          />
          {/* Red Wheel */}
          <circle cx="24" cy="34" r="11" fill="#CE1126" stroke="#FFFFFF" strokeWidth="3" />
          <circle cx="24" cy="34" r="4" fill="#FFFFFF" />
          {/* Spokes */}
          <line x1="24" y1="23" x2="24" y2="45" stroke="#FFFFFF" strokeWidth="2" />
          <line x1="13" y1="34" x2="35" y2="34" stroke="#FFFFFF" strokeWidth="2" />
        </svg>
      </div>
    );
  }

  if (iconType === 'pistons-bad-boys') {
    // Detroit Bad Boys Basketball + Technical Whistle + Skull Crossbones vibe
    return (
      <div
        className={`${dim} relative flex items-center justify-center rounded-xl bg-gradient-to-br from-[#1D42BA] via-[#112770] to-[#C8102E] border border-white/30 shadow-lg group-hover:scale-110 group-hover:rotate-6 transition-transform duration-300 ${className}`}
        title="Detroit Bad Boys Technical Foul"
      >
        <svg viewBox="0 0 64 64" className="w-4/5 h-4/5 drop-shadow">
          <circle cx="32" cy="32" r="22" fill="#C8102E" stroke="#FFFFFF" strokeWidth="3" />
          <path d="M10 32 H54" stroke="#1D42BA" strokeWidth="3" />
          <path d="M32 10 V54" stroke="#1D42BA" strokeWidth="3" />
          <path d="M17 17 C26 26, 26 38, 17 47" stroke="#FFFFFF" strokeWidth="2.5" fill="none" />
          <path d="M47 17 C38 26, 38 38, 47 47" stroke="#FFFFFF" strokeWidth="2.5" fill="none" />
          <text
            x="32"
            y="37"
            textAnchor="middle"
            fill="#FFFFFF"
            fontSize="13"
            fontWeight="900"
            fontFamily="Impact, sans-serif"
          >
            TECH
          </text>
        </svg>
      </div>
    );
  }

  if (iconType === 'lions') {
    // Honolulu Blue & Silver Football Helmet + "Lions Country" Octagon
    return (
      <div
        className={`${dim} relative flex items-center justify-center rounded-xl bg-gradient-to-br from-[#0076B6] to-[#003E63] border border-[#B0B7BC]/50 shadow-lg group-hover:scale-110 group-hover:-rotate-3 transition-transform duration-300 ${className}`}
        title="Detroit Lions Country — Honolulu Blue & Silver"
      >
        <svg viewBox="0 0 64 64" className="w-4/5 h-4/5 drop-shadow">
          {/* Silver Helmet Shell */}
          <path
            d="M12 38 C12 20, 26 12, 42 14 C50 16, 54 24, 52 34 L40 34 L38 44 L18 44 Z"
            fill="#B0B7BC"
            stroke="#FFFFFF"
            strokeWidth="2.5"
          />
          {/* Honolulu Blue Stripe */}
          <path d="M22 15 C30 13, 38 15, 44 20" stroke="#0076B6" strokeWidth="5" fill="none" strokeLinecap="round" />
          {/* Facemask */}
          <path d="M40 32 H54 M40 38 H54 M44 30 V44 M51 32 V42" stroke="#121212" strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="28" cy="34" r="3" fill="#0076B6" />
        </svg>
      </div>
    );
  }

  if (iconType === 'tigers') {
    // Detroit Tigers Navy & Orange Baseball / Copper Mug Mashup
    return (
      <div
        className={`${dim} relative flex items-center justify-center rounded-xl bg-gradient-to-br from-[#0C2340] to-[#FA4616] border border-[#FA4616]/60 shadow-lg group-hover:scale-110 group-hover:rotate-6 transition-transform duration-300 ${className}`}
        title="Detroit Tigers / Copper Mug Party Foul"
      >
        <svg viewBox="0 0 64 64" className="w-4/5 h-4/5 drop-shadow">
          {/* Copper Mule Mug */}
          <rect x="14" y="18" width="28" height="32" rx="5" fill="#B87333" stroke="#FFFFFF" strokeWidth="2.5" />
          <path d="M42 24 H50 C52 24, 52 42, 50 42 H42" stroke="#F59E0B" strokeWidth="3.5" fill="none" />
          {/* Foam top */}
          <path d="M14 18 C18 12, 24 12, 28 16 C32 11, 38 12, 42 18 Z" fill="#FFFFFF" />
          <text
            x="28"
            y="39"
            textAnchor="middle"
            fill="#0C2340"
            fontSize="16"
            fontWeight="900"
            fontFamily="serif"
          >
            D
          </text>
        </svg>
      </div>
    );
  }

  if (iconType === 'michigan') {
    // Maize & Blue Winged Helmet + Spartan Green Split Rivalry Badge
    return (
      <div
        className={`${dim} relative flex items-center justify-center rounded-xl bg-gradient-to-br from-[#00274C] via-[#18453B] to-[#FFCB05] border border-[#FFCB05]/60 shadow-lg group-hover:scale-110 group-hover:-rotate-6 transition-transform duration-300 ${className}`}
        title="Michigan Wolverines & Michigan State Rivalry Headgear"
      >
        <svg viewBox="0 0 64 64" className="w-4/5 h-4/5 drop-shadow">
          {/* Headband / Winged Crown */}
          <rect x="10" y="24" width="44" height="16" rx="8" fill="#FFCB05" stroke="#00274C" strokeWidth="3" />
          <path d="M18 24 L26 40 M32 24 L32 40 M46 24 L38 40" stroke="#18453B" strokeWidth="3" />
          <circle cx="32" cy="32" r="5" fill="#00274C" />
        </svg>
      </div>
    );
  }

  // MSU Spartan Green & White
  return (
    <div
      className={`${dim} relative flex items-center justify-center rounded-xl bg-gradient-to-br from-[#18453B] to-[#0B221D] border border-white/40 shadow-lg group-hover:scale-110 transition-transform duration-300 ${className}`}
      title="Michigan State Spartans Green & White"
    >
      <svg viewBox="0 0 64 64" className="w-4/5 h-4/5 drop-shadow">
        {/* Spartan Crest Plume */}
        <path d="M20 18 C28 8, 42 10, 46 22 C38 20, 28 20, 20 26 Z" fill="#FFFFFF" />
        <path d="M18 28 H46 L42 50 L32 56 L22 50 Z" fill="#18453B" stroke="#FFFFFF" strokeWidth="3" />
        <path d="M24 36 L30 40 L24 44 M40 36 L34 40 L40 44" stroke="#FFFFFF" strokeWidth="2.5" fill="none" />
      </svg>
    </div>
  );
};

/**
 * Renders animated Copper Moscow Mule Mugs / Penalty Pucks to visually represent Demerit Count!
 */
export const CopperMugMeter: React.FC<{
  points: number;
  maxPoints?: number;
}> = ({ points, maxPoints = 5 }) => {
  const mugs = Array.from({ length: Math.max(points, maxPoints) }, (_, i) => i < points);

  return (
    <div className="flex items-center gap-1.5" aria-label={`${points} Demerit Points`}>
      {mugs.map((active, idx) => (
        <div
          key={idx}
          className={`relative w-6 h-7 rounded-md flex items-center justify-center transition-all duration-300 ${
            active
              ? 'bg-gradient-to-b from-[#E8B888] via-[#B87333] to-[#7C471C] border border-[#F59E0B] shadow-[0_0_10px_rgba(184,115,51,0.6)] scale-105'
              : 'bg-[#1A1614] border border-white/10 opacity-35'
          }`}
          title={active ? `Demerit Point #${idx + 1}` : 'Empty Slot'}
        >
          {/* Foam rim */}
          {active && (
            <div className="absolute -top-1 inset-x-0.5 h-1.5 rounded-full bg-[#F5F2EB] shadow-sm" />
          )}
          <span
            className={`text-[10px] font-black font-mono-docket ${
              active ? 'text-[#121212]' : 'text-[#8E8074]'
            }`}
          >
            {idx + 1}
          </span>
        </div>
      ))}
    </div>
  );
};

/**
 * Visualizes Detroit & Michigan Team Rivalry Badges in a horizontal strip.
 */
export const DetroitSportsBannerStrip: React.FC<{
  activeFilter: string | null;
  onSelectType: (type: string | null) => void;
  typeCounts: Record<string, number>;
}> = ({ activeFilter, onSelectType, typeCounts }) => {
  const teams = [
    {
      key: 'Insubordination / Defiance',
      label: 'BAD BOYS TECH',
      sub: 'Back Talk & Defiance',
      iconType: 'pistons-bad-boys' as const,
      color: 'border-[#3B82F6]/60 from-[#1D42BA]/30 to-[#C8102E]/25',
    },
    {
      key: 'Attendance / No-Show',
      label: 'RED WINGS BOX',
      sub: 'No-Call / No-Show',
      iconType: 'red-wings' as const,
      color: 'border-[#CE1126]/60 from-[#CE1126]/30 to-[#121212]',
    },
    {
      key: 'Bar Etiquette / Seating',
      label: 'LIONS FALSE START',
      sub: 'Seat Moves',
      iconType: 'lions' as const,
      color: 'border-[#0076B6]/60 from-[#0076B6]/30 to-[#121212]',
    },
    {
      key: 'Drink Crime / Order Foul',
      label: 'TIGERS FOUL BALL',
      sub: 'Gin & Diet Coke',
      iconType: 'tigers' as const,
      color: 'border-[#FA4616]/60 from-[#FA4616]/30 to-[#0C2340]/40',
    },
    {
      key: 'Attire / Headgear Foul',
      label: 'UM / MSU GEAR FOUL',
      sub: 'The Headband',
      iconType: 'michigan' as const,
      color: 'border-[#FFCB05]/60 from-[#00274C]/40 to-[#18453B]/40',
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
      {teams.map((t) => {
        const pts = typeCounts[t.key] || 0;
        const isSelected = activeFilter === t.key;
        return (
          <button
            key={t.key}
            type="button"
            onClick={() => onSelectType(isSelected ? null : t.key)}
            className={`group relative overflow-hidden rounded-2xl border p-3 text-left transition-all duration-300 cursor-pointer bg-gradient-to-br ${
              t.color
            } ${
              isSelected
                ? 'ring-2 ring-[#E8B888] scale-[1.03] shadow-[0_0_25px_rgba(184,115,51,0.4)]'
                : 'hover:scale-[1.02] hover:border-[#E8B888]/60'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <MichiganTeamEmblem iconType={t.iconType} size="sm" />
              <div className="text-right">
                <span className="block font-display text-2xl font-black leading-none text-[#F5F2EB]">
                  {pts}
                </span>
                <span className="text-[9px] font-mono-docket uppercase tracking-wider text-[#E8B888]">
                  PTS
                </span>
              </div>
            </div>
            <div className="mt-2">
              <p className="font-display text-xs font-bold uppercase tracking-wider text-[#F5F2EB] truncate">
                {t.label}
              </p>
              <p className="text-[10px] font-mono-docket text-[#D6CFC7] truncate">{t.sub}</p>
            </div>
          </button>
        );
      })}
    </div>
  );
};

export const MichiganTeamBadge = MichiganTeamEmblem;

