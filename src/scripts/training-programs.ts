const instances = new Map<HTMLElement, () => void>();

type RtlScrollModel = 'negative' | 'positive-descending' | 'positive-ascending';
let scrollModel: RtlScrollModel | undefined;

/** Detect native coordinates once without moving a reader's scroll position. */
function detectRtlScrollModel(): RtlScrollModel {
  if (scrollModel) return scrollModel;
  const probe = document.createElement('div');
  const content = document.createElement('div');
  probe.dir = 'rtl';
  probe.style.cssText = 'position:fixed;left:-10000px;top:0;width:100px;height:50px;overflow-x:scroll;overflow-y:hidden;visibility:hidden;contain:strict;pointer-events:none;box-sizing:content-box;padding:0;border:0;scroll-behavior:auto;scroll-snap-type:none;scrollbar-gutter:auto';
  content.style.cssText = 'display:block;width:200px;height:1px;max-width:none;box-sizing:content-box;padding:0;border:0;margin:0';
  probe.append(content);
  document.body.append(probe);
  const initial = probe.scrollLeft;
  // Fractional scaling may leave a small positive residue at the RTL start.
  // A substantial negative write identifies negative coordinates reliably.
  probe.scrollLeft = -100;
  if (probe.scrollLeft < -2) scrollModel = 'negative';
  else if (initial > 2) scrollModel = 'positive-descending';
  else scrollModel = 'positive-ascending';
  probe.remove();
  return scrollModel;
}

// Logical progress always increases from the right-hand start to the left end.
// Only this boundary translates to/from the browser's native scrollLeft model.
function rtlProgress(native: number, maximum: number, model: RtlScrollModel): number {
  const progress = model === 'negative' ? -native : model === 'positive-descending' ? maximum - native : native;
  return Math.max(0, Math.min(maximum, progress));
}

function nativeRtlPosition(progress: number, maximum: number, model: RtlScrollModel): number {
  const value = Math.max(0, Math.min(maximum, progress));
  return model === 'negative' ? 0 - value : model === 'positive-descending' ? maximum - value : value;
}

