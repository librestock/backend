import { type LinkDefinition } from '../../common/hateoas/hateoas-link.dto';
import { HateoasLinks } from '../../common/hateoas/hateoas.decorator';

export const AREA_HATEOAS_LINKS: LinkDefinition[] = [
  {
    rel: 'self',
    href: (data: { id: string }) => `/areas/${data.id}`,
    method: 'GET',
  },
  {
    rel: 'update',
    href: (data: { id: string }) => `/areas/${data.id}`,
    method: 'PUT',
  },
  {
    rel: 'delete',
    href: (data: { id: string }) => `/areas/${data.id}`,
    method: 'DELETE',
  },
  {
    rel: 'location',
    href: (data: { location_id: string }) => `/locations/${data.location_id}`,
    method: 'GET',
  },
  {
    rel: 'children',
    href: (data: { id: string }) => `/areas/${data.id}/children`,
    method: 'GET',
  },
];

export const AREA_LIST_HATEOAS_LINKS: LinkDefinition[] = [
  {
    rel: 'self',
    href: () => '/areas',
    method: 'GET',
  },
  {
    rel: 'create',
    href: () => '/areas',
    method: 'POST',
  },
];

export const AreaHateoas = () => HateoasLinks(...AREA_HATEOAS_LINKS);
export const AreaListHateoas = () => HateoasLinks(...AREA_LIST_HATEOAS_LINKS);
