// Battle page: initiative tracking, HP, attacks, combat log

let characters = [];
let selectedIdx = 0;
let currentTurnIdx = 0;
let round = 1;
let logEntries = [];

function persistState() {
  FightState.save({
    characters,
    selectedIdx,
    currentTurnIdx,
    round,
    log: logEntries
  });
}

function loadState() {
  const state = FightState.load();
  if (!state || !state.characters || state.characters.length === 0) {
    window.location.href = 'index.html';
    return false;
  }
  characters = state.characters;
  selectedIdx = state.selectedIdx ?? 0;
  currentTurnIdx = state.currentTurnIdx ?? 0;
  round = state.round ?? 1;
  logEntries = state.log ?? [];
  return true;
}

function renderFightView() {
  renderTurnBar();
  renderInitiativeTrack();
  renderHpCalc();
  renderAttackPanel();
}

function renderTurnBar() {
  const c = characters[currentTurnIdx];
  document.getElementById('turn-name').textContent = c ? c.name : '—';
  document.getElementById('turn-round').textContent = `Round ${round}`;
}

function renderInitiativeTrack() {
  const track = document.getElementById('initiative-track');
  track.innerHTML = '';
  const renderedSwarms = new Set();

  characters.forEach((c, i) => {
    if (c.swarmId) {
      if (renderedSwarms.has(c.swarmId)) return;
      renderedSwarms.add(c.swarmId);
      renderSwarmInitiativeCard(track, c);
      return;
    }

    track.appendChild(createInitiativeCard(c, i));
  });
}

function createInitiativeCard(c, i) {
    const card = document.createElement('div');
    card.className = 'init-card';
    if (i === selectedIdx) card.classList.add('selected');
    if (i === currentTurnIdx) card.classList.add('first-init');
    if (!c.alive || c.hp <= 0) card.classList.add('dead');

    const hp = Math.max(0, c.hp);
    const time = Math.max(0, c.timeHp);
    const eff = hp + time;
    const totalFill = eff <= 0 ? 0 : Math.min(100, (eff / c.maxHp) * 100);
    let basePct = 0;
    let timePct = 0;
    if (eff > 0) {
      basePct = (hp / eff) * totalFill;
      timePct = (time / eff) * totalFill;
    }
    const col = hpColor(c);
    const baseRadius = timePct > 0 ? '3px 0 0 3px' : '3px';
    const tempRadius = basePct <= 0 ? '3px' : '0 3px 3px 0';

    card.innerHTML = `
      <div class="init-badge">INIT ${c.initiative}</div>
      <div class="card-name">${escHtml(c.name)}</div>
      <div class="hp-mini-bar">
        <div class="hp-mini-base" style="width:${basePct}%;background:${col};border-radius:${baseRadius};"></div>
        <div class="hp-mini-temp" style="left:${basePct}%;width:${timePct}%;border-radius:${tempRadius};"></div>
      </div>
      <div class="hp-mini-text"><b>${effectiveHp(c)}</b>/${c.maxHp}</div>
      <div class="hp-mini-ac">AC ${c.ac}</div>
    `;
    card.onclick = () => selectChar(i);
    return card;
}

function renderSwarmInitiativeCard(track, c) {
  const members = getSwarmMembers(c.swarmId);
  const selectedMember = members.find(({ i }) => i === selectedIdx);
  const currentMember = members.find(({ i }) => i === currentTurnIdx);
  const displayMember = selectedMember || currentMember || members[0];
  const aliveCount = members.filter(({ ch }) => ch.alive && ch.hp > 0).length;
  const card = document.createElement('div');

  card.className = 'init-card swarm-init-card';
  if (selectedMember) card.classList.add('selected');
  if (currentMember) card.classList.add('first-init');
  if (aliveCount === 0) card.classList.add('dead');

  card.innerHTML = `
    <button class="init-card-main" type="button">
      <div class="init-badge">INIT ${c.initiative}</div>
      <div class="card-name">${escHtml(c.baseName || c.name)}</div>
      <div class="swarm-card-summary">${aliveCount}/${members.length} active</div>
      <div class="hp-mini-text"><b>${effectiveHp(displayMember.ch)}</b>/${displayMember.ch.maxHp}</div>
      <div class="hp-mini-ac">AC ${displayMember.ch.ac}</div>
    </button>
  `;
  card.querySelector('.init-card-main').onclick = () => selectFirstAliveSwarmMember(c.swarmId);

  track.appendChild(card);
}

