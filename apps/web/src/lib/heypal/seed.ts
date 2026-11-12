// HeyPal demo seed (brief part 2b). The one place amounts, counts,
// names, dates and prices live. Every screen derives from here.
// All people are invented. Phones are synthetic 555-range E.164.
// Dates are fixed calendar dates around DEMO_TODAY (Thu Nov 12, 2026).

export const DEMO_TODAY = '2026-11-12';
export const PLAN_PRICE_CENTS = 1500;
export const ME_ID = 'p-me';

export interface SeedPerson {
  id: string;
  name: string;
  phone: string;
}

export interface SeedPod {
  id: string;
  name: string;
  memberIds: string[];
  stage: 'Vote open' | 'Ready check' | 'Booked' | 'Planning' | 'Payments open';
}

export interface SeedPlan {
  id: string;
  podId: string;
  title: string;
  date: string;
  time: string;
  state:
    | 'completed_settled'
    | 'completed_open'
    | 'booked'
    | 'planning'
    | 'poll_open'
    | 'ready_open';
  priceEachCents: number | null;
  ledgerId: string | null;
  needsMe: boolean;
  needsMeReason: string | null;
}

export interface SeedLedgerLine {
  id: string;
  podId: string;
  planTitle: string;
  paidById: string;
  totalCents: number;
  memberIds: string[];
  eachCents: number;
  status: 'open' | 'settled';
  settledDate: string | null;
}

export interface SeedEvent {
  id: string;
  title: string;
  priceCents: number | null;
  date: string;
  time: string;
  neighborhood: string;
  category: string;
  description: string;
}

export const PEOPLE: SeedPerson[] = [
  { id: 'p-me', name: 'Janani', phone: '+15550100101' },
  { id: 'p-maya', name: 'Maya', phone: '+15550100102' },
  { id: 'p-dev', name: 'Dev', phone: '+15550100103' },
  { id: 'p-priya', name: 'Priya', phone: '+15550100104' },
  { id: 'p-sam', name: 'Sam', phone: '+15550100105' },
  { id: 'p-noor', name: 'Noor', phone: '+15550100106' },
  { id: 'p-leo', name: 'Leo', phone: '+15550100107' },
  { id: 'p-ana', name: 'Ana', phone: '+15550100108' },
  { id: 'p-theo', name: 'Theo', phone: '+15550100109' },
  { id: 'p-kai', name: 'Kai', phone: '+15550100110' },
  { id: 'p-zoe', name: 'Zoe', phone: '+15550100111' },
  { id: 'p-ravi', name: 'Ravi', phone: '+15550100112' },
  { id: 'p-ines', name: 'Ines', phone: '+15550100113' },
];

export const PODS: SeedPod[] = [
  {
    id: 'pod-friday',
    name: 'Friday Crew',
    memberIds: ['p-me', 'p-maya', 'p-dev', 'p-priya', 'p-sam'],
    stage: 'Vote open',
  },
  {
    id: 'pod-brunch',
    name: 'Brunch Club',
    memberIds: ['p-me', 'p-noor', 'p-leo', 'p-ana'],
    stage: 'Payments open',
  },
  {
    id: 'pod-thesis',
    name: 'Thesis Gang',
    memberIds: ['p-me', 'p-theo', 'p-kai', 'p-zoe', 'p-ravi', 'p-ines'],
    stage: 'Booked',
  },
  {
    id: 'pod-house',
    name: 'Housemates',
    memberIds: ['p-me', 'p-maya', 'p-sam'],
    stage: 'Planning',
  },
  {
    id: 'pod-hikers',
    name: 'Weekend Hikers',
    memberIds: [
      'p-me',
      'p-dev',
      'p-priya',
      'p-kai',
      'p-zoe',
      'p-leo',
      'p-theo',
      'p-ana',
    ],
    stage: 'Ready check',
  },
];

