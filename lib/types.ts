export type ContactType = 'buyer' | 'seller' | 'both' | 'tenant' | 'landlord'
export type ContactSource = 'website' | 'referral' | 'portal' | 'cold' | 'other'
export type ActivityType = 'call' | 'email' | 'viewing' | 'meeting' | 'note'

export const CONTACT_TYPE_LABELS: Record<ContactType, string> = {
  buyer: 'Käufer',
  seller: 'Verkäufer',
  both: 'Käufer & Verkäufer',
  tenant: 'Mieter',
  landlord: 'Vermieter',
}

export const CONTACT_SOURCE_LABELS: Record<ContactSource, string> = {
  website: 'Website',
  referral: 'Empfehlung',
  portal: 'Portal',
  cold: 'Kaltakquise',
  other: 'Sonstige',
}

export const ACTIVITY_TYPE_LABELS: Record<ActivityType, string> = {
  call: 'Anruf',
  email: 'E-Mail',
  viewing: 'Besichtigung',
  meeting: 'Termin',
  note: 'Notiz',
}

export const CONTACT_TYPE_COLORS: Record<ContactType, string> = {
  buyer: 'var(--blu)',
  seller: 'var(--amb)',
  both: 'var(--pur)',
  tenant: 'var(--grn)',
  landlord: 'var(--accent)',
}

export const CONTACT_TYPE_BG: Record<ContactType, string> = {
  buyer: 'var(--blu-bg)',
  seller: 'var(--amb-bg)',
  both: 'var(--pur-bg)',
  tenant: 'var(--grn-bg)',
  landlord: 'rgba(194,105,42,0.1)',
}

export interface Contact {
  id: string
  created_at: string
  updated_at: string
  user_id: string
  type: ContactType
  first_name: string
  last_name: string
  email: string | null
  phone: string | null
  source: ContactSource
  notes: string | null
  is_archived: boolean
}

export interface Note {
  id: string
  created_at: string
  updated_at: string
  user_id: string
  contact_id: string | null
  property_id: string | null
  deal_id: string | null
  body: string
}

export interface Activity {
  id: string
  created_at: string
  updated_at: string
  user_id: string
  contact_id: string | null
  property_id: string | null
  deal_id: string | null
  type: ActivityType
  summary: string
  happened_at: string
  notes: string | null
}
