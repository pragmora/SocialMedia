import { IsString, IsOptional, IsInt, Min, IsEmail } from 'class-validator';

export class CreateWorkspaceDto {
  @IsString()
  name: string;
}

export class UpdateWorkspaceDto {
  @IsString()
  name: string;
}

export class CreateInviteDto {
  @IsInt()
  @Min(1)
  @IsOptional()
  max_uses?: number;

  @IsInt()
  @IsOptional()
  expires_in_hours?: number;
}

export class UpdateMemberRoleDto {
  @IsString()
  role: string;
}

export class AddMemberDto {
  @IsEmail()
  email: string;

  @IsString()
  @IsOptional()
  role?: string;
}
