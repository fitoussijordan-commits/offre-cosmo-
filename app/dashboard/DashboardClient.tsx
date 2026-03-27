'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Offre, Profile, Task } from '@/lib/types'

const MONTHS = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc']
const DEPT_COLORS: Record<string, { bg: string; text: string }> = {
  Achat:      { bg: '#FFF7ED', text: '#C2410C' },
  Marketing:  { bg: '#FAF5FF', text: '#7E22CE' },
  Logistique: { bg: '#EFF6FF', text: '#1D4ED8' },
  ESAT:       { bg: '#F0FDF4', text: '#15803D' },
  Admin:      { bg: '#F4F4F5', text: '#3F3F46' },
}
const STATUS_CONFIG: Record<string, { color: string; bg: string }> = {
  'À faire':  { color: '#71717A', bg: '#F4F4F5' },
  'En cours': { color: '#D97706', bg: '#FFFBEB' },
  'Fait':     { color: '#059669', bg: '#ECFDF5' },
  'Bloqué':   { color: '#DC2626', bg: '#FEF2F2' },
}
const COLORS = ['#E11D48','#D97706','#DC2626','#2563EB','#059669','#7C3AED','#0D9488','#EA580C']

const REF_TYPE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  'Produit fini':  { bg: '#EEF2FF', text: '#4338CA', border: '#C7D2FE' },
  'Packaging':     { bg: '#FFF7ED', text: '#C2410C', border: '#FED7AA' },
  'PLV':           { bg: '#F0FDF4', text: '#15803D', border: '#BBF7D0' },
  'Matière 1ère':  { bg: '#FAF5FF', text: '#7E22CE', border: '#E9D5FF' },
  'Autre':         { bg: '#F4F4F5', text: '#52525B', border: '#E4E4E7' },
}
const REF_TYPES = Object.keys(REF_TYPE_COLORS)

interface OffreRef {
  id: string
  offre_id: string
  reference: string
  label: string
  quantity: number
  type: string
  unit: string
}

interface Component { id: string; offre_id: string; name: string; refs: any[]; tasks: Task[] }

// ── Modal wrapper ────────────────────────────────────────────────
function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="modal-backdrop" onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="modal-content" onClick={e => e.stopPropagation()}
        style={{ background: '#FFF', borderRadius: 16, padding: '32px', boxShadow: 'var(--shadow-xl)', border: '1px solid rgba(0,0,0,0.06)', maxHeight: '90vh', overflowY: 'auto' }}>
        {children}
      </div>
    </div>
  )
}

