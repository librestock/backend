import { type LinkDefinition } from '../../common/hateoas/hateoas-link.dto';
import { HateoasLinks } from '../../common/hateoas/hateoas.decorator';

export const SUPPLIER_HATEOAS_LINKS: LinkDefinition[] = [
  { rel: 'self', href: (data: any) => `/suppliers/${data.id}`, method: 'GET' },
  {
    rel: 'update',
    href: (data: any) => `/suppliers/${data.id}`,
    method: 'PUT',
  },
  {
    rel: 'delete',
    href: (data: any) => `/suppliers/${data.id}`,
    method: 'DELETE',
  },
];

export const DELETE_SUPPLIER_HATEOAS_LINKS: LinkDefinition[] = [
  { rel: 'list', href: '/suppliers', method: 'GET' },
];

export const SupplierHateoas = () => HateoasLinks(...SUPPLIER_HATEOAS_LINKS);
export const DeleteSupplierHateoas = () =>
  HateoasLinks(...DELETE_SUPPLIER_HATEOAS_LINKS);
