import puppeteer from "puppeteer";
import PmFDetails from "./pmf-details.js";
import Ft from "./pm-ft.js";
import DC from "./pm-dc.js";
import Total from "./pm-totals.js";

const CONFIG = {
  VIEWPORT: { width: 1024, height: 700 },
  LOCATION: { latitude: 28.6139, longitude: 77.209 },
  SCROLL_DELAY: 400,
  SCROLL_ITERATIONS: 10,
  SCROLL_AMOUNT: 300,
  CONCURRENT_TABS: 3,
  RETRY_ATTEMPTS: 2,
  PAGE_TIMEOUT: 30000,
  NEW_PAGE_DELAY: 2000, // Added 3-second delay for new pages
};

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function scrollWithMouseInCenter(page) {
  try {
    const dimensions = await page.evaluate(() => ({
      width: window.innerWidth,
      height: window.innerHeight,
    }));

    const centerX = Math.floor(dimensions.width / 2);
    const centerY = Math.floor(dimensions.height / 2);

    await page.mouse.move(centerX, centerY);
    await page.mouse.wheel({ deltaY: CONFIG.SCROLL_AMOUNT });
    await delay(CONFIG.SCROLL_DELAY);
  } catch (error) {
    console.error("Error during scroll:", error);
  }
}

async function processMatchPage(browser, href, retryCount = 0) {
  let newPage = null;
  try {
    newPage = await browser.newPage();
    await newPage.setViewport(CONFIG.VIEWPORT);
    await newPage.setDefaultTimeout(CONFIG.PAGE_TIMEOUT);

    await newPage.goto(href, {
      waitUntil: "networkidle2",
      timeout: CONFIG.PAGE_TIMEOUT,
    });

    // Add explicit delay after page load
    await delay(CONFIG.NEW_PAGE_DELAY);

    const [details, fullTime, doubleChance] = await Promise.all([
      PmFDetails(newPage),
      Ft(newPage),
      DC(newPage),
      // Total(newPage),
    ]);

    return { ...details, ...fullTime, ...doubleChance, ...total };
  } catch (error) {
    console.error(`Error processing match page ${href}:`, error);

    if (retryCount < CONFIG.RETRY_ATTEMPTS) {
      console.log(
        `Retrying ${href} (Attempt ${retryCount + 1}/${CONFIG.RETRY_ATTEMPTS})`
      );
      await delay(1000 * (retryCount + 1));
      return processMatchPage(browser, href, retryCount + 1);
    }
    return null;
  } finally {
    if (newPage) {
      await newPage.close().catch(console.error);
    }
  }
}

async function processMatchesInBatches(browser, hrefs) {
  const results = [];

  for (let i = 0; i < hrefs.length; i += CONFIG.CONCURRENT_TABS) {
    const batch = hrefs.slice(i, i + CONFIG.CONCURRENT_TABS);
    const batchPromises = batch.map((href) => processMatchPage(browser, href));

    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults.filter((result) => result !== null));

    console.log(`Processed ${i + batch.length}/${hrefs.length} matches`);
  }

  return results;
}

async function main() {
  let browser = null;
  try {
    browser = await puppeteer.launch({
      headless: false,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();
    await page.setGeolocation(CONFIG.LOCATION);
    await page.setViewport(CONFIG.VIEWPORT);

    await page.goto("https://pari-match-in.com/en/football/0-12", {
      waitUntil: "networkidle2",
      timeout: CONFIG.PAGE_TIMEOUT,
    });

    for (let i = 0; i < CONFIG.SCROLL_ITERATIONS; i++) {
      await scrollWithMouseInCenter(page);
    }

    const hrefs = await page.evaluate(() => {
      return Array.from(
        document.querySelectorAll('a[data-id="event-card-container-event"]')
      ).map((a) => a.href);
    });

    if (hrefs.length === 0) {
      console.log("No matches found");
      return [];
    }

    console.log(`Found ${hrefs.length} matches to process`);

    const results = await processMatchesInBatches(browser, hrefs);

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const fs = await import("fs/promises");
    await fs
      .writeFile(
        `match_results_${timestamp}.json`,
        JSON.stringify(results, null, 2)
      )
      .catch(console.error);

    return results;
  } catch (error) {
    console.error("Fatal error:", error);
    return [];
  } finally {
    if (browser) {
      await browser.close().catch(console.error);
    }
  }
}

main()
  .then((results) =>
    console.log(`Scraping completed. Found ${results.length} matches.`)
  )
  .catch((error) => console.error("Script execution failed:", error));
