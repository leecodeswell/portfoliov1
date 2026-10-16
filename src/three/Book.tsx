import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import { useTexture } from '@react-three/drei'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import * as THREE from 'three'
import { asset } from '../asset'
import { book, W, D, PAGE_T, COVER_T, CURL } from './bookState'
import { paintBook, contentsHit, type Face, type SheetFaces } from '../content/paint'
import { LivePages } from './LivePages'

const SEG_X = 64 // along the page width (where it bends; dense near the gutter via easing)
const SEG_Z = 8 // across the depth (corner peel twist)
const BOARD_OVERHANG = 0.005
/** Pages leave the spine slightly above the boards and swell up to their stack height over this distance. */
const GUTTER = 0.022
const SPINE_Y = COVER_T + 0.0008
/**
 * How far a sheet has risen from the spine toward its stack height. Never zero: each sheet keeps a
 * sliver of its stack order right into the fold, otherwise every page meets at one line and the
 * pages underneath bleed through the top one near the seam.
 */
const GUTTER_FLOOR = 0.18
const gutter = (s: number) => GUTTER_FLOOR + (1 - GUTTER_FLOOR) * (1 - Math.exp(-s / GUTTER))

/** Column positions, packed toward the spine where the gutter curve needs resolution. */
const COLS = Array.from({ length: SEG_X + 1 }, (_, i) => Math.pow(i / SEG_X, 1.35))

/** Grid in the sheet's local frame: s = distance from the spine (0..w), z across the page. */
function sheetGeometry(w = W, d = D) {
  const nx = SEG_X + 1
  const nz = SEG_Z + 1
  const pos = new Float32Array(nx * nz * 3)
  const uv = new Float32Array(nx * nz * 2)
  const idx: number[] = []
  for (let j = 0; j < nz; j++)
    for (let i = 0; i < nx; i++) {
      const k = j * nx + i
      const s = COLS[i] * w
      pos[k * 3] = s
      pos[k * 3 + 2] = -d / 2 + (j / SEG_Z) * d
      uv[k * 2] = COLS[i]
      uv[k * 2 + 1] = 1 - j / SEG_Z
    }
  for (let j = 0; j < SEG_Z; j++)
    for (let i = 0; i < SEG_X; i++) {
      const a = j * nx + i
      const b = a + 1
      const c = a + nx
      const e = c + 1
      idx.push(a, c, b, b, c, e) // wound so the front face points +y while flat
    }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2))
  g.setIndex(idx)
  g.addGroup(0, idx.length, 0) // front material
  g.addGroup(0, idx.length, 1) // back material
  g.computeVertexNormals()
  return g
}

/** Resting heights (centre of the sheet) on the right and left stacks. Turned sheets are always the topmost. */
function restHeights(i: number, n: number) {
  const pages = n - 2
  const pageY = (k: number) => COVER_T + (k - 0.5) * PAGE_T // k-th sheet from the bottom of a page block
  if (i === 0) return { yR: COVER_T * 1.5 + pages * PAGE_T, yL: COVER_T / 2 }
  if (i === n - 1) return { yR: COVER_T / 2, yL: COVER_T * 1.5 + pages * PAGE_T }
  return { yR: pageY(pages - i + 1), yL: pageY(i) }
}

const smooth = (t: number) => t * t * (3 - 2 * t)
/**
 * Where a turning sheet's hinge sits between its two stacks. It stays at the stack it is leaving
 * until the sheet is upright, then settles onto the other: moving it any earlier drags the bound
 * edge down through the pages it is still lying over (the glitch when the cover first opens).
 */
const hingeMix = (p: number, dir: number) => {
  const t = dir >= 0 ? Math.min(1, Math.max(0, (p - 0.45) / 0.55)) : Math.min(1, Math.max(0, p / 0.55))
  return smooth(t)
}

/**
 * Bend a paper sheet. The angle along the page grows from the hinge angle θ toward the free edge,
 * so the edge leads the turn: it lifts first, arcs over, and lands first — like the reference.
 * A depth-wise variation peels the near corner ahead of the far one, and every sheet rises
 * out of the gutter to its place on the stack.
 */
