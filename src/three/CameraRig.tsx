import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { book } from './bookState'

const H_FOV = 50.7 // 38 mm lens on a 36 mm sensor, as in the Blender camera

// Blender (x, y, z) -> three (x, z, -y)
const HERO = { pos: new THREE.Vector3(0, 1.3, 0.3), look: new THREE.Vector3(0, 0, -0.024) }
const READ = { pos: new THREE.Vector3(0, 0.94, 0.7), look: new THREE.Vector3(0, 0, 0.0) }

const pos = new THREE.Vector3()
const look = new THREE.Vector3()
const drift = new THREE.Vector2()

export function CameraRig() {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera
  useFrame(({ pointer, size }, dt) => {
    // keep the horizontal field of view fixed so the desk composition holds at any aspect
    const aspect = size.width / size.height
    const h = THREE.MathUtils.degToRad(aspect < 1 ? 70 : H_FOV)
    const fov = THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(h / 2) / aspect))
    if (Math.abs(camera.fov - fov) > 0.01) {
      camera.fov = fov
      camera.updateProjectionMatrix()
    }
    const t = book.cam.t
    pos.lerpVectors(HERO.pos, READ.pos, t)
    look.lerpVectors(HERO.look, READ.look, t)
    // gentle hand-held drift toward the pointer
    drift.lerp(pointer, 1 - Math.exp(-dt * 2))
    pos.x += drift.x * 0.015
    pos.z -= drift.y * 0.01
    camera.position.copy(pos)
    camera.lookAt(look)
  })
  return null
}
