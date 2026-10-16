import { useEffect, useState } from 'react'
import { projects, studio } from './content/projects'
import type { ShelfBook } from './three/BookPile'

/** The reading panel for the books on the desk's pile (src/three/BookPile.tsx). */
export function ShelfPanel() {
  const [book, setBook] = useState<ShelfBook | null>(null)
  const [shown, setShown] = useState<ShelfBook>('links') // keeps content while the panel fades out

  useEffect(() => {
    const open = (e: Event) => {
      const id = (e as CustomEvent<ShelfBook>).detail
      setShown(id)
      setBook(id)
    }
    window.addEventListener('ares:shelf', open)
    return () => window.removeEventListener('ares:shelf', open)
  }, [])

  useEffect(() => {
    if (!book) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      e.stopImmediatePropagation()
      setBook(null)
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [book])

  const close = () => setBook(null)
  return (
    <div className={`contact shelf ${book ? 'show' : ''}`} onClick={(e) => e.target === e.currentTarget && close()} aria-hidden={!book}>
      <article className="contact-card shelf-card">
        <button type="button" className="contact-close" onClick={close} aria-label="Close">
          ×
        </button>
        {shown === 'links' ? <Links /> : <Privacy />}
      </article>
    </div>
  )
}

function Links() {
  return (
    <>
      <h2>
        The <em>sites.</em>
      </h2>
      <p className="contact-lede">Every project in the book, live.</p>
      <ul className="shelf-links">
        {projects.map((p) => (
          <li key={p.name}>
            <a href={p.url} target="_blank" rel="noopener noreferrer">
              <strong>{p.name}</strong>
              <span>{p.subtitle}</span>
              <small>{p.discipline}</small>
            </a>
          </li>
        ))}
        <li>
          <a href="https://github.com/leecodeswell" target="_blank" rel="noopener noreferrer">
            <strong>GitHub</strong>
            <span>@leecodeswell</span>
            <small>Source for everything here</small>
          </a>
        </li>
        <li>
          <a href={`mailto:${studio.contact}`}>
            <strong>Email</strong>
            <span>{studio.contact}</span>
            <small>Start a project</small>
          </a>
        </li>
      </ul>
    </>
  )
}

function Privacy() {
  return (
    <>
      <h2>
        Privacy <em>policy.</em>
      </h2>
      <p className="contact-lede">Last updated October 16, 2026</p>
      <div className="shelf-prose">
        <p>
          This policy covers this portfolio website, ares by Lee Thompson. The short version: the site doesn't collect,
          store or sell anything about you.
        </p>
        <h3>What we collect</h3>
        <p>
          Nothing, directly. There are no accounts, no forms that send data to a server, and no database. The contact
          form only opens your own email app with a message filled in; nothing is sent until you send it yourself, and
          then it arrives in our inbox like any other email.
        </p>
        <h3>Emails you send us</h3>
        <p>
          If you write to us, we use your name, email address and message only to reply and to discuss your project.
          We don't add you to mailing lists or share your message with anyone.
        </p>
        <h3>Who helps us</h3>
        <ul>
          <li>GitHub Pages hosts this website and, like any web host, may log basic request details such as IP addresses for security.</li>
          <li>Google Fonts serves the site's typefaces; your browser requests them directly from Google.</li>
          <li>Links in the book lead to other sites, which have their own policies.</li>
        </ul>
        <h3>What we don't do</h3>
        <p>
          We don't use cookies, analytics, advertising, tracking pixels or fingerprinting. The 3D scene and the project
          previews run entirely in your browser.
        </p>
        <h3>Your choices</h3>
        <p>
          You can ask us to delete any email correspondence at any time. Depending on where you live, you may have
          rights under laws such as the GDPR or CCPA; email{' '}
          <a href={`mailto:${studio.contact}`}>{studio.contact}</a> and we'll help.
        </p>
        <h3>Changes</h3>
        <p>If we change this policy in a way that matters, we'll update the date above.</p>
      </div>
    </>
  )
}
