import {
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ContentService } from './content.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { WorkspaceGuard } from '../common/workspace.guard';
import { WorkspaceId } from '../common/workspace.decorator';

@Controller('calendar')
@UseGuards(JwtAuthGuard, WorkspaceGuard)
export class CalendarController {
  constructor(private readonly svc: ContentService) {}

  @Get()
  listByMonth(
    @WorkspaceId() wsId: string,
    @Query('month') month?: string,
    @Query('client_id') client_id?: string,
    @Query('platform') platform?: string,
    @Query('status') status?: string,
    @Query('project_id') project_id?: string,
  ) {
    return this.svc.listByMonth(wsId, { month, client_id, platform, status, project_id });
  }
}
