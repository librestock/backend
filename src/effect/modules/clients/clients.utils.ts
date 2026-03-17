import type { ClientResponseDto } from '@librestock/types/clients';
import type { Client } from './entities/client.entity';

export function toClientResponseDto(client: Client): ClientResponseDto {
  return {
    id: client.id,
    company_name: client.company_name,
    contact_person: client.contact_person,
    email: client.email,
    yacht_name: client.yacht_name,
    phone: client.phone,
    billing_address: client.billing_address,
    default_delivery_address: client.default_delivery_address,
    account_status: client.account_status,
    payment_terms: client.payment_terms,
    credit_limit: client.credit_limit,
    notes: client.notes,
    created_at: client.created_at,
    updated_at: client.updated_at,
  };
}
