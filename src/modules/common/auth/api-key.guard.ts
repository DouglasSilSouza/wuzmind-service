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

@Injectable()
export class ApiKeyGuard implements CanActivate {
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

    // If no key is configured in dev mode, we fail closed unless configured
    if (!expectedKey) {
      throw new UnauthorizedException('WUZMIND_API_KEY is not configured on server');
    }

    const rawApiKey = request.headers['x-wuzmind-api-key'];
    const apiKey = Array.isArray(rawApiKey) ? rawApiKey[0] : rawApiKey;

    if (!apiKey || apiKey !== expectedKey) {
      throw new UnauthorizedException('Invalid or missing x-wuzmind-api-key');
    }

    return true;
  }
}
