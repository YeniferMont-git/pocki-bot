import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ToolsService } from './tools.service';

@Module({
  imports: [HttpModule],
  providers: [ToolsService],
  exports: [ToolsService],
})
export class ToolsModule {}
