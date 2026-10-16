import { useEffect, useRef, useState, type FormEvent } from 'react'
import { studio } from './content/projects'

/**
 * Contact form opened from the book's last page (or the header). Sending composes an email to the
 * studio in the visitor's mail app with everything filled in — no third-party form service needed.
 */
export function ContactForm({ open, onClose }: { open: boolean; onClose: () => void }) {
  const first = useRef<HTMLInputElement>(null)
  const [sent, setSent] = useState(false)

  useEffect(() => {
    if (!open) return
    setSent(false)
    const t = setTimeout(() => first.current?.focus(), 250)
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => {
      clearTimeout(t)
      window.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    const name = String(f.get('name') ?? '').trim()
    const subject = `Project enquiry — ${name || 'via ares portfolio'}`
    const body = [
      String(f.get('message') ?? '').trim(),
      '',
      `— ${name}`,
      String(f.get('email') ?? '').trim(),
      f.get('kind') ? `Looking for: ${f.get('kind')}` : '',
      f.get('budget') ? `Budget: ${f.get('budget')}` : '',
    ]
      .filter((l, i) => l || i < 2)
      .join('\n')
    window.location.href = `mailto:${studio.contact}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
    setSent(true)
  }

  return (
    <div className={`contact ${open ? 'show' : ''}`} onClick={(e) => e.target === e.currentTarget && onClose()} aria-hidden={!open}>
      <form className="contact-card" onSubmit={submit}>
        <button type="button" className="contact-close" onClick={onClose} aria-label="Close">
          ×
        </button>
        <h2>
          Get in <em>touch.</em>
        </h2>
        <p className="contact-lede">Tell me about the site you have in mind — I reply within a day.</p>
        <label>
          <span>Name</span>
          <input ref={first} name="name" autoComplete="name" required />
        </label>
        <label>
          <span>Email</span>
          <input name="email" type="email" autoComplete="email" required />
        </label>
        <div className="contact-row">
          <label>
            <span>Looking for</span>
            <select name="kind" defaultValue="">
              <option value="">Choose…</option>
              <option>A new website</option>
              <option>Interactive 3D / WebGL</option>
              <option>Product launch page</option>
              <option>Something else</option>
            </select>
          </label>
          <label>
            <span>Budget</span>
            <select name="budget" defaultValue="">
              <option value="">Choose…</option>
              <option>Under $2k</option>
              <option>$2k – $5k</option>
              <option>$5k – $15k</option>
              <option>$15k+</option>
            </select>
          </label>
        </div>
        <label>
          <span>Project</span>
          <textarea name="message" rows={5} required />
        </label>
        <div className="contact-actions">
          <button type="submit" className="pill big">
            Send message
          </button>
          <a href={`mailto:${studio.contact}`}>{studio.contact}</a>
        </div>
        {sent && <p className="contact-sent">Your mail app should open with the message ready to send.</p>}
      </form>
    </div>
  )
}
