import { Effect } from 'effect';
import type { ClientResponseDto } from './dto';
import type { Client } from './entities/client.entity';
import { ClientsInfrastructureError } from './clients.errors';

export const clientTryAsync = <A>(action: string, run: () => Promise<A>) =>
  Effect.tryPromise({
    try: run,
    catch: (cause) =>
      new ClientsInfrastructureError({
        action,
        cause,
        message: `Clients service failed to ${action}`,
      }),
  });

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
