import { Module, forwardRef } from '@nestjs/common';
import { ContentController } from './content.controller';
import { ContentService } from './content.service';
import { CalendarController } from './calendar.controller';
import { ContentTasksController } from './content-tasks.controller';
import { TasksModule } from '../tasks/tasks.module';

@Module({
  imports: [forwardRef(() => TasksModule)],
  controllers: [ContentController, CalendarController, ContentTasksController],
  providers: [ContentService],
  exports: [ContentService],
})
export class ContentModule {}
