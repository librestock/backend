import { type LinkDefinition } from '../../common/hateoas/hateoas-link.dto';
import { HateoasLinks } from '../../common/hateoas/hateoas.decorator';

export const LOCATION_HATEOAS_LINKS: LinkDefinition[] = [
  { rel: 'self', href: (data: any) => `/locations/${data.id}`, method: 'GET' },
  {
    rel: 'update',
    href: (data: any) => `/locations/${data.id}`,
    method: 'PUT',
  },
  {
    rel: 'delete',
    href: (data: any) => `/locations/${data.id}`,
    method: 'DELETE',
  },
  {
    rel: 'inventory',
    href: (data: any) => `/inventory/location/${data.id}`,
    method: 'GET',
  },
];

export const DELETE_LOCATION_HATEOAS_LINKS: LinkDefinition[] = [
  { rel: 'list', href: '/locations', method: 'GET' },
];

export const LocationHateoas = () => HateoasLinks(...LOCATION_HATEOAS_LINKS);
export const DeleteLocationHateoas = () =>
  HateoasLinks(...DELETE_LOCATION_HATEOAS_LINKS);
