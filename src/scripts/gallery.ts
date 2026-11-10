function initViewer(gallery: HTMLElement, shots: HTMLAnchorElement[]) {
  const dialog = gallery.querySelector<HTMLDialogElement>('.g-viewer');
  const image = dialog?.querySelector<HTMLImageElement>('.g-large');
  const count = dialog?.querySelector<HTMLElement>('.g-count');
  const close = dialog?.querySelector<HTMLButtonElement>('.g-close');
  if (!dialog || !image || !count || !close || !shots.length || typeof dialog.showModal !== 'function') return;

  const format = new Intl.NumberFormat('ar-JO');
  let opener: HTMLAnchorElement | undefined;
  let selected = 0;

  const show = (index: number) => {
    selected = (index + shots.length) % shots.length;
    const shot = shots[selected]!;
    image.alt = shot.querySelector('img')?.alt ?? '';
    image.src = shot.href;
    count.textContent = `الصورة ${format.format(selected + 1)} من ${format.format(shots.length)}`;
  };

  shots.forEach((shot, index) => {
    shot.addEventListener('click', event => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      try {
        dialog.showModal();
      } catch {
        return;
      }
      event.preventDefault();
      opener = shot;
      show(index);
    });
  });

  close.addEventListener('click', () => dialog.close());
  for (const button of dialog.querySelectorAll<HTMLButtonElement>('[data-gallery-step]')) {
    button.addEventListener('click', () => show(selected + Number(button.dataset.galleryStep)));
  }
  dialog.addEventListener('keydown', event => {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
    event.preventDefault();
    show(selected + (event.key === 'ArrowLeft' ? 1 : -1));
  });
  dialog.addEventListener('close', () => opener?.focus({ preventScroll: true }));
}

const gallery = document.querySelector<HTMLElement>('.gallery-page');
if (gallery) {
  initViewer(gallery, [...gallery.querySelectorAll<HTMLAnchorElement>('.g-shot')]);

  if ('IntersectionObserver' in window && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const reveal = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add('g-enter');
        reveal.unobserve(entry.target);
      }
    }, { threshold: .12 });
    for (const tile of gallery.querySelectorAll('.g-photos li')) reveal.observe(tile);
  }
}
