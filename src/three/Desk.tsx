import { useMemo } from 'react'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'

/**
 * Lightmaps were written at -1 EV (see blender/scripts/bake_export.py), so 2.0 restores them exactly.
 * Slightly less stands in for the contrast of Blender's 'AgX - Medium High Contrast' look.
 */
const BAKE_GAIN = 1.6

/** Static desk + props with Cycles lighting baked into their textures: drawn unlit. */
export function Desk() {
  const { scene } = useGLTF('/models/desk.glb')
  useMemo(() => {
    scene.traverse((o) => {
      const m = o as THREE.Mesh
      if (!m.isMesh) return
      const old = m.material as THREE.MeshStandardMaterial
      if (old.map) old.map.anisotropy = 8
      m.material = new THREE.MeshBasicMaterial({ map: old.map, color: new THREE.Color().setScalar(BAKE_GAIN) })
    })
  }, [scene])
  return (
    <>
      <primitive object={scene} />
      {/* catches the real-time book's shadow on top of the baked desk */}
      <mesh rotation-x={-Math.PI / 2} position-y={0.0004} receiveShadow>
        <planeGeometry args={[1.8, 1.2]} />
        <shadowMaterial opacity={0.6} />
      </mesh>
    </>
  )
}

useGLTF.preload('/models/desk.glb')
