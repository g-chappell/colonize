// Sparrow's Diary — the canonical first-person opener to Colonize.
//
// Entries are hand-authored excerpts that dramatise the established
// canon beats of the Endeavour's NW 2191 voyage from Port Royal to the
// Archive and back: the Stranger in the tavern, departure with ~320
// souls, Barataria Bay's marked contingent, the five-day storm
// (Mr. Paulson lost), the doldrums mutiny-rumble (Mr. Jackson and the
// cat-o'-nine-tails), the fog and Red Tide (Mr. Woodhall attending the
// ill), the first confirmed land since the Collapse, the Archive
// discovery, the wreck, and Sparrow's final hours. The Captain's
// Epilogue closes the prologue by passing the legacy to the player.
//
// Canon tier discipline: every beat here is [ESTABLISHED] in lore/OTK.md.
// Nothing resolves an [OPEN] item — the Stranger remains faceless, the
// dragon mark stays unexplained, the Kraken is invoked only as folk
// tradition and Talisman imagery.

export interface DiaryEntry {
  readonly id: string;
  readonly dateline: string;
  readonly body: string;
}

export const SPARROW_DIARY: readonly DiaryEntry[] = [
  {
    id: 'port-royal-tavern',
    dateline: 'Port Royal · early NW 2191',
    body: 'A Stranger sat at the far end of the tavern tonight, hood drawn, rum untouched. He spoke of the old seas, of an island rumoured beyond Barataria — and when he spoke of it the words struck deeper than any tavern-whisper I have ever heard. I have signed the roster before breakfast. The Endeavour sails within the month.',
  },
  {
    id: 'the-roster',
    dateline: 'Port Royal · NW 2191',
    body: "Three hundred and twenty souls aboard by my count — hands and marines, carpenters and coopers, a ship's doctor out of Tortuga named Woodhall with a steady grip and a quieter laugh than I expected. Mr. Jackson takes the deck as First Mate. He carries a cat-o'-nine-tails and the look of a man who knows he will have to use it.",
  },
  {
    id: 'departure',
    dateline: 'Rayon Passage · early spring, NW 2191',
    body: 'We slipped Port Royal at the turn of the tide, colours struck, the Elders watching from the sea-wall and one of them — old Harkness, I think — touched two fingers to his brow as if he were the one leaving. The Endeavour ran quick before a fair wind, and the floating city shrank behind us to a smudge on the water.',
  },
  {
    id: 'barataria',
    dateline: 'Barataria Bay · NW 2191',
    body: 'The last mooring before the frontier. We took on twenty hands from the Bay — weathered folk, quieter than the Port Royal boys, several of them bearing a curious tattoo upon the forearm: two dragons, facing one another, or a single dragon with two heads. When I asked after its meaning they laughed and claimed it was "got on a rum-night in the Tavern." I am not convinced.',
  },
  {
    id: 'beyond-the-charts',
    dateline: 'Beyond Barataria · NW 2191',
    body: "No city lies east of here — no city has, since before my grandfather's grandfather. The charts show only a great blue emptiness and, along its far edge, in the hand of some ancient cartographer, the legend *hic sunt dracones*. Here be dragons. The crew has stopped singing. The dragons on our tattooed hands are not laughing either.",
  },
  {
    id: 'the-storm',
    dateline: 'Open sea · summer, NW 2191',
    body: 'Five days of it. A black squall running with us from the north-west, mountains of water crashing green over the stern, the mainmast groaning like a thing in pain. On the fourth day a freak wave took Mr. Paulson from the quarterdeck and we did not find him. He had drawn our charts. He was the best of us. The sea gave us no word.',
  },
  {
    id: 'the-doldrums',
    dateline: 'The Doldrums · NW 2191',
    body: 'After the storm, nothing. Three weeks of glass water and a sun that will not move. Rations tight. Tempers tighter. Mr. Jackson keeps order with the cat and a glare, and twice now has walked a man to the rail and walked him back. There is talk below decks — wild talk — of turning the ship about. I pretend not to hear it. Mr. Jackson hears everything.',
  },
  {
    id: 'the-fog',
    dateline: 'The Fog Bank · NW 2191',
    body: 'Came upon us at dawn, white and tall and utterly still. We have been inside it two days. A dozen of the crew have taken a bad fever — cough, sweats, a strange clarity in the eye before the sleep takes them. Woodhall moves between hammocks with a patience that shames me. He sleeps where he drops. The fog does not lift.',
  },
  {
    id: 'red-tide',
    dateline: 'The Red Tide · NW 2191',
    body: 'Broke out of the fog at noon and into a sea gone crimson — mile upon mile of it, and a shimmering mist riding just above the surface. Three men on the foredeck took it into their lungs and were dead before the watch turned. The mist subsides at dusk. By day we breathe through wet cloth and pray. The Barataria hands breathe easy. I do not know what to write about that.',
  },
  {
    id: 'sacrifice',
    dateline: 'The Red Tide · NW 2191',
    body: "A thing happened tonight I will not soon forget. Four of the Port Royal boys, half-mad with fear of the mist and the Bay men's immunity to it, seized three of the marked hands and put them over the rail. Claimed it was a sacrifice — to the Kraken, they said, as if one may bargain with such a thing. Mr. Jackson had the four of them at the mast before the prayer was out of their mouths. I cannot sleep.",
  },
  {
    id: 'green-on-the-horizon',
    dateline: 'Beyond the Red Tide · NW 2191',
    body: "Land. Land. Mr. Harrow from the crow's nest cried it at the second bell and half the ship was on deck before the second cry. A green smudge against the blue — an island where no island should be, where by every chart of our age no island has been for centuries. The Endeavour has made a liar of the sea.",
  },
  {
    id: 'landfall',
    dateline: 'Archive Island · NW 2191',
    body: "Wet-footed on stone that has not felt a human tread since before my fathers' fathers. The island rises sharply — what was once a mountain-top, now an island of green. Woodhall bent and touched the grass as if it were a sacrament. None of us spoke for a long time. We have beached the Endeavour in a sheltered cove. Tomorrow we climb.",
  },
  {
    id: 'the-archive',
    dateline: 'Archive Island · NW 2191',
    body: 'Set into the living rock near the summit — a door, and behind the door a chamber, and behind the chamber another, and another. Shelves. Records. A sealed world of Old World paper, vellum, glass-plate, things I cannot name. Family trees. Ship blueprints. A pirate code bearing the name Bartholomew Roberts. We have found a capsule of the world that was, and it has been waiting for us.',
  },
  {
    id: 'the-wreck',
    dateline: 'Archive Island · NW 2191',
    body: 'A storm came hard out of the south-east in the night and our moored Endeavour broke her back upon the rocks of the cove. Half the hands scrambled clear. Others did not. I was on the deck when the mainmast came down. I do not remember how I reached the shore. Woodhall says my leg will keep; his eyes say otherwise. We will not sail her home.',
  },
  {
    id: 'the-talismans',
    dateline: 'Archive Island · NW 2191',
    body: 'Two hundred and fifty of us remain. I have ordered the Archive\'s treasures crated for the return voyage — another ship will come, the Elders will send one — and set the chandler and the quartermaster to an inventory of what we have recovered. Of the tokens I found in the inner chamber, small and strange and bearing the paired-dragon mark, I have ordered that one be given to every survivor. Call them Talismans, and wear them. "Against the Kraken," the inscriptions read.',
  },
  {
    id: 'final-entry',
    dateline: "Sparrow's final entry · Archive Island · NW 2191",
    body: 'Woodhall tells me plainly now. The wound has turned, and the fever with it, and he has run out of clever things to say. No matter. The Archive is found. The crew will sail home. The Order that sent me — the Order I came to serve without quite knowing it — will have its bloodlines and its blueprints and its story at last. The tavern Stranger was right. I only wish he had told me what *he* was. Whoever reads this after me: finish it.',
  },
];

// The captain's closing words to his successor — the framing handoff
// that moves the player from "reader of Sparrow's diary" to "the one
// who finishes it." Not a diary entry proper; rendered as the final
// page, no dateline, signed off with the paired-dragon motto.
export const SPARROW_EPILOGUE = {
  id: 'captains-epilogue',
  title: "Captain's Epilogue",
  body: "And so the Endeavour's log closes, and another opens. Two hundred and fifty crew returned to Port Royal bearing the Archive's gift. The Elders have conferred. You have been chosen — by the bloodlines, by the Talisman you wear, by whatever it was the Stranger saw that night in the tavern — to take up what Sparrow laid down. The thirteen bloodlines must be gathered. The Concord is watching. The Kraken still sleeps beneath. Hic sunt dracones. We are the danger.",
} as const;
