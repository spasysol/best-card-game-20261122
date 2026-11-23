// The card catalogue: every card Cinderfall can deal. Four elements, each told
// apart by colour and by shape (flame, wave, swirl, mountain), never by text
// alone. Elements form a cycle — Ember beats Gale, Gale beats Tide, Tide beats
// Ember — while Stone stands outside it: no advantage given, none taken.
//
// A card is one of two kinds:
//   creature — played into one of the four table slots; fights at round's end.
//   spell    — played straight from the hand; its effect happens at once.

export const ELEMENTS = {
  ember: { name: 'Ember', colour: '#e5484d', dark: '#7f1d1d', shape: 'flame' },
  tide: { name: 'Tide', colour: '#3b82f6', dark: '#1e3a8a', shape: 'wave' },
  gale: { name: 'Gale', colour: '#22c55e', dark: '#14532d', shape: 'swirl' },
  stone: { name: 'Stone', colour: '#d97706', dark: '#78350f', shape: 'mountain' },
};

// What each element beats. Stone beats nothing and is beaten by nothing.
export const BEATS = { ember: 'gale', gale: 'tide', tide: 'ember', stone: null };

export function beats(a, b) {
  return BEATS[a] === b;
}

export const CARDS = [
  { id: 'cinder-imp', name: 'Cinder Imp', element: 'ember', kind: 'creature', cost: 1, power: 2, toughness: 1, text: 'A spark with ambition.' },
  { id: 'flame-acolyte', name: 'Flame Acolyte', element: 'ember', kind: 'creature', cost: 2, power: 3, toughness: 2, text: 'Feeds the fire.' },
  { id: 'pyre-drake', name: 'Pyre Drake', element: 'ember', kind: 'creature', cost: 4, power: 5, toughness: 4, text: 'The sky itself burns.' },
  { id: 'ember-bolt', name: 'Ember Bolt', element: 'ember', kind: 'spell', cost: 2, text: 'Deal 3 damage to the strongest enemy creature, or 2 to the Warden if none stands.' },
  { id: 'ripple-sprite', name: 'Ripple Sprite', element: 'tide', kind: 'creature', cost: 1, power: 1, toughness: 2, text: 'Small waves wear down stone.' },
  { id: 'tidecaller', name: 'Tidecaller', element: 'tide', kind: 'creature', cost: 2, power: 2, toughness: 3, text: 'The sea answers.' },
  { id: 'deep-leviathan', name: 'Deep Leviathan', element: 'tide', kind: 'creature', cost: 4, power: 4, toughness: 5, text: 'Older than the shore.' },
  { id: 'mend-banks', name: 'Mend the Banks', element: 'tide', kind: 'spell', cost: 2, text: 'Restore 4 life.' },
  { id: 'zephyr-hawk', name: 'Zephyr Hawk', element: 'gale', kind: 'creature', cost: 1, power: 2, toughness: 2, text: 'Fast as rumour.' },
  { id: 'storm-dancer', name: 'Storm Dancer', element: 'gale', kind: 'creature', cost: 3, power: 4, toughness: 3, text: 'Dances between drops.' },
  { id: 'sky-serpent', name: 'Sky Serpent', element: 'gale', kind: 'creature', cost: 4, power: 5, toughness: 3, text: 'It rides the high wind.' },
  { id: 'catch-draft', name: 'Catch the Draft', element: 'gale', kind: 'spell', cost: 1, text: 'Draw 2 cards.' },
  { id: 'pebble-guard', name: 'Pebble Guard', element: 'stone', kind: 'creature', cost: 1, power: 0, toughness: 3, text: 'Small. Stubborn.' },
  { id: 'granite-sentinel', name: 'Granite Sentinel', element: 'stone', kind: 'creature', cost: 2, power: 1, toughness: 4, text: 'It has never moved.' },
  { id: 'mountain-king', name: 'Mountain King', element: 'stone', kind: 'creature', cost: 4, power: 3, toughness: 6, text: 'The mountain wakes.' },
  { id: 'quake', name: 'Quake', element: 'stone', kind: 'spell', cost: 3, text: 'Deal 1 damage to every enemy creature.' },
];

export const CARD_BY_ID = Object.fromEntries(CARDS.map((c) => [c.id, c]));

export function cardName(id) {
  return CARD_BY_ID[id]?.name ?? id;
}
