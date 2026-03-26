'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleLogin = async () => {
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError('Email ou mot de passe incorrect')
      setLoading(false)
    } else {
      router.push('/dashboard')
    }
  }

  return (
    <div style={{
      minHeight: '100vh', background: '#F8F7F4', display: 'flex',
      alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui'
    }}>
      <div style={{
        background: '#FFF', borderRadius: 16, padding: 40, width: 360,
        boxShadow: '0 4px 24px rgba(0,0,0,0.08)', border: '1px solid #E8E4DC'
      }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 40, height: 40, background: '#1C1B18', borderRadius: 10,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18, margin: '0 auto 12px'
          }}>✦</div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1C1B18', margin: 0 }}>OffreCosmo</h1>
          <p style={{ fontSize: 13, color: '#888', marginTop: 4 }}>WALA France</p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            style={{
              padding: '12px 14px', borderRadius: 8, border: '1px solid #E8E4DC',
              fontSize: 14, background: '#F8F7F4', outline: 'none'
            }}
          />
          <input
            type="password"
            placeholder="Mot de passe"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            style={{
              padding: '12px 14px', borderRadius: 8, border: '1px solid #E8E4DC',
              fontSize: 14, background: '#F8F7F4', outline: 'none'
            }}
          />
          {error && <p style={{ fontSize: 13, color: '#EF4444', margin: 0 }}>{error}</p>}
          <button
            onClick={handleLogin}
            disabled={loading}
            style={{
              padding: '12px', borderRadius: 8, background: '#1C1B18',
              color: '#FFF', border: 'none', fontSize: 14, fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1,
              marginTop: 4
            }}
          >
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>
        </div>
      </div>
    </div>
  )
}
