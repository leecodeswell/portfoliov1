import gsap from 'gsap'

/** Book dimensions in metres (matches blender/scripts/build_scene.py). */
export const W = 0.44 // page width
export const D = 0.26 // page depth (top-to-bottom of a page)
export const PAGE_T = 0.0032 // visual thickness per sheet (each stands in for several real leaves)
export const COVER_T = 0.0045 // board thickness
export const CURL = 1.4 // radians of extra bend at a page's free edge mid-turn

/** Timings measured from the reference recording (24 fps). */
const TURN = 0.75 // single page turn
const COVER_TURN = 0.95
const CASCADE_STAGGER = 0.09 // contents jump: sheets fan over in quick succession

export type Phase = 'closed' | 'opening' | 'open' | 'closing' | 'end'

/**
 * Sheets, bottom-up when closed: [frontCover, page 1..N, backCover].
 * sheets[i].p: 0 = lying on the right stack, 1 = turned onto the left stack; dir = turn direction.
 * Spread k shows sheet[k-1].back on the left and sheet[k].front on the right.
 */
class BookController {
  pages = 0
  ready = false
  sheets: { p: number; dir: number }[] = []
  turned = 0
  phase: Phase = 'closed'
  /** Whole-book pose: x slides so the closed book / open spread stays centred. */
  pose = { x: -W / 2, lift: 0, tilt: 0, roll: 0, yaw: (4 * Math.PI) / 180 }
  /**
   * Camera: t blends hero overview (0) -> reading close-up (1); nudge leans toward the turning page;
   * focus blends into a loupe-like inspection of the right page.
   */
  cam = { t: 0, nudge: 0, focus: 0 }
  inspecting = false
  private queue = Promise.resolve()
  private listeners = new Set<() => void>()
  private animating = 0

  init(pageSheets: number) {
    this.pages = pageSheets
    const n = pageSheets + 2
    this.sheets = Array.from({ length: n }, () => ({ p: 0, dir: 1 }))
    this.ready = true
    this.emit()
  }

  get sheetCount() {
    return this.sheets.length
  }
  get lastSpread() {
    return this.sheetCount - 1 // spread showing the back cover's inside on the right
  }
  isCover(i: number) {
    return i === 0 || i === this.sheetCount - 1
  }
  get busy() {
    return this.animating > 0
  }

  subscribe(fn: () => void) {
    this.listeners.add(fn)
    return () => this.listeners.delete(fn)
  }
  private emit() {
    this.listeners.forEach((f) => f())
  }
  private setPhase(p: Phase) {
    this.phase = p
    this.emit()
  }

  /** Serialise interactions so rapid clicks queue up like page flips do. */
  private run(fn: () => gsap.core.Timeline | null) {
    this.queue = this.queue.then(
      () =>
        new Promise<void>((resolve) => {
          const tl = fn()
          if (!tl) return resolve()
          this.animating++
          // .then() fires after the timeline's own onComplete (eventCallback would replace it)
          tl.then(() => {
            this.animating--
            resolve()
          })
        }),
    )
  }

  private turnTween(tl: gsap.core.Timeline, i: number, to: 0 | 1, at: number, fast = false) {
    this.sheets[i].dir = to === 1 ? 1 : -1
    const dur = this.isCover(i) ? COVER_TURN : fast ? TURN * 0.85 : TURN
    tl.to(this.sheets[i], { p: to, duration: dur, ease: 'power2.inOut' }, at)
  }

  /** Camera leans toward the travelling page, then eases back; the book gives a small settle when it lands. */
  private lean(tl: gsap.core.Timeline, dir: number, landAt: number) {
    tl.to(this.cam, { nudge: dir, duration: 0.35, ease: 'power2.out' }, 0)
    tl.to(this.cam, { nudge: 0, duration: 0.8, ease: 'power2.inOut' }, 0.35)
    tl.to(this.pose, { roll: -dir * 0.006, duration: 0.1, ease: 'power1.out' }, landAt)
    tl.to(this.pose, { roll: 0, duration: 0.45, ease: 'elastic.out(1, 0.5)' }, landAt + 0.1)
  }

  open() {
    if (!this.ready) return
    this.run(() => {
      if (this.phase !== 'closed') return null
      this.setPhase('opening')
      const tl = gsap.timeline({
        onComplete: () => {
          this.turned = 1
          this.setPhase('open')
        },
      })
      // f17-f25: book lifts and tips toward the camera, squaring up
      tl.to(this.pose, { lift: 0.07, tilt: -0.3, roll: 0.05, yaw: 0, duration: 0.45, ease: 'power3.out' }, 0)
      // camera swoops in and lowers
      tl.to(this.cam, { t: 1, duration: 1.25, ease: 'power3.inOut' }, 0.05)
      // cover swings over the spine; spread slides to centre
      this.turnTween(tl, 0, 1, 0.28)
      tl.to(this.pose, { x: 0, duration: 0.9, ease: 'power2.inOut' }, 0.22)
      // heavy settle back onto the desk
      tl.to(this.pose, { lift: 0, tilt: 0, roll: 0, duration: 0.6, ease: 'back.out(1.6)' }, 0.75)
      return tl
    })
  }

