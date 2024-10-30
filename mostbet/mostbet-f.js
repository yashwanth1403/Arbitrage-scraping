import puppeteer from "puppeteer";
import MbFDetails from "./MbFDetails.js";
import Ft from "./Mb-FT.js";
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const scrollWithMouseInCenter = async (page, scrollAmount = 500) => {
  const dimensions = await page.evaluate(() => ({
    width: window.innerWidth,
    height: window.innerHeight,
  }));
  const centerX = Math.floor(dimensions.width / 2);
  const centerY = Math.floor(dimensions.height / 2);

  await page.mouse.move(centerX, centerY);
  await page.mouse.wheel({ deltaY: scrollAmount }); // Use deltaY instead of centerY
  await delay(400); // Delay to let content load
};
(async () => {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();

  await page.setGeolocation({ latitude: 28.6139, longitude: 77.209 });

  await page.setViewport({
    width: 1024,
    height: 700,
  });

  // Navigate to the target URL
  await page.goto("https://mostbet-in62.com/sport?t=1&lc=1&ss=all", {
    waitUntil: "networkidle2",
  });

  await delay(4000);
  const closeButton = await page.waitForSelector(
    'button[data-testid="gift-popup-close-btn"]'
  );

  await delay(100);
  if (closeButton) {
    console.log("Close button found!");

    // Click the button
    await closeButton.click();
    console.log("Close button clicked!");
  } else {
    console.log("Close button not found.");
  }
  await delay(500);

  for (let i = 0; i < 10; i++) {
    await scrollWithMouseInCenter(page, 300);
  }
  const outerAnchors = await page.$$(
    "a.DefaultLine_lineLink__3RRvd.auto_center_line_team"
  );

  if (outerAnchors.length > 0) {
    console.log(`Total links found: ${outerAnchors.length}`);

    // Initialize an array to store results
    const results = [];

    for (let i = 0; i < outerAnchors.length; i++) {
      const link = outerAnchors[i];
      const href = await link.evaluate((el) => el.href);

      try {
        const newPage = await browser.newPage();
        await newPage.goto(href, { waitUntil: "networkidle2" });

        // Ensure that these functions return data correctly
        const details = await MbFDetails(newPage);
        const fullTime = await Ft(newPage);

        // Push the result object into the results array
        results.push({ ...details, ...fullTime });
        console.log("Results:", results);

        await newPage.close(); // Close the new page after processing
      } catch (error) {
        console.error(`Error processing link ${i + 1}:`, error);
      }
    }

    // Log the results to the console
    console.log("Results:", results);

    // Return all results after processing all links
    return results;
  }
  await browser.close(); // Ensure the browser closes
})();
