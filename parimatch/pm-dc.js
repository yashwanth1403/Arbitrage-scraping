export default async function DC(page) {
  await page.$$("div.EC_EO");

  try {
    await page.waitForSelector('span[data-anchor*="\\"marketType\\":3"]', {
      timeout: 3000,
    });
  } catch (error) {
    console.log("DC element not found.");
    return null;
  }

  const grandparentHandle = await page.evaluateHandle(() => {
    const spans = document.querySelectorAll("span.EC_Fn");
    for (const span of spans) {
      if (span.innerText.trim() === "Double chance") {
        return span.parentElement.parentElement;
      }
    }
    return null;
  });

  if (!grandparentHandle) {
    console.error("Grandparent element not found.");
    return null;
  }

  const spans = await grandparentHandle.$$(
    'span[data-anchor*="\\"marketType\\":3"]'
  );

  if (spans.length > 0) {
    console.log(`Found ${spans.length} spans with marketType 3`);
    const result = {};

    for (let i = 0; i < spans.length; i++) {
      try {
        const text = await spans[i].$eval(".EC_GS", (el) => el.innerText);
        let newText;
        switch (text) {
          case "1X":
            newText = "W1X";
            break;
          case "X2":
            newText = "W2X";
            break;
          case "1 OR 2":
            newText = "W1W2";
            break;
          default:
            newText = text;
        }
        const odds = await spans[i].$eval(
          '[data-testid="modulor-typography"]',
          (el) => parseFloat(el.innerText)
        );
        result[newText] = odds;
      } catch (error) {
        console.log(`Error extracting data for span ${i + 1}:`, error);
      }
    }

    await grandparentHandle.dispose();
    return { DC: result };
  } else {
    console.log("No spans found for marketType 3.");
    await grandparentHandle.dispose();
    return null;
  }
}