export const PLANS: SeedPlan[] = [
  {
    id: 'plan-ramen',
    podId: 'pod-friday',
    title: 'Ramen night',
    date: 'Fri Nov 6',
    time: '7:00 PM',
    state: 'completed_settled',
    priceEachCents: 2500,
    ledgerId: 'L3',
    needsMe: false,
    needsMeReason: null,
  },
  {
    id: 'plan-brunch',
    podId: 'pod-brunch',
    title: 'Sunday brunch',
    date: 'Sun Nov 8',
    time: '11:00 AM',
    state: 'completed_open',
    priceEachCents: 2400,
    ledgerId: 'L1',
    needsMe: true,
    needsMeReason: 'Pay $24.00',
  },
  {
    id: 'plan-jazz',
    podId: 'pod-thesis',
    title: 'Jazz night',
    date: 'Sat Nov 14',
    time: '8:00 PM',
    state: 'booked',
    priceEachCents: 2800,
    ledgerId: 'L2',
    needsMe: false,
    needsMeReason: null,
  },
  {
    id: 'plan-game',
    podId: 'pod-house',
    title: 'Game night',
    date: 'Wed Nov 18',
    time: '8:00 PM',
    state: 'planning',
    priceEachCents: null,
    ledgerId: null,
    needsMe: false,
    needsMeReason: null,
  },
  {
    id: 'plan-friday-out',
    podId: 'pod-friday',
    title: 'Friday night out',
    date: 'Fri Nov 20',
    time: '7:00 PM',
    state: 'poll_open',
    priceEachCents: 4500,
    ledgerId: null,
    needsMe: true,
    needsMeReason: 'Vote open, needs your vote',
  },
  {
    id: 'plan-sunday-hike',
    podId: 'pod-hikers',
    title: 'Sunday hike',
    date: 'Sun Nov 22',
    time: '9:00 AM',
    state: 'ready_open',
    priceEachCents: null,
    ledgerId: null,
    needsMe: true,
    needsMeReason: 'Ready check, needs your answer',
  },
  {
    id: 'plan-fall-hike',
    podId: 'pod-hikers',
    title: 'Fall hike snacks',
    date: 'Sat Oct 31',
    time: '9:00 AM',
    state: 'completed_open',
    priceEachCents: 600,
    ledgerId: 'L4',
    needsMe: true,
    needsMeReason: 'Pay $6.00',
  },
];

export const LEDGER: SeedLedgerLine[] = [
  {
    id: 'L1',
    podId: 'pod-brunch',
    planTitle: 'Sunday brunch',
    paidById: 'p-leo',
    totalCents: 9600,
    memberIds: ['p-me', 'p-noor', 'p-leo', 'p-ana'],
    eachCents: 2400,
    status: 'open',
    settledDate: null,
  },
  {
    id: 'L2',
    podId: 'pod-thesis',
    planTitle: 'Jazz night',
    paidById: 'p-me',
    totalCents: 16800,
    memberIds: ['p-me', 'p-theo', 'p-kai', 'p-zoe', 'p-ravi', 'p-ines'],
    eachCents: 2800,
    status: 'open',
    settledDate: null,
  },
  {
    id: 'L3',
    podId: 'pod-friday',
    planTitle: 'Ramen night',
    paidById: 'p-maya',
    totalCents: 12500,
    memberIds: ['p-me', 'p-maya', 'p-dev', 'p-priya', 'p-sam'],
    eachCents: 2500,
    status: 'settled',
    settledDate: 'Nov 8',
  },
  {
    id: 'L4',
    podId: 'pod-hikers',
    planTitle: 'Fall hike snacks',
    paidById: 'p-dev',
    totalCents: 4800,
    memberIds: [
      'p-me',
      'p-dev',
      'p-priya',
      'p-kai',
      'p-zoe',
      'p-leo',
      'p-theo',
      'p-ana',
    ],
    eachCents: 600,
    status: 'open',
    settledDate: null,
  },
];

export const EVENTS: SeedEvent[] = [
  {
    id: 'evt-rooftop',
    title: 'Rooftop movie night',
    priceCents: 1800,
    date: 'Sat Nov 14',
    time: '8:00 PM',
    neighborhood: 'Bushwick',
    category: 'Movies and shows',
    description:
      'A cult classic under the stars with blankets and hot cocoa. Demo listing.',
  },
  {
    id: 'evt-pottery',
    title: 'Pottery drop in',
    priceCents: 4200,
    date: 'Sun Nov 15',
    time: '2:00 PM',
    neighborhood: 'Park Slope',
    category: 'Learning and workshops',
    description:
      'Two hours at the wheel, all materials included. Demo listing.',
  },
  {
    id: 'evt-comedy',
    title: 'Comedy night',
    priceCents: 2500,
    date: 'Fri Nov 13',
    time: '8:30 PM',
    neighborhood: 'East Village',
    category: 'Comedy and talks',
    description: 'Five comics, one tiny room. Demo listing.',
  },
  {
    id: 'evt-market',
    title: 'Farmers market walk',
    priceCents: null,
    date: 'Sat Nov 14',
    time: '10:00 AM',
    neighborhood: 'Union Square',
    category: 'Food and drink',
    description: 'Taste everything, buy nothing (or everything). Demo listing.',
  },
  {
    id: 'evt-openmic',
    title: 'Open mic night',
    priceCents: 1000,
    date: 'Wed Nov 18',
    time: '7:30 PM',
    neighborhood: 'Astoria',
    category: 'Music',
    description: 'First timers welcome, regulars beloved. Demo listing.',
  },
  {
    id: 'evt-climb',
    title: 'Climbing gym day pass',
    priceCents: 3400,
    date: 'Sat Nov 21',
    time: '11:00 AM',
    neighborhood: 'Gowanus',
    category: 'Sports to play',
    description: 'Shoes included, chalk everywhere. Demo listing.',
  },
  {
    id: 'evt-dumpling',
    title: 'Dumpling crawl',
    priceCents: 3800,
    date: 'Sun Nov 22',
    time: '1:00 PM',
    neighborhood: 'Chinatown',
    category: 'Food and drink',
    description: 'Six stops, one very full group. Demo listing.',
  },
  {
    id: 'evt-karaoke',
    title: 'Karaoke room',
    priceCents: 1200,
    date: 'Fri Nov 20',
    time: '9:00 PM',
    neighborhood: 'Koreatown',
    category: 'Nightlife',
    description: 'Private room, tambourines provided. Demo listing.',
  },
];

