(async () => {
  const url = location.href;
  if (!url.startsWith('http')) return;

  let result;
  try {
    result = await chrome.storage.local.get('outlets');
  } catch {
    return;
  }

  let outlets = result.outlets;
  if (!outlets || outlets.length === 0) {
    outlets = DEFAULT_OUTLETS;
    await chrome.storage.local.set({ outlets });
  }

  const hostname = location.hostname.toLowerCase();

  const outlet = bestMatch(outlets, hostname);
  if (!outlet) return;

  const label = (TRUST_LEVELS[outlet.trustLevel] ?? TRUST_LEVELS.hint).label;
  const path = (outlet.parents ?? []).join(' > ');
  const colors = COLORS[outlet.trustLevel] ?? COLORS.hint;

  const banner = document.createElement('div');
  banner.style.cssText = `
    position: fixed; top: 0; left: 0; right: 0; z-index: 2147483647;
    background: ${colors.bg}; border-bottom: 4px solid ${colors.border};
    padding: 18px 24px; font-family: system-ui, -apple-system, sans-serif;
    font-size: 15px; line-height: 1.6; color: ${colors.text};
    box-shadow: 0 4px 20px rgba(0,0,0,0.25);
  `;

  const inner = document.createElement('div');
  inner.style.cssText = 'max-width: 960px; margin: 0 auto; display: flex; gap: 14px; align-items: flex-start;';

  const icon = document.createElement('span');
  icon.textContent = colors.icon;
  icon.style.cssText = `
    font-size: 22px; font-weight: 700; flex-shrink: 0; margin-top: 2px;
    display: inline-flex; align-items: center; justify-content: center;
    width: 32px; height: 32px; border-radius: 50%;
    background: ${colors.border}; color: ${colors.bg};
  `;

  const content = document.createElement('div');
  content.style.cssText = 'flex: 1; min-width: 0;';

  const header = document.createElement('div');
  header.style.cssText = 'font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; opacity: 0.7; margin-bottom: 2px;';
  header.textContent = 'ThinkTwice';

  const title = document.createElement('strong');
  title.textContent = `${label} für „${outlet.name}"`;
  title.style.cssText = 'font-size: 17px;';

  const reason = document.createElement('div');
  reason.textContent = outlet.reason;
  reason.style.cssText = 'margin-top: 4px; font-size: 14px;';

  content.append(header, title, reason);

  if (path) {
    const corp = document.createElement('div');
    corp.textContent = `Konzern: ${path}`;
    corp.style.cssText = 'margin-top: 4px; font-size: 12px; opacity: 0.8;';
    content.appendChild(corp);
  }

  const sources = (outlet.sources ?? []).filter(Boolean);
  if (sources.length > 0) {
    const toggle = document.createElement('button');
    toggle.textContent = 'Quellen anzeigen';
    toggle.style.cssText = `
      background: none; border: none; font-size: 12px; cursor: pointer;
      color: ${colors.text}; text-decoration: underline; opacity: 0.65;
      padding: 0; margin-top: 6px;
    `;
    toggle.addEventListener('mouseenter', () => { toggle.style.opacity = '1'; });
    toggle.addEventListener('mouseleave', () => { toggle.style.opacity = '0.65'; });

    const list = document.createElement('div');
    list.style.cssText = 'display: none; margin-top: 6px;';
    sources.forEach(url => {
      const a = document.createElement('a');
      a.href = url;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.textContent = url;
      a.style.cssText = `
        display: block; font-size: 12px; color: ${colors.text};
        opacity: 0.7; text-decoration: underline; margin-top: 2px;
        word-break: break-all;
      `;
      list.appendChild(a);
    });

    function updatePadding() {
      document.documentElement.style.paddingTop = banner.offsetHeight + 'px';
    }
    toggle.addEventListener('click', () => {
      const shown = list.style.display !== 'none';
      list.style.display = shown ? 'none' : 'block';
      toggle.textContent = shown ? 'Quellen anzeigen' : 'Quellen ausblenden';
      requestAnimationFrame(updatePadding);
    });

    content.appendChild(toggle);
    content.appendChild(list);
  }

  const close = document.createElement('button');
  close.textContent = 'x';
  close.style.cssText = `
    flex-shrink: 0; background: ${colors.border}; border: none; font-size: 16px; font-weight: 700;
    cursor: pointer; color: ${colors.bg}; padding: 6px 10px;
    line-height: 1; border-radius: 6px;
  `;
  close.addEventListener('mouseenter', () => { close.style.filter = 'brightness(1.15)'; });
  close.addEventListener('mouseleave', () => { close.style.filter = 'none'; });
  close.addEventListener('click', () => { banner.dataset.closed = '1'; banner.remove(); });

  inner.append(icon, content, close);
  banner.appendChild(inner);

  function showBanner() {
    if (!document.body) {
      requestAnimationFrame(showBanner);
      return;
    }

    if (banner.dataset.closed) return;
    if (!document.body.contains(banner)) {
      document.body.prepend(banner);
    }
    document.documentElement.style.paddingTop = banner.offsetHeight + 'px';
  }
  showBanner();

  const mo = new MutationObserver(() => {
    if (banner.dataset.closed) return;
    if (!document.body.contains(banner)) {
      document.body.prepend(banner);
      document.documentElement.style.paddingTop = banner.offsetHeight + 'px';
    }
  });
  function startObserver() {
    if (!document.body) { requestAnimationFrame(startObserver); return; }
    mo.observe(document.body, { childList: true });
  }
  startObserver();
  new MutationObserver(() => {
    if (banner.dataset.closed) return;
    mo.disconnect();
    startObserver();
    showBanner();
  }).observe(document.documentElement, { childList: true });
})();
