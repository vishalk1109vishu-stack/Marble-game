# 🔮 Marble Hunt — The Ultimate Challenge

A fast-paced browser-based shell game where you track a marble hidden under shuffling 3D gift boxes. Built with pure HTML, CSS, and vanilla JavaScript — no libraries, no frameworks, just code.

---

## 🎮 How to Play

1. Open `marble-hunt.html` in any browser (Chrome, Safari, Firefox — works on mobile too)
2. Press **Start Game**
3. Watch which box the marble is placed under
4. The boxes shuffle — keep your eyes locked on it
5. After shuffling stops, **tap the box** you think hides the marble
6. Beat all 4 levels to see your final score!

---

## 📋 Game Rules

### 4 Levels — Each Harder Than the Last

| Level | Boxes | Shuffle Speed | Shuffles | Attempts | Timer |
|-------|-------|--------------|----------|----------|-------|
| 1     | 3     | Slow         | 5        | 1        | 10s   |
| 2     | 3     | Medium       | 8        | 1        | 8s    |
| 3     | 4     | Fast         | 12       | 1        | 6s    |
| 4     | 5     | Blazing Fast | 20       | 3        | 5s    |

### Important Rules
- Even if you fail a level, you still move to the next one
- Your result (correct/wrong) is recorded for the final scoreboard
- The scoreboard only appears **after Level 4 is done**
- Level 4 has a **secret trap** — figure it out yourself 😈

### Score Messages
| Score | Message |
|-------|---------|
| 4/4   | Unbelievable! Are you even human? 🤯 |
| 3/4   | Well done, practice more 🌟 |
| 2/4   | This game is not for you 😅 |
| 1/4 or 0/4 | Go play Ludo instead 💀 |

---

## ✨ Features

- **Real 3D gift boxes** — six-face CSS 3D transform construction with ribbon, bow, lid that opens on a hinge
- **Fast shuffle animation** — boxes arc over each other like a real shell game
- **Timer bar** — turns yellow then red as time runs out
- **Confetti** — rains down on correct answers
- **Roast messages** — the game talks trash when you lose
- **Responsive** — works on phones as small as 360px width
- **No internet needed** — single HTML file, works fully offline (except Google Fonts)

---

## 🗂️ File Structure

```
marble-hunt.html    ← The entire game (HTML + CSS + JS in one file)
README.md           ← This file
```

That's it. One file. Open it and play.

---

## 🛠️ Tech Stack

- **HTML5** — structure
- **CSS3** — 3D transforms, animations, glassmorphism, gradients
- **Vanilla JavaScript** — all game logic, Web Animations API for shuffle
- **Google Fonts** — Outfit typeface
- No canvas, no WebGL, no npm, no build step

---

## 🔌 Backend Integration (Future)

The frontend is ready to connect to a backend API. When ready, replace the JS game logic with calls to:

```
POST /api/game/start
POST /api/game/:id/shuffle
POST /api/game/:id/guess
GET  /api/game/:id/state
POST /api/game/:id/next-level
GET  /api/game/:id/final-score
```

---

## 👨‍💻 About the Developer

**Vishal Kumar** — goes by **Vishu**

A student, beginner developer, learner, and thinker on a mission to become rich one day. Currently building things, breaking things, and learning from both.

- 📸 Instagram: [@Vishalk_vishu](https://instagram.com/Vishalk_vishu)

> *"Working hard today to become rich tomorrow."*

---

## 📄 License

Personal project by Vishal Kumar. Free to use, learn from, and improve.


