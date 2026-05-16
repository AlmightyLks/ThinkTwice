// Storage

async function loadOutlets() {
  const result = await chrome.storage.local.get(OUTLETS_KEY);
  return result[OUTLETS_KEY] ?? null;
}

async function saveOutlets(outlets) {
  await chrome.storage.local.set({ [OUTLETS_KEY]: outlets });
}

async function loadPublishers() {
  const result = await chrome.storage.local.get(PUBLISHERS_KEY);
  return result[PUBLISHERS_KEY] ?? null;
}

async function savePublishers(publishers) {
  await chrome.storage.local.set({ [PUBLISHERS_KEY]: publishers });
}

function normalizeOutlet(o) {
  const sources = o.sources ?? [];
  let parents = o.parents;
  if (!parents || parents.length === 0) {
    parents = o.publisher ? [o.publisher] : [];
  }
  return { ...o, parents, sources };
}

function normalizePublisher(p) {
  return { path: p.path ?? [], reason: p.reason ?? '', sources: p.sources ?? [] };
}

async function ensureSeeded() {
  if ((await loadOutlets()) === null) await saveOutlets(DEFAULT_OUTLETS);
  if ((await loadPublishers()) === null) await savePublishers(DEFAULT_PUBLISHERS);
  return {
    outlets: ((await loadOutlets()) ?? []).map(normalizeOutlet),
    publishers: ((await loadPublishers()) ?? []).map(normalizePublisher),
  };
}

function slugify(s) {
  return s.toLowerCase()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function pathsEqual(a, b) {
  return a.length === b.length && a.every((s, i) => s === b[i]);
}

function prettyUrl(url) {
  try {
    const u = new URL(url);
    return u.host + u.pathname.replace(/\/+$/, '') + u.search + u.hash;
  } catch {
    return url.replace(/^[a-z]+:\/\//i, '').replace(/\/+$/, '');
  }
}

// Path picker (generalized)

let currentOutlets = [];
let currentPublishers = [];
let editingOutletId = null;

const pickerStates = {
  'path-picker': [],
  'publisher-path-picker': [],
};

function getAllPaths() {
  const paths = [];
  for (const o of currentOutlets) paths.push(o.parents ?? []);
  for (const p of currentPublishers) paths.push(p.path);
  return paths;
}

function getChildrenOfPath(paths, prefix) {
  const children = new Set();
  for (const p of paths) {
    if (p.length > prefix.length && prefix.every((seg, i) => p[i] === seg)) {
      children.add(p[prefix.length]);
    }
  }
  return [...children].sort((a, b) => a.localeCompare(b, 'de'));
}

function renderPathPicker(containerId) {
  const state = pickerStates[containerId];
  const container = document.getElementById(containerId);
  container.innerHTML = '';

  state.forEach((segment, i) => {
    const chip = document.createElement('span');
    chip.className = 'path-chip';
    chip.append(document.createTextNode(segment));

    const remove = document.createElement('span');
    remove.className = 'chip-remove';
    remove.textContent = 'x';
    remove.title = 'Ab dieser Ebene entfernen';
    remove.addEventListener('click', e => {
      e.stopPropagation();
      pickerStates[containerId] = state.slice(0, i);
      renderPathPicker(containerId);
    });
    chip.appendChild(remove);
    container.appendChild(chip);

    const sep = document.createElement('span');
    sep.className = 'path-sep';
    sep.textContent = '>';
    container.appendChild(sep);
  });

  container.appendChild(createLevelSelect(containerId));
}

function createLevelSelect(containerId) {
  const state = pickerStates[containerId];
  const options = getChildrenOfPath(getAllPaths(), state);

  const select = document.createElement('select');
  select.className = 'path-select';

  const blank = document.createElement('option');
  blank.value = '';
  blank.textContent = state.length === 0
    ? 'Konzern wählen'
    : 'Untergruppe (optional)';
  select.appendChild(blank);

  options.forEach(opt => {
    const o = document.createElement('option');
    o.value = opt;
    o.textContent = opt;
    select.appendChild(o);
  });

  const newOpt = document.createElement('option');
  newOpt.value = '__new__';
  newOpt.textContent = '+ Neu anlegen...';
  select.appendChild(newOpt);

  select.addEventListener('change', () => {
    if (select.value === '__new__') {
      showNewLevelInput(containerId, select);
    } else if (select.value) {
      pickerStates[containerId].push(select.value);
      renderPathPicker(containerId);
    }
  });

  return select;
}

function showNewLevelInput(containerId, select) {
  const state = pickerStates[containerId];
  const wrapper = document.createElement('span');
  wrapper.className = 'new-level';

  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'new-level-input';
  input.placeholder = state.length === 0 ? 'Neuer Konzern' : 'Neue Untergruppe';

  const ok = document.createElement('button');
  ok.type = 'button';
  ok.className = 'new-level-ok';
  ok.textContent = '✓';
  ok.title = 'Übernehmen';

  const cancel = document.createElement('button');
  cancel.type = 'button';
  cancel.className = 'new-level-cancel';
  cancel.textContent = 'x';
  cancel.title = 'Abbrechen';

  wrapper.append(input, ok, cancel);
  select.replaceWith(wrapper);
  input.focus();

  const accept = () => {
    const v = input.value.trim();
    if (v) pickerStates[containerId].push(v);
    renderPathPicker(containerId);
  };

  ok.addEventListener('click', accept);
  cancel.addEventListener('click', () => renderPathPicker(containerId));
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); accept(); }
    else if (e.key === 'Escape') { renderPathPicker(containerId); }
  });
}

