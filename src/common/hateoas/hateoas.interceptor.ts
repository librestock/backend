import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Request } from 'express';
import { HATEOAS_LINKS_KEY } from './hateoas.decorator';
import { HateoasLink, LinkDefinition } from './hateoas-link.dto';

export interface HateoasResponse<T> {
  data: T;
  _links: Record<string, HateoasLink>;
}

@Injectable()
export class HateoasInterceptor implements NestInterceptor {
  constructor(private reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const links = this.reflector.get<LinkDefinition[]>(
      HATEOAS_LINKS_KEY,
      context.getHandler(),
    );

    if (!links || links.length === 0) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<Request>();
    const baseUrl = `${request.protocol}://${request.get('host')}/api/v1`;

    return next.handle().pipe(
      map((data) => {
        if (Array.isArray(data)) {
          return data.map((item) => this.addLinks(item, links, baseUrl));
        }
        return this.addLinks(data, links, baseUrl);
      }),
    );
  }

  private addLinks(
    data: any,
    linkDefs: LinkDefinition[],
    baseUrl: string,
  ): any {
    if (!data || typeof data !== 'object') {
      return data;
    }

    const _links: Record<string, HateoasLink> = {};

    for (const linkDef of linkDefs) {
      const href =
        typeof linkDef.href === 'function' ? linkDef.href(data) : linkDef.href;

      _links[linkDef.rel] = new HateoasLink(
        href.startsWith('http') ? href : `${baseUrl}${href}`,
        linkDef.method,
      );
    }

    return {
      ...data,
      _links,
    };
  }
}
