import { type LinkDefinition } from '../../common/hateoas/hateoas-link.dto';
import { HateoasLinks } from '../../common/hateoas/hateoas.decorator';

export const PRODUCT_HATEOAS_LINKS: LinkDefinition[] = [
  { rel: 'self', href: (data: any) => `/products/${data.id}`, method: 'GET' },
  { rel: 'update', href: (data: any) => `/products/${data.id}`, method: 'PUT' },
  {
    rel: 'delete',
    href: (data: any) => `/products/${data.id}`,
    method: 'DELETE',
  },
  {
    rel: 'category',
    href: (data: any) => `/categories/${data.category_id}`,
    method: 'GET',
  },
];

export const BULK_OPERATION_HATEOAS_LINKS: LinkDefinition[] = [
  { rel: 'list', href: '/products', method: 'GET' },
];

export const DELETE_PRODUCT_HATEOAS_LINKS: LinkDefinition[] = [
  { rel: 'list', href: '/products', method: 'GET' },
];

export const BULK_DELETE_HATEOAS_LINKS: LinkDefinition[] = [
  { rel: 'list', href: '/products', method: 'GET' },
  { rel: 'bulk_restore', href: '/products/bulk/restore', method: 'PATCH' },
];

export const BULK_RESTORE_HATEOAS_LINKS: LinkDefinition[] = [
  { rel: 'list', href: '/products', method: 'GET' },
];

export const ProductHateoas = () => HateoasLinks(...PRODUCT_HATEOAS_LINKS);
export const BulkOperationHateoas = () =>
  HateoasLinks(...BULK_OPERATION_HATEOAS_LINKS);
export const DeleteProductHateoas = () =>
  HateoasLinks(...DELETE_PRODUCT_HATEOAS_LINKS);
export const BulkDeleteHateoas = () =>
  HateoasLinks(...BULK_DELETE_HATEOAS_LINKS);
export const BulkRestoreHateoas = () =>
  HateoasLinks(...BULK_RESTORE_HATEOAS_LINKS);
