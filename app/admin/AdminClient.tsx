'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Profile } from '@/lib/types'

const DEPT_COLORS: Record<string, { bg: string; text: string }> = {
  Achat:      { bg: '#FFF7ED', text: '#C2410C' },
  Marketing:  { bg: '#FAF5FF', text: '#7E22CE' },
  Logistique: { bg: '#EFF6FF', text: '#1D4ED8' },
  ESAT:       { bg: '#F0FDF4', text: '#15803D' },
  Admin:      { bg: '#F4F4F5', text: '#3F3F46' },
}

export default function AdminClient({ currentUser, users: initialUsers }: { currentUser: Profile, users: Profile[] }) {
  const [users, setUsers] = useState<Profile[]>(initialUsers)
  const [showNew, setShowNew] = useState(false)
  const [form, setForm] = useState({ full_name: '', email: '', password: '', department: 'Achat' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const createUser = async () => {
    if (!form.full_name || !form.email || !form.password) return
    setLoading(true)
    setError('')
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data = await res.json()
    if (!res.ok) {
      setError(data.error?.message || 'Erreur lors de la création')
      setLoading(false)
      return
    }
    setForm({ full_name: '', email: '', password: '', department: 'Achat' })
    setShowNew(false)
    setLoading(false)
    router.refresh()
  }

  const deleteUser = async (id: string) => {
    if (!confirm('Supprimer cet utilisateur ?')) return
    await fetch(`/api/users?id=${id}`, { method: 'DELETE' })
    setUsers(prev => prev.filter(u => u.id !== id))
  }

  const inputStyle = {
    width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #E5E2DB',
    fontSize: 14, boxSizing: 'border-box' as const, background: '#FAFAF8',
  }

  return (
    <div style={{ fontFamily: 'var(--font-sans, system-ui, sans-serif)', background: '#F5F3EF', minHeight: '100vh', color: '#18181B' }}>

      {showNew && (
        <div className="modal-backdrop" onClick={() => setShowNew(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="modal-content" onClick={e => e.stopPropagation()}
            style={{ background: '#FFF', borderRadius: 16, padding: 32, width: 400, boxShadow: 'var(--shadow-xl)', border: '1px solid rgba(0,0,0,0.06)' }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 24px', letterSpacing: '-0.02em' }}>Nouvel utilisateur</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[
                { label: 'Nom complet', key: 'full_name', type: 'text', placeholder: 'Marie Dupont' },
                { label: 'Email', key: 'email', type: 'email', placeholder: 'marie@wala.com' },
                { label: 'Mot de passe', key: 'password', type: 'password', placeholder: '\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022' },
              ].map(f => (
                <div key={f.key}>
                  <label style={{ fontSize: 12, color: '#71717A', fontWeight: 600, display: 'block', marginBottom: 6 }}>{f.label}</label>
                  <input
                    type={f.type}
                    placeholder={f.placeholder}
                    value={(form as any)[f.key]}
                    onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                    style={inputStyle}
                  />
                </div>
              ))}
              <div>
                <label style={{ fontSize: 12, color: '#71717A', fontWeight: 600, display: 'block', marginBottom: 6 }}>Département</label>
                <select value={form.department} onChange={e => setForm(p => ({ ...p, department: e.target.value }))}
                  style={inputStyle}>
                  {['Achat', 'Marketing', 'Logistique', 'ESAT', 'Admin'].map(d => <option key={d}>{d}</option>)}
                </select>
              </div>
              {error && <p style={{ color: '#DC2626', fontSize: 13, margin: 0 }}>{error}</p>}
              <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                <button onClick={() => setShowNew(false)}
                  className="btn-secondary"
                  style={{ flex: 1, padding: '10px', borderRadius: 8, fontSize: 14 }}>
                  Annuler
                </button>
                <button onClick={createUser} disabled={loading}
                  className="btn-primary"
                  style={{ flex: 2, padding: '10px', borderRadius: 8, fontSize: 14, opacity: loading ? 0.7 : 1 }}>
                  {loading ? 'Création...' : 'Créer'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div style={{ background: '#18181B', color: '#F5F3EF', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 52 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 28, height: 28, background: '#D97706', borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: '#FFF' }}>&#10022;</div>
          <span style={{ fontSize: 15, fontWeight: 700 }}>OffreCosmo</span>
          <span style={{ fontSize: 13, color: '#52525B' }}>/ Admin</span>
        </div>
        <button onClick={() => router.push('/dashboard')}
          style={{ fontSize: 13, color: '#A1A1AA', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500 }}>
          &larr; Dashboard
        </button>
      </div>

      <div style={{ maxWidth: 680, margin: '36px auto', padding: '0 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0, letterSpacing: '-0.02em' }}>Utilisateurs</h1>
          <button onClick={() => setShowNew(true)}
            className="btn-primary"
            style={{ padding: '8px 16px', borderRadius: 8, fontSize: 13 }}>
            + Nouvel utilisateur
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {users.map(u => (
            <div key={u.id} style={{ background: '#FFF', border: '1px solid #E5E2DB', borderRadius: 10, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 14, boxShadow: 'var(--shadow-xs)' }}>
              <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#F4F4F5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#52525B' }}>
                {u.full_name.charAt(0)}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{u.full_name}</div>
                <div style={{ fontSize: 12, color: '#71717A' }}>{u.email}</div>
              </div>
              <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 6, background: DEPT_COLORS[u.department]?.bg, color: DEPT_COLORS[u.department]?.text }}>
                {u.department}
              </span>
              {u.id !== currentUser.id && (
                <button onClick={() => deleteUser(u.id)}
                  className="btn-danger"
                  style={{ padding: '5px 10px', borderRadius: 6, fontSize: 12 }}>
                  Supprimer
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
