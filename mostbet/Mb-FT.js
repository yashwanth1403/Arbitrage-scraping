export default async function Ft(page) {
  await page.waitForSelector("div.Group_group__UArsk");
  await page.waitForSelector("span.Group_title__kDW0l");

  const grandparentHandle = await page.evaluateHandle(() => {
    const span = document.querySelector("span.Group_title__kDW0l");
    if (span && span.childNodes[0].textContent.trim() === "1x2") {
      return span.parentElement.parentElement;
    }
    return null;
  });
  const buttons = await grandparentHandle.$$("button.Group_outcome__umJ3t");
  if (buttons) {
    console.log(`Found ${buttons.length} spans with marketType 2`);
    const result = {}; // Initialize result as an object

    for (let i = 0; i < buttons.length; i++) {
      try {
        const text = await buttons[i].$eval(
          "h3.Outcome_title__UGhEK",
          (el) => el.innerText
        );
        const odds = await buttons[i].$eval(
          "div.Outcome_odd__mgO6c",
          (el) => parseFloat(el.innerText) // Parse text as float
        );
        result[text] = odds; // Add entry to result object
      } catch (error) {
        console.log(`Error extracting data for span ${i + 1}:`, error);
      }
    }
    await grandparentHandle.dispose();
    return { FT: result };
  } else {
    return null;
  }
}
