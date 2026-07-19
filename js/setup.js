// Setup page: party assembly and attack editing

let charAttacks = {};
let editingAttacksRowId = null;
let rowId = 0;
const monsterLookupTimers = new Map();
const monsterLookupRequests = new Map();
const DND5E_API_MONSTERS = 'https://www.dnd5eapi.co/api/2014/monsters/';

function switchView(id) {
  document.querySelectorAll('.view').forEach(v => {
    v.classList.remove('active');
    v.style.display = 'none';
  });
  const el = document.getElementById(id);
  el.style.display = 'block';
  requestAnimationFrame(() => { el.classList.add('active'); });
}

function addCharRow(defaultName = '', defaultHp = '', defaultInit = 0, defaultInitMod = 0, defaultAc = '', swarm = false, swarmCount = 3) {
  rowId++;
  const id = rowId;
  charAttacks[id] = [];
  const container = document.getElementById('char-rows');
  const row = document.createElement('div');
  row.className = 'char-row';
  row.dataset.rowId = id;
  row.innerHTML = `
    <input type="text" placeholder="e.g. Goblin or Aragorn" value="${defaultName}" data-field="name" onchange="updateCharCount()" oninput="handleMonsterNameInput(${id}, this)">
    <input type="number" placeholder="100" value="${defaultHp}" data-field="hp" min="1">
    <input type="number" placeholder="0" value="${defaultInit}" data-field="init" min="0" max="99" title="The rolled initiative used to order combatants">
    <input type="text" inputmode="numeric" pattern="[+-]?\\d+" placeholder="+0" value="${defaultInitMod}" data-field="init-mod" title="Reference-only modifier; it does not affect turn order">
    <input type="number" placeholder="16" value="${defaultAc}" data-field="ac" min="1">
    <div class="swarm-cell">
      <label class="swarm-check" title="Create multiple copies of this combatant">
        <input type="checkbox" data-field="swarm" ${swarm ? 'checked' : ''} onchange="toggleSwarmFields(${id})">
        <span>Swarm</span>
      </label>
      <input type="number" class="swarm-count" data-field="swarm-count" value="${swarmCount}" min="2" max="50"
        placeholder="#" title="How many copies to create" oninput="updateCharCount()" ${swarm ? '' : 'hidden'}>
    </div>
    <button class="btn-dots" id="dots-btn-${id}" onclick="openAttacksView(${id})" title="Edit attacks">···</button>
    <button class="btn btn-crimson btn-sm" onclick="removeRow(${id})">✕</button>
  `;
  container.appendChild(row);
  if (!defaultName) row.querySelector('[data-field="name"]').focus();
  updateCharCount();
}

