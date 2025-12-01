export interface Lead {
  id: string
  lead_type: "instant_quote" | "custom_quote"
  status: "new" | "contacted" | "quoted" | "won" | "lost"
  contact_name: string | null
  company_name: string | null
  email: string
  phone: string | null
  move_type: string | null
  origin_suburb: string | null
  destination_suburb: string | null
  distance_km: number | null
  square_meters: number | null
  estimated_total: number | null
  deposit_amount: number | null
  deposit_paid: boolean | null
  payment_status: string | null
  scheduled_date: string | null
  notes: string | null
  additional_services: string[] | null
  industry_type: string | null
  employee_count: string | null
  current_location: string | null
  new_location: string | null
  target_move_date: string | null
  special_requirements: string[] | null
  project_description: string | null
  preferred_contact_time: string | null
  internal_notes: string | null
  created_at: string
  updated_at: string
}

export interface LeadInsert {
  lead_type?: "instant_quote" | "custom_quote"
  email: string
  contact_name?: string
  company_name?: string
  phone?: string
  move_type?: string
  origin_suburb?: string
  destination_suburb?: string
  distance_km?: number
  square_meters?: number
  estimated_total?: number
  deposit_amount?: number
  deposit_paid?: boolean
  payment_status?: string
  scheduled_date?: string
  notes?: string
  additional_services?: string[]
  industry_type?: string
  employee_count?: string
  current_location?: string
  new_location?: string
  target_move_date?: string
  special_requirements?: string[]
  project_description?: string
  preferred_contact_time?: string
}
