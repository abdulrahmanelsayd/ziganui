/** Progressive enhancement: the server-rendered grid remains readable without JS. */
export function initPlayerShowcases(root: ParentNode = document): void {
  for (const fan of root.querySelectorAll<HTMLElement>('[data-players-fan]')) {
    if (fan.dataset.enhanced) continue;
    const stage = fan.querySelector<HTMLElement>('.players-stage');
    const cards = [...fan.querySelectorAll<HTMLElement>('[data-player-index]')];
    const thumbs = [...fan.querySelectorAll<HTMLButtonElement>('[data-player-select]')];
    const count = fan.querySelector<HTMLElement>('[data-player-count]');
    const controls = fan.querySelector<HTMLElement>('.players-controls');
    const next = fan.querySelector<HTMLButtonElement>('[data-player-next]');
    const previous = fan.querySelector<HTMLButtonElement>('[data-player-previous]');
    const n = cards.length;
    if (!n || !stage || !count || !controls || !next || !previous || thumbs.length !== n) continue;
    const mobile = matchMedia('(max-width:767px)');
    const number = (value: number) => value.toLocaleString('ar-JO', { useGrouping: false });
    let active = 0;
    let drag: { id: number; x: number; y: number; dx: number; horizontal: boolean; target: HTMLElement | null } | null = null;
    function render(index: number, announce = true): void {
      active = ((index % n) + n) % n;
      for (let i = 0; i < n; i++) {
        let d = (i - active + n) % n;
        if (d > n / 2) d -= n;
        const distance = Math.abs(d), a = Math.min(3, distance), sign = Math.sign(d);
        const x = (mobile.matches ? [0, 10, 19, 28] : [0, 25, 46, 65])[a]!;
        const angle = (mobile.matches ? [0, 5, 9, 13] : [0, 8, 14, 20])[a]!;
        const scale = (mobile.matches ? [1, .91, .79, .67] : [1, .92, .82, .72])[a];
        const card = cards[i]!;
        card.hidden = distance > 3;
        card.style.setProperty('--card-x', `${sign * x}%`);
        card.style.setProperty('--card-y', `${[0, 1, 4, 8][a]}%`);
        card.style.setProperty('--card-angle', `${sign * angle}deg`);
        card.style.setProperty('--card-scale', String(scale));
        card.style.setProperty('--card-layer', String(9 - a));
        card.dataset.active = String(i === active);
        card.setAttribute('aria-hidden', String(i !== active));
        thumbs[i]!.setAttribute('aria-pressed', String(i === active));
      }
      fan.dataset.active = String(active);
      if (announce) count!.textContent = `${number(active + 1)} / ${number(n)}`;
    }
    fan.dataset.enhanced = 'true';
    render(0);
    if (n === 1) { stage.style.cursor = 'default'; continue; }
    // Larger future collections wrap their choices; the approved seven stay identical.
    if (n > 7) {
      const group = fan.querySelector<HTMLElement>('.players-thumbs');
      if (group) { group.style.flexWrap = 'wrap'; group.style.maxWidth = '100%'; }
      controls.style.width = '100%';
    }
    stage.tabIndex = 0;
    if (fan.dataset.instructionId) stage.setAttribute('aria-describedby', fan.dataset.instructionId);
    controls.hidden = false;
    thumbs.forEach((thumb, i) => thumb.addEventListener('click', () => render(i)));
    next.addEventListener('click', () => render(active + 1));
    previous.addEventListener('click', () => render(active - 1));
    stage.addEventListener('keydown', e => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
      e.preventDefault();
      render(e.key === 'Home' ? 0 : e.key === 'End' ? n - 1 : active + (e.key === 'ArrowLeft' ? 1 : -1));
    });
    mobile.addEventListener('change', () => render(active, false));
    stage.addEventListener('pointerdown', e => {
      if (e.button !== 0 || drag) return;
      drag = { id: e.pointerId, x: e.clientX, y: e.clientY, dx: 0, horizontal: false, target: e.target instanceof Element ? e.target.closest<HTMLElement>('[data-player-index]') : null };
      stage.setPointerCapture(e.pointerId);
    });
    stage.addEventListener('pointermove', e => {
      if (!drag || drag.id !== e.pointerId) return;
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      if (!drag.horizontal && Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy) * 1.25) drag.horizontal = true;
      if (!drag.horizontal) return;
      e.preventDefault(); drag.dx = dx; fan.classList.add('is-dragging');
      stage.style.setProperty('--player-drag-x', `${Math.max(-180, Math.min(180, dx))}px`);
      stage.style.setProperty('--player-drag-angle', `${Math.max(-7, Math.min(7, dx * .025))}deg`);
    }, { passive: false });
    function finish(e: PointerEvent, cancel = false): void {
      if (!drag || drag.id !== e.pointerId) return;
      const value = drag; drag = null; fan.classList.remove('is-dragging');
      stage!.style.removeProperty('--player-drag-x'); stage!.style.removeProperty('--player-drag-angle');
      if (stage!.hasPointerCapture(e.pointerId)) stage!.releasePointerCapture(e.pointerId);
      if (cancel) return;
      if (value.horizontal && Math.abs(value.dx) > Math.max(34, stage!.clientWidth * .08)) render(active + (value.dx < 0 ? 1 : -1));
      else if (!value.horizontal && value.target) render(Number(value.target.dataset.playerIndex));
    }
    stage.addEventListener('pointerup', e => finish(e));
    stage.addEventListener('pointercancel', e => finish(e, true));
    stage.addEventListener('lostpointercapture', e => finish(e, true));
  }
}
initPlayerShowcases();
document.addEventListener('astro:page-load', () => initPlayerShowcases());
