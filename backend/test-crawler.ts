import { crawlerService } from './src/services/crawlerService';
import dotenv from 'dotenv';

dotenv.config();

async function testCrawler() {
  console.log('Testing crawler with URL: https://www.get-ryze.ai/');
  console.log('Starting crawl...\n');

  try {
    const results = await crawlerService.crawlWebsite('https://www.get-ryze.ai/', 10);

    console.log(`\n✅ Crawl completed successfully!`);
    console.log(`Found ${results.length} pages\n`);

    results.forEach((result, index) => {
      console.log(`--- Page ${index + 1} ---`);
      console.log(`URL: ${result.url}`);
      console.log(`Title: ${result.title}`);
      console.log(`Content length: ${result.text.length} characters`);
      console.log(`First 200 characters: ${result.text.substring(0, 200)}...`);
      console.log('');
    });

    console.log(`\nTotal pages: ${results.length}`);
    console.log(`Total content length: ${results.reduce((sum, r) => sum + r.text.length, 0)} characters`);
  } catch (error) {
    console.error('❌ Crawler failed:', error);
  }
}

testCrawler();