// Sorting

let sortBy = 'concern';
let sortDir = 'desc';
let searchQuery = '';

function matchesQuery(s) {
  if (!searchQuery) return true;
  return (s ?? '').toLowerCase().includes(searchQuery);
}

function outletMatches(o) {
  return matchesQuery(o.name)
    || matchesQuery(o.reason)
    || (o.urlPrefixes ?? []).some(p => matchesQuery(p))
    || (o.parents ?? []).some(p => matchesQuery(p));
}

function publisherMatches(p) {
  return p.path.some(seg => matchesQuery(seg)) || matchesQuery(p.reason);
}

function pruneTree(node, ancestorMatched = false) {
  if (!searchQuery || ancestorMatched) {
    for (const child of node.children.values()) pruneTree(child, true);
    return true;
  }

  node.outlets = node.outlets.filter(outletMatches);

  const surviving = new Map();
  for (const [name, child] of node.children) {
    const nameMatch = matchesQuery(name);
    const kept = pruneTree(child, nameMatch);
    if (kept) surviving.set(name, child);
  }
  node.children = surviving;

  const pubMatch = node.publisher && publisherMatches(node.publisher);
  return node.outlets.length > 0 || node.children.size > 0 || pubMatch;
}

function accumSeverity(node) {
  let total = 0;
  for (const o of node.outlets) total += TRUST_RANK[o.trustLevel] ?? 0;
  for (const child of node.children.values()) total += accumSeverity(child);
  return total;
}

function sortTree(node) {
  const dir = sortDir === 'asc' ? 1 : -1;

  if (sortBy === 'concern') {
    node.outlets.sort((a, b) => {
      const cmp = (TRUST_RANK[a.trustLevel] ?? 0) - (TRUST_RANK[b.trustLevel] ?? 0);
      return (cmp !== 0 ? cmp : a.name.localeCompare(b.name, 'de')) * dir;
    });
  } else {
    node.outlets.sort((a, b) => a.name.localeCompare(b.name, 'de') * dir);
  }

  const entries = [...node.children.entries()];
  if (sortBy === 'concern') {
    entries.sort(([nameA, a], [nameB, b]) => {
      const cmp = accumSeverity(a) - accumSeverity(b);
      return (cmp !== 0 ? cmp : nameA.localeCompare(nameB, 'de')) * dir;
    });
  } else {
    entries.sort(([nameA], [nameB]) => nameA.localeCompare(nameB, 'de') * dir);
  }
  node.children = new Map(entries);
  for (const child of node.children.values()) sortTree(child);
}

// Tree

function newNode(name) {
  return { name, children: new Map(), outlets: [], publisher: null };
}

function buildTree(outlets, publishers) {
  const root = newNode(null);

  for (const p of publishers) {
    let node = root;
    for (const seg of p.path) {
      if (!node.children.has(seg)) node.children.set(seg, newNode(seg));
      node = node.children.get(seg);
    }
    node.publisher = p;
  }

  for (const o of outlets) {
    let node = root;
    for (const seg of (o.parents ?? [])) {
      if (!node.children.has(seg)) node.children.set(seg, newNode(seg));
      node = node.children.get(seg);
    }
    node.outlets.push(o);
  }

  return root;
}

function countLeaves(node) {
  let n = node.outlets.length;
  for (const child of node.children.values()) n += countLeaves(child);
  return n;
}

function renderSources(urls) {
  if (!urls || urls.length === 0) return null;
  const wrap = document.createElement('div');
  wrap.className = 'sources';
  const label = document.createElement('span');
  label.className = 'sources-label';
  label.textContent = 'Quellen:';
  wrap.appendChild(label);
  const ul = document.createElement('ul');
  urls.forEach(url => {
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.textContent = prettyUrl(url);
    a.title = url;
    li.appendChild(a);
    ul.appendChild(li);
  });
  wrap.appendChild(ul);
  return wrap;
}

