/**
 * Scrapes full-time betting odds from a webpage.
 * @param {import('playwright').Page | import('puppeteer').Page} page - Browser page instance
 * @returns {Promise<{FT: {[key: string]: number}} | null>} Object containing full-time odds or null if not found
 */
export default async function FT(page) {
  // Constants
  const SELECTORS = {
    CONTAINER: "div.EC_EO",
    MARKET_TYPE: 'span[data-anchor*="\\"marketType\\":2"]',
    FULL_TIME_TEXT: "span.EC_Fn",
    ODDS_TEXT: '[data-testid="modulor-typography"]',
    MARKET_TEXT: ".EC_GS",
  };

  const TIMEOUT = 3000;

  // Betting outcome mapping
  const TEXT_MAP = {
    1: "W1", // Home win
    2: "W2", // Away win
    X: "X", // Draw
  };

  try {
    // Wait for critical elements with proper timeout handling
    await Promise.race([
      Promise.all([
        page.waitForSelector(SELECTORS.CONTAINER),
        page.waitForSelector(SELECTORS.MARKET_TYPE, { timeout: TIMEOUT }),
      ]),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Initial load timeout")), TIMEOUT)
      ),
    ]);

    // Find and validate full-time section
    const fullTimeSection = await page.evaluateHandle(() => {
      const fullTimeSpan = document.querySelector("span.EC_Fn");
      if (
        !fullTimeSpan ||
        fullTimeSpan.innerText.trim() !== "Full-time result"
      ) {
        return null;
      }
      return fullTimeSpan.parentElement.parentElement;
    });

    if (!fullTimeSection) {
      console.warn("Full-time result section not found");
      return null;
    }

    // Extract betting odds with improved error handling and validation
    const result = await page.evaluate(
      ({ SELECTORS, TEXT_MAP }) => {
        const marketSpans = document.querySelectorAll(SELECTORS.MARKET_TYPE);
        if (!marketSpans.length) {
          return null;
        }

        return Array.from(marketSpans).reduce((acc, span) => {
          try {
            const textElement = span.querySelector(SELECTORS.MARKET_TEXT);
            const oddsElement = span.querySelector(SELECTORS.ODDS_TEXT);

            if (!textElement?.innerText || !oddsElement?.innerText) {
              return acc;
            }

            const originalText = textElement.innerText.trim();
            const transformedText = TEXT_MAP[originalText] || originalText;
            const odds = parseFloat(oddsElement.innerText.trim());

            // Validate odds
            if (!isNaN(odds) && odds > 1) {
              acc[transformedText] = Number(odds.toFixed(2)); // Normalize to 2 decimal places
            }

            return acc;
          } catch (error) {
            console.error("Error processing betting span:", error);
            return acc;
          }
        }, {});
      },
      { SELECTORS, TEXT_MAP }
    );

    // Cleanup
    await fullTimeSection.dispose();

    // Validate final result structure
    if (!result || Object.keys(result).length === 0) {
      return null;
    }

    return { FT: result };
  } catch (error) {
    console.error("Error scraping full-time odds:", error.message);
    return null;
  }
}
