/**
 * Portfolio content. Pages are captured from the live sites by capture/capture.mjs
 * (2x still + motion clip); re-run the capture after a site changes.
 */
export interface PageMedia {
  still: string // 3840x2270 jpg: shown at rest and while the page turns (the clip's first frame)
  video?: string // 1920x1134 mp4
  play?: 'hover' | 'loop' // hover: plays while the cursor is on the page; loop: plays while the page is open
  loopTail?: number // loop: play the whole clip once, then repeat only its last N seconds
  resume?: boolean // hover: off the page it shows its still; back on, the clip continues where it left off
  live?: LiveSite // the real site, embedded once the spread settles
}

export interface LiveSite {
  src: string
  lockScroll?: boolean // keep the site on its first screen (cursor interaction only)
  hide?: string // CSS selectors to hide in the embedded copy (hairlines shimmer when shrunk onto a page)
}

export interface Project {
  name: string
  subtitle: string
  discipline: string
  url: string
  spread: number // where it opens in the book (contents links)
}

export const studio = {
  name: 'ares',
  tagline: 'Interactive Portfolio\nthat you can explore',
  hint: 'Click on pages to turn, hover to see them in motion',
  contact: 'thompsontechnologiesleet@gmail.com',
}

const media = (name: string, play?: PageMedia['play']): PageMedia => ({
  still: `/pages/${name}.jpg`,
  video: play ? `/pages/${name}.mp4` : undefined,
  play,
})

// Same origin as the portfolio on leecodeswell.github.io (proxied in dev, see vite.config.ts)
const COLOGNE = '/cologne/'

/** Book pages in reading order. Spread 1 is contents | intro; the back cover's inside is contact. */
export const pages = {
  cologneRelief: { ...media('cologne-relief'), live: { src: COLOGNE, lockScroll: true, hide: '.progress' } },
  cologneSequence: media('cologne-sequence', 'hover'),
  aresIntro: media('ares-intro', 'loop'), // the welcome with its ivy swaying, looped seamlessly
  aresJourney: { ...media('ares-journey', 'hover'), resume: true },
  aeternum: media('aeternum-explode', 'hover'),
}

export const projects: Project[] = [
  {
    name: 'Lorem Ipsum',
    subtitle: 'Portfolium',
    discipline: 'Fragrance · Interactive bas-relief',
    url: 'https://leecodeswell.github.io/cologne/',
    spread: 2,
  },
  {
    name: 'Ares',
    subtitle: 'by Lee Thompson',
    discipline: 'Studio · Intro & journey',
    url: 'https://ares-web.com/',
    spread: 3,
  },
  {
    name: 'AETERNUM',
    subtitle: 'Interactive Watch Showcase',
    discipline: 'Horology · Real-time 3D',
    url: 'https://leecodeswell.github.io/3Dexample/',
    spread: 4,
  },
]
