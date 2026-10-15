import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { book, W } from './bookState'

const H_FOV = 50.7 // 38 mm lens on a 36 mm sensor, as in the Blender camera

// Blender (x, y, z) -> three (x, z, -y)
const HERO = { pos: new THREE.Vector3(0, 1.3, 0.3), look: new THREE.Vector3(0, 0, -0.024) }
const READ = { pos: new THREE.Vector3(0, 0.92, 0.7), look: new THREE.Vector3(0, 0, 0.0) }
/** Inspect: hover ~26 cm above the right page's centre (book sits at z 0.03). */
const PAGE = new THREE.Vector3(W / 2, 0, 0.03)

const pos = new THREE.Vector3()
const look = new THREE.Vector3()
const fpos = new THREE.Vector3()
const flook = new THREE.Vector3()
const drift = new THREE.Vector2()

export function CameraRig() {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera
  useFrame(({ pointer, size, clock }, dt) => {
    // keep the horizontal field of view fixed so the desk composition holds at any aspect
    const aspect = size.width / size.height
    const h = THREE.MathUtils.degToRad(aspect < 1 ? 70 : H_FOV)
    const fov = THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(h / 2) / aspect))
    if (Math.abs(camera.fov - fov) > 0.01) {
      camera.fov = fov
      camera.updateProjectionMatrix()
    }
    const { t, nudge, focus } = book.cam
    const time = clock.elapsedTime
    pos.lerpVectors(HERO.pos, READ.pos, t)
    look.lerpVectors(HERO.look, READ.look, t)
    // swoop: the move between hero and reading views arcs up and back rather than sliding straight
    const arc = Math.sin(Math.PI * t)
    pos.y += arc * 0.16
    pos.z += arc * 0.12

    // hand-held feel: pointer parallax plus a slow, layered idle sway
    drift.lerp(pointer, 1 - Math.exp(-dt * 1.6))
    pos.x += drift.x * 0.05 + Math.sin(time * 0.31) * 0.012 + Math.sin(time * 0.83) * 0.003
    pos.z -= drift.y * 0.035 + Math.sin(time * 0.23) * 0.008
    pos.y += Math.sin(time * 0.47) * 0.009
    look.x += drift.x * 0.012

    // lean into a page turn
    pos.x += nudge * 0.06
    look.x += nudge * 0.025

    // inspect: glide down over the right page, the pointer pans across it like a loupe
    if (focus > 0) {
      fpos.set(PAGE.x + drift.x * 0.17, 0.27, PAGE.z + 0.09 - drift.y * 0.1)
      flook.set(PAGE.x + drift.x * 0.17, 0, PAGE.z - drift.y * 0.1)
      pos.lerp(fpos, focus)
      look.lerp(flook, focus)
    }

    camera.position.copy(pos)
    camera.lookAt(look)
    camera.rotateZ(-nudge * 0.02 + Math.sin(time * 0.27) * 0.004 * (1 - focus))
  })
  return null
}
