import { Suspense, useEffect, useSyncExternalStore } from 'react'
import { Canvas } from '@react-three/fiber'
import * as THREE from 'three'
import { Experience } from './three/Experience'
import { book } from './three/bookState'
import { studio } from './content/projects'

function useBook() {
  return useSyncExternalStore(
    (cb) => book.subscribe(cb),
    () => (book.ready ? book.phase : 'loading') + (book.inspecting ? ':inspect' : ''),
  )
}

export default function App() {
  const [phase, mode] = useBook().split(':')
  const inspecting = mode === 'inspect'

  useEffect(() => {
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
  }, [])

  return (
    <>
      <Canvas
        flat
        shadows={{ type: THREE.PCFSoftShadowMap }}
        dpr={[1, 2]}
        camera={{ fov: 30, near: 0.05, far: 10, position: [0, 1.3, 0.3] }}
        gl={{ antialias: false, powerPreference: 'high-performance' }}
        onPointerMissed={() => phase === 'closed' && book.open()}
      >
        <Suspense fallback={null}>
          <Experience />
        </Suspense>
      </Canvas>

      <header className="bar">
        <span className="logo">● {studio.name}</span>
        <a className="pill" href={`mailto:${studio.contact}`}>
          Get in Touch
        </a>
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
        <a className="pill big" href={`mailto:${studio.contact}`}>
          ✉ Start a project
        </a>
        <button onClick={() => book.restart()}>Read again</button>
      </section>
    </>
  )
}