function deform(g: THREE.BufferGeometry, p: number, dir: number, curl: number, yR: number, yL: number) {
  const pos = g.attributes.position as THREE.BufferAttribute
  const theta = Math.PI * p
  const bend = Math.sin(Math.PI * p) * curl
  const rest = yR + (yL - yR) * hingeMix(p, dir) - SPINE_Y
  for (let j = 0; j <= SEG_Z; j++) {
    const zN = (j / SEG_Z) * 2 - 1
    const twist = 1 + 0.32 * zN
    let x = 0
    let y = SPINE_Y
    for (let i = 0; i <= SEG_X; i++) {
      const k = j * (SEG_X + 1) + i
      const s = COLS[i] * W
      pos.setXYZ(k, x, y + rest * gutter(s), pos.getZ(k))
      if (i === SEG_X) break
      const ds = (COLS[i + 1] - COLS[i]) * W
      const sMid = (COLS[i] + COLS[i + 1]) / 2
      const a = Math.min(Math.PI, Math.max(0, theta + dir * bend * Math.pow(sMid, 1.5) * twist))
      x += Math.cos(a) * ds
      y += Math.sin(a) * ds
    }
  }
  pos.needsUpdate = true
  g.computeVertexNormals()
  g.computeBoundingSphere()
}

/**
 * Page motion clips. One <video> per clip, one VideoTexture per face (mirrored back pages keep their
 * own UV transform). A page only switches to its clip once a decoded frame is on screen; switching
 * earlier shows an empty texture, which reads as the page flashing white.
 */
const clips = new Map<string, HTMLVideoElement>()
if (import.meta.env.DEV) Object.assign(window, { __clips: clips })
function clip(url: string) {
  let v = clips.get(url)
  if (!v) {
    v = document.createElement('video')
    v.src = url
    v.muted = true
    v.loop = true
    v.playsInline = true
    v.crossOrigin = 'anonymous'
    v.preload = 'auto'
    v.load()
    clips.set(url, v)
  }
  return v
}

const HOVER_RATE = 1 // speed is baked into the captures (capture/shots.mjs `speed`)

/** Play once, then keep repeating only the last `tail` seconds (frame-accurate, no gap). */
function watchTail(v: HTMLVideoElement, tail: number) {
  const check = () => {
    if (v.duration && v.currentTime >= v.duration - 0.06) {
      v.currentTime = Math.max(0, v.duration - tail)
      v.play().catch(() => {})
    }
    if (!v.paused || v.currentTime > 0) v.requestVideoFrameCallback(check)
  }
  v.requestVideoFrameCallback(check)
  v.onended = () => {
    v.currentTime = Math.max(0, v.duration - tail)
    v.play().catch(() => {})
  }
}

function videoTexture(face: Face) {
  const t = new THREE.VideoTexture(clip(face.video!))
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 16
  t.wrapS = face.map.wrapS
  t.repeat.copy(face.map.repeat)
  t.offset.copy(face.map.offset)
  return t
}

/**
 * Page faces are pure displays: unlit, ungraded, unshaded. The sites reach the screen exactly as
 * their own pixels — no light, shadow, sheen or fold darkening touches them. The paper still
 * curls physically and casts its shadow onto the desk.
 */
function screenMaterial(map: THREE.Texture, side: THREE.Side) {
  const m = new THREE.MeshBasicMaterial({ map, side, toneMapped: false, shadowSide: THREE.DoubleSide })
  m.defines = { NO_GRADE: '' }
  return m
}

function paperMaterials(f: SheetFaces) {
  return [screenMaterial(f.front.map, THREE.FrontSide), screenMaterial(f.back.map, THREE.BackSide)]
}

function onSheetClick(i: number, e: ThreeEvent<MouseEvent>) {
  e.stopPropagation()
  if (book.inspecting) return book.inspect(false)
  if (book.phase === 'closed') return book.open()
  if (book.phase !== 'open' || book.busy) return
  const onLeft = i < book.turned
  // the back cover's inside is the contact page
  if (!onLeft && i === book.sheetCount - 1) return void window.dispatchEvent(new Event('ares:contact'))
  if (onLeft && i === 0 && e.uv) {
    // contents page lives on the front cover's inside (mirrored face)
    const target = contentsHit(1 - e.uv.x, e.uv.y)
    if (target !== null) return book.goTo(target)
  }
  if (onLeft) book.prev()
  else book.next()
}

