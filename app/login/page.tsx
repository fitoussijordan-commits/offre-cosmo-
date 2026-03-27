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
      background: 'linear-gradient(145deg, #F8F7F4 0%, #F0EDE6 50%, #E8E4DC 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      position: 'relative', overflow: 'hidden',
    }}>
      {/* Decorative elements */}
      <div style={{
        position: 'absolute', top: -120, right: -120, width: 400, height: 400,
        borderRadius: '50%', background: 'rgba(255,179,71,0.06)',
        filter: 'blur(60px)',
      }} />
      <div style={{
        position: 'absolute', bottom: -80, left: -80, width: 300, height: 300,
        borderRadius: '50%', background: 'rgba(28,27,24,0.03)',
        filter: 'blur(40px)',
      }} />

      <div className="modal-content" style={{
        background: '#FFF', borderRadius: 20, padding: '48px 40px', width: 380,
        boxShadow: '0 20px 60px rgba(0,0,0,0.08), 0 4px 16px rgba(0,0,0,0.04)',
        border: '1px solid rgba(232,228,220,0.6)',
        position: 'relative',
      }}>
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{
            width: 48, height: 48, background: 'linear-gradient(135deg, #1C1B18, #333)',
            borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 20, margin: '0 auto 16px', color: '#FFB347',
            boxShadow: '0 4px 12px rgba(28,27,24,0.2)',
          }}>✦</div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#1C1B18', margin: 0, letterSpacing: '-0.02em' }}>OffreCosmo</h1>
          <p style={{ fontSize: 13, color: '#AAA', marginTop: 6, fontWeight: 500, letterSpacing: '0.04em' }}>WALA France</p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ fontSize: 11, color: '#999', fontWeight: 600, display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Email
            </label>
            <input
              type="email"
              placeholder="votre@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              style={{
                width: '100%', padding: '12px 16px', borderRadius: 10,
                border: '1px solid #E8E4DC', fontSize: 14, background: '#FAFAF8',
                outline: 'none', boxSizing: 'border-box',
              }}
            />
          </div>
          <div>
            <label style={{ fontSize: 11, color: '#999', fontWeight: 600, display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Mot de passe
            </label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              style={{
                width: '100%', padding: '12px 16px', borderRadius: 10,
                border: '1px solid #E8E4DC', fontSize: 14, background: '#FAFAF8',
                outline: 'none', boxSizing: 'border-box',
              }}
            />
          </div>

          {error && (
            <div style={{
              fontSize: 13, color: '#EF4444', margin: 0, padding: '10px 14px',
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
              padding: '13px', borderRadius: 10,
              background: loading ? '#555' : 'linear-gradient(135deg, #1C1B18, #2D2C28)',
              color: '#FFF', border: 'none', fontSize: 14, fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              marginTop: 6, letterSpacing: '0.01em',
              boxShadow: loading ? 'none' : '0 2px 8px rgba(28,27,24,0.2)',
            }}
          >
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>
        </div>

        <div style={{ textAlign: 'center', marginTop: 24, fontSize: 11, color: '#CCC' }}>
          Plateforme de gestion des offres
        </div>
      </div>
    </div>
  )
}
