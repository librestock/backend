import type { ClientStatus } from './client-status.enum'

export interface CreateClientDto {
  company_name: string
  contact_person: string
  email: string
  yacht_name?: string
  phone?: string
  billing_address?: string
  default_delivery_address?: string
  account_status?: ClientStatus
  payment_terms?: string
  credit_limit?: number
  notes?: string
}