function PaperSheet({ i, n, faces }: { i: number; n: number; faces: SheetFaces }) {
  const geom = useMemo(() => sheetGeometry(), [])
  const mats = useMemo(() => paperMaterials(faces), [faces])
  const videos = useMemo(
    () => [faces.front.video ? videoTexture(faces.front) : null, faces.back.video ? videoTexture(faces.back) : null],
    [faces],
  )
  const playing = useRef(-1) // which face (0 front, 1 back) currently shows its clip
  const hovered = useRef(false)
  const { yR, yL } = restHeights(i, n)
  const last = useRef(-1)
  const faceOf = (k: number) => (k === 0 ? faces.front : faces.back)

  const showStill = () => {
    const k = playing.current
    if (k < 0) return
    clip(faceOf(k).video!).pause()
    mats[k].map = faceOf(k).map
    mats[k].needsUpdate = true // video and image maps compile different colour decoding
    playing.current = -1
  }
  const play = (k: number) => {
    const vt = videos[k]
    if (!vt) return
    const face = faceOf(k)
    const v = clip(face.video!)
    if (playing.current !== k) {
      // each time the page comes back into view its clip starts over
      if (!face.resume) v.currentTime = 0 // resume clips continue where the visitor left off
      v.loop = !face.loopTail
      v.playbackRate = face.play === 'hover' ? HOVER_RATE : 1
      if (face.loopTail) watchTail(v, face.loopTail)
    }
    v.play().catch(() => {})
    if (playing.current === k) return
    showStill()
    playing.current = k
    // swap only once a real frame is decoded and presented
    const swap = () => playing.current === k && ((mats[k].map = vt), (mats[k].needsUpdate = true))
    if (typeof v.requestVideoFrameCallback === 'function') v.requestVideoFrameCallback(() => swap())
    else (v as HTMLVideoElement).addEventListener('playing', swap, { once: true })
  }

  useFrame(() => {
    const s = book.sheets[i]
    if (!s) return
    // which face is the open, settled page (if any): front on the right, back on the left
    const k = book.phase === 'open' && s.p === 0 && book.turned === i ? 0 : book.phase === 'open' && s.p === 1 && book.turned === i + 1 ? 1 : -1
    const face = k >= 0 ? faceOf(k) : null
    const want = face?.play === 'loop' || (face?.play === 'hover' && hovered.current)
    if (want) play(k)
    else if (playing.current >= 0) {
      // hover clips hold their frame when the cursor leaves (resume clips go back to their still);
      // anything else returns to its still
      if (k === playing.current && face?.play === 'hover' && !face.resume) clip(face.video!).pause()
      else showStill()
    }
    if (s.p === last.current) return
    last.current = s.p
    deform(geom, s.p, s.dir, CURL, yR, yL)
  })
  return (
    <mesh
      geometry={geom}
      material={mats}
      castShadow
      receiveShadow
      onClick={(e) => onSheetClick(i, e)}
      onPointerOver={() => (hovered.current = true)}
      onPointerOut={() => (hovered.current = false)}
    />
  )
}

const COVER_MAPS = ['textures/cover_albedo.jpg', 'textures/cover_normal.jpg', 'textures/cover_orm.png'].map(asset)

