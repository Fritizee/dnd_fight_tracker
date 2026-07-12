// Setup page: party assembly and attack editing

let charAttacks = {};
let editingAttacksRowId = null;
let rowId = 0;

function switchView(id) {
  document.querySelectorAll('.view').forEach(v => {
    v.classList.remove('active');
    v.style.display = 'none';
  });
  const el = document.getElementById(id);
  el.style.display = 'block';
  requestAnimationFrame(() => { el.classList.add('active'); });
}

function addCharRow(defaultName = '', defaultHp = '', defaultInit = '', defaultAc = '') {
  rowId++;
  const id = rowId;
  charAttacks[id] = [];
  const container = document.getElementById('char-rows');
  const row = document.createElement('div');
  row.className = 'char-row';
  row.dataset.rowId = id;
  row.innerHTML = `
    <input type="text" placeholder="e.g. Aragorn" value="${defaultName}" data-field="name" onchange="updateCharCount()">
    <input type="number" placeholder="100" value="${defaultHp}" data-field="hp" min="1">
    <input type="number" placeholder="15" value="${defaultInit}" data-field="init" min="1" max="20">
    <input type="number" placeholder="16" value="${defaultAc}" data-field="ac" min="1">
    <button class="btn-dots" id="dots-btn-${id}" onclick="openAttacksView(${id})" title="Edit attacks">···</button>
    <button class="btn btn-crimson btn-sm" onclick="removeRow(${id})">✕</button>
  `;
  container.appendChild(row);
  if (!defaultName) row.querySelector('[data-field="name"]').focus();
  updateCharCount();
}

function removeRow(id) {
  const rows = document.querySelectorAll('.char-row');
  if (rows.length <= 1) { showToast('Keep at least one row!', 'error'); return; }
  const row = document.querySelector(`.char-row[data-row-id="${id}"]`);
  if (!row) return;
  row.classList.add('removing');
  setTimeout(() => { row.remove(); delete charAttacks[id]; updateCharCount(); }, 300);
}

function updateCharCount() {
  const count = document.querySelectorAll('.char-row').length;
  document.getElementById('char-count-badge').textContent =
    count === 1 ? '1 combatant' : `${count} combatants`;
}

function getRowsData() {
  const rows = document.querySelectorAll('.char-row');
  const results = [];
  const namesSet = new Set();

  for (const row of rows) {
    const name = row.querySelector('[data-field="name"]').value.trim();
    const hpRaw = row.querySelector('[data-field="hp"]').value.trim();
    const initRaw = row.querySelector('[data-field="init"]').value.trim();
    const acRaw = row.querySelector('[data-field="ac"]').value.trim();
    const rid = parseInt(row.dataset.rowId);

    if (!name) continue;

    if (namesSet.has(name.toLowerCase())) {
      showToast(`Duplicate name: "${name}"`, 'error');
      return null;
    }
    namesSet.add(name.toLowerCase());

    const hp = parseInt(hpRaw);
    const init = parseInt(initRaw);
    const ac = parseInt(acRaw);
    if (isNaN(hp) || hp <= 0) { showToast(`"${name}" needs a valid HP (> 0)`, 'error'); return null; }
    if (isNaN(init)) { showToast(`"${name}" needs a valid Initiative`, 'error'); return null; }
    if (isNaN(ac) || ac <= 0) { showToast(`"${name}" needs a valid AC (> 0)`, 'error'); return null; }

    results.push({ name, hp, init, ac, attacks: charAttacks[rid] || [] });
  }
  return results;
}

function startFight() {
  const data = getRowsData();
  if (!data || data.length === 0) {
    showToast('Add at least one combatant!', 'error');
    return;
  }

  const characters = sortByInitiative(
    data.map(d => makeChar(d.name, d.hp, d.init, d.ac, d.attacks))
  );

  FightState.startBattle(characters);
}

function openAttacksView(rid) {
  editingAttacksRowId = rid;
  const row = document.querySelector(`.char-row[data-row-id="${rid}"]`);
  const name = row ? row.querySelector('[data-field="name"]').value.trim() || 'Unnamed' : 'Unnamed';
  document.getElementById('attacks-char-name').textContent = name;
  renderAttackList();
  switchView('view-attacks');
}

