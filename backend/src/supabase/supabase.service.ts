import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseService implements OnModuleInit {
  private readonly logger = new Logger(SupabaseService.name);
  public client: SupabaseClient;

  constructor(private config: ConfigService) {}

  async onModuleInit() {
    const url = this.config.get<string>('SUPABASE_URL');
    const key = this.config.get<string>('SUPABASE_SERVICE_KEY');

    if (!url || !key) {
      throw new Error(
        'SUPABASE_URL and SUPABASE_SERVICE_KEY must be defined in .env',
      );
    }

    this.client = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { error } = await this.client
      .from('users')
      .select('id')
      .limit(1);

    if (error) {
      this.logger.error(
        `Supabase connection failed: ${error.message} (code: ${error.code})`,
      );
      throw new Error(
        `No se pudo conectar a Supabase: ${error.message}. ` +
        `Verificá que SUPABASE_URL y SUPABASE_SERVICE_KEY sean correctos en .env`,
      );
    }

    this.logger.log('Supabase connection OK');
  }

  get db() {
    return this.client;
  }
}