function selectFirstAliveSwarmMember(swarmId) {
  const members = getSwarmMembers(swarmId);
  const firstAlive = members.find(({ ch }) => ch.alive && ch.hp > 0);
  const memberToSelect = firstAlive || members[0];
  if (memberToSelect) selectChar(memberToSelect.i);
}

function getSwarmMembers(swarmId) {
  return characters
    .map((ch, i) => ({ ch, i }))
    .filter(x => x.ch.swarmId === swarmId);
}

function renderSwarmPicker(c) {
  if (!c.swarmId) return '';
  const members = getSwarmMembers(c.swarmId);
  const options = members.map(({ ch, i }) => {
    const dead = !ch.alive || ch.hp <= 0;
    return `<button type="button" class="swarm-member-option ${i === selectedIdx ? 'selected' : ''} ${dead ? 'dead' : ''}" onclick="selectSwarmMember(${i})">
      <span class="swarm-member-check" aria-hidden="true">${i === selectedIdx ? '✓' : ''}</span>
      <span>${escHtml(ch.name)}</span>
      <span class="swarm-member-hp">${effectiveHp(ch)}/${ch.maxHp}${dead ? ' ☠' : ''}</span>
    </button>`;
  }).join('');

  return `
    <div class="swarm-picker-row" role="group" aria-label="Choose swarm member">
      <div class="swarm-picker-label">Choose ${escHtml(c.baseName || 'swarm member')}</div>
      <div class="swarm-picker-options">
        ${options}
      </div>
    </div>
  `;
}

function selectSwarmMember(idx) {
  if (idx >= 0 && idx < characters.length) selectChar(idx);
}

function renderHpCalc() {
  const section = document.getElementById('hp-calc-section');
  const c = characters[selectedIdx];
  if (!c) { section.innerHTML = ''; return; }

  const pct = Math.min(100, (c.hp / c.maxHp) * 100);
  const timePct = Math.min(100 - Math.max(0, pct), (c.timeHp / c.maxHp) * 100);
  const col = hpColor(c);
  const cls = hpClass(c);

  section.innerHTML = `
    <div class="hp-calc-panel">
      <div class="hp-calc-header">
        🗡 HP Calculator —
        <span class="selected-char-name">${escHtml(c.name)}</span>
      </div>

      ${renderSwarmPicker(c)}

      <div class="hp-display-row">
        <div class="hp-stat">
          <div class="hp-stat-label">Base HP</div>
          <div class="hp-stat-value ${cls}" id="disp-hp">${c.hp} / ${c.maxHp}</div>
        </div>
        <div class="hp-stat">
          <div class="hp-stat-label">Temp HP</div>
          <div class="hp-stat-value time" id="disp-time">${c.timeHp}</div>
        </div>
        <div class="hp-stat">
          <div class="hp-stat-label">Total HP</div>
          <div class="hp-stat-value ${cls}" id="disp-eff">${effectiveHp(c)}</div>
        </div>
      </div>

      <div class="hp-bar-full" id="hp-bar-wrap" style="position:relative;">
        <div class="hp-bar-full-fill" id="hp-bar-fill"
          style="width:${Math.max(0, pct)}%;background:${col};">
        </div>
        <div class="hp-time-fill" id="hp-time-bar"
          style="left:${Math.max(0, pct)}%;width:${timePct}%;">
        </div>
      </div>

      <div class="calc-input-row">
        <label>AMOUNT</label>
        <input type="number" id="calc-amount" value="0" min="0" placeholder="0" oninput="clampAmount()">
      </div>

      <div class="calc-actions">
        <button class="calc-action-btn btn-damage" onclick="applyDamage()">
          <span class="btn-icon">💀</span>Damage
        </button>
        <button class="calc-action-btn btn-heal" onclick="applyHeal()">
          <span class="btn-icon">💚</span>Heal
        </button>
        <button class="calc-action-btn btn-timehp" onclick="applyTimeHp()">
          <span class="btn-icon">🔵</span>Temp HP
        </button>
      </div>
    </div>
  `;
}

