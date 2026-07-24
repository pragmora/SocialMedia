import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { v4 as uuid } from 'uuid';
import { ErrMsg } from '../common/errors';

@Injectable()
export class WorkspacesService {
  constructor(private readonly supabase: SupabaseService) {}

  async listAllUsers() {
    const { data } = await this.supabase.db
      .from('users')
      .select('id, email, name')
      .order('name');

    return data || [];
  }

  async list(userId: string) {
    const { data: memberships } = await this.supabase.db
      .from('memberships')
      .select('workspace_id')
      .eq('user_id', userId);

    if (!memberships || memberships.length === 0) return [];

    const workspaceIds = memberships.map((m) => m.workspace_id);

    const { data } = await this.supabase.db
      .from('workspaces')
      .select('id, name, created_at, updated_at')
      .in('id', workspaceIds)
      .is('deleted_at', null)
      .order('name');

    return data || [];
  }

  async create(userId: string, name: string) {
    if (!name) throw new BadRequestException('el nombre del espacio de trabajo es obligatorio');

    const { data: ws } = await this.supabase.db
      .from('workspaces')
      .insert({ name })
      .select('id, name, created_at, updated_at')
      .single();

    if (ws) {
      await this.supabase.db
        .from('memberships')
        .insert({ workspace_id: ws.id, user_id: userId, role: 'admin' });
    }

    return ws;
  }

  async get(userId: string, workspaceId: string) {
    const { data: ws } = await this.supabase.db
      .from('workspaces')
      .select('id, name, created_at, updated_at')
      .eq('id', workspaceId)
      .is('deleted_at', null)
      .single();

    if (!ws) throw new NotFoundException({ code: 'not_found', message: ErrMsg.WORKSPACE_NOT_FOUND });

    const membership = await this.getMembership(userId, workspaceId);
    if (!membership) throw new NotFoundException({ code: 'not_found', message: ErrMsg.WORKSPACE_NOT_FOUND });

    return ws;
  }

  async update(userId: string, workspaceId: string, name: string) {
    await this.requireAdmin(userId, workspaceId);
    if (!name) throw new BadRequestException('el nombre del espacio de trabajo es obligatorio');

    const { data: ws } = await this.supabase.db
      .from('workspaces')
      .update({ name, updated_at: new Date().toISOString() })
      .eq('id', workspaceId)
      .is('deleted_at', null)
      .select('id, name, created_at, updated_at')
      .single();

    if (!ws) throw new NotFoundException({ code: 'not_found', message: ErrMsg.WORKSPACE_NOT_FOUND });
    return ws;
  }

  async delete(userId: string, workspaceId: string) {
    await this.requireAdmin(userId, workspaceId);
    const { error } = await this.supabase.db
      .from('workspaces')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', workspaceId)
      .is('deleted_at', null);

    if (error) throw new NotFoundException({ code: 'not_found', message: ErrMsg.WORKSPACE_NOT_FOUND });
  }

  async listMembers(userId: string, workspaceId: string) {
    const membership = await this.getMembership(userId, workspaceId);
    if (!membership) throw new NotFoundException({ code: 'not_found', message: ErrMsg.WORKSPACE_NOT_FOUND });

    const { data } = await this.supabase.db
      .from('memberships')
      .select(`
        workspace_id, user_id, role, joined_at,
        users!inner(id, email, name)
      `)
      .eq('workspace_id', workspaceId)
      .order('joined_at');

    return (data || []).map((m: any) => ({
      workspace_id: m.workspace_id,
      user_id: m.user_id,
      role: m.role,
      joined_at: m.joined_at,
      user: m.users,
    }));
  }

  async updateMemberRole(actorId: string, workspaceId: string, targetUserId: string, role: string) {
    await this.requireAdmin(actorId, workspaceId);

    const validRoles = ['admin', 'cm', 'viewer'];
    if (!validRoles.includes(role)) {
      throw new BadRequestException(`rol invalido: ${role}`);
    }
    if (actorId === targetUserId) {
      throw new BadRequestException('no puedes cambiar tu propio rol');
    }

    const { data: m } = await this.supabase.db
      .from('memberships')
      .update({ role })
      .eq('workspace_id', workspaceId)
      .eq('user_id', targetUserId)
      .select('workspace_id, user_id, role, joined_at')
      .single();

    if (!m) throw new NotFoundException('membresia no encontrada');
    return m;
  }

  async addMemberByEmail(actorId: string, workspaceId: string, email: string, role?: string) {
    await this.requireAdmin(actorId, workspaceId);

    const assignedRole = role && ['admin', 'cm', 'viewer'].includes(role) ? role : 'cm';

    const { data: targetUser } = await this.supabase.db
      .from('users')
      .select('id, email, name')
      .eq('email', email)
      .single();

    if (!targetUser) {
      throw new NotFoundException({
        code: 'not_found',
        message: 'no hay usuario registrado con ese email',
      });
    }

    const { data: existing } = await this.supabase.db
      .from('memberships')
      .select('user_id')
      .eq('workspace_id', workspaceId)
      .eq('user_id', targetUser.id)
      .single();

    if (existing) {
      throw new BadRequestException({
        code: 'bad_request',
        message: 'ya es miembro de este espacio de trabajo',
      });
    }

    const { data: membership, error } = await this.supabase.db
      .from('memberships')
      .insert({ workspace_id: workspaceId, user_id: targetUser.id, role: assignedRole })
      .select('workspace_id, user_id, role, joined_at')
      .single();

    if (error) throw error;

    return { ...membership, user: targetUser };
  }

