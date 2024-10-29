const readline = require("readline");
const { spawn } = require("child_process");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});
const options = [
  { name: "Apartment Scraper", file: "apartmentsScraper.js" },
  { name: "ZRS Apartments", file: "zrsapartments.js" },
];

console.log("Choose a scraper to run:");
options.forEach((option, index) => {
  console.log(`${index + 1}: ${option.name}`);
});

rl.question("Enter the number of the scraper you want to run: ", (answer) => {
  const selectedIndex = parseInt(answer) - 1;

  if (
    selectedIndex >= 0 &&
    selectedIndex < options.length &&
    !isNaN(selectedIndex)
  ) {
    const selectedFile = options[selectedIndex].file;
    console.log(`Running ${selectedFile}...`);

    // Use spawn instead of exec to run the scraper
    const scraperProcess = spawn("node", [selectedFile], {
      stdio: "inherit", // This will stream the output directly to the console
    });

    scraperProcess.on("error", (error) => {
      console.error(`Error: ${error.message}`);
    });

    scraperProcess.on("exit", (code) => {
      console.log(`${selectedFile} finished with exit code ${code}`);
      rl.close(); // Close the readline interface after the script finishes
    });
  } else {
    console.log("Invalid selection. Please try again.");
    rl.close(); // Close readline if invalid selection
  }
});
