import {
  IsString,
  IsOptional,
  IsEnum,
} from 'class-validator';

export enum ContentStatus {
  Draft = 'draft',
  Review = 'review',
  Approved = 'approved',
  Published = 'published',
  Archived = 'archived',
}

export enum ContentPlatform {
  Instagram = 'instagram',
  Facebook = 'facebook',
  Twitter = 'twitter',
  LinkedIn = 'linkedin',
  TikTok = 'tiktok',
  YouTube = 'youtube',
  Other = 'other',
}

export enum ContentType {
  Post = 'post',
  Story = 'story',
  Reel = 'reel',
  Video = 'video',
  Carousel = 'carousel',
  Other = 'other',
}

export class CreateContentDto {
  @IsString()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(ContentPlatform)
  platform: ContentPlatform;

  @IsEnum(ContentType)
  content_type: ContentType;

  @IsOptional()
  client_id?: string;

  @IsOptional()
  assignee_id?: string;

  @IsOptional()
  project_id?: string;

  @IsOptional()
  scheduled_date?: string;

  @IsOptional()
  fecha_inicial?: string;

  @IsOptional()
  fecha_final?: string;
}

export class UpdateContentDto {
  @IsString()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(ContentPlatform)
  platform: ContentPlatform;

  @IsEnum(ContentType)
  content_type: ContentType;

  @IsOptional()
  client_id?: string;

  @IsOptional()
  assignee_id?: string;

  @IsOptional()
  project_id?: string;

  @IsOptional()
  scheduled_date?: string;

  @IsOptional()
  fecha_inicial?: string;

  @IsOptional()
  fecha_final?: string;
}

export class TransitionStatusDto {
  @IsEnum(ContentStatus)
  status: ContentStatus;
}
