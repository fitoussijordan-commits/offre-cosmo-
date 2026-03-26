'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Offre, Profile } from '@/lib/types'

const MONTHS = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc']
const DEPT_COLORS: Record<string, { bg: string; text: string }> = {
  Achat:      { bg: '#FFF3E0', text: '#E65100' },
  Marketing:  { bg: '#F3E5F5', text: '#6A1B9A' },
  Logistique: { bg: '#E3F2FD', text: '#0D47A1' },
  ESAT:       { bg: '#E8F5E9', text: '#1B5E20' },
  Admin:      { bg: '#F5F5F5', text: '#333' },
}
const STATUS_CONFIG: Record<string, { color: string; bg: string }> = {
  'À faire':  { color: '#94A3B8', bg: '#F1F5F9' },
  'En cours': { color: '#F59E0B', bg: '#FFFBEB' },
  'Fait':     { color: '#10B981', bg: '#ECFDF5' },
  'Bloqué':   { color: '#EF4444', bg: '#FEF2F2' },
}
const COLORS = ['#FF6B9D','#FFB347','#C0392B','#3498DB','#2ECC71','#9B59B6','#1ABC9C','#E67E22']

export default function DashboardClient({ profile, offres: initialOffres }: { profile: Profile, offres: Offre[] }) {
  const [offres, setOffres] = useState<Offre[]>(initialOffres)
  const [selectedId, setSelectedId] = useState<string | null>(initialOffres[0]?.id || null)
  const [filterDept, setFilterDept] = useState('Tous')
  const [editingNote, setEditingNote] = useState<string | null>(null)
  const [showNewTask, setShowNewTask] = useState(false)
  const [newTask, setNewTask] = useState({ label: '', dept: 'Achat', deadline: '' })
  const [showNewOffre, setShowNewOffre] = useState(false)
  const [newOffre, setNewOffre] = useState({ name: '', color: '#FF6B9D', start_date: '', end_date: '', priority: 'Basse' })
  const [creating, setCreating] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const offre = offres.find(o => o.id === selectedId)

  const getProgress = (offre: Offre) => {
    if (!offre.tasks?.length) return 0
    return Math.round((offre.tasks.filter(t => t.status === 'Fait').length / offre.tasks.length) * 100)
  }

  const createOffre = async () => {
    if (!newOffre.name || !newOffre.start_date || !newOffre.end_date) return
    setCreating(true)

    const { data: offreData, error } = await supabase
      .from('offres')
      .insert({
        name: newOffre.name,
        color: newOffre.color,
        start_date: newOffre.start_date,
        end_date: newOffre.end_date,
        priority: newOffre.priority,
        status: 'En prépa',
        created_by: profile.id,
      })
      .select()
      .single()

    if (error || !offreData) { setCreating(false); return }

    const { data: templates } = await supabase.from('task_templates').select('*').order('order_index')
    if (templates?.length) {
      const tasks = templates.map(t => ({
        offre_id: offreData.id,
        label: t.label,
        department: t.department,
        deadline: new Date(new Date(newOffre.start_date).getTime() + t.delay_days * 86400000).toISOString().split('T')[0],
        status: 'À faire',
        order_index: t.order_index,
        is_custom: false,
      }))
      const { data: tasksData } = await supabase.from('tasks').insert(tasks).select()
      offreData.tasks = tasksData || []
    }

    setOffres(prev => [...prev, offreData])
    setSelectedId(offreData.id)
    setNewOffre({ name: '', color: '#FF6B9D', start_date: '', end_date: '', priority: 'Basse' })
    setShowNewOffre(false)
    setCreating(false)
  }

  const updateTaskStatus = async (taskId: string, status: string) => {
    const res = await fetch(`/api/tasks/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    if (res.ok) {
      setOffres(prev => prev.map(o => ({
        ...o,
        tasks: o.tasks?.map(t => t.id === taskId ? { ...t, status: status as any } : t)
      })))
    }
  }

  const updateNote = async (taskId: string, note: string) => {
    await fetch(`/api/tasks/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ note }),
    })
    setOffres(prev => prev.map(o => ({
      ...o,
      tasks: o.tasks?.map(t => t.id === taskId ? { ...t, note } : t)
    })))
    setEditingNote(null)
  }

  const addTask = async () => {
    if (!newTask.label || !selectedId) return
    const { data } = await supabase.from('tasks').insert({
      offre_id: selectedId,
      label: newTask.label,
      department: newTask.dept,
      deadline: newTask.deadline || null,
      is_custom: true,
      status: 'À faire',
    }).select().single()
    if (data) {
      setOffres(prev => prev.map(o => o.id === selectedId ? { ...o, tasks: [...(o.tasks || []), data] } : o))
      setNewTask({ label: '', dept: 'Achat', deadline: '' })
      setShowNewTask(false)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const filteredTasks = offre?.tasks?.filter(t => filterDept === 'Tous' || t.department === filterDept) || []

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', background: '#F8F7F4', minHeight: '100vh', color: '#1C1B18' }}>

      {/* MODAL NOUVELLE OFFRE */}
      {showNewOffre && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#FFF', borderRadius: 16, padding: 32, width: 440, boxShadow: '0 8px 40px rgba(0,0,0,0.15)' }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 24, margin: '0 0 24px' }}>Nouvelle offre</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, color: '#888', fontWeight: 600, display: 'block', marginBottom: 6 }}>NOM DE L'OFFRE</label>
                <input value={newOffre.name} onChange={e => setNewOffre(p => ({ ...p, name: e.target.value }))}
                  placeholder="Ex: Crème Visage Printemps"
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #E8E4DC', fontSize: 14, boxSizing: 'border-box' }} />
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 12, color: '#888', fontWeight: 600, display: 'block', marginBottom: 6 }}>DATE DÉBUT</label>
                  <input type="date" value={newOffre.start_date} onChange={e => setNewOffre(p => ({ ...p, start_date: e.target.value }))}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #E8E4DC', fontSize: 14, boxSizing: 'border-box' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 12, color: '#888', fontWeight: 600, display: 'block', marginBottom: 6 }}>DATE FIN</label>
                  <input type="date" value={newOffre.end_date} onChange={e => setNewOffre(p => ({ ...p, end_date: e.target.value }))}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #E8E4DC', fontSize: 14, boxSizing: 'border-box' }} />
                </div>
              </div>
              <div>
                <label style={{ fontSize: 12, color: '#888', fontWeight: 600, display: 'block', marginBottom: 6 }}>PRIORITÉ</label>
                <select value={newOffre.priority} onChange={e => setNewOffre(p => ({ ...p, priority: e.target.value }))}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #E8E4DC', fontSize: 14 }}>
                  <option>Basse</option>
                  <option>Haute</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, color: '#888', fontWeight: 600, display: 'block', marginBottom: 8 }}>COULEUR</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {COLORS.map(c => (
                    <div key={c} onClick={() => setNewOffre(p => ({ ...p, color: c }))}
                      style={{ width: 28, height: 28, borderRadius: '50%', background: c, cursor: 'pointer', border: newOffre.color === c ? '3px solid #1C1B18' : '3px solid transparent' }} />
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                <button onClick={() => setShowNewOffre(false)}
                  style={{ flex: 1, padding: '10px', borderRadius: 8, border: '1px solid #E8E4DC', background: 'transparent', fontSize: 14, cursor: 'pointer', color: '#666' }}>
                  Annuler
                </button>
                <button onClick={createOffre} disabled={creating}
                  style={{ flex: 2, padding: '10px', borderRadius: 8, background: '#1C1B18', color: '#FFF', border: 'none', fontSize: 14, fontWeight: 600, cursor: creating ? 'not-allowed' : 'pointer', opacity: creating ? 0.7 : 1 }}>
                  {creating ? 'Création...' : 'Créer l\'offre'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* HEADER */}
      <div style={{ background: '#1C1B18', color: '#F8F7F4', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 52 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 26, height: 26, background: '#FFB347', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13 }}>✦</div>
          <span style={{ fontSize: 16, fontWeight: 700 }}>OffreCosmo</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ fontSize: 12, color: '#AAA' }}>{profile?.full_name}</span>
          <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, background: DEPT_COLORS[profile?.department]?.bg, color: DEPT_COLORS[profile?.department]?.text, fontWeight: 600 }}>
            {profile?.department}
          </span>
          <button onClick={handleLogout} style={{ fontSize: 12, color: '#888', background: 'none', border: 'none', cursor: 'pointer' }}>Déconnexion</button>
        </div>
      </div>

      <div style={{ display: 'flex', height: 'calc(100vh - 52px)', overflow: 'hidden' }}>

        {/* LEFT PANEL */}
        <div style={{ width: 320, borderRight: '1px solid #E8E4DC', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#F8F7F4' }}>
          <div style={{ padding: '16px 16px 12px', borderBottom: '1px solid #E8E4DC' }}>
            <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', color: '#888', textTransform: 'uppercase', marginBottom: 10 }}>Planning 2026</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 1, marginBottom: 4 }}>
              {MONTHS.map((m, i) => <div key={i} style={{ fontSize: 8, color: '#AAA', textAlign: 'center' }}>{m}</div>)}
            </div>
            {offres.map(o => {
              const startMonth = new Date(o.start_date).getMonth()
              const endMonth = new Date(o.end_date).getMonth()
              return (
                <div key={o.id} style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 1, marginBottom: 3, cursor: 'pointer' }}
                  onClick={() => setSelectedId(o.id)}>
                  {MONTHS.map((_, i) => (
                    <div key={i} style={{
                      height: 8, borderRadius: i === startMonth ? '3px 0 0 3px' : i === endMonth ? '0 3px 3px 0' : 0,
                      background: (i >= startMonth && i <= endMonth) ? o.color : 'transparent',
                      opacity: selectedId === o.id ? 1 : 0.6,
                    }} />
                  ))}
                </div>
              )
            })}
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: 12 }}>
            {offres.map(o => {
              const progress = getProgress(o)
              const blocked = o.tasks?.filter(t => t.status === 'Bloqué').length || 0
              return (
                <div key={o.id} onClick={() => setSelectedId(o.id)}
                  style={{
                    padding: '12px 14px', borderRadius: 10, marginBottom: 6, cursor: 'pointer',
                    background: selectedId === o.id ? '#1C1B18' : '#FFF',
                    color: selectedId === o.id ? '#F8F7F4' : '#1C1B18',
                    border: `1px solid ${selectedId === o.id ? '#1C1B18' : '#E8E4DC'}`,
                    transition: 'all 0.15s',
                  }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: o.color }} />
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{o.name}</span>
                  </div>
                  <div style={{ fontSize: 11, color: selectedId === o.id ? '#AAA' : '#888', marginBottom: 8 }}>
                    {new Date(o.start_date).toLocaleDateString('fr-FR', { month: 'short', day: 'numeric' })} → {new Date(o.end_date).toLocaleDateString('fr-FR', { month: 'short', day: 'numeric' })}
                  </div>
                  <div style={{ background: selectedId === o.id ? '#333' : '#F0EDE6', borderRadius: 4, height: 4, marginBottom: 6 }}>
                    <div style={{ width: `${progress}%`, height: '100%', background: o.color, borderRadius: 4 }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: selectedId === o.id ? '#AAA' : '#888' }}>
                    <span>{o.tasks?.filter(t => t.status === 'Fait').length || 0}/{o.tasks?.length || 0} tâches</span>
                    {blocked > 0 && <span style={{ color: '#EF4444' }}>⚠ {blocked} bloqué{blocked > 1 ? 's' : ''}</span>}
                  </div>
                </div>
              )
            })}

            {profile?.department === 'Admin' && (
              <button onClick={() => setShowNewOffre(true)} style={{
                width: '100%', padding: '10px', border: '1.5px dashed #D4D0C8', borderRadius: 10,
                background: 'transparent', cursor: 'pointer', fontSize: 12, color: '#888',
              }}>
                + Nouvelle offre
              </button>
            )}
          </div>
        </div>

        {/* RIGHT PANEL */}
        {offre ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '20px 28px 16px', borderBottom: '1px solid #E8E4DC', background: '#FFF' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: offre.color }} />
                <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>{offre.name}</h1>
                <span style={{ fontSize: 11, color: '#888', background: '#F0EDE6', padding: '3px 10px', borderRadius: 20 }}>
                  {new Date(offre.start_date).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })} → {new Date(offre.end_date).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
                </span>
                <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, background: offre.priority === 'Haute' ? '#FEF2F2' : '#F1F5F9', color: offre.priority === 'Haute' ? '#EF4444' : '#888', fontWeight: 600 }}>
                  {offre.priority}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ flex: 1, background: '#F0EDE6', borderRadius: 4, height: 5 }}>
                  <div style={{ width: `${getProgress(offre)}%`, height: '100%', background: offre.color, borderRadius: 4 }} />
                </div>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#666' }}>{getProgress(offre)}%</span>
                {(['Achat', 'Marketing', 'Logistique', 'ESAT'] as const).map(dept => {
                  const dt = offre.tasks?.filter(t => t.department === dept) || []
                  if (!dt.length) return null
                  return (
                    <span key={dept} style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, background: DEPT_COLORS[dept].bg, color: DEPT_COLORS[dept].text, fontWeight: 500 }}>
                      {dept} {dt.filter(t => t.status === 'Fait').length}/{dt.length}
                    </span>
                  )
                })}
              </div>
            </div>

            <div style={{ padding: '12px 28px', borderBottom: '1px solid #E8E4DC', background: '#FFF', display: 'flex', gap: 6, alignItems: 'center' }}>
              {['Tous', 'Achat', 'Marketing', 'Logistique', 'ESAT'].map(d => (
                <button key={d} onClick={() => setFilterDept(d)} style={{
                  padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 500, cursor: 'pointer',
                  border: filterDept === d ? 'none' : '1px solid #E8E4DC',
                  background: filterDept === d ? '#1C1B18' : 'transparent',
                  color: filterDept === d ? '#F8F7F4' : '#666',
                }}>
                  {d}
                </button>
              ))}
              <div style={{ flex: 1 }} />
              {profile?.department === 'Admin' && (
                <button onClick={() => setShowNewTask(true)} style={{
                  padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                  background: offre.color, color: '#FFF', border: 'none', cursor: 'pointer',
                }}>
                  + Tâche custom
                </button>
              )}
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '8px 28px 24px' }}>
              {showNewTask && (
                <div style={{ background: '#FFF', border: '1px solid #E8E4DC', borderRadius: 10, padding: 14, margin: '10px 0', display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                  <input value={newTask.label} onChange={e => setNewTask(p => ({ ...p, label: e.target.value }))}
                    placeholder="Nom de la tâche..."
                    style={{ flex: 2, padding: '7px 10px', borderRadius: 7, border: '1px solid #E8E4DC', fontSize: 13, minWidth: 140 }} />
                  <select value={newTask.dept} onChange={e => setNewTask(p => ({ ...p, dept: e.target.value }))}
                    style={{ padding: '7px 10px', borderRadius: 7, border: '1px solid #E8E4DC', fontSize: 13 }}>
                    {['Achat', 'Marketing', 'Logistique', 'ESAT'].map(d => <option key={d}>{d}</option>)}
                  </select>
                  <input value={newTask.deadline} onChange={e => setNewTask(p => ({ ...p, deadline: e.target.value }))}
                    type="date"
                    style={{ padding: '7px 10px', borderRadius: 7, border: '1px solid #E8E4DC', fontSize: 13 }} />
                  <button onClick={addTask} style={{ padding: '7px 14px', borderRadius: 7, background: '#1C1B18', color: '#FFF', border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Ajouter</button>
                  <button onClick={() => setShowNewTask(false)} style={{ padding: '7px', borderRadius: 7, background: 'transparent', border: '1px solid #E8E4DC', fontSize: 13, cursor: 'pointer', color: '#888' }}>✕</button>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '28px 1fr 110px 100px 110px 1fr', gap: 0, padding: '6px 14px', fontSize: 10, color: '#AAA', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', marginTop: 6 }}>
                <div></div><div>Tâche</div><div>Département</div><div>Deadline</div><div>Statut</div><div>Note</div>
              </div>

              {filteredTasks.map((task, idx) => {
                const dc = DEPT_COLORS[task.department]
                const sc = STATUS_CONFIG[task.status]
                const canEdit = profile?.department === 'Admin' || task.department === profile?.department
                return (
                  <div key={task.id} style={{
                    display: 'grid', gridTemplateColumns: '28px 1fr 110px 100px 110px 1fr',
                    gap: 0, padding: '9px 14px', borderRadius: 7, alignItems: 'center',
                    background: idx % 2 === 0 ? '#FFF' : 'transparent', marginBottom: 2,
                  }}>
                    <div onClick={() => canEdit && updateTaskStatus(task.id, task.status === 'Fait' ? 'À faire' : 'Fait')}
                      style={{
                        width: 16, height: 16, borderRadius: 4,
                        border: task.status === 'Fait' ? 'none' : '1.5px solid #D4D0C8',
                        background: task.status === 'Fait' ? '#10B981' : 'transparent',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: canEdit ? 'pointer' : 'default', fontSize: 10, color: '#FFF',
                      }}>
                      {task.status === 'Fait' && '✓'}
                    </div>
                    <div style={{ fontSize: 13, fontWeight: task.status === 'Fait' ? 400 : 500, color: task.status === 'Fait' ? '#AAA' : '#1C1B18', textDecoration: task.status === 'Fait' ? 'line-through' : 'none' }}>
                      {task.label}
                      {task.is_custom && <span style={{ fontSize: 10, color: '#AAA', marginLeft: 6 }}>custom</span>}
                    </div>
                    <div>
                      <span style={{ fontSize: 11, fontWeight: 600, color: dc.text, background: dc.bg, padding: '2px 8px', borderRadius: 20 }}>
                        {task.department}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: '#888' }}>
                      {task.deadline ? new Date(task.deadline).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : '—'}
                    </div>
                    <div>
                      {canEdit ? (
                        <select value={task.status} onChange={e => updateTaskStatus(task.id, e.target.value)}
                          style={{ fontSize: 11, fontWeight: 600, padding: '2px 7px', borderRadius: 6, border: 'none', background: sc.bg, color: sc.color, cursor: 'pointer' }}>
                          {['À faire', 'En cours', 'Fait', 'Bloqué'].map(s => <option key={s}>{s}</option>)}
                        </select>
                      ) : (
                        <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 7px', borderRadius: 6, background: sc.bg, color: sc.color }}>{task.status}</span>
                      )}
                    </div>
                    <div>
                      {editingNote === task.id ? (
                        <input autoFocus defaultValue={task.note}
                          onBlur={e => updateNote(task.id, e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && updateNote(task.id, (e.target as HTMLInputElement).value)}
                          style={{ fontSize: 12, padding: '2px 8px', borderRadius: 5, border: '1px solid #E8E4DC', width: '100%' }} />
                      ) : (
                        <div onClick={() => canEdit && setEditingNote(task.id)}
                          style={{ fontSize: 12, color: task.note ? '#555' : '#CCC', cursor: canEdit ? 'text' : 'default', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                          {task.note || (canEdit ? 'Ajouter une note...' : '—')}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ) : (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 10, color: '#AAA' }}>
            <div style={{ fontSize: 36 }}>✦</div>
            <div style={{ fontSize: 16, color: '#888' }}>Sélectionne une offre</div>
          </div>
        )}
      </div>
    </div>
  )
}
