import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4, validate as uuidValidate } from 'uuid';

export interface RequestWithId extends Request {
  id?: string;
}

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: RequestWithId, res: Response, next: NextFunction) {
    const headerValue = req.headers['x-request-id'];
    const requestId =
      typeof headerValue === 'string' && uuidValidate(headerValue)
        ? headerValue
        : uuidv4();
    req.id = requestId;
    res.setHeader('X-Request-ID', requestId);
    next();
  }
}
