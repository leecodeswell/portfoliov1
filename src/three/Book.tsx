import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'
import { book, W, D, PAGE_T, COVER_T, CURL } from './bookState'
import { paintBook, contentsHit, type Face, type SheetFaces } from '../content/paint'

const SEG_X = 64 // along the page width (where it bends; dense near the gutter via easing)
const SEG_Z = 8 // across the depth (corner peel twist)
const BOARD_OVERHANG = 0.005
/** Pages leave the spine slightly above the boards and swell up to their stack height over this distance. */
const GUTTER = 0.022
const SPINE_Y = COVER_T + 0.0008
const gutter = (s: number) => 1 - Math.exp(-s / GUTTER)

/** Column positions, packed toward the spine where the gutter curve needs resolution. */
const COLS = Array.from({ length: SEG_X + 1 }, (_, i) => Math.pow(i / SEG_X, 1.35))

/** Grid in the sheet's local frame: s = distance from the spine (0..w), z across the page. */
function sheetGeometry(w = W, d = D, shade = true) {
  const nx = SEG_X + 1
  const nz = SEG_Z + 1
  const pos = new Float32Array(nx * nz * 3)
  const uv = new Float32Array(nx * nz * 2)
  const col = new Float32Array(nx * nz * 3)
  const idx: number[] = []
  for (let j = 0; j < nz; j++)
    for (let i = 0; i < nx; i++) {
      const k = j * nx + i
      const s = COLS[i] * w
      pos[k * 3] = s
      pos[k * 3 + 2] = -d / 2 + (j / SEG_Z) * d
      uv[k * 2] = COLS[i]
      uv[k * 2 + 1] = 1 - j / SEG_Z
      // soft gutter darkening: light can't reach into the fold
      const c = shade ? 0.55 + 0.45 * (1 - Math.exp(-s / 0.03)) : 1
      col[k * 3] = col[k * 3 + 1] = col[k * 3 + 2] = c
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
  g.setAttribute('color', new THREE.BufferAttribute(col, 3))
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
 * Bend a paper sheet. The angle along the page grows from the hinge angle θ toward the free edge,
 * so the edge leads the turn: it lifts first, arcs over, and lands first — like the reference.
 * A depth-wise variation peels the near corner ahead of the far one, and every sheet rises
 * out of the gutter to its place on the stack.
 */
function deform(g: THREE.BufferGeometry, p: number, dir: number, curl: number, yR: number, yL: number) {
  const pos = g.attributes.position as THREE.BufferAttribute
  const theta = Math.PI * p
  const bend = Math.sin(Math.PI * p) * curl
  const rest = yR + (yL - yR) * smooth(p) - SPINE_Y
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
 * Hover-to-play motion loops. One <video> per clip (shared by mirrored and unmirrored uses),
 * one VideoTexture per face so the mirrored back pages keep their own UV transform.
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
    clips.set(url, v)
  }
  return v
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

function paperMaterials(f: SheetFaces) {
  const make = (map: THREE.Texture, side: THREE.Side) =>
    new THREE.MeshStandardMaterial({
      map,
      side,
      vertexColors: true,
      roughness: 0.66,
      metalness: 0,
      emissive: new THREE.Color('#ffffff'),
      emissiveMap: map,
      emissiveIntensity: 0.08, // printed screens read slightly luminous in the reference
      shadowSide: THREE.DoubleSide,
    })
  return [make(f.front.map, THREE.FrontSide), make(f.back.map, THREE.BackSide)]
}

function onSheetClick(i: number, e: ThreeEvent<MouseEvent>) {
  e.stopPropagation()
  if (book.inspecting) return book.inspect(false)
  if (book.phase === 'closed') return book.open()
  if (book.phase !== 'open' || book.busy) return
  const onLeft = i < book.turned
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
  const playing = useRef(-1) // which face (0 front, 1 back) currently shows its video
  const { yR, yL } = restHeights(i, n)
  const last = useRef(-1)

  const showStill = () => {
    const k = playing.current
    if (k < 0) return
    clip((k === 0 ? faces.front : faces.back).video!).pause()
    mats[k].map = mats[k].emissiveMap = k === 0 ? faces.front.map : faces.back.map
    playing.current = -1
  }
  const hover = (on: boolean) => {
    const s = book.sheets[i]
    if (!s || (s.p !== 0 && s.p !== 1)) return
    const k = s.p === 0 ? 0 : 1 // resting on the right shows the front, on the left the back
    const vt = videos[k]
    if (!vt) return
    const v = clip((k === 0 ? faces.front : faces.back).video!)
    if (on) {
      if (playing.current !== k) {
        showStill()
        mats[k].map = mats[k].emissiveMap = vt
        playing.current = k
      }
      v.play().catch(() => {})
    } else v.pause() // keep the paused frame; the still returns when the page moves
  }

  useFrame(() => {
    const s = book.sheets[i]
    if (!s || s.p === last.current) return
    last.current = s.p
    if (s.p !== 0 && s.p !== 1) showStill()
    deform(geom, s.p, s.dir, CURL, yR, yL)
  })
  return (
    <mesh
      geometry={geom}
      material={mats}
      castShadow
      receiveShadow
      onClick={(e) => onSheetClick(i, e)}
      onPointerOver={() => hover(true)}
      onPointerOut={() => hover(false)}
    />
  )
}

/** Rigid board: rotates about the spine, with real thickness and a shell for the edges. */
function CoverBoard({ i, n, faces }: { i: number; n: number; faces: SheetFaces }) {
  const pivot = useRef<THREE.Group>(null!)
  const bw = W + BOARD_OVERHANG
  const bd = D + BOARD_OVERHANG * 2
  const geom = useMemo(() => sheetGeometry(bw, bd, false), [bw, bd])
  const [front, back] = useMemo(() => {
    const m = paperMaterials(faces)
    const outside = i === 0 ? m[0] : m[1]
    outside.roughness = 0.58
    outside.emissiveIntensity = 0
    return m
  }, [faces, i])
  const edge = useMemo(() => {
    const e = new THREE.MeshStandardMaterial({ color: '#111113', roughness: 0.5 })
    const hidden = new THREE.MeshBasicMaterial({ visible: false })
    return [e, e, hidden, hidden, e, e]
  }, [])
  const { yR, yL } = restHeights(i, n)
  useFrame(() => {
    const p = book.sheets[i]?.p ?? 0
    pivot.current.position.y = yR + (yL - yR) * smooth(p)
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
    shape.lineTo(s, SPINE_Y + (COVER_T + h - SPINE_Y) * gutter(s) - 0.0001)
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
    pose.current.position.set(book.pose.x, book.pose.lift, 0)
    pose.current.rotation.set(book.pose.tilt, 0, book.pose.roll)
  })
  if (!faces) return null
  const n = faces.length
  return (
    // world placement matches the Blender scene: (0, -0.03) in Blender = z 0.03 here
    <group position={[0, 0, 0.03]}>
      <group ref={yaw}>
        <group ref={pose}>
          <Body n={n} />
          {faces.map((f, i) =>
            i === 0 || i === n - 1 ? <CoverBoard key={i} i={i} n={n} faces={f} /> : <PaperSheet key={i} i={i} n={n} faces={f} />,
          )}
        </group>
      </group>
    </group>
  )
}
