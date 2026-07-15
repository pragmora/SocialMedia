import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from '../supabase/supabase.service';

export interface JwtPayload {
  sub: string;
  email: string;
  wid?: string;
  rol?: string;
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

    const { data: user } = await this.supabase.db
      .from('users')
      .select('id')
      .eq('id', payload.sub)
      .single();

    if (!user) {
      throw new UnauthorizedException({
        code: 'unauthorized',
        message: 'usuario no encontrado',
      });
    }

    request.workspaceId = payload.wid;
    request.membershipRole = payload.rol;

    return payload;
  }
}
