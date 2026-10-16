import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'
import { book } from './bookState'

/**
 * A small pile of real-time books at the desk's top right, clear of the open spread. Hover the pile
 * and it rises a touch; click it and the books lift off the desk and stand in front of the camera,
 * spines out, like a shelf (the main book shuts first). Click one to open it (an `ares:shelf` event the page answers with a reading panel). Click anywhere else
 * or press Escape and they settle back onto the pile.
 */
export type ShelfBook = 'links' | 'privacy'

type Spec = {
  id: ShelfBook | null // null: no content yet
  w: number // cover width (front to back of the pile)
  d: number // cover height (the spine's length)
  h: number // thickness
  color: string
  title: string
  ink: string
  yaw: number
  dx: number
  dz: number
}

// bottom to top
const BOOKS: Spec[] = [
  { id: 'privacy', w: 0.13, d: 0.18, h: 0.024, color: '#1c1d22', title: 'PRIVACY POLICY', ink: '#c9c4b8', yaw: 4, dx: 0, dz: 0 },
  { id: null, w: 0.115, d: 0.16, h: 0.019, color: '#5a2f26', title: 'NOTES', ink: '#e3d6c0', yaw: -9, dx: -0.006, dz: 0.004 },
  { id: 'links', w: 0.1, d: 0.14, h: 0.016, color: '#2c3a33', title: 'LINKS', ink: '#e3d6c0', yaw: 13, dx: 0.004, dz: -0.006 },
]

const PILE_POS = new THREE.Vector3(0.5, 0, -0.27)
const PILE_YAW = THREE.MathUtils.degToRad(-98)
/** On the shelf: distance in front of the camera, gap between books. */
const SHELF_DIST = 0.6
const SHELF_GAP = 0.008
/** Flight: seconds per book, and the delay between books leaving (top first) and landing (bottom first). */
const FLIGHT = 0.7
const STAGGER = 0.08
const SPAN = 1 + STAGGER * (BOOKS.length - 1)

function spineTexture(title: string, color: string, ink: string) {
  const c = document.createElement('canvas')
  c.width = 1024
  c.height = 128
  const g = c.getContext('2d')!
  const t = new THREE.CanvasTexture(c)
  const draw = () => {
    g.fillStyle = color
    g.fillRect(0, 0, c.width, c.height)
    g.fillStyle = ink
    g.font = '400 64px "Instrument Serif", Georgia, serif'
    g.textAlign = 'center'
    g.textBaseline = 'middle'
    ;(g as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing = '8px'
    g.fillText(title, c.width / 2, c.height / 2 + 4)
    t.needsUpdate = true
  }
  draw()
  document.fonts?.load('64px "Instrument Serif"').then(draw, () => {})
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 16
  return t
}

/** Where each book rests on the pile, in world space. */
function homePoses() {
  const up = THREE.Object3D.DEFAULT_UP
  const one = new THREE.Vector3(1, 1, 1)
  const pile = new THREE.Matrix4().compose(PILE_POS, new THREE.Quaternion().setFromAxisAngle(up, PILE_YAW), one)
  let y = 0
  return BOOKS.map((s) => {
    const local = new THREE.Matrix4().compose(
      new THREE.Vector3(s.dx, y + s.h / 2, s.dz),
      new THREE.Quaternion().setFromAxisAngle(up, THREE.MathUtils.degToRad(s.yaw)),
      one,
    )
    y += s.h
    const pos = new THREE.Vector3()
    const quat = new THREE.Quaternion()
    new THREE.Matrix4().multiplyMatrices(pile, local).decompose(pos, quat, new THREE.Vector3())
    return { pos, quat }
  })
}

const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)

