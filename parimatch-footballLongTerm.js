const puppeteer = require("puppeteer");

// Custom delay function using Promise
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

(async () => {
  const browser = await puppeteer.launch({
    headless: false,
  });

  const page = await browser.newPage();
  await page.setGeolocation({ latitude: 28.6139, longitude: 77.209 });

  // Navigate to the target URL
  await page.goto("https://pari-match-in.com/en/football", {
    waitUntil: "networkidle2",
  });
  await page.$$(".EC_Ai");

  // Wait for the list items to load
  await page.$$(".modulor_list-view__list__1_52_1");

  // Select all elements
  const titleElements = await page.$$(
    '[data-testid="modulor-content-text-title"]'
  );
  console.log(`Found ${titleElements.length} title elements.`);

  for (let titleElement of titleElements) {
    // Scroll to the element
    await page.evaluate(
      (el) => el.scrollIntoView({ behavior: "smooth", block: "center" }),
      titleElement
    );
    await delay(100); // Wait for smooth scrolling

    // Click on the element
    await titleElement.click();
    console.log(
      "Clicked on an element:",
      await page.evaluate((el) => el.textContent, titleElement)
    );

    await delay(400);
  }
  await page.waitForSelector("a.EC_T");
  const links = await page.$$eval("a.EC_T", (anchors) =>
    anchors.map((anchor) => ({
      text: anchor.textContent.trim(), // Grab the text
      href: anchor.href, // Grab the href
    }))
  );

  console.log(links);
  // Close the browser
  await browser.close();
})();
