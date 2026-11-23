// A deck: two copies of every card in the catalogue, shuffled with the
// game's seeded stream. When a deck runs out, its discard pile is shuffled
// back in, so a duel never stalls for want of cards.
import { CARDS } from './cards.js';
import { shuffle } from './random.js';

export function buildDeck(random) {
  const ids = [];
  for (const card of CARDS) {
    ids.push(card.id, card.id);
  }
  return shuffle(ids, random);
}

export function drawCards(side, count, random) {
  for (let i = 0; i < count; i += 1) {
    if (side.deck.length === 0) {
      if (side.discard.length === 0) return;
      side.deck = shuffle(side.discard.splice(0), random);
    }
    side.hand.push(side.deck.pop());
  }
}

// A side draws back up to a full hand of five at the start of its round.
export function drawToFullHand(side, random) {
  const missing = 5 - side.hand.length;
  if (missing > 0) drawCards(side, missing, random);
}
