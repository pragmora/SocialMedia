import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from '../supabase/supabase.service';
import {
  applyOverrides,
  getRolePreset,
  matrixPermissions,
  allPermissions,
} from '../permissions/permissions.constants';

export interface JwtPayload {
  sub: string;
  email: string;
  wid?: string;
  rol?: string;
  is_superadmin?: boolean;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly supabase: SupabaseService,
  ) {
    const secret = config.get<string>('JWT_SECRET') || 'dev-secret-change-me';
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req) => req?.cookies?.sf_token,
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: secret,
      passReqToCallback: true,
    });
  }

  async validate(request: any, payload: JwtPayload): Promise<JwtPayload> {
    if (!payload.sub) {
      throw new UnauthorizedException({
        code: 'unauthorized',
        message: 'token inválido',
      });
    }

    const { data: user, error: userError } = await this.supabase.db
      .from('users')
      .select('id, is_superadmin')
      .eq('id', payload.sub)
      .single();

    if (userError || !user) {
      throw new UnauthorizedException({
        code: 'unauthorized',
        message: 'usuario no encontrado',
      });
    }

    let wid = payload.wid;
    let rol = payload.rol;

    if (!wid || !rol) {
      const { data: memberships } = await this.supabase.db
        .from('memberships')
        .select('workspace_id, role')
        .eq('user_id', payload.sub);

      if (memberships && memberships.length > 0) {
        wid = wid || memberships[0].workspace_id;
        rol = rol || memberships[0].role;
      }
    }

    // El superadmin global opera como admin en cualquier workspace.
    if (user.is_superadmin && !rol) rol = 'admin';

    request.workspaceId = wid;
    request.membershipRole = rol;
    request.isSuperadmin = !!user.is_superadmin;

    // Permisos efectivos por acción para el workspace activo.
    // Los admins y superadmins tienen acceso total; el resto usa el preset
    // del rol más los overrides configurados por el admin.
    if (user.is_superadmin || rol === 'admin') {
      request.permissions = matrixPermissions(allPermissions());
    } else if (wid) {
      const { data: overrides } = await this.supabase.db
        .from('workspace_module_permissions')
        .select('module_key, action, enabled')
        .eq('workspace_id', wid)
        .eq('user_id', payload.sub);

      request.permissions = matrixPermissions(
        applyOverrides(getRolePreset(rol), overrides || []),
      );
    } else {
      request.permissions = {};
    }

    return { ...payload, wid, rol, is_superadmin: request.isSuperadmin };
  }
}