/** Rigid board: rotates about the spine, with real thickness and a shell for the edges. */
function CoverBoard({ i, n, faces }: { i: number; n: number; faces: SheetFaces }) {
  const pivot = useRef<THREE.Group>(null!)
  const bw = W + BOARD_OVERHANG
  const bd = D + BOARD_OVERHANG * 2
  const geom = useMemo(() => sheetGeometry(bw, bd), [bw, bd])
  const cloth = useTexture(COVER_MAPS)
  const gl = useThree((st) => st.gl)
  // soft studio reflections so the silver foil reads as metal, not black
  const studioEnv = useMemo(() => new THREE.PMREMGenerator(gl).fromScene(new RoomEnvironment(), 0.04).texture, [gl])
  const [front, back] = useMemo(() => {
    const m: THREE.Material[] = paperMaterials(faces)
    // the board's outside is black cloth, not a printed page: lit and graded like the rest of the scene
    const k = i === 0 ? 0 : 1
    const side = m[k].side
    if (i === 0) {
      // front cover: book cloth with a debossed silver-foil 'ares' (blender/scripts/make_cover.py)
      const [albedo, normal, orm] = cloth
      albedo.colorSpace = THREE.SRGBColorSpace
      for (const t of cloth) t.anisotropy = 16
      m[k] = new THREE.MeshStandardMaterial({
        map: albedo,
        normalMap: normal,
        normalScale: new THREE.Vector2(1, 1),
        aoMap: orm,
        roughnessMap: orm,
        metalnessMap: orm,
        roughness: 1,
        metalness: 1,
        envMap: studioEnv,
        envMapIntensity: 0.07,
        side,
        shadowSide: THREE.DoubleSide,
      })
    } else {
      m[k] = new THREE.MeshStandardMaterial({ map: faces.back.map, side, roughness: 0.58, shadowSide: THREE.DoubleSide })
    }
    return m
  }, [faces, i, cloth, studioEnv])
  const edge = useMemo(() => {
    const e = new THREE.MeshStandardMaterial({ color: '#111113', roughness: 0.5 })
    const hidden = new THREE.MeshBasicMaterial({ visible: false })
    return [e, e, hidden, hidden, e, e]
  }, [])
  const { yR, yL } = restHeights(i, n)
  useFrame(() => {
    const s = book.sheets[i]
    const p = s?.p ?? 0
    pivot.current.position.y = yR + (yL - yR) * hingeMix(p, s?.dir ?? 1)
    pivot.current.rotation.z = Math.PI * p
  })
  return (
    <group ref={pivot}>
      <mesh geometry={geom} material={front} position-y={COVER_T / 2} castShadow receiveShadow onClick={(e) => onSheetClick(i, e)} />
      <mesh geometry={geom} material={back} position-y={-COVER_T / 2} castShadow receiveShadow onClick={(e) => onSheetClick(i, e)} />
      <mesh material={edge} position={[bw / 2, 0, 0]} castShadow>
        <boxGeometry args={[bw, COVER_T * 0.96, bd]} />
      </mesh>
    </group>
  )
}

/** Fine horizontal lines for the page-block edges (world-unit UVs: one period per sheet). */
function edgeTexture() {
  const c = document.createElement('canvas')
  c.width = 4
  c.height = 32
  const g = c.getContext('2d')!
  g.fillStyle = '#e4e0d8'
  g.fillRect(0, 0, 4, 32)
  g.fillStyle = '#b9b3a8'
  g.fillRect(0, 26, 4, 3)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.repeat.set(1, 1 / PAGE_T)
  return t
}

/** A page block whose top follows the gutter curve: extruded profile, rebuilt only when its height steps. */
function blockGeometry(h: number) {
  const shape = new THREE.Shape()
  const base = COVER_T + 0.0002
  shape.moveTo(0, base)
  for (let i = 0; i <= 40; i++) {
    const s = Math.pow(i / 40, 1.4) * (W - 0.003)
    shape.lineTo(s, SPINE_Y + (COVER_T + h - SPINE_Y) * gutter(s) - 0.0002)
  }
  shape.lineTo(W - 0.003, base)
  shape.closePath()
  const g = new THREE.ExtrudeGeometry(shape, { depth: D - 0.003, bevelEnabled: false, steps: 1 })
  g.translate(0, 0, -(D - 0.003) / 2)
  return g
}

