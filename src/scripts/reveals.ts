export function initReveals(): void {
  if (!('IntersectionObserver' in window) || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.remove('reveal-ready');
      entry.target.classList.add('reveal-visible');
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.01, rootMargin: '0px 0px -16px 0px' });
  document.querySelectorAll<HTMLElement>('[data-reveal]').forEach((element) => {
    if (element.getBoundingClientRect().top <= window.innerHeight) return;
    observer.observe(element);
    element.classList.add('reveal-ready');
  });
}
