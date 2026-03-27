'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Offre, Profile } from '@/lib/types'

const MONTHS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre']
const MONTHS_SHORT = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc']

const DEPT_COLORS: Record<string, { bg: string; text: string }> = {
  Achat:      { bg: '#FFF7ED', text: '#C2410C' },
  Marketing:  { bg: '#FAF5FF', text: '#7E22CE' },
  Logistique: { bg: '#EFF6FF', text: '#1D4ED8' },
  ESAT:       { bg: '#F0FDF4', text: '#15803D' },
  Admin:      { bg: '#F4F4F5', text: '#3F3F46' },
}

const STATUS_CONFIG: Record<string, { color: string; bg: string }> = {
  'En prépa':  { color: '#71717A', bg: '#F4F4F5' },
  'En cours':  { color: '#D97706', bg: '#FFFBEB' },
  'Terminée':  { color: '#059669', bg: '#ECFDF5' },
  'Annulée':   { color: '#DC2626', bg: '#FEF2F2' },
}

export default function PlanningClient({ profile, offres }: { profile: Profile, offres: Offre[] }) {
  const [selectedOffre, setSelectedOffre] = useState<Offre | null>(null)
  const [viewYear, setViewYear] = useState(new Date().getFullYear())
  const router = useRouter()

  const today = new Date()
  const todayMonth = today.getMonth()
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

  return (
    <div style={{ fontFamily: 'var(--font-sans, system-ui, sans-serif)', background: '#F5F3EF', minHeight: '100vh', color: '#18181B' }}>

      {/* HEADER */}
      <div style={{ background: '#18181B', color: '#F5F3EF', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 52 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 28, height: 28, background: '#D97706', borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: '#FFF' }}>&#10022;</div>
            <span style={{ fontSize: 15, fontWeight: 700 }}>OffreCosmo</span>
          </div>
          <div style={{ width: 1, height: 20, background: '#3F3F46' }} />
          <button onClick={() => router.push('/dashboard')}
            style={{ fontSize: 13, color: '#A1A1AA', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500 }}>
            Dashboard
          </button>
          <span style={{ fontSize: 13, color: '#F5F3EF', borderBottom: '1px solid #D97706', paddingBottom: 2, fontWeight: 500 }}>Planning</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 13, color: '#A1A1AA' }}>{profile?.full_name}</span>
          <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 6, background: DEPT_COLORS[profile?.department]?.bg, color: DEPT_COLORS[profile?.department]?.text, fontWeight: 600 }}>
            {profile?.department}
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', height: 'calc(100vh - 52px)', overflow: 'hidden' }}>

        {/* GANTT PANEL */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          {/* Année selector + légende */}
          <div style={{ padding: '12px 24px', borderBottom: '1px solid #E5E2DB', background: '#FFF', display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <button onClick={() => setViewYear(y => y - 1)}
                style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid #E5E2DB', background: 'transparent', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>&lsaquo;</button>
              <span style={{ fontSize: 15, fontWeight: 700, minWidth: 48, textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}>{viewYear}</span>
              <button onClick={() => setViewYear(y => y + 1)}
                style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid #E5E2DB', background: 'transparent', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>&rsaquo;</button>
            </div>
            <div style={{ width: 1, height: 18, background: '#E5E2DB' }} />
            <div style={{ display: 'flex', gap: 14, fontSize: 12, color: '#71717A' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <div style={{ width: 10, height: 10, borderRadius: 3, background: '#E5E2DB' }} />
                <span>{offres.length} offres</span>
              </div>
              {todayPos !== null && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <div style={{ width: 2, height: 10, background: '#DC2626', borderRadius: 1 }} />
                  <span>Aujourd&apos;hui</span>
                </div>
              )}
            </div>
            <div style={{ flex: 1 }} />
            <div style={{ display: 'flex', gap: 6 }}>
              {Object.entries(STATUS_CONFIG).map(([s, c]) => (
                <span key={s} style={{ fontSize: 11, padding: '2px 8px', borderRadius: 5, background: c.bg, color: c.color, fontWeight: 500 }}>{s}</span>
              ))}
            </div>
          </div>

          {/* Gantt */}
          <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>

            {/* En-tête mois */}
            <div style={{ position: 'sticky', top: 0, zIndex: 10, background: '#FFF', borderBottom: '1px solid #E5E2DB', display: 'flex', marginLeft: 210 }}>
              {MONTHS_SHORT.map((m, i) => (
                <div key={i} style={{
                  flex: daysInMonth(i),
                  padding: '7px 0',
                  fontSize: 11,
                  fontWeight: i === todayMonth && viewYear === today.getFullYear() ? 700 : 500,
                  color: i === todayMonth && viewYear === today.getFullYear() ? '#18181B' : '#A1A1AA',
                  textAlign: 'center',
                  borderRight: '1px solid #EEEBE5',
                  background: i === todayMonth && viewYear === today.getFullYear() ? '#FFFBEB' : 'transparent',
                }}>
                  {m}
                </div>
              ))}
            </div>

            {/* Lignes offres */}
            <div style={{ padding: '4px 0' }}>
              {offres.length === 0 && (
                <div style={{ padding: '40px', textAlign: 'center', color: '#A1A1AA', fontSize: 14 }}>
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
                    className="row-hover"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      height: 48,
                      cursor: 'pointer',
                      background: isSelected ? '#F4F4F5' : idx % 2 === 0 ? '#FFF' : '#FAFAF8',
                      borderBottom: '1px solid #EEEBE5',
                    }}>

                    {/* Nom offre */}
                    <div style={{ width: 210, flexShrink: 0, padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ width: 7, height: 7, borderRadius: '50%', background: offre.color, flexShrink: 0 }} />
                        <span style={{ fontSize: 12, fontWeight: 600, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                          {offre.name}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, paddingLeft: 13 }}>
                        <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 4, background: sc.bg, color: sc.color, fontWeight: 500 }}>
                          {offre.status}
                        </span>
                        {blocked > 0 && <span style={{ fontSize: 10, color: '#DC2626' }}>&#9888; {blocked}</span>}
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
                            borderRight: '1px solid #EEEBE5',
                            background: i === todayMonth && viewYear === today.getFullYear() ? 'rgba(217,119,6,0.03)' : 'transparent',
                          }} />
                        ))}
                      </div>

                      {/* Ligne aujourd'hui */}
                      {todayPos !== null && (
                        <div style={{
                          position: 'absolute',
                          left: `${todayPos}%`,
                          top: 0, bottom: 0,
                          width: 1.5,
                          background: '#DC2626',
                          opacity: 0.35,
                          pointerEvents: 'none',
                          zIndex: 2,
                        }} />
                      )}

                      {/* Barre offre */}
                      {barStyle && (
                        <div className="gantt-bar" style={{
                          position: 'absolute',
                          left: barStyle.left,
                          width: barStyle.width,
                          height: 24,
                          borderRadius: 5,
                          background: offre.color,
                          opacity: isSelected ? 1 : 0.85,
                          zIndex: 3,
                          display: 'flex',
                          alignItems: 'center',
                          overflow: 'hidden',
                          boxShadow: isSelected ? `0 2px 8px ${offre.color}44` : 'none',
                        }}>
                          {/* Progress fill */}
                          <div style={{
                            position: 'absolute',
                            left: 0, top: 0, bottom: 0,
                            width: `${progress}%`,
                            background: 'rgba(0,0,0,0.15)',
                            borderRadius: '5px 0 0 5px',
                          }} />
                          <span style={{
                            position: 'relative',
                            fontSize: 10,
                            fontWeight: 600,
                            color: '#FFF',
                            padding: '0 8px',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            textShadow: '0 1px 2px rgba(0,0,0,0.2)',
                          }}>
                            {progress > 0 && `${progress}% \u00B7 `}{offre.name}
                          </span>
                        </div>
                      )}

                      {!barStyle && (
                        <div style={{ position: 'absolute', right: 8, fontSize: 11, color: '#D1CEC7' }}>
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
          <div style={{ width: 290, borderLeft: '1px solid #E5E2DB', background: '#FFF', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid #E5E2DB' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: selectedOffre.color }} />
                <span style={{ fontSize: 14, fontWeight: 700, flex: 1, letterSpacing: '-0.01em' }}>{selectedOffre.name}</span>
                <button onClick={() => setSelectedOffre(null)}
                  style={{ background: 'none', border: 'none', fontSize: 14, color: '#A1A1AA', cursor: 'pointer' }}>&#10005;</button>
              </div>
              <div style={{ fontSize: 12, color: '#71717A', marginBottom: 10 }}>
                {new Date(selectedOffre.start_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                {' \u2192 '}
                {new Date(selectedOffre.end_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
              </div>
              <div style={{ background: '#F4F4F5', borderRadius: 4, height: 4, marginBottom: 6 }}>
                <div className="progress-bar" style={{ width: `${getProgress(selectedOffre)}%`, height: '100%', background: selectedOffre.color, borderRadius: 4 }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#71717A' }}>
                <span>{selectedOffre.tasks?.filter(t => t.status === 'Fait').length || 0}/{selectedOffre.tasks?.length || 0} tâches</span>
                <span style={{ fontWeight: 700, color: '#18181B', fontVariantNumeric: 'tabular-nums' }}>{getProgress(selectedOffre)}%</span>
              </div>
            </div>

            {/* Stats par dept */}
            <div style={{ padding: '12px 18px', borderBottom: '1px solid #E5E2DB' }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#A1A1AA', marginBottom: 10 }}>Par département</div>
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
                      <span style={{ fontSize: 11, fontWeight: 600, color: dc.text, background: dc.bg, padding: '2px 8px', borderRadius: 5 }}>{dept}</span>
                      <div style={{ display: 'flex', gap: 6, fontSize: 11, color: '#71717A' }}>
                        {blocked > 0 && <span style={{ color: '#DC2626' }}>&#9888; {blocked}</span>}
                        <span style={{ fontVariantNumeric: 'tabular-nums' }}>{done}/{dt.length}</span>
                      </div>
                    </div>
                    <div style={{ background: '#F4F4F5', borderRadius: 3, height: 3 }}>
                      <div className="progress-bar" style={{ width: `${pct}%`, height: '100%', background: dc.text, borderRadius: 3, opacity: 0.5 }} />
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Tâches bloquées */}
            {selectedOffre.tasks?.some(t => t.status === 'Bloqué') && (
              <div style={{ padding: '12px 18px', borderBottom: '1px solid #E5E2DB' }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#DC2626', marginBottom: 8 }}>&#9888; Bloquées</div>
                {selectedOffre.tasks?.filter(t => t.status === 'Bloqué').map(t => (
                  <div key={t.id} style={{ fontSize: 12, color: '#3F3F46', padding: '4px 0', borderBottom: '1px solid #F4F4F5', display: 'flex', gap: 6, alignItems: 'center' }}>
                    <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 4, background: DEPT_COLORS[t.department]?.bg, color: DEPT_COLORS[t.department]?.text, fontWeight: 600, whiteSpace: 'nowrap' }}>
                      {t.department}
                    </span>
                    {t.label}
                  </div>
                ))}
              </div>
            )}

            {/* Deadlines à venir */}
            <div style={{ padding: '12px 18px', flex: 1, overflowY: 'auto' }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#A1A1AA', marginBottom: 8 }}>Prochaines deadlines</div>
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
                    <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', borderBottom: '1px solid #F4F4F5' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 12, color: '#18181B', marginBottom: 1 }}>{t.label}</div>
                        <div style={{ fontSize: 10, color: '#A1A1AA' }}>
                          {dl.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                        </div>
                      </div>
                      <span style={{
                        fontSize: 10, fontWeight: 600, padding: '2px 6px', borderRadius: 4,
                        background: isLate ? '#FEF2F2' : isSoon ? '#FFFBEB' : '#F4F4F5',
                        color: isLate ? '#DC2626' : isSoon ? '#D97706' : '#71717A',
                        whiteSpace: 'nowrap',
                        fontVariantNumeric: 'tabular-nums',
                      }}>
                        {isLate ? `J+${Math.abs(daysLeft)}` : daysLeft === 0 ? "Auj." : `J-${daysLeft}`}
                      </span>
                    </div>
                  )
                })}
              {!selectedOffre.tasks?.some(t => t.deadline && t.status !== 'Fait') && (
                <div style={{ fontSize: 12, color: '#D1CEC7' }}>Aucune deadline</div>
              )}
            </div>

            <div style={{ padding: '12px 18px', borderTop: '1px solid #E5E2DB' }}>
              <button onClick={() => router.push('/dashboard')}
                className="btn-primary"
                style={{ width: '100%', padding: '9px', borderRadius: 8, fontSize: 13 }}>
                Voir les tâches &rarr;
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
