export type ContactType = 'buyer' | 'seller' | 'both' | 'tenant' | 'landlord'
export type ContactSource = 'website' | 'referral' | 'portal' | 'cold' | 'other'
export type ActivityType = 'call' | 'email' | 'viewing' | 'meeting' | 'note'
export type PropertyType = 'apartment' | 'house' | 'land' | 'commercial'
export type PropertyStatus = 'available' | 'reserved' | 'sold' | 'rented'
export type SearchType = 'buy' | 'rent'
export type TaskPriority = 'low' | 'medium' | 'high'
export type DealStage = 'lead' | 'contact_made' | 'viewing' | 'offer' | 'notary' | 'closed' | 'lost'

export const PROPERTY_TYPE_LABELS: Record<PropertyType, string> = {
  apartment: 'Wohnung',
  house: 'Haus',
  land: 'Grundstück',
  commercial: 'Gewerbe',
}

export const PROPERTY_STATUS_LABELS: Record<PropertyStatus, string> = {
  available: 'Verfügbar',
  reserved: 'Reserviert',
  sold: 'Verkauft',
  rented: 'Vermietet',
}

export const PROPERTY_TYPE_COLORS: Record<PropertyType, string> = {
  apartment: 'var(--blu)',
  house: 'var(--accent)',
  land: 'var(--grn)',
  commercial: 'var(--pur)',
}

export const PROPERTY_TYPE_BG: Record<PropertyType, string> = {
  apartment: 'var(--blu-bg)',
  house: 'rgba(194,105,42,0.1)',
  land: 'var(--grn-bg)',
  commercial: 'var(--pur-bg)',
}

export const PROPERTY_STATUS_COLORS: Record<PropertyStatus, { fg: string; bg: string }> = {
  available: { fg: 'var(--grn)', bg: 'var(--grn-bg)' },
  reserved:  { fg: 'var(--amb)', bg: 'var(--amb-bg)' },
  sold:      { fg: 'var(--t3)',  bg: 'var(--bg2)'   },
  rented:    { fg: 'var(--t3)',  bg: 'var(--bg2)'   },
}

export const LISTING_TYPE_LABELS: Record<SearchType, string> = {
  buy: 'Kauf',
  rent: 'Miete',
}

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

export interface SearchProfile {
  id: string
  created_at: string
  updated_at: string
  contact_id: string
  type: SearchType
  property_type: PropertyType
  min_area: number | null
  max_area: number | null
  min_rooms: number | null
  max_rooms: number | null
  max_price: number | null
  cities: string[] | null
  notes: string | null
}

export interface Task {
  id: string
  created_at: string
  updated_at: string
  user_id: string
  contact_id: string | null
  property_id: string | null
  deal_id: string | null
  title: string
  description: string | null
  due_date: string | null
  is_done: boolean
  priority: TaskPriority
}

export interface Property {
  id: string
  created_at: string
  updated_at: string
  user_id: string
  type: PropertyType
  listing_type: SearchType
  title: string
  description: string | null
  street: string | null
  house_number: string | null
  zip: string | null
  city: string | null
  price: number | null
  rent: number | null
  area_sqm: number | null
  rooms: number | null
  status: PropertyStatus
  owner_contact_id: string | null
  is_archived: boolean
}

export interface Deal {
  id: string
  created_at: string
  updated_at: string
  user_id: string
  contact_id: string | null
  property_id: string | null
  stage: DealStage
  probability: number | null
  commission: number | null
  expected_close_date: string | null
  notes: string | null
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
