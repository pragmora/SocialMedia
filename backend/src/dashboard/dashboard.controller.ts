import { Controller, Get, UseGuards } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { WorkspaceGuard } from '../common/workspace.guard';
import { PermissionGuard } from '../common/permission.guard';
import { Permission } from '../common/permission.decorator';
import { WorkspaceId } from '../common/workspace.decorator';

@Controller('dashboard')
@UseGuards(JwtAuthGuard, WorkspaceGuard, PermissionGuard)
export class DashboardController {
  constructor(private readonly svc: DashboardService) {}

  @Get()
  @Permission('dashboard', 'view')
  summary(@WorkspaceId() wsId: string) {
    return this.svc.getSummary(wsId);
  }
}