function renderPublisherInfo(pub, path) {
  const div = document.createElement('div');
  div.className = 'publisher-info';

  if (pub.reason) {
    const p = document.createElement('p');
    p.className = 'publisher-reason';
    p.textContent = pub.reason;
    div.appendChild(p);
  }

  const sources = renderSources(pub.sources);
  if (sources) div.appendChild(sources);

  return div;
}

function renderTree(node, container, depth = 0, path = []) {
  for (const outlet of node.outlets) {
    container.appendChild(renderEntry(outlet));
  }
  for (const [name, child] of node.children) {
    const childPath = [...path, name];
    const details = document.createElement('details');
    details.className = depth === 0 ? 'group group-root' : 'group';
    details.open = !!searchQuery;

    const summary = document.createElement('summary');
    summary.className = `publisher publisher-depth-${depth}`;

    const label = document.createElement('span');
    label.className = 'publisher-label';
    label.textContent = child.name;

    const count = document.createElement('span');
    count.className = 'publisher-count';
    count.textContent = countLeaves(child);

    const edit = document.createElement('button');
    edit.type = 'button';
    edit.className = 'publisher-edit';
    edit.textContent = child.publisher ? 'Konzern bearbeiten' : '+ Konzernangabe';
    edit.title = child.publisher
      ? 'Begründung und Quellen für diesen Konzern bearbeiten'
      : 'Begründung und Quellen für diesen Konzern hinzufügen';
    edit.addEventListener('click', e => {
      e.preventDefault();
      e.stopPropagation();
      loadPublisherIntoForm(childPath);
    });

    summary.append(label, count, edit);
    details.appendChild(summary);

    const body = document.createElement('div');
    body.className = 'group-body';

    if (child.publisher) {
      body.appendChild(renderPublisherInfo(child.publisher, childPath));
    }

    renderTree(child, body, depth + 1, childPath);
    details.appendChild(body);

    container.appendChild(details);
  }
}

function renderEntry(outlet) {
  const entry = document.createElement('div');
  entry.className = 'entry';

  const header = document.createElement('header');
  const titleRow = document.createElement('div');
  titleRow.className = 'title-row';

  const name = document.createElement('span');
  name.className = 'name';
  name.textContent = outlet.name;

  const level = TRUST_LEVELS[outlet.trustLevel] ?? TRUST_LEVELS.hint;
  const badge = document.createElement('span');
  badge.className = `badge ${level.cssClass}`;
  badge.textContent = level.label;
  titleRow.append(name, badge);

  const editBtn = document.createElement('button');
  editBtn.textContent = 'Bearbeiten';
  editBtn.addEventListener('click', async () => {
    loadOutletIntoForm(outlet);
  });

  const remove = document.createElement('button');
  remove.textContent = 'Entfernen';
  remove.addEventListener('click', async () => {
    const current = (await loadOutlets()) ?? [];
    await saveOutlets(current.filter(o => o.id !== outlet.id));
  });

  header.append(titleRow, editBtn, remove);

  const reason = document.createElement('p');
  reason.className = 'reason';
  reason.textContent = outlet.reason;

  const ul = document.createElement('ul');
  ul.className = 'prefixes';
  outlet.urlPrefixes.forEach(p => {
    const li = document.createElement('li');
    li.textContent = prettyUrl(p);
    li.title = p;
    ul.appendChild(li);
  });

  entry.append(header, reason, ul);

  const sources = renderSources(outlet.sources);
  if (sources) entry.appendChild(sources);

  return entry;
}

// Render

function render(outlets, publishers) {
  currentOutlets = outlets.map(normalizeOutlet);
  currentPublishers = publishers.map(normalizePublisher);

  const list = document.getElementById('list');
  list.innerHTML = '';

  if (currentOutlets.length === 0 && currentPublishers.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'empty';
    empty.textContent = 'Noch keine Einträge gespeichert.';
    list.appendChild(empty);
  } else {
    const tree = buildTree(currentOutlets, currentPublishers);
    sortTree(tree);
    pruneTree(tree);
    if (tree.children.size === 0 && tree.outlets.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'empty';
      empty.textContent = `Keine Treffer für „${searchQuery}".`;
      list.appendChild(empty);
    } else {
      renderTree(tree, list);
    }
  }

  renderPathPicker('path-picker');
  renderPathPicker('publisher-path-picker');
  updateToggleAllLabel();
}

// Publisher form helpers

