import { headerNavigation, normalizeHeaderQuery, searchHeaderNavigation } from '../data/header-navigation';
type HeaderState = 'closed' | 'menu' | 'search';
const initialized = new WeakMap<HTMLElement, MediaQueryList>();
export function initNavigation(): void {
  const header = document.querySelector<HTMLElement>('[data-header]');
  if (!header || initialized.has(header)) return;
  const shell = header.querySelector<HTMLElement>('.notch-shell')!;
  const menuButton = header.querySelector<HTMLButtonElement>('[data-menu-open]')!;
  const searchButtons = [...header.querySelectorAll<HTMLButtonElement>('[data-search-open]')];
  const menu = header.querySelector<HTMLElement>('[data-menu-panel]')!;
  const search = header.querySelector<HTMLElement>('[data-search-panel]')!;
  const input = header.querySelector<HTMLInputElement>('[data-search-input]')!;
  const clear = header.querySelector<HTMLButtonElement>('[data-search-clear]')!;
  const results = header.querySelector<HTMLElement>('[data-search-results]')!;
  const empty = header.querySelector<HTMLElement>('[data-search-empty]')!;
  const status = header.querySelector<HTMLElement>('[data-search-status]')!;
  if (!shell || !menuButton || !menu || !search || !input || !clear || !results || !empty || !status) return;
  header.dataset.headerReady = 'true';
  const entrancePreference = matchMedia('(prefers-reduced-motion: reduce)');
  if (!entrancePreference.matches) {
    header.dataset.headerEntering = 'true';
    const finishEntrance = (): void => { header.removeAttribute('data-header-entering'); };
    shell.addEventListener('animationend', finishEntrance, { once: true });
    entrancePreference.addEventListener('change', event => { if (event.matches) finishEntrance(); }, { once: true });
    window.setTimeout(finishEntrance, 650);
  }
  menuButton.hidden = false; searchButtons.forEach(button => { button.hidden = false; });
  const background = [...document.querySelectorAll<HTMLElement>('[data-page-background]')];
  const desktop = matchMedia('(min-width: 834px)');
  initialized.set(header, desktop);
  // Static HTML can only know the pathname. Native fragment/history changes
  // refine that homepage state without intercepting anchors or observing scroll.
  const currentLinks = header.querySelectorAll<HTMLAnchorElement>('.notch-desktop-links a, .notch-mobile-links a');
  function syncCurrent(): void {
    const href = location.pathname === '/'
      ? headerNavigation.find(link => link.href === `/${location.hash}`)?.href ?? '/'
      : null;
    currentLinks.forEach(link => {
      if (link.getAttribute('href') === href) link.setAttribute('aria-current', href === '/' ? 'page' : 'location');
      else link.removeAttribute('aria-current');
    });
  }
  syncCurrent();
  window.addEventListener('hashchange', syncCurrent);
  window.addEventListener('popstate', syncCurrent);
  window.addEventListener('pageshow', syncCurrent);
  const isDesktop = (): boolean => initialized.get(header!)!.matches;
  let state: HeaderState = 'closed', initiator: HTMLElement | null = null;
  let savedBody: string | null = null, savedHeader: string | null = null;
  let savedInert: boolean[] = [], position = { x: 0, y: 0 };
  let timer: ReturnType<typeof setTimeout> | undefined;
  const focusables = (): HTMLElement[] => [...header.querySelectorAll<HTMLElement>('a[href],button:not([disabled]),input:not([disabled]),[tabindex="0"]')]
    .filter(element => !element.closest('[hidden],[inert]') && element.checkVisibility({ visibilityProperty: true }));
  function render(): void {
    const matches = searchHeaderNavigation(input.value), query = normalizeHeaderQuery(input.value);
    results.querySelectorAll<HTMLElement>('li').forEach(row => {
      row.hidden = !query || !matches.some(entry => entry.href === row.querySelector('a')?.getAttribute('href'));
    });
    clear.hidden = !input.value.length; results.hidden = !query || !matches.length; empty.hidden = !query || !!matches.length;
    status.textContent = !query ? '' : matches.length ? `عدد النتائج: ${matches.length}` : 'لا توجد نتائج مطابقة.';
  }
  function controls(): void {
    menuButton.setAttribute('aria-expanded', String(state !== 'closed'));
    menuButton.setAttribute('aria-controls', state === 'search' ? 'header-search' : 'mobile-menu');
    menuButton.setAttribute('aria-label', state === 'closed' ? 'القائمة' : state === 'search' ? 'إغلاق البحث' : 'إغلاق القائمة');
    searchButtons.forEach(button => button.setAttribute('aria-expanded', String(state === 'search')));
  }
  function close(immediate = false, returnFocus = true): void {
    if (state === 'closed') return;
    state = 'closed'; header!.dataset.state = state; controls();
    header!.removeAttribute('role'); header!.removeAttribute('aria-modal'); header!.removeAttribute('aria-label');
    menu.inert = search.inert = true;
    background.forEach((element, index) => { element.inert = savedInert[index] ?? false; });
    if (savedBody === null) document.body.removeAttribute('style'); else document.body.setAttribute('style', savedBody);
    if (savedHeader === null) header!.removeAttribute('style'); else header!.setAttribute('style', savedHeader);
    window.scrollTo(position.x, position.y);
    if (returnFocus) {
      const target = initiator?.checkVisibility({ visibilityProperty: true }) && !initiator.closest('[hidden],[inert]')
        ? initiator : !isDesktop() ? menuButton : header!.querySelector<HTMLElement>('.brand');
      target?.focus({ preventScroll: true });
    }
    clearTimeout(timer);
    const finish = (): void => {
      menu.hidden = search.hidden = true;
      // Preserve an absent attribute after Chromium's scroll/focus restoration.
      if (savedBody === null && document.body.getAttribute('style') === '') document.body.removeAttribute('style');
    };
    if (immediate || matchMedia('(prefers-reduced-motion: reduce)').matches) finish(); else timer = setTimeout(finish, 330);
  }
  function open(next: Exclude<HeaderState, 'closed'>, control: HTMLButtonElement): void {
    if (next === 'menu' && isDesktop()) return;
    if (state === next) { close(); return; }
    if (state !== 'closed') close(true, false);
    clearTimeout(timer); initiator = control; position = { x: scrollX, y: scrollY };
    savedBody = document.body.getAttribute('style'); savedHeader = header!.getAttribute('style'); savedInert = background.map(element => element.inert);
    const rect = header!.getBoundingClientRect(), gap = innerWidth - document.documentElement.clientWidth;
    const padding = parseFloat(getComputedStyle(document.body).paddingRight) || 0;
    Object.assign(header!.style, { left: `${Math.max(0, rect.left)}px`, right: `${Math.max(0, innerWidth - rect.right)}px`, width: 'auto' });
    Object.assign(document.body.style, { position: 'fixed', top: `${-position.y}px`, left: `${-position.x}px`, width: '100%', overflow: 'hidden' });
    if (gap > 0) document.body.style.paddingRight = `${padding + gap}px`;
    background.forEach(element => { element.inert = true; });
    menu.hidden = menu.inert = next !== 'menu'; search.hidden = search.inert = next !== 'search';
    header!.setAttribute('role', 'dialog'); header!.setAttribute('aria-modal', 'true'); header!.setAttribute('aria-label', next === 'menu' ? 'قائمة التنقل' : 'البحث في زيغان');
    void shell.offsetHeight; state = next; header!.dataset.state = state; controls();
    if (next === 'search') { render(); input.focus({ preventScroll: true }); } else menuButton.focus({ preventScroll: true });
  }
  menuButton.addEventListener('click', () => state === 'closed' ? open('menu', menuButton) : close());
  searchButtons.forEach(button => button.addEventListener('click', () => open('search', button)));
  header.querySelector('[data-search-close]')?.addEventListener('click', () => close());
  header.querySelectorAll('a[href]').forEach(link => link.addEventListener('click', () => close(true, false)));
  input.addEventListener('input', render);
  clear.addEventListener('click', () => { input.value = ''; render(); input.focus({ preventScroll: true }); });
  input.addEventListener('keydown', event => {
    if (event.isComposing || !['ArrowDown', 'Enter'].includes(event.key)) return;
    event.preventDefault(); const first = results.querySelector<HTMLAnchorElement>('li:not([hidden]) a');
    if (event.key === 'Enter') first?.click(); else first?.focus();
  });
  results.addEventListener('keydown', event => {
    if (!['ArrowDown', 'ArrowUp'].includes(event.key)) return;
    event.preventDefault(); const links = [...results.querySelectorAll<HTMLAnchorElement>('li:not([hidden]) a')];
    const index = links.indexOf(document.activeElement as HTMLAnchorElement);
    if (event.key === 'ArrowUp' && index <= 0) input.focus(); else links[(index + (event.key === 'ArrowDown' ? 1 : -1) + links.length) % links.length]?.focus();
  });
  document.addEventListener('keydown', event => {
    if (state === 'closed') return;
    if (event.key === 'Escape') { event.preventDefault(); close(); return; }
    if (event.key !== 'Tab') return;
    const items = focusables();
    if (event.shiftKey && document.activeElement === items[0]) { event.preventDefault(); items.at(-1)?.focus(); }
    else if (!event.shiftKey && document.activeElement === items.at(-1)) { event.preventDefault(); items[0]?.focus(); }
  });
  document.addEventListener('focusin', event => {
    if (state !== 'closed' && event.target instanceof Node && !header!.contains(event.target)) focusables()[0]?.focus({ preventScroll: true });
  });
  document.addEventListener('pointerdown', event => {
    if (state !== 'closed' && event.target instanceof Node && !shell.contains(event.target)) {
      event.preventDefault(); // The outside click must not steal restored focus.
      close();
    }
  });
  desktop.addEventListener('change', () => { if (isDesktop() && state === 'menu') close(true); });
  window.addEventListener('pagehide', () => close(true, false));
}
