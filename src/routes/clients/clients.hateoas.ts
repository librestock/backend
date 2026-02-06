import { type LinkDefinition } from '../../common/hateoas/hateoas-link.dto';
import { HateoasLinks } from '../../common/hateoas/hateoas.decorator';

export const CLIENT_HATEOAS_LINKS: LinkDefinition[] = [
  { rel: 'self', href: (data: any) => `/clients/${data.id}`, method: 'GET' },
  {
    rel: 'update',
    href: (data: any) => `/clients/${data.id}`,
    method: 'PUT',
  },
  {
    rel: 'delete',
    href: (data: any) => `/clients/${data.id}`,
    method: 'DELETE',
  },
];

export const DELETE_CLIENT_HATEOAS_LINKS: LinkDefinition[] = [
  { rel: 'list', href: '/clients', method: 'GET' },
];

export const ClientHateoas = () => HateoasLinks(...CLIENT_HATEOAS_LINKS);
export const DeleteClientHateoas = () =>
  HateoasLinks(...DELETE_CLIENT_HATEOAS_LINKS);
