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
    const { data: wpLinks } = await this.supabase.db
      .from('workspace_projects')
      .select('project_id')
      .eq('workspace_id', workspaceId);

    if (!wpLinks || wpLinks.length === 0) return [];

    const projectIds = wpLinks.map((wp) => wp.project_id);

    const { data } = await this.supabase.db
      .from('projects')
      .select('id, name, description, start_date, end_date, client_id, assignee_id, created_at, updated_at')
      .in('id', projectIds)
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
        client_id: dto.client_id || null,
        assignee_id: dto.assignee_id || null,
        created_by: userId,
        updated_by: userId,
      })
      .select('id, name, description, start_date, end_date, client_id, assignee_id, created_at, updated_at')
      .single();

    if (error) throw error;

    const workspaceIds = dto.workspace_ids && dto.workspace_ids.length > 0
      ? dto.workspace_ids
      : [workspaceId];

    const links = workspaceIds.map((wid) => ({
      workspace_id: wid,
      project_id: data.id,
    }));

    await this.supabase.db
      .from('workspace_projects')
      .insert(links);

    return { ...data, workspace_ids: workspaceIds };
  }

  async get(workspaceId: string, id: string) {
    const { data } = await this.supabase.db
      .from('projects')
      .select('id, name, description, start_date, end_date, client_id, assignee_id, created_at, updated_at')
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (!data) throw new NotFoundException({ code: 'not_found', message: ErrMsg.PROJECT_NOT_FOUND });

    const { data: wpLinks } = await this.supabase.db
      .from('workspace_projects')
      .select('workspace_id')
      .eq('project_id', id);

    const workspaceIds = (wpLinks || []).map((wp) => wp.workspace_id);

    return { ...data, workspace_ids: workspaceIds };
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
        client_id: dto.client_id || null,
        assignee_id: dto.assignee_id || null,
        updated_by: userId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .is('deleted_at', null)
      .select('id, name, description, start_date, end_date, client_id, assignee_id, created_at, updated_at')
      .single();

    if (!data) throw new NotFoundException({ code: 'not_found', message: ErrMsg.PROJECT_NOT_FOUND });

    if (dto.workspace_ids && dto.workspace_ids.length > 0) {
      await this.supabase.db
        .from('workspace_projects')
        .delete()
        .eq('project_id', id);

      const links = dto.workspace_ids.map((wid) => ({
        workspace_id: wid,
        project_id: id,
      }));

      await this.supabase.db
        .from('workspace_projects')
        .insert(links);
    }

    const { data: wpLinks } = await this.supabase.db
      .from('workspace_projects')
      .select('workspace_id')
      .eq('project_id', id);

    return { ...data, workspace_ids: (wpLinks || []).map((wp) => wp.workspace_id) };
  }

  async delete(workspaceId: string, id: string) {
    const { error } = await this.supabase.db
      .from('projects')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
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
      .is('deleted_at', null)
      .select('id, name, description, start_date, end_date, assignee_id, created_at, updated_at')
      .single();

    if (error || !data) throw new NotFoundException({ code: 'not_found', message: ErrMsg.PROJECT_NOT_FOUND });
    return data;
  }

  async listAllForWorkspaceSwitch(userId: string) {
    const { data: memberships } = await this.supabase.db
      .from('memberships')
      .select('workspace_id')
      .eq('user_id', userId);

    if (!memberships || memberships.length === 0) return [];

    const workspaceIds = memberships.map((m) => m.workspace_id);

    const { data: wpLinks } = await this.supabase.db
      .from('workspace_projects')
      .select('project_id, workspace_id')
      .in('workspace_id', workspaceIds);

    if (!wpLinks || wpLinks.length === 0) return [];

    const projectIds = [...new Set(wpLinks.map((wp) => wp.project_id))];

    const { data } = await this.supabase.db
      .from('projects')
      .select('id, name, description, start_date, end_date, client_id, assignee_id, created_at, updated_at')
      .in('id', projectIds)
      .is('deleted_at', null)
      .order('name');

    return data || [];
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
