#!/bin/bash
# setup3.sh - Composants par offre + références produit
# Lance depuis la racine du projet : bash setup3.sh

echo "📦 Mise à jour avec composants et références..."

cat > app/dashboard/DashboardClient.tsx << 'ENDOFFILE'
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Offre, Profile, Task } from '@/lib/types'

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

interface Ref { id: string; reference: string; label: string; quantity: number }
interface Component { id: string; offre_id: string; name: string; refs: Ref[]; tasks: Task[] }

export default function DashboardClient({ profile, offres: initialOffres }: { profile: Profile, offres: Offre[] }) {
  const [offres, setOffres] = useState<Offre[]>(initialOffres)
  const [selectedId, setSelectedId] = useState<string | null>(initialOffres[0]?.id || null)
  const [filterDept, setFilterDept] = useState('Tous')
  const [editingNote, setEditingNote] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<string | null>(null) // component id ou 'all'

  // Composants
  const [components, setComponents] = useState<Record<string, Component[]>>({})
  const [loadingComponents, setLoadingComponents] = useState<string | null>(null)

  // Nouvelle offre
  const [showNewOffre, setShowNewOffre] = useState(false)
  const [newOffre, setNewOffre] = useState({ name: '', color: '#FF6B9D', start_date: '', end_date: '', priority: 'Basse' })
  const [creating, setCreating] = useState(false)

  // Édition offre
  const [editingOffre, setEditingOffre] = useState<Offre | null>(null)
  const [editOffreForm, setEditOffreForm] = useState({ name: '', color: '', start_date: '', end_date: '', priority: '' })

  // Nouveau composant
  const [showNewComponent, setShowNewComponent] = useState(false)
  const [newComponentName, setNewComponentName] = useState('')

  // Nouvelle ref
  const [showNewRef, setShowNewRef] = useState<string | null>(null) // component id
  const [newRef, setNewRef] = useState({ reference: '', label: '', quantity: '' })

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

  // ── Charger les composants d'une offre ───────────────────────────────────
  const loadComponents = async (offreId: string) => {
    if (components[offreId]) return
    setLoadingComponents(offreId)
    const { data: comps } = await supabase
      .from('offre_components')
      .select('*, component_refs(*), tasks(*)')
      .eq('offre_id', offreId)
      .order('created_at')
    setComponents(prev => ({ ...prev, [offreId]: comps || [] }))
    setLoadingComponents(null)
    if (comps?.length) setActiveTab(comps[0].id)
    else setActiveTab('all')
  }

  const selectOffre = (id: string) => {
    setSelectedId(id)
    setActiveTab('all')
    setFilterDept('Tous')
    loadComponents(id)
  }

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
      setActiveTab('all')
      setNewOffre({ name: '', color: '#FF6B9D', start_date: '', end_date: '', priority: 'Basse' })
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

  // ── Créer composant ───────────────────────────────────────────────────────
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
    if (!confirm('Supprimer ce composant ?')) return
    if (!selectedId) return
    const comps = components[selectedId]?.filter(c => c.id !== compId) || []
    setComponents(prev => ({ ...prev, [selectedId]: comps }))
    setActiveTab(comps[0]?.id || 'all')
    await supabase.from('offre_components').delete().eq('id', compId)
  }

  // ── Refs produit ─────────────────────────────────────────────────────────
  const addRef = async (compId: string) => {
    if (!newRef.reference) return
    const { data } = await supabase.from('component_refs')
      .insert({ component_id: compId, reference: newRef.reference, label: newRef.label, quantity: parseInt(newRef.quantity) || 0 })
      .select().single()
    if (data && selectedId) {
      setComponents(prev => ({
        ...prev,
        [selectedId]: prev[selectedId].map(c => c.id === compId ? { ...c, refs: [...c.refs, data] } : c)
      }))
      setNewRef({ reference: '', label: '', quantity: '' })
      setShowNewRef(null)
    }
  }

  const deleteRef = async (compId: string, refId: string) => {
    if (!selectedId) return
    setComponents(prev => ({
      ...prev,
      [selectedId]: prev[selectedId].map(c => c.id === compId ? { ...c, refs: c.refs.filter(r => r.id !== refId) } : c)
    }))
    await supabase.from('component_refs').delete().eq('id', refId)
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

  // Tâches à afficher selon onglet actif
  const activeComp = selectedId && activeTab && activeTab !== 'all'
    ? components[selectedId]?.find(c => c.id === activeTab)
    : null

  const tasksToShow = activeComp
    ? activeComp.tasks.filter(t => filterDept === 'Tous' || t.department === filterDept)
    : (offre?.tasks?.filter(t => filterDept === 'Tous' || t.department === filterDept) || [])

  const offreComps = selectedId ? components[selectedId] || [] : []

  // ── RENDER ────────────────────────────────────────────────────────────────
  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', background: '#F8F7F4', minHeight: '100vh', color: '#1C1B18' }}>

      {/* MODAL NOUVELLE OFFRE */}
      {showNewOffre && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#FFF', borderRadius: 16, padding: 32, width: 440, boxShadow: '0 8px 40px rgba(0,0,0,0.15)' }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 24px' }}>Nouvelle offre</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 11, color: '#888', fontWeight: 600, display: 'block', marginBottom: 5 }}>NOM</label>
                <input value={newOffre.name} onChange={e => setNewOffre(p => ({ ...p, name: e.target.value }))}
                  placeholder="Ex: Crème Visage Printemps"
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #E8E4DC', fontSize: 14, boxSizing: 'border-box' }} />
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 11, color: '#888', fontWeight: 600, display: 'block', marginBottom: 5 }}>DÉBUT</label>
                  <input type="date" value={newOffre.start_date} onChange={e => setNewOffre(p => ({ ...p, start_date: e.target.value }))}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #E8E4DC', fontSize: 14, boxSizing: 'border-box' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 11, color: '#888', fontWeight: 600, display: 'block', marginBottom: 5 }}>FIN</label>
                  <input type="date" value={newOffre.end_date} onChange={e => setNewOffre(p => ({ ...p, end_date: e.target.value }))}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #E8E4DC', fontSize: 14, boxSizing: 'border-box' }} />
                </div>
              </div>
              <div>
                <label style={{ fontSize: 11, color: '#888', fontWeight: 600, display: 'block', marginBottom: 5 }}>PRIORITÉ</label>
                <select value={newOffre.priority} onChange={e => setNewOffre(p => ({ ...p, priority: e.target.value }))}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #E8E4DC', fontSize: 14 }}>
                  <option>Basse</option><option>Haute</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, color: '#888', fontWeight: 600, display: 'block', marginBottom: 8 }}>COULEUR</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {COLORS.map(c => (
                    <div key={c} onClick={() => setNewOffre(p => ({ ...p, color: c }))}
                      style={{ width: 28, height: 28, borderRadius: '50%', background: c, cursor: 'pointer', border: newOffre.color === c ? '3px solid #1C1B18' : '3px solid transparent' }} />
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                <button onClick={() => setShowNewOffre(false)}
                  style={{ flex: 1, padding: '10px', borderRadius: 8, border: '1px solid #E8E4DC', background: 'transparent', fontSize: 14, cursor: 'pointer' }}>
                  Annuler
                </button>
                <button onClick={createOffre} disabled={creating}
                  style={{ flex: 2, padding: '10px', borderRadius: 8, background: '#1C1B18', color: '#FFF', border: 'none', fontSize: 14, fontWeight: 600, cursor: 'pointer', opacity: creating ? 0.7 : 1 }}>
                  {creating ? 'Création...' : "Créer l'offre"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL ÉDITION OFFRE */}
      {editingOffre && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#FFF', borderRadius: 16, padding: 32, width: 440, boxShadow: '0 8px 40px rgba(0,0,0,0.15)' }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 24px' }}>Modifier l'offre</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 11, color: '#888', fontWeight: 600, display: 'block', marginBottom: 5 }}>NOM</label>
                <input value={editOffreForm.name} onChange={e => setEditOffreForm(p => ({ ...p, name: e.target.value }))}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #E8E4DC', fontSize: 14, boxSizing: 'border-box' }} />
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 11, color: '#888', fontWeight: 600, display: 'block', marginBottom: 5 }}>DÉBUT</label>
                  <input type="date" value={editOffreForm.start_date} onChange={e => setEditOffreForm(p => ({ ...p, start_date: e.target.value }))}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #E8E4DC', fontSize: 14, boxSizing: 'border-box' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 11, color: '#888', fontWeight: 600, display: 'block', marginBottom: 5 }}>FIN</label>
                  <input type="date" value={editOffreForm.end_date} onChange={e => setEditOffreForm(p => ({ ...p, end_date: e.target.value }))}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #E8E4DC', fontSize: 14, boxSizing: 'border-box' }} />
                </div>
              </div>
              <div>
                <label style={{ fontSize: 11, color: '#888', fontWeight: 600, display: 'block', marginBottom: 5 }}>PRIORITÉ</label>
                <select value={editOffreForm.priority} onChange={e => setEditOffreForm(p => ({ ...p, priority: e.target.value }))}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #E8E4DC', fontSize: 14 }}>
                  <option>Basse</option><option>Haute</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, color: '#888', fontWeight: 600, display: 'block', marginBottom: 8 }}>COULEUR</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {COLORS.map(c => (
                    <div key={c} onClick={() => setEditOffreForm(p => ({ ...p, color: c }))}
                      style={{ width: 28, height: 28, borderRadius: '50%', background: c, cursor: 'pointer', border: editOffreForm.color === c ? '3px solid #1C1B18' : '3px solid transparent' }} />
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                <button onClick={() => deleteOffre(editingOffre.id)}
                  style={{ padding: '10px 16px', borderRadius: 8, border: 'none', background: '#FEF2F2', color: '#EF4444', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                  Supprimer
                </button>
                <div style={{ flex: 1 }} />
                <button onClick={() => setEditingOffre(null)}
                  style={{ padding: '10px 16px', borderRadius: 8, border: '1px solid #E8E4DC', background: 'transparent', fontSize: 14, cursor: 'pointer' }}>
                  Annuler
                </button>
                <button onClick={saveEditOffre}
                  style={{ padding: '10px 20px', borderRadius: 8, background: '#1C1B18', color: '#FFF', border: 'none', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                  Sauvegarder
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL ÉDITION TÂCHE */}
      {editingTask && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#FFF', borderRadius: 16, padding: 32, width: 400, boxShadow: '0 8px 40px rgba(0,0,0,0.15)' }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 24px' }}>Modifier la tâche</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 11, color: '#888', fontWeight: 600, display: 'block', marginBottom: 5 }}>LABEL</label>
                <input value={editTaskForm.label} onChange={e => setEditTaskForm(p => ({ ...p, label: e.target.value }))}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #E8E4DC', fontSize: 14, boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: 11, color: '#888', fontWeight: 600, display: 'block', marginBottom: 5 }}>DÉPARTEMENT</label>
                <select value={editTaskForm.department} onChange={e => setEditTaskForm(p => ({ ...p, department: e.target.value }))}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #E8E4DC', fontSize: 14 }}>
                  {['Achat', 'Marketing', 'Logistique', 'ESAT'].map(d => <option key={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, color: '#888', fontWeight: 600, display: 'block', marginBottom: 5 }}>DEADLINE</label>
                <input type="date" value={editTaskForm.deadline} onChange={e => setEditTaskForm(p => ({ ...p, deadline: e.target.value }))}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #E8E4DC', fontSize: 14, boxSizing: 'border-box' }} />
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                <button onClick={() => { deleteTask(editingTask.id); setEditingTask(null) }}
                  style={{ padding: '10px 16px', borderRadius: 8, border: 'none', background: '#FEF2F2', color: '#EF4444', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                  Supprimer
                </button>
                <div style={{ flex: 1 }} />
                <button onClick={() => setEditingTask(null)}
                  style={{ padding: '10px 16px', borderRadius: 8, border: '1px solid #E8E4DC', background: 'transparent', fontSize: 14, cursor: 'pointer' }}>
                  Annuler
                </button>
                <button onClick={saveEditTask}
                  style={{ padding: '10px 20px', borderRadius: 8, background: '#1C1B18', color: '#FFF', border: 'none', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                  Sauvegarder
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
          {isAdmin && (
            <button onClick={() => router.push('/admin')}
              style={{ fontSize: 12, color: '#AAA', background: 'none', border: 'none', cursor: 'pointer' }}>
              Utilisateurs
            </button>
          )}
          <button onClick={handleLogout} style={{ fontSize: 12, color: '#888', background: 'none', border: 'none', cursor: 'pointer' }}>Déconnexion</button>
        </div>
      </div>

      <div style={{ display: 'flex', height: 'calc(100vh - 52px)', overflow: 'hidden' }}>

        {/* LEFT PANEL */}
        <div style={{ width: 300, borderRight: '1px solid #E8E4DC', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#F8F7F4' }}>
          <div style={{ padding: '14px 14px 10px', borderBottom: '1px solid #E8E4DC' }}>
            <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', color: '#888', textTransform: 'uppercase', marginBottom: 8 }}>Planning 2026</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 1, marginBottom: 4 }}>
              {MONTHS.map((m, i) => <div key={i} style={{ fontSize: 8, color: '#AAA', textAlign: 'center' }}>{m}</div>)}
            </div>
            {offres.map(o => {
              const s = new Date(o.start_date).getMonth()
              const e = new Date(o.end_date).getMonth()
              return (
                <div key={o.id} style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 1, marginBottom: 3, cursor: 'pointer' }}
                  onClick={() => selectOffre(o.id)}>
                  {MONTHS.map((_, i) => (
                    <div key={i} style={{
                      height: 7, borderRadius: i === s ? '3px 0 0 3px' : i === e ? '0 3px 3px 0' : 0,
                      background: (i >= s && i <= e) ? o.color : 'transparent',
                      opacity: selectedId === o.id ? 1 : 0.6,
                    }} />
                  ))}
                </div>
              )
            })}
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: 10 }}>
            {offres.map(o => {
              const progress = getProgress(o)
              const blocked = o.tasks?.filter(t => t.status === 'Bloqué').length || 0
              return (
                <div key={o.id} onClick={() => selectOffre(o.id)}
                  style={{
                    padding: '11px 13px', borderRadius: 10, marginBottom: 6, cursor: 'pointer',
                    background: selectedId === o.id ? '#1C1B18' : '#FFF',
                    color: selectedId === o.id ? '#F8F7F4' : '#1C1B18',
                    border: `1px solid ${selectedId === o.id ? '#1C1B18' : '#E8E4DC'}`,
                    transition: 'all 0.15s',
                  }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                    <div style={{ width: 7, height: 7, borderRadius: '50%', background: o.color }} />
                    <span style={{ fontSize: 12, fontWeight: 600, flex: 1 }}>{o.name}</span>
                    {isAdmin && (
                      <span onClick={ev => { ev.stopPropagation(); openEditOffre(o) }}
                        style={{ fontSize: 12, color: selectedId === o.id ? '#888' : '#CCC', cursor: 'pointer' }}>✎</span>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: selectedId === o.id ? '#AAA' : '#888', marginBottom: 7 }}>
                    {new Date(o.start_date).toLocaleDateString('fr-FR', { month: 'short', day: 'numeric' })} → {new Date(o.end_date).toLocaleDateString('fr-FR', { month: 'short', day: 'numeric' })}
                  </div>
                  <div style={{ background: selectedId === o.id ? '#333' : '#F0EDE6', borderRadius: 4, height: 3, marginBottom: 5 }}>
                    <div style={{ width: `${progress}%`, height: '100%', background: o.color, borderRadius: 4 }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: selectedId === o.id ? '#AAA' : '#888' }}>
                    <span>{o.tasks?.filter(t => t.status === 'Fait').length || 0}/{o.tasks?.length || 0} tâches</span>
                    {blocked > 0 && <span style={{ color: '#EF4444' }}>⚠ {blocked}</span>}
                  </div>
                </div>
              )
            })}
            {isAdmin && (
              <button onClick={() => setShowNewOffre(true)} style={{
                width: '100%', padding: '9px', border: '1.5px dashed #D4D0C8', borderRadius: 10,
                background: 'transparent', cursor: 'pointer', fontSize: 12, color: '#888',
              }}>+ Nouvelle offre</button>
            )}
          </div>
        </div>

        {/* RIGHT PANEL */}
        {offre ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

            {/* Offre header */}
            <div style={{ padding: '16px 24px 12px', borderBottom: '1px solid #E8E4DC', background: '#FFF' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: offre.color }} />
                <h1 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>{offre.name}</h1>
                <span style={{ fontSize: 11, color: '#888', background: '#F0EDE6', padding: '3px 10px', borderRadius: 20 }}>
                  {new Date(offre.start_date).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })} → {new Date(offre.end_date).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
                </span>
                <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, background: offre.priority === 'Haute' ? '#FEF2F2' : '#F1F5F9', color: offre.priority === 'Haute' ? '#EF4444' : '#888', fontWeight: 600 }}>
                  {offre.priority}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ flex: 1, background: '#F0EDE6', borderRadius: 4, height: 4 }}>
                  <div style={{ width: `${getProgress(offre)}%`, height: '100%', background: offre.color, borderRadius: 4, transition: 'width 0.3s' }} />
                </div>
                <span style={{ fontSize: 11, fontWeight: 600, color: '#666' }}>{getProgress(offre)}%</span>
                {(['Achat', 'Marketing', 'Logistique', 'ESAT'] as const).map(dept => {
                  const dt = offre.tasks?.filter(t => t.department === dept) || []
                  if (!dt.length) return null
                  return (
                    <span key={dept} style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: DEPT_COLORS[dept].bg, color: DEPT_COLORS[dept].text, fontWeight: 600 }}>
                      {dept} {dt.filter(t => t.status === 'Fait').length}/{dt.length}
                    </span>
                  )
                })}
              </div>
            </div>

            {/* ONGLETS COMPOSANTS */}
            <div style={{ background: '#FFF', borderBottom: '1px solid #E8E4DC', padding: '0 24px', display: 'flex', alignItems: 'center', gap: 4, overflowX: 'auto' }}>
              <button onClick={() => setActiveTab('all')} style={{
                padding: '10px 14px', fontSize: 13, fontWeight: 500, cursor: 'pointer', border: 'none', background: 'none', whiteSpace: 'nowrap',
                borderBottom: activeTab === 'all' ? `2px solid ${offre.color}` : '2px solid transparent',
                color: activeTab === 'all' ? '#1C1B18' : '#888',
              }}>
                Vue générale
              </button>
              {loadingComponents === offre.id ? (
                <span style={{ fontSize: 12, color: '#AAA', padding: '10px 0' }}>Chargement...</span>
              ) : (
                offreComps.map(comp => (
                  <div key={comp.id} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <button onClick={() => setActiveTab(comp.id)} style={{
                      padding: '10px 14px', fontSize: 13, fontWeight: 500, cursor: 'pointer', border: 'none', background: 'none', whiteSpace: 'nowrap',
                      borderBottom: activeTab === comp.id ? `2px solid ${offre.color}` : '2px solid transparent',
                      color: activeTab === comp.id ? '#1C1B18' : '#888',
                    }}>
                      {comp.name}
                    </button>
                    {isAdmin && activeTab === comp.id && (
                      <span onClick={() => deleteComponent(comp.id)} style={{ fontSize: 11, color: '#CCC', cursor: 'pointer', marginLeft: -4 }}>✕</span>
                    )}
                  </div>
                ))
              )}
              {isAdmin && (
                showNewComponent ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 0' }}>
                    <input autoFocus value={newComponentName} onChange={e => setNewComponentName(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && createComponent()}
                      placeholder="Nom du composant..."
                      style={{ padding: '5px 10px', borderRadius: 6, border: '1px solid #E8E4DC', fontSize: 13, width: 160 }} />
                    <button onClick={createComponent} style={{ padding: '5px 10px', borderRadius: 6, background: '#1C1B18', color: '#FFF', border: 'none', fontSize: 12, cursor: 'pointer' }}>OK</button>
                    <button onClick={() => setShowNewComponent(false)} style={{ padding: '5px 8px', borderRadius: 6, border: '1px solid #E8E4DC', background: 'transparent', fontSize: 12, cursor: 'pointer' }}>✕</button>
                  </div>
                ) : (
                  <button onClick={() => setShowNewComponent(true)} style={{
                    padding: '8px 12px', fontSize: 12, color: '#888', background: 'none', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap',
                  }}>
                    + Composant
                  </button>
                )
              )}
            </div>

            {/* CONTENU ONGLET */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px 24px' }}>

              {/* Refs produit si onglet composant actif */}
              {activeComp && (
                <div style={{ marginBottom: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Références produit</span>
                    {isAdmin && (
                      <button onClick={() => setShowNewRef(activeComp.id)} style={{
                        fontSize: 11, padding: '4px 10px', borderRadius: 6, background: '#F0EDE6',
                        border: 'none', cursor: 'pointer', fontWeight: 600, color: '#666',
                      }}>+ Référence</button>
                    )}
                  </div>

                  {activeComp.refs.length === 0 && !showNewRef ? (
                    <div style={{ fontSize: 12, color: '#CCC', padding: '8px 0' }}>Aucune référence</div>
                  ) : (
                    <div style={{ background: '#FFF', borderRadius: 10, border: '1px solid #E8E4DC', overflow: 'hidden' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr 80px 32px', padding: '7px 14px', fontSize: 10, color: '#AAA', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #F0EDE6' }}>
                        <div>Référence</div><div>Désignation</div><div>Qté</div><div/>
                      </div>
                      {activeComp.refs.map(ref => (
                        <div key={ref.id} style={{ display: 'grid', gridTemplateColumns: '120px 1fr 80px 32px', padding: '8px 14px', alignItems: 'center', borderBottom: '1px solid #F8F7F4' }}>
                          <div style={{ fontSize: 12, fontWeight: 600, color: '#1C1B18', fontFamily: 'monospace' }}>{ref.reference}</div>
                          <div style={{ fontSize: 12, color: '#555' }}>{ref.label}</div>
                          <div style={{ fontSize: 12, fontWeight: 600, color: '#1C1B18' }}>{ref.quantity.toLocaleString()}</div>
                          {isAdmin && (
                            <div onClick={() => deleteRef(activeComp.id, ref.id)} style={{ fontSize: 12, color: '#CCC', cursor: 'pointer', textAlign: 'center' }}>✕</div>
                          )}
                        </div>
                      ))}
                      {showNewRef === activeComp.id && (
                        <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr 80px 32px', padding: '8px 14px', gap: 8, alignItems: 'center', borderTop: '1px solid #F0EDE6', background: '#F8F7F4' }}>
                          <input autoFocus value={newRef.reference} onChange={e => setNewRef(p => ({ ...p, reference: e.target.value }))}
                            placeholder="REF-001"
                            style={{ padding: '6px 8px', borderRadius: 6, border: '1px solid #E8E4DC', fontSize: 12, fontFamily: 'monospace' }} />
                          <input value={newRef.label} onChange={e => setNewRef(p => ({ ...p, label: e.target.value }))}
                            placeholder="Désignation..."
                            style={{ padding: '6px 8px', borderRadius: 6, border: '1px solid #E8E4DC', fontSize: 12 }} />
                          <input value={newRef.quantity} onChange={e => setNewRef(p => ({ ...p, quantity: e.target.value }))}
                            placeholder="0" type="number"
                            style={{ padding: '6px 8px', borderRadius: 6, border: '1px solid #E8E4DC', fontSize: 12 }} />
                          <button onClick={() => addRef(activeComp.id)}
                            style={{ padding: '6px 8px', borderRadius: 6, background: '#1C1B18', color: '#FFF', border: 'none', fontSize: 12, cursor: 'pointer' }}>✓</button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Filtres + tâches */}
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 12 }}>
                {['Tous', 'Achat', 'Marketing', 'Logistique', 'ESAT'].map(d => (
                  <button key={d} onClick={() => setFilterDept(d)} style={{
                    padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 500, cursor: 'pointer',
                    border: filterDept === d ? 'none' : '1px solid #E8E4DC',
                    background: filterDept === d ? '#1C1B18' : 'transparent',
                    color: filterDept === d ? '#F8F7F4' : '#666',
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

              {showNewTask && (
                <div style={{ background: '#FFF', border: '1px solid #E8E4DC', borderRadius: 10, padding: 12, marginBottom: 12, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                  <input value={newTask.label} onChange={e => setNewTask(p => ({ ...p, label: e.target.value }))}
                    placeholder="Nom de la tâche..."
                    style={{ flex: 2, padding: '7px 10px', borderRadius: 7, border: '1px solid #E8E4DC', fontSize: 13, minWidth: 130 }} />
                  <select value={newTask.dept} onChange={e => setNewTask(p => ({ ...p, dept: e.target.value }))}
                    style={{ padding: '7px 10px', borderRadius: 7, border: '1px solid #E8E4DC', fontSize: 13 }}>
                    {['Achat', 'Marketing', 'Logistique', 'ESAT'].map(d => <option key={d}>{d}</option>)}
                  </select>
                  <input value={newTask.deadline} onChange={e => setNewTask(p => ({ ...p, deadline: e.target.value }))} type="date"
                    style={{ padding: '7px 10px', borderRadius: 7, border: '1px solid #E8E4DC', fontSize: 13 }} />
                  <button onClick={() => addTask(activeComp?.id)} style={{ padding: '7px 14px', borderRadius: 7, background: '#1C1B18', color: '#FFF', border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Ajouter</button>
                  <button onClick={() => setShowNewTask(false)} style={{ padding: '7px', borderRadius: 7, border: '1px solid #E8E4DC', background: 'transparent', fontSize: 13, cursor: 'pointer', color: '#888' }}>✕</button>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '28px 1fr 110px 100px 120px 1fr 32px', padding: '6px 14px', fontSize: 10, color: '#AAA', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                <div/><div>Tâche</div><div>Département</div><div>Deadline</div><div>Statut</div><div>Note</div><div/>
              </div>

              {tasksToShow.length === 0 && (
                <div style={{ fontSize: 13, color: '#CCC', padding: '20px 14px' }}>
                  {activeComp ? 'Aucune tâche pour ce composant' : 'Aucune tâche générale'}
                </div>
              )}

              {tasksToShow.map((task, idx) => {
                const dc = DEPT_COLORS[task.department]
                const sc = STATUS_CONFIG[task.status]
                const canEdit = isAdmin || task.department === profile?.department
                return (
                  <div key={task.id} style={{
                    display: 'grid', gridTemplateColumns: '28px 1fr 110px 100px 120px 1fr 32px',
                    padding: '9px 14px', borderRadius: 7, alignItems: 'center',
                    background: idx % 2 === 0 ? '#FFF' : 'transparent', marginBottom: 2,
                  }}>
                    <div onClick={() => canEdit && updateTaskStatus(task.id, task.status === 'Fait' ? 'À faire' : 'Fait', activeComp?.id)}
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
                    <div><span style={{ fontSize: 11, fontWeight: 600, color: dc.text, background: dc.bg, padding: '2px 8px', borderRadius: 20 }}>{task.department}</span></div>
                    <div style={{ fontSize: 12, color: '#888' }}>
                      {task.deadline ? new Date(task.deadline).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : '—'}
                    </div>
                    <div>
                      {canEdit ? (
                        <select value={task.status} onChange={e => updateTaskStatus(task.id, e.target.value, activeComp?.id)}
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
                          onBlur={e => updateNote(task.id, e.target.value, activeComp?.id)}
                          onKeyDown={e => e.key === 'Enter' && updateNote(task.id, (e.target as HTMLInputElement).value, activeComp?.id)}
                          style={{ fontSize: 12, padding: '2px 8px', borderRadius: 5, border: '1px solid #E8E4DC', width: '100%' }} />
                      ) : (
                        <div onClick={() => canEdit && setEditingNote(task.id)}
                          style={{ fontSize: 12, color: task.note ? '#555' : '#CCC', cursor: canEdit ? 'text' : 'default', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                          {task.note || (canEdit ? 'Ajouter une note...' : '—')}
                        </div>
                      )}
                    </div>
                    <div>
                      {isAdmin && (
                        <span onClick={() => openEditTask(task)}
                          style={{ fontSize: 13, color: '#CCC', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✎</span>
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
ENDOFFILE

echo "✅ DashboardClient mis à jour !"
echo ""
echo "⚠️  N'oublie pas de passer le SQL dans Supabase d'abord !"
echo ""
echo "Ensuite lance :"
echo "  git add ."
echo "  git commit -m 'feat: composants + références produit par offre'"
echo "  git push"
