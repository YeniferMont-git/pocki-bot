import { Module } from '@nestjs/common';
import { OpenaiService } from './openai.service';
import { ToolsModule } from '../tools/tools.module';

@Module({
  imports: [ToolsModule],
  providers: [OpenaiService],
  exports: [OpenaiService],
})
export class OpenaiModule {}
