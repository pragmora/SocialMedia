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

  private async getSharedProjectIds(workspaceId: string): Promise<string[]> {
    const { data } = await this.supabase.db
      .from('workspace_projects')
      .select('project_id')
      .eq('workspace_id', workspaceId);
    return (data || []).map((r) => r.project_id);
  }

  async list(
    workspaceId: string,
    filters?: { status?: string; client_id?: string; project_id?: string; assigned_to_me?: string },
  ) {
    const sharedProjectIds = await this.getSharedProjectIds(workspaceId);

    let query = this.supabase.db
      .from('content_items')
      .select('id, workspace_id, client_id, project_id, title, description, platform, content_type, status, scheduled_date, fecha_inicial, fecha_final, assignee_id, created_by, created_at, updated_at')
      .or(`workspace_id.eq.${workspaceId}${sharedProjectIds.length > 0 ? `,project_id.in.(${sharedProjectIds.join(',')})` : ''}`);

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
      status: ContentStatus.PreProduccion,
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
    params: { month?: string; client_id?: string; platform?: string; status?: string; project_id?: string },
  ) {
    const month = params.month || new Date().toISOString().slice(0, 7);
    const [year, mon] = month.split('-');
    const monthStart = `${year}-${mon}-01`;
    const nextMonth = new Date(parseInt(year), parseInt(mon), 1);
    const nextMonthStart = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, '0')}-01`;

    const sharedProjectIds = await this.getSharedProjectIds(workspaceId);

    let contentQuery = this.supabase.db
      .from('content_items')
      .select('id, title, platform, content_type, status, scheduled_date, fecha_inicial, fecha_final, project_id')
      .or(`workspace_id.eq.${workspaceId}${sharedProjectIds.length > 0 ? `,project_id.in.(${sharedProjectIds.join(',')})` : ''}`)
      .gte('scheduled_date', monthStart)
      .lt('scheduled_date', nextMonthStart);

    if (params.client_id) contentQuery = contentQuery.eq('client_id', params.client_id);
    if (params.platform) contentQuery = contentQuery.eq('platform', params.platform);
    if (params.status) contentQuery = contentQuery.eq('status', params.status);
    if (params.project_id) contentQuery = contentQuery.eq('project_id', params.project_id);

    const { data: contentData } = await contentQuery.order('scheduled_date', { ascending: true });

    // Fetch tasks for the workspace (including shared projects) in this month
    // First get content item IDs from shared projects
    let sharedContentIds: string[] = [];
    if (sharedProjectIds.length > 0) {
      const { data: sharedContent } = await this.supabase.db
        .from('content_items')
        .select('id')
        .in('project_id', sharedProjectIds);
      sharedContentIds = (sharedContent || []).map((c) => c.id);
    }

    // Build task filter: workspace tasks OR tasks linked to shared project content
    const workspaceTaskFilter = `workspace_id.eq.${workspaceId}`;
    const sharedContentTaskFilter = sharedContentIds.length > 0 ? `content_item_id.in.(${sharedContentIds.join(',')})` : '';
    const taskLocationFilter = sharedContentTaskFilter ? `${workspaceTaskFilter},${sharedContentTaskFilter}` : workspaceTaskFilter;

    let tasksQuery = this.supabase.db
      .from('tasks')
      .select('id, title, start_date, end_date, done, content_item_id, client_id')
      .or(taskLocationFilter)
      .or(
        `and(end_date.gte.${monthStart},end_date.lt.${nextMonthStart}),` +
        `and(start_date.gte.${monthStart},start_date.lt.${nextMonthStart})`
      );

    if (params.project_id) {
      const { data: projectContent } = await this.supabase.db
        .from('content_items')
        .select('id')
        .eq('project_id', params.project_id);

      const contentIds = (projectContent || []).map((c) => c.id);
      if (contentIds.length > 0) {
        tasksQuery = tasksQuery.in('content_item_id', contentIds);
      } else {
        tasksQuery = tasksQuery.eq('content_item_id', '__none__');
      }
    }

    const { data: tasksData } = await tasksQuery;

    // Fetch project dates if project_id is specified
    let projectDates: { start_date: string | null; end_date: string | null } | null = null;
    if (params.project_id) {
      const { data: project } = await this.supabase.db
        .from('projects')
        .select('start_date, end_date')
        .eq('id', params.project_id)
        .is('deleted_at', null)
        .single();

      if (project) {
        projectDates = { start_date: project.start_date, end_date: project.end_date };
      }
    }

    // Fetch payments for the month
    let paymentsQuery = this.supabase.db
      .from('payments')
      .select('id, client_id, amount, payment_date, payment_method, status, notes')
      .eq('workspace_id', workspaceId)
      .gte('payment_date', monthStart)
      .lt('payment_date', nextMonthStart);

    if (params.client_id) paymentsQuery = paymentsQuery.eq('client_id', params.client_id);

    const { data: paymentsData } = await paymentsQuery;

    // Merge content items and tasks into unified items for calendar display
    const items = [
      ...(contentData || []).map((c) => ({
        id: c.id,
        title: c.title,
        platform: c.platform,
        content_type: c.content_type,
        status: c.status,
        scheduled_date: c.scheduled_date,
        fecha_inicial: c.fecha_inicial,
        fecha_final: c.fecha_final,
        type: 'content' as const,
      })),
      ...(tasksData || []).map((t) => ({
        id: t.id,
        title: `📋 ${t.title}`,
        platform: 'other',
        content_type: 'other',
        status: t.done ? 'subido' : 'pre_produccion',
        scheduled_date: t.end_date || t.start_date,
        fecha_inicial: t.start_date,
        fecha_final: t.end_date,
        type: 'task' as const,
      })),
    ];

    const payments = (paymentsData || []).map((p) => ({
      id: p.id,
      title: `💰 Pago $${p.amount}`,
      platform: 'other',
      content_type: 'other',
      status: 'subido',
      scheduled_date: p.payment_date,
      fecha_inicial: null,
      fecha_final: null,
      type: 'payment' as const,
      amount: p.amount,
      payment_status: p.status || 'pending',
    }));

    const allItems = [...items, ...payments];

    const countsByDay: Record<string, number> = {};
    for (const item of allItems) {
      if (item.scheduled_date) {
        countsByDay[item.scheduled_date] = (countsByDay[item.scheduled_date] || 0) + 1;
      }
    }

    return { items: allItems, counts_by_day: countsByDay, project_dates: projectDates };
  }

  async delete(workspaceId: string, id: string) {
    const { error } = await this.supabase.db
      .from('content_items')
      .delete()
      .eq('id', id)
      .eq('workspace_id', workspaceId);

    if (error) throw new NotFoundException({ code: 'not_found', message: ErrMsg.CONTENT_NOT_FOUND });
  }

  private async validateProjectInWorkspace(projectId: string, workspaceId: string) {
    const { data } = await this.supabase.db
      .from('workspace_projects')
      .select('project_id')
      .eq('project_id', projectId)
      .eq('workspace_id', workspaceId)
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
