import { type LinkDefinition } from '../../common/hateoas/hateoas-link.dto';
import { HateoasLinks } from '../../common/hateoas/hateoas.decorator';

export const ORDER_HATEOAS_LINKS: LinkDefinition[] = [
  { rel: 'self', href: (data: any) => `/orders/${data.id}`, method: 'GET' },
  {
    rel: 'update',
    href: (data: any) => `/orders/${data.id}`,
    method: 'PUT',
  },
  {
    rel: 'updateStatus',
    href: (data: any) => `/orders/${data.id}/status`,
    method: 'PATCH',
  },
  {
    rel: 'delete',
    href: (data: any) => `/orders/${data.id}`,
    method: 'DELETE',
  },
  {
    rel: 'client',
    href: (data: any) => `/clients/${data.client_id}`,
    method: 'GET',
  },
];

export const DELETE_ORDER_HATEOAS_LINKS: LinkDefinition[] = [
  { rel: 'list', href: '/orders', method: 'GET' },
];

export const OrderHateoas = () => HateoasLinks(...ORDER_HATEOAS_LINKS);
export const DeleteOrderHateoas = () =>
  HateoasLinks(...DELETE_ORDER_HATEOAS_LINKS);
