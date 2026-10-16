/**
 * Portfolio content. Pages are captured from the live sites by capture/capture.mjs
 * (2x still + motion clip); re-run the capture after a site changes.
 */
import { asset } from '../asset'

export interface PageMedia {
  still: string // 3840x2270 jpg: shown at rest and while the page turns (the clip's first frame)
  video?: string // 1920x1134 mp4
  play?: 'hover' | 'loop' // hover: plays while the cursor is on the page; loop: plays while the page is open
  loopTail?: number // loop: play the whole clip once, then repeat only its last N seconds
  resume?: boolean // hover: off the page it shows its still; back on, the clip continues where it left off
  restart?: boolean // hover: off the page it shows its still; back on, the clip starts over
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
  tagline: 'Interactive\nPortfolio Desk',
  contact: 'thompsontechnologiesleet@gmail.com',
}

const media = (name: string, play?: PageMedia['play']): PageMedia => ({
  still: asset(`pages/${name}.jpg`),
  video: play ? asset(`pages/${name}.mp4`) : undefined,
  play,
})

// A trimmed copy of the cologne site's hero ships with the book (public/live/cologne): always
// same-origin, loads in a fraction of the full site, and can never fall back to the portfolio itself
const COLOGNE = asset('live/cologne/index.html')

/** Book pages in reading order. Spread 1 is contents | intro; the back cover's inside is contact. */
export const pages = {
  cologneRelief: { ...media('cologne-relief'), live: { src: COLOGNE, lockScroll: true, hide: '.progress' } },
  cologneSequence: media('cologne-sequence', 'hover'),
  aresIntro: media('ares-intro', 'loop'), // the welcome with its ivy swaying, looped seamlessly
  aresJourney: { ...media('ares-journey', 'hover'), restart: true },
  aurelStudio: { ...media('aurel-studio', 'hover'), restart: true },
  aurelRain: { ...media('aurel-rain', 'hover'), restart: true },
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
    url: 'https://leecodeswell.github.io/Ares/',
    spread: 3,
  },
  {
    name: 'AUREL',
    subtitle: 'Live 3D Automotive Study',
    discipline: 'Automotive · Real-time 3D',
    url: 'https://leecodeswell.github.io/LuxuryCar/',
    spread: 4,
  },
  {
    name: 'AETERNUM',
    subtitle: 'Interactive Watch Showcase',
    discipline: 'Horology · Real-time 3D',
    url: 'https://leecodeswell.github.io/3Dexample/',
    spread: 5,
  },
]
