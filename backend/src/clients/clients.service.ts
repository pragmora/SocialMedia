import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateClientDto, UpdateClientDto } from './dto';
import { ErrMsg } from '../common/errors';

@Injectable()
export class ClientsService {
  constructor(private readonly supabase: SupabaseService) {}

  async list(workspaceId: string) {
    const { data } = await this.supabase.db
      .from('clients')
      .select('id, workspace_id, name, social_handles, notes, active, created_at, updated_at')
      .eq('workspace_id', workspaceId)
      .is('deleted_at', null)
      .order('name');

    return data || [];
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
        created_by: userId,
        updated_by: userId,
      })
      .select('id, workspace_id, name, social_handles, notes, active, created_at, updated_at')
      .single();

    if (error) throw error;
    return data;
  }

  async get(workspaceId: string, id: string) {
    const { data } = await this.supabase.db
      .from('clients')
      .select('id, workspace_id, name, social_handles, notes, active, created_at, updated_at')
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

    const { data, error } = await this.supabase.db
      .from('clients')
      .update({
        name: dto.name,
        social_handles: socialHandles,
        notes: dto.notes || '',
        active: dto.active ?? true,
        updated_by: userId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('workspace_id', workspaceId)
      .is('deleted_at', null)
      .select('id, workspace_id, name, social_handles, notes, active, created_at, updated_at')
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
