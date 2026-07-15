import {
  Injectable,
  CanActivate,
  ExecutionContext,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class WorkspaceGuard implements CanActivate {
  constructor(private readonly supabase: SupabaseService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const workspaceId =
      request.params?.workspaceId ||
      request.headers['x-workspace-id'] ||
      request.query?.workspace_id;

    if (!workspaceId) {
      throw new BadRequestException({
        code: 'no_workspace',
        message: 'no hay espacio de trabajo activo seleccionado',
      });
    }

    const { data: membership } = await this.supabase.db
      .from('memberships')
      .select('role')
      .eq('workspace_id', workspaceId)
      .eq('user_id', user.sub)
      .single();

    if (!membership) {
      throw new NotFoundException({
        code: 'not_found',
        message: 'espacio de trabajo no encontrado',
      });
    }

    request.workspaceId = workspaceId;
    request.membershipRole = membership.role;
    return true;
  }
}
