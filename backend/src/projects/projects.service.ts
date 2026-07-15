import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateProjectDto, UpdateProjectDto } from './dto';
import { ErrMsg, InvalidReferenceError, InvalidFormatError } from '../common/errors';

@Injectable()
export class ProjectsService {
  constructor(private readonly supabase: SupabaseService) {}

  async list(workspaceId: string) {
    const { data } = await this.supabase.db
      .from('projects')
      .select('id, workspace_id, name, description, start_date, end_date, assignee_id, created_at, updated_at')
      .eq('workspace_id', workspaceId)
      .is('deleted_at', null)
      .order('name');

    return data || [];
  }

  async create(workspaceId: string, userId: string, dto: CreateProjectDto) {
    if (!dto.name) throw new BadRequestException('el nombre del proyecto es obligatorio');

    if (dto.assignee_id) {
      await this.validateMemberInWorkspace(dto.assignee_id, workspaceId);
    }

    const { data, error } = await this.supabase.db
      .from('projects')
      .insert({
        workspace_id: workspaceId,
        name: dto.name,
        description: dto.description || '',
        start_date: this.normalizeDate(dto.start_date),
        end_date: this.normalizeDate(dto.end_date),
        assignee_id: dto.assignee_id || null,
        created_by: userId,
        updated_by: userId,
      })
      .select('id, workspace_id, name, description, start_date, end_date, assignee_id, created_at, updated_at')
      .single();

    if (error) throw error;
    return data;
  }

  async get(workspaceId: string, id: string) {
    const { data } = await this.supabase.db
      .from('projects')
      .select('id, workspace_id, name, description, start_date, end_date, assignee_id, created_at, updated_at')
      .eq('id', id)
      .eq('workspace_id', workspaceId)
      .is('deleted_at', null)
      .single();

    if (!data) throw new NotFoundException({ code: 'not_found', message: ErrMsg.PROJECT_NOT_FOUND });
    return data;
  }

  async update(workspaceId: string, userId: string, id: string, dto: UpdateProjectDto) {
    if (!dto.name) throw new BadRequestException('el nombre del proyecto es obligatorio');

    if (dto.assignee_id) {
      await this.validateMemberInWorkspace(dto.assignee_id, workspaceId);
    }

    const { data, error } = await this.supabase.db
      .from('projects')
      .update({
        name: dto.name,
        description: dto.description || '',
        start_date: this.normalizeDate(dto.start_date),
        end_date: this.normalizeDate(dto.end_date),
        assignee_id: dto.assignee_id || null,
        updated_by: userId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('workspace_id', workspaceId)
      .is('deleted_at', null)
      .select('id, workspace_id, name, description, start_date, end_date, assignee_id, created_at, updated_at')
      .single();

    if (!data) throw new NotFoundException({ code: 'not_found', message: ErrMsg.PROJECT_NOT_FOUND });
    return data;
  }

  async delete(workspaceId: string, id: string) {
    const { error } = await this.supabase.db
      .from('projects')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .eq('workspace_id', workspaceId)
      .is('deleted_at', null);

    if (error) throw new NotFoundException({ code: 'not_found', message: ErrMsg.PROJECT_NOT_FOUND });
  }

  async assign(workspaceId: string, id: string, assigneeId: string | null) {
    if (assigneeId) {
      await this.validateMemberInWorkspace(assigneeId, workspaceId);
    }

    const { data, error } = await this.supabase.db
      .from('projects')
      .update({
        assignee_id: assigneeId || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('workspace_id', workspaceId)
      .is('deleted_at', null)
      .select('id, workspace_id, name, description, start_date, end_date, assignee_id, created_at, updated_at')
      .single();

    if (error) throw new NotFoundException({ code: 'not_found', message: ErrMsg.PROJECT_NOT_FOUND });
    return data;
  }

  private async validateMemberInWorkspace(userId: string, workspaceId: string) {
    const { data } = await this.supabase.db
      .from('memberships')
      .select('user_id')
      .eq('user_id', userId)
      .eq('workspace_id', workspaceId)
      .single();

    if (!data) {
      throw new InvalidReferenceError('assignee_id', 'el usuario asignado no es miembro de este espacio de trabajo');
    }
  }

  private normalizeDate(value?: string): string | null {
    if (!value) return null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
    const d = new Date(value);
    if (isNaN(d.getTime())) {
      throw new InvalidFormatError('date', value, 'YYYY-MM-DD o ISO 8601');
    }
    return d.toISOString().slice(0, 10);
  }
}
