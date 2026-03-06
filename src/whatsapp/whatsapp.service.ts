import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { firstValueFrom } from 'rxjs';
import { OpenaiService } from '../openai/openai.service';
import { Message, MessageRole } from '../database/entities/message.entity';

@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name);
  private readonly apiUrl: string;
  private readonly accessToken: string;
  private readonly phoneNumberId: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly openaiService: OpenaiService,
    @InjectRepository(Message)
    private readonly messageRepository: Repository<Message>,
  ) {
    const version = this.configService.get('WHATSAPP_API_VERSION', 'v18.0');
    this.phoneNumberId = this.configService.get('WHATSAPP_PHONE_NUMBER_ID');
    this.accessToken = this.configService.get('WHATSAPP_ACCESS_TOKEN');
    this.apiUrl = `https://graph.facebook.com/${version}/${this.phoneNumberId}/messages`;
  }

  /**
   * Entry point: parse webhook payload and route to handler
   */
  async processIncomingWebhook(body: any): Promise<void> {
    const entry = body?.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;

    // Ignore status updates (delivered, read, etc.)
    if (!value?.messages) return;

    const message = value.messages[0];
    const from = message.from; // sender's phone number

    if (message.type === 'text') {
      const userText = message.text.body;
      this.logger.log(`📩 Message from ${from}: ${userText}`);

      await this.handleTextMessage(from, userText);
    }
  }

  /**
   * Core flow:
   * 1. Persist user message
   * 2. Build conversation history
   * 3. Call OpenAI (with tool support)
   * 4. Persist assistant reply
   * 5. Send reply via WhatsApp API
   */
  private async handleTextMessage(from: string, text: string): Promise<void> {
    // 1. Save user message
    await this.saveMessage(from, MessageRole.USER, text);

    // 2. Load last 10 messages for context
    const history = await this.getConversationHistory(from);

    // 3. Get AI response (OpenAI handles tool calls internally)
    const { reply, toolUsed } = await this.openaiService.chat(history);

    // 4. Save assistant response
    await this.saveMessage(from, MessageRole.ASSISTANT, reply, toolUsed);

    // 5. Send reply back via WhatsApp
    await this.sendTextMessage(from, reply);
  }

  /**
   * Send a text message via Meta WhatsApp Cloud API
   */
  async sendTextMessage(to: string, text: string): Promise<void> {
    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'text',
      text: { body: text },
    };

    try {
      await firstValueFrom(
        this.httpService.post(this.apiUrl, payload, {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
        }),
      );
      this.logger.log(`✅ Message sent to ${to}`);
    } catch (error) {
      this.logger.error(
        `❌ Failed to send message to ${to}`,
        error?.response?.data,
      );
    }
  }

  // ─── Database helpers ───────────────────────────────────────────────────────

  private async saveMessage(
    phoneNumber: string,
    role: MessageRole,
    content: string,
    toolUsed?: string,
  ): Promise<void> {
    const msg = this.messageRepository.create({
      phoneNumber,
      role,
      content,
      toolUsed,
    });
    await this.messageRepository.save(msg);
  }

  private async getConversationHistory(
    phoneNumber: string,
  ): Promise<{ role: string; content: string }[]> {
    const messages = await this.messageRepository.find({
      where: { phoneNumber },
      order: { createdAt: 'DESC' },
      take: 10,
    });

    // Reverse to chronological order
    return messages
      .reverse()
      .map((m) => ({ role: m.role, content: m.content }));
  }
}
