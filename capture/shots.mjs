/**
 * One entry per book page. `pre` runs before recording, `rec` is what the motion loop shows.
 * `still: 'before'` takes the still at the start of the recording instead of the end, so the
 * page rests on the video's first frame. `boomerang: true` plays the clip forward then back;
 * `frames: { to, count, settle, method }` records frame by frame at 60 fps (see capture.mjs);
 * `speed` bakes a speed-up into the encoded clip; `full: true` keeps the clip at the still's 3840x2270;
 * `perFrame(i)` hands per-frame state to the site before each frame (AUREL's capture mode).
 * Step types: { wait: ms } | { wheel: px, ms } | { scroll: targetScrollY, ms } | { mouse: [[x0, y0], [x1, y1]], ms }
 * Scroll positions were mapped with capture/map.mjs.
 */
const COLOGNE = 'https://leecodeswell.github.io/cologne/'
const AETERNUM = 'https://leecodeswell.github.io/3Dexample/'
const ARES = 'https://ares-web.com/'
// AUREL is captured from a local build of leecodeswell/LuxuryCar with its render-resolution cap
// raised to a true 2x (src/Scene.jsx dpr={[2,2]}), served at :4180 (vite preview); the live site
// caps itself at 1.5x, which looked soft once stretched across a page.
const AUREL = process.env.AUREL_URL ?? 'http://localhost:4180/'
// AUREL page 2's opening, frame by frame at 60 fps: 0.6 s in the dark, then the strobe — hard flashes
// cutting back to black, irregular like a real strobe catching — then the lights stay on
const AUREL_STROBE = [
  ['dark', 36], ['flash', 2], ['dark', 7], ['flash', 2], ['dark', 10], ['flash', 3], ['dark', 5],
  ['flash', 2], ['dark', 4], ['flash', 2], ['dark', 3], ['flash', 3], ['dark', 2],
].flatMap(([mode, n]) => Array(n).fill(mode))

export const shots = [
  // Lorem Ipsum — hero still (the page itself is live in the book, for the bas-relief cursor effect)
  {
    name: 'cologne-relief',
    url: COLOGNE,
    rec: [
      { mouse: [[300, 300], [1600, 820]], ms: 3000 },
      { mouse: [[1600, 820], [500, 900]], ms: 2500 },
    ],
  },
  // Lorem Ipsum — Aqua Coloniensis filling the screen through to the end of Crystallum (~10 s)
  {
    name: 'cologne-sequence',
    url: COLOGNE,
    pre: [{ scroll: 3000, ms: 2500 }, { wait: 2500 }],
    still: 'before',
    frames: { to: 9300, count: 620, settle: 70 },
  },
  // AETERNUM — from the hero, the movement explodes and turns a full 360 to the end (~10 s)
  {
    name: 'aeternum-explode',
    url: AETERNUM,
    settle: 4000,
    still: 'before',
    frames: { to: 6016, count: 600, settle: 60 },
  },
  // Ares — the welcome with its ivy swaying (real time), played forward then back: a seamless loop
  {
    name: 'ares-intro',
    url: ARES,
    settle: 3000,
    still: 'before',
    boomerang: true,
    rec: [{ wait: 6000 }],
  },
  // Ares — from the title with the soldier's whole head in view, down to the footer
  {
    name: 'ares-journey',
    url: ARES,
    pre: [{ scroll: 2300, ms: 3500 }, { wait: 3000 }],
    still: 'before',
    frames: { to: 13350, method: 'wheel', step: 9, count: 3000, settle: 25 },
  },
  // AUREL — the studio half: first light, side-on panel sweeps, colour light (~8 s)
  {
    name: 'aurel-studio',
    url: AUREL,
    ready: '.loading-screen.loaded',
    pre: [{ wheel: 2, ms: 100 }, { wait: 3000 }], // AUREL lights the car on the first scroll; let it finish
    settle: 4000,
    cursor: [1900, 1120],
    still: 'before',
    full: true,
    frames: { to: 5800, count: 480, settle: 60 },
  },
  // AUREL — picks up as the studio goes dark: the room black, the car lit only by its tail lights;
  // then the strobe fires and the lights come up on the rain, foam, pressure wash and the wet look
  // handed back (~14 s). Lights-out and the flashes are rendered by the site itself (capture mode in
  // the local build: src/capture-mode.jsx), with its clock locked to the frame.
  {
    name: 'aurel-rain',
    url: AUREL,
    ready: '.loading-screen.loaded',
    cursor: [1900, 1120],
    settle: 4000,
    pre: [{ scroll: 7850, ms: 2500 }, { wait: 5000 }],
    still: 'before',
    full: true,
    perFrame: (i) => ({ time: 20 + i / 60, mode: AUREL_STROBE[i] ?? 'normal' }),
    frames: { to: 20000, count: 860, settle: 60 },
  },
]