function closeAttacksView() {
  if (editingAttacksRowId !== null) {
    const atks = charAttacks[editingAttacksRowId] || [];
    const btn = document.getElementById(`dots-btn-${editingAttacksRowId}`);
    if (btn) btn.classList.toggle('has-attacks', atks.length > 0);
  }
  editingAttacksRowId = null;
  switchView('view-setup');
}

function renderAttackList() {
  const container = document.getElementById('attack-list');
  container.innerHTML = '';
  const atks = charAttacks[editingAttacksRowId] || [];
  if (atks.length === 0) {
    container.innerHTML = `<div style="color:var(--text-dim); font-style:italic; font-size:14px; padding:8px 0;">No attacks yet. Add one below.</div>`;
    return;
  }
  atks.forEach((atk, i) => {
    const div = document.createElement('div');
    div.className = 'attack-row';
    div.innerHTML = `
      <div>
        <div class="attack-row-label">Dice #</div>
        <input type="number" min="1" max="20" value="${atk.numDice}" style="text-align:center;"
          oninput="updateAttack(${i},'numDice',this.value)">
      </div>
      <div>
        <div class="attack-row-label">Dice Type</div>
        <select onchange="updateAttack(${i},'diceType',this.value)">
          ${[4,6,8,10,12,20,100].map(d => `<option value="${d}" ${atk.diceType===d?'selected':''}> d${d}</option>`).join('')}
        </select>
      </div>
      <div>
        <div class="attack-row-label">+ Bonus</div>
        <input type="number" value="${atk.bonus}" style="text-align:center;"
          oninput="updateAttack(${i},'bonus',this.value)">
      </div>
      <div style="display:flex;align-items:center;justify-content:center;padding-top:18px;">
        <span style="font-family:'Cinzel',serif; font-size:13px; color:var(--text-muted);">
          ${atk.numDice}d${atk.diceType}${atk.bonus>=0?'+':''}${atk.bonus}
        </span>
      </div>
      <div style="display:flex;align-items:center;justify-content:center;padding-top:18px;">
        <button class="btn btn-crimson btn-sm" onclick="removeAttack(${i})">✕</button>
      </div>
    `;
    container.appendChild(div);
  });
}

function addAttackRow() {
  if (!charAttacks[editingAttacksRowId]) charAttacks[editingAttacksRowId] = [];
  charAttacks[editingAttacksRowId].push({ numDice: 1, diceType: 6, bonus: 0 });
  renderAttackList();
}

function removeAttack(i) {
  charAttacks[editingAttacksRowId].splice(i, 1);
  renderAttackList();
}

function updateAttack(i, field, value) {
  const atk = charAttacks[editingAttacksRowId][i];
  if (field === 'numDice') atk.numDice = Math.max(1, parseInt(value) || 1);
  else if (field === 'diceType') atk.diceType = parseInt(value);
  else if (field === 'bonus') atk.bonus = parseInt(value) || 0;
  renderAttackList();
}

window.addEventListener('DOMContentLoaded', () => {
  if (new URLSearchParams(window.location.search).get('ended') === '1') {
    history.replaceState(null, '', 'index.html');
    showToast('Battle ended. Rest well, adventurer.', 'success');
  }

  addCharRow('Lyra Dawnweaver', '85', '20', '16');
  addCharRow('Thordak Ironveil', '120', '14', '18');
  addCharRow('Goblin Scout', '22', '17', '13');

  const ids = Object.keys(charAttacks).map(Number);
  if (ids[0]) charAttacks[ids[0]] = [{ numDice: 2, diceType: 6, bonus: 3 }, { numDice: 1, diceType: 8, bonus: 5 }];
  if (ids[1]) charAttacks[ids[1]] = [{ numDice: 1, diceType: 12, bonus: 4 }];
  if (ids[2]) charAttacks[ids[2]] = [{ numDice: 1, diceType: 6, bonus: 1 }];

  ids.forEach(id => {
    const atks = charAttacks[id] || [];
    const btn = document.getElementById(`dots-btn-${id}`);
    if (btn && atks.length > 0) btn.classList.add('has-attacks');
  });

  updateCharCount();
});
