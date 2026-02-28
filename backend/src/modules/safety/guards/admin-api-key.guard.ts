import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AdminApiKeyGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const headerKey = request.headers['x-admin-key'];
    const apiKey = Array.isArray(headerKey) ? headerKey[0] : headerKey;
    const expected = this.configService.get<string>('admin.apiKey');

    if (!apiKey || !expected || apiKey !== expected) {
      throw new ForbiddenException('Invalid admin key');
    }

    return true;
  }
}
