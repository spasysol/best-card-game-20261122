// The rules of Cinderfall: a duel between you and the Ash Warden, each with
// 20 life and a table of four slots. A round is: draw to five, gain energy,
// play cards, then creatures clash slot by slot. The duel ends the moment a
// life total reaches zero.
//
// Decisions that matter: which slot a creature takes (it fights whatever
// stands opposite), which element it is (advantage deals +2), whether to
// spend energy now or save it, and when two creatures share an element —
// resonance gives each of them +1 power.

import { CARD_BY_ID, beats } from './cards.js';
import { buildDeck, drawCards, drawToFullHand } from './deck.js';

export const START_LIFE = 20;
export const HAND_SIZE = 5;
export const TABLE_SLOTS = 4;
export const MAX_ROUNDS = 25;

export function energyForRound(round) {
  return Math.min(2 + round, 6);
}

export function createSide(random) {
  return {
    life: START_LIFE,
    energy: 0,
    deck: buildDeck(random),
    hand: [],
    table: [null, null, null, null],
    discard: [],
  };
}

export function createGame(seed, random) {
  const game = {
    seed,
    random,
    round: 0,
    phase: 'title', // title | play | over
    winner: null, // 'you' | 'foe' | null
    you: createSide(random),
    foe: createSide(random),
    log: [],
    foeIntent: null,
    roundsPlayed: 0,
  };
  return game;
}

export function startDuel(game) {
  game.phase = 'play';
  game.round = 0;
  game.log = ['The duel begins. The Warden watches your first move.'];
  beginRound(game);
}

// Draw, energy and a fresh intent for the Warden, then the player's turn.
export function beginRound(game) {
  game.round += 1;
  game.roundsPlayed += 1;
  const energy = energyForRound(game.round);
  game.you.energy = energy;
  game.foe.energy = energy;
  drawToFullHand(game.you, game.random);
  drawToFullHand(game.foe, game.random);
  game.foeIntent = pickIntent(game);
  game.log.push(`Round ${game.round}: ${energy} energy. The Warden gathers ${game.foeIntent}.`);
}

