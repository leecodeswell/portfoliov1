/**
 * One entry per book page. `pre` runs before recording, `rec` is what the motion loop shows.
 * `still: 'before'` takes the still at the start of the recording instead of the end, so the
 * page rests on the video's first frame. `boomerang: true` plays the clip forward then back;
 * `appendHead: s` appends the clip's first s seconds again at the end.
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
      { mouse: [[500, 900], [1300, 250]], ms: 2500 },
    ],
  },
  // Lorem Ipsum — from the Aqua Coloniensis film filling the screen to the end of Crystallum
  {
    name: 'cologne-sequence',
    url: COLOGNE,
    pre: [{ scroll: 3000, ms: 2500 }, { wait: 2500 }],
    still: 'before',
    rec: [{ scroll: 9300, ms: 20000 }, { wait: 800 }],
  },
  // AETERNUM — from the hero, the movement explodes into its parts (plays while hovered)
  {
    name: 'aeternum-explode',
    url: AETERNUM,
    settle: 4000,
    still: 'before',
    rec: [{ wait: 400 }, { scroll: 2700, ms: 7000 }, { wait: 1500 }],
  },
  // Ares — welcome with swaying ivy, one quick burst to white, then the welcome again.
  // The book plays it once and then loops only the closing idle tail (see projects.ts loopTail).
  {
    name: 'ares-intro',
    url: ARES,
    settle: 2500,
    still: 'before',
    appendHead: 6,
    rec: [{ wait: 6000 }, { scroll: 1000, ms: 1200 }, { wait: 250 }],
  },
  // Ares — from the title with the soldier's whole head in view, down to the footer
  {
    name: 'ares-journey',
    url: ARES,
    pre: [{ scroll: 2300, ms: 3500 }, { wait: 3000 }],
    still: 'before',
    rec: [{ scroll: 13400, ms: 22000 }, { wait: 800 }],
  },
]