  async removeMember(actorId: string, workspaceId: string, targetUserId: string) {
    await this.requireAdmin(actorId, workspaceId);
    if (actorId === targetUserId) {
      throw new BadRequestException('no puedes quitarte del espacio de trabajo');
    }

    const { error } = await this.supabase.db
      .from('memberships')
      .delete()
      .eq('workspace_id', workspaceId)
      .eq('user_id', targetUserId);

    if (error) throw new NotFoundException('membresia no encontrada');
  }

  async createInvite(
    userId: string,
    workspaceId: string,
    maxUses?: number,
    expiresInHours?: number,
  ) {
    await this.requireAdmin(userId, workspaceId);

    const token = uuid().replace(/-/g, '');
    const maxU = maxUses && maxUses > 0 ? maxUses : 10;
    const hours = expiresInHours && expiresInHours > 0 ? expiresInHours : 168;
    const expiresAt = new Date(Date.now() + hours * 3600 * 1000);

    const { data } = await this.supabase.db
      .from('workspace_invites')
      .insert({
        workspace_id: workspaceId,
        created_by: userId,
        token,
        max_uses: maxU,
        expires_at: expiresAt.toISOString(),
      })
      .select('*')
      .single();

    return data;
  }

  async claimInvite(userId: string, token: string) {
    const { data: inv } = await this.supabase.db
      .from('workspace_invites')
      .select('*')
      .eq('token', token)
      .single();

    if (!inv) throw new NotFoundException({ code: 'not_found', message: ErrMsg.INVITE_NOT_FOUND });

    const now = new Date();
    if (now > new Date(inv.expires_at) || inv.use_count >= inv.max_uses) {
      throw new BadRequestException({ code: 'bad_request', message: ErrMsg.INVITE_UNAVAILABLE });
    }

    // Upsert membership
    const { data: membership } = await this.supabase.db
      .from('memberships')
      .upsert(
        { workspace_id: inv.workspace_id, user_id: userId, role: 'viewer' },
        { onConflict: 'workspace_id,user_id' },
      )
      .select('*')
      .single();

    // Increment use count
    await this.supabase.db
      .from('workspace_invites')
      .update({ use_count: inv.use_count + 1 })
      .eq('id', inv.id);

    return membership;
  }

  async getModulePermissions(workspaceId: string, targetUserId: string) {
    const { data } = await this.supabase.db
      .from('workspace_module_permissions')
      .select('module_key, enabled')
      .eq('workspace_id', workspaceId)
      .eq('user_id', targetUserId);

    return data || [];
  }

  async setModulePermissions(workspaceId: string, targetUserId: string, modules: { module_key: string; enabled: boolean }[]) {
    const validModules = ['dashboard', 'calendar', 'content', 'projects', 'tasks', 'clients', 'members', 'finances'];

    const rows = modules
      .filter((m) => validModules.includes(m.module_key))
      .map((m) => ({
        workspace_id: workspaceId,
        user_id: targetUserId,
        module_key: m.module_key,
        enabled: m.enabled,
      }));

    if (rows.length === 0) return [];

    // Delete existing and re-insert
    await this.supabase.db
      .from('workspace_module_permissions')
      .delete()
      .eq('workspace_id', workspaceId)
      .eq('user_id', targetUserId);

    const { data, error } = await this.supabase.db
      .from('workspace_module_permissions')
      .insert(rows)
      .select('module_key, enabled');

    if (error) throw error;
    return data || [];
  }

  async getUserModules(workspaceId: string, userId: string): Promise<string[]> {
    // Admin always gets all modules
    const membership = await this.getMembership(userId, workspaceId);
    if (membership?.role === 'admin') {
      return ['dashboard', 'calendar', 'content', 'projects', 'tasks', 'clients', 'members', 'finances'];
    }

    const { data } = await this.supabase.db
      .from('workspace_module_permissions')
      .select('module_key')
      .eq('workspace_id', workspaceId)
      .eq('user_id', userId)
      .eq('enabled', true);

    if (!data || data.length === 0) {
      // No permissions configured = all modules enabled (fallback)
      return ['dashboard', 'calendar', 'content', 'projects', 'tasks', 'clients', 'members', 'finances'];
    }

    return data.map((r) => r.module_key);
  }

  private async getMembership(userId: string, workspaceId: string) {
    const { data } = await this.supabase.db
      .from('memberships')
      .select('role')
      .eq('workspace_id', workspaceId)
      .eq('user_id', userId)
      .single();
    return data;
  }

  private async requireAdmin(userId: string, workspaceId: string) {
    const membership = await this.getMembership(userId, workspaceId);
    if (!membership) throw new NotFoundException({ code: 'not_found', message: ErrMsg.WORKSPACE_NOT_FOUND });
    if (membership.role !== 'admin') throw new ForbiddenException({ code: 'forbidden', message: ErrMsg.ADMIN_ROLE_REQUIRED });
  }
}