function renderAttackPanel() {
  const section = document.getElementById('attack-panel-section');
  const c = characters[selectedIdx];
  if (!c || !c.attacks || c.attacks.length === 0) { section.innerHTML = ''; return; }

  const btns = c.attacks.map((atk, i) => {
    const label = `${atk.numDice}d${atk.diceType}${atk.bonus >= 0 ? '+' : ''}${atk.bonus}`;
    return `<button class="attack-use-btn" onclick="rollAttack(${i})">
      ${atk.name ? `<span class="attack-name">${escHtml(atk.name)}</span>` : ''}
      <span class="attack-dice-label">🎲 ${label}</span>
      <span style="font-size:10px; color:var(--text-dim); letter-spacing:0.06em;">ROLL</span>
    </button>`;
  }).join('');

  section.innerHTML = `
    <div class="attack-panel">
      <div class="attack-panel-title">⚔ Attacks — <span style="color:var(--gold2);font-style:italic;">${escHtml(c.name)}</span></div>
      <div class="attack-btn-list">${btns}</div>
      <div id="roll-result-display"></div>
    </div>
  `;
}

function rollAttack(atkIdx) {
  const c = characters[selectedIdx];
  if (!c) return;
  const atk = c.attacks[atkIdx];
  if (!atk) return;

  const rolls = [];
  for (let i = 0; i < atk.numDice; i++) {
    rolls.push(Math.floor(Math.random() * atk.diceType) + 1);
  }
  const sum = rolls.reduce((a, b) => a + b, 0);
  const total = sum + atk.bonus;
  const bonusStr = atk.bonus >= 0 ? `+${atk.bonus}` : `${atk.bonus}`;
  const diceLabel = `${atk.numDice}d${atk.diceType}${bonusStr}`;
  const rollsStr = rolls.join(', ');

  const display = document.getElementById('roll-result-display');
  if (display) {
    display.innerHTML = `
      <div class="roll-result">
        <div class="roll-total">${total}</div>
        <div class="roll-breakdown">
          <strong>${diceLabel}</strong><br>
          Dice: [${rollsStr}] = ${sum}${atk.bonus !== 0 ? ` ${atk.bonus >= 0 ? '+' : ''}${atk.bonus} bonus` : ''}<br>
          Total: <strong style="color:var(--gold2);">${total}</strong>
        </div>
      </div>
    `;
  }

  const actionName = atk.name ? ` ${escHtml(atk.name)}` : '';
  addLog(`🎲 <span class="log-name">${escHtml(c.name)}</span>${actionName} <span style="color:var(--gold);">${diceLabel}</span> → [${rollsStr}]${atk.bonus !== 0 ? ` ${bonusStr}` : ''} = <strong style="color:var(--gold2);">${total}</strong>`);
}

function clampAmount() {
  const inp = document.getElementById('calc-amount');
  if (!inp) return;
  const v = parseInt(inp.value);
  if (isNaN(v) || v < 0) inp.value = 0;
}

function getAmount() {
  const inp = document.getElementById('calc-amount');
  if (!inp) return 0;
  const v = parseInt(inp.value);
  if (isNaN(v) || v < 0) { showToast('Enter a valid amount!', 'error'); return null; }
  return v;
}

function selectChar(i) {
  selectedIdx = i;
  persistState();
  renderInitiativeTrack();
  renderHpCalc();
  renderAttackPanel();
}

