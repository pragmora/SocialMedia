import {
  IsString,
  IsOptional,
  IsBoolean,
  Matches,
} from 'class-validator';

export class CreateTaskDto {
  @IsString()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsOptional()
  assignee_id?: string;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'formato de fecha debe ser YYYY-MM-DD' })
  start_date?: string;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'formato de fecha debe ser YYYY-MM-DD' })
  end_date?: string;

  @IsBoolean()
  @IsOptional()
  done?: boolean;

  @IsOptional()
  content_item_id?: string;

  @IsOptional()
  client_id?: string;

  @IsOptional()
  project_id?: string;
}

export class UpdateTaskDto {
  @IsString()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsOptional()
  assignee_id?: string;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'formato de fecha debe ser YYYY-MM-DD' })
  start_date?: string;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'formato de fecha debe ser YYYY-MM-DD' })
  end_date?: string;

  @IsBoolean()
  @IsOptional()
  done?: boolean;

  @IsOptional()
  content_item_id?: string;

  @IsOptional()
  client_id?: string;

  @IsOptional()
  project_id?: string;
}
