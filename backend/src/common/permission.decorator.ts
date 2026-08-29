import { SetMetadata } from '@nestjs/common';
import { PERMISSION_KEY } from './permission.guard';

export const Permission = (module: string, action: string) =>
  SetMetadata(PERMISSION_KEY, { module, action });
