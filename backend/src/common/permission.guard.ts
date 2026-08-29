import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

export const PERMISSION_KEY = 'permission';

export interface RequiredPermission {
  module: string;
  action: string;
}

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<RequiredPermission>(
      PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!required) {
      return true;
    }

    const request = context.switchToHttp().getRequest();

    // El superadmin global y los admins del workspace tienen acceso total.
    if (request.isSuperadmin || request.membershipRole === 'admin') {
      return true;
    }

    const permissions: Record<string, string[]> = request.permissions ?? {};
    if (permissions[required.module]?.includes(required.action)) {
      return true;
    }

    throw new ForbiddenException({
      code: 'forbidden',
      message: 'permiso insuficiente para esta acción',
    });
  }
}
