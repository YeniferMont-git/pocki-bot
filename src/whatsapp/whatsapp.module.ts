import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WhatsappController } from './whatsapp.controller';
import { WhatsappService } from './whatsapp.service';
import { OpenaiModule } from '../openai/openai.module';
import { ToolsModule } from '../tools/tools.module';
import { Message } from '../database/entities/message.entity';

@Module({
  imports: [
    HttpModule,
    TypeOrmModule.forFeature([Message]),
    OpenaiModule,
    ToolsModule,
  ],
  controllers: [WhatsappController],
  providers: [WhatsappService],
})
export class WhatsappModule {}