/** Page-block edges and spine. A block holds every resting sheet but its top one (which lies on it). */
function Body({ n }: { n: number }) {
  const right = useRef<THREE.Mesh>(null!)
  const left = useRef<THREE.Mesh>(null!)
  const spine = useRef<THREE.Mesh>(null!)
  const heights = useRef({ r: -1, l: -1 })
  const pages = n - 2
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ map: edgeTexture(), roughness: 0.92, side: THREE.DoubleSide }), [])
  const spineMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#111113', roughness: 0.5 }), [])
  useFrame(() => {
    let r = 0
    let l = 0
    for (let i = 1; i <= pages; i++) {
      const p = book.sheets[i]?.p ?? 0
      if (p === 0) r++
      else if (p === 1) l++
    }
    const hr = Math.max(0, r - 1) * PAGE_T
    const hl = Math.max(0, l - 1) * PAGE_T
    if (hr !== heights.current.r) {
      right.current.geometry.dispose()
      right.current.geometry = blockGeometry(hr)
      right.current.visible = r > 1
      heights.current.r = hr
    }
    if (hl !== heights.current.l) {
      left.current.geometry.dispose()
      left.current.geometry = blockGeometry(hl)
      left.current.visible = l > 1
      heights.current.l = hl
    }
    // spine stands the full height while closed, and tucks under the boards when open
    const closed = Math.max(1 - smooth(book.sheets[0]?.p ?? 0), smooth(book.sheets[n - 1]?.p ?? 0))
    const h = COVER_T * 0.6 + closed * (pages * PAGE_T + COVER_T * 1.4)
    spine.current.scale.y = h
    spine.current.position.y = h / 2
  })
  return (
    <>
      <mesh ref={right} material={mat} castShadow receiveShadow />
      <mesh ref={left} material={mat} scale-x={-1} castShadow receiveShadow />
      <mesh ref={spine} material={spineMat} position={[-0.0022, 0, 0]} castShadow>
        <boxGeometry args={[0.0045, 1, D + BOARD_OVERHANG * 2]} />
      </mesh>
    </>
  )
}

const _corner = new THREE.Vector3()
/**
 * How far the book must rise so no corner of its footprint dips below the desk at the current tilt
 * and roll. Animations (lift, tip, the heavy settle's overshoot) can never push it into the table.
 */
function floorClearance(n: number, rot: THREE.Euler) {
  const ov = BOARD_OVERHANG
  const open = smooth(Math.min(1, (book.sheets[0]?.p ?? 0) * 2)) // left half exists once the cover lifts
  const shut = smooth(Math.min(1, (book.sheets[n - 1]?.p ?? 0) * 2)) // right half gone once the back closes
  const xs = [-(W + ov) * open, (W + ov) * (1 - shut)]
  let low = 0
  for (const x of xs)
    for (const z of [-(D / 2 + ov), D / 2 + ov]) {
      _corner.set(x, 0, z).applyEuler(rot)
      low = Math.min(low, _corner.y)
    }
  return -low + (low < 0 ? 0.0005 : 0)
}

export function Book() {
  const [faces, setFaces] = useState<SheetFaces[] | null>(null)
  const yaw = useRef<THREE.Group>(null!)
  const pose = useRef<THREE.Group>(null!)
  const gl = useThree((s) => s.gl)
  useEffect(() => {
    let live = true
    paintBook().then((f) => {
      if (!live) return
      // upload every page to the GPU behind the loading veil; an 8K texture would otherwise
      // stall the first frame it appears in (mid-animation)
      for (const s of f) {
        gl.initTexture(s.front.map)
        gl.initTexture(s.back.map)
        if (s.front.video) clip(s.front.video)
        if (s.back.video) clip(s.back.video)
      }
      book.init(f.length - 2)
      setFaces(f)
    })
    return () => {
      live = false
    }
  }, [gl])
  useFrame(() => {
    if (!pose.current) return
    yaw.current.rotation.y = book.pose.yaw
    pose.current.rotation.set(book.pose.tilt, 0, book.pose.roll)
    pose.current.position.set(book.pose.x, book.pose.lift + floorClearance(n, pose.current.rotation), 0)
  })
  if (!faces) return null
  const n = faces.length
  return (
    // world placement matches the Blender scene: (0, -0.03) in Blender = z 0.03 here
    <group
      position={[0, 0, 0.03]}
      onPointerOver={() => book.hover(true)}
      onPointerOut={() => book.hover(false)}
    >
      <group ref={yaw}>
        <group ref={pose}>
          <Body n={n} />
          <LivePages faces={faces} restHeight={(i, side) => (side === 'R' ? restHeights(i, n).yR : restHeights(i, n).yL)} />
          {faces.map((f, i) =>
            i === 0 || i === n - 1 ? <CoverBoard key={i} i={i} n={n} faces={f} /> : <PaperSheet key={i} i={i} n={n} faces={f} />,
          )}
        </group>
      </group>
    </group>
  )
}
