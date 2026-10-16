import { useMemo } from 'react'
import * as THREE from 'three'
import { Desk } from './Desk'
import { Book } from './Book'
import { CameraRig } from './CameraRig'
import { ContactCard } from './ContactCard'

/**
 * No full-frame post-processing: the cinematic look (AgX, a touch of saturation, film grain) is
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
  // static film grain, physical objects only
  float grain = fract( sin( dot( gl_FragCoord.xy, vec2( 12.9898, 78.233 ) ) ) * 43758.5453 ) - 0.5;
  gl_FragColor.rgb += grain * 0.018;
#endif
`

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
      <ContactCard />
    </>
  )
}
