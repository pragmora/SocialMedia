import { IsString, IsOptional, IsBoolean, Matches } from 'class-validator';

export class CreateClientDto {
  @IsString()
  name: string;

  @IsOptional()
  social_handles?: any;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  website?: string;

  @IsBoolean()
  @IsOptional()
  active?: boolean;

  @IsOptional()
  @Matches(/^#[0-9A-Fa-f]{6}$/, {
    message: 'el color debe ser un hexadecimal #RRGGBB',
  })
  color?: string;
}

export class UpdateClientDto {
  @IsString()
  name: string;

  @IsOptional()
  social_handles?: any;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  website?: string;

  @IsBoolean()
  @IsOptional()
  active?: boolean;

  @IsOptional()
  @Matches(/^#[0-9A-Fa-f]{6}$/, {
    message: 'el color debe ser un hexadecimal #RRGGBB',
  })
  color?: string;
}
