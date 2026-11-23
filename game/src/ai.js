// The Ash Warden: the opponent. It announces an intent each round — the
// element it is gathering — so its choices can be read and countered: when it
// gathers Ember, Stone walls blunt it; when it gathers Tide, expect healing
// and long fights. It plays greedily toward its intent, defends when hurt,
// and never bluffs.
//
// The same brain drives the autopilot that plays both sides in the screenshot
// scenes, with a `skill` setting: 'warden' plays to win, 'careless' plays the
// first affordable card into the first open slot and wastes its spells —
// which is how the loss scene is staged.

import { CARD_BY_ID, beats } from './cards.js';
import { TABLE_SLOTS, playCreature, playSpell } from './rules.js';

function mostCommonElement(side) {
  const counts = {};
  for (const id of side.hand) {
    const el = CARD_BY_ID[id].element;
    counts[el] = (counts[el] ?? 0) + 1;
  }
  let best = 'ember';
  let bestCount = -1;
  for (const el of Object.keys(counts)) {
    if (counts[el] > bestCount) {
      best = el;
      bestCount = counts[el];
    }
  }
  return best;
}

function firstOpenSlot(side) {
  for (let i = 0; i < TABLE_SLOTS; i += 1) {
    if (!side.table[i]) return i;
  }
  return -1;
}

// The best slot for a creature: opposite a foe creature it beats, else
// opposite the weakest foe creature, else the first open slot.
function bestSlotFor(game, side, foe, element) {
  let best = -1;
  let bestScore = -1;
  for (let i = 0; i < TABLE_SLOTS; i += 1) {
    if (side.table[i]) continue;
    const opposite = foe.table[i];
    let score = 1;
    if (opposite) {
      score = beats(element, opposite.element) ? 10 : opposite.power <= 2 ? 5 : 2;
    }
    if (score > bestScore) {
      best = i;
      bestScore = score;
    }
  }
  return best;
}

function spellIsUseful(game, side, foe, id) {
  if (id === 'ember-bolt') return true;
  if (id === 'mend-banks') return side.life <= 14;
  if (id === 'catch-draft') return side.hand.length <= 3;
  if (id === 'quake') {
    let count = 0;
    for (const c of foe.table) if (c) count += 1;
    return count >= 2;
  }
  return false;
}

// Value of a card in hand, for greedy play: power per energy, intent first.
function cardValue(game, side, id, intent) {
  const card = CARD_BY_ID[id];
  if (card.kind === 'spell') return spellIsUseful(game, side, side === game.you ? game.foe : game.you, id) ? 4 : 0;
  let value = card.power + card.toughness / 2;
  if (card.element === intent) value += 2;
  return value - card.cost * 0.5;
}

export function takeTurn(game, side, foe, skill = 'warden') {
  // The Warden's announced intent is its leaning this round; any other side
  // leans toward the element it holds most of.
  const intent =
    side === game.foe
      ? game.foeIntent
      : mostCommonElement(side);
  let guard = 0;
  while (guard < 40 && game.phase === 'play') {
    guard += 1;
    let played = false;
    if (skill === 'careless') {
      // Play the first affordable card into the first open slot, or cast the
      // first spell whether or not it helps.
      for (let h = 0; h < side.hand.length; h += 1) {
        const card = CARD_BY_ID[side.hand[h]];
        if (side.energy < card.cost) continue;
        if (card.kind === 'creature') {
          const slot = firstOpenSlot(side);
          if (slot >= 0 && playCreature(game, side, h, slot)) {
            played = true;
            break;
          }
        } else if (playSpell(game, side, h)) {
          played = true;
          break;
        }
      }
      if (!played) break;
      continue;
    }
    // Warden play: the best card it can afford, into the best slot.
    let bestHand = -1;
    let bestValue = 0;
    for (let h = 0; h < side.hand.length; h += 1) {
      const card = CARD_BY_ID[side.hand[h]];
      if (side.energy < card.cost) continue;
      if (card.kind === 'creature' && firstOpenSlot(side) < 0) continue;
      const value = cardValue(game, side, side.hand[h], intent);
      if (value > bestValue) {
        bestValue = value;
        bestHand = h;
      }
    }
    if (bestHand < 0) break;
    const card = CARD_BY_ID[side.hand[bestHand]];
    if (card.kind === 'creature') {
      const slot = bestSlotFor(game, side, foe, card.element);
      if (slot < 0) break;
      played = playCreature(game, side, bestHand, slot);
    } else {
      played = playSpell(game, side, bestHand);
    }
    if (!played) break;
  }
}
