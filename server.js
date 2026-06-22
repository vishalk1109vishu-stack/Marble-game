// ═══════════════════════════════════════════════════════════
//  MARBLE HUNT — BACKEND SERVER
//  Author : Vishal Kumar (Vishu)
//  GitHub : server.js
//  Fixed  : Shuffle tracking, game cleanup, CORS, attemptsLeft,
//           score messages, input sanitisation
// ═══════════════════════════════════════════════════════════

const express    = require('express');
const cors       = require('cors');
const crypto     = require('crypto');
const rateLimit  = require('express-rate-limit');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ───────────────────────────────────────────────
app.use(express.json());

// CORS — add your frontend URL in ALLOWED_ORIGINS when you deploy
const ALLOWED_ORIGINS = [
  'http://localhost:5500',      // VS Code Live Server
  'http://127.0.0.1:5500',
  'http://localhost:3000',
  // 'https://your-deployed-frontend.com'  ← uncomment & fill when live
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, Postman)
    if (!origin) return callback(null, true);
    if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
    callback(new Error(`CORS blocked: origin ${origin} not allowed`));
  },
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type']
}));

// Rate limiting — 100 requests per 15 minutes per IP
const apiLimiter = rateLimit({
  windowMs : 15 * 60 * 1000,
  max      : 100,
  message  : { success: false, data: null, error: 'Too many requests, slow down!' }
});
app.use('/api/', apiLimiter);

// ── In-memory game store ─────────────────────────────────────
// For production swap this with Redis or MongoDB
const games = new Map();

// Cleanup: delete games inactive for more than 1 hour — runs every 30 mins
setInterval(() => {
  const ONE_HOUR = 60 * 60 * 1000;
  const now = Date.now();
  let cleaned = 0;
  for (const [id, game] of games.entries()) {
    if (now - game.lastActivity > ONE_HOUR) {
      games.delete(id);
      cleaned++;
    }
  }
  if (cleaned > 0) console.log(`[Cleanup] Removed ${cleaned} expired game(s)`);
}, 30 * 60 * 1000);

// ── Level Config ─────────────────────────────────────────────
const LEVEL_CONFIG = {
  1: { level:1, boxCount:3, shuffleSpeed:550,  shuffleCount:5,  maxAttempts:1, trapEnabled:false },
  2: { level:2, boxCount:3, shuffleSpeed:320,  shuffleCount:8,  maxAttempts:1, trapEnabled:false },
  3: { level:3, boxCount:4, shuffleSpeed:200,  shuffleCount:12, maxAttempts:1, trapEnabled:false },
  4: { level:4, boxCount:5, shuffleSpeed:130,  shuffleCount:20, maxAttempts:3, trapEnabled:true  },
};

// ── Helpers ──────────────────────────────────────────────────
const ok  = (res, data, status = 200) => res.status(status).json({ success: true,  data, error: null });
const err = (res, msg, status = 400)  => res.status(status).json({ success: false, data: null, error: msg });

const randInt = (max) => Math.floor(Math.random() * max);

const getScoreMessage = (score) => {
  if (score === 4) return "Unbelievable! Are you even human? 🤯";
  if (score === 3) return "Well done, practice more 🌟";
  if (score === 2) return "This game is not for you 😅";
  return "Go play Ludo instead 💀";   // 1 or 0
};

// ── FIX #1: Proper marble tracking through shuffle steps ─────
// The old code randomised marble position inside the loop which
// meant the swap steps sent to the frontend had NO relation to
// where the marble actually ended up.  This version tracks the
// marble through every swap so frontend animation matches reality.
const generateShuffle = (boxCount, shuffleCount, marbleStart) => {
  let marblePos = marbleStart;
  const steps   = [];

  for (let i = 0; i < shuffleCount; i++) {
    let a = randInt(boxCount);
    let b;
    do { b = randInt(boxCount); } while (b === a);

    // Track marble: if it's in one of the swapped slots, move it
    if      (marblePos === a) marblePos = b;
    else if (marblePos === b) marblePos = a;

    steps.push({ step: i + 1, swap: [a, b] });
  }

  return { steps, finalMarblePosition: marblePos };
};

