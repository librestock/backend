import { type LinkDefinition } from '../../common/hateoas/hateoas-link.dto';
import { HateoasLinks } from '../../common/hateoas/hateoas.decorator';

export const INVENTORY_HATEOAS_LINKS: LinkDefinition[] = [
  { rel: 'self', href: (data: any) => `/inventory/${data.id}`, method: 'GET' },
  {
    rel: 'update',
    href: (data: any) => `/inventory/${data.id}`,
    method: 'PUT',
  },
  {
    rel: 'adjust',
    href: (data: any) => `/inventory/${data.id}/adjust`,
    method: 'PATCH',
  },
  {
    rel: 'delete',
    href: (data: any) => `/inventory/${data.id}`,
    method: 'DELETE',
  },
  {
    rel: 'product',
    href: (data: any) => `/products/${data.product_id}`,
    method: 'GET',
  },
  {
    rel: 'location',
    href: (data: any) => `/locations/${data.location_id}`,
    method: 'GET',
  },
];

export const DELETE_INVENTORY_HATEOAS_LINKS: LinkDefinition[] = [
  { rel: 'list', href: '/inventory', method: 'GET' },
];

export const InventoryHateoas = () => HateoasLinks(...INVENTORY_HATEOAS_LINKS);
export const DeleteInventoryHateoas = () =>
  HateoasLinks(...DELETE_INVENTORY_HATEOAS_LINKS);