function initialize(root: HTMLElement): (() => void) | undefined {
  const track = root.querySelector<HTMLElement>('.lineup-track');
  const items = [...root.querySelectorAll<HTMLElement>('.lineup-item')];
  const controls = root.querySelector<HTMLElement>('.lineup-controls');
  const previous = root.querySelector<HTMLButtonElement>('[data-program-prev]');
  const next = root.querySelector<HTMLButtonElement>('[data-program-next]');
  const status = root.querySelector<HTMLElement>('.lineup-status');
  if (!track || items.length < 2 || !controls || !previous || !next || !status) return;
  const controller = new AbortController();
  const { signal } = controller;
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const measurePitch = (): number => Math.abs(items[0]!.offsetLeft - items[1]!.offsetLeft);
  let pitch = measurePitch();
  if (!pitch) return;
  let maximum = Math.max(0, track.scrollWidth - track.clientWidth);
  const model = detectRtlScrollModel();
  const position = (): number => rtlProgress(track.scrollLeft, maximum, model);
  let viewport = track.clientWidth;
  let lastPosition = position();
  let target = lastPosition;
  let navigating = false;
  let userNavigation = false;
  let settleTimer = 0;
  let lastAnnouncement = '';
  const clamp = (value: number): number => Math.max(0, Math.min(maximum, value));
  const update = (): void => {
    previous.disabled = position() < 2;
    next.disabled = position() >= maximum - 2;
  };
  const settle = (): void => {
    clearTimeout(settleTimer);
    lastPosition = target = clamp(position());
    navigating = false;
    root.removeAttribute('data-moving');
    update();
    if (!userNavigation) return;
    const index = maximum > 0 && target >= maximum - 2 ? items.length - 1 : Math.min(items.length - 1, Math.round(target / pitch));
    const item = items[index]!;
    const announcement = `${item.querySelector('h3')?.textContent}، ${item.querySelector('.lineup-age')?.textContent}`;
    if (announcement !== lastAnnouncement) status.textContent = lastAnnouncement = announcement;
    userNavigation = false;
  };
  const go = (value: number, immediate = motion.matches): void => {
    clearTimeout(settleTimer);
    target = clamp(value);
    navigating = true;
    userNavigation = true;
    root.setAttribute('data-moving', '');
    track.scrollTo({ left: nativeRtlPosition(target, maximum, model), behavior: immediate ? 'instant' : 'smooth' });
    // Also settle unchanged endpoints and browsers without scrollend support.
    settleTimer = window.setTimeout(settle, immediate ? 0 : 180);
  };
  const move = (direction: number): void => go((navigating ? target : position()) + direction * pitch);
  const interrupt = (): void => {
    if (navigating) track.scrollTo({ left: track.scrollLeft, behavior: 'instant' });
    navigating = false;
    target = lastPosition = position();
    root.removeAttribute('data-moving');
    userNavigation = true;
  };
  previous.addEventListener('click', () => move(-1), { signal });
  next.addEventListener('click', () => move(1), { signal });
  track.addEventListener('keydown', event => {
    if (event.target !== track || event.altKey || event.ctrlKey || event.metaKey) return;
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    if (event.key === 'Home' || event.key === 'End') go(event.key === 'Home' ? 0 : maximum);
    else move(event.key === 'ArrowLeft' ? 1 : -1);
  }, { signal });
  track.addEventListener('pointerdown', interrupt, { passive: true, signal });
  track.addEventListener('wheel', interrupt, { passive: true, signal });
  track.addEventListener('scroll', () => {
    // Native snap may run before ResizeObserver. Keep the previous geometry's
    // anchor until the observer has mapped it to the new card pitch.
    if (track.clientWidth !== viewport || measurePitch() !== pitch) return;
    lastPosition = position();
    update();
    clearTimeout(settleTimer);
    settleTimer = window.setTimeout(settle, 160);
  }, { passive: true, signal });
  track.addEventListener('scrollend', () => {
    if (track.clientWidth !== viewport || measurePitch() !== pitch) return;
    // A focus scroll or superseded smooth scroll can finish after a newer go().
    if (!navigating || Math.abs(position() - target) < 2) settle();
  }, { signal });
  motion.addEventListener('change', () => {
    if (navigating) go(target, true);
  }, { signal });
  const resize = new ResizeObserver(() => {
    const newPitch = measurePitch();
    const newViewport = track.clientWidth;
    if (pitch === newPitch && viewport === newViewport) return;
    // Keep the same logical card (or pinned end), even across card breakpoints.
    const anchor = (navigating ? target : lastPosition) / pitch;
    const atEnd = maximum > 0 && (navigating ? target : lastPosition) >= maximum - 2;
    pitch = newPitch;
    viewport = newViewport;
    maximum = Math.max(0, track.scrollWidth - viewport);
    go(atEnd ? maximum : anchor * pitch, true);
  });
  resize.observe(track);
  resize.observe(items[0]!);
  update();
  controls.hidden = false;
  root.setAttribute('data-enhanced', '');
  return () => {
    clearTimeout(settleTimer);
    controller.abort();
    resize.disconnect();
    if (navigating) track.scrollTo({ left: track.scrollLeft, behavior: 'instant' });
    controls.hidden = true;
    root.removeAttribute('data-enhanced');
    root.removeAttribute('data-moving');
    instances.delete(root);
    if (!instances.size) removalObserver.disconnect();
  };
}

const removalObserver = new MutationObserver(() => {
  for (const [root, dispose] of instances) if (!root.isConnected) dispose();
});

/** Each root is enhanced once; disposing returns it to fully usable native overflow. */
export function initTrainingPrograms(scope: ParentNode = document): () => void {
  const roots = scope instanceof HTMLElement && scope.matches('[data-training-programs]')
    ? [scope] : [...scope.querySelectorAll<HTMLElement>('[data-training-programs]')];
  roots.forEach(root => {
    if (instances.has(root)) return;
    const dispose = initialize(root);
    if (dispose) instances.set(root, dispose);
  });
  if (instances.size) removalObserver.observe(document.body, { childList: true, subtree: true });
  return () => roots.forEach(root => instances.get(root)?.());
}
const disposeAll = (): void => {
  instances.forEach(dispose => dispose());
  removalObserver.disconnect();
};
document.addEventListener('astro:before-swap', disposeAll);
document.addEventListener('astro:page-load', () => { initTrainingPrograms(); });
window.addEventListener('pagehide', disposeAll);
window.addEventListener('pageshow', () => { initTrainingPrograms(); });
