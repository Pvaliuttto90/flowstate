import { useState } from 'react'
import { useAuth } from '@clerk/clerk-react'

export default function IntentInput() {
  const { getToken } = useAuth()
  const [intent, setIntent] = useState('')
  const [spec, setSpec] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    const token = await getToken()
    const res = await fetch('/intent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
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
