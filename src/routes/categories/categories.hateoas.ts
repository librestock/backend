import { type LinkDefinition } from '../../common/hateoas/hateoas-link.dto';
import { HateoasLinks } from '../../common/hateoas/hateoas.decorator';

export const CATEGORY_HATEOAS_LINKS: LinkDefinition[] = [
  {
    rel: 'self',
    href: (data: any) => `/categories/${data.id}`,
    method: 'GET',
  },
  {
    rel: 'update',
    href: (data: any) => `/categories/${data.id}`,
    method: 'PUT',
  },
  {
    rel: 'delete',
    href: (data: any) => `/categories/${data.id}`,
    method: 'DELETE',
  },
  {
    rel: 'products',
    href: (data: any) => `/products/category/${data.id}`,
    method: 'GET',
  },
];

export const DELETE_CATEGORY_HATEOAS_LINKS: LinkDefinition[] = [
  { rel: 'list', href: '/categories', method: 'GET' },
];

export const CategoryHateoas = () => HateoasLinks(...CATEGORY_HATEOAS_LINKS);
export const DeleteCategoryHateoas = () =>
  HateoasLinks(...DELETE_CATEGORY_HATEOAS_LINKS);
