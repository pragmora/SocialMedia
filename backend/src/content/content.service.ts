import {
  Injectable,
  NotFoundException,
  BadRequestException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateContentDto, UpdateContentDto, ContentStatus, TransitionStatusDto } from './dto';
import { ErrMsg, InvalidReferenceError, InvalidEnumError, InvalidFormatError, InvalidTransitionError } from '../common/errors';

const ALL_STATUSES = Object.values(ContentStatus);
const transitionMap: Record<string, string[]> = {};
for (const s of ALL_STATUSES) {
  transitionMap[s] = ALL_STATUSES.filter((t) => t !== s);
}

const validStatuses = Object.values(ContentStatus);
const validPlatforms = ['instagram', 'facebook', 'twitter', 'linkedin', 'tiktok', 'youtube', 'other'];
const validTypes = ['post', 'story', 'reel', 'video', 'carousel', 'other'];

@Injectable()
export class ContentService {
  constructor(private readonly supabase: SupabaseService) {}

  async list(
    workspaceId: string,
    filters?: { status?: string; client_id?: string; project_id?: string; assigned_to_me?: string },
  ) {
    let query = this.supabase.db
      .from('content_items')
      .select('id, workspace_id, client_id, project_id, title, description, platform, content_type, status, scheduled_date, fecha_inicial, fecha_final, assignee_id, created_by, created_at, updated_at')
      .eq('workspace_id', workspaceId);

    if (filters?.status) {
      if (!validStatuses.includes(filters.status as any)) {
        throw new BadRequestException({
          code: 'invalid_enum',
          message: `estado inválido: ${filters.status}`,
          details: { field: 'status', value: filters.status, allowed: validStatuses },
        });
      }
      query = query.eq('status', filters.status);
    }
    if (filters?.client_id) {
      query = query.eq('client_id', filters.client_id);
    }
    if (filters?.project_id) {
      query = query.eq('project_id', filters.project_id);
    }
    if (filters?.assigned_to_me) {
      query = query.eq('assignee_id', filters.assigned_to_me);
    }

    const { data } = await query.order('updated_at', { ascending: false });
    return data || [];
  }

  async create(workspaceId: string, userId: string, dto: CreateContentDto) {
    if (!dto.title) throw new BadRequestException('el título es obligatorio');
    this.validatePlatform(dto.platform);
    this.validateType(dto.content_type);

    if (dto.client_id) {
      await this.validateClientInWorkspace(dto.client_id, workspaceId);
    }
    if (dto.assignee_id) {
      await this.validateMemberInWorkspace(dto.assignee_id, workspaceId);
    }
    if (dto.project_id) {
      await this.validateProjectInWorkspace(dto.project_id, workspaceId);
    }

    const insert: any = {
      workspace_id: workspaceId,
      client_id: dto.client_id || null,
      project_id: dto.project_id || null,
      title: dto.title,
      description: dto.description || '',
      platform: dto.platform,
      content_type: dto.content_type,
      status: ContentStatus.Draft,
      scheduled_date: this.normalizeDate(dto.scheduled_date),
      fecha_inicial: this.normalizeDate(dto.fecha_inicial),
      fecha_final: this.normalizeDate(dto.fecha_final),
      created_by: userId,
      updated_by: userId,
    };
    if (dto.assignee_id) insert.assignee_id = dto.assignee_id;

    const { data, error } = await this.supabase.db
      .from('content_items')
      .insert(insert)
      .select('*')
      .single();

    if (error) throw error;
    return data;
  }

  async get(workspaceId: string, id: string) {
    const { data } = await this.supabase.db
      .from('content_items')
      .select('*')
      .eq('id', id)
      .eq('workspace_id', workspaceId)
      .single();

    if (!data) throw new NotFoundException({ code: 'not_found', message: ErrMsg.CONTENT_NOT_FOUND });

    // Load comments
    const { data: comments } = await this.supabase.db
      .from('comments')
      .select('id, content_item_id, author_id, body, created_at, users!inner(name, email)')
      .eq('content_item_id', id)
      .order('created_at', { ascending: true });

    data.comments = (comments || []).map((c: any) => ({
      ...c,
      author_name: c.users?.name,
      author_email: c.users?.email,
      users: undefined,
    }));

    return data;
  }

  async update(workspaceId: string, userId: string, id: string, dto: UpdateContentDto) {
    if (!dto.title) throw new BadRequestException('el título es obligatorio');
    this.validatePlatform(dto.platform);
    this.validateType(dto.content_type);

    if (dto.client_id) {
      await this.validateClientInWorkspace(dto.client_id, workspaceId);
    }
    if (dto.assignee_id) {
      await this.validateMemberInWorkspace(dto.assignee_id, workspaceId);
    }
    if (dto.project_id) {
      await this.validateProjectInWorkspace(dto.project_id, workspaceId);
    }

    const update: any = {
      title: dto.title,
      description: dto.description || '',
      platform: dto.platform,
      content_type: dto.content_type,
      client_id: dto.client_id || null,
      project_id: dto.project_id || null,
      scheduled_date: this.normalizeDate(dto.scheduled_date),
      fecha_inicial: this.normalizeDate(dto.fecha_inicial),
      fecha_final: this.normalizeDate(dto.fecha_final),
      updated_by: userId,
      updated_at: new Date().toISOString(),
    };
    if (dto.assignee_id !== undefined) update.assignee_id = dto.assignee_id || null;

    const { data, error } = await this.supabase.db
      .from('content_items')
      .update(update)
      .eq('id', id)
      .eq('workspace_id', workspaceId)
      .select('*')
      .single();

    if (!data) throw new NotFoundException({ code: 'not_found', message: ErrMsg.CONTENT_NOT_FOUND });
    return data;
  }

