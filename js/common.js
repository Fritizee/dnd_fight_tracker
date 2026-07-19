// Shared utilities and character helpers

const STORAGE_KEY = 'dnd_fight_tracker_battle';

function makeChar(name, maxHp, initiative, initiativeModifier, ac, attacks, swarmMeta) {
  const char = { name, maxHp, initiative, initiativeModifier, ac, hp: maxHp, timeHp: 0, alive: true, attacks: attacks || [] };
  if (swarmMeta) {
    char.swarmId = swarmMeta.swarmId;
    char.baseName = swarmMeta.baseName;
    char.copyIndex = swarmMeta.copyIndex;
    char.swarmCount = swarmMeta.swarmCount;
  }
  return char;
}

function cloneAttacks(attacks) {
  return (attacks || []).map(a => ({ name: a.name, numDice: a.numDice, diceType: a.diceType, bonus: a.bonus }));
}

function effectiveHp(c) {
  return Math.max(0, c.hp) + Math.max(0, c.timeHp);
}

function hpColor(c) {
  const pct = c.hp / c.maxHp;
  if (c.hp <= 0) return '#555570';
  if (pct <= 0.25) return '#e74c3c';
  if (pct <= 0.5) return '#f39c12';
  return '#27ae60';
}

function hpClass(c) {
  if (c.hp <= 0) return 'dead';
  const pct = c.hp / c.maxHp;
  if (pct <= 0.25) return 'low';
  if (pct <= 0.5) return 'mid';
  return 'full';
}

function sortByInitiative(unsorted) {
  const indexed = unsorted.map((c, i) => ({ c, i }));
  indexed.sort((a, b) => {
    if (a.c.initiative === 20 && b.c.initiative !== 20) return -1;
    if (b.c.initiative === 20 && a.c.initiative !== 20) return 1;
    if (a.c.initiative === 20 && b.c.initiative === 20) return a.i - b.i;
    return b.c.initiative - a.c.initiative;
  });
  return indexed.map(x => x.c);
}

function escHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

let toastTimer;
function showToast(msg, type = '') {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.className = 'toast show' + (type ? ` ${type}` : '');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.classList.remove('show'); }, 2800);
}

// Battle state persisted in sessionStorage for page communication
const FightState = {
  save(state) {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  },

  load() {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  clear() {
    sessionStorage.removeItem(STORAGE_KEY);
  },

  startBattle(characters) {
    const state = {
      characters,
      selectedIdx: 0,
      currentTurnIdx: 0,
      round: 1,
      log: [
        '⚔ Battle begins! Round <span class="log-round">1</span>',
        `🎲 <span class="log-name">${escHtml(characters[0].name)}</span>'s turn`
      ]
    };
    this.save(state);
    window.location.href = 'battle.html';
  },

  goToSetup(ended = false) {
    this.clear();
    window.location.href = ended ? 'index.html?ended=1' : 'index.html';
  }
};