function pickIntent(game) {
  if (game.foe.life <= 8) return 'stone';
  const counts = {};
  for (const id of game.foe.hand) {
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

// Resonance: creatures sharing an element on one side each gain +1 power.
export function resonanceBonus(side, index) {
  const creature = side.table[index];
  if (!creature) return 0;
  let same = 0;
  for (const other of side.table) {
    if (other && other.element === creature.element) same += 1;
  }
  return same >= 2 ? 1 : 0;
}

export function creaturePower(game, side, index) {
  const creature = side.table[index];
  if (!creature) return 0;
  return creature.power + resonanceBonus(side, index);
}

// A live creature on the table: { id, element, power, toughness, maxToughness }.
export function playCreature(game, side, handIndex, slot) {
  const id = side.hand[handIndex];
  const card = CARD_BY_ID[id];
  if (!card || card.kind !== 'creature') return false;
  if (side.energy < card.cost) return false;
  if (slot < 0 || slot >= TABLE_SLOTS || side.table[slot]) return false;
  side.energy -= card.cost;
  side.hand.splice(handIndex, 1);
  side.table[slot] = {
    id,
    element: card.element,
    power: card.power,
    toughness: card.toughness,
    maxToughness: card.toughness,
  };
  return true;
}

export function playSpell(game, side, handIndex) {
  const id = side.hand[handIndex];
  const card = CARD_BY_ID[id];
  if (!card || card.kind !== 'spell') return false;
  if (side.energy < card.cost) return false;
  const foe = side === game.you ? game.foe : game.you;
  side.energy -= card.cost;
  side.hand.splice(handIndex, 1);
  side.discard.push(id);
  resolveSpell(game, side, foe, id);
  checkEnd(game);
  return true;
}

function damageCreature(game, side, slot, amount) {
  const creature = side.table[slot];
  if (!creature) return;
  creature.toughness -= amount;
  if (creature.toughness <= 0) {
    side.discard.push(creature.id);
    side.table[slot] = null;
  }
}

function strongestEnemySlot(foe) {
  let best = -1;
  let bestPower = -1;
  for (let i = 0; i < TABLE_SLOTS; i += 1) {
    const c = foe.table[i];
    if (c && c.power > bestPower) {
      best = i;
      bestPower = c.power;
    }
  }
  return best;
}

function resolveSpell(game, side, foe, id) {
  const who = side === game.you ? 'You' : 'The Warden';
  if (id === 'ember-bolt') {
    const slot = strongestEnemySlot(foe);
    if (slot >= 0) {
      const target = foe.table[slot];
      game.log.push(`${who} hurl an Ember Bolt at ${CARD_BY_ID[target.id].name} for 3 damage.`);
      damageCreature(game, foe, slot, 3);
    } else {
      foe.life -= 2;
      game.log.push(`${who} hurl an Ember Bolt at the enemy for 2 damage.`);
    }
  } else if (id === 'mend-banks') {
    side.life = Math.min(START_LIFE, side.life + 4);
    game.log.push(`${who} mend the banks and recover 4 life.`);
  } else if (id === 'catch-draft') {
    drawCards(side, 2, game.random);
    game.log.push(`${who} catch the draft and draw 2 cards.`);
  } else if (id === 'quake') {
    game.log.push(`${who} shake the table: every enemy creature takes 1 damage.`);
    for (let i = 0; i < TABLE_SLOTS; i += 1) {
      if (foe.table[i]) damageCreature(game, foe, i, 1);
    }
  }
}

// The clash at the end of a round: every slot fights at once. Advantage deals
// +2; damage past a creature's toughness spills onto its owner's life; an
// unopposed creature strikes life directly for its full power.
export function resolveCombat(game) {
  const lines = [];
  for (let slot = 0; slot < TABLE_SLOTS; slot += 1) {
    const yours = game.you.table[slot];
    const theirs = game.foe.table[slot];
    const yourPower = creaturePower(game, game.you, slot);
    const foePower = creaturePower(game, game.foe, slot);
    if (yours && theirs) {
      const yourDamage = yourPower + (beats(yours.element, theirs.element) ? 2 : 0);
      const foeDamage = foePower + (beats(theirs.element, yours.element) ? 2 : 0);
      const yourTough = yours.toughness;
      const foeTough = theirs.toughness;
      lines.push(
        `Slot ${slot + 1}: ${CARD_BY_ID[yours.id].name} (${yourDamage}) meets ${CARD_BY_ID[theirs.id].name} (${foeDamage}).`,
      );
      if (yourDamage > foeTough) {
        const spill = yourDamage - foeTough;
        game.foe.life -= spill;
        lines.push(`  ${spill} damage spills onto the Warden.`);
      }
      if (foeDamage > yourTough) {
        const spill = foeDamage - yourTough;
        game.you.life -= spill;
        lines.push(`  ${spill} damage spills onto you.`);
      }
      if (yours.toughness - foeDamage <= 0) {
        game.you.discard.push(yours.id);
        game.you.table[slot] = null;
      } else {
        yours.toughness -= foeDamage;
      }
      if (theirs.toughness - yourDamage <= 0) {
        game.foe.discard.push(theirs.id);
        game.foe.table[slot] = null;
      } else {
        theirs.toughness -= yourDamage;
      }
    } else if (yours) {
      game.foe.life -= yourPower;
      lines.push(`Slot ${slot + 1}: ${CARD_BY_ID[yours.id].name} strikes the Warden directly for ${yourPower}.`);
    } else if (theirs) {
      game.you.life -= foePower;
      lines.push(`Slot ${slot + 1}: ${CARD_BY_ID[theirs.id].name} strikes you directly for ${foePower}.`);
    }
  }
  game.log.push(...lines);
  game.log.push(`Life — You ${Math.max(0, game.you.life)} · Warden ${Math.max(0, game.foe.life)}.`);
  checkEnd(game);
}

export function checkEnd(game) {
  if (game.phase === 'over') return;
  if (game.foe.life <= 0 && game.you.life <= 0) {
    game.winner = game.you.life >= game.foe.life ? 'you' : 'foe';
  } else if (game.foe.life <= 0) {
    game.winner = 'you';
  } else if (game.you.life <= 0) {
    game.winner = 'foe';
  }
  if (game.winner) {
    game.phase = 'over';
    game.log.push(
      game.winner === 'you'
        ? 'The Warden falls. The last flame is yours.'
        : 'Your flame gutters out. The Warden endures.',
    );
  } else if (game.round >= MAX_ROUNDS) {
    game.winner = game.you.life >= game.foe.life ? 'you' : 'foe';
    game.phase = 'over';
    game.log.push('The twenty-fifth round ends the duel: the higher life takes the crown.');
  }
}
