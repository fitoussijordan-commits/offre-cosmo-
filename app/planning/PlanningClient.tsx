'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Offre, Profile } from '@/lib/types'

const MONTHS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre']
const MONTHS_SHORT = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc']

const DEPT_COLORS: Record<string, { bg: string; text: string }> = {
  Achat:      { bg: '#FFF3E0', text: '#E65100' },
  Marketing:  { bg: '#F3E5F5', text: '#6A1B9A' },
  Logistique: { bg: '#E3F2FD', text: '#0D47A1' },
  ESAT:       { bg: '#E8F5E9', text: '#1B5E20' },
  Admin:      { bg: '#F5F5F5', text: '#333' },
}

const STATUS_CONFIG: Record<string, { color: string; bg: string }> = {
  'En prépa':  { color: '#94A3B8', bg: '#F1F5F9' },
  'En cours':  { color: '#F59E0B', bg: '#FFFBEB' },
  'Terminée':  { color: '#10B981', bg: '#ECFDF5' },
  'Annulée':   { color: '#EF4444', bg: '#FEF2F2' },
}

export default function PlanningClient({ profile, offres }: { profile: Profile, offres: Offre[] }) {
  const [selectedOffre, setSelectedOffre] = useState<Offre | null>(null)
  const [viewYear, setViewYear] = useState(2026)
  const router = useRouter()

  const today = new Date()
  const todayMonth = today.getMonth()
  const todayDay = today.getDate()
  const daysInMonth = (month: number) => new Date(viewYear, month + 1, 0).getDate()
  const totalDays = Array.from({ length: 12 }, (_, i) => daysInMonth(i)).reduce((a, b) => a + b, 0)

  const getDayOffset = (date: Date) => {
    let offset = 0
    for (let m = 0; m < date.getMonth(); m++) offset += daysInMonth(m)
    offset += date.getDate() - 1
    return offset
  }

  const getBarStyle = (offre: Offre) => {
    const start = new Date(offre.start_date)
    const end = new Date(offre.end_date)
    if (start.getFullYear() > viewYear || end.getFullYear() < viewYear) return null
    const startOffset = getDayOffset(start.getFullYear() < viewYear ? new Date(viewYear, 0, 1) : start)
    const endOffset = getDayOffset(end.getFullYear() > viewYear ? new Date(viewYear, 11, 31) : end)
    const left = (startOffset / totalDays) * 100
    const width = ((endOffset - startOffset + 1) / totalDays) * 100
    return { left: `${left}%`, width: `${width}%` }
  }

  const getTodayPosition = () => {
    if (today.getFullYear() !== viewYear) return null
    const offset = getDayOffset(today)
    return (offset / totalDays) * 100
  }

  const getProgress = (o: Offre) => {
    if (!o.tasks?.length) return 0
    return Math.round((o.tasks.filter(t => t.status === 'Fait').length / o.tasks.length) * 100)
  }

  const todayPos = getTodayPosition()

  // Grouper les offres par mois de début
  const offresParMois: Record<number, Offre[]> = {}
  offres.forEach(o => {
    const m = new Date(o.start_date).getMonth()
    if (!offresParMois[m]) offresParMois[m] = []
    offresParMois[m].push(o)
  })

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', background: '#F8F7F4', minHeight: '100vh', color: '#1C1B18' }}>

      {/* HEADER */}
      <div style={{ background: '#1C1B18', color: '#F8F7F4', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 52 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 26, height: 26, background: '#FFB347', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13 }}>✦</div>
            <span style={{ fontSize: 16, fontWeight: 700 }}>OffreCosmo</span>
          </div>
          <div style={{ width: 1, height: 20, background: '#333' }} />
          <button onClick={() => router.push('/dashboard')}
            style={{ fontSize: 13, color: '#888', background: 'none', border: 'none', cursor: 'pointer' }}>
            Dashboard
          </button>
          <span style={{ fontSize: 13, color: '#F8F7F4', borderBottom: '1px solid #FFB347', paddingBottom: 2 }}>Planning</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 12, color: '#AAA' }}>{profile?.full_name}</span>
          <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, background: DEPT_COLORS[profile?.department]?.bg, color: DEPT_COLORS[profile?.department]?.text, fontWeight: 600 }}>
            {profile?.department}
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', height: 'calc(100vh - 52px)', overflow: 'hidden' }}>

        {/* GANTT PANEL */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          {/* Année selector + légende */}
          <div style={{ padding: '14px 24px', borderBottom: '1px solid #E8E4DC', background: '#FFF', display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button onClick={() => setViewYear(y => y - 1)}
                style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid #E8E4DC', background: 'transparent', cursor: 'pointer', fontSize: 14 }}>‹</button>
              <span style={{ fontSize: 16, fontWeight: 700, minWidth: 50, textAlign: 'center' }}>{viewYear}</span>
              <button onClick={() => setViewYear(y => y + 1)}
                style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid #E8E4DC', background: 'transparent', cursor: 'pointer', fontSize: 14 }}>›</button>
            </div>
            <div style={{ width: 1, height: 20, background: '#E8E4DC' }} />
            <div style={{ display: 'flex', gap: 16, fontSize: 12, color: '#888' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 12, height: 12, borderRadius: 3, background: '#E8E4DC' }} />
                <span>{offres.length} offres</span>
              </div>
              {todayPos !== null && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 2, height: 12, background: '#EF4444', borderRadius: 1 }} />
                  <span>Aujourd'hui</span>
                </div>
              )}
            </div>
            <div style={{ flex: 1 }} />
            <div style={{ display: 'flex', gap: 8 }}>
              {Object.entries(STATUS_CONFIG).map(([s, c]) => (
                <span key={s} style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, background: c.bg, color: c.color, fontWeight: 500 }}>{s}</span>
              ))}
            </div>
          </div>

          {/* Gantt */}
          <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>

            {/* En-tête mois */}
            <div style={{ position: 'sticky', top: 0, zIndex: 10, background: '#FFF', borderBottom: '1px solid #E8E4DC', display: 'flex', marginLeft: 220 }}>
              {MONTHS_SHORT.map((m, i) => (
                <div key={i} style={{
                  flex: daysInMonth(i),
                  padding: '8px 0',
                  fontSize: 11,
                  fontWeight: i === todayMonth && viewYear === today.getFullYear() ? 700 : 500,
                  color: i === todayMonth && viewYear === today.getFullYear() ? '#1C1B18' : '#888',
                  textAlign: 'center',
                  borderRight: '1px solid #F0EDE6',
                  background: i === todayMonth && viewYear === today.getFullYear() ? '#FFFBEB' : 'transparent',
                }}>
                  {m}
                </div>
              ))}
            </div>

            {/* Lignes offres */}
            <div style={{ padding: '8px 0' }}>
              {offres.length === 0 && (
                <div style={{ padding: '40px', textAlign: 'center', color: '#AAA', fontSize: 14 }}>
                  Aucune offre pour {viewYear}
                </div>
              )}

              {offres.map((offre, idx) => {
                const barStyle = getBarStyle(offre)
                const progress = getProgress(offre)
                const sc = STATUS_CONFIG[offre.status] || STATUS_CONFIG['En prépa']
                const blocked = offre.tasks?.filter(t => t.status === 'Bloqué').length || 0
                const isSelected = selectedOffre?.id === offre.id

                return (
                  <div key={offre.id}
                    onClick={() => setSelectedOffre(isSelected ? null : offre)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      height: 52,
                      cursor: 'pointer',
                      background: isSelected ? '#F0EDE6' : idx % 2 === 0 ? '#FFF' : '#FAFAF8',
                      borderBottom: '1px solid #F0EDE6',
                      transition: 'background 0.1s',
                    }}>

                    {/* Nom offre */}
                    <div style={{ width: 220, flexShrink: 0, padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 3 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: offre.color, flexShrink: 0 }} />
                        <span style={{ fontSize: 12, fontWeight: 600, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                          {offre.name}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, paddingLeft: 14 }}>
                        <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 10, background: sc.bg, color: sc.color, fontWeight: 500 }}>
                          {offre.status}
                        </span>
                        {blocked > 0 && <span style={{ fontSize: 10, color: '#EF4444' }}>⚠ {blocked}</span>}
                      </div>
                    </div>

                    {/* Barre Gantt */}
                    <div style={{ flex: 1, position: 'relative', height: '100%', display: 'flex', alignItems: 'center' }}>

                      {/* Grille mois */}
                      <div style={{ position: 'absolute', inset: 0, display: 'flex', pointerEvents: 'none' }}>
                        {MONTHS_SHORT.map((_, i) => (
                          <div key={i} style={{
                            flex: daysInMonth(i),
                            height: '100%',
                            borderRight: '1px solid #F0EDE6',
                            background: i === todayMonth && viewYear === today.getFullYear() ? 'rgba(245,158,11,0.04)' : 'transparent',
                          }} />
                        ))}
                      </div>

                      {/* Ligne aujourd'hui */}
                      {todayPos !== null && (
                        <div style={{
                          position: 'absolute',
                          left: `${todayPos}%`,
                          top: 0, bottom: 0,
                          width: 2,
                          background: '#EF4444',
                          opacity: 0.4,
                          pointerEvents: 'none',
                          zIndex: 2,
                        }} />
                      )}

                      {/* Barre offre */}
                      {barStyle && (
                        <div style={{
                          position: 'absolute',
                          left: barStyle.left,
                          width: barStyle.width,
                          height: 28,
                          borderRadius: 6,
                          background: offre.color,
                          opacity: isSelected ? 1 : 0.85,
                          zIndex: 3,
                          display: 'flex',
                          alignItems: 'center',
                          overflow: 'hidden',
                          boxShadow: isSelected ? `0 2px 8px ${offre.color}66` : 'none',
                          transition: 'all 0.15s',
                        }}>
                          {/* Progress fill */}
                          <div style={{
                            position: 'absolute',
                            left: 0, top: 0, bottom: 0,
                            width: `${progress}%`,
                            background: 'rgba(0,0,0,0.15)',
                            borderRadius: '6px 0 0 6px',
                          }} />
                          <span style={{
                            position: 'relative',
                            fontSize: 11,
                            fontWeight: 600,
                            color: '#FFF',
                            padding: '0 10px',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            textShadow: '0 1px 2px rgba(0,0,0,0.2)',
                          }}>
                            {progress > 0 && `${progress}% · `}{offre.name}
                          </span>
                        </div>
                      )}

                      {/* Pas dans l'année */}
                      {!barStyle && (
                        <div style={{ position: 'absolute', right: 8, fontSize: 11, color: '#CCC' }}>
                          hors {viewYear}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* DETAIL PANEL */}
        {selectedOffre && (
          <div style={{ width: 300, borderLeft: '1px solid #E8E4DC', background: '#FFF', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #E8E4DC' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: selectedOffre.color }} />
                <span style={{ fontSize: 15, fontWeight: 700 }}>{selectedOffre.name}</span>
                <button onClick={() => setSelectedOffre(null)}
                  style={{ marginLeft: 'auto', background: 'none', border: 'none', fontSize: 16, color: '#AAA', cursor: 'pointer' }}>✕</button>
              </div>
              <div style={{ fontSize: 12, color: '#888', marginBottom: 10 }}>
                {new Date(selectedOffre.start_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                {' → '}
                {new Date(selectedOffre.end_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
              </div>
              <div style={{ background: '#F0EDE6', borderRadius: 4, height: 5, marginBottom: 6 }}>
                <div style={{ width: `${getProgress(selectedOffre)}%`, height: '100%', background: selectedOffre.color, borderRadius: 4 }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#888' }}>
                <span>{selectedOffre.tasks?.filter(t => t.status === 'Fait').length || 0}/{selectedOffre.tasks?.length || 0} tâches</span>
                <span style={{ fontWeight: 600, color: '#1C1B18' }}>{getProgress(selectedOffre)}%</span>
              </div>
            </div>

            {/* Stats par dept */}
            <div style={{ padding: '12px 20px', borderBottom: '1px solid #E8E4DC' }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: '#AAA', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Par département</div>
              {(['Achat', 'Marketing', 'Logistique', 'ESAT'] as const).map(dept => {
                const dt = selectedOffre.tasks?.filter(t => t.department === dept) || []
                if (!dt.length) return null
                const done = dt.filter(t => t.status === 'Fait').length
                const blocked = dt.filter(t => t.status === 'Bloqué').length
                const pct = Math.round((done / dt.length) * 100)
                const dc = DEPT_COLORS[dept]
                return (
                  <div key={dept} style={{ marginBottom: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: dc.text, background: dc.bg, padding: '2px 8px', borderRadius: 20 }}>{dept}</span>
                      <div style={{ display: 'flex', gap: 8, fontSize: 11, color: '#888' }}>
                        {blocked > 0 && <span style={{ color: '#EF4444' }}>⚠ {blocked}</span>}
                        <span>{done}/{dt.length}</span>
                      </div>
                    </div>
                    <div style={{ background: '#F0EDE6', borderRadius: 3, height: 4 }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: dc.text, borderRadius: 3, opacity: 0.6 }} />
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Tâches bloquées */}
            {selectedOffre.tasks?.some(t => t.status === 'Bloqué') && (
              <div style={{ padding: '12px 20px', borderBottom: '1px solid #E8E4DC' }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: '#EF4444', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>⚠ Bloquées</div>
                {selectedOffre.tasks?.filter(t => t.status === 'Bloqué').map(t => (
                  <div key={t.id} style={{ fontSize: 12, color: '#555', padding: '4px 0', borderBottom: '1px solid #F8F7F4', display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 10, background: DEPT_COLORS[t.department]?.bg, color: DEPT_COLORS[t.department]?.text, fontWeight: 600, whiteSpace: 'nowrap' }}>
                      {t.department}
                    </span>
                    {t.label}
                  </div>
                ))}
              </div>
            )}

            {/* Deadlines à venir */}
            <div style={{ padding: '12px 20px', flex: 1, overflowY: 'auto' }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: '#AAA', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Prochaines deadlines</div>
              {selectedOffre.tasks
                ?.filter(t => t.deadline && t.status !== 'Fait')
                .sort((a, b) => new Date(a.deadline!).getTime() - new Date(b.deadline!).getTime())
                .slice(0, 8)
                .map(t => {
                  const dl = new Date(t.deadline!)
                  const daysLeft = Math.ceil((dl.getTime() - Date.now()) / 86400000)
                  const isLate = daysLeft < 0
                  const isSoon = daysLeft >= 0 && daysLeft <= 3
                  return (
                    <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: '1px solid #F8F7F4' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 12, color: '#1C1B18', marginBottom: 2 }}>{t.label}</div>
                        <div style={{ fontSize: 10, color: '#888' }}>
                          {dl.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                        </div>
                      </div>
                      <span style={{
                        fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 10,
                        background: isLate ? '#FEF2F2' : isSoon ? '#FFFBEB' : '#F1F5F9',
                        color: isLate ? '#EF4444' : isSoon ? '#F59E0B' : '#94A3B8',
                        whiteSpace: 'nowrap',
                      }}>
                        {isLate ? `J+${Math.abs(daysLeft)}` : daysLeft === 0 ? "Auj." : `J-${daysLeft}`}
                      </span>
                    </div>
                  )
                })}
              {!selectedOffre.tasks?.some(t => t.deadline && t.status !== 'Fait') && (
                <div style={{ fontSize: 12, color: '#CCC' }}>Aucune deadline</div>
              )}
            </div>

            <div style={{ padding: '12px 20px', borderTop: '1px solid #E8E4DC' }}>
              <button onClick={() => router.push('/dashboard')}
                style={{ width: '100%', padding: '9px', borderRadius: 8, background: '#1C1B18', color: '#FFF', border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                Voir les tâches →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
