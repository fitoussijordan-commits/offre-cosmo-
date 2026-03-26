export type Department = 'Achat' | 'Marketing' | 'Logistique' | 'ESAT' | 'Admin'
export type TaskStatus = 'À faire' | 'En cours' | 'Fait' | 'Bloqué'
export type OffreStatus = 'En prépa' | 'En cours' | 'Terminée' | 'Annulée'

export interface Profile {
  id: string
  full_name: string
  department: Department
  email: string
  created_at: string
}

export interface Offre {
  id: string
  name: string
  color: string
  start_date: string
  end_date: string
  priority: 'Haute' | 'Basse'
  status: OffreStatus
  created_by: string
  created_at: string
  tasks?: Task[]
}

export interface Task {
  id: string
  offre_id: string
  label: string
  department: Department
  assigned_to: string | null
  status: TaskStatus
  deadline: string | null
  note: string
  is_custom: boolean
  order_index: number
  updated_at: string
  updated_by: string | null
  profiles?: Profile
  offres?: { name: string }
}

export interface TaskTemplate {
  id: string
  label: string
  department: Department
  delay_days: number
  order_index: number
}
