/** Bind once, including repeated page-load events while the gate is pending. */
export function initHeadquartersMap(root: ParentNode = document): void {
  for (const frame of root.querySelectorAll<HTMLIFrameElement>('.hq-section .hq-map-js[data-map-src]')) {
    if (frame.dataset.mapBound) continue;
    frame.dataset.mapBound = 'true';
    const load = () => {
      const source = frame.dataset.mapSrc;
      if (!source) return;
      frame.src = source;
      delete frame.dataset.mapSrc;
    };
    if (typeof window.IntersectionObserver !== 'function') {
      load();
      continue;
    }
    const observer = new IntersectionObserver(entries => {
      if (!entries.some(entry => entry.isIntersecting)) return;
      observer.disconnect();
      load();
    }, { rootMargin: '600px 0px' });
    observer.observe(frame);
  }
}

// Astro bundles this module once; reinitialization never installs new listeners.
document.addEventListener('astro:page-load', () => initHeadquartersMap());
