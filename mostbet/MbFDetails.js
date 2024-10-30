export default async function MbFDetails(page) {
  await page.waitForSelector("button.BreadCrumbs_item__zgYHP");
  const league = await page.$$eval(
    "button.BreadCrumbs_item__zgYHP",
    (elements) => elements.map((el) => el.innerText).join(" ")
  );

  const teams = await page.$$("h3.TeamInfo_title__Br2SU");

  const teamsData = {}; // Initialize an empty object to store team data

  await Promise.all(
    teams.map(async (team, index) => {
      const teamName = await team.evaluate((el) => el.innerText);
      teamsData[`team ${index + 1}`] = teamName;
    })
  );
  const matchStatus = await page.$eval(
    "h2.PregameDetails_beginDate__yrQIR",
    (el) => el.innerText
  );
  const href = page.url();

  return {
    bookMaker: "mostbet",
    sport: "football",
    league,
    href,
    ...teamsData,
    matchStatus,
  };
}
