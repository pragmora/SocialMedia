import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { CreatePaymentDto, UpdatePaymentDto } from './dto';
import { ErrMsg, InvalidReferenceError } from '../common/errors';

@Injectable()
export class FinancesService {
  constructor(private readonly supabase: SupabaseService) {}

  async list(workspaceId: string, filters?: { client_id?: string; start_date?: string; end_date?: string }) {
    let query = this.supabase.db
      .from('payments')
      .select('*, clients(name)')
      .eq('workspace_id', workspaceId);

    if (filters?.client_id) {
      query = query.eq('client_id', filters.client_id);
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
      clients: undefined,
    }));
  }

  async create(workspaceId: string, userId: string, dto: CreatePaymentDto) {
    await this.validateClientInWorkspace(dto.client_id, workspaceId);

    const { data, error } = await this.supabase.db
      .from('payments')
      .insert({
        workspace_id: workspaceId,
        client_id: dto.client_id,
        amount: dto.amount,
        payment_date: dto.payment_date,
        payment_method: dto.payment_method || 'transferencia',
        status: dto.status || 'pending',
        notes: dto.notes || '',
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
      .select('*, clients(name)')
      .eq('id', id)
      .eq('workspace_id', workspaceId)
      .single();

    if (!data) throw new NotFoundException({ code: 'not_found', message: 'pago no encontrado' });

    return {
      ...data,
      client_name: (data as any).clients?.name || null,
      clients: undefined,
    };
  }

  async update(workspaceId: string, userId: string, id: string, dto: UpdatePaymentDto) {
    await this.validateClientInWorkspace(dto.client_id, workspaceId);

    const { data, error } = await this.supabase.db
      .from('payments')
      .update({
        client_id: dto.client_id,
        amount: dto.amount,
        payment_date: dto.payment_date,
        payment_method: dto.payment_method || 'transferencia',
        status: dto.status || 'pending',
        notes: dto.notes || '',
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
      .select('status')
      .eq('id', id)
      .eq('workspace_id', workspaceId)
      .single();

    if (!current) throw new NotFoundException({ code: 'not_found', message: 'pago no encontrado' });

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
}