function loadPublisherIntoForm(path) {
  showFormContainer();
  activateTab('publisher');
  pickerStates['publisher-path-picker'] = [...path];
  renderPathPicker('publisher-path-picker');

  const existing = currentPublishers.find(p => pathsEqual(p.path, path));
  document.getElementById('publisher-reason').value = existing?.reason ?? '';
  document.getElementById('publisher-sources').value = (existing?.sources ?? []).join('\n');

  document.getElementById('publisher-reason').focus();
}

function activateTab(name) {
  document.querySelectorAll('.tab').forEach(b => {
    b.classList.toggle('active', b.dataset.tab === name);
  });
  document.querySelectorAll('.tab-panels [data-panel]').forEach(p => {
    p.hidden = p.dataset.panel !== name;
  });
}

document.querySelectorAll('.tab').forEach(btn => {
  btn.addEventListener('click', () => activateTab(btn.dataset.tab));
});

function clearPublisherForm() {
  pickerStates['publisher-path-picker'] = [];
  renderPathPicker('publisher-path-picker');
  document.getElementById('publisher-reason').value = '';
  document.getElementById('publisher-sources').value = '';
}

function showFormContainer() {
  document.getElementById('form-container').hidden = false;
  document.getElementById('form-container').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function hideFormContainer() {
  document.getElementById('form-container').hidden = true;
  clearOutletForm();
  clearPublisherForm();
}

// Status helpers

function showStatus(id, msg) {
  const el = document.getElementById(id);
  el.textContent = msg;
  setTimeout(() => { el.textContent = ''; }, 1800);
}

// Form helpers - outlet editing

function clearOutletForm() {
  editingOutletId = null;
  document.getElementById('name').value = '';
  document.getElementById('reason').value = '';
  document.getElementById('prefixes').value = '';
  document.getElementById('sources').value = '';
  document.getElementById('trust-level').value = 'mixed';
  pickerStates['path-picker'] = [];
  renderPathPicker('path-picker');
  document.getElementById('add').textContent = 'Hinzufügen';
  document.getElementById('cancel-edit').hidden = true;
  document.getElementById('close-form').hidden = false;
}

function loadOutletIntoForm(outlet) {
  showFormContainer();
  editingOutletId = outlet.id;
  document.getElementById('name').value = outlet.name;
  document.getElementById('trust-level').value = outlet.trustLevel;
  document.getElementById('reason').value = outlet.reason;
  document.getElementById('prefixes').value = (outlet.urlPrefixes ?? []).join('\n');
  document.getElementById('sources').value = (outlet.sources ?? []).join('\n');
  pickerStates['path-picker'] = [...(outlet.parents ?? [])];
  renderPathPicker('path-picker');
  document.getElementById('add').textContent = 'Speichern';
  document.getElementById('cancel-edit').hidden = false;
  document.getElementById('close-form').hidden = true;
  activateTab('outlet');
  document.getElementById('name').focus();
}

// Form handlers

document.getElementById('add').addEventListener('click', async () => {
  const name = document.getElementById('name').value.trim();
  const parents = [...pickerStates['path-picker']];
  const trustLevel = document.getElementById('trust-level').value;
  const reason = document.getElementById('reason').value.trim();
  const urlPrefixes = document.getElementById('prefixes').value
    .split('\n').map(s => s.trim()).filter(Boolean);
  const sources = document.getElementById('sources').value
    .split('\n').map(s => s.trim()).filter(Boolean);

  if (!name || parents.length === 0 || urlPrefixes.length === 0) {
    showStatus('status', 'Name, Konzernpfad und mindestens ein Präfix erforderlich.');
    return;
  }

  let outlets = (await loadOutlets()) ?? [];

  if (editingOutletId) {
    const idx = outlets.findIndex(o => o.id === editingOutletId);
    if (idx !== -1) {
      outlets[idx] = { ...outlets[idx], name, parents, urlPrefixes, trustLevel, reason, sources };
    }
  } else {
    const baseId = slugify(name);
    let id = baseId, n = 2;
    while (outlets.some(o => o.id === id)) id = `${baseId}-${n++}`;
    outlets.push({ id, name, parents, urlPrefixes, trustLevel, reason, sources });
  }

  await saveOutlets(outlets);
  clearOutletForm();
  showStatus('status', 'Gespeichert.');
  hideFormContainer();
});

document.getElementById('cancel-edit').addEventListener('click', () => {
  clearOutletForm();
  hideFormContainer();
});

document.getElementById('save-publisher').addEventListener('click', async () => {
  const path = [...pickerStates['publisher-path-picker']];
  const reason = document.getElementById('publisher-reason').value.trim();
  const sources = document.getElementById('publisher-sources').value
    .split('\n').map(s => s.trim()).filter(Boolean);

  if (path.length === 0) {
    showStatus('publisher-status', 'Konzernpfad ist erforderlich.');
    return;
  }

  const publishers = (await loadPublishers()) ?? [];
  const index = publishers.findIndex(p => pathsEqual(p.path, path));
  const entry = { path, reason, sources };
  if (index >= 0) publishers[index] = entry;
  else publishers.push(entry);
  await savePublishers(publishers);

  clearPublisherForm();
  showStatus('publisher-status', 'Gespeichert.');
  hideFormContainer();
});

document.getElementById('clear-publisher').addEventListener('click', () => {
  clearPublisherForm();
});

document.getElementById('show-form').addEventListener('click', () => {
  showFormContainer();
  activateTab('outlet');
  clearOutletForm();
});

document.getElementById('close-form').addEventListener('click', hideFormContainer);
document.getElementById('close-form-pub').addEventListener('click', hideFormContainer);

// Sort & toggle controls

function updateToggleAllLabel() {
  const btn = document.getElementById('toggle-all');
  const groups = document.querySelectorAll('#list details.group');
  if (groups.length === 0) {
    btn.disabled = true;
    btn.textContent = 'Alle einklappen';
    return;
  }
  btn.disabled = false;
  const anyOpen = [...groups].some(d => d.open);
  btn.textContent = anyOpen ? 'Alle einklappen' : 'Alle ausklappen';
}

document.getElementById('search').addEventListener('input', e => {
  searchQuery = e.target.value.trim().toLowerCase();
  render(currentOutlets, currentPublishers);
});

document.getElementById('sort-by').addEventListener('change', e => {
  sortBy = e.target.value;
  render(currentOutlets, currentPublishers);
});

document.getElementById('sort-dir').addEventListener('change', e => {
  sortDir = e.target.value;
  render(currentOutlets, currentPublishers);
});

document.getElementById('toggle-all').addEventListener('click', () => {
  const groups = document.querySelectorAll('#list details.group');
  const anyOpen = [...groups].some(d => d.open);
  groups.forEach(d => { d.open = !anyOpen; });
  updateToggleAllLabel();
});

document.getElementById('list').addEventListener('toggle', e => {
  if (e.target.tagName === 'DETAILS') updateToggleAllLabel();
}, true);

document.getElementById('reset').addEventListener('click', async () => {
  if (!confirm('Listen auf Standardwerte zurücksetzen? Eigene Einträge und Konzernangaben gehen verloren.')) return;
  await saveOutlets(DEFAULT_OUTLETS);
  await savePublishers(DEFAULT_PUBLISHERS);
  showStatus('status', 'Zurückgesetzt.');
});

document.getElementById('update').addEventListener('click', async () => {
  const outlets = (await loadOutlets()) ?? [];
  const defaultsById = {};
  for (const d of DEFAULT_OUTLETS) defaultsById[d.id] = d;

  const merged = outlets.map(o => defaultsById[o.id]
    ? { ...defaultsById[o.id], id: o.id }
    : o);
  const defaultIds = new Set(DEFAULT_OUTLETS.map(d => d.id));
  for (const d of DEFAULT_OUTLETS) {
    if (!merged.some(o => o.id === d.id)) merged.push({ ...d });
  }

  const publishers = (await loadPublishers()) ?? [];
  const defaultByPath = new Map(DEFAULT_PUBLISHERS.map(p => [JSON.stringify(p.path), p]));
  const mergedPub = publishers.map(p =>
    defaultByPath.has(JSON.stringify(p.path))
      ? { ...defaultByPath.get(JSON.stringify(p.path)) }
      : p);
  const seenPaths = new Set(publishers.map(p => JSON.stringify(p.path)));
  for (const d of DEFAULT_PUBLISHERS) {
    if (!seenPaths.has(JSON.stringify(d.path))) mergedPub.push({ ...d });
  }

  await saveOutlets(merged);
  await savePublishers(mergedPub);
  showStatus('status', 'Standardeinträge aktualisiert.');
});

// Live updates

chrome.storage.onChanged.addListener(async (changes, area) => {
  if (area !== 'local') return;
  if (!(changes[OUTLETS_KEY] || changes[PUBLISHERS_KEY])) return;
  const outlets = ((await loadOutlets()) ?? []).map(normalizeOutlet);
  const publishers = ((await loadPublishers()) ?? []).map(normalizePublisher);
  render(outlets, publishers);
});

ensureSeeded().then(({ outlets, publishers }) => render(outlets, publishers));
