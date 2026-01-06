import { crawlerService } from './src/services/crawlerService';

async function testCrawl() {
  try {
    console.log('Starting manual crawl test...');
    const url = 'https://www.get-ryze.ai/';
    console.log(`Crawling: ${url}`);

    const results = await crawlerService.crawlWebsite(url);

    console.log(`\n✓ Crawl completed successfully!`);
    console.log(`Found ${results.length} pages`);

    results.forEach((result, idx) => {
      console.log(`\nPage ${idx + 1}:`);
      console.log(`  URL: ${result.url}`);
      console.log(`  Title: ${result.title}`);
      console.log(`  Text length: ${result.text.length} characters`);
      console.log(`  Text preview: ${result.text.substring(0, 200)}...`);
    });

  } catch (error) {
    console.error('\n✗ Crawl failed with error:');
    console.error(error);
  } finally {
    process.exit(0);
  }
}

testCrawl();