// Poll and ready-check answers, by plan id. Names resolve through PEOPLE.
export const POLL_VOTES: Record<string, string[]> = {
  'plan-friday-out': ['p-maya', 'p-dev', 'p-priya'],
};
export const READY_YES: Record<string, string[]> = {
  'plan-sunday-hike': ['p-dev', 'p-priya', 'p-kai', 'p-zoe', 'p-leo'],
};
export const READY_WAITING: Record<string, string[]> = {
  'plan-sunday-hike': ['p-me', 'p-theo', 'p-ana'],
};

// Janani's private budget, asked about only in the private planner chat.
export const MY_BUDGET_CENTS = 4000;
export const FRIDAY_OUT_ESTIMATE_CENTS = 4500;

// ---- Derived helpers (the mock adapter computes these, never the UI) ----

export function personName(id: string): string {
  return PEOPLE.find((p) => p.id === id)?.name ?? 'Unknown';
}

export function podById(id: string): SeedPod {
  const pod = PODS.find((p) => p.id === id);
  if (!pod) throw new Error(`seed: unknown pod ${id}`);
  return pod;
}

export function ledgerById(id: string): SeedLedgerLine {
  const line = LEDGER.find((l) => l.id === id);
  if (!line) throw new Error(`seed: unknown ledger line ${id}`);
  return line;
}

/** Integer cents only. Formatted in exactly one place. */
export function formatMoney(cents: number): string {
  const sign = cents < 0 ? '-' : '';
  const abs = Math.abs(cents);
  const dollars = Math.floor(abs / 100);
  const rest = String(abs % 100).padStart(2, '0');
  return `${sign}$${dollars.toLocaleString('en-US')}.${rest}`;
}

export function formatSplit(cents: number): string {
  return `${formatMoney(cents)} each`;
}

/** Pods where Janani still owes an action. Drives the orange orbit. */
export function podsNeedingMe(): SeedPod[] {
  const out = new Set<string>();
  for (const plan of PLANS) {
    if (plan.needsMe) out.add(plan.podId);
  }
  for (const line of LEDGER) {
    if (line.status !== 'open') continue;
    if (line.paidById !== ME_ID && line.memberIds.includes(ME_ID)) {
      out.add(line.podId);
    }
  }
  return PODS.filter((p) => out.has(p.id));
}

export interface MoneySummary {
  owedToMeCents: number;
  iOweCents: number;
  netCents: number;
  label: string;
  openLines: SeedLedgerLine[];
  settledLines: SeedLedgerLine[];
}

/** The one net number for the money screen, computed from the ledger. */
export function moneySummary(): MoneySummary {
  let owedToMe = 0;
  let iOwe = 0;
  for (const line of LEDGER) {
    if (line.status !== 'open') continue;
    if (line.paidById === ME_ID) {
      owedToMe += line.totalCents - line.eachCents;
    } else if (line.memberIds.includes(ME_ID)) {
      iOwe += line.eachCents;
    }
  }
  const net = owedToMe - iOwe;
  return {
    owedToMeCents: owedToMe,
    iOweCents: iOwe,
    netCents: net,
    label: net >= 0 ? "You're owed" : 'You owe',
    openLines: LEDGER.filter((l) => l.status === 'open'),
    settledLines: LEDGER.filter((l) => l.status === 'settled'),
  };
}
