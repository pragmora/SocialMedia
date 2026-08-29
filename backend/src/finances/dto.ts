import { IsString, IsOptional, IsNumber, IsDateString, IsIn, IsBoolean } from 'class-validator';

export class CreatePaymentDto {
  @IsString()
  @IsOptional()
  client_id?: string;

  @IsNumber()
  amount: number;

  @IsDateString()
  payment_date: string;

  @IsString()
  @IsOptional()
  @IsIn(['transferencia', 'efectivo', 'tarjeta', 'otro'])
  payment_method?: string;

  @IsString()
  @IsOptional()
  @IsIn(['pending', 'paid'])
  status?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsBoolean()
  @IsOptional()
  is_spent?: boolean;

  @IsString()
  @IsOptional()
  project_id?: string;
}

export class UpdatePaymentDto {
  @IsString()
  @IsOptional()
  client_id?: string;

  @IsNumber()
  amount: number;

  @IsDateString()
  payment_date: string;

  @IsString()
  @IsOptional()
  @IsIn(['transferencia', 'efectivo', 'tarjeta', 'otro'])
  payment_method?: string;

  @IsString()
  @IsOptional()
  @IsIn(['pending', 'paid'])
  status?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsBoolean()
  @IsOptional()
  is_spent?: boolean;

  @IsString()
  @IsOptional()
  project_id?: string;
}
