import { ApifyClient } from 'apify-client';
import dotenv from 'dotenv';

dotenv.config();

const apifyToken = process.env.APIFY_API_TOKEN;

if (!apifyToken) {
  throw new Error('Missing APIFY_API_TOKEN environment variable');
}

const client = new ApifyClient({
  token: apifyToken,
});

export interface CrawlResult {
  url: string;
  title: string;
  text: string;
  html?: string;
}

export class CrawlerService {
  /**
   * Crawls a website URL using Apify and extracts text content
   * @param url - The website URL to crawl
   * @param maxPages - Maximum number of pages to crawl (default: 50)
   * @returns Array of crawled page results
   */
  async crawlWebsite(url: string, maxPages: number = 50): Promise<CrawlResult[]> {
    try {
      console.log(`Starting crawl for ${url} with max ${maxPages} pages`);

      // Using Apify's Website Content Crawler
      const run = await client.actor('apify/website-content-crawler').call({
        startUrls: [{ url }],
        maxCrawlPages: maxPages,
        crawlerType: 'playwright:firefox', // Use playwright for JS-rendered sites
        // Only crawl pages from the same domain
        linkSelector: 'a[href]',
        // Extract text content
        removeElementsCssSelector: 'nav, footer, header, script, style, iframe, .ads, .advertisement',
      });

      console.log(`Crawl completed with status: ${run.status}`);

      // Check if run was successful
      if (run.status !== 'SUCCEEDED') {
        const errorMsg = run.statusMessage || `Crawl failed with status: ${run.status}`;
        console.error(`Crawl failed: ${errorMsg}`);
        throw new Error(errorMsg);
      }

      // Fetch results from the dataset
      const { items } = await client.dataset(run.defaultDatasetId).listItems();

      // Transform results to our format
      const results: CrawlResult[] = items.map((item: any) => ({
        url: item.url || '',
        title: item.metadata?.title || '',
        text: item.text || '',
        html: item.html,
      }));

      return results.filter(result => result.text && result.text.length > 50);
    } catch (error) {
      console.error('Crawler error:', error);
      throw new Error(`Failed to crawl website: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Gets the status of a running crawl job
   * @param runId - The Apify run ID
   */
  async getCrawlStatus(runId: string): Promise<{ status: string; progress?: number }> {
    try {
      const run = await client.run(runId).get();
      return {
        status: run?.status || 'UNKNOWN',
        progress: (run?.stats as any)?.requestsFinished || 0,
      };
    } catch (error) {
      console.error('Error fetching crawl status:', error);
      throw new Error('Failed to fetch crawl status');
    }
  }
}

export const crawlerService = new CrawlerService();
