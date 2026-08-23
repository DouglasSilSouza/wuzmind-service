import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { IS_PUBLIC_KEY } from './public.decorator';
import { StructuredLoggerService } from '../logger/structured-logger.service';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  private readonly logger = new StructuredLoggerService(ApiKeyGuard.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly reflector: Reflector,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const expectedKey = this.configService.get<string>('WUZMIND_API_KEY');

    // If no key is configured on server, allow access (permissive dev mode)
    if (!expectedKey) {
      return true;
    }

    const headers = request.headers || {};
    const authHeader = headers['authorization'];
    let bearerKey: string | undefined;
    if (typeof authHeader === 'string') {
      bearerKey = authHeader.startsWith('Bearer ')
        ? authHeader.slice(7).trim()
        : authHeader.trim();
    }

    const headerKey =
      headers['x-wuzmind-api-key'] ||
      headers['x-api-key'] ||
      headers['api-key'] ||
      headers['apikey'] ||
      bearerKey;

    const rawKey = Array.isArray(headerKey) ? headerKey[0] : headerKey;
    const queryKey = request.query ? (request.query.apiKey || request.query.api_key || request.query.key) : undefined;
    const resolvedKey = (rawKey || queryKey) as string | undefined;

    if (!resolvedKey || resolvedKey !== expectedKey) {
      this.logger.warn(`Unauthorized request to ${request.method} ${request.url || ''}`);
      throw new UnauthorizedException('Invalid or missing API key');
    }

    return true;
  }
}
