import {
  Controller,
  Get,
  Post,
  Query,
  Body,
  Res,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { WhatsappService } from './whatsapp.service';

@Controller('webhook')
export class WhatsappController {
  private readonly logger = new Logger(WhatsappController.name);

  constructor(
    private readonly whatsappService: WhatsappService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * GET /webhook
   * Meta webhook verification handshake
   */
  @Get()
  verifyWebhook(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') token: string,
    @Query('hub.challenge') challenge: string,
    @Res() res: Response,
  ) {
    const verifyToken = this.configService.get('WHATSAPP_VERIFY_TOKEN');

    if (mode === 'subscribe' && token === verifyToken) {
      this.logger.log('✅ Webhook verified successfully');
      return res.status(HttpStatus.OK).send(challenge);
    }

    this.logger.warn('❌ Webhook verification failed');
    return res.status(HttpStatus.FORBIDDEN).send('Forbidden');
  }

  /**
   * POST /webhook
   * Receives incoming WhatsApp messages
   */
  @Post()
  @HttpCode(HttpStatus.OK)
  async handleMessage(@Body() body: any) {
    try {
      await this.whatsappService.processIncomingWebhook(body);
    } catch (error) {
      this.logger.error('Error processing webhook', error.stack);
    }
    // Always return 200 to Meta to avoid retries
    return { status: 'ok' };
  }
}
