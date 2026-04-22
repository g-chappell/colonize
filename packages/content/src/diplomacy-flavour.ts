import type { ToneRegister } from './palette.js';

// Mirrors `DiplomacyAction` in packages/core/src/diplomacy/diplomacy-action.ts.
// Duplicated rather than imported because the workspace dependency
// direction forbids content → core imports. Consumers that bridge both
// (apps/web) pin the strings together in a test to catch drift.
export type DiplomacyActionId =
  | 'declare-war'
  | 'propose-peace'
  | 'propose-alliance'
  | 'gift-resources'
  | 'denounce'
  | 'share-intel';

export interface DiplomacyActionFlavourEntry {
  readonly action: DiplomacyActionId;
  readonly title: string;
  readonly summary: string;
  readonly flavour: string;
  // Descriptive cost-or-gift label for the confirmation modal. Not wire-
  // enforced — a future coin/resource tithe system reads its own table;
  // this line is flavour the player sees. "—" for actions that carry no
  // material cost.
  readonly costLabel: string;
  readonly confirmLabel: string;
  readonly register: ToneRegister;
}

export const DIPLOMACY_ACTION_FLAVOURS: readonly DiplomacyActionFlavourEntry[] = [
  {
    action: 'declare-war',
    title: 'Declare War',
    summary: 'Break the parley and raise colours. Relations collapse to the bone.',
    flavour:
      'Strike the flag of truce, run out the guns. From this hour their hulls answer for every insult we have swallowed.',
    costLabel: '—',
    confirmLabel: 'Open Fire',
    register: 'salt-and-rum',
  },
  {
    action: 'propose-peace',
    title: 'Propose Peace',
    summary: 'Offer terms. They may accept, or spit and call for more blood.',
    flavour:
      'A white pennant, a parley at dawn. If their captain still remembers coin over grudge, the lanes may yet reopen.',
    costLabel: '—',
    confirmLabel: 'Send Envoy',
    register: 'salt-and-rum',
  },
  {
    action: 'propose-alliance',
    title: 'Propose Alliance',
    summary: 'Bind oaths in ink and salt. Only the warmest of friends will accept.',
    flavour:
      'Twin sigils pressed into wet wax, the oath sealed beneath an eel-lamp. Such pacts bind further than the parties intend.',
    costLabel: 'Requires warm relations',
    confirmLabel: 'Seal the Pact',
    register: 'eldritch',
  },
  {
    action: 'gift-resources',
    title: 'Gift Resources',
    summary: 'A tribute of crates. Unconditional goodwill — no refusal possible.',
    flavour:
      'Salt pork, rum casks, and a brace of sextants in tidy Syndicate crates. A manifest marked goodwill; a signal their quartermaster will remember.',
    costLabel: 'Tribute of 10 cargo',
    confirmLabel: 'Dispatch Tribute',
    register: 'salvaged-futurism',
  },
  {
    action: 'denounce',
    title: 'Denounce',
    summary: 'Publish their crimes on every dock. Relations sour; no accepting required.',
    flavour:
      'Broadsheets nailed to every bollard from Driftwatch to the Crimson Gate. Names named, sins counted, ink still wet.',
    costLabel: '—',
    confirmLabel: 'Post the Broadsheet',
    register: 'salt-and-rum',
  },
  {
    action: 'share-intel',
    title: 'Share Intel',
    summary: 'Quietly hand over a dossier. A small, unconditional kindness.',
    flavour:
      'A waxed-canvas tube slipped across a taverna table: route charts, convoy schedules, the name of a turncoat clerk. Their ledger will balance the favour in time.',
    costLabel: '—',
    confirmLabel: 'Hand Over Dossier',
    register: 'salvaged-futurism',
  },
];

export function getDiplomacyActionFlavour(action: DiplomacyActionId): DiplomacyActionFlavourEntry {
  const found = DIPLOMACY_ACTION_FLAVOURS.find((f) => f.action === action);
  if (!found) {
    throw new Error(`Unknown diplomacy action: ${action}`);
  }
  return found;
}

export function isDiplomacyActionId(value: unknown): value is DiplomacyActionId {
  return (
    typeof value === 'string' &&
    DIPLOMACY_ACTION_FLAVOURS.some((f) => (f.action as string) === value)
  );
}
