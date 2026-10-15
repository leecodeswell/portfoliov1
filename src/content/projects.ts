/**
 * Portfolio projects. Each fills one spread: a left and a right page captured from the live site
 * by capture/capture.mjs (2x still + motion loop). Re-run the capture after a site changes.
 */
export interface PageMedia {
  still: string // 3840x2270 jpg, shown at rest
  video?: string // 1920x1134 mp4 loop, plays while the page is hovered
}

export interface Project {
  name: string
  subtitle: string
  discipline: string
  url: string
  pages: [PageMedia, PageMedia]
}

export const studio = {
  name: 'ares',
  tagline: 'Interactive Portfolio\nthat you can explore',
  hint: 'Click on pages to turn, hover to see them in motion',
  contact: 'hello@ares.studio',
}

const page = (name: string): PageMedia => ({ still: `/pages/${name}.jpg`, video: `/pages/${name}.mp4` })

export const projects: Project[] = [
  {
    name: 'Lorem Ipsum',
    subtitle: 'Portfolium',
    discipline: 'Fragrance · Interactive bas-relief',
    url: 'https://leecodeswell.github.io/cologne/',
    pages: [page('cologne-relief'), page('cologne-bottle')],
  },
  {
    name: 'AETERNUM',
    subtitle: 'Interactive Watch Showcase',
    discipline: 'Horology · Real-time 3D',
    url: 'https://leecodeswell.github.io/3Dexample/',
    pages: [page('aeternum-hero'), page('aeternum-explode')],
  },
  {
    name: 'Ares',
    subtitle: 'by Lee Thompson',
    discipline: 'Studio · Intro & hero',
    url: 'https://leecodeswell.github.io/Ares/',
    pages: [page('ares-intro'), page('ares-hero')],
  },
]