export default function DashboardClient({ profile, offres: initialOffres }: { profile: Profile, offres: Offre[] }) {
  const [offres, setOffres] = useState<Offre[]>(initialOffres)
  const [selectedId, setSelectedId] = useState<string | null>(initialOffres[0]?.id || null)
  const [filterDept, setFilterDept] = useState('Tous')
  const [editingNote, setEditingNote] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'tasks' | 'refs' | string>('tasks')

  // Composants
  const [components, setComponents] = useState<Record<string, Component[]>>({})

  // Références offre
  const [offreRefs, setOffreRefs] = useState<Record<string, OffreRef[]>>({})
  const [showNewRef, setShowNewRef] = useState(false)
  const [newRef, setNewRef] = useState({ reference: '', label: '', quantity: '', type: 'Produit fini', unit: 'unité' })
  const [editingRef, setEditingRef] = useState<OffreRef | null>(null)
  const [refSearch, setRefSearch] = useState('')

  // Nouvelle offre
  const [showNewOffre, setShowNewOffre] = useState(false)
  const [newOffre, setNewOffre] = useState({ name: '', color: '#E11D48', start_date: '', end_date: '', priority: 'Basse' })
  const [creating, setCreating] = useState(false)

  // Édition offre
  const [editingOffre, setEditingOffre] = useState<Offre | null>(null)
  const [editOffreForm, setEditOffreForm] = useState({ name: '', color: '', start_date: '', end_date: '', priority: '' })

  // Nouveau composant
  const [showNewComponent, setShowNewComponent] = useState(false)
  const [newComponentName, setNewComponentName] = useState('')

  // Nouvelle tâche
  const [showNewTask, setShowNewTask] = useState(false)
  const [newTask, setNewTask] = useState({ label: '', dept: 'Achat', deadline: '' })

  // Édition tâche
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [editTaskForm, setEditTaskForm] = useState({ label: '', department: '', deadline: '' })

  const router = useRouter()
  const supabase = createClient()
  const offre = offres.find(o => o.id === selectedId)
  const isAdmin = profile?.department === 'Admin'

  // ── Charger refs offre ───────────────────────────────────────────────────
  const loadRefs = async (offreId: string) => {
    if (offreRefs[offreId]) return
    const { data } = await supabase
      .from('offre_refs')
      .select('*')
      .eq('offre_id', offreId)
      .order('type')
    setOffreRefs(prev => ({ ...prev, [offreId]: data || [] }))
  }

  // ── Charger composants ───────────────────────────────────────────────────
  const loadComponents = async (offreId: string) => {
    if (components[offreId]) return
    const { data } = await supabase
      .from('offre_components')
      .select('*, component_refs(*), tasks(*)')
      .eq('offre_id', offreId)
      .order('created_at')
    setComponents(prev => ({ ...prev, [offreId]: data || [] }))
  }

  const selectOffre = (id: string) => {
    setSelectedId(id)
    setActiveTab('tasks')
    setFilterDept('Tous')
    setRefSearch('')
    loadComponents(id)
    loadRefs(id)
  }

  useEffect(() => {
    if (selectedId) {
      loadComponents(selectedId)
      loadRefs(selectedId)
    }
  }, [])

  const getProgress = (o: Offre) => {
    if (!o.tasks?.length) return 0
    return Math.round((o.tasks.filter(t => t.status === 'Fait').length / o.tasks.length) * 100)
  }

  const updateOffres = (fn: (prev: Offre[]) => Offre[]) => setOffres(fn)

  // ── Créer offre ──────────────────────────────────────────────────────────
  const createOffre = async () => {
    if (!newOffre.name || !newOffre.start_date || !newOffre.end_date) return
    setCreating(true)
    const res = await fetch('/api/offres', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...newOffre, created_by: profile.id }),
    })
    const data = await res.json()
    if (res.ok) {
      updateOffres(prev => [...prev, data])
      setSelectedId(data.id)
      setActiveTab('tasks')
      setNewOffre({ name: '', color: '#E11D48', start_date: '', end_date: '', priority: 'Basse' })
      setShowNewOffre(false)
    }
    setCreating(false)
  }

  // ── Éditer offre ─────────────────────────────────────────────────────────
  const openEditOffre = (o: Offre) => {
    setEditingOffre(o)
    setEditOffreForm({ name: o.name, color: o.color, start_date: o.start_date, end_date: o.end_date, priority: o.priority })
  }

  const saveEditOffre = async () => {
    if (!editingOffre) return
    updateOffres(prev => prev.map(o => o.id === editingOffre.id
      ? { ...o, ...editOffreForm, priority: editOffreForm.priority as 'Haute' | 'Basse' }
      : o
    ))
    setEditingOffre(null)
    await supabase.from('offres').update(editOffreForm).eq('id', editingOffre.id)
  }

  const deleteOffre = async (id: string) => {
    if (!confirm('Supprimer cette offre ?')) return
    updateOffres(prev => prev.filter(o => o.id !== id))
    setSelectedId(offres.find(o => o.id !== id)?.id || null)
    setEditingOffre(null)
    await fetch(`/api/offres?id=${id}`, { method: 'DELETE' })
  }

  // ── Refs offre ────────────────────────────────────────────────────────────
  const addRef = async () => {
    if (!newRef.reference || !selectedId) return
    const { data } = await supabase.from('offre_refs').insert({
      offre_id: selectedId,
      reference: newRef.reference,
      label: newRef.label,
      quantity: parseInt(newRef.quantity) || 0,
      type: newRef.type,
      unit: newRef.unit,
    }).select().single()
    if (data) {
      setOffreRefs(prev => ({ ...prev, [selectedId]: [...(prev[selectedId] || []), data] }))
      setNewRef({ reference: '', label: '', quantity: '', type: 'Produit fini', unit: 'unité' })
      setShowNewRef(false)
    }
  }

  const saveEditRef = async () => {
    if (!editingRef || !selectedId) return
    await supabase.from('offre_refs').update({
      reference: editingRef.reference,
      label: editingRef.label,
      quantity: editingRef.quantity,
      type: editingRef.type,
      unit: editingRef.unit,
    }).eq('id', editingRef.id)
    setOffreRefs(prev => ({
      ...prev,
      [selectedId]: prev[selectedId].map(r => r.id === editingRef.id ? editingRef : r)
    }))
    setEditingRef(null)
  }

  const deleteRef = async (refId: string) => {
    if (!selectedId) return
    setOffreRefs(prev => ({ ...prev, [selectedId]: prev[selectedId].filter(r => r.id !== refId) }))
    await supabase.from('offre_refs').delete().eq('id', refId)
  }

  // ── Composants ────────────────────────────────────────────────────────────
  const createComponent = async () => {
    if (!newComponentName || !selectedId) return
    const { data } = await supabase.from('offre_components')
      .insert({ offre_id: selectedId, name: newComponentName })
      .select('*, component_refs(*), tasks(*)')
      .single()
    if (data) {
      setComponents(prev => ({ ...prev, [selectedId]: [...(prev[selectedId] || []), { ...data, refs: [], tasks: [] }] }))
      setActiveTab(data.id)
      setNewComponentName('')
      setShowNewComponent(false)
    }
  }

  const deleteComponent = async (compId: string) => {
    if (!confirm('Supprimer ce composant ?') || !selectedId) return
    const comps = components[selectedId]?.filter(c => c.id !== compId) || []
    setComponents(prev => ({ ...prev, [selectedId]: comps }))
    setActiveTab('tasks')
    await supabase.from('offre_components').delete().eq('id', compId)
  }

  // ── Tâches ────────────────────────────────────────────────────────────────
  const updateTaskStatus = (taskId: string, status: string, compId?: string) => {
    if (compId && selectedId) {
      setComponents(prev => ({
        ...prev,
        [selectedId]: prev[selectedId].map(c => c.id === compId
          ? { ...c, tasks: c.tasks.map(t => t.id === taskId ? { ...t, status: status as Task['status'] } : t) }
          : c
        )
      }))
    } else {
      updateOffres(prev => prev.map(o => ({
        ...o, tasks: o.tasks?.map(t => t.id === taskId ? { ...t, status: status as Task['status'] } : t)
      })))
    }
    fetch(`/api/tasks/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
  }

  const updateNote = (taskId: string, note: string, compId?: string) => {
    if (compId && selectedId) {
      setComponents(prev => ({
        ...prev,
        [selectedId]: prev[selectedId].map(c => c.id === compId
          ? { ...c, tasks: c.tasks.map(t => t.id === taskId ? { ...t, note } : t) }
          : c
        )
      }))
    } else {
      updateOffres(prev => prev.map(o => ({
        ...o, tasks: o.tasks?.map(t => t.id === taskId ? { ...t, note } : t)
      })))
    }
    setEditingNote(null)
    fetch(`/api/tasks/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ note }),
    })
  }

  const addTask = async (compId?: string) => {
    if (!newTask.label || !selectedId) return
    const insert: Record<string, unknown> = {
      offre_id: selectedId,
      label: newTask.label,
      department: newTask.dept,
      deadline: newTask.deadline || null,
      is_custom: true,
      status: 'À faire',
    }
    if (compId) insert.component_id = compId
    const { data } = await supabase.from('tasks').insert(insert).select().single()
    if (data) {
      if (compId) {
        setComponents(prev => ({
          ...prev,
          [selectedId]: prev[selectedId].map(c => c.id === compId ? { ...c, tasks: [...c.tasks, data] } : c)
        }))
      } else {
        updateOffres(prev => prev.map(o => o.id === selectedId ? { ...o, tasks: [...(o.tasks || []), data] } : o))
      }
      setNewTask({ label: '', dept: 'Achat', deadline: '' })
      setShowNewTask(false)
    }
  }

  const openEditTask = (t: Task) => {
    setEditingTask(t)
    setEditTaskForm({ label: t.label, department: t.department, deadline: t.deadline || '' })
  }

  const saveEditTask = async () => {
    if (!editingTask || !selectedId) return
    const update = { label: editTaskForm.label, department: editTaskForm.department as Task['department'], deadline: editTaskForm.deadline || null }
    updateOffres(prev => prev.map(o => ({ ...o, tasks: o.tasks?.map(t => t.id === editingTask.id ? { ...t, ...update } : t) })))
    setComponents(prev => {
      const comps = prev[selectedId]
      if (!comps) return prev
      return { ...prev, [selectedId]: comps.map(c => ({ ...c, tasks: c.tasks.map(t => t.id === editingTask.id ? { ...t, ...update } : t) })) }
    })
    setEditingTask(null)
    await supabase.from('tasks').update({ label: editTaskForm.label, department: editTaskForm.department, deadline: editTaskForm.deadline || null }).eq('id', editingTask.id)
  }

  const deleteTask = async (taskId: string) => {
    if (!selectedId) return
    updateOffres(prev => prev.map(o => ({ ...o, tasks: o.tasks?.filter(t => t.id !== taskId) })))
    setComponents(prev => {
      const comps = prev[selectedId]
      if (!comps) return prev
      return { ...prev, [selectedId]: comps.map(c => ({ ...c, tasks: c.tasks.filter(t => t.id !== taskId) })) }
    })
    await supabase.from('tasks').delete().eq('id', taskId)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const activeComp = selectedId && activeTab && activeTab !== 'tasks' && activeTab !== 'refs'
    ? components[selectedId]?.find(c => c.id === activeTab)
    : null

  const tasksToShow = activeComp
    ? activeComp.tasks.filter(t => filterDept === 'Tous' || t.department === filterDept)
    : (offre?.tasks?.filter(t => filterDept === 'Tous' || t.department === filterDept) || [])

  const offreComps = selectedId ? components[selectedId] || [] : []
  const currentRefs = selectedId ? offreRefs[selectedId] || [] : []

  const filteredRefs = refSearch
    ? currentRefs.filter(r =>
        r.reference.toLowerCase().includes(refSearch.toLowerCase()) ||
        r.label.toLowerCase().includes(refSearch.toLowerCase())
      )
    : currentRefs

  // Grouper refs par type
  const refsByType = filteredRefs.reduce((acc, ref) => {
    if (!acc[ref.type]) acc[ref.type] = []
    acc[ref.type].push(ref)
    return acc
  }, {} as Record<string, OffreRef[]>)

  // ── Shared input style ───────────────────────────────────────────────────
  const inputStyle = {
    width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #E5E2DB',
    fontSize: 14, boxSizing: 'border-box' as const, background: '#FAFAF8',
  }
  const labelStyle = {
    fontSize: 12, color: '#71717A', fontWeight: 600 as const, display: 'block' as const,
    marginBottom: 6,
  }

  return (
    <div style={{ fontFamily: 'var(--font-sans, system-ui, sans-serif)', background: '#F5F3EF', minHeight: '100vh', color: '#18181B' }}>

      {/* MODAL NOUVELLE OFFRE */}
      {showNewOffre && (
        <Modal onClose={() => setShowNewOffre(false)}>
          <div style={{ width: 440 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 4px', letterSpacing: '-0.02em' }}>Nouvelle offre</h2>
            <p style={{ fontSize: 13, color: '#A1A1AA', margin: '0 0 24px' }}>Créer une nouvelle offre pour le planning</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={labelStyle}>Nom</label>
                <input value={newOffre.name} onChange={e => setNewOffre(p => ({ ...p, name: e.target.value }))}
                  placeholder="Ex: Crème Visage Printemps" autoFocus
                  style={inputStyle} />
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Début</label>
                  <input type="date" value={newOffre.start_date} onChange={e => setNewOffre(p => ({ ...p, start_date: e.target.value }))}
                    style={inputStyle} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Fin</label>
                  <input type="date" value={newOffre.end_date} onChange={e => setNewOffre(p => ({ ...p, end_date: e.target.value }))}
                    style={inputStyle} />
                </div>
              </div>
              <div>
                <label style={labelStyle}>Priorité</label>
                <select value={newOffre.priority} onChange={e => setNewOffre(p => ({ ...p, priority: e.target.value }))}
                  style={inputStyle}>
                  <option>Basse</option><option>Haute</option>
                </select>
              </div>
              <div>
                <label style={{ ...labelStyle, marginBottom: 10 }}>Couleur</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {COLORS.map(c => (
                    <div key={c} onClick={() => setNewOffre(p => ({ ...p, color: c }))}
                      style={{
                        width: 28, height: 28, borderRadius: '50%', background: c, cursor: 'pointer',
                        border: newOffre.color === c ? '2.5px solid #18181B' : '2.5px solid transparent',
                        boxShadow: newOffre.color === c ? '0 0 0 2px #FFF, 0 2px 6px rgba(0,0,0,0.15)' : 'none',
                        transition: 'all 150ms',
                      }} />
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                <button onClick={() => setShowNewOffre(false)}
                  className="btn-secondary"
                  style={{ flex: 1, padding: '10px', borderRadius: 8, fontSize: 14 }}>
                  Annuler
                </button>
                <button onClick={createOffre} disabled={creating}
                  className="btn-primary"
                  style={{ flex: 2, padding: '10px', borderRadius: 8, fontSize: 14, opacity: creating ? 0.7 : 1 }}>
                  {creating ? 'Création...' : "Créer l'offre"}
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL ÉDITION OFFRE */}
      {editingOffre && (
        <Modal onClose={() => setEditingOffre(null)}>
          <div style={{ width: 440 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 4px', letterSpacing: '-0.02em' }}>Modifier l&apos;offre</h2>
            <p style={{ fontSize: 13, color: '#A1A1AA', margin: '0 0 24px' }}>Éditer les détails de l&apos;offre</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={labelStyle}>Nom</label>
                <input value={editOffreForm.name} onChange={e => setEditOffreForm(p => ({ ...p, name: e.target.value }))}
                  style={inputStyle} />
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Début</label>
                  <input type="date" value={editOffreForm.start_date} onChange={e => setEditOffreForm(p => ({ ...p, start_date: e.target.value }))}
                    style={inputStyle} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Fin</label>
                  <input type="date" value={editOffreForm.end_date} onChange={e => setEditOffreForm(p => ({ ...p, end_date: e.target.value }))}
                    style={inputStyle} />
                </div>
              </div>
              <div>
                <label style={labelStyle}>Priorité</label>
                <select value={editOffreForm.priority} onChange={e => setEditOffreForm(p => ({ ...p, priority: e.target.value }))}
                  style={inputStyle}>
                  <option>Basse</option><option>Haute</option>
                </select>
              </div>
              <div>
                <label style={{ ...labelStyle, marginBottom: 10 }}>Couleur</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {COLORS.map(c => (
                    <div key={c} onClick={() => setEditOffreForm(p => ({ ...p, color: c }))}
                      style={{
                        width: 28, height: 28, borderRadius: '50%', background: c, cursor: 'pointer',
                        border: editOffreForm.color === c ? '2.5px solid #18181B' : '2.5px solid transparent',
                        boxShadow: editOffreForm.color === c ? '0 0 0 2px #FFF, 0 2px 6px rgba(0,0,0,0.15)' : 'none',
                        transition: 'all 150ms',
                      }} />
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                <button onClick={() => deleteOffre(editingOffre.id)}
                  className="btn-danger"
                  style={{ padding: '10px 16px', borderRadius: 8, fontSize: 14 }}>
                  Supprimer
                </button>
                <div style={{ flex: 1 }} />
                <button onClick={() => setEditingOffre(null)}
                  className="btn-secondary"
                  style={{ padding: '10px 16px', borderRadius: 8, fontSize: 14 }}>
                  Annuler
                </button>
                <button onClick={saveEditOffre}
                  className="btn-primary"
                  style={{ padding: '10px 20px', borderRadius: 8, fontSize: 14 }}>
                  Sauvegarder
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL ÉDITION TÂCHE */}
      {editingTask && (
        <Modal onClose={() => setEditingTask(null)}>
          <div style={{ width: 400 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 24px', letterSpacing: '-0.02em' }}>Modifier la tâche</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={labelStyle}>Label</label>
                <input value={editTaskForm.label} onChange={e => setEditTaskForm(p => ({ ...p, label: e.target.value }))}
                  style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Département</label>
                <select value={editTaskForm.department} onChange={e => setEditTaskForm(p => ({ ...p, department: e.target.value }))}
                  style={inputStyle}>
                  {['Achat', 'Marketing', 'Logistique', 'ESAT'].map(d => <option key={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Deadline</label>
                <input type="date" value={editTaskForm.deadline} onChange={e => setEditTaskForm(p => ({ ...p, deadline: e.target.value }))}
                  style={inputStyle} />
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                <button onClick={() => { deleteTask(editingTask.id); setEditingTask(null) }}
                  className="btn-danger"
                  style={{ padding: '10px 16px', borderRadius: 8, fontSize: 14 }}>
                  Supprimer
                </button>
                <div style={{ flex: 1 }} />
                <button onClick={() => setEditingTask(null)}
                  className="btn-secondary"
                  style={{ padding: '10px 16px', borderRadius: 8, fontSize: 14 }}>
                  Annuler
                </button>
                <button onClick={saveEditTask}
                  className="btn-primary"
                  style={{ padding: '10px 20px', borderRadius: 8, fontSize: 14 }}>
                  Sauvegarder
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL ÉDITION REF */}
      {editingRef && (
        <Modal onClose={() => setEditingRef(null)}>
          <div style={{ width: 440 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 24px', letterSpacing: '-0.02em' }}>Modifier la référence</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Référence</label>
                  <input value={editingRef.reference} onChange={e => setEditingRef(p => p ? { ...p, reference: e.target.value } : null)}
                    style={{ ...inputStyle, fontFamily: 'var(--font-mono, monospace)' }} />
                </div>
                <div style={{ width: 100 }}>
                  <label style={labelStyle}>Quantité</label>
                  <input type="number" value={editingRef.quantity} onChange={e => setEditingRef(p => p ? { ...p, quantity: parseInt(e.target.value) || 0 } : null)}
                    style={inputStyle} />
                </div>
              </div>
              <div>
                <label style={labelStyle}>Désignation</label>
                <input value={editingRef.label} onChange={e => setEditingRef(p => p ? { ...p, label: e.target.value } : null)}
                  style={inputStyle} />
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Type</label>
                  <select value={editingRef.type} onChange={e => setEditingRef(p => p ? { ...p, type: e.target.value } : null)}
                    style={inputStyle}>
                    {REF_TYPES.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div style={{ width: 120 }}>
                  <label style={labelStyle}>Unité</label>
                  <select value={editingRef.unit} onChange={e => setEditingRef(p => p ? { ...p, unit: e.target.value } : null)}
                    style={inputStyle}>
                    {['unité', 'kg', 'litre', 'ml', 'g', 'boîte', 'palette'].map(u => <option key={u}>{u}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                <button onClick={() => { deleteRef(editingRef.id); setEditingRef(null) }}
                  className="btn-danger"
                  style={{ padding: '10px 16px', borderRadius: 8, fontSize: 14 }}>
                  Supprimer
                </button>
                <div style={{ flex: 1 }} />
                <button onClick={() => setEditingRef(null)}
                  className="btn-secondary"
                  style={{ padding: '10px 16px', borderRadius: 8, fontSize: 14 }}>
                  Annuler
                </button>
                <button onClick={saveEditRef}
                  className="btn-primary"
                  style={{ padding: '10px 20px', borderRadius: 8, fontSize: 14 }}>
                  Sauvegarder
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* ── HEADER ────────────────────────────────────────────────────── */}
      <header style={{
        background: '#18181B', color: '#F5F3EF',
        padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        height: 52,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 28, height: 28, background: '#D97706',
            borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 13, color: '#FFF',
          }}>&#10022;</div>
          <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: '-0.02em' }}>OffreCosmo</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 28, height: 28, borderRadius: '50%', background: '#27272A',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 700, color: '#D97706',
            }}>
              {profile?.full_name?.charAt(0)}
            </div>
            <span style={{ fontSize: 13, color: '#A1A1AA', fontWeight: 500 }}>{profile?.full_name}</span>
            <span className="badge" style={{
              fontSize: 11, padding: '3px 10px', borderRadius: 6,
              background: DEPT_COLORS[profile?.department]?.bg,
              color: DEPT_COLORS[profile?.department]?.text,
              fontWeight: 600,
            }}>
              {profile?.department}
            </span>
          </div>
          <div style={{ width: 1, height: 20, background: '#3F3F46' }} />
          <button className="nav-link" onClick={() => router.push('/planning')}
            style={{ fontSize: 13, color: '#A1A1AA', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500, padding: '4px 0' }}>
            Planning
          </button>
          {isAdmin && (
            <button className="nav-link" onClick={() => router.push('/admin')}
              style={{ fontSize: 13, color: '#A1A1AA', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500, padding: '4px 0' }}>
              Utilisateurs
            </button>
          )}
          <button className="nav-link" onClick={handleLogout}
            style={{ fontSize: 13, color: '#52525B', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500, padding: '4px 0' }}>
            Déconnexion
          </button>
        </div>
      </header>

      <div style={{ display: 'flex', height: 'calc(100vh - 52px)', overflow: 'hidden' }}>

        {/* ── LEFT PANEL ──────────────────────────────────────────────── */}
        <div style={{
          width: 290, borderRight: '1px solid #E5E2DB', display: 'flex', flexDirection: 'column',
          overflow: 'hidden', background: '#FFF',
        }}>
          {/* Mini timeline */}
          <div style={{ padding: '14px 14px 10px', borderBottom: '1px solid #E5E2DB', background: '#FAFAF8' }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: '#A1A1AA', textTransform: 'uppercase', marginBottom: 8 }}>
              Planning {new Date().getFullYear()}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 1, marginBottom: 5 }}>
              {MONTHS.map((m, i) => <div key={i} style={{ fontSize: 8, color: '#A1A1AA', textAlign: 'center', fontWeight: 600 }}>{m}</div>)}
            </div>
            {offres.map(o => {
              const s = new Date(o.start_date).getMonth()
              const e = new Date(o.end_date).getMonth()
              return (
                <div key={o.id} style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 1, marginBottom: 2, cursor: 'pointer' }}
                  onClick={() => selectOffre(o.id)}>
                  {MONTHS.map((_, i) => (
                    <div key={i} style={{
                      height: 5, borderRadius: i === s ? '3px 0 0 3px' : i === e ? '0 3px 3px 0' : 0,
                      background: (i >= s && i <= e) ? o.color : 'transparent',
                      opacity: selectedId === o.id ? 1 : 0.4,
                      transition: 'opacity 150ms',
                    }} />
                  ))}
                </div>
              )
            })}
          </div>

          {/* Offres list */}
          <div style={{ flex: 1, overflowY: 'auto', padding: 8 }}>
            {offres.map(o => {
              const progress = getProgress(o)
              const blocked = o.tasks?.filter(t => t.status === 'Bloqué').length || 0
              const selected = selectedId === o.id
              return (
                <div key={o.id} onClick={() => selectOffre(o.id)}
                  className={selected ? '' : 'card-hover'}
                  style={{
                    padding: '12px 14px', borderRadius: 10, marginBottom: 4, cursor: 'pointer',
                    background: selected ? '#18181B' : '#FFF',
                    color: selected ? '#F5F3EF' : '#18181B',
                    border: `1px solid ${selected ? '#18181B' : '#E5E2DB'}`,
                    boxShadow: selected ? 'var(--shadow-md)' : 'none',
                    transition: 'all 180ms cubic-bezier(0.4, 0, 0.2, 1)',
                  }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                    <div style={{
                      width: 7, height: 7, borderRadius: '50%', background: o.color, flexShrink: 0,
                    }} />
                    <span style={{ fontSize: 13, fontWeight: 600, flex: 1, letterSpacing: '-0.01em' }}>{o.name}</span>
                    {o.priority === 'Haute' && (
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 4, background: selected ? 'rgba(220,38,38,0.2)' : '#FEF2F2', color: '#DC2626' }}>
                        URGENT
                      </span>
                    )}
                    {isAdmin && (
                      <span onClick={ev => { ev.stopPropagation(); openEditOffre(o) }}
                        style={{ fontSize: 12, color: selected ? '#52525B' : '#D1CEC7', cursor: 'pointer', opacity: 0.6, transition: 'opacity 150ms' }}
                        onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                        onMouseLeave={e => (e.currentTarget.style.opacity = '0.6')}
                      >&#9998;</span>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: selected ? '#71717A' : '#A1A1AA', marginBottom: 8 }}>
                    {new Date(o.start_date).toLocaleDateString('fr-FR', { month: 'short', day: 'numeric' })} &rarr; {new Date(o.end_date).toLocaleDateString('fr-FR', { month: 'short', day: 'numeric' })}
                  </div>
                  <div style={{ background: selected ? '#27272A' : '#F4F4F5', borderRadius: 100, height: 3, marginBottom: 6, overflow: 'hidden' }}>
                    <div className="progress-bar" style={{ width: `${progress}%`, height: '100%', background: o.color, borderRadius: 100 }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: selected ? '#71717A' : '#A1A1AA' }}>
                    <span>{o.tasks?.filter(t => t.status === 'Fait').length || 0}/{o.tasks?.length || 0} tâches</span>
                    {blocked > 0 && <span style={{ color: '#DC2626', fontWeight: 600 }}>&#9888; {blocked} bloquée{blocked > 1 ? 's' : ''}</span>}
                    {!blocked && progress === 100 && <span style={{ color: '#059669', fontWeight: 600 }}>Terminé</span>}
                  </div>
                </div>
              )
            })}
            {isAdmin && (
              <button onClick={() => setShowNewOffre(true)} style={{
                width: '100%', padding: '10px', border: '1.5px dashed #D1CEC7', borderRadius: 10,
                background: 'transparent', cursor: 'pointer', fontSize: 13, color: '#A1A1AA',
                fontWeight: 600, marginTop: 4,
              }}>
                + Nouvelle offre
              </button>
            )}
          </div>
        </div>

        {/* ── RIGHT PANEL ─────────────────────────────────────────────── */}
        {offre ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

            {/* Header offre */}
            <div style={{ padding: '16px 24px 14px', borderBottom: '1px solid #E5E2DB', background: '#FFF' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <div style={{
                  width: 10, height: 10, borderRadius: '50%', background: offre.color,
                }} />
                <h1 style={{ fontSize: 18, fontWeight: 700, margin: 0, letterSpacing: '-0.02em' }}>{offre.name}</h1>
                <span style={{
                  fontSize: 12, color: '#71717A', background: '#F4F4F5', padding: '3px 10px', borderRadius: 6, fontWeight: 500,
                }}>
                  {new Date(offre.start_date).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })} &rarr; {new Date(offre.end_date).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
                </span>
                <span style={{
                  fontSize: 11, padding: '3px 10px', borderRadius: 6, fontWeight: 600,
                  background: offre.priority === 'Haute' ? '#FEF2F2' : '#F4F4F5',
                  color: offre.priority === 'Haute' ? '#DC2626' : '#71717A',
                }}>
                  {offre.priority}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ flex: 1, background: '#F4F4F5', borderRadius: 100, height: 4, overflow: 'hidden' }}>
                  <div className="progress-bar" style={{ width: `${getProgress(offre)}%`, height: '100%', background: offre.color, borderRadius: 100 }} />
                </div>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#52525B', minWidth: 36, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{getProgress(offre)}%</span>
                {(['Achat', 'Marketing', 'Logistique', 'ESAT'] as const).map(dept => {
                  const dt = offre.tasks?.filter(t => t.department === dept) || []
                  if (!dt.length) return null
                  return (
                    <span key={dept} className="badge" style={{
                      fontSize: 11, padding: '2px 8px', borderRadius: 6,
                      background: DEPT_COLORS[dept].bg, color: DEPT_COLORS[dept].text, fontWeight: 600,
                    }}>
                      {dept} {dt.filter(t => t.status === 'Fait').length}/{dt.length}
                    </span>
                  )
                })}
              </div>
            </div>

            {/* ONGLETS */}
            <div style={{
              background: '#FFF', borderBottom: '1px solid #E5E2DB', padding: '0 24px',
              display: 'flex', alignItems: 'center', gap: 0, overflowX: 'auto',
            }}>
              <button onClick={() => setActiveTab('tasks')} style={{
                padding: '10px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', border: 'none', background: 'none', whiteSpace: 'nowrap',
                borderBottom: activeTab === 'tasks' ? `2px solid ${offre.color}` : '2px solid transparent',
                color: activeTab === 'tasks' ? '#18181B' : '#A1A1AA',
                transition: 'all 150ms',
              }}>
                Tâches {offre.tasks?.length ? `(${offre.tasks.filter(t => t.status === 'Fait').length}/${offre.tasks.length})` : ''}
              </button>

              <button onClick={() => setActiveTab('refs')} style={{
                padding: '10px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', border: 'none', background: 'none', whiteSpace: 'nowrap',
                borderBottom: activeTab === 'refs' ? `2px solid ${offre.color}` : '2px solid transparent',
                color: activeTab === 'refs' ? '#18181B' : '#A1A1AA',
                transition: 'all 150ms',
              }}>
                Références {currentRefs.length > 0 ? `(${currentRefs.length})` : ''}
              </button>

              {offreComps.length > 0 && <div style={{ width: 1, height: 18, background: '#E5E2DB', margin: '0 6px' }} />}

              {offreComps.map(comp => (
                <div key={comp.id} style={{ display: 'flex', alignItems: 'center' }}>
                  <button onClick={() => setActiveTab(comp.id)} style={{
                    padding: '10px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer', border: 'none', background: 'none', whiteSpace: 'nowrap',
                    borderBottom: activeTab === comp.id ? `2px solid ${offre.color}` : '2px solid transparent',
                    color: activeTab === comp.id ? '#18181B' : '#A1A1AA',
                    transition: 'all 150ms',
                  }}>
                    {comp.name}
                  </button>
                  {isAdmin && activeTab === comp.id && (
                    <span onClick={() => deleteComponent(comp.id)} style={{ fontSize: 11, color: '#D1CEC7', cursor: 'pointer', marginLeft: -4 }}>&#10005;</span>
                  )}
                </div>
              ))}

              {isAdmin && (
                showNewComponent ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 8px' }}>
                    <input autoFocus value={newComponentName} onChange={e => setNewComponentName(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && createComponent()}
                      placeholder="Nom..."
                      style={{ padding: '5px 10px', borderRadius: 6, border: '1px solid #E5E2DB', fontSize: 13, width: 130 }} />
                    <button onClick={createComponent} className="btn-primary" style={{ padding: '5px 10px', borderRadius: 6, fontSize: 12 }}>OK</button>
                    <button onClick={() => setShowNewComponent(false)} className="btn-secondary" style={{ padding: '5px 8px', borderRadius: 6, fontSize: 12 }}>&#10005;</button>
                  </div>
                ) : (
                  <button onClick={() => setShowNewComponent(true)} style={{
                    padding: '6px 12px', fontSize: 12, color: '#A1A1AA', background: 'none', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap', fontWeight: 600,
                  }}>+ Composant</button>
                )
              )}
            </div>

            {/* ── ONGLET RÉFÉRENCES ── */}
            {activeTab === 'refs' && (
              <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                  <div style={{ position: 'relative', flex: 1, maxWidth: 300 }}>
                    <input value={refSearch} onChange={e => setRefSearch(e.target.value)}
                      placeholder="Rechercher une référence..."
                      style={{
                        width: '100%', padding: '8px 14px 8px 34px', borderRadius: 8,
                        border: '1px solid #E5E2DB', fontSize: 13, background: '#FAFAF8', boxSizing: 'border-box',
                      }} />
                    <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 13, color: '#D1CEC7' }}>&#8981;</span>
                  </div>
                  <div style={{ flex: 1 }} />
                  <div style={{ display: 'flex', gap: 6 }}>
                    {Object.entries(refsByType).map(([type, refs]) => {
                      const tc = REF_TYPE_COLORS[type] || REF_TYPE_COLORS['Autre']
                      return (
                        <span key={type} className="badge" style={{ fontSize: 11, padding: '3px 10px', borderRadius: 6, background: tc.bg, color: tc.text, border: `1px solid ${tc.border}`, fontWeight: 600 }}>
                          {type} · {refs.length}
                        </span>
                      )
                    })}
                  </div>
                  {isAdmin && (
                    <button onClick={() => setShowNewRef(true)} style={{
                      padding: '8px 16px', borderRadius: 8, background: offre.color, color: '#FFF',
                      border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                    }}>+ Référence</button>
                  )}
                </div>

                {showNewRef && (
                  <div style={{ background: '#FFF', border: `1.5px solid ${offre.color}33`, borderRadius: 12, padding: 18, marginBottom: 20, boxShadow: 'var(--shadow-sm)' }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#71717A', marginBottom: 14 }}>Nouvelle référence</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 100px 120px 100px', gap: 10, alignItems: 'end' }}>
                      <div>
                        <label style={labelStyle}>Référence *</label>
                        <input autoFocus value={newRef.reference} onChange={e => setNewRef(p => ({ ...p, reference: e.target.value }))}
                          placeholder="DR-001-50ML"
                          style={{ ...inputStyle, fontFamily: 'var(--font-mono, monospace)' }} />
                      </div>
                      <div>
                        <label style={labelStyle}>Désignation</label>
                        <input value={newRef.label} onChange={e => setNewRef(p => ({ ...p, label: e.target.value }))}
                          placeholder="Crème Visage 50ml"
                          style={inputStyle} />
                      </div>
                      <div>
                        <label style={labelStyle}>Qté</label>
                        <input type="number" value={newRef.quantity} onChange={e => setNewRef(p => ({ ...p, quantity: e.target.value }))}
                          placeholder="500"
                          style={inputStyle} />
                      </div>
                      <div>
                        <label style={labelStyle}>Type</label>
                        <select value={newRef.type} onChange={e => setNewRef(p => ({ ...p, type: e.target.value }))}
                          style={inputStyle}>
                          {REF_TYPES.map(t => <option key={t}>{t}</option>)}
                        </select>
                      </div>
                      <div>
                        <label style={labelStyle}>Unité</label>
                        <select value={newRef.unit} onChange={e => setNewRef(p => ({ ...p, unit: e.target.value }))}
                          style={inputStyle}>
                          {['unité', 'kg', 'litre', 'ml', 'g', 'boîte', 'palette'].map(u => <option key={u}>{u}</option>)}
                        </select>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 14, justifyContent: 'flex-end' }}>
                      <button onClick={() => setShowNewRef(false)}
                        className="btn-secondary"
                        style={{ padding: '8px 16px', borderRadius: 8, fontSize: 13 }}>
                        Annuler
                      </button>
                      <button onClick={addRef}
                        className="btn-primary"
                        style={{ padding: '8px 18px', borderRadius: 8, fontSize: 13 }}>
                        Ajouter
                      </button>
                    </div>
                  </div>
                )}

                {filteredRefs.length === 0 && !showNewRef && (
                  <div className="empty-state" style={{ textAlign: 'center', padding: '56px 0', color: '#A1A1AA' }}>
                    <div style={{ fontSize: 36, marginBottom: 12, opacity: 0.4 }}>&#128230;</div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#71717A' }}>Aucune référence pour cette offre</div>
                    {isAdmin && <div style={{ fontSize: 13, marginTop: 6, color: '#D1CEC7' }}>Clique sur &quot;+ Référence&quot; pour en ajouter</div>}
                  </div>
                )}

                {Object.entries(refsByType).map(([type, refs]) => {
                  const tc = REF_TYPE_COLORS[type] || REF_TYPE_COLORS['Autre']
                  const totalQty = refs.reduce((acc, r) => acc + r.quantity, 0)
                  return (
                    <div key={type} style={{ marginBottom: 20 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, padding: '3px 12px', borderRadius: 6, background: tc.bg, color: tc.text, border: `1px solid ${tc.border}` }}>
                          {type}
                        </span>
                        <span style={{ fontSize: 11, color: '#A1A1AA', fontWeight: 500 }}>{refs.length} référence{refs.length > 1 ? 's' : ''}</span>
                        <div style={{ flex: 1, height: 1, background: '#EEEBE5' }} />
                        <span style={{ fontSize: 11, color: '#71717A', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                          Total : {totalQty.toLocaleString()} {refs[0]?.unit || 'unités'}
                        </span>
                      </div>

                      <div style={{ background: '#FFF', borderRadius: 10, border: '1px solid #E5E2DB', overflow: 'hidden', boxShadow: 'var(--shadow-xs)' }}>
                        <div style={{
                          display: 'grid', gridTemplateColumns: '150px 1fr 100px 80px 36px',
                          padding: '8px 16px', fontSize: 11, color: '#A1A1AA', fontWeight: 600,
                          letterSpacing: '0.02em',
                          borderBottom: '1px solid #EEEBE5', background: '#FAFAF8',
                        }}>
                          <div>Référence</div>
                          <div>Désignation</div>
                          <div>Quantité</div>
                          <div>Unité</div>
                          <div/>
                        </div>
                        {refs.map((ref, idx) => (
                          <div key={ref.id}
                            className="row-hover"
                            onClick={() => isAdmin && setEditingRef(ref)}
                            style={{
                              display: 'grid', gridTemplateColumns: '150px 1fr 100px 80px 36px',
                              padding: '10px 16px', alignItems: 'center',
                              borderBottom: idx < refs.length - 1 ? '1px solid #F4F4F5' : 'none',
                              cursor: isAdmin ? 'pointer' : 'default',
                            }}>
                            <div style={{ fontSize: 13, fontWeight: 600, color: tc.text, fontFamily: 'var(--font-mono, monospace)', letterSpacing: '0.01em' }}>
                              {ref.reference}
                            </div>
                            <div style={{ fontSize: 13, color: '#3F3F46' }}>{ref.label || <span style={{ color: '#D1CEC7' }}>&mdash;</span>}</div>
                            <div style={{ fontSize: 13, fontWeight: 600, color: '#18181B', fontVariantNumeric: 'tabular-nums' }}>
                              {ref.quantity.toLocaleString()}
                            </div>
                            <div style={{ fontSize: 12, color: '#71717A' }}>{ref.unit}</div>
                            <div style={{ display: 'flex', justifyContent: 'center' }}>
                              {isAdmin && <span style={{ fontSize: 12, color: '#D1CEC7' }}>&#9998;</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* ── ONGLET TÂCHES / COMPOSANTS ── */}
            {activeTab !== 'refs' && (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

                {activeComp && (activeComp.refs || []).length > 0 && (
                  <div style={{ padding: '8px 24px', borderBottom: '1px solid #E5E2DB', background: '#FAFAF8' }}>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {(activeComp.refs || []).map((ref: any) => (
                        <span key={ref.id} style={{ fontSize: 11, fontFamily: 'var(--font-mono, monospace)', fontWeight: 600, padding: '3px 10px', borderRadius: 6, background: '#F4F4F5', color: '#52525B', border: '1px solid #E5E2DB' }}>
                          {ref.reference} · {ref.quantity.toLocaleString()}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Filtres */}
                <div style={{ padding: '10px 24px', borderBottom: '1px solid #E5E2DB', background: '#FFF', display: 'flex', gap: 5, alignItems: 'center' }}>
                  {['Tous', 'Achat', 'Marketing', 'Logistique', 'ESAT'].map(d => (
                    <button key={d} onClick={() => setFilterDept(d)}
                      className={`filter-pill ${filterDept === d ? 'filter-pill-active' : ''}`}
                      style={{
                        padding: '4px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                        border: filterDept === d ? 'none' : '1px solid #E5E2DB',
                        background: filterDept === d ? '#18181B' : 'transparent',
                        color: filterDept === d ? '#F5F3EF' : '#71717A',
                      }}>{d}</button>
                  ))}
                  <div style={{ flex: 1 }} />
                  {isAdmin && (
                    <button onClick={() => setShowNewTask(true)} style={{
                      padding: '5px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                      background: offre.color, color: '#FFF', border: 'none', cursor: 'pointer',
                    }}>+ Tâche</button>
                  )}
                </div>

                <div style={{ flex: 1, overflowY: 'auto', padding: '8px 24px 24px' }}>

                  {showNewTask && (
                    <div style={{
                      background: '#FFF', border: '1px solid #E5E2DB', borderRadius: 10,
                      padding: 12, marginBottom: 12, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center',
                      boxShadow: 'var(--shadow-xs)',
                    }}>
                      <input value={newTask.label} onChange={e => setNewTask(p => ({ ...p, label: e.target.value }))}
                        placeholder="Nom de la tâche..." autoFocus
                        style={{ flex: 2, padding: '7px 10px', borderRadius: 6, border: '1px solid #E5E2DB', fontSize: 13, minWidth: 130 }} />
                      <select value={newTask.dept} onChange={e => setNewTask(p => ({ ...p, dept: e.target.value }))}
                        style={{ padding: '7px 10px', borderRadius: 6, border: '1px solid #E5E2DB', fontSize: 13 }}>
                        {['Achat', 'Marketing', 'Logistique', 'ESAT'].map(d => <option key={d}>{d}</option>)}
                      </select>
                      <input value={newTask.deadline} onChange={e => setNewTask(p => ({ ...p, deadline: e.target.value }))} type="date"
                        style={{ padding: '7px 10px', borderRadius: 6, border: '1px solid #E5E2DB', fontSize: 13 }} />
                      <button onClick={() => addTask(activeComp?.id)} className="btn-primary" style={{ padding: '7px 14px', borderRadius: 6, fontSize: 13 }}>Ajouter</button>
                      <button onClick={() => setShowNewTask(false)} className="btn-secondary" style={{ padding: '7px 10px', borderRadius: 6, fontSize: 13 }}>&#10005;</button>
                    </div>
                  )}

                  {/* Table header */}
                  <div className="table-header" style={{
                    display: 'grid', gridTemplateColumns: '28px 1fr 100px 90px 110px 1fr 28px',
                    padding: '6px 14px', fontSize: 11, color: '#A1A1AA', fontWeight: 600,
                    letterSpacing: '0.02em',
                    background: 'rgba(245,243,239,0.95)', borderRadius: '8px 8px 0 0',
                  }}>
                    <div/><div>Tâche</div><div>Département</div><div>Deadline</div><div>Statut</div><div>Note</div><div/>
                  </div>

                  {tasksToShow.length === 0 && (
                    <div className="empty-state" style={{ fontSize: 14, color: '#D1CEC7', padding: '28px 14px', textAlign: 'center' }}>
                      Aucune tâche
                    </div>
                  )}

                  {tasksToShow.map((task, idx) => {
                    const dc = DEPT_COLORS[task.department]
                    const sc = STATUS_CONFIG[task.status]
                    const canEdit = isAdmin || task.department === profile?.department
                    return (
                      <div key={task.id} className="row-hover" style={{
                        display: 'grid', gridTemplateColumns: '28px 1fr 100px 90px 110px 1fr 28px',
                        padding: '9px 14px', borderRadius: 6, alignItems: 'center',
                        background: idx % 2 === 0 ? '#FFF' : 'transparent', marginBottom: 1,
                      }}>
                        <div onClick={() => canEdit && updateTaskStatus(task.id, task.status === 'Fait' ? 'À faire' : 'Fait', activeComp?.id)}
                          style={{
                            width: 17, height: 17, borderRadius: 4,
                            border: task.status === 'Fait' ? 'none' : '1.5px solid #D1CEC7',
                            background: task.status === 'Fait' ? '#059669' : 'transparent',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: canEdit ? 'pointer' : 'default', fontSize: 10, color: '#FFF',
                            transition: 'all 150ms',
                          }}>
                          {task.status === 'Fait' && '&#10003;'}
                        </div>
                        <div style={{ fontSize: 13, fontWeight: task.status === 'Fait' ? 400 : 500, color: task.status === 'Fait' ? '#A1A1AA' : '#18181B', textDecoration: task.status === 'Fait' ? 'line-through' : 'none' }}>
                          {task.label}
                          {task.is_custom && <span style={{ fontSize: 10, color: '#D1CEC7', marginLeft: 6, fontWeight: 500 }}>custom</span>}
                        </div>
                        <div>
                          <span className="badge" style={{ fontSize: 11, fontWeight: 600, color: dc.text, background: dc.bg, padding: '2px 8px', borderRadius: 5 }}>
                            {task.department}
                          </span>
                        </div>
                        <div style={{ fontSize: 12, color: '#71717A', fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>
                          {task.deadline ? new Date(task.deadline).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : '&mdash;'}
                        </div>
                        <div>
                          {canEdit ? (
                            <select value={task.status} onChange={e => updateTaskStatus(task.id, e.target.value, activeComp?.id)}
                              style={{ fontSize: 11, fontWeight: 600, padding: '3px 6px', borderRadius: 5, border: 'none', background: sc.bg, color: sc.color, cursor: 'pointer' }}>
                              {['À faire', 'En cours', 'Fait', 'Bloqué'].map(s => <option key={s}>{s}</option>)}
                            </select>
                          ) : (
                            <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 5, background: sc.bg, color: sc.color }}>{task.status}</span>
                          )}
                        </div>
                        <div>
                          {editingNote === task.id ? (
                            <input autoFocus defaultValue={task.note}
                              onBlur={e => updateNote(task.id, e.target.value, activeComp?.id)}
                              onKeyDown={e => e.key === 'Enter' && updateNote(task.id, (e.target as HTMLInputElement).value, activeComp?.id)}
                              style={{ fontSize: 12, padding: '3px 8px', borderRadius: 5, border: '1px solid #E5E2DB', width: '100%' }} />
                          ) : (
                            <div onClick={() => canEdit && setEditingNote(task.id)}
                              style={{ fontSize: 12, color: task.note ? '#52525B' : '#D1CEC7', cursor: canEdit ? 'text' : 'default', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                              {task.note || (canEdit ? 'Ajouter une note...' : '—')}
                            </div>
                          )}
                        </div>
                        <div>
                          {isAdmin && (
                            <span onClick={() => openEditTask(task)}
                              style={{ fontSize: 12, color: '#D1CEC7', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.5, transition: 'opacity 150ms' }}
                              onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                              onMouseLeave={e => (e.currentTarget.style.opacity = '0.5')}
                            >&#9998;</span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="empty-state" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 8, color: '#D1CEC7' }}>
            <div style={{ fontSize: 40, opacity: 0.2 }}>&#10022;</div>
            <div style={{ fontSize: 15, color: '#A1A1AA', fontWeight: 600 }}>Sélectionne une offre</div>
            <div style={{ fontSize: 13, color: '#D1CEC7' }}>pour voir les détails et les tâches</div>
          </div>
        )}
      </div>
    </div>
  )
}
