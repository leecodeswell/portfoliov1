import { useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { studio } from '../content/projects'

/** A 5x3" index card (127 x 76 mm) resting on the desk above the book. */
const CW = 0.127
const CD = 0.076
const CT = 0.0005

function cardTexture() {
  const c = document.createElement('canvas')
  const t = new THREE.CanvasTexture(c)
  draw(c)
  // repaint once the web fonts are in, so the card never keeps fallback type
  Promise.all([
    document.fonts.load('italic 400 100px "Instrument Serif"'),
    document.fonts.load('500 100px "Inter Tight"'),
  ]).then(() => {
    draw(c)
    t.needsUpdate = true
  })
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 16
  return t
}

function draw(c: HTMLCanvasElement) {
  c.width = 2048
  c.height = Math.round((2048 * CD) / CW)
  const g = c.getContext('2d')!
  // warm card stock with faint ruled lines and a red header rule, like a library index card
  g.fillStyle = '#efe9dc'
  g.fillRect(0, 0, c.width, c.height)
  for (let y = 330; y < c.height - 60; y += 112) {
    g.fillStyle = 'rgba(70, 110, 170, 0.22)'
    g.fillRect(70, y, c.width - 140, 3)
  }
  g.fillStyle = 'rgba(190, 60, 60, 0.45)'
  g.fillRect(70, 230, c.width - 140, 4)
  g.fillStyle = '#1b1b1f'
  g.font = 'italic 400 230px "Instrument Serif", Georgia, serif'
  g.fillText('Get in touch', 110, 195)
  g.font = '500 70px "Inter Tight", Arial, sans-serif'
  g.fillStyle = '#2a3f8f'
  g.fillText(studio.contact, 115, 420)
  g.font = '400 54px "Inter Tight", Arial, sans-serif'
  g.fillStyle = '#4a4a50'
  g.fillText('Websites · launches · interactive 3D', 115, 532)
  g.fillText('Click the card to open the contact page →', 115, 644)
}

/** Opens the contact form (the same one as the header's Get in Touch). */
export function ContactCard() {
  const lift = useRef<THREE.Group>(null!)
  const [hover, setHover] = useState(false)
  const mats = useMemo(() => {
    const face = new THREE.MeshStandardMaterial({ map: cardTexture(), roughness: 0.85 })
    const edge = new THREE.MeshStandardMaterial({ color: '#e7e0d1', roughness: 0.9 })
    return [edge, edge, face, edge, edge, edge]
  }, [])
  useFrame((_, dt) => {
    // hover: the card lifts off the desk and tips toward you a touch
    const k = 1 - Math.exp(-dt * 10)
    const g = lift.current
    g.position.y += ((hover ? 0.008 : 0) - g.position.y) * k
    g.rotation.x += ((hover ? 0.12 : 0) - g.rotation.x) * k
  })
  return (
    // world: above the book in the hero frame, slightly askew like it was set down by hand
    <group position={[0.07, CT / 2 + 0.0003, -0.21]} rotation-y={THREE.MathUtils.degToRad(-5)}>
      <group ref={lift}>
        <mesh
          material={mats}
          castShadow
          receiveShadow
          onPointerOver={(e) => (e.stopPropagation(), setHover(true), (document.body.style.cursor = 'pointer'))}
          onPointerOut={() => (setHover(false), (document.body.style.cursor = ''))}
          onClick={(e) => (e.stopPropagation(), window.dispatchEvent(new Event('ares:contact')))}
        >
          <boxGeometry args={[CW, CT, CD]} />
        </mesh>
      </group>
    </group>
  )
}
