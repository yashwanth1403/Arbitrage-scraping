import puppeteer from "puppeteer";
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
async function scrapeSpecificElements(url) {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();

  try {
    await page.goto(url, { waitUntil: "networkidle0" });

    // Function to scrape elements currently in view
    const scrapeElements = async () => {
      return await page.evaluate(() => {
        const elements = document.querySelectorAll(
          '[data-testid="modulor-typography"]'
        );
        return Array.from(elements).map((el) => ({
          text: el.textContent,
          class: el.className,
          testId: el.getAttribute("data-testid"),
          componentName: el.getAttribute("data-component-name"),
        }));
      });
    };

    // Initial check for loading behavior
    let initialElements = await scrapeElements();
    let previousHeight = 0;
    let currentHeight = await page.evaluate(() => document.body.scrollHeight);
    let allElements = [...initialElements];

    // Keep scrolling until no new content loads
    while (previousHeight !== currentHeight) {
      previousHeight = currentHeight;

      // Scroll down
      await page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight);
      });

      // Wait for potential new content
      await delay(2000);

      // Get new height
      currentHeight = await page.evaluate(() => document.body.scrollHeight);

      // Scrape new elements
      const newElements = await scrapeElements();

      // Add new unique elements
      const existingTexts = new Set(allElements.map((e) => e.text));
      const uniqueNewElements = newElements.filter(
        (e) => !existingTexts.has(e.text)
      );
      allElements = [...allElements, ...uniqueNewElements];
    }

    return allElements;
  } catch (error) {
    console.error("Error during scraping:", error);
    throw error;
  } finally {
    await browser.close();
  }
}

// Helper function to filter specific values (like 23.00)
function filterNumericValues(elements) {
  return elements.filter((el) => {
    const num = parseFloat(el.text);
    return !isNaN(num);
  });
}

// Example usage
async function main() {
  const url =
    "https://pari-match-in.com/en/events/mallorca-athletic-bilbao-12071900?tab=all"; // Replace with your target URL

  try {
    console.log("Starting scraping...");
    const elements = await scrapeSpecificElements(url);

    // Filter for numeric values
    const numericElements = filterNumericValues(elements);

    console.log("Found elements:", elements.length);
    console.log("Numeric values:", numericElements.length);

    // Print the results
    numericElements.forEach((element) => {
      console.log("Value:", element.text);
    });
  } catch (error) {
    console.error("Error in main:", error);
  }
}

main();
