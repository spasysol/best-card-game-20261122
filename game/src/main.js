// Boot and input: the game moves between three screens — title, play and
// over. Click a card to select it, click a slot to play it there, click a
// spell to cast it; keys 1–5 select hand cards, Enter ends the turn, Escape
// deselects. After you end your turn the Warden plays, the slots clash, and
// the next round opens.
//
// ?seed=N fixes the shuffle. ?shot=title|play|win|loss (with &seed=N) stages
// that scene instead of running the loop, paints it twice and sets
// window.__shotReady for a screenshot.
import { CARD_BY_ID } from './cards.js';
import { createRandom } from './random.js';
import { takeTurn } from './ai.js';
import { createRenderer, SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './render.js';
import { beginRound, createGame, playCreature, playSpell, resolveCombat, startDuel } from './rules.js';
import { stageShot } from './shots.js';

const BEST_KEY = 'cinderfall-best-v1';

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const app = document.getElementById('app');
const renderer = createRenderer(app);

function readBest() {
  try {
    const raw = window.localStorage.getItem(BEST_KEY);
    if (!raw) return { wins: 0, losses: 0, bestLife: 0 };
    const parsed = JSON.parse(raw);
    return { wins: parsed.wins | 0, losses: parsed.losses | 0, bestLife: parsed.bestLife | 0 };
  } catch {
    return { wins: 0, losses: 0, bestLife: 0 };
  }
}

function saveBest(best) {
  try {
    window.localStorage.setItem(BEST_KEY, JSON.stringify(best));
  } catch {
    // Storage can be off (private windows): the record then lasts this visit only.
  }
}

function sleep(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

if (shot) {
  const staged = stageShot(shot, seed);
  const best = readBest();
  let painted = 0;
  const ui = { selected: null, best, justDrew: true };
  const paint = () => {
    renderer.draw(staged.game, staged.screen, ui);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  };
  requestAnimationFrame(paint);
} else {
  runInteractive();
}

function runInteractive() {
  let game = createGame(seed, createRandom(seed));
  let screen = SCREEN_TITLE;
  let selected = null;
  let busy = false;
  const best = readBest();
  const ui = { selected: null, best, justDrew: false };

  function paint() {
    ui.selected = selected;
    ui.best = best;
    renderer.draw(game, screen, ui);
    ui.justDrew = false;
  }

  function recordResult() {
    if (game.winner === 'you') {
      best.wins += 1;
      best.bestLife = Math.max(best.bestLife, game.you.life);
    } else if (game.winner === 'foe') {
      best.losses += 1;
    }
    saveBest(best);
  }

  async function endPlayerTurn() {
    if (busy || screen !== SCREEN_PLAY || game.phase !== 'play') return;
    busy = true;
    selected = null;
    takeTurn(game, game.foe, game.you, 'warden');
    paint();
    await sleep(650);
    if (game.phase === 'play') {
      resolveCombat(game);
      paint();
      await sleep(650);
    }
    if (game.phase === 'over') {
      recordResult();
      screen = SCREEN_OVER;
    } else {
      beginRound(game);
      ui.justDrew = true;
    }
    paint();
    busy = false;
  }

  function playSelected(slot) {
    if (busy || screen !== SCREEN_PLAY || game.phase !== 'play' || selected === null) return;
    if (playCreature(game, game.you, selected, slot)) {
      selected = null;
      paint();
    }
  }

  function clickHand(index) {
    if (busy || screen !== SCREEN_PLAY || game.phase !== 'play') return;
    const cardId = game.you.hand[index];
    if (!cardId) return;
    if (selected === index) {
      selected = null;
      paint();
      return;
    }
    selected = index;
    // Spells cast at once; creatures wait for a slot.
    if (CARD_BY_ID[cardId].kind === 'spell') {
      if (playSpell(game, game.you, index)) {
        selected = null;
        if (game.phase === 'over') {
          recordResult();
          screen = SCREEN_OVER;
        }
      } else {
        selected = null;
      }
      paint();
      return;
    }
    paint();
  }

  app.addEventListener('click', (event) => {
    const target = event.target.closest('[data-action]');
    if (!target) return;
    const action = target.dataset.action;
    if (action === 'play') {
      startDuel(game);
      screen = SCREEN_PLAY;
      ui.justDrew = true;
      paint();
    } else if (action === 'again') {
      const freshSeed = Math.floor(Math.random() * 4294967296);
      game = createGame(freshSeed, createRandom(freshSeed));
      selected = null;
      startDuel(game);
      screen = SCREEN_PLAY;
      ui.justDrew = true;
      paint();
    } else if (action === 'select') {
      clickHand(Number.parseInt(target.dataset.hand ?? '-1', 10));
    } else if (action === 'slot') {
      playSelected(Number.parseInt(target.dataset.slot ?? '-1', 10));
    } else if (action === 'end') {
      endPlayerTurn();
    }
  });

  document.addEventListener('keydown', (event) => {
    if (screen !== SCREEN_PLAY) return;
    if (event.key >= '1' && event.key <= '5') {
      clickHand(Number.parseInt(event.key, 10) - 1);
    } else if (event.key === 'Enter') {
      endPlayerTurn();
    } else if (event.key === 'Escape') {
      selected = null;
      paint();
    }
  });

  paint();
}
