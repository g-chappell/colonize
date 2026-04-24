// Tutorial campaign step registry — the scripted "learn the ropes"
// sequence fired on specific turns when the player opts in to tutorial
// guidance at new-game time (TASK-079).
//
// Narrative voice: Mr Jackson, First Mate of the Endeavour, addressing
// the player as a fresh captain. Gruff, naval-formal, iron-willed
// disciplinarian (per lore/OTK.md). Every `body` stays under fifty
// words — the step engine shows them as short modal beats, not essays.

export type TutorialStepId =
  | 'welcome'
  | 'end-turn'
  | 'menu'
  | 'year'
  | 'faction'
  | 'resources'
  | 'unit-stats'
  | 'ai-thinking'
  | 'concord-tension'
  | 'diplomacy'
  | 'routes'
  | 'codex'
  | 'tavern-whispers'
  | 'first-archive'
  | 'complete';

export interface TutorialStep {
  readonly id: TutorialStepId;
  // Game turn on which this step fires (1-indexed, matches
  // TurnManager.turn). A step fires once per tutorial run; once fired
  // it never re-fires even on manual reopen.
  readonly triggerTurn: number;
  readonly title: string;
  readonly body: string;
  // Optional HUD `data-testid` of the element the highlight arrow
  // should point at. When omitted, the modal shows without a callout
  // arrow (used for framing / "you're done" steps).
  readonly targetTestId?: string;
}

export const TUTORIAL_STEPS: readonly TutorialStep[] = [
  {
    id: 'welcome',
    triggerTurn: 1,
    title: 'The watch is yours, Captain',
    body: "Jackson, First Mate — late of the Endeavour. The Elders bid me teach you your ropes before the sea does. Stand to, keep your wits close, and ask plain questions. I'll answer plainer.",
  },
  {
    id: 'end-turn',
    triggerTurn: 2,
    title: 'Ending the watch',
    body: "When your orders are given, strike the bell — End Turn lets the season pass. The sea waits for no man, Captain, save perhaps the one who's already finished his count.",
    targetTestId: 'hud-end-turn',
  },
  {
    id: 'menu',
    triggerTurn: 3,
    title: 'To pause and to quit',
    body: 'The menu stows the game, saves your log, or takes you from the helm altogether. Use it without shame — the tide does not judge a captain for stepping below deck.',
    targetTestId: 'hud-menu-button',
  },
  {
    id: 'year',
    triggerTurn: 4,
    title: 'Read the year',
    body: 'Top of the deck — the season and the year. Two centuries gone since the Collapse, and the calendar keeps turning whether we would or no. Mark it each watch.',
    targetTestId: 'hud-year',
  },
  {
    id: 'faction',
    triggerTurn: 5,
    title: 'Colours on the mast',
    body: 'Your flag, Captain. Kraken, Syndicate, Corsair, Legion — men die for that sigil. Bargain with it. Bleed for it. But never trade it cheap, and never forget whose banner rides your yardarm.',
    targetTestId: 'hud-faction',
  },
  {
    id: 'resources',
    triggerTurn: 6,
    title: 'What fills the hold',
    body: 'Bread, salt, silver, powder. Every man aboard costs, and this stripe shows the store. Let it bleed dry and a crew sours faster than month-old pork. Keep an eye on it.',
    targetTestId: 'hud-resources',
  },
  {
    id: 'unit-stats',
    triggerTurn: 7,
    title: 'Know your hands',
    body: "Select a figure on the waves and the panel names them — crew, strength, paces left this turn. A captain who forgets his unit's measure deserves the locker he sails to.",
    targetTestId: 'hud-unit-stats',
  },
  {
    id: 'ai-thinking',
    triggerTurn: 8,
    title: 'Rival flags are moving',
    body: 'When this lamp lights, other captains are playing their hand. A patient man waits, Captain. A hasty man loses his boatswain. Breathe deep and let the wheel turn.',
    targetTestId: 'hud-ai-thinking',
  },
  {
    id: 'concord-tension',
    triggerTurn: 9,
    title: "The Concord's eye",
    body: 'That is the tithe-gauge. The Rayon Concord counts what we owe. Push it to high tension and their frigates arrive with hands out — and blades ready should the purse come up light.',
    targetTestId: 'hud-concord-tension',
  },
  {
    id: 'diplomacy',
    triggerTurn: 10,
    title: 'Parley and treaty',
    body: "Open the wardroom to treat with other captains. Trade, truce, ultimatum — all pressed here. Make no promise you'd not keep under an eldritch gaze. There are things at sea that listen.",
    targetTestId: 'hud-diplomacy-button',
  },
  {
    id: 'routes',
    triggerTurn: 11,
    title: 'The lanes of commerce',
    body: 'Plot a run here. A standing trade lane means standing coin — and a standing target for the Phantom Corsairs. Weigh the reward against the risk before you commit a keel.',
    targetTestId: 'hud-routes-button',
  },
  {
    id: 'codex',
    triggerTurn: 13,
    title: "The ship's library",
    body: "The Codex holds what Sparrow's diary and the Archive gave us. Creatures, bloodlines, ports, lost ships. Read it when you're confused. Half the crew were too proud to. Half the crew drowned.",
    targetTestId: 'hud-codex-button',
  },
  {
    id: 'tavern-whispers',
    triggerTurn: 15,
    title: 'Whispers in the tavern',
    body: 'Put a soul in a tavern and rumour lifts its hood. The Stranger in Shadows found Sparrow that way, and everything after was that conversation. Treat no tip as idle, Captain.',
  },
  {
    id: 'first-archive',
    triggerTurn: 18,
    title: 'The Archive remembers',
    body: 'Sooner or later you will find a fragment — Old World steel, a torn page of the Pirata Codex, a name from before the Collapse. Guard it well. Such things are not replaced.',
  },
  {
    id: 'complete',
    triggerTurn: 22,
    title: 'You have the helm',
    body: 'That is the tutor done, Captain. The rest you learn as Sparrow did — by sea, by scar, by the book he left behind. Godspeed. The Kraken sees you.',
  },
];

const TUTORIAL_STEP_IDS: readonly string[] = TUTORIAL_STEPS.map((s) => s.id);

export function isTutorialStepId(value: unknown): value is TutorialStepId {
  return typeof value === 'string' && TUTORIAL_STEP_IDS.includes(value);
}

export function getTutorialStep(id: TutorialStepId): TutorialStep {
  if (!isTutorialStepId(id)) {
    throw new TypeError(`getTutorialStep: not a valid id: ${String(id)}`);
  }
  const found = TUTORIAL_STEPS.find((s) => s.id === id);
  if (!found) {
    throw new Error(`getTutorialStep: missing entry for ${id}`);
  }
  return found;
}
