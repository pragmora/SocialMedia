import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { CreatePaymentDto, UpdatePaymentDto } from './dto';
import { ErrMsg, InvalidReferenceError } from '../common/errors';

/**
 * Regla de dominio: un egreso (is_spent=true) siempre está cobrado.
 * Se normaliza en la capa de negocio para que la invariante no dependa
 * del valor que envíe el cliente.
 */
export function resolveMovementStatus(isSpent: boolean, status?: string): string {
  return isSpent ? 'paid' : status || 'pending';
}

@Injectable()
export class FinancesService {
  constructor(private readonly supabase: SupabaseService) {}

  async list(workspaceId: string, filters?: { client_id?: string; start_date?: string; end_date?: string; project_id?: string; is_spent?: string }) {
    let query = this.supabase.db
      .from('payments')
      .select('*, clients(name), projects(name)')
      .eq('workspace_id', workspaceId);

    if (filters?.client_id) {
      query = query.eq('client_id', filters.client_id);
    }
    if (filters?.project_id) {
      query = query.eq('project_id', filters.project_id);
    }
    if (filters?.is_spent !== undefined && filters.is_spent !== '') {
      query = query.eq('is_spent', filters.is_spent === 'true');
    }
    if (filters?.start_date) {
      query = query.gte('payment_date', filters.start_date);
    }
    if (filters?.end_date) {
      query = query.lte('payment_date', filters.end_date);
    }

    const { data } = await query.order('payment_date', { ascending: false });

    return (data || []).map((p: any) => ({
      ...p,
      client_name: p.clients?.name || null,
      project_name: p.projects?.name || null,
      clients: undefined,
      projects: undefined,
    }));
  }

  async create(workspaceId: string, userId: string, dto: CreatePaymentDto) {
    if (dto.client_id) {
      await this.validateClientInWorkspace(dto.client_id, workspaceId);
    }
    if (dto.project_id) {
      await this.validateProjectInWorkspace(dto.project_id, workspaceId);
    }

    const isSpent = dto.is_spent ?? false;

    const { data, error } = await this.supabase.db
      .from('payments')
      .insert({
        workspace_id: workspaceId,
        client_id: dto.client_id || null,
        amount: dto.amount,
        payment_date: dto.payment_date,
        payment_method: dto.payment_method || 'transferencia',
        status: resolveMovementStatus(isSpent, dto.status),
        notes: dto.notes || '',
        is_spent: isSpent,
        project_id: dto.project_id || null,
        created_by: userId,
      })
      .select('*')
      .single();

    if (error) throw error;
    return data;
  }

  async get(workspaceId: string, id: string) {
    const { data } = await this.supabase.db
      .from('payments')
      .select('*, clients(name), projects(name)')
      .eq('id', id)
      .eq('workspace_id', workspaceId)
      .single();

    if (!data) throw new NotFoundException({ code: 'not_found', message: 'pago no encontrado' });

    return {
      ...data,
      client_name: (data as any).clients?.name || null,
      project_name: (data as any).projects?.name || null,
      clients: undefined,
      projects: undefined,
    };
  }

  async update(workspaceId: string, userId: string, id: string, dto: UpdatePaymentDto) {
    if (dto.client_id) {
      await this.validateClientInWorkspace(dto.client_id, workspaceId);
    }
    if (dto.project_id) {
      await this.validateProjectInWorkspace(dto.project_id, workspaceId);
    }

    const isSpent = dto.is_spent ?? false;

    const { data, error } = await this.supabase.db
      .from('payments')
      .update({
        client_id: dto.client_id || null,
        amount: dto.amount,
        payment_date: dto.payment_date,
        payment_method: dto.payment_method || 'transferencia',
        status: resolveMovementStatus(isSpent, dto.status),
        notes: dto.notes || '',
        is_spent: isSpent,
        project_id: dto.project_id || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('workspace_id', workspaceId)
      .select('*')
      .single();

    if (!data) throw new NotFoundException({ code: 'not_found', message: 'pago no encontrado' });
    return data;
  }

  async delete(workspaceId: string, id: string) {
    const { error } = await this.supabase.db
      .from('payments')
      .delete()
      .eq('id', id)
      .eq('workspace_id', workspaceId);

    if (error) throw new NotFoundException({ code: 'not_found', message: 'pago no encontrado' });
  }

  async toggleStatus(workspaceId: string, id: string) {
    const { data: current } = await this.supabase.db
      .from('payments')
      .select('status, is_spent')
      .eq('id', id)
      .eq('workspace_id', workspaceId)
      .single();

    if (!current) throw new NotFoundException({ code: 'not_found', message: 'pago no encontrado' });

    if ((current as any).is_spent) {
      throw new BadRequestException({
        code: 'invalid_status',
        message: 'un egreso siempre está cobrado y no admite cambio de estado',
      });
    }

    const newStatus = current.status === 'paid' ? 'pending' : 'paid';

    const { data, error } = await this.supabase.db
      .from('payments')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('workspace_id', workspaceId)
      .select('*')
      .single();

    if (error) throw error;
    return data;
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
      throw new InvalidReferenceError('client_id', 'el cliente no pertenece a este espacio de trabajo');
    }
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
}
