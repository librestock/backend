import { type LinkDefinition } from '../../common/hateoas/hateoas-link.dto';
import { HateoasLinks } from '../../common/hateoas/hateoas.decorator';

export const PHOTO_HATEOAS_LINKS: LinkDefinition[] = [
  {
    rel: 'self',
    href: (data: any) => `/photos/${data.id}/file`,
    method: 'GET',
  },
  {
    rel: 'delete',
    href: (data: any) => `/photos/${data.id}`,
    method: 'DELETE',
  },
  {
    rel: 'product',
    href: (data: any) => `/products/${data.product_id}`,
    method: 'GET',
  },
];

export const PHOTO_LIST_HATEOAS_LINKS: LinkDefinition[] = [
  {
    rel: 'upload',
    href: (data: any) => `/products/${data[0]?.product_id ?? 'unknown'}/photos`,
    method: 'POST',
  },
];

export const PhotoHateoas = () => HateoasLinks(...PHOTO_HATEOAS_LINKS);
export const PhotoListHateoas = () => HateoasLinks(...PHOTO_LIST_HATEOAS_LINKS);
