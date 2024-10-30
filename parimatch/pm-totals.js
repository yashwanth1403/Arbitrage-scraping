/**
 * Scrapes total (over/under) betting odds from a webpage.
 * @param {import('playwright').Page | import('puppeteer').Page} page - Browser page instance
 * @returns {Promise<{Total: Array<{type: string, over: string, under: string}>} | null>} Object containing total odds or null if not found
 */
export default async function Total(page) {
  // Constants
  const SELECTORS = {
    TAB_BUTTON: 'button[data-testid="marketTabs-button"]',
    TAB_TEXT: 'span[data-testid="marketTabs-typography"]',
    MARKET_TYPE: 'span[data-anchor*="\\"marketType\\":5"]',
    TOTAL_SPAN: "span.EC_Fn",
    CONTAINER: "div.EC_Gl",
    ODDS_VALUE: 'span[data-id="animated-odds-value"] span',
  };

  const TIMEOUTS = {
    CLICK_WAIT: 5000,
    ELEMENT_WAIT: 3000,
  };

  // Helper function for delays
  const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  try {
    // Click the "Total" tab with improved error handling
    const clicked = await page.evaluate(
      ({ SELECTORS }) => {
        const buttons = document.querySelectorAll(SELECTORS.TAB_BUTTON);
        for (const button of buttons) {
          const span = button.querySelector(SELECTORS.TAB_TEXT);
          if (span?.innerText.trim() === "Total") {
            button.click();
            return true;
          }
        }
        return false;
      },
      { SELECTORS }
    );

    if (!clicked) {
      console.warn("Total tab button not found");
      return null;
    }

    // Wait for content to load
    await delay(TIMEOUTS.CLICK_WAIT);

    // Check for market type element
    try {
      await page.waitForSelector(SELECTORS.MARKET_TYPE, {
        timeout: TIMEOUTS.ELEMENT_WAIT,
      });
    } catch (error) {
      console.warn("Market type element not found after waiting");
      return null;
    }

    // Find the Total section container
    const totalSection = await page.evaluateHandle(
      ({ SELECTORS }) => {
        const spans = document.querySelectorAll(SELECTORS.TOTAL_SPAN);
        for (const span of spans) {
          if (span.innerText.trim() === "Total") {
            return span.parentElement.parentElement;
          }
        }
        return null;
      },
      { SELECTORS }
    );

    if (!totalSection) {
      console.warn("Total section not found");
      return null;
    }

    // Get all odds containers
    const containers = await totalSection.$$(SELECTORS.CONTAINER);
    const result = [];

    // Process each container
    for (const container of containers) {
      try {
        const spans = await container.$$("span");
        if (spans.length !== 3) continue;

        const type = await spans[0].evaluate((el) => el.innerText.trim());
        const over = await spans[1].$eval(SELECTORS.ODDS_VALUE, (el) => {
          const value = parseFloat(el.innerText.trim());
          return isNaN(value) ? null : Number(value.toFixed(2));
        });
        const under = await spans[2].$eval(SELECTORS.ODDS_VALUE, (el) => {
          const value = parseFloat(el.innerText.trim());
          return isNaN(value) ? null : Number(value.toFixed(2));
        });

        // Validate all values before adding to result
        if (type && over && under) {
          result.push({ type, over, under });
        }
      } catch (error) {
        console.error("Error processing container:", error);
        continue;
      }
    }

    // Cleanup
    await totalSection.dispose();
    for (const handle of [
      ...containers,
      ...containers.flatMap((c) => c.$$("span")),
    ]) {
      await handle?.dispose?.();
    }

    // Validate final result
    if (result.length === 0) {
      console.warn("No valid total odds found");
      return null;
    }

    return { Total: result };
  } catch (error) {
    console.error("Error scraping total odds:", error.message);
    return null;
  }
}
