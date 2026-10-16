/**
 * One entry per book page. `pre` runs before recording, `rec` is what the motion loop shows.
 * `still: 'before'` takes the still at the start of the recording instead of the end, so the
 * page rests on the video's first frame. `boomerang: true` plays the clip forward then back;
 * `frames: { to, count, settle, method }` records frame by frame at 60 fps (see capture.mjs);
 * `speed` bakes a speed-up into the encoded clip.
 * Step types: { wait: ms } | { wheel: px, ms } | { scroll: targetScrollY, ms } | { mouse: [[x0, y0], [x1, y1]], ms }
 * Scroll positions were mapped with capture/map.mjs.
 */
const COLOGNE = 'https://leecodeswell.github.io/cologne/'
const AETERNUM = 'https://leecodeswell.github.io/3Dexample/'
const ARES = 'https://ares-web.com/'

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
]
