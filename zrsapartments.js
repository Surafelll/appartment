const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");

async function scrapeZRSApartments() {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  // Disable CSS and JavaScript by intercepting requests
  await page.setRequestInterception(true);
  page.on("request", (req) => {
    if (
      req.resourceType() === "stylesheet" ||
      req.resourceType() === "script"
    ) {
      req.abort();
    } else {
      req.continue();
    }
  });

  const sourceWebsite = "https://www.zrsapartments.com/";

  // Create folders if they don't exist
  const baseFolderPath = path.join(__dirname, "data", "zrsapartments.com");
  const jsonFolderPath = path.join(baseFolderPath, "apartments_json");

  if (!fs.existsSync(baseFolderPath))
    fs.mkdirSync(baseFolderPath, { recursive: true });
  if (!fs.existsSync(jsonFolderPath)) fs.mkdirSync(jsonFolderPath);

  // Navigate to the source website
  await page.goto(sourceWebsite, { waitUntil: "networkidle2" });

  // Array to hold all scraped data
  const apartmentData = [];

  // Wait for the apartment cards to load
  await page.waitForSelector(".propertieslistings__property--information");

  // Get all apartment cards
  const apartmentCards = await page.$$(
    ".propertieslistings__property--information"
  );

  for (const card of apartmentCards) {
    try {
      const title = await card.$eval(
        ".propertieslistings__property--name",
        (el) => el.textContent.trim()
      );
      const location = await card.$eval(
        ".propertieslistings__property--location",
        (el) => el.textContent.trim()
      );

      const detailPageUrl = await card.$eval(
        ".propertieslistings__property--link",
        (el) => el.href
      );
      const detailPage = await browser.newPage();

      // Apply request interception to the new page as well
      await detailPage.setRequestInterception(true);
      detailPage.on("request", (req) => {
        if (
          req.resourceType() === "stylesheet" ||
          req.resourceType() === "script"
        ) {
          req.abort();
        } else {
          req.continue();
        }
      });

      await detailPage.goto(detailPageUrl, { waitUntil: "networkidle2" });

      let phone = "N/A";
      try {
        phone = await detailPage.$eval(".header__phone > a > span", (el) =>
          el.textContent.trim()
        );
      } catch (error) {
        console.error(
          `Could not find phone number for: ${title} using original method`
        );
        try {
          const smsPhone = await detailPage.$eval(
            ".header__phone--sms span:last-child",
            (el) => el.textContent.trim()
          );
          phone = smsPhone;
        } catch {
          console.error(`Could not find SMS phone number for: ${title}`);
        }
      }

      await detailPage.close();

      apartmentData.push({ from: sourceWebsite, title, location, phone });
      console.log(`Scraped: ${title}, ${location}, ${phone}`);
    } catch (error) {
      console.error("Error scraping an apartment card:", error);
      apartmentData.push({
        from: sourceWebsite,
        title: "N/A",
        location: "N/A",
        phone: "N/A",
      });
    }
  }

  const jsonFilePath = path.join(jsonFolderPath, `apartments.json`);
  fs.writeFileSync(jsonFilePath, JSON.stringify(apartmentData, null, 2));
  console.log(`Saved data to JSON file: ${jsonFilePath}`);

  console.log(
    `Scraping completed. Data saved in the 'data/zrsapartments.com/apartments_json' folder.`
  );
  await browser.close();
}

scrapeZRSApartments();