export function BookPile() {
  const camera = useThree((s) => s.camera)
  const homes = useMemo(homePoses, [])
  const meshes = useRef<(THREE.Mesh | null)[]>([])
  const catcher = useRef<THREE.Mesh>(null)
  const flight = useRef(0) // 0 on the pile .. SPAN all shelved
  const rise = useRef(0) // the pile's hover lift, 0..1
  const [shelved, setShelved] = useState(false)
  const [hover, setHover] = useState<number | null>(null)

  const mats = useMemo(
    () =>
      BOOKS.map((s) => {
        const cloth = new THREE.MeshStandardMaterial({ color: s.color, roughness: 0.82 })
        const paper = new THREE.MeshStandardMaterial({ color: '#d9d3c4', roughness: 0.95 })
        const spine = new THREE.MeshStandardMaterial({ map: spineTexture(s.title, s.color, s.ink), roughness: 0.8 })
        // box faces: +x, -x, +y, -y, +z, -z — spine on +x, page block opposite and at head and tail
        return [spine, paper, cloth, cloth, paper, paper]
      }),
    [],
  )

  useEffect(() => book.setShelved(shelved), [shelved])

  useEffect(() => {
    if (!shelved) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && flight.current === SPAN && setShelved(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [shelved])

  useEffect(() => {
    const live = hover !== null && (!shelved || BOOKS[hover].id)
    document.body.style.cursor = live ? 'pointer' : ''
  }, [hover, shelved])

  const tmp = useMemo(
    () => ({ fwd: new THREE.Vector3(), back: new THREE.Vector3(), right: new THREE.Vector3(), up: new THREE.Vector3(), pos: new THREE.Vector3(), quat: new THREE.Quaternion(), basis: new THREE.Matrix4() }),
    [],
  )

  useFrame((_, dt) => {
    const { fwd, back, right, up, pos, quat, basis } = tmp
    flight.current = THREE.MathUtils.clamp(flight.current + (shelved ? 1 : -1) * (dt / FLIGHT), 0, SPAN)
    rise.current = THREE.MathUtils.damp(rise.current, hover !== null && !shelved && flight.current === 0 ? 1 : 0, 10, dt)
    camera.getWorldDirection(fwd)
    back.copy(fwd).negate()
    right.setFromMatrixColumn(camera.matrixWorld, 0)
    up.setFromMatrixColumn(camera.matrixWorld, 1)
    // standing on a shelf: spine (+x) toward the viewer, thickness (+y) across, cover height (+z) up
    basis.makeBasis(back, right, up)
    quat.setFromRotationMatrix(basis)
    const width = BOOKS.reduce((a, s) => a + s.h, 0) + SHELF_GAP * (BOOKS.length - 1)
    let x = -width / 2
    for (let i = BOOKS.length - 1; i >= 0; i--) {
      // top book stands leftmost, leaves first and lands last
      const s = BOOKS[i]
      const m = meshes.current[i]
      const order = BOOKS.length - 1 - i
      const t = ease(THREE.MathUtils.clamp(flight.current - order * STAGGER, 0, 1))
      const lift = hover === i && shelved && s.id ? 0.01 : 0
      pos.copy(camera.position).addScaledVector(fwd, SHELF_DIST).addScaledVector(right, x + s.h / 2).addScaledVector(up, lift)
      x += s.h + SHELF_GAP
      if (!m) continue
      m.position.lerpVectors(homes[i].pos, pos, t)
      m.position.y += Math.sin(Math.PI * t) * 0.1 // arc up off the desk
      m.position.y += rise.current * (0.012 + i * 0.006) * (1 - t) // hovered on the desk: the pile lifts, top book most
      m.quaternion.copy(homes[i].quat).slerp(quat, t)
      m.castShadow = t < 0.5 // up at the camera its shadow would land as a stray block on the desk
    }
    const c = catcher.current
    if (c) {
      c.position.copy(camera.position).addScaledVector(fwd, SHELF_DIST + 0.15)
      c.quaternion.copy(camera.quaternion)
      ;(c.material as THREE.MeshBasicMaterial).opacity = 0.6 * Math.min(1, flight.current)
    }
  })

  // nothing responds while the books are in flight, up or back
  const moving = () => flight.current > 0 && flight.current < SPAN

  const onBook = (i: number) => (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()
    if (moving()) return
    if (!shelved) return setShelved(true)
    const id = BOOKS[i].id
    if (id) window.dispatchEvent(new CustomEvent<ShelfBook>('ares:shelf', { detail: id }))
  }

  return (
    <>
      {BOOKS.map((s, i) => (
        <mesh
          key={s.title}
          ref={(m) => {
            meshes.current[i] = m
          }}
          position={homes[i].pos}
          quaternion={homes[i].quat}
          material={mats[i]}
          castShadow
          receiveShadow
          onPointerOver={(e) => {
            e.stopPropagation()
            setHover(i)
          }}
          onPointerOut={() => setHover((h) => (h === i ? null : h))}
          onClick={onBook(i)}
        >
          <boxGeometry args={[s.w, s.h, s.d]} />
        </mesh>
      ))}
      {/* while shelved: dims the desk behind the books, and a click anywhere else puts them back */}
      {shelved && (
        <mesh
          ref={catcher}
          onClick={(e) => {
            e.stopPropagation()
            if (!moving()) setShelved(false)
          }}
          onPointerOver={(e) => e.stopPropagation()}
        >
          <planeGeometry args={[4, 4]} />
          <meshBasicMaterial color="#000" transparent opacity={0} depthWrite={false} defines={{ NO_GRADE: '' }} />
        </mesh>
      )}
    </>
  )
}
