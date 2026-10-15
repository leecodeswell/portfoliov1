/**
 * Placeholder case studies. Each project fills one spread (left + right page).
 * Replace with real work; `art` picks a procedural illustration until real imagery/video is dropped in.
 */
export type Art = 'particles' | 'exploded' | 'keypad' | 'clouds' | 'dunes' | 'planet'

export interface Project {
  name: string
  discipline: string
  year: string
  headline: [string, string] // second line is set in italic serif
  blurb: string
  art: Art
  accent: string
  light?: boolean // paper-white spread instead of ink-dark
}

export const studio = {
  name: 'ares',
  tagline: 'Interactive Portfolio\nthat you can explore',
  hint: 'Click on pages to view works, use ← → to turn',
  contact: 'hello@ares.studio',
}

export const projects: Project[] = [
  {
    name: 'Lumen',
    discipline: 'Vision AI · Web',
    year: '2026',
    headline: ['Clarity,', 'rendered.'],
    blurb: 'A launch site for adaptive optics: a living particle field that resolves into focus as you scroll.',
    art: 'particles',
    accent: '#3f6dff',
  },
  {
    name: 'Monolith',
    discipline: 'Hardware · 3D',
    year: '2026',
    headline: ['Built like', 'a sculpture.'],
    blurb: 'Exploded product renders for a machined-aluminium device; every layer annotated and interactive.',
    art: 'exploded',
    accent: '#c8a36b',
  },
  {
    name: 'Keyframe',
    discipline: 'Product · Motion',
    year: '2025',
    headline: ['Sixteen keys.', 'Endless moves.'],
    blurb: 'A macro pad brand world: tactile glow, configurable layers and a configurator that feels physical.',
    art: 'keypad',
    accent: '#2f7bff',
  },
  {
    name: 'Cirrus',
    discipline: 'SaaS · Brand',
    year: '2025',
    headline: ['Storage that', 'floats.'],
    blurb: 'Identity and marketing site for weightless cloud storage. Soft volumes, airy type, zero friction.',
    art: 'clouds',
    accent: '#4b7dff',
    light: true,
  },
  {
    name: 'Strata',
    discipline: 'Travel · Editorial',
    year: '2024',
    headline: ['Landscapes,', 'layered.'],
    blurb: 'An editorial booking experience where every destination is told in geological layers.',
    art: 'dunes',
    accent: '#e3873a',
  },
  {
    name: 'Orbit',
    discipline: 'Experiential · WebGL',
    year: '2024',
    headline: ['Tickets to', 'elsewhere.'],
    blurb: 'A speculative space-travel agency: real-time planets, trajectories and boarding passes.',
    art: 'planet',
    accent: '#ff6a3d',
  },
]
