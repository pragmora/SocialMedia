import { IsString, IsOptional, IsNumber, IsDateString, IsIn } from 'class-validator';

export class CreatePaymentDto {
  @IsString()
  client_id: string;

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
}

export class UpdatePaymentDto {
  @IsString()
  client_id: string;

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
}
