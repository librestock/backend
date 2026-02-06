import { SetMetadata } from '@nestjs/common';
import { type LinkDefinition } from './hateoas-link.dto';

export const HATEOAS_LINKS_KEY = 'hateoas:links';

export const HateoasLinks = (...links: LinkDefinition[]) =>
  SetMetadata(HATEOAS_LINKS_KEY, links);

export const SelfLink = (href: string | ((data: any) => string)) =>
  HateoasLinks({ rel: 'self', href, method: 'GET' });