function monsterSlug(name) {
  return name.trim().toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function handleMonsterNameInput(id, input) {
  updateCharCount();
  clearTimeout(monsterLookupTimers.get(id));

  const slug = monsterSlug(input.value);
  if (!slug) return;

  monsterLookupTimers.set(id, setTimeout(() => fetchMonster(id, slug), 550));
}

function monsterActionsToAttacks(actions) {
  return (actions || []).flatMap(action => {
    const damage = (action.damage || []).find(item => item.damage_dice);
    const match = damage?.damage_dice.replace(/\s/g, '').match(/^(\d+)d(\d+)([+-]\d+)?$/i);
    if (!match) return [];
    return [{
      name: action.name,
      numDice: parseInt(match[1]),
      diceType: parseInt(match[2]),
      bonus: parseInt(match[3] || '0')
    }];
  });
}

async function fetchMonster(id, slug) {
  const row = document.querySelector(`.char-row[data-row-id="${id}"]`);
  const nameInput = row?.querySelector('[data-field="name"]');
  if (!row || !nameInput || monsterSlug(nameInput.value) !== slug) return;

  const requestId = Symbol(slug);
  monsterLookupRequests.set(id, requestId);
  row.classList.add('monster-loading');

  try {
    let response = await fetch(`${DND5E_API_MONSTERS}${encodeURIComponent(slug)}`);
    if (response.status === 404) {
      const searchResponse = await fetch(`${DND5E_API_MONSTERS}?name=${encodeURIComponent(nameInput.value.trim())}`);
      if (!searchResponse.ok) return;
      const search = await searchResponse.json();
      const match = (search.results || []).find(result => monsterSlug(result.name) === slug);
      if (!match) return;
      response = await fetch(`https://www.dnd5eapi.co${match.url}`);
    }
    if (!response.ok) return;
    const monster = await response.json();
    if (monsterLookupRequests.get(id) !== requestId || monsterSlug(nameInput.value) !== slug) return;

    const armorClass = Array.isArray(monster.armor_class)
      ? monster.armor_class[0]?.value
      : monster.armor_class;
    const initiativeModifier = Math.floor((Number(monster.dexterity) - 10) / 2);
    row.querySelector('[data-field="hp"]').value = monster.hit_points ?? '';
    row.querySelector('[data-field="ac"]').value = armorClass ?? '';
    row.querySelector('[data-field="init-mod"]').value = initiativeModifier > 0 ? `+${initiativeModifier}` : (Number.isFinite(initiativeModifier) ? initiativeModifier : 0);
    charAttacks[id] = monsterActionsToAttacks(monster.actions);
    document.getElementById(`dots-btn-${id}`)?.classList.toggle('has-attacks', charAttacks[id].length > 0);
    row.classList.add('monster-loaded');
    showToast(`Loaded ${monster.name} from the D&D 5e SRD API.`, 'success');
  } catch {
    // Manual entries remain usable if the API or network is unavailable.
  } finally {
    if (monsterLookupRequests.get(id) === requestId) row.classList.remove('monster-loading');
  }
}

function toggleSwarmFields(id) {
  const row = document.querySelector(`.char-row[data-row-id="${id}"]`);
  if (!row) return;
  const swarm = row.querySelector('[data-field="swarm"]').checked;
  const countInput = row.querySelector('[data-field="swarm-count"]');
  countInput.hidden = !swarm;
  if (swarm && !countInput.value) countInput.value = 3;
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

function getProjectedCombatantCount() {
  let count = 0;
  for (const row of document.querySelectorAll('.char-row')) {
    const name = row.querySelector('[data-field="name"]').value.trim();
    if (!name) continue;
    const swarm = row.querySelector('[data-field="swarm"]')?.checked;
    const swarmCount = swarm
      ? Math.max(2, parseInt(row.querySelector('[data-field="swarm-count"]').value) || 2)
      : 1;
    count += swarmCount;
  }
  return count;
}

function updateCharCount() {
  const count = getProjectedCombatantCount();
  const rows = document.querySelectorAll('.char-row').length;
  const badge = document.getElementById('char-count-badge');
  if (count === 0) {
    badge.textContent = rows === 1 ? '1 row' : `${rows} rows`;
    return;
  }
  badge.textContent = count === 1 ? '1 combatant' : `${count} combatants`;
}

function getRowsData() {
  const rows = document.querySelectorAll('.char-row');
  const results = [];
  const namesSet = new Set();

  for (const row of rows) {
    const name = row.querySelector('[data-field="name"]').value.trim();
    const hpRaw = row.querySelector('[data-field="hp"]').value.trim();
    const initRaw = row.querySelector('[data-field="init"]').value.trim();
    const initModRaw = row.querySelector('[data-field="init-mod"]').value.trim();
    const acRaw = row.querySelector('[data-field="ac"]').value.trim();
    const rid = parseInt(row.dataset.rowId);

    if (!name) continue;

    const swarm = row.querySelector('[data-field="swarm"]')?.checked;
    const swarmCount = swarm
      ? Math.max(2, parseInt(row.querySelector('[data-field="swarm-count"]').value) || 2)
      : 1;

    const hp = parseInt(hpRaw);
    const init = parseInt(initRaw);
    const initMod = parseInt(initModRaw);
    const ac = parseInt(acRaw);
    if (isNaN(hp) || hp <= 0) { showToast(`"${name}" needs a valid HP (> 0)`, 'error'); return null; }
    if (isNaN(init) || init < 0) { showToast(`"${name}" needs a valid Initiative`, 'error'); return null; }
    if (isNaN(initMod)) { showToast(`"${name}" needs a valid Initiative modifier`, 'error'); return null; }
    if (isNaN(ac) || ac <= 0) { showToast(`"${name}" needs a valid AC (> 0)`, 'error'); return null; }

    const attacks = charAttacks[rid] || [];
    const swarmId = swarm ? `swarm-${rid}` : null;
    const copies = swarm ? swarmCount : 1;

    for (let i = 1; i <= copies; i++) {
      const fighterName = swarm ? `${name} ${i}` : name;
      if (namesSet.has(fighterName.toLowerCase())) {
        showToast(`Duplicate name: "${fighterName}"`, 'error');
        return null;
      }
      namesSet.add(fighterName.toLowerCase());

      results.push({
        name: fighterName,
        hp,
        init,
        initMod,
        ac,
        attacks: cloneAttacks(attacks),
        swarmId,
        baseName: swarm ? name : null,
        copyIndex: swarm ? i : null,
        swarmCount: swarm ? swarmCount : null
      });
    }
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
    data.map(d => makeChar(
      d.name,
      d.hp,
      d.init,
      d.initMod,
      d.ac,
      d.attacks,
      d.swarmId ? {
        swarmId: d.swarmId,
        baseName: d.baseName,
        copyIndex: d.copyIndex,
        swarmCount: d.swarmCount
      } : null
    ))
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
          ${atk.name ? `${escHtml(atk.name)} · ` : ''}${atk.numDice}d${atk.diceType}${atk.bonus>=0?'+':''}${atk.bonus}
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

  addCharRow('Lyra Dawnweaver', '85', 20, 0, '16');
  addCharRow('Thordak Ironveil', '120', 14, 0, '18');
  addCharRow('Goblin Scout', '22', 17, 0, '13', true, 3);

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
