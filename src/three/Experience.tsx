import { useMemo } from 'react'
import * as THREE from 'three'
import { EffectComposer, Bloom, Noise, Vignette, ToneMapping, HueSaturation } from '@react-three/postprocessing'
import { BlendFunction, ToneMappingMode } from 'postprocessing'
import { Desk } from './Desk'
import { Book } from './Book'
import { CameraRig } from './CameraRig'

/** Real-time key light matching the baked Blender spot (KeySpot: 95 W, 42° cone, blend 0.8). */
function KeyLight() {
  const target = useMemo(() => {
    const o = new THREE.Object3D()
    o.position.set(0.027, 0, -0.057)
    return o
  }, [])
  return (
    <>
      <primitive object={target} />
      <spotLight
        position={[-0.02, 1.35, -0.32]}
        target={target}
        angle={THREE.MathUtils.degToRad(21)}
        penumbra={0.8}
        intensity={5.5}
        decay={2}
        color="#fff2e0"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.00015}
        shadow-normalBias={0.0015}
        shadow-camera-near={0.6}
        shadow-camera-far={2}
      />
      <hemisphereLight args={['#9fb4ff', '#1a120c', 0.025]} />
    </>
  )
}

export function Experience() {
  return (
    <>
      <color attach="background" args={['#000000']} />
      <CameraRig />
      <KeyLight />
      <Desk />
      <Book />
      <EffectComposer multisampling={4}>
        <Bloom mipmapBlur intensity={0.3} luminanceThreshold={0.85} luminanceSmoothing={0.2} />
        <ToneMapping mode={ToneMappingMode.AGX} />
        <HueSaturation saturation={0.12} />
        <Vignette offset={0.28} darkness={0.65} />
        <Noise opacity={0.05} blendFunction={BlendFunction.OVERLAY} />
      </EffectComposer>
    </>
  )
}
