import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import * as cheerio from 'cheerio';

@Injectable()
export class ToolsService {
  private readonly logger = new Logger(ToolsService.name);

  constructor(private readonly httpService: HttpService) {}

  // ─────────────────────────────────────────────────────────────────────────────
  // TOOL 1: Dollar / TRM Rate Scraper
  // Scrapes the current USD→COP exchange rate (TRM) from Banco de la República
  // ─────────────────────────────────────────────────────────────────────────────
  async getDollarRate(): Promise<string> {
    try {
      // Banco de la República Colombia – official TRM source
      const url =
        'https://www.datos.gov.co/resource/32sa-8pi3.json?$limit=1&$order=vigenciadesde DESC';

      const { data } = await firstValueFrom(
        this.httpService.get(url, {
          headers: { 'Content-Type': 'application/json' },
        }),
      );

      if (data && data.length > 0) {
        const record = data[0];
        const rate = parseFloat(record.valor).toLocaleString('es-CO', {
          style: 'currency',
          currency: 'COP',
          minimumFractionDigits: 2,
        });
        const date = new Date(record.vigenciadesde).toLocaleDateString('es-CO');
        return `💵 TRM actual (${date}): ${rate} por 1 USD`;
      }

      return 'No se pudo obtener la TRM en este momento.';
    } catch (error) {
      this.logger.error('Error fetching TRM', error.message);
      return this.getFallbackDollarRate();
    }
  }

  /**
   * Fallback: scrape Superintendencia Financiera de Colombia
   */
  private async getFallbackDollarRate(): Promise<string> {
    try {
      const { data: html } = await firstValueFrom(
        this.httpService.get(
          'https://www.superfinanciera.gov.co/inicio/60819',
          { headers: { 'User-Agent': 'Mozilla/5.0' } },
        ),
      );

      const $ = cheerio.load(html);
      const trmText = $('td:contains("TRM")').next('td').text().trim();

      if (trmText) {
        return `💵 TRM actual: ${trmText} COP por 1 USD`;
      }
      return '⚠️ No se pudo obtener la TRM en este momento. Intenta más tarde.';
    } catch (err) {
      return '⚠️ No se pudo obtener la TRM en este momento. Intenta más tarde.';
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // TOOL 2: Tech News Scraper
  // Scrapes technology news headlines from TechCrunch RSS feed
  // ─────────────────────────────────────────────────────────────────────────────
  async getTechNews(keyword?: string): Promise<string> {
    try {
      const rssUrl = 'https://techcrunch.com/feed/';

      const { data: xml } = await firstValueFrom(
        this.httpService.get(rssUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0',
            Accept: 'application/rss+xml, text/xml',
          },
        }),
      );

      const $ = cheerio.load(xml, { xmlMode: true });
      const items: { title: string; link: string }[] = [];

      $('item').each((_, el) => {
        const title = $(el).find('title').text().trim();
        const link = $(el).find('link').text().trim();

        if (title && link) {
          if (!keyword || title.toLowerCase().includes(keyword.toLowerCase())) {
            items.push({ title, link });
          }
        }
      });

      const top5 = items.slice(0, 5);

      if (top5.length === 0) {
        return keyword
          ? `No encontré noticias de tecnología sobre "${keyword}" en este momento.`
          : 'No encontré noticias de tecnología en este momento.';
      }

      const header = keyword
        ? `📰 Últimas noticias tech sobre "${keyword}":\n\n`
        : '📰 Últimas noticias de tecnología:\n\n';

      const newsList = top5
        .map((item, i) => `${i + 1}. ${item.title}`)
        .join('\n');

      return header + newsList;
    } catch (error) {
      this.logger.error('Error fetching tech news', error.message);
      return '⚠️ No se pudo obtener noticias de tecnología en este momento.';
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // TOOL 3: Web Search (DuckDuckGo scraper)
  // Scrapes DuckDuckGo search results for general queries
  // ─────────────────────────────────────────────────────────────────────────────
  async searchWeb(query: string): Promise<string> {
    try {
      const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;

      const { data: html } = await firstValueFrom(
        this.httpService.get(searchUrl, {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            Accept: 'text/html',
          },
        }),
      );

      const $ = cheerio.load(html);
      const results: { title: string; snippet: string }[] = [];

      $('.result__body').each((_, el) => {
        const title = $(el).find('.result__title').text().trim();
        const snippet = $(el).find('.result__snippet').text().trim();

        if (title && snippet) {
          results.push({ title, snippet });
        }
      });

      const top3 = results.slice(0, 3);

      if (top3.length === 0) {
        return `No encontré resultados para "${query}".`;
      }

      const header = `🔍 Resultados para "${query}":\n\n`;
      const resultsList = top3
        .map((r, i) => `${i + 1}. *${r.title}*\n   ${r.snippet}`)
        .join('\n\n');

      return header + resultsList;
    } catch (error) {
      this.logger.error('Error searching web', error.message);
      return `⚠️ No se pudo realizar la búsqueda de "${query}" en este momento.`;
    }
  }
}