  /** Go to spread k (1..lastSpread). Multi-sheet jumps cascade like the reference contents links. */
  goTo(k: number) {
    this.run(() => {
      if (this.phase !== 'open') return null
      k = Math.max(1, Math.min(this.lastSpread, k))
      if (k === this.turned) return null
      const from = this.turned
      const tl = gsap.timeline({ onComplete: () => this.emit() })
      const count = Math.abs(k - from)
      if (k > from) {
        for (let i = from; i < k; i++) this.turnTween(tl, i, 1, (i - from) * CASCADE_STAGGER, count > 1)
      } else {
        for (let i = from - 1; i >= k; i--) this.turnTween(tl, i, 0, (from - 1 - i) * CASCADE_STAGGER, count > 1)
      }
      this.lean(tl, k > from ? -1 : 1, (count - 1) * CASCADE_STAGGER + TURN * 0.8)
      this.turned = k
      this.emit()
      return tl
    })
  }

  /** Closed book under the cursor: it rises and tips toward you, as if picked up. */
  hover(on: boolean) {
    if (!this.ready || this.phase !== 'closed' || this.busy) return
    document.body.style.cursor = on ? 'pointer' : ''
    gsap.to(this.pose, {
      lift: on ? 0.03 : 0,
      tilt: on ? -0.09 : 0,
      roll: on ? 0.025 : 0,
      duration: on ? 0.55 : 0.7,
      ease: on ? 'power3.out' : 'power2.inOut',
      overwrite: 'auto',
    })
  }

  /** Open (from any state) straight to spread k — used by the contact card on the desk. */
  openTo(k: number) {
    if (!this.ready) return
    if (this.phase === 'end') this.restart()
    this.open()
    this.goTo(k)
  }

  next() {
    if (this.phase === 'closed') return this.open()
    if (this.phase !== 'open') return
    if (this.turned >= this.lastSpread) return this.close()
    this.goTo(this.turned + 1)
  }
  prev() {
    if (this.phase === 'open' && this.turned > 1) this.goTo(this.turned - 1)
  }

  /** f1013-f1069: back cover swings over, camera pulls out, end card fades in. */
  close() {
    this.run(() => {
      if (this.phase !== 'open') return null
      this.setPhase('closing')
      const last = this.sheetCount - 1
      const tl = gsap.timeline({
        onComplete: () => {
          this.turned = this.sheetCount
          this.setPhase('end')
        },
      })
      this.turnTween(tl, last, 1, 0)
      tl.to(this.pose, { x: W / 2, duration: 0.85, ease: 'power2.inOut' }, 0.08)
      tl.to(this.cam, { t: 0, duration: 1.1, ease: 'power3.inOut' }, 0.3)
      return tl
    })
  }

  /** Close the book from any spread: riffle back to the front cover and return to the hero view. */
  closeBook() {
    this.inspect(false)
    this.run(() => {
      if (this.phase !== 'open') return null
      this.setPhase('closing')
      const from = this.turned
      const tl = gsap.timeline({
        onComplete: () => {
          this.turned = 0
          this.setPhase('closed')
        },
      })
      for (let i = from - 1; i >= 1; i--) this.turnTween(tl, i, 0, (from - 1 - i) * 0.07, true)
      const coverAt = Math.max(0, from - 2) * 0.07 + 0.22
      this.turnTween(tl, 0, 0, coverAt)
      tl.to(this.pose, { lift: 0.05, tilt: -0.2, roll: -0.04, duration: 0.4, ease: 'power2.out' }, coverAt)
      tl.to(this.pose, { x: -W / 2, yaw: (4 * Math.PI) / 180, duration: 0.9, ease: 'power2.inOut' }, coverAt + 0.08)
      tl.to(this.pose, { lift: 0, tilt: 0, roll: 0, duration: 0.6, ease: 'back.out(1.6)' }, coverAt + 0.6)
      tl.to(this.cam, { t: 0, duration: 1.2, ease: 'power3.inOut' }, coverAt + 0.08)
      return tl
    })
  }

  /** Loupe mode: camera glides down over the right-hand page; the pointer pans across it. */
  inspect(on = !this.inspecting) {
    if (on && this.phase !== 'open') return
    if (on === this.inspecting) return
    this.inspecting = on
    gsap.to(this.cam, { focus: on ? 1 : 0, duration: on ? 1.0 : 0.8, ease: 'power3.inOut', overwrite: 'auto' })
    this.emit()
  }

  /** "Read again": riffle everything back to the front cover and return to the hero state. */
  restart() {
    this.run(() => {
      if (this.phase !== 'end') return null
      const tl = gsap.timeline({
        onComplete: () => {
          this.turned = 0
          this.setPhase('closed')
        },
      })
      for (let i = this.sheetCount - 1; i >= 0; i--) this.turnTween(tl, i, 0, (this.sheetCount - 1 - i) * 0.05, true)
      tl.to(this.pose, { x: -W / 2, yaw: (4 * Math.PI) / 180, duration: 0.9, ease: 'power2.inOut' }, 0)
      this.setPhase('closing')
      return tl
    })
  }
}

export const book = new BookController()

if (import.meta.env.DEV) Object.assign(window, { __book: book })
