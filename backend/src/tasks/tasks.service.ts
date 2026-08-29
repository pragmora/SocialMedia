import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateTaskDto, UpdateTaskDto } from './dto';
import { ErrMsg, InvalidReferenceError, InvalidFormatError } from '../common/errors';

@Injectable()
export class TasksService {
  constructor(private readonly supabase: SupabaseService) {}

  private async getSharedProjectIds(workspaceId: string): Promise<string[]> {
    const { data } = await this.supabase.db
      .from('workspace_projects')
      .select('project_id')
      .eq('workspace_id', workspaceId);
    return (data || []).map((r) => r.project_id);
  }

  async list(workspaceId: string, filters?: { content_item_id?: string; project_id?: string }) {
    const sharedProjectIds = await this.getSharedProjectIds(workspaceId);

    // Get content item IDs from shared projects
    let sharedContentIds: string[] = [];
    if (sharedProjectIds.length > 0) {
      const { data: sharedContent } = await this.supabase.db
        .from('content_items')
        .select('id')
        .in('project_id', sharedProjectIds);
      sharedContentIds = (sharedContent || []).map((c) => c.id);
    }

    // Build the filter: workspace tasks OR tasks linked to shared project content items
    const workspaceFilter = `workspace_id.eq.${workspaceId}`;
    const sharedContentFilter = sharedContentIds.length > 0 ? `content_item_id.in.(${sharedContentIds.join(',')})` : '';
    const filter = sharedContentFilter ? `${workspaceFilter},${sharedContentFilter}` : workspaceFilter;

    let query = this.supabase.db
      .from('tasks')
      .select('*, content_items(title), projects(name), clients(name)')
      .or(filter);

    if (filters?.content_item_id) {
      query = query.eq('content_item_id', filters.content_item_id);
    }
    if (filters?.project_id) {
      query = query.eq('project_id', filters.project_id);
    }

    const { data } = await query
      .order('end_date', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: false });

