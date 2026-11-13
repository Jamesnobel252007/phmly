export const BRAND = {
  name: 'PHMLY',
  tagline: 'Your people. Your purpose. Your space.',
  colors: {
    forestBlack: '#0A100D',
    pineCharcoal: '#141D17',
    goldenRush: '#F5A623',
    amberGlow: '#E08E1B',
    forestCream: '#F4F6F4',
    mutedMoss: '#8A9A8F',
  },
};

export const LIMITS = {
  MAX_ROOMS_CREATED: 5,
  MIN_ROOM_MEMBERS: 1,
  MAX_ROOM_MEMBERS: 30,
};

export const ROOM_TYPE_META = {
  conversation: {
    title: 'Conversation',
    description: 'Talk, share photos, and stay connected.',
    badgeColor: 'bg-emerald-950/60 text-emerald-300 border-emerald-800/50',
    iconName: 'MessageSquare',
  },
  buddies: {
    title: 'Buddies',
    description: 'Share what you\'re learning and keep each other motivated.',
    badgeColor: 'bg-amber-950/60 text-amber-300 border-amber-800/50',
    iconName: 'Users',
  },
  project_vault: {
    title: 'Project Vault',
    description: 'Keep useful files and resources together.',
    badgeColor: 'bg-blue-950/60 text-blue-300 border-blue-800/50',
    iconName: 'FolderArchive',
  },
  goal_tracker: {
    title: 'Goal Tracker',
    description: 'Set today\'s goals and see what your friends achieve.',
    badgeColor: 'bg-goldenRush/20 text-goldenRush border-goldenRush/40',
    iconName: 'Target',
  },
} as const;

export const GOAL_RANKING_CATEGORIES = {
  TOP: 'Naantha ipo ooroda top la irukura',
  GOOD: 'Vaalthukal vaalthukal',
  ZERO: 'Choplangii ta bro',
};

export const EMPTY_GOAL_STATE = {
  headline: 'NOTITU poiruchu THAMBI 😭',
  motivational: 'Innaiku miss aachu. Naalaikku comeback pannalaam!',
  actionButton: 'Tomorrow, we go again',
};

export const TYPOGRAPHY = {
  display: '24px',
  pageTitle: '20px',
  roomTitle: '17px',
  section: '16px',
  body: '15px',
  secondary: '14px',
  metadata: '12px',
  caption: '11px',
  weights: {
    regular: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
  lineHeights: {
    headings: 1.3,
    body: 1.45,
    metadata: 1.35,
  },
} as const;