  async transitionStatus(
    workspaceId: string,
    id: string,
    dto: TransitionStatusDto,
  ) {
    const newStatus = dto.status;
    if (!validStatuses.includes(newStatus)) {
      throw new BadRequestException({
        code: 'invalid_enum',
        message: `estado inválido: ${newStatus}`,
        details: { field: 'status', value: newStatus, allowed: validStatuses },
      });
    }

    const item = await this.get(workspaceId, id);
    const allowed = transitionMap[item.status] || [];

    if (!allowed.includes(newStatus)) {
      throw new UnprocessableEntityException({
        code: 'invalid_transition',
        message: `cannot transition from ${item.status} to ${newStatus}`,
        details: { from: item.status, to: newStatus, allowed },
      });
    }

    const { data } = await this.supabase.db
      .from('content_items')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('workspace_id', workspaceId)
      .select('*')
      .single();

    if (!data) throw new NotFoundException({ code: 'not_found', message: ErrMsg.CONTENT_NOT_FOUND });
    return data;
  }

  async assign(workspaceId: string, id: string, assigneeId: string | null) {
    if (assigneeId) {
      await this.validateMemberInWorkspace(assigneeId, workspaceId);
    }

    const { data, error } = await this.supabase.db
      .from('content_items')
      .update({
        assignee_id: assigneeId || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('workspace_id', workspaceId)
      .select('*')
      .single();

    if (error) throw new NotFoundException({ code: 'not_found', message: ErrMsg.CONTENT_NOT_FOUND });
    return data;
  }

  async listByMonth(
    workspaceId: string,
    params: { month?: string; client_id?: string; platform?: string; status?: string },
  ) {
    const month = params.month || new Date().toISOString().slice(0, 7);
    const [year, mon] = month.split('-');
    const monthStart = `${year}-${mon}-01`;
    const nextMonth = new Date(parseInt(year), parseInt(mon), 1);
    const nextMonthStart = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, '0')}-01`;

    let query = this.supabase.db
      .from('content_items')
      .select('*')
      .eq('workspace_id', workspaceId)
      .gte('scheduled_date', monthStart)
      .lt('scheduled_date', nextMonthStart);

    if (params.client_id) query = query.eq('client_id', params.client_id);
    if (params.platform) query = query.eq('platform', params.platform);
    if (params.status) query = query.eq('status', params.status);

    const { data } = await query.order('scheduled_date', { ascending: true });

    const items = data || [];
    const countsByDay: Record<string, number> = {};
    for (const item of items) {
      if (item.scheduled_date) {
        countsByDay[item.scheduled_date] = (countsByDay[item.scheduled_date] || 0) + 1;
      }
    }

    return { items, counts_by_day: countsByDay };
  }

  private async validateProjectInWorkspace(projectId: string, workspaceId: string) {
    const { data } = await this.supabase.db
      .from('projects')
      .select('id')
      .eq('id', projectId)
      .eq('workspace_id', workspaceId)
      .is('deleted_at', null)
      .single();

    if (!data) {
      throw new InvalidReferenceError(
        'project_id',
        'el proyecto no pertenece a este espacio de trabajo',
      );
    }
  }

  private async validateClientInWorkspace(clientId: string, workspaceId: string) {
    const { data } = await this.supabase.db
      .from('clients')
      .select('id')
      .eq('id', clientId)
      .eq('workspace_id', workspaceId)
      .is('deleted_at', null)
      .single();

    if (!data) {
      throw new InvalidReferenceError(
        'client_id',
        'el cliente no pertenece a este espacio de trabajo',
      );
    }
  }

  private async validateMemberInWorkspace(userId: string, workspaceId: string) {
    const { data } = await this.supabase.db
      .from('memberships')
      .select('user_id')
      .eq('user_id', userId)
      .eq('workspace_id', workspaceId)
      .single();

    if (!data) {
      throw new InvalidReferenceError(
        'assignee_id',
        'el usuario asignado no es miembro de este espacio de trabajo',
      );
    }
  }

  private validatePlatform(platform: string) {
    if (!validPlatforms.includes(platform)) {
      throw new InvalidEnumError('platform', platform, validPlatforms);
    }
  }

  private validateType(type: string) {
    if (!validTypes.includes(type)) {
      throw new InvalidEnumError('content_type', type, validTypes);
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
