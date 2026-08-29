import {
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ContentService } from './content.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { WorkspaceGuard } from '../common/workspace.guard';
import { PermissionGuard } from '../common/permission.guard';
import { Permission } from '../common/permission.decorator';
import { WorkspaceId } from '../common/workspace.decorator';

@Controller('calendar')
@UseGuards(JwtAuthGuard, WorkspaceGuard, PermissionGuard)
export class CalendarController {
  constructor(private readonly svc: ContentService) {}

  @Get()
  @Permission('calendar', 'view')
  listByMonth(
    @WorkspaceId() wsId: string,
    @Query('month') month?: string,
    @Query('year') year?: string,
    @Query('client_id') client_id?: string,
    @Query('platform') platform?: string,
    @Query('status') status?: string,
    @Query('project_id') project_id?: string,
    @Query('assignee_id') assignee_id?: string,
  ) {
    return this.svc.listByMonth(wsId, { month, year, client_id, platform, status, project_id, assignee_id });
  }
}
