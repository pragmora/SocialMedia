import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateClientDto, UpdateClientDto } from './dto';
import { ErrMsg } from '../common/errors';
import { isValidHexColor } from '../common/client-colors';

const CLIENT_COLUMNS = 'id, workspace_id, name, social_handles, notes, phone, email, website, active, color, created_at, updated_at';

@Injectable()
export class ClientsService {
  constructor(private readonly supabase: SupabaseService) {}

  async list(workspaceId: string) {
    const { data } = await this.supabase.db
      .from('clients')
      .select(CLIENT_COLUMNS)
      .eq('workspace_id', workspaceId)
      .is('deleted_at', null)
      .order('name');

    return data || [];
  }

  async listAll(userId: string, isSuperadmin: boolean, workspaceId?: string) {
    let workspaces: { id: string; name: string }[] = [];

    if (isSuperadmin) {
      const { data } = await this.supabase.db
        .from('workspaces')
        .select('id, name')
        .is('deleted_at', null);
      workspaces = data || [];
    } else {
      const { data: memberships } = await this.supabase.db
        .from('memberships')
        .select('workspace_id')
        .eq('user_id', userId);

      const ids = (memberships || []).map((m) => m.workspace_id);
      if (ids.length === 0) return [];

      const { data } = await this.supabase.db
        .from('workspaces')
        .select('id, name')
        .in('id', ids)
        .is('deleted_at', null);
      workspaces = data || [];
    }

    const accessibleIds = workspaces.map((w) => w.id);
    if (accessibleIds.length === 0) return [];

    const wsNames = new Map(workspaces.map((w) => [w.id, w.name]));

    let query = this.supabase.db
      .from('clients')
      .select(`${CLIENT_COLUMNS}, workspaces(name)`)
      .is('deleted_at', null);

    if (workspaceId) {
      if (!accessibleIds.includes(workspaceId)) return [];
      query = query.eq('workspace_id', workspaceId);
    } else {
      query = query.in('workspace_id', accessibleIds);
    }

    const { data } = await query.order('name');

    return (data || []).map((row: any) => ({
      ...row,
      workspace_name: row.workspaces?.name ?? wsNames.get(row.workspace_id) ?? null,
      workspaces: undefined,
    }));
  }

  async create(workspaceId: string, userId: string, dto: CreateClientDto) {
    if (!dto.name) throw new BadRequestException('el nombre del cliente es obligatorio');

    const socialHandles = dto.social_handles || {};

    const { data, error } = await this.supabase.db
      .from('clients')
      .insert({
        workspace_id: workspaceId,
        name: dto.name,
        social_handles: socialHandles,
        notes: dto.notes || '',
        phone: dto.phone || '',
        email: dto.email || '',
        website: dto.website || '',
        color: isValidHexColor(dto.color) ? dto.color : null,
        created_by: userId,
        updated_by: userId,
      })
      .select(CLIENT_COLUMNS)
      .single();

    if (error) throw error;
    return data;
  }

  async get(workspaceId: string, id: string) {
    const { data } = await this.supabase.db
      .from('clients')
      .select(CLIENT_COLUMNS)
      .eq('id', id)
      .eq('workspace_id', workspaceId)
      .is('deleted_at', null)
      .single();

    if (!data) throw new NotFoundException({ code: 'not_found', message: ErrMsg.CLIENT_NOT_FOUND });
    return data;
  }

  async update(workspaceId: string, userId: string, id: string, dto: UpdateClientDto) {
    if (!dto.name) throw new BadRequestException('el nombre del cliente es obligatorio');

    const socialHandles = dto.social_handles || {};

    const update: any = {
      name: dto.name,
      social_handles: socialHandles,
      notes: dto.notes || '',
      phone: dto.phone || '',
      email: dto.email || '',
      website: dto.website || '',
      active: dto.active ?? true,
      updated_by: userId,
      updated_at: new Date().toISOString(),
    };
    if (dto.color !== undefined) {
      update.color = isValidHexColor(dto.color) ? dto.color : null;
    }

    const { data, error } = await this.supabase.db
      .from('clients')
      .update(update)
      .eq('id', id)
      .eq('workspace_id', workspaceId)
      .is('deleted_at', null)
      .select(CLIENT_COLUMNS)
      .single();

    if (!data) throw new NotFoundException({ code: 'not_found', message: ErrMsg.CLIENT_NOT_FOUND });
    return data;
  }

  async delete(workspaceId: string, id: string) {
    const { error } = await this.supabase.db
      .from('clients')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .eq('workspace_id', workspaceId)
      .is('deleted_at', null);

    if (error) throw new NotFoundException({ code: 'not_found', message: ErrMsg.CLIENT_NOT_FOUND });
  }
}
