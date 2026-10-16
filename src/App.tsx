import { Suspense, useCallback, useEffect, useState, useSyncExternalStore } from 'react'
import { Canvas } from '@react-three/fiber'
import * as THREE from 'three'
import { Experience } from './three/Experience'
import { book } from './three/bookState'
import { studio } from './content/projects'
import { ContactForm } from './ContactForm'

/** WebGL falling back to a CPU rasteriser (hardware acceleration off / blocklisted GPU). */
function isSoftwareRenderer(gl: WebGLRenderingContext | WebGL2RenderingContext) {
  const info = gl.getExtension('WEBGL_debug_renderer_info')
  const name = String(info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER))
  return /swiftshader|llvmpipe|software|basic render/i.test(name)
}

function useBook() {
  return useSyncExternalStore(
    (cb) => book.subscribe(cb),
    () => (book.ready ? book.phase : 'loading') + (book.inspecting ? ':inspect' : ''),
  )
}

export default function App() {
  const [phase, mode] = useBook().split(':')
  const inspecting = mode === 'inspect'
  const [contact, setContact] = useState(false)
  const [software, setSoftware] = useState(false)
  const closeContact = useCallback(() => setContact(false), [])

  useEffect(() => {
    const open = () => setContact(true)
    window.addEventListener('ares:contact', open)
    return () => window.removeEventListener('ares:contact', open)
  }, [])

  useEffect(() => {
    if (contact) return // keys and wheel belong to the form while it's open
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') book.next()
      if (e.key === 'ArrowLeft') book.prev()
      if (e.key === 'Escape') {
        if (book.inspecting) book.inspect(false)
        else book.closeBook()
      }
    }
    let lastWheel = 0
    const onWheel = (e: WheelEvent) => {
      const now = performance.now()
      if (Math.abs(e.deltaY) < 20 || now - lastWheel < 900 || book.busy || book.inspecting) return
      lastWheel = now
      if (e.deltaY > 0) book.next()
      else book.prev()
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('wheel', onWheel, { passive: true })
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('wheel', onWheel)
    }
  }, [contact])

  return (
    <>
      <Canvas
        flat
        shadows={{ type: THREE.PCFSoftShadowMap }}
        // supersample even on 1x screens: pages are minified site captures, so extra pixels = crisper type
        dpr={[1.5, 2]}
        camera={{ fov: 30, near: 0.05, far: 10, position: [0, 1.3, 0.3] }}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
        onPointerMissed={() => phase === 'closed' && book.open()}
        onCreated={({ gl }) => setSoftware(isSoftwareRenderer(gl.getContext()))}
      >
        <Suspense fallback={null}>
          <Experience />
        </Suspense>
      </Canvas>

      <header className="bar">
        <span className="logo">● {studio.name}</span>
        <button className="pill" onClick={() => setContact(true)}>
          Get in Touch
        </button>
      </header>

      <section className={`hero ${phase === 'closed' ? 'show' : ''}`}>
        <h1>
          {studio.tagline.split('\n').map((l) => (
            <span key={l}>{l}</span>
          ))}
        </h1>
        <p>{studio.hint}</p>
      </section>

      <nav className={`dock ${phase === 'open' ? 'show' : ''}`}>
        <button onClick={() => book.inspect()}>{inspecting ? '← Back to spread' : 'Inspect page'}</button>
        <span />
        <button onClick={() => book.closeBook()}>Close book</button>
      </nav>

      <div className={`veil ${phase === 'loading' ? 'show' : ''}`}>
        <span>Setting the desk…</span>
      </div>

      <section className={`end ${phase === 'end' ? 'show' : ''}`}>
        <button className="pill big" onClick={() => setContact(true)}>
          ✉ Start a project
        </button>
        <button onClick={() => book.restart()}>Read again</button>
      </section>

      <ContactForm open={contact} onClose={closeContact} />

      {software && (
        <div className="gpu-warn">
          Your browser is rendering without the graphics card, so this will look soft and stutter. Turn on hardware
          acceleration (Chrome: Settings → System) and reload.
          <button onClick={() => setSoftware(false)}>×</button>
        </div>
      )}
    </>
  )
}
