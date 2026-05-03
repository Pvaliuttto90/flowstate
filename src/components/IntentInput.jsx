import { useState } from 'react'

export default function IntentInput() {
  const [intent, setIntent] = useState('')
  const [spec, setSpec] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    const res = await fetch('/intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ intent }),
    })
    const data = await res.json()
    setSpec(data)
  }

  return (
    <div>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          value={intent}
          onChange={(e) => setIntent(e.target.value)}
        />
        <button type="submit">Submit</button>
      </form>
      {spec && (
        <div>
          <span>{spec.id}</span>
          <span>{spec.status}</span>
        </div>
      )}
    </div>
  )
}
