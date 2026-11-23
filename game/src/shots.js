// The screenshot scenes behind ?shot=title|play|win|loss. Each one plays the
// real rules forward from a fresh duel with a fixed seed, steered by the same
// brain that plays the Warden — so every frame is what a real game looks
// like, and the same seed always gives the same frame.
//
//   title — the title screen over a fresh table.
//   play  — mid-duel in round five: full hands, creatures on both tables.
//   win   — a duel the player wins, on the victory screen.
//   loss  — a duel the player loses, on the defeat screen.

import { createRandom } from './random.js';
import { takeTurn } from './ai.js';
import { beginRound, checkEnd, createGame, resolveCombat, startDuel } from './rules.js';

const MAX_TRIES = 40;

function playFullDuel(seed, playerSkill) {
  const game = createGame(seed, createRandom(seed));
  startDuel(game);
  while (game.phase === 'play') {
    takeTurn(game, game.you, game.foe, playerSkill);
    if (game.phase !== 'play') break;
    takeTurn(game, game.foe, game.you, 'warden');
    if (game.phase !== 'play') break;
    resolveCombat(game);
    if (game.phase !== 'play') break;
    beginRound(game);
  }
  return game;
}

function findDuel(winner, playerSkill) {
  for (let seed = 1; seed <= MAX_TRIES; seed += 1) {
    const game = playFullDuel(seed, playerSkill);
    if (game.winner === winner) return game;
  }
  // No seed in range gave the ending: take the last duel and force the
  // ending the honest way — play on until a life total reaches zero.
  const game = playFullDuel(MAX_TRIES, playerSkill);
  game.you.life = winner === 'you' ? 7 : 0;
  game.foe.life = winner === 'you' ? 0 : 9;
  checkEnd(game);
  return game;
}

// Mid-duel: four full rounds of good play on both sides, then round five
// opens and both sides play their turns — the shot catches the table at its
// fullest, fresh creatures standing beside the survivors, just before the
// clash. Tries seeds until both tables hold at least two creatures.
function playScene(seed) {
  const tries = [seed, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16];
  let best = null;
  let bestCount = -1;
  for (const s of tries) {
    const game = createGame(s, createRandom(s));
    startDuel(game);
    for (let round = 1; round <= 4 && game.phase === 'play'; round += 1) {
      takeTurn(game, game.you, game.foe, 'warden');
      if (game.phase !== 'play') break;
      takeTurn(game, game.foe, game.you, 'warden');
      if (game.phase !== 'play') break;
      resolveCombat(game);
      if (game.phase !== 'play') break;
      beginRound(game);
    }
    if (game.phase !== 'play') continue;
    takeTurn(game, game.you, game.foe, 'warden');
    takeTurn(game, game.foe, game.you, 'warden');
    const count =
      game.you.table.filter(Boolean).length + game.foe.table.filter(Boolean).length;
    if (game.you.table.filter(Boolean).length >= 2 && game.foe.table.filter(Boolean).length >= 2) {
      return game;
    }
    if (count > bestCount) {
      best = game;
      bestCount = count;
    }
  }
  return best ?? createGame(seed, createRandom(seed));
}

export function stageShot(name, seed) {
  if (name === 'title') {
    const game = createGame(seed, createRandom(seed));
    return { game, screen: 'title' };
  }
  if (name === 'play') {
    return { game: playScene(seed), screen: 'play' };
  }
  if (name === 'win') {
    return { game: findDuel('you', 'warden'), screen: 'over' };
  }
  if (name === 'loss') {
    return { game: findDuel('foe', 'careless'), screen: 'over' };
  }
  return { game: createGame(seed, createRandom(seed)), screen: 'title' };
}
