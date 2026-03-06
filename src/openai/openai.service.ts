import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { ToolsService } from '../tools/tools.service';

@Injectable()
export class OpenaiService {
  private readonly logger = new Logger(OpenaiService.name);
  private readonly client: OpenAI;
  private readonly model: string;

  // OpenAI function definitions for tool calling
  private readonly tools: OpenAI.Chat.Completions.ChatCompletionTool[] = [
    {
      type: 'function',
      function: {
        name: 'get_dollar_rate',
        description:
          'Get the current USD to COP exchange rate (TRM - Tasa Representativa del Mercado). ' +
          'Use this when the user asks about the dollar price, exchange rate, TRM, or currency conversion.',
        parameters: {
          type: 'object',
          properties: {},
          required: [],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'get_tech_news',
        description:
          'Fetch the latest technology news headlines. ' +
          'Use this when the user asks about tech news, technology articles, or what is happening in tech.',
        parameters: {
          type: 'object',
          properties: {
            keyword: {
              type: 'string',
              description:
                'Optional keyword to filter news (e.g., "AI", "blockchain", "Apple"). ' +
                'Leave empty for general tech news.',
            },
          },
          required: [],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'search_web',
        description:
          'Search for publicly available structured information from the web. ' +
          'Use this for general queries that require up-to-date information.',
        parameters: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'The search query string.',
            },
          },
          required: ['query'],
        },
      },
    },
  ];

  constructor(
    private readonly configService: ConfigService,
    private readonly toolsService: ToolsService,
  ) {
    this.client = new OpenAI({
      apiKey: this.configService.get('OPENAI_API_KEY'),
      baseURL: 'https://api.groq.com/openai/v1',
    });
    this.model = this.configService.get('OPENAI_MODEL', 'llama-3.3-70b-versatile');
  }

  /**
   * Main chat method with tool calling support.
   * Implements an agentic loop: if the model calls a tool, execute it and continue.
   */
  async chat(
    history: { role: string; content: string }[],
  ): Promise<{ reply: string; toolUsed?: string }> {
    const systemMessage: OpenAI.Chat.Completions.ChatCompletionMessageParam = {
      role: 'system',
      content: `Eres Pocki, un asistente virtual inteligente de C-Pocket. 
Eres amable, conciso y útil. Respondes siempre en el idioma del usuario.
Tienes acceso a herramientas para obtener información en tiempo real.
Cuando el usuario pregunte sobre el dólar, noticias de tecnología u otras consultas que requieran datos actuales, usa las herramientas disponibles.
Mantén respuestas cortas y claras ya que se envían por WhatsApp.`,
    };

    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      systemMessage,
      ...history.map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
    ];

    let toolUsed: string | undefined;

    // First call — model may respond or request a tool
    const response = await this.client.chat.completions.create({
      model: this.model,
      messages,
      tools: this.tools,
      tool_choice: 'auto',
    });

    const choice = response.choices[0];

    // If no tool is needed, return text directly
    if (choice.finish_reason !== 'tool_calls') {
      return { reply: choice.message.content ?? '' };
    }

    // ── Tool execution loop ──────────────────────────────────────────────────
    const assistantMessage = choice.message;
    messages.push(assistantMessage);

    for (const toolCall of assistantMessage.tool_calls ?? []) {
      const fnName = toolCall.function.name;
      const args = JSON.parse(toolCall.function.arguments || '{}');

      this.logger.log(`🔧 Executing tool: ${fnName} with args: ${JSON.stringify(args)}`);
      toolUsed = fnName;

      let toolResult: string;
      try {
        toolResult = await this.executeToolCall(fnName, args);
      } catch (err) {
        toolResult = `Error executing tool ${fnName}: ${err.message}`;
        this.logger.error(toolResult);
      }

      messages.push({
        role: 'tool',
        tool_call_id: toolCall.id,
        content: toolResult,
      });
    }

    // Second call — model synthesizes tool results into a final answer
    const finalResponse = await this.client.chat.completions.create({
      model: this.model,
      messages,
    });

    return {
      reply: finalResponse.choices[0].message.content ?? '',
      toolUsed,
    };
  }

  /**
   * Route tool calls to the appropriate service method
   */
  private async executeToolCall(name: string, args: any): Promise<string> {
    switch (name) {
      case 'get_dollar_rate':
        return this.toolsService.getDollarRate();

      case 'get_tech_news':
        return this.toolsService.getTechNews(args.keyword);

      case 'search_web':
        return this.toolsService.searchWeb(args.query);

      default:
        return `Tool "${name}" not found.`;
    }
  }
}
