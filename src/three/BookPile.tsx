import { useMemo } from 'react'
import * as THREE from 'three'

/**
 * A small pile of real-time books at the desk's top right (where the coffee used to sit). Lit live by
 * the key light so they cast shadows; later each will open to its own content. The bottom one is the
 * privacy policy.
 */
type Spec = { w: number; d: number; h: number; color: string; title: string; ink: string; yaw: number; dx: number; dz: number }

const BOOKS: Spec[] = [
  { w: 0.13, d: 0.18, h: 0.024, color: '#1c1d22', title: 'PRIVACY POLICY', ink: '#c9c4b8', yaw: 4, dx: 0, dz: 0 },
  { w: 0.115, d: 0.16, h: 0.019, color: '#5a2f26', title: 'NOTES', ink: '#e3d6c0', yaw: -9, dx: -0.006, dz: 0.004 },
  { w: 0.1, d: 0.14, h: 0.016, color: '#2c3a33', title: 'SKETCHES', ink: '#e3d6c0', yaw: 13, dx: 0.004, dz: -0.006 },
]

function spineTexture(title: string, color: string, ink: string) {
  const c = document.createElement('canvas')
  c.width = 1024
  c.height = 128
  const g = c.getContext('2d')!
  g.fillStyle = color
  g.fillRect(0, 0, c.width, c.height)
  g.fillStyle = ink
  g.font = '500 58px "Cormorant Garamond", Georgia, serif'
  g.textAlign = 'center'
  g.textBaseline = 'middle'
  ;(g as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing = '6px'
  g.fillText(title, c.width / 2, c.height / 2 + 2)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 16
  return t
}

function PileBook({ s, y }: { s: Spec; y: number }) {
  const mats = useMemo(() => {
    const cloth = new THREE.MeshStandardMaterial({ color: s.color, roughness: 0.82 })
    const paper = new THREE.MeshStandardMaterial({ color: '#d9d3c4', roughness: 0.95 })
    const spine = new THREE.MeshStandardMaterial({ map: spineTexture(s.title, s.color, s.ink), roughness: 0.8 })
    // box faces: +x, -x, +y, -y, +z, -z — spine on +x (turned to face the viewer), page block opposite
    return [spine, paper, cloth, cloth, paper, paper]
  }, [s])
  return (
    <mesh
      position={[s.dx, y + s.h / 2, s.dz]}
      rotation-y={THREE.MathUtils.degToRad(s.yaw)}
      material={mats}
      castShadow
      receiveShadow
    >
      <boxGeometry args={[s.w, s.h, s.d]} />
    </mesh>
  )
}

export function BookPile() {
  let y = 0
  return (
    <group position={[0.44, 0, -0.13]} rotation-y={THREE.MathUtils.degToRad(-98)}>
      {BOOKS.map((s) => {
        const at = y
        y += s.h
        return <PileBook key={s.title} s={s} y={at} />
      })}
    </group>
  )
}
