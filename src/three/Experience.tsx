import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib.js'
import { Desk } from './Desk'
import { Book } from './Book'
import { CameraRig } from './CameraRig'
import { ContactCard } from './ContactCard'

/**
 * No full-frame post-processing: the cinematic look (AgX and a touch of saturation) is
 * applied per material to physical things only — desk, props, book cloth. Page content defines
 * NO_GRADE and reaches the screen pixel-for-pixel as the sites render it.
 */
const agxSource = (() => {
  // three only compiles its tone-mapping functions when it tone maps itself, which it skips when
  // rendering into the post-processing buffers — so carry a renamed copy of its AgX in `common`.
  const src = THREE.ShaderChunk.tonemapping_pars_fragment
  const body = src.slice(src.indexOf('const mat3 LINEAR_REC2020_TO_LINEAR_SRGB'), src.indexOf('vec3 NeutralToneMapping'))
  return body
    .replace(/LINEAR_REC2020_TO_LINEAR_SRGB/g, 'GRADE_2020_TO_SRGB')
    .replace(/LINEAR_SRGB_TO_LINEAR_REC2020/g, 'GRADE_SRGB_TO_2020')
    .replace(/agxDefaultContrastApprox/g, 'gradeAgxContrast')
    .replace(/AgXToneMapping/g, 'gradeAgX')
    .replace(/color \*= toneMappingExposure;/g, '')
})()
if (!THREE.ShaderChunk.common.includes('gradeAgX')) THREE.ShaderChunk.common += `
${agxSource}
`
THREE.ShaderChunk.tonemapping_fragment = /* glsl */ `
#ifndef NO_GRADE
  gl_FragColor.rgb = gradeAgX( gl_FragColor.rgb );
  float gradeLuma = dot( gl_FragColor.rgb, vec3( 0.2126, 0.7152, 0.0722 ) );
  gl_FragColor.rgb = mix( vec3( gradeLuma ), gl_FragColor.rgb, 1.12 );
#endif
`

// Blender KEY (blender/scripts/build_scene.py), converted Blender (x, y, z) -> three (x, z, -y)
const KEY_POS: [number, number, number] = [0.07, 1.15, 0.04]
const KEY_TARGET: [number, number, number] = [0.05, 0, 0.08]
const KEY_COLOR = new THREE.Color(0.82, 0.9, 1.0)
const KEY_SIZE: [number, number] = [0.62, 0.3]

RectAreaLightUniformsLib.init()

/**
 * Real-time light for the book (the desk's lighting is baked). The softbox gives the cloth and board
 * edges the same broad, cool studio reflection as the bake; a soft spot from the same place casts
 * the book's shadow onto the desk. Pages are unlit and ignore both.
 */
function KeyLight() {
  const target = useMemo(() => {
    const o = new THREE.Object3D()
    o.position.set(...KEY_TARGET)
    return o
  }, [])
  const box = useRef<THREE.RectAreaLight>(null!)
  useEffect(() => box.current.lookAt(...KEY_TARGET), [])
  return (
    <>
      <primitive object={target} />
      <rectAreaLight ref={box} position={KEY_POS} width={KEY_SIZE[0]} height={KEY_SIZE[1]} intensity={3.2} color={KEY_COLOR} />
      <spotLight
        position={KEY_POS}
        target={target}
        angle={THREE.MathUtils.degToRad(30)}
        penumbra={1}
        intensity={2.2}
        decay={2}
        color={KEY_COLOR}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.00015}
        shadow-normalBias={0.0015}
        shadow-camera-near={0.5}
        shadow-camera-far={2}
      />
      <hemisphereLight args={['#a9bfff', '#0b0b0e', 0.03]} />
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
      <ContactCard />
    </>
  )
}
