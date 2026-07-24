import { IsString, IsOptional, IsArray } from 'class-validator';

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
  client_id?: string;

  @IsOptional()
  assignee_id?: string;

  @IsArray()
  @IsOptional()
  workspace_ids?: string[];
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
  client_id?: string;

  @IsOptional()
  assignee_id?: string;

  @IsArray()
  @IsOptional()
  workspace_ids?: string[];
}