    return (data || []).map((row: any) => ({
      ...row,
      content_title: row.content_items?.title ?? null,
      project_name: row.projects?.name ?? null,
      client_name: row.clients?.name ?? null,
      content_items: undefined,
      projects: undefined,
      clients: undefined,
    }));
  }

  async create(workspaceId: string, userId: string, dto: CreateTaskDto) {
    if (!dto.title) throw new BadRequestException('el titulo de la tarea es obligatorio');

    if (dto.client_id) await this.validateClientInWorkspace(dto.client_id, workspaceId);
    if (dto.content_item_id) await this.validateContentInWorkspace(dto.content_item_id, workspaceId);
    if (dto.assignee_id) await this.validateMemberInWorkspace(dto.assignee_id, workspaceId);
    if (dto.project_id) await this.validateProjectInWorkspace(dto.project_id, workspaceId);

    const { data, error } = await this.supabase.db
      .from('tasks')
      .insert({
        workspace_id: workspaceId,
        title: dto.title,
        description: dto.description || '',
        assignee_id: dto.assignee_id || null,
        start_date: this.normalizeDate(dto.start_date),
        end_date: this.normalizeDate(dto.end_date),
        done: dto.done ?? false,
        content_item_id: dto.content_item_id || null,
        client_id: dto.client_id || null,
        project_id: dto.project_id || null,
        created_by: userId,
        updated_by: userId,
      })
      .select('*')
      .single();

    if (error) throw error;
    return data;
  }

  async get(workspaceId: string, id: string) {
    const sharedProjectIds = await this.getSharedProjectIds(workspaceId);

    let sharedContentIds: string[] = [];
    if (sharedProjectIds.length > 0) {
      const { data: sharedContent } = await this.supabase.db
        .from('content_items')
        .select('id')
        .in('project_id', sharedProjectIds);
      sharedContentIds = (sharedContent || []).map((c) => c.id);
    }

    const workspaceTaskFilter = `workspace_id.eq.${workspaceId}`;
    const sharedContentTaskFilter = sharedContentIds.length > 0 ? `content_item_id.in.(${sharedContentIds.join(',')})` : '';
    const locationFilter = sharedContentTaskFilter ? `${workspaceTaskFilter},${sharedContentTaskFilter}` : workspaceTaskFilter;

    const { data } = await this.supabase.db
      .from('tasks')
      .select('*, content_items(title), clients(name), projects(name), users!tasks_assignee_id_fkey(name, email)')
      .eq('id', id)
      .or(locationFilter)
      .single();

    if (!data) throw new NotFoundException({ code: 'not_found', message: ErrMsg.TASK_NOT_FOUND });

    const row: any = data;
    return {
      ...row,
      content_title: row.content_items?.title ?? null,
      client_name: row.clients?.name ?? null,
      project_name: row.projects?.name ?? null,
      assignee_name: row.users?.name ?? null,
      assignee_email: row.users?.email ?? null,
      content_items: undefined,
      clients: undefined,
      projects: undefined,
      users: undefined,
    };
  }

  async update(workspaceId: string, userId: string, id: string, dto: UpdateTaskDto) {
    if (!dto.title) throw new BadRequestException('el titulo de la tarea es obligatorio');

    if (dto.client_id) await this.validateClientInWorkspace(dto.client_id, workspaceId);
    if (dto.content_item_id) await this.validateContentInWorkspace(dto.content_item_id, workspaceId);
    if (dto.assignee_id) await this.validateMemberInWorkspace(dto.assignee_id, workspaceId);
    if (dto.project_id) await this.validateProjectInWorkspace(dto.project_id, workspaceId);

    const { data, error } = await this.supabase.db
      .from('tasks')
      .update({
        title: dto.title,
        description: dto.description || '',
        assignee_id: dto.assignee_id || null,
        start_date: this.normalizeDate(dto.start_date),
        end_date: this.normalizeDate(dto.end_date),
        done: dto.done ?? false,
        content_item_id: dto.content_item_id || null,
        client_id: dto.client_id || null,
        project_id: dto.project_id || null,
        updated_by: userId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('workspace_id', workspaceId)
      .select('*')
      .single();

    if (!data) throw new NotFoundException({ code: 'not_found', message: ErrMsg.TASK_NOT_FOUND });
    return data;
  }

  async assign(workspaceId: string, userId: string, id: string, assigneeId: string | null) {
    if (assigneeId) {
      await this.validateMemberInWorkspace(assigneeId, workspaceId);
    }

    const { data, error } = await this.supabase.db
      .from('tasks')
      .update({
        assignee_id: assigneeId || null,
        updated_by: userId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('workspace_id', workspaceId)
      .select('*')
      .single();

    if (error || !data) throw new NotFoundException({ code: 'not_found', message: ErrMsg.TASK_NOT_FOUND });
    return data;
  }

  async setDone(workspaceId: string, userId: string, id: string, done: boolean) {
    const { data, error } = await this.supabase.db
      .from('tasks')
      .update({
        done,
        updated_by: userId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('workspace_id', workspaceId)
      .select('*')
      .single();

    if (error || !data) throw new NotFoundException({ code: 'not_found', message: ErrMsg.TASK_NOT_FOUND });
    return data;
  }

  async delete(workspaceId: string, id: string) {
    const { error } = await this.supabase.db
      .from('tasks')
      .delete()
      .eq('id', id)
      .eq('workspace_id', workspaceId);

    if (error) throw new NotFoundException({ code: 'not_found', message: ErrMsg.TASK_NOT_FOUND });
  }

  private async validateClientInWorkspace(clientId: string, workspaceId: string) {
    const { data } = await this.supabase.db
      .from('clients')
      .select('id')
      .eq('id', clientId)
      .eq('workspace_id', workspaceId)
      .is('deleted_at', null)
      .single();

    if (!data) throw new InvalidReferenceError('client_id', 'el cliente no pertenece a este espacio de trabajo');
  }

  private async validateContentInWorkspace(contentItemId: string, workspaceId: string) {
    const sharedProjectIds = await this.getSharedProjectIds(workspaceId);

    const { data } = await this.supabase.db
      .from('content_items')
      .select('id')
      .eq('id', contentItemId)
      .or(`workspace_id.eq.${workspaceId}${sharedProjectIds.length > 0 ? `,project_id.in.(${sharedProjectIds.join(',')})` : ''}`)
      .single();

    if (!data) throw new InvalidReferenceError('content_item_id', 'el elemento de contenido no pertenece a este espacio de trabajo');
  }

  private async validateProjectInWorkspace(projectId: string, workspaceId: string) {
    const { data } = await this.supabase.db
      .from('workspace_projects')
      .select('project_id')
      .eq('project_id', projectId)
      .eq('workspace_id', workspaceId)
      .single();

    if (!data) {
      throw new InvalidReferenceError('project_id', 'el proyecto no pertenece a este espacio de trabajo');
    }
  }

  private async validateMemberInWorkspace(userId: string, workspaceId: string) {
    const { data } = await this.supabase.db
      .from('memberships')
      .select('user_id')
      .eq('user_id', userId)
      .eq('workspace_id', workspaceId)
      .single();

    if (!data) throw new InvalidReferenceError('assignee_id', 'el asignado no es miembro de este espacio de trabajo');
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
