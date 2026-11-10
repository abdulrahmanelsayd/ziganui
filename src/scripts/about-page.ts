/** One-time enhancements for the dedicated About page; content is visible by default. */
export function initAboutPage(): void {
  const root = document.getElementById('about-page');
  if (!root || root.dataset.aboutInitialized === 'true') return;
  root.dataset.aboutInitialized = 'true';

  const nodes = [...root.querySelectorAll<HTMLElement>('[data-about-motion]')];
  const preference = matchMedia('(prefers-reduced-motion: reduce)');
  let observer: IntersectionObserver | undefined;
  const show = (node: Element): void => {
    node.classList.remove('about-waiting');
    node.classList.add('about-visible');
    observer?.unobserve(node);
  };
  const showAll = (): void => {
    observer?.disconnect();
    nodes.forEach(show);
  };
  if (!('IntersectionObserver' in window) || preference.matches) return;
  try {
    observer = new IntersectionObserver(entries => {
      entries.forEach(entry => { if (entry.isIntersecting) show(entry.target); });
    }, { threshold: .04, rootMargin: '0px 0px -28px 0px' });
    root.classList.add('about-enhanced');
    nodes.forEach(node => {
      node.style.setProperty('--about-delay', Math.min(140, Number(node.dataset.aboutDelay) || 0) + 'ms');
      if (node.getBoundingClientRect().top < innerHeight - 28) show(node);
      else {
        // Observe before preparing: failures must never strand hidden content.
        observer!.observe(node);
        node.classList.add('about-waiting');
      }
    });
    root.addEventListener('focusin', event => {
      const node = event.target instanceof Element ? event.target.closest('[data-about-motion]') : null;
      if (node) show(node);
    });
    preference.addEventListener('change', event => { if (event.matches) showAll(); });
    window.addEventListener('beforeprint', showAll);
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) nodes.forEach(node => {
        const rect = node.getBoundingClientRect();
        if (rect.top < innerHeight && rect.bottom > 0) show(node);
      });
    });
  } catch { showAll(); }
}
