import { Controller, Get, UseGuards } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { WorkspaceId } from '../common/workspace.decorator';

@Controller('dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(private readonly svc: DashboardService) {}

  @Get()
  summary(@WorkspaceId() wsId: string) {
    return this.svc.getSummary(wsId);
  }
}