// ── Game factory ─────────────────────────────────────────────
const createGame = (gameId) => ({
  gameId,
  createdAt      : Date.now(),
  lastActivity   : Date.now(),
  currentLevel   : 1,
  scores         : [null, null, null, null],  // null=pending, true=won, false=lost
  attemptsUsed   : 0,                          // only used for Level 4
  marblePosition : randInt(LEVEL_CONFIG[1].boxCount),
  status         : 'active',    // active | completed
  shuffleDone    : false,       // must call /shuffle before /guess
  levelLocked    : false,       // prevents double-guessing
});

// ════════════════════════════════════════════════════════════
//  ROUTES
// ════════════════════════════════════════════════════════════

// ── Health check ─────────────────────────────────────────────
app.get('/', (_req, res) => res.json({ message: 'Marble Hunt API is running 🎮' }));

// ── 1. POST /api/game/start ───────────────────────────────────
app.post('/api/game/start', (_req, res) => {
  const gameId = crypto.randomUUID();
  const cfg    = LEVEL_CONFIG[1];
  const game   = createGame(gameId);

  games.set(gameId, game);

  return ok(res, {
    gameId,
    level    : 1,
    boxes    : cfg.boxCount,
    attempts : cfg.maxAttempts,
    status   : 'ready'
  }, 201);
});

// ── 2. POST /api/game/:gameId/shuffle ────────────────────────
app.post('/api/game/:gameId/shuffle', (req, res) => {
  const { gameId } = req.params;
  const game = games.get(gameId);

  if (!game)                        return err(res, 'Game not found', 404);
  if (game.status === 'completed')  return err(res, 'Game already completed');
  if (game.levelLocked)             return err(res, 'Level already done, call next-level first');

  const cfg = LEVEL_CONFIG[game.currentLevel];

  // ── FIX #1 applied here ──────────────────────────────────
  const { steps, finalMarblePosition } = generateShuffle(
    cfg.boxCount,
    cfg.shuffleCount,
    game.marblePosition
  );

  // Save where the marble actually ended up
  game.marblePosition = finalMarblePosition;
  game.shuffleDone    = true;
  game.lastActivity   = Date.now();
  games.set(gameId, game);

  return ok(res, {
    shuffleSteps  : steps,
    shuffleSpeed  : cfg.shuffleSpeed,
    // finalMarblePosition intentionally NOT sent to client (anti-cheat)
  });
});

// ── 3. POST /api/game/:gameId/guess ──────────────────────────
app.post('/api/game/:gameId/guess', (req, res) => {
  const { gameId }  = req.params;
  const { boxIndex } = req.body;
  const game = games.get(gameId);

  if (!game)                        return err(res, 'Game not found', 404);
  if (game.status === 'completed')  return err(res, 'Game already completed');
  if (!game.shuffleDone)            return err(res, 'Call /shuffle before /guess');
  if (game.levelLocked)             return err(res, 'Level locked. Call next-level');

  const cfg = LEVEL_CONFIG[game.currentLevel];

  // Input validation
  if (
    boxIndex === undefined ||
    boxIndex === null ||
    typeof boxIndex !== 'number' ||
    !Number.isInteger(boxIndex) ||
    boxIndex < 0 ||
    boxIndex >= cfg.boxCount
  ) {
    return err(res, `boxIndex must be an integer between 0 and ${cfg.boxCount - 1}`);
  }

  let isCorrect     = (boxIndex === game.marblePosition);
  let trapTriggered = false;
  let gameOver      = false;
  let nextLevel     = null;
  let message       = '';
  let revealPosition = game.marblePosition; // sent to frontend so it can show where marble was

  // ── Level 4 TRAP ─────────────────────────────────────────
  if (cfg.trapEnabled && isCorrect) {
    // Move marble to a DIFFERENT random box — player can never win
    let newPos;
    do { newPos = randInt(cfg.boxCount); } while (newPos === game.marblePosition);
    game.marblePosition = newPos;
    revealPosition      = newPos;

    isCorrect     = false;
    trapTriggered = true;
    game.attemptsUsed++;
    message = "Trap triggered! The marble vanished! 😈";

  } else if (!isCorrect) {
    message = 'Wrong box!';
    if (game.currentLevel === 4) game.attemptsUsed++;

  } else {
    // Correct guess — Levels 1-3 only reach here
    message = 'Correct! Level cleared! 🎉';
  }

  // ── FIX #2: Clean attemptsLeft calculation ───────────────
  let attemptsLeft;
  if (game.currentLevel === 4) {
    attemptsLeft = cfg.maxAttempts - game.attemptsUsed;
  } else {
    attemptsLeft = isCorrect ? 0 : 0;  // levels 1-3 have 1 attempt, it's done either way
  }

  // ── Level / game completion logic ─────────────────────────
  if (game.currentLevel < 4) {
    // Levels 1-3: one guess ends the level regardless of result
    game.scores[game.currentLevel - 1] = isCorrect;
    game.levelLocked = true;
    game.shuffleDone = false;
    nextLevel = game.currentLevel + 1;

  } else {
    // Level 4: keep going until attempts exhausted
    if (game.attemptsUsed >= cfg.maxAttempts) {
      game.scores[3] = false;  // Level 4 is always false (impossible trap)
      game.levelLocked = true;
      game.shuffleDone = false;
      game.status  = 'completed';
      gameOver     = true;
      nextLevel    = null;
      message      = 'Out of attempts! Game over.';
    } else {
      // Still has attempts — reset shuffle so they must shuffle again
      game.shuffleDone = false;
      nextLevel = 4;
    }
  }

  game.lastActivity = Date.now();
  games.set(gameId, game);

  return ok(res, {
    correct        : isCorrect,
    trapTriggered,
    revealPosition,  // where marble actually was / moved to
    attemptsLeft   : Math.max(0, attemptsLeft),
    gameOver,
    nextLevel,
    message
  });
});

