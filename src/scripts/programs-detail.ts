/** Finite enhancements for the dedicated Programs page; HTML is visible by default. */
export function initProgramsPage(): void {
  const root = document.getElementById('programs-page');
  if (!root || root.dataset.pInitialized === 'true') return;
  root.dataset.pInitialized = 'true';

  const nodes = [...root.querySelectorAll<HTMLElement>('[data-p-motion]')];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let observer: IntersectionObserver | undefined;
  const show = (node: Element): void => {
    node.classList.remove('p-waiting');
    node.classList.add('p-visible');
    observer?.unobserve(node);
  };
  const showAll = (): void => { observer?.disconnect(); nodes.forEach(show); };
  if ('IntersectionObserver' in window && !reduced.matches) {
    try {
      observer = new IntersectionObserver(entries => {
        entries.forEach(entry => { if (entry.isIntersecting) show(entry.target); });
      }, { threshold: .04, rootMargin: '0px 0px -28px 0px' });
      root.classList.add('p-enhanced');
      nodes.forEach(node => {
        node.style.setProperty('--p-delay', Math.min(140, Number(node.dataset.pDelay) || 0) + 'ms');
        if (node.getBoundingClientRect().top < innerHeight - 28) show(node);
        else {
          // Observation must succeed before a block can be hidden.
          observer!.observe(node);
          node.classList.add('p-waiting');
        }
      });
      root.addEventListener('focusin', event => {
        const node = event.target instanceof Element ? event.target.closest('[data-p-motion]') : null;
        if (node) show(node);
      });
      reduced.addEventListener('change', event => { if (event.matches) showAll(); });
      window.addEventListener('beforeprint', showAll);
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden) nodes.forEach(node => {
          const box = node.getBoundingClientRect();
          if (box.top < innerHeight && box.bottom > 0) show(node);
        });
      });
    } catch { showAll(); }
  }

  const links = [...root.querySelectorAll<HTMLAnchorElement>('.p-nav-links a')];
  const programs = [...root.querySelectorAll<HTMLElement>('[data-program-id]')];
  const visible = new Map<string, Element>();
  let selection: { id: string; hasEnteredBand: boolean } | undefined;
  const activate = (id: string): void => links.forEach(link => {
    if (link.hash === '#' + id) link.setAttribute('aria-current', 'location');
    else link.removeAttribute('aria-current');
  });
  links.forEach(link => link.addEventListener('click', () => {
    const id = link.hash.slice(1);
    selection = { id, hasEnteredBand: visible.has(id) };
    activate(id);
  }));
  if ('IntersectionObserver' in window) {
    let navigation: IntersectionObserver | undefined;
    const rebuildNavigation = (): void => {
      navigation?.disconnect();
      visible.clear();
      activate('');
      // Percent root margins resolve against width. Pixels keep a nonempty
      // observation band on wide, short viewports, without a scroll loop.
      const topInset = Math.min(130, Math.max(0, innerHeight - 96));
      const bottomInset = Math.min(Math.round(innerHeight * .4), Math.max(0, innerHeight - topInset - 48));
      try {
        navigation = new IntersectionObserver((entries, current) => {
          if (current !== navigation) return;
          entries.forEach(entry => {
            const { id } = entry.target;
            if (entry.isIntersecting) visible.set(id, entry.target);
            else visible.delete(id);

            // Ignore an out-of-band entry while the native anchor is still arriving.
            if (selection?.id === id) {
              if (entry.isIntersecting) selection.hasEnteredBand = true;
              else if (selection.hasEnteredBand) selection = undefined;
            }
          });
          const selected = selection && visible.get(selection.id);
          const active = selected ?? [...visible.values()].sort((a, b) =>
            Math.abs(a.getBoundingClientRect().top - 150) - Math.abs(b.getBoundingClientRect().top - 150))[0];
          activate(active?.id || '');
        }, { rootMargin: `-${topInset}px 0px -${bottomInset}px 0px`, threshold: 0 });
        programs.forEach(program => navigation!.observe(program));
      } catch { navigation?.disconnect(); visible.clear(); activate(''); }
    };
    rebuildNavigation();
    window.addEventListener('resize', rebuildNavigation);
  }
}
