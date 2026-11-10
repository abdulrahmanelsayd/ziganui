// The simplex-noise attribution and MIT license are in /licenses/academy-noise.txt.
const initialized = new WeakSet<HTMLElement>();

export function initAcademyAbout(): void {
  document.querySelectorAll<HTMLElement>('[data-academy-about]').forEach(initialize);
}

function initialize(section: HTMLElement): void {
  if (initialized.has(section)) return;
  const canvas = section.querySelector<HTMLCanvasElement>('.academy-field canvas');
  const button = section.querySelector<HTMLButtonElement>('.academy-motion');
  const statement = section.querySelector<HTMLElement>('.academy-statement');
  if (!canvas || !button || !statement) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  // Cache preference state from events. Chromium can swallow a change event
  // when a per-frame .matches read consumes its pending media-query update.
  let prefersReducedMotion = reduced.matches;
  initialized.add(section);
  const tracks = [...section.querySelectorAll<HTMLElement>('.academy-marquee-track')];
  const lines = [...statement.querySelectorAll<HTMLElement>('.statement-line')];
  let revealed = false;
  let revealObserver: IntersectionObserver | undefined;
  let revealTimer = 0;
  const finishLine = (line: HTMLElement): void => {
    line.classList.remove('is-revealing', 'is-playing');
    line.style.removeProperty('--line-delay');
  };
  const finishReveal = (): void => {
    revealed = true;
    revealObserver?.disconnect();
    window.clearTimeout(revealTimer);
    lines.forEach(finishLine);
  };
  const reveal = (): void => {
    if (revealed) return;
    revealed = true;
    revealObserver?.disconnect();
    lines.forEach((line, index) => {
      line.style.setProperty('--line-delay', `${index * .15}s`);
      line.classList.add('is-playing');
    });
    // Also clear covers if an animation-end event is suppressed by the browser.
    revealTimer = window.setTimeout(finishReveal, 1600);
  };
  lines.forEach(line => line.addEventListener('animationend', event => {
    if (event.target === line && event.pseudoElement === '::after') finishLine(line);
  }));
  if (prefersReducedMotion || !('IntersectionObserver' in window)) finishReveal();
  else {
    lines.forEach(line => line.classList.add('is-revealing'));
    // A pixel margin makes the trigger exactly 90% of viewport height, including
    // short laptop viewports (percentage root margins are relative to width).
    const observeReveal = (): void => {
      revealObserver?.disconnect();
      if (revealed) return;
      revealObserver = new IntersectionObserver(entries => {
        if (entries.some(entry => entry.isIntersecting)) reveal();
      }, { rootMargin: `0px 0px -${innerHeight * .1}px 0px` });
      revealObserver.observe(statement);
    };
    observeReveal();
    window.addEventListener('resize', observeReveal, { passive: true });
  }

  let paused = false;
  let visible = false;
  let pageActive = true;
  let running = false;
  let frame = 0;
  let last = 0;
  let elapsed = 0;
  const modulo = (value: number, period: number): number => ((value % period) + period) % period;
  const rowStates = tracks.map(track => ({ track, pitch: 0, offset: 0 }));
  let rowsReady = false;
  let scrollSpeed = 0;
  let smoothedSpeed = 0;
  let scrollTime = performance.now();
  function measureRows(): void {
    section.classList.add('rows-loop-ready');
    rowStates.forEach(state => {
      const original = state.track.firstElementChild as HTMLElement;
      if (!original) return;
      state.track.querySelectorAll('[data-loop-copy]').forEach(copy => copy.remove());
      const gap = parseFloat(getComputedStyle(state.track).columnGap) || 0;
      const textWidth = original.getBoundingClientRect().width;
      const pitch = textWidth + gap;
      if (!pitch) return;
      const previousPitch = state.pitch;
      const previousOffset = state.offset;
      state.pitch = pitch;
      state.offset = previousPitch ? previousOffset / previousPitch * pitch : modulo(pitch - (section.clientWidth - textWidth) / 2, pitch);
      const copies = Math.ceil(section.clientWidth / pitch) + 3;
      for (let i = 1; i < copies; i++) {
        const copy = original.cloneNode(true) as HTMLElement;
        copy.dataset.loopCopy = '';
        copy.setAttribute('aria-hidden', 'true');
        state.track.append(copy);
      }
      if (!prefersReducedMotion) state.track.style.transform = `translate3d(${-state.offset}px,0,0)`;
    });
    rowsReady = true;
    if (prefersReducedMotion) section.classList.remove('rows-loop-ready');
  }
  document.fonts.ready.then(measureRows);
  window.addEventListener('resize', measureRows, { passive: true });
  let previousScroll = scrollY;
  let mouse: [number, number] = [.5, .5];
  const eased: [number, number] = [.5, .5];
  let pace = 0;
  const fine = matchMedia('(pointer:fine)');

  let gl: WebGLRenderingContext | null = null;
  let program: WebGLProgram | null = null;
  let buffer: WebGLBuffer | null = null;
  const shaders: WebGLShader[] = [];
  const loc: Partial<Record<'resolution' | 'time' | 'mouse' | 'pace', WebGLUniformLocation | null>> = {};
  let width = 0;
  let height = 0;
  let ready = false;
  let resizeFrame = 0;

  /* 3D simplex noise algorithm: Ian McEwan / Ashima Arts, 2011, MIT license.
     Approved scene: aspect-correct coordinates, scale=1, distortion=.5,
     detail=3, speed=.1. Shader mathematics are byte-identical to proof 02. */
  const fragment = `precision highp float;
  uniform vec2 resolution;uniform float time;uniform vec2 mouse;uniform float pace;
  vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
  vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
  vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}
  vec4 invSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
  float simplex(vec3 v){
    const vec2 C=vec2(1.0/6.0,1.0/3.0);const vec4 D=vec4(0.0,0.5,1.0,2.0);
    vec3 i=floor(v+dot(v,C.yyy));vec3 x0=v-i+dot(i,C.xxx);
    vec3 g=step(x0.yzx,x0.xyz);vec3 l=1.0-g;vec3 i1=min(g.xyz,l.zxy);vec3 i2=max(g.xyz,l.zxy);
    vec3 x1=x0-i1+C.xxx;vec3 x2=x0-i2+C.yyy;vec3 x3=x0-D.yyy;i=mod289(i);
    vec4 p=permute(permute(permute(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));
    float n=0.142857142857;vec3 ns=n*D.wyz-D.xzx;vec4 j=p-49.0*floor(p*ns.z*ns.z);
    vec4 x_=floor(j*ns.z);vec4 y_=floor(j-7.0*x_);vec4 x=x_*ns.x+ns.yyyy;vec4 y=y_*ns.x+ns.yyyy;
    vec4 h=1.0-abs(x)-abs(y);vec4 b0=vec4(x.xy,y.xy);vec4 b1=vec4(x.zw,y.zw);
    vec4 s0=floor(b0)*2.0+1.0;vec4 s1=floor(b1)*2.0+1.0;vec4 sh=-step(h,vec4(0.0));
    vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
    vec3 p0=vec3(a0.xy,h.x);vec3 p1=vec3(a0.zw,h.y);vec3 p2=vec3(a1.xy,h.z);vec3 p3=vec3(a1.zw,h.w);
    vec4 norm=invSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
    vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0);m=m*m;
    return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
  }
  float field(vec2 uv){float aspect=resolution.x/resolution.y;uv.x*=aspect;
    vec2 m=mouse;m.x*=aspect;float cursor=clamp((1.0-distance(m,uv)*3.0)*pace,-.75,1.0);
    float d=.5+simplex(vec3(uv,time*.01))*.5;
    return 3.0*(.5+simplex(vec3(uv+cursor*.15+d*.5,time*.1))*.5);
  }
  void main(){vec2 uv=gl_FragCoord.xy/resolution;float f=field(uv);
    float dx=abs(field(uv+vec2(1.0/resolution.x,0.0))-f);float dy=abs(field(uv+vec2(0.0,1.0/resolution.y))-f);
    float distanceToEdge=abs(fract(f*2.0+.5)-.5);float w=max(dx,dy)*1.2;
    float edge=1.0-smoothstep(w*.25,w*1.25,distanceToEdge);
    gl_FragColor=vec4(mix(vec3(1.0),vec3(1.0,.42,0.0),edge*.22),1.0);
  }`;

  function fallback(): void {
    ready = false;
    section.classList.remove('field-ready');
    if (gl && !gl.isContextLost()) {
      shaders.forEach(shader => gl?.deleteShader(shader));
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
    }
    shaders.length = 0;
    program = null;
    buffer = null;
  }

  function draw(): void {
    if (!ready || !gl) return;
    try {
      if (gl.isContextLost()) { fallback(); return; }
      gl.uniform2f(loc.resolution ?? null, width, height);
      gl.uniform1f(loc.time ?? null, prefersReducedMotion ? 0 : elapsed);
      gl.uniform2f(loc.mouse ?? null, ...eased);
      gl.uniform1f(loc.pace ?? null, prefersReducedMotion ? 0 : pace);
      if (running) {
        // The sticky canvas can be almost entirely above the viewport at the
        // Training boundary. Shade only its visible pixels, using the same
        // full-canvas resolution/coordinates and the unmodified proof shader.
        const box = canvas!.getBoundingClientRect();
        const left = Math.max(0, box.left), right = Math.min(innerWidth, box.right);
        const top = Math.max(0, box.top), bottom = Math.min(innerHeight, box.bottom);
        if (right <= left || bottom <= top) return;
        gl.disable(gl.SCISSOR_TEST);
        gl.clearColor(1, 1, 1, 1);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.enable(gl.SCISSOR_TEST);
        gl.scissor(
          Math.floor((left - box.left) * width / box.width),
          Math.floor((box.bottom - bottom) * height / box.height),
          Math.ceil((right - left) * width / box.width),
          Math.ceil((bottom - top) * height / box.height),
        );
      } else gl.disable(gl.SCISSOR_TEST);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    } catch { fallback(); }
  }

  function resize(): void {
    if (!ready || !gl) return;
    const box = canvas!.getBoundingClientRect();
    const dpr = Math.min(devicePixelRatio, innerWidth < 768 ? 1 : 1.5);
    width = Math.max(1, Math.round(box.width * dpr));
    height = Math.max(1, Math.round(box.height * dpr));
    if (canvas!.width !== width || canvas!.height !== height) {
      canvas!.width = width;
      canvas!.height = height;
      gl.viewport(0, 0, width, height);
    }
    draw();
  }

  function setup(): void {
    try {
      gl = canvas!.getContext('webgl', { alpha: false, antialias: false, powerPreference: 'low-power' });
      if (!gl) return;
      const compile = (kind: number, source: string): WebGLShader => {
        const shader = gl!.createShader(kind);
        if (!shader) throw new Error('Contour shader unavailable');
        shaders.push(shader);
        gl!.shaderSource(shader, source);
        gl!.compileShader(shader);
        if (!gl!.getShaderParameter(shader, gl!.COMPILE_STATUS)) throw new Error('Contour shader unavailable');
        return shader;
      };
      program = gl.createProgram();
      if (!program) throw new Error('Contour program unavailable');
      gl.attachShader(program, compile(gl.VERTEX_SHADER, 'attribute vec2 position;void main(){gl_Position=vec4(position,0.,1.);}'));
      gl.attachShader(program, compile(gl.FRAGMENT_SHADER, fragment));
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error('Contour program unavailable');
      gl.useProgram(program);
      buffer = gl.createBuffer();
      if (!buffer) throw new Error('Contour buffer unavailable');
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
      const position = gl.getAttribLocation(program, 'position');
      if (position < 0) throw new Error('Contour position unavailable');
      gl.enableVertexAttribArray(position);
      gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
      for (const key of ['resolution', 'time', 'mouse', 'pace'] as const) loc[key] = gl.getUniformLocation(program, key);
      shaders.forEach(shader => gl?.deleteShader(shader));
      shaders.length = 0;
      ready = true;
      resize();
      if (ready) section.classList.add('field-ready');
    } catch { fallback(); }
  }

  function tick(now: number): void {
    if (!running) return;
    const dt = Math.min((now - last) / 1000, .05) || 0;
    last = now;
    elapsed += dt;
    if (now - scrollTime > 80) scrollSpeed *= Math.exp(-dt / .12);
    smoothedSpeed += (scrollSpeed - smoothedSpeed) * (1 - Math.exp(-dt / .18));
    pace *= .98;
    eased[0] += (mouse[0] - eased[0]) * .025;
    eased[1] += (mouse[1] - eased[1]) * .025;
    if (rowsReady) {
      const mobile = innerWidth < 768;
      const speed = (mobile ? 18 : 28) + Math.min(mobile ? 60 : 96, smoothedSpeed * .035);
      rowStates.forEach((state, index) => {
        if (!state.pitch) return;
        state.offset = modulo(state.offset + dt * speed * (index === 0 ? 1 : -1), state.pitch);
        state.track.style.transform = `translate3d(${-state.offset}px,0,0)`;
      });
    }
    draw();
    frame = requestAnimationFrame(tick);
  }

  function sync(): void {
    cancelAnimationFrame(frame);
    running = visible && pageActive && !document.hidden && !prefersReducedMotion && !paused;
    section.dataset.academyMotion = prefersReducedMotion ? 'static' : running ? 'running' : paused ? 'paused' : 'suspended';
    if (running) {
      last = performance.now();
      previousScroll = scrollY;
      scrollTime = performance.now();
      scrollSpeed = smoothedSpeed = 0;
      frame = requestAnimationFrame(tick);
    } else if (visible && pageActive && !document.hidden) draw();
  }

  button.addEventListener('click', () => {
    paused = !paused;
    button.setAttribute('aria-pressed', String(paused));
    button.setAttribute('aria-label', paused ? 'تشغيل الحركة' : 'إيقاف الحركة');
    sync();
  });
  button.hidden = prefersReducedMotion;
  window.addEventListener('pointermove', event => {
    if (!running || !fine.matches) return;
    const next: [number, number] = [event.clientX / innerWidth, 1 - event.clientY / innerHeight];
    pace = Math.min(1, Math.hypot(next[0] - mouse[0], next[1] - mouse[1]) * 8);
    mouse = next;
  }, { passive: true });
  window.addEventListener('scroll', () => {
    const now = performance.now();
    if (running) scrollSpeed = Math.min(4000, Math.abs(scrollY - previousScroll) / Math.min(.1, Math.max((now - scrollTime) / 1000, 1 / 120)));
    scrollTime = now;
    previousScroll = scrollY;
  }, { passive: true });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(entries => {
      visible = entries.some(entry => entry.isIntersecting && entry.intersectionRatio > 0);
      sync();
    }, { threshold: .001 }).observe(section);
  } else visible = true;
  if (typeof ResizeObserver !== 'undefined') new ResizeObserver(() => {
    cancelAnimationFrame(resizeFrame);
    resizeFrame = requestAnimationFrame(() => { resizeFrame = 0; resize(); });
  }).observe(canvas);
  else window.addEventListener('resize', resize, { passive: true });
  document.addEventListener('visibilitychange', sync);
  window.addEventListener('pagehide', () => { pageActive = false; sync(); });
  window.addEventListener('pageshow', () => { pageActive = true; sync(); });
  reduced.addEventListener('change', event => {
    prefersReducedMotion = event.matches;
    button.hidden = prefersReducedMotion;
    section.classList.toggle('rows-loop-ready', rowsReady && !prefersReducedMotion);
    if (prefersReducedMotion) {
      finishReveal();
      tracks.forEach(track => track.style.removeProperty('transform'));
    } else {
      rowStates.forEach(state => {
        state.track.style.transform = `translate3d(${-state.offset}px,0,0)`;
      });
    }
    sync();
  });
  canvas.addEventListener('webglcontextlost', event => {
    event.preventDefault();
    fallback();
  });
  setup();
  sync();
}
