import { IsString, IsOptional } from 'class-validator';

export class CreateProjectDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsOptional()
  start_date?: string;

  @IsOptional()
  end_date?: string;

  @IsOptional()
  assignee_id?: string;
}

export class UpdateProjectDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsOptional()
  start_date?: string;

  @IsOptional()
  end_date?: string;

  @IsOptional()
  assignee_id?: string;
}