// ── 4. GET /api/game/:gameId/state ───────────────────────────
app.get('/api/game/:gameId/state', (req, res) => {
  const { gameId } = req.params;
  const game = games.get(gameId);

  if (!game) return err(res, 'Game not found', 404);

  const cfg        = LEVEL_CONFIG[game.currentLevel];
  const totalScore = game.scores.filter(s => s === true).length;

  return ok(res, {
    currentLevel : game.currentLevel,
    scores       : game.scores,
    attemptsLeft : game.currentLevel === 4
                     ? cfg.maxAttempts - game.attemptsUsed
                     : cfg.maxAttempts,
    totalScore,
    status       : game.status
  });
});

// ── 5. POST /api/game/:gameId/next-level ─────────────────────
app.post('/api/game/:gameId/next-level', (req, res) => {
  const { gameId } = req.params;
  const game = games.get(gameId);

  if (!game)                        return err(res, 'Game not found', 404);
  if (game.status === 'completed')  return err(res, 'Game already completed');
  if (!game.levelLocked)            return err(res, 'Must attempt current level first');
  if (game.currentLevel >= 4)       return err(res, 'Already on final level');

  // Advance
  game.currentLevel += 1;

  const cfg = LEVEL_CONFIG[game.currentLevel];

  game.marblePosition = randInt(cfg.boxCount);
  game.shuffleDone    = false;
  game.levelLocked    = false;
  game.attemptsUsed   = game.currentLevel === 4 ? 0 : game.attemptsUsed;
  game.lastActivity   = Date.now();
  games.set(gameId, game);

  return ok(res, {
    level        : cfg.level,
    boxes        : cfg.boxCount,
    attempts     : cfg.maxAttempts,
    shuffleSpeed : cfg.shuffleSpeed,
    shuffleCount : cfg.shuffleCount
  });
});

// ── 6. GET /api/game/:gameId/final-score ─────────────────────
app.get('/api/game/:gameId/final-score', (req, res) => {
  const { gameId } = req.params;
  const game = games.get(gameId);

  if (!game)                        return err(res, 'Game not found', 404);
  if (game.status !== 'completed')  return err(res, 'Game not yet completed');

  const totalScore = game.scores.filter(s => s === true).length;

  return ok(res, {
    totalScore,
    maxScore     : 4,
    message      : getScoreMessage(totalScore),
    levelResults : game.scores   // [true, false, true, false] etc.
  });
});

// ── 404 catch-all ────────────────────────────────────────────
app.use((_req, res) => err(res, 'Route not found', 404));

// ── Start ────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🎮 Marble Hunt API running → http://localhost:${PORT}`);
  console.log(`   Endpoints:`);
  console.log(`   POST /api/game/start`);
  console.log(`   POST /api/game/:id/shuffle`);
  console.log(`   POST /api/game/:id/guess`);
  console.log(`   GET  /api/game/:id/state`);
  console.log(`   POST /api/game/:id/next-level`);
  console.log(`   GET  /api/game/:id/final-score`);
});
      
