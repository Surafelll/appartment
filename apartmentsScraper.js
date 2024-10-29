const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");
const createCsvWriter = require("csv-writer").createObjectCsvWriter;

async function scrapeApartments() {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();
  const sourceWebsite = "https://www.apartments.com/chicago-il/";

  // Create folders if they don't exist
  const baseFolderPath = path.join(__dirname, "data", "apartments.com");
  const jsonFolderPath = path.join(baseFolderPath, "apartments_json");
  const csvFolderPath = path.join(baseFolderPath, "apartments_csv");

  if (!fs.existsSync(baseFolderPath)) {
    fs.mkdirSync(baseFolderPath, { recursive: true });
  }

  if (!fs.existsSync(jsonFolderPath)) {
    fs.mkdirSync(jsonFolderPath);
  }

  if (!fs.existsSync(csvFolderPath)) {
    fs.mkdirSync(csvFolderPath);
  }

  await page.goto(sourceWebsite, {
    waitUntil: "networkidle2",
  });

  let currentPage = 1;
  const maxPages = 18; // Adjust if you know the max number of pages

  while (currentPage <= maxPages) {
    // Wait for the content to load
    await page.waitForSelector(".searchResults", { timeout: 6000000 });

    const newApartments = [];
    const apartmentElements = await page.$$(".placard");

    for (let element of apartmentElements) {
      // Use try-catch to handle missing elements
      try {
        const title =
          (await element.$eval(".property-title", (el) =>
            el.textContent.trim()
          )) || "N/A";
        const location =
          (await element.$eval(".property-address", (el) =>
            el.textContent.trim()
          )) || "N/A";
        let phone = await element
          .$eval(".phone-link", (el) => el.textContent.trim())
          .catch(() => null);

        if (!phone) {
          const cardLink = await element.$eval("a", (el) => el.href);
          const newPage = await browser.newPage();
          await newPage.goto(cardLink, { waitUntil: "networkidle2" });

          try {
            phone = await newPage.$eval(
              ".ctaContainer .phoneLabel .phoneNumber",
              (el) => el.textContent.trim()
            );
          } catch {
            phone = "N/A"; // Set to N/A if phone is not found
          }

          await newPage.close();
        }

        newApartments.push({
          from: sourceWebsite,
          title,
          location,
          phone: phone || "N/A",
        });
      } catch (error) {
        console.error("Error scraping apartment:", error);
        newApartments.push({
          from: sourceWebsite,
          title: "N/A",
          location: "N/A",
          phone: "N/A",
        });
      }
    }

    // Save the current page's data to a JSON file
    const jsonFilePath = path.join(jsonFolderPath, `page${currentPage}.json`);
    fs.writeFileSync(jsonFilePath, JSON.stringify(newApartments, null, 2));
    console.log(
      `Scraped ${newApartments.length} apartments from page ${currentPage} and saved to ${jsonFilePath}.`
    );

    // Save the current page's data to a CSV file
    const csvFilePath = path.join(csvFolderPath, `page${currentPage}.csv`);
    const csvWriter = createCsvWriter({
      path: csvFilePath,
      header: [
        { id: "from", title: "Source" },
        { id: "title", title: "Title" },
        { id: "location", title: "Location" },
        { id: "phone", title: "Phone" },
      ],
    });
    await csvWriter.writeRecords(newApartments);
    console.log(
      `Scraped ${newApartments.length} apartments from page ${currentPage} and saved to ${csvFilePath}.`
    );

    // Attempt to click the "Next" button
    const nextPageButton = await page.$("a.next");

    if (nextPageButton) {
      try {
        await nextPageButton.click();
        currentPage++;
        await page.waitForNavigation({
          waitUntil: "networkidle2",
          timeout: 6000000,
        });
      } catch (error) {
        console.error("Error during pagination:", error);
        break; // Break if there's an error navigating to the next page
      }
    } else {
      console.log('No "Next" button found. Stopping pagination.');
      break;
    }
  }

  console.log(`Scraping completed. Data saved in the 'data/apartments.com/apartments_json' and 'data/apartments.com/apartments_csv' folders.`);
  await browser.close();
}

scrapeApartments();
