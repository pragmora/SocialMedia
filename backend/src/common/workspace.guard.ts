import {
  Injectable,
  CanActivate,
  ExecutionContext,
  BadRequestException,
} from '@nestjs/common';

@Injectable()
export class WorkspaceGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const workspaceId = request.workspaceId;

    if (!workspaceId) {
      throw new BadRequestException({
        code: 'no_workspace',
        message: 'no hay espacio de trabajo activo seleccionado',
      });
    }

    return true;
  }
}