function applyDamage() {
  const amount = getAmount();
  if (amount === null || amount === 0) return;
  const c = characters[selectedIdx];

  const useTime = Math.min(c.timeHp, amount);
  c.timeHp -= useTime;
  const remaining = amount - useTime;
  c.hp = Math.max(0, c.hp - remaining);
  c.alive = c.hp > 0;

  const panel = document.getElementById('hp-calc-section');
  if (panel) {
    panel.classList.remove('flash-damage', 'flash-heal');
    void panel.offsetWidth;
    panel.classList.add('flash-damage');
  }

  spawnFloat(`-${amount}`, '#e74c3c');

  addLog(`⚔ <span class="log-name">${escHtml(c.name)}</span> takes <span class="log-dmg">${amount} damage</span>${useTime > 0 ? ` (${useTime} to Temp HP)` : ''} → ${effectiveHp(c)} HP`);

  if (!c.alive) {
    addLog(`💀 <span class="log-name">${escHtml(c.name)}</span> has fallen!`);
    showToast(`${c.name} has fallen! ☠`, 'error');
  }

  persistState();
  renderFightView();
}

function applyHeal() {
  const amount = getAmount();
  if (amount === null || amount === 0) return;
  const c = characters[selectedIdx];

  c.hp = Math.min(c.maxHp, c.hp + amount);
  c.alive = c.hp > 0;

  const panel = document.getElementById('hp-calc-section');
  if (panel) {
    panel.classList.remove('flash-damage', 'flash-heal');
    void panel.offsetWidth;
    panel.classList.add('flash-heal');
  }

  spawnFloat(`+${amount}`, '#27ae60');
  addLog(`💚 <span class="log-name">${escHtml(c.name)}</span> heals <span class="log-heal">${amount} HP</span> → ${c.hp}/${c.maxHp}`);

  persistState();
  renderFightView();
}

function applyTimeHp() {
  const amount = getAmount();
  if (amount === null || amount === 0) return;
  const c = characters[selectedIdx];

  c.timeHp += amount;
  spawnFloat(`+${amount} TEMP`, '#7ec8e3');
  addLog(`🔵 <span class="log-name">${escHtml(c.name)}</span> gains <span class="log-timehp">${amount} Temp HP</span> → Total: ${effectiveHp(c)}`);

  persistState();
  renderFightView();
}

function spawnFloat(text, color) {
  const section = document.getElementById('hp-calc-section');
  if (!section) return;
  const span = document.createElement('div');
  span.className = 'float-number';
  span.textContent = text;
  span.style.color = color;
  span.style.left = '50%';
  span.style.top = '30px';
  span.style.transform = 'translateX(-50%)';
  section.style.position = 'relative';
  section.appendChild(span);
  setTimeout(() => span.remove(), 1200);
}

function nextTurn() {
  const aliveIndices = characters.map((c, i) => ({ c, i })).filter(x => x.c.hp > 0);
  if (aliveIndices.length === 0) { showToast('All combatants have fallen!', 'error'); return; }

  let next = (currentTurnIdx + 1) % characters.length;
  let loops = 0;
  while (characters[next].hp <= 0 && loops < characters.length) {
    next = (next + 1) % characters.length;
    loops++;
  }

  if (next <= currentTurnIdx && aliveIndices.length > 0) {
    round++;
    addLog(`<br>🔔 <span class="log-round">Round ${round} begins!</span>`);
  }

  currentTurnIdx = next;
  selectedIdx = next;

  persistState();
  renderFightView();
  addLog(`🎲 <span class="log-name">${characters[currentTurnIdx].name}</span>'s turn`);
}

function endFight() {
  FightState.goToSetup(true);
}

function addLog(html) {
  logEntries.push(html);
  persistState();

  const container = document.getElementById('combat-log-entries');
  if (!container) return;
  const entry = document.createElement('div');
  entry.className = 'log-entry';
  entry.innerHTML = html;
  container.appendChild(entry);
  container.scrollTop = container.scrollHeight;
}

function renderLog() {
  const container = document.getElementById('combat-log-entries');
  container.innerHTML = '';
  logEntries.forEach(html => {
    const entry = document.createElement('div');
    entry.className = 'log-entry';
    entry.innerHTML = html;
    container.appendChild(entry);
  });
  container.scrollTop = container.scrollHeight;
}

window.addEventListener('DOMContentLoaded', () => {
  if (!loadState()) return;
  renderFightView();
  renderLog();
});
