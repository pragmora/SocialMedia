import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { SupabaseService } from '../supabase/supabase.service';
import { RegisterDto, LoginDto } from './dto';
import { ErrMsg } from '../common/errors';
import {
  MODULES,
  applyOverrides,
  allPermissions,
  getRolePreset,
  matrixModules,
  matrixPermissions,
} from '../permissions/permissions.constants';

@Injectable()
export class AuthService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    if (!dto.email || !dto.password) {
      throw new BadRequestException('correo y contraseña son obligatorios');
    }

    const { data: existing, error: existErr } = await this.supabase.db
      .from('users')
      .select('id')
      .eq('email', dto.email)
      .maybeSingle();

    if (existErr) {
      throw new InternalServerErrorException({
        code: 'internal',
        message: 'error al verificar usuario',
      });
    }

    if (existing) {
      throw new ConflictException({
        code: 'conflict',
        message: ErrMsg.EMAIL_REGISTERED,
      });
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const name = dto.name || dto.email;

    const { data: user, error: userErr } = await this.supabase.db
      .from('users')
      .insert({ email: dto.email, password_hash: passwordHash, name })
      .select('id, email, name, is_superadmin')
      .single();

    if (userErr || !user) {
      throw new InternalServerErrorException({
        code: 'internal',
        message: 'error al crear usuario',
      });
    }

    // El registro NO crea espacio de trabajo ni membresías: el acceso a un
    // workspace se obtiene creando uno propio o aceptando una invitación.
    return this.buildResponse(user, undefined, undefined);
  }

  async login(dto: LoginDto) {
    if (!dto.email || !dto.password) {
      throw new BadRequestException('correo y contraseña son obligatorios');
    }

    const { data: user, error: userErr } = await this.supabase.db
      .from('users')
      .select('*')
      .eq('email', dto.email)
      .single();

    if (userErr || !user) {
      throw new UnauthorizedException({
        code: 'unauthorized',
        message: 'correo o contraseña inválidos',
      });
    }

    const valid = await bcrypt.compare(dto.password, user.password_hash);
    if (!valid) {
      throw new UnauthorizedException({
        code: 'unauthorized',
        message: 'correo o contraseña inválidos',
      });
    }

    const { data: memberships, error: memErr } = await this.supabase.db
      .from('memberships')
      .select('workspace_id, role')
      .eq('user_id', user.id);

    if (memErr) {
      throw new InternalServerErrorException({
        code: 'internal',
        message: 'error al consultar membresías',
      });
    }

    let workspaceId: string | undefined;
    let role: string | undefined;

    if (memberships && memberships.length > 0) {
      workspaceId = memberships[0].workspace_id;
      role = memberships[0].role;
    }

    return this.buildResponse(user, workspaceId, role);
  }

  async me(userId: string, activeWorkspaceId?: string, activeRole?: string) {
    const { data: user, error: userErr } = await this.supabase.db
      .from('users')
      .select('id, email, name, is_superadmin')
      .eq('id', userId)
      .single();

    if (userErr || !user) return null;

    let active_workspace_id = activeWorkspaceId;
    let role = activeRole;

    if (!active_workspace_id || !role) {
      const { data: memberships } = await this.supabase.db
        .from('memberships')
        .select('workspace_id, role')
        .eq('user_id', userId);

      if (memberships && memberships.length > 0) {
        active_workspace_id = active_workspace_id || memberships[0].workspace_id;
        role = role || memberships[0].role;
      }
    }

    // El superadmin global opera como admin en cualquier workspace.
    if (user.is_superadmin && !role) role = 'admin';

    // Permisos por acción: admin/superadmin tienen todo; el resto usa el
    // preset del rol + overrides por usuario.
    let modules: string[] = [];
    let permissions: Record<string, string[]> = {};
    if (active_workspace_id) {
      if (role === 'admin' || user.is_superadmin) {
        modules = [...MODULES];
        permissions = matrixPermissions(allPermissions());
      } else {
        const { data: overrides } = await this.supabase.db
          .from('workspace_module_permissions')
          .select('module_key, action, enabled')
          .eq('workspace_id', active_workspace_id)
          .eq('user_id', userId);

        const matrix = applyOverrides(getRolePreset(role), overrides || []);
        modules = matrixModules(matrix);
        permissions = matrixPermissions(matrix);
      }
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      is_superadmin: !!user.is_superadmin,
      active_workspace_id,
      role,
      modules,
      permissions,
    };
  }

  private async buildResponse(user: any, workspaceId?: string, role?: string) {
    const payload: any = { sub: user.id, email: user.email };
    if (workspaceId) payload.wid = workspaceId;
    if (user.is_superadmin && !role) role = 'admin';
    if (role) payload.rol = role;

    const hours = parseInt(process.env.JWT_EXPIRY_HOURS || '72', 10);
    const token = this.jwtService.sign(payload, {
      expiresIn: hours * 3600,
    });

    // Permisos por acción para el workspace activo.
    let modules: string[] = [];
    let permissions: Record<string, string[]> = {};
    if (workspaceId) {
      if (role === 'admin' || user.is_superadmin) {
        modules = [...MODULES];
        permissions = matrixPermissions(allPermissions());
      } else {
        const { data: overrides } = await this.supabase.db
          .from('workspace_module_permissions')
          .select('module_key, action, enabled')
          .eq('workspace_id', workspaceId)
          .eq('user_id', user.id);

        const matrix = applyOverrides(getRolePreset(role), overrides || []);
        modules = matrixModules(matrix);
        permissions = matrixPermissions(matrix);
      }
    }

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        is_superadmin: !!user.is_superadmin,
        active_workspace_id: workspaceId,
        role,
        modules,
        permissions,
      },
    };
  }
}
