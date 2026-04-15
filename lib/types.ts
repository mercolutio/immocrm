export type ContactType = 'buyer' | 'seller' | 'both' | 'tenant' | 'landlord'
export type ContactSource = 'website' | 'referral' | 'portal' | 'cold' | 'other'
export type ActivityType = 'call' | 'email' | 'viewing' | 'meeting' | 'note'
export type PropertyType = 'apartment' | 'house' | 'land' | 'commercial'
export type PropertyStatus = 'available' | 'reserved' | 'sold' | 'rented'
export type SearchType = 'buy' | 'rent'
export type TaskPriority = 'low' | 'medium' | 'high'
export type TaskStatus = 'planned' | 'in_progress' | 'on_hold' | 'done'
export type TaskRecurrence = 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly'
export type OrganizationRole = 'owner' | 'admin' | 'member'

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
  available: { fg: 'var(--badge-green)',  bg: 'var(--badge-green-bg)'  },
  reserved:  { fg: 'var(--badge-orange)', bg: 'var(--badge-orange-bg)' },
  sold:      { fg: 'var(--badge-gray)',   bg: 'var(--badge-gray-bg)'   },
  rented:    { fg: 'var(--badge-gray)',   bg: 'var(--badge-gray-bg)'   },
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

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: 'Niedrig',
  medium: 'Mittel',
  high: 'Hoch',
}

export const TASK_PRIORITY_COLORS: Record<TaskPriority, { fg: string; bg: string }> = {
  low:    { fg: 'var(--badge-gray)',   bg: 'var(--badge-gray-bg)'   },
  medium: { fg: 'var(--badge-blue)',   bg: 'var(--badge-blue-bg)'   },
  high:   { fg: 'var(--badge-orange)', bg: 'var(--badge-orange-bg)' },
}

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  planned: 'Geplant',
  in_progress: 'In Arbeit',
  on_hold: 'Wartet',
  done: 'Erledigt',
}

export const TASK_STATUS_COLORS: Record<TaskStatus, { fg: string; bg: string }> = {
  planned:     { fg: 'var(--badge-gray)',   bg: 'var(--badge-gray-bg)'   },
  in_progress: { fg: 'var(--badge-blue)',   bg: 'var(--badge-blue-bg)'   },
  on_hold:     { fg: 'var(--badge-orange)', bg: 'var(--badge-orange-bg)' },
  done:        { fg: 'var(--badge-green)',  bg: 'var(--badge-green-bg)'  },
}

export const TASK_RECURRENCE_LABELS: Record<TaskRecurrence, string> = {
  none: 'Keine',
  daily: 'Täglich',
  weekly: 'Wöchentlich',
  monthly: 'Monatlich',
  yearly: 'Jährlich',
}

export const ORGANIZATION_ROLE_LABELS: Record<OrganizationRole, string> = {
  owner: 'Inhaber',
  admin: 'Admin',
  member: 'Mitglied',
}

export function isTaskDone(t: { status: TaskStatus }): boolean {
  return t.status === 'done'
}

export const CALL_RESULT_LABELS: Record<string, string> = {
  reached: 'Erreicht',
  not_reached: 'Nicht erreicht',
  callback: 'Rückruf vereinbart',
}

export const SEARCH_TYPE_LABELS: Record<SearchType, string> = {
  buy: 'Kaufen',
  rent: 'Mieten',
}

export const ENERGY_CERTIFICATE_TYPE_LABELS: Record<string, string> = {
  demand: 'Bedarfsausweis',
  consumption: 'Verbrauchsausweis',
}

export const ENERGY_EFFICIENCY_CLASS_LABELS: Record<string, string> = {
  'A+': 'A+', A: 'A', B: 'B', C: 'C', D: 'D', E: 'E', F: 'F', G: 'G', H: 'H',
}

export const HEATING_TYPE_LABELS: Record<string, string> = {
  gas: 'Gas', oil: 'Öl', heat_pump: 'Wärmepumpe', district: 'Fernwärme',
  pellets: 'Pellets', solar: 'Solar', electric: 'Strom', other: 'Sonstige',
}

export const PARKING_LABELS: Record<string, string> = {
  yes: 'Ja', no: 'Nein', garage: 'Garage',
}

export const BOOLEAN_YES_NO_LABELS: Record<string, string> = {
  true: 'Ja', false: 'Nein',
}

export const OUTDOOR_SPACE_LABELS: Record<string, string> = {
  none: 'Keiner', balcony: 'Balkon', terrace: 'Terrasse', both: 'Beides',
}

export function labelsToOptions<T extends string>(
  labels: Record<T, string>
): { value: T; label: string }[] {
  return Object.entries(labels).map(([value, label]) => ({
    value: value as T,
    label: label as string,
  }));
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
  organization_id: string
  contact_id: string | null
  property_id: string | null
  deal_id: string | null
  assigned_to: string | null
  parent_task_id: string | null
  title: string
  description: string | null
  due_date: string | null
  status: TaskStatus
  priority: TaskPriority
  recurrence: TaskRecurrence
  recurrence_end: string | null
}

export interface Organization {
  id: string
  created_at: string
  name: string
  slug: string
  plan: string
  trial_ends_at: string | null
  stripe_customer_id: string | null
}

export interface OrganizationMember {
  id: string
  created_at: string
  organization_id: string
  user_id: string
  role: OrganizationRole
}

export interface TaskChecklistItem {
  id: string
  created_at: string
  task_id: string
  label: string
  is_done: boolean
  position: number
}

export interface TaskComment {
  id: string
  created_at: string
  updated_at: string
  task_id: string
  user_id: string
  content: string
}

export interface TaskAttachment {
  id: string
  created_at: string
  task_id: string
  user_id: string | null
  storage_path: string
  file_name: string
  mime_type: string | null
  size_bytes: number | null
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
  energy_certificate_type: string | null
  energy_efficiency_class: string | null
  energy_consumption: number | null
  heating_type: string | null
  construction_year: number | null
  primary_energy_source: string | null
  floor_number: number | null
  total_floors: number | null
  parking: string | null
  basement: boolean | null
  elevator: boolean | null
  outdoor_space: string | null
  plot_area: number | null
}

export interface PropertyImage {
  id: string
  created_at: string
  property_id: string
  user_id: string
  storage_path: string
  file_name: string
  position: number
  is_cover: boolean
  thumb_path: string | null
}

export interface PipelineStage {
  id: string
  created_at: string
  user_id: string
  name: string
  color: string
  position: number
  is_default: boolean
}

export interface Deal {
  id: string
  created_at: string
  updated_at: string
  user_id: string
  contact_id: string | null
  property_id: string | null
  stage_id: string | null
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
