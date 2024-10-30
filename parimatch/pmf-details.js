export default async function PmFDetails(page) {
  await page.waitForSelector(
    "span.modulor_navigation-bar__description__1_52_1"
  );

  const league = await page.$eval(
    "span.modulor_navigation-bar__description__1_52_1",
    (el) => el.innerText
  );
  const teams = await page.$$("a.EC_EL");

  const teamsData = {}; // Initialize an empty object to store team data

  await Promise.all(
    teams.map(async (team, index) => {
      const teamName = await team.evaluate((el) => el.innerText);
      teamsData[`team ${index + 1}`] = teamName;
    })
  );
  const matchStatus = await page.$eval(
    'div[data-id="prematch-time-status"] span',
    (el) => el.innerText
  );
  const href = page.url();

  return {
    bookMaker: "parimatch",
    sport: "football",
    league,
    href,
    ...teamsData,
    matchStatus,
  };
}
