import { type LinkDefinition } from '../../common/hateoas/hateoas-link.dto';
import { HateoasLinks } from '../../common/hateoas/hateoas.decorator';

export const STOCK_MOVEMENT_HATEOAS_LINKS: LinkDefinition[] = [
  {
    rel: 'self',
    href: (data: any) => `/stock-movements/${data.id}`,
    method: 'GET',
  },
  {
    rel: 'product',
    href: (data: any) => `/products/${data.product_id}`,
    method: 'GET',
  },
];

export const StockMovementHateoas = () =>
  HateoasLinks(...STOCK_MOVEMENT_HATEOAS_LINKS);
