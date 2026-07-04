# Pomoleen — Pomodoro Timer

A beautiful, minimal Pomodoro technique timer with task management, sound notifications, and customizable durations.

![Pomoleen Screenshot](screenshot.png)

## Features

### 🍅 Pomodoro Timer
- **Pomodoro** (Focus) — 25 minutes
- **Short Break** — 5 minutes
- **Long Break** — 15 minutes

Auto-progression: After 4 pomodoros, automatically switches to long break

### 🎨 Beautiful UI
- Animated circular progress ring
- Dark/Light theme toggle with smooth transitions
- Fully responsive design (mobile, tablet, desktop)
- Color-coded modes (red, blue, green)

### 🔊 Sound Notifications
Web Audio API generates pleasant sounds for:
- Timer start (gentle chime)
- Button clicks
- Timer completion (musical chord — different melody for focus vs breaks)

### 📝 Task Notebook
- Slide-out task panel
- Add, complete, and delete tasks
- Persists to localStorage

### ⌨️ Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Space` | Start / Pause |
| `R` | Reset |
| `S` | Skip |
| `1` | Pomodoro mode |
| `2` | Short break mode |
| `3` | Long break mode |

### ⚙️ Customizable
- Adjustable durations (1-180 minutes)
- All settings saved automatically to localStorage

## Quick Start

No installation required. Just open `index.html` in any modern browser.

```bash
# Clone the repository
git clone https://github.com/leenvc/pomodoro-by-leen.git

# Open in browser
open index.html
```

Or use a local server:

```bash
python -m http.server 8000
# Then visit http://localhost:8000
```

## Tech Stack

- **HTML5** — Semantic markup
- **CSS3** — Variables, animations, responsive design
- **JavaScript** — ES6+, Web Audio API
- **localStorage** — Persistence

Zero dependencies. No build step required.

## Project Structure

```
├── index.html   # Main HTML structure
├── style.css    # All styles (themes, notebook, responsive)
├── script.js    # Timer logic, audio, state management
└── README.md    # This file
```

## License

MIT — made with ❤️ by [leen](https://github.com/leenvc)
