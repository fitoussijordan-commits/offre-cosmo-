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
      minHeight: '100vh',
      background: '#F5F3EF',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      position: 'relative',
    }}>
      {/* Subtle grid pattern */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(0,0,0,0.03) 1px, transparent 0)',
        backgroundSize: '40px 40px',
      }} />

      <div className="modal-content" style={{
        background: '#FFF', borderRadius: 16, padding: '44px 36px', width: 380,
        boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 8px 40px rgba(0,0,0,0.06)',
        border: '1px solid rgba(0,0,0,0.06)',
        position: 'relative',
      }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 44, height: 44, background: '#18181B',
            borderRadius: 12, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18, color: '#D97706',
          }}>&#10022;</div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#18181B', margin: '14px 0 0', letterSpacing: '-0.025em' }}>OffreCosmo</h1>
          <p style={{ fontSize: 13, color: '#A1A1AA', marginTop: 4, fontWeight: 500 }}>WALA France</p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ fontSize: 12, color: '#71717A', fontWeight: 600, display: 'block', marginBottom: 6 }}>
              Email
            </label>
            <input
              type="email"
              placeholder="votre@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              style={{
                width: '100%', padding: '10px 14px', borderRadius: 8,
                border: '1px solid #E5E2DB', fontSize: 14, background: '#FAFAF8',
                outline: 'none', boxSizing: 'border-box',
              }}
            />
          </div>
          <div>
            <label style={{ fontSize: 12, color: '#71717A', fontWeight: 600, display: 'block', marginBottom: 6 }}>
              Mot de passe
            </label>
            <input
              type="password"
              placeholder="&#8226;&#8226;&#8226;&#8226;&#8226;&#8226;&#8226;&#8226;"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              style={{
                width: '100%', padding: '10px 14px', borderRadius: 8,
                border: '1px solid #E5E2DB', fontSize: 14, background: '#FAFAF8',
                outline: 'none', boxSizing: 'border-box',
              }}
            />
          </div>

          {error && (
            <div style={{
              fontSize: 13, color: '#DC2626', padding: '10px 14px',
              background: '#FEF2F2', borderRadius: 8, border: '1px solid #FECACA',
              fontWeight: 500,
            }}>
              {error}
            </div>
          )}

          <button
            onClick={handleLogin}
            disabled={loading}
            style={{
              padding: '11px', borderRadius: 8,
              background: loading ? '#71717A' : '#18181B',
              color: '#FFF', border: 'none', fontSize: 14, fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              marginTop: 4,
            }}
          >
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>
        </div>

        <div style={{ textAlign: 'center', marginTop: 20, fontSize: 12, color: '#D1CEC7' }}>
          Plateforme de gestion des offres
        </div>
      </div>
    </div>
  )
}
