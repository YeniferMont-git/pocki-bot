import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WhatsappModule } from './whatsapp/whatsapp.module';
import { OpenaiModule } from './openai/openai.module';
import { ToolsModule } from './tools/tools.module';
import { Message } from './database/entities/message.entity';

@Module({
  imports: [
    // Global config (.env)
    ConfigModule.forRoot({ isGlobal: true }),

    // Database connection
    TypeOrmModule.forRootAsync({
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: (config: ConfigService) => ({
    type: 'mysql',
    host: config.get('DB_HOST', 'localhost'),
    port: config.get<number>('DB_PORT', 3306),
    username: config.get('DB_USERNAME', 'root'),
    password: config.get('DB_PASSWORD', ''),
    database: config.get('DB_NAME', 'pocki_db'),
    entities: [Message],
    synchronize: config.get('DB_SYNCHRONIZE', 'true') === 'true',
    logging: config.get('NODE_ENV') === 'development',
  }),
}),

    WhatsappModule,
    OpenaiModule,
    ToolsModule,
  ],
})
export class AppModule {}
