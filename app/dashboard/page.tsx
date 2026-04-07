import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import LogoutButton from './LogoutButton'

export default async function DashboardPage() {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // Organisation des Nutzers laden
  const { data: membership } = await supabase
    .from('organization_members')
    .select('role, organizations(name, plan, trial_ends_at)')
    .eq('user_id', user.id)
    .single()

  const org = membership?.organizations as unknown as {
    name: string
    plan: string
    trial_ends_at: string
  } | null

  const trialDaysLeft = org?.trial_ends_at
    ? Math.max(0, Math.ceil((new Date(org.trial_ends_at).getTime() - Date.now()) / 86400000))
    : null

  return (
    <div style={{
      minHeight: '100vh',
      background: '#F5F3EF',
      fontFamily: "var(--font-dm-sans, 'DM Sans'), sans-serif",
    }}>
      {/* Header */}
      <header style={{
        background: '#18120E',
        padding: '0 32px',
        height: 58,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 7,
            background: '#C2692A',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
              <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" fill="white" opacity="0.95"/>
              <polyline points="9 22 9 12 15 12 15 22" fill="white" opacity="0.55"/>
            </svg>
          </div>
          <span style={{
            fontFamily: "var(--font-playfair, 'Playfair Display'), serif",
            fontSize: 16, fontWeight: 500, color: '#F5EDE3',
          }}>Immo CRM</span>
        </div>
        <LogoutButton />
      </header>

      {/* Content */}
      <main style={{ padding: '40px 32px', maxWidth: 800, margin: '0 auto' }}>

        {/* Trial-Banner */}
        {org?.plan === 'trial' && trialDaysLeft !== null && (
          <div style={{
            background: 'rgba(194,105,42,0.08)',
            border: '1px solid rgba(194,105,42,0.2)',
            borderRadius: 10,
            padding: '12px 16px',
            marginBottom: 28,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: 13,
          }}>
            <span style={{ color: '#B45309', fontWeight: 500 }}>
              ⏳ Ihr Testzeitraum läuft noch {trialDaysLeft} {trialDaysLeft === 1 ? 'Tag' : 'Tage'}
            </span>
            <a href="#" style={{ color: '#C2692A', fontWeight: 600, textDecoration: 'none', fontSize: 12 }}>
              Jetzt upgraden →
            </a>
          </div>
        )}

        {/* Willkommen */}
        <h1 style={{
          fontFamily: "var(--font-playfair, 'Playfair Display'), serif",
          fontSize: 28, fontWeight: 400, color: '#1C1814',
          letterSpacing: '-0.4px', marginBottom: 8,
        }}>
          Willkommen{org?.name ? ` bei ${org.name}` : ''} 👋
        </h1>
        <p style={{ fontSize: 14, color: '#A8A49F', marginBottom: 36 }}>
          {user.email} · {membership?.role === 'owner' ? 'Inhaber' : 'Mitglied'}
        </p>

        {/* Karten */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
          {[
            { label: 'Kontakte', value: '—', sub: 'Noch keine Kontakte', icon: '👤' },
            { label: 'Objekte', value: '—', sub: 'Noch keine Objekte', icon: '🏠' },
            { label: 'Aktive Deals', value: '—', sub: 'Pipeline ist leer', icon: '📊' },
          ].map(card => (
            <div key={card.label} style={{
              background: '#fff',
              border: '1px solid rgba(0,0,0,0.07)',
              borderRadius: 13,
              padding: '18px 20px',
            }}>
              <div style={{ fontSize: 22, marginBottom: 8 }}>{card.icon}</div>
              <div style={{ fontSize: 11, fontWeight: 500, color: '#A8A49F', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
                {card.label}
              </div>
              <div style={{
                fontFamily: "var(--font-playfair, 'Playfair Display'), serif",
                fontSize: 28, color: '#1C1814', lineHeight: 1,
              }}>
                {card.value}
              </div>
              <div style={{ fontSize: 11.5, color: '#A8A49F', marginTop: 5 }}>{card.sub}</div>
            </div>
          ))}
        </div>

        {/* Nächste Schritte */}
        <div style={{
          marginTop: 28,
          background: '#fff',
          border: '1px solid rgba(0,0,0,0.07)',
          borderRadius: 13,
          padding: '20px 22px',
        }}>
          <h2 style={{
            fontFamily: "var(--font-playfair, 'Playfair Display'), serif",
            fontSize: 15, fontWeight: 400, color: '#1C1814',
            marginBottom: 14,
          }}>Erste Schritte</h2>
          {[
            { label: 'Ersten Kontakt anlegen', done: false },
            { label: 'Erstes Objekt erfassen', done: false },
            { label: 'Pipeline einrichten', done: false },
            { label: 'Team-Mitglieder einladen', done: false },
          ].map(item => (
            <div key={item.label} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '9px 0',
              borderBottom: '1px solid rgba(0,0,0,0.05)',
              fontSize: 13, color: '#1C1814',
            }}>
              <div style={{
                width: 18, height: 18, borderRadius: 5,
                border: '1.5px solid rgba(0,0,0,0.15)',
                background: item.done ? '#C2692A' : 'transparent',
                flexShrink: 0,
              }}/>
              {item.label}
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
