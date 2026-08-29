import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Res,
  Req,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { RegisterDto, LoginDto, SwitchWorkspaceDto } from './dto';
import { CurrentUser } from '../common/current-user.decorator';
import { SupabaseService } from '../supabase/supabase.service';
import { JwtService } from '@nestjs/jwt';
import { Response, Request } from 'express';

@Controller()
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly supabase: SupabaseService,
    private readonly jwtService: JwtService,
  ) {}

  @Post('auth/register')
  async register(@Body() dto: RegisterDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.auth.register(dto);
    this.setCookie(res, result.token);
    return result;
  }

  @Post('auth/login')
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.auth.login(dto);
    this.setCookie(res, result.token);
    return result;
  }

  @Post('auth/logout')
  logout(@Res({ passthrough: true }) res: Response) {
    const isProd = process.env.NODE_ENV === 'production';
    res.clearCookie('sf_token', {
      path: '/',
      sameSite: isProd ? 'none' : 'lax',
      secure: isProd,
    });
    return { message: 'sesión cerrada' };
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getMe(@Req() req: any) {
    const user = req.user;
    return this.auth.me(user.sub, req.workspaceId, req.membershipRole);
  }

  @UseGuards(JwtAuthGuard)
  @Post('workspaces/switch')
  async switchWorkspace(
    @Body() dto: SwitchWorkspaceDto,
    @Req() req: any,
    @Res({ passthrough: true }) res: Response,
  ) {
    const user = req.user;
    const isSuperadmin = !!req.isSuperadmin;

    // El superadmin puede entrar a cualquier workspace y operar como admin,
    // aunque no tenga membresía explícita en él.
    let role = 'admin';
    if (!isSuperadmin) {
      const { data: membership } = await this.supabase.db
        .from('memberships')
        .select('role')
        .eq('workspace_id', dto.workspace_id)
        .eq('user_id', user.sub)
        .single();

      if (!membership) {
        return { error: 'espacio de trabajo no encontrado o sin membresia' };
      }
      role = membership.role;
    }

    const payload = {
      sub: user.sub,
      email: user.email,
      wid: dto.workspace_id,
      rol: role,
    };
    const hours = parseInt(process.env.JWT_EXPIRY_HOURS || '72', 10);
    const token = this.jwtService.sign(payload, {
      expiresIn: hours * 3600,
    });

    this.setCookie(res, token);
    return {
      active_workspace_id: dto.workspace_id,
      role,
    };
  }

  private setCookie(res: Response, token: string) {
    const hours = parseInt(process.env.JWT_EXPIRY_HOURS || '72', 10);
    const isProd = process.env.NODE_ENV === 'production';
    res.cookie('sf_token', token, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax',
      path: '/',
      maxAge: hours * 3600 * 1000,
    });
  }
}
