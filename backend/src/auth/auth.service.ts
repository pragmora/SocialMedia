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

const ALL_MODULES = ['dashboard', 'calendar', 'content', 'projects', 'tasks', 'clients', 'members', 'finances'];

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
      .single();

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
      .select('id, email, name')
      .single();

    if (userErr || !user) {
      throw new InternalServerErrorException({
        code: 'internal',
        message: 'error al crear usuario',
      });
    }

    let workspaceId: string | undefined;
    let role: string | undefined;

    const { data: ws, error: wsErr } = await this.supabase.db
      .from('workspaces')
      .insert({ name: `${name}'s Workspace` })
      .select('id')
      .single();

    if (wsErr || !ws) {
      throw new InternalServerErrorException({
        code: 'internal',
        message: 'error al crear espacio de trabajo',
      });
    }

    workspaceId = ws.id;
    role = 'admin';

    const { error: memErr } = await this.supabase.db
      .from('memberships')
      .insert({ workspace_id: ws.id, user_id: user.id, role });

    if (memErr) {
      throw new InternalServerErrorException({
        code: 'internal',
        message: 'error al crear membresía',
      });
    }

    return this.buildResponse(user, workspaceId, role);
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
      .select('id, email, name')
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

    // Fetch modules for the active workspace
    let modules: string[] = ALL_MODULES;
    if (active_workspace_id) {
      if (role === 'admin') {
        modules = ALL_MODULES;
      } else {
        const { data: perms } = await this.supabase.db
          .from('workspace_module_permissions')
          .select('module_key')
          .eq('workspace_id', active_workspace_id)
          .eq('user_id', userId)
          .eq('enabled', true);

        if (perms && perms.length > 0) {
          modules = perms.map((p) => p.module_key);
        }
      }
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      active_workspace_id,
      role,
      modules,
    };
  }

  private async buildResponse(user: any, workspaceId?: string, role?: string) {
    const payload: any = { sub: user.id, email: user.email };
    if (workspaceId) payload.wid = workspaceId;
    if (role) payload.rol = role;

    const hours = parseInt(process.env.JWT_EXPIRY_HOURS || '72', 10);
    const token = this.jwtService.sign(payload, {
      expiresIn: hours * 3600,
    });

    // Fetch modules for the workspace
    let modules: string[] = ALL_MODULES;
    if (workspaceId) {
      if (role === 'admin') {
        modules = ALL_MODULES;
      } else {
        const { data: perms } = await this.supabase.db
          .from('workspace_module_permissions')
          .select('module_key')
          .eq('workspace_id', workspaceId)
          .eq('user_id', user.id)
          .eq('enabled', true);

        if (perms && perms.length > 0) {
          modules = perms.map((p) => p.module_key);
        }
      }
    }

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        active_workspace_id: workspaceId,
        role,
        modules,
      },
    };
  }
}
