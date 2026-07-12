# DnD Fight Tracker

A lightweight, browser-based initiative tracker for Dungeon Masters.  
Track initiative order, HP, AC, and status effects for all combatants — no installation required.

## Usage

1. Open `index.html` in your browser, or visit the [GitHub Pages](https://fritizee.github.io/dnd_fight_tracker/) site
2. On the **setup page**, add combatants with their stats and optional attacks
3. Click **Begin Battle** to open the **battle page**
4. Track turns, HP, and dice rolls during combat
5. Click **End Battle** to return to setup

> `main.html` redirects to `index.html` for backward compatibility.

## Pages

| Page | File | Purpose |
|------|------|---------|
| Setup | `index.html` | Add combatants, configure attacks |
| Battle | `battle.html` | Initiative order, HP tracking, combat log |

The two pages share battle state via `sessionStorage`, so refreshing the battle page keeps your progress.

## License

[MIT](https://choosealicense.com/licenses/mit/) — Fritizee
