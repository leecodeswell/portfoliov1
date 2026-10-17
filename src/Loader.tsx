import { useEffect, useState } from 'react'
import { useProgress } from '@react-three/drei'

const LINES = ['Setting the desk', 'Pouring the coffee', 'Warming the lamp', 'Binding the pages', 'Almost there']

/**
 * The loading screen: a small open book whose pages slowly turn, the real download progress, and a
 * calm line that changes every few seconds. It stays until the scene has drawn its first frame.
 */
export function Loader({ show }: { show: boolean }) {
  const { progress } = useProgress()
  const [line, setLine] = useState(0)
  const [shown, setShown] = useState(0) // eased, so the bar never jumps or runs backwards
  useEffect(() => {
    if (!show) return
    const t = setInterval(() => setLine((l) => Math.min(l + 1, LINES.length - 1)), 3200)
    return () => clearInterval(t)
  }, [show])
  useEffect(() => {
    // the scene still needs a moment after the last download: hold just short of the end until then
    const target = show ? Math.min(progress, 96) : 100
    setShown((s) => Math.max(s, target))
  }, [progress, show])

  return (
    <div className={`loader ${show ? 'show' : ''}`} role="status" aria-live="polite" aria-hidden={!show}>
      <svg className="loader-book" viewBox="0 0 120 64" aria-hidden="true">
        <path className="spine" d="M60 10 V58" />
        <path className="cover" d="M60 58 C44 52 22 52 6 58 V12 C22 6 44 6 60 12 C76 6 98 6 114 12 V58 C98 52 76 52 60 58 Z" />
        <g className="leaf l1"><path d="M60 12 C74 7 92 7 106 12 V54 C92 49 74 49 60 54 Z" /></g>
        <g className="leaf l2"><path d="M60 12 C74 7 92 7 106 12 V54 C92 49 74 49 60 54 Z" /></g>
        <g className="leaf l3"><path d="M60 12 C74 7 92 7 106 12 V54 C92 49 74 49 60 54 Z" /></g>
      </svg>
      <div className="loader-word">ares</div>
      <div className="loader-bar" aria-hidden="true">
        <i style={{ transform: `scaleX(${shown / 100})` }} />
      </div>
      <div className="loader-line" key={line}>
        {LINES[line]}…
      </div>
    </div>
  )
}
