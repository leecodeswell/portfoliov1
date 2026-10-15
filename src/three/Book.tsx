import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'
import { book, W, D, PAGE_T, COVER_T, CURL } from './bookState'
import { paintBook, contentsHit, type SheetFaces } from '../content/paint'

const SEG_X = 48 // along the page width (where it bends)
const SEG_Z = 6 // across the depth (corner peel twist)
const BOARD_OVERHANG = 0.004

/** Grid in the sheet's local frame: s = distance from the spine (0..w), z across the page. */
function sheetGeometry(w = W, d = D, x0 = 0) {
  const nx = SEG_X + 1
  const nz = SEG_Z + 1
  const pos = new Float32Array(nx * nz * 3)
  const uv = new Float32Array(nx * nz * 2)
  const idx: number[] = []
  for (let j = 0; j < nz; j++)
    for (let i = 0; i < nx; i++) {
      const k = j * nx + i
      pos[k * 3] = x0 + (i / SEG_X) * w
      pos[k * 3 + 2] = -d / 2 + (j / SEG_Z) * d
      uv[k * 2] = i / SEG_X
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
 * Bend a paper sheet. The angle along the page grows from the hinge angle θ toward the free edge,
 * so the edge leads the turn: it lifts first, arcs over, and lands first — like the reference.
 * A small depth-wise variation peels the near corner ahead of the far one.
 */
function deform(g: THREE.BufferGeometry, p: number, dir: number, curl: number, yR: number, yL: number) {
  const pos = g.attributes.position as THREE.BufferAttribute
  const theta = Math.PI * p
  const bend = Math.sin(Math.PI * p) * curl
  const hinge = yR + (yL - yR) * smooth(p)
  const ds = W / SEG_X
  for (let j = 0; j <= SEG_Z; j++) {
    const zN = (j / SEG_Z) * 2 - 1
    const twist = 1 + 0.28 * zN
    let x = 0
    let y = hinge
    for (let i = 0; i <= SEG_X; i++) {
      const k = j * (SEG_X + 1) + i
      pos.setXYZ(k, x, y, pos.getZ(k))
      const sMid = (i + 0.5) / SEG_X
      const a = Math.min(Math.PI, Math.max(0, theta + dir * bend * Math.pow(sMid, 1.6) * twist))
      x += Math.cos(a) * ds
      y += Math.sin(a) * ds
    }
  }
  pos.needsUpdate = true
  g.computeVertexNormals()
  g.computeBoundingSphere()
}

function paperMaterials(f: SheetFaces) {
  const make = (map: THREE.Texture, side: THREE.Side) =>
    new THREE.MeshStandardMaterial({
      map,
      side,
      roughness: 0.62,
      metalness: 0,
      emissive: new THREE.Color('#ffffff'),
      emissiveMap: map,
      emissiveIntensity: 0.1, // printed screens read slightly luminous in the reference
      shadowSide: THREE.DoubleSide,
    })
  return [make(f.front, THREE.FrontSide), make(f.back, THREE.BackSide)]
}

function onSheetClick(i: number, e: ThreeEvent<MouseEvent>) {
  e.stopPropagation()
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
  const { yR, yL } = restHeights(i, n)
  const last = useRef(-1)
  useFrame(() => {
    const s = book.sheets[i]
    if (!s || s.p === last.current) return
    last.current = s.p
    deform(geom, s.p, s.dir, CURL, yR, yL)
  })
  return <mesh geometry={geom} material={mats} castShadow receiveShadow onClick={(e) => onSheetClick(i, e)} />
}

/** Rigid board: rotates about the spine, with real thickness and a shell for the edges. */
function CoverBoard({ i, n, faces }: { i: number; n: number; faces: SheetFaces }) {
  const pivot = useRef<THREE.Group>(null!)
  const bw = W + BOARD_OVERHANG
  const bd = D + BOARD_OVERHANG * 2
  const geom = useMemo(() => sheetGeometry(bw, bd, 0), [bw, bd])
  const [front, back] = useMemo(() => {
    const m = paperMaterials(faces)
    const outside = i === 0 ? m[0] : m[1]
    outside.roughness = 0.62
    outside.emissiveIntensity = 0
    return m
  }, [faces, i])
  const edge = useMemo(() => {
    const e = new THREE.MeshStandardMaterial({ color: '#0d0d0e', roughness: 0.55 })
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
        <boxGeometry args={[bw, COVER_T * 0.98, bd]} />
      </mesh>
    </group>
  )
}

/** Page-block edges and spine; heights follow how many sheets sit on each side. */
function Body({ n }: { n: number }) {
  const right = useRef<THREE.Mesh>(null!)
  const left = useRef<THREE.Mesh>(null!)
  const spine = useRef<THREE.Mesh>(null!)
  const pages = n - 2
  const mats = useMemo(() => {
    const edge = new THREE.MeshStandardMaterial({ color: '#d9d6cf', roughness: 0.9 })
    const hidden = new THREE.MeshBasicMaterial({ visible: false })
    return [edge, edge, hidden, hidden, edge, edge]
  }, [])
  const spineMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#0d0d0e', roughness: 0.55 }), [])
  useFrame(() => {
    let onLeft = 0
    for (let i = 1; i <= pages; i++) onLeft += smooth(book.sheets[i]?.p ?? 0)
    const hL = Math.max(1e-5, onLeft * PAGE_T)
    const hR = Math.max(1e-5, (pages - onLeft) * PAGE_T)
    right.current.scale.y = hR
    right.current.position.y = COVER_T + hR / 2
    left.current.scale.y = hL
    left.current.position.y = COVER_T + hL / 2
    left.current.visible = onLeft > 0.01
    right.current.visible = pages - onLeft > 0.01
    const closed = Math.max(1 - (book.sheets[0]?.p ?? 0), book.sheets[n - 1]?.p ?? 0)
    const h = COVER_T + closed * (pages * PAGE_T + COVER_T)
    spine.current.scale.y = h
    spine.current.position.y = h / 2
  })
  const inset = 0.006
  return (
    <>
      <mesh ref={right} material={mats} position={[inset / 2 + W / 2 - 0.002, 0, 0]} castShadow receiveShadow>
        <boxGeometry args={[W - inset, 1, D - 0.002]} />
      </mesh>
      <mesh ref={left} material={mats} position={[-(inset / 2 + W / 2 - 0.002), 0, 0]} castShadow receiveShadow>
        <boxGeometry args={[W - inset, 1, D - 0.002]} />
      </mesh>
      <mesh ref={spine} material={spineMat} position={[-0.001, 0, 0]} castShadow>
        <boxGeometry args={[0.005, 1, D + BOARD_OVERHANG * 2]} />
      </mesh>
    </>
  )
}

export function Book() {
  const [faces, setFaces] = useState<SheetFaces[] | null>(null)
  const pose = useRef<THREE.Group>(null!)
  useEffect(() => {
    let live = true
    paintBook().then((f) => {
      if (!live) return
      book.init(f.length - 2)
      setFaces(f)
    })
    return () => {
      live = false
    }
  }, [])
  useFrame(() => {
    const g = pose.current
    if (!g) return
    g.position.set(book.pose.x, book.pose.lift, 0)
    g.rotation.set(book.pose.tilt, 0, 0)
  })
  if (!faces) return null
  const n = faces.length
  return (
    // world placement matches the Blender scene: (0, -0.03) in Blender = z 0.03 here, 4° yaw handled by pose
    <group position={[0, 0, 0.03]}>
      <YawGroup>
        <group ref={pose}>
          <Body n={n} />
          {faces.map((f, i) =>
            i === 0 || i === n - 1 ? <CoverBoard key={i} i={i} n={n} faces={f} /> : <PaperSheet key={i} i={i} n={n} faces={f} />,
          )}
        </group>
      </YawGroup>
    </group>
  )
}

function YawGroup({ children }: { children: React.ReactNode }) {
  const g = useRef<THREE.Group>(null!)
  useFrame(() => {
    g.current.rotation.y = book.pose.yaw
  })
  return <group ref={g}>{children}</group>
}
