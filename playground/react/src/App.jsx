import { useState } from 'react'

function StatCard({ label, value }) {
  return (
    <div className="card">
      <span className="card-label">{label}</span>
      <strong className="card-value">{value}</strong>
    </div>
  )
}

export default function App() {
  const [dark, setDark] = useState(false)
  const toggle = () => {
    const next = !dark
    setDark(next)
    document.documentElement.dataset.theme = next ? 'dark' : 'light'
  }
  return (
    <main className="page">
      <header className="hero">
        <h1>Soil health dashboard</h1>
        <p className="lede">A playground page for testing fairy polish.</p>
        <div className="actions">
          <button className="btn primary">Get started</button>
          <button className="btn" onClick={toggle}>{dark ? 'Light mode' : 'Dark mode'}</button>
        </div>
      </header>
      <section className="grid">
        <StatCard label="Total acres" value="12,480" />
        <StatCard label="Producers" value="214" />
        <StatCard label="Cover crop %" value="38%" />
      </section>
      <ul className="list">
        <li>First item</li>
        <li>Second item</li>
        <li>Third item</li>
      </ul>
    </main>
  )
}
