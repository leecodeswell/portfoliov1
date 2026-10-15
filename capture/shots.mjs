/**
 * One entry per book page. `pre` runs before recording, `rec` is what the motion loop shows.
 * `still: 'before'` takes the still at the start of the recording instead of the end.
 * Step types: { wait: ms } | { wheel: px, ms } | { scroll: targetScrollY, ms } | { mouse: [[x0, y0], [x1, y1]], ms }
 */
const COLOGNE = 'https://leecodeswell.github.io/cologne/'
const AETERNUM = 'https://leecodeswell.github.io/3Dexample/'
const ARES = 'https://leecodeswell.github.io/Ares/'

export const shots = [
  // Lorem Ipsum — the interactive bas-relief responds to the cursor
  {
    name: 'cologne-relief',
    url: COLOGNE,
    rec: [
      { mouse: [[300, 300], [1600, 820]], ms: 3000 },
      { mouse: [[1600, 820], [500, 900]], ms: 2500 },
      { mouse: [[500, 900], [1300, 250]], ms: 2500 },
    ],
  },
  // Lorem Ipsum — the hero bottle glides in to the gold-leaf macro
  {
    name: 'cologne-bottle',
    url: COLOGNE,
    pre: [{ scroll: 1800, ms: 1500 }, { wait: 1500 }],
    rec: [{ scroll: 4300, ms: 7000 }, { wait: 1200 }],
  },
  // AETERNUM — idle watch hero, cinematic light drifting with the cursor
  {
    name: 'aeternum-hero',
    url: AETERNUM,
    settle: 4000,
    still: 'before',
    rec: [
      { mouse: [[700, 450], [1400, 700]], ms: 3500 },
      { mouse: [[1400, 700], [900, 380]], ms: 3500 },
    ],
  },
  // AETERNUM — the movement explodes into its parts
  {
    name: 'aeternum-explode',
    url: AETERNUM,
    settle: 4000,
    rec: [{ wait: 400 }, { scroll: 2700, ms: 7000 }, { wait: 1500 }],
  },
  // Ares — the intro: pixel-art welcome, the light burst, then the reveal
  {
    name: 'ares-intro',
    url: ARES,
    settle: 2500,
    still: 'before',
    rec: [{ wait: 1500 }, { scroll: 2400, ms: 7000 }, { wait: 1500 }],
  },
  // Ares — title and soldier bust; a slow drift shows the layered parallax
  {
    name: 'ares-hero',
    url: ARES,
    pre: [{ scroll: 2400, ms: 3000 }, { wait: 4000 }],
    still: 'before',
    rec: [{ scroll: 2650, ms: 6000 }, { wait: 800 }, { scroll: 2400, ms: 6000 }, { wait: 800 }],
  },
]
