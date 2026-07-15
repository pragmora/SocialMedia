import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsString()
  @IsOptional()
  name?: string;
}

export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  password: string;
}

export class SwitchWorkspaceDto {
  @IsString()
  workspace_id: string;
}

export class AuthResponse {
  token: string;
  user: {
    id: string;
    email: string;
    name: string;
  };
}
