(async () => {
  const statusEl = document.getElementById('status');

  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const tab = tabs[0];
  if (!tab || !tab.url) {
    statusEl.className = 'status-none';
    statusEl.textContent = 'Keine Seite gefunden.';
    return;
  }

  const url = new URL(tab.url);
  const hostname = url.hostname;

  const result = await chrome.storage.local.get('outlets');
  let outlets = result.outlets;
  if (!outlets || outlets.length === 0) {
    outlets = DEFAULT_OUTLETS;
  }

  const outlet = bestMatch(outlets, hostname);
  if (!outlet) {
    statusEl.className = 'status-none';
    statusEl.textContent = 'Keine Einstufung f\u00fcr diese Seite.';
    return;
  }

  const level = TRUST_LEVELS[outlet.trustLevel] ?? TRUST_LEVELS.hint;

  statusEl.className = 'status';
  statusEl.innerHTML = '';

  const badge = document.createElement('span');
  badge.className = 'badge ' + level.cssClass;
  badge.textContent = level.label;

  const name = document.createElement('div');
  name.className = 'outlet-name';
  name.textContent = outlet.name;

  const reason = document.createElement('p');
  reason.className = 'outlet-reason';
  reason.textContent = outlet.reason;

  statusEl.append(badge, name, reason);

  const path = (outlet.parents ?? []).join(' > ');
  if (path) {
    const pathEl = document.createElement('div');
    pathEl.className = 'outlet-path';
    pathEl.textContent = 'Konzern: ' + path;
    statusEl.appendChild(pathEl);
  }

  const sources = (outlet.sources ?? []).filter(Boolean);
  if (sources.length > 0) {
    const toggle = document.createElement('button');
    toggle.className = 'toggle-sources';
    toggle.textContent = 'Quellen anzeigen';
    toggle.addEventListener('click', () => {
      const shown = sourcesWrap.style.display !== 'none';
      sourcesWrap.style.display = shown ? 'none' : 'block';
      toggle.textContent = shown ? 'Quellen anzeigen' : 'Quellen ausblenden';
    });

    const sourcesWrap = document.createElement('div');
    sourcesWrap.className = 'outlet-sources';
    sourcesWrap.style.display = 'none';
    sources.forEach(src => {
      const a = document.createElement('a');
      a.href = src;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.textContent = prettyUrl(src);
      a.title = src;
      sourcesWrap.appendChild(a);
    });

    statusEl.appendChild(toggle);
    statusEl.appendChild(sourcesWrap);
  }
})();

document.getElementById('open-page').addEventListener('click', () => {
  chrome.tabs.create({ url: chrome.runtime.getURL('page.html') });
});
