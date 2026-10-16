import { useMemo } from 'react'
import { useGLTF, useTexture } from '@react-three/drei'
import * as THREE from 'three'
import { asset } from '../asset'
import { BookPile } from './BookPile'

/**
 * Lightmaps were written at -1 EV (see blender/scripts/bake_export.py), so 2.0 restores them exactly.
 * Slightly less stands in for the contrast of Blender's 'AgX - Medium High Contrast' look.
 */
const BAKE_GAIN = 1.6
/** The veneer tiles every 0.9 m, as in blender/scripts/build_scene.py. */
const TILE = 0.9

/**
 * Desk + props. Their light is baked in Cycles and drawn unlit — except the desk's lacquer: its
 * reflections depend on where you look from, so the desk carries its baked diffuse light as
 * emission and gets live, view-dependent reflections of the studio softbox from the oak's
 * normal/roughness maps (the streaks that run along the grain).
 */
/**
 * The coffee's surface, drawn live over the baked mug so it catches a real wet sheen from the softbox.
 * Placement mirrors build_scene.py: the Mug group at Blender (-0.48, 0.15), coffee disc 83 mm up, r 37.8 mm.
 */
function CoffeeTop() {
  const mat = useMemo(
    () => new THREE.MeshPhysicalMaterial({ color: 0x1a0d07, roughness: 0.06, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.04 }),
    [],
  )
  return (
    <mesh position={[-0.48, 0.0832, -0.15]} rotation-x={-Math.PI / 2} material={mat}>
      <circleGeometry args={[0.0378, 96]} />
    </mesh>
  )
}

export function Desk() {
  const { scene } = useGLTF(asset('models/desk.glb'))
  const [oakNormal, oakRough] = useTexture([asset('textures/oak_normal.jpg'), asset('textures/oak_rough.jpg')])
  useMemo(() => {
    for (const t of [oakNormal, oakRough]) {
      t.wrapS = t.wrapT = THREE.RepeatWrapping
      t.anisotropy = 16
      t.channel = 1
      t.colorSpace = THREE.NoColorSpace
    }
    scene.traverse((o) => {
      const m = o as THREE.Mesh
      // once per mesh: React may run this setup twice, and the glTF's own material holds the lightmap
      if (!m.isMesh || m.userData.baked) return
      m.userData.baked = true
      const old = m.material as THREE.MeshStandardMaterial
      if (old.map) old.map.anisotropy = 16
      if (m.name === 'Desk') {
        // second UV set: the veneer's own tiling, from the plane's position (Blender x, y = three x, -z)
        const pos = m.geometry.attributes.position as THREE.BufferAttribute
        const uv1 = new Float32Array(pos.count * 2)
        for (let i = 0; i < pos.count; i++) {
          uv1[i * 2] = pos.getX(i) / TILE + 0.5
          uv1[i * 2 + 1] = -pos.getZ(i) / TILE + 0.5
        }
        m.geometry.setAttribute('uv1', new THREE.BufferAttribute(uv1, 2))
        m.material = new THREE.MeshPhysicalMaterial({
          color: 0x000000, // all diffuse light comes from the bake
          emissive: 0xffffff,
          emissiveMap: old.map,
          emissiveIntensity: BAKE_GAIN,
          roughness: 0.26, // x the scan's roughness: a satin lacquer, rougher in the pores
          roughnessMap: oakRough,
          normalMap: oakNormal,
          normalScale: new THREE.Vector2(1.8, 1.8),
          metalness: 0,
        })
      } else {
        m.material = new THREE.MeshBasicMaterial({ map: old.map, color: new THREE.Color().setScalar(BAKE_GAIN) })
      }
    })
  }, [scene, oakNormal, oakRough])
  return (
    <>
      <primitive object={scene} />
      <CoffeeTop />
      <BookPile />
      {/* catches the real-time book's shadow on top of the baked desk */}
      <mesh rotation-x={-Math.PI / 2} position-y={0.0004} receiveShadow>
        <planeGeometry args={[1.8, 1.2]} />
        <shadowMaterial opacity={0.6} defines={{ NO_GRADE: '' }} />
      </mesh>
    </>
  )
}

useGLTF.preload(asset('models/desk.glb'))
