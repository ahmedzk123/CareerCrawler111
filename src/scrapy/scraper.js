// scraper.js
// Run: node scraper.js
// Make sure package.json has "type": "module"

import { chromium } from 'playwright';
import * as cheerio from 'cheerio';
import querystring from 'querystring';  
import { spawn } from 'child_process';
import { exec } from 'child_process';


// main difference is module import syntax as opposed to commonjs require othersie same



function buildIndeedUrls(role, location, numPages) {

    // kinda just building the indeed url using role ex  data nalyst and location ex toronto
    /*
    this function bascially builds the base url for a ROLE and LOCATION on indeed and returns a list 
    of urls for the number of pages specified
    bacially get url of pages related to "data analyst" in "toronto"  where each page has its own url
    */
    const baseUrl = "https://ca.indeed.com/jobs?";
    const q = querystring.escape(role);
    const l = querystring.escape(location);

    const urls = [];
    for (let page = 0; page < numPages; page++) {
        const start = page * 10;    
        // indeed sepreates pages by 10 ^^
        const url = `${baseUrl}q=${q}&l=${l}&start=${start}&sort=date`; 
        urls.push(url);   // each page has its own url therfroe we get numPages number of urls
    }
    return urls; 

}

// async function allows to run multiple tasks that take time without blocking main program


async function scrapeJobUrls(pageUrl) {
    const urls = [];
    const descs = [];
    const jobTitles = [];

    // Launch browser (headless false to see it)
    const browser = await chromium.launch({ headless: false });
    
    const page = await browser.newPage();

    // Go to the main jobs page
    await page.goto(pageUrl);

    // Get HTML and load the html file into Cheerio
    const html = await page.content();
    const $ = cheerio.load(html);

    // Get all job links (they have data-jk)
    const jobLinks = $('a[data-jk]');

    // Loop through each job link
    for (let i = 0; i < jobLinks.length; i++) {
        const jobJK = $(jobLinks[i]).attr('data-jk');
        const jobUrl = "https://ca.indeed.com/viewjob?jk=" + jobJK;
        urls.push(jobUrl);
        console.log(`Scraping job ${i + 1}/${jobLinks.length}: ${jobUrl}`);

        // Open job detail page to get description
        const jobPage = await browser.newPage();
        await jobPage.goto(jobUrl);

        const jobHtml = await jobPage.content();
        const $$ = cheerio.load(jobHtml);

        // Grab job description
        const jobDesc = $$('#jobDescriptionText').text().trim();
        const jobTitle = $$('h1[data-testid="jobTitle"]').text().trim() || $$('h1.jobsearch-JobInfoHeader-title').text().trim();

        descs.push(jobDesc);
        jobTitles.push(jobTitle);

        await jobPage.close();
    }

    // Close browser after scraping all jobs
    await browser.close();

    return { urls, descs, jobTitles };
}

async function scrapeIndeedJobs(role, location, numPages, parallel = true) {

    let allJobUrls = [];
    let allJobDescs = [];
    let allJobTitles = [];
    const urlPages = buildIndeedUrls(role, location, numPages);  // ARRAY OF PAGES TO SCRAPE

    if (!parallel) {
        // Sequential scraping
        for (const pageUrl of urlPages) {
            const { urls, descs, jobTitles } = await scrapeJobUrls(pageUrl);
            allJobUrls.push(...urls.toString());
            allJobDescs.push(...descs.toString());
            allJobTitles.push(...jobTitles.toString());
        }
    } else {
        // Parallel scraping
        const allResults = await Promise.all(urlPages.map(url => scrapeJobUrls(url)));

        for (const result of allResults) {
            allJobUrls.push(...result.urls);
            allJobDescs.push(...result.descs);
            allJobTitles.push(...result.jobTitles);
        }
    }

    // Return both URLs and descriptions in **all cases**
    return { allJobUrls, allJobDescs, allJobTitles };
}


import fs from 'fs';
import path from 'path';

async function computeScores(allJobDescs, resumePath) {
  return new Promise((resolve, reject) => {
    const tempFilePath = path.join(process.cwd(), 'temp_job_descs.json');
    fs.writeFileSync(tempFilePath, JSON.stringify(allJobDescs), 'utf-8');

    const pythonProcess = spawn('C:\\Users\\labee\\CareerCrawler\\venv\\Scripts\\python.exe', [
      'scrapy/scoring.py',
      resumePath,
      tempFilePath
    ]);

    let output = '';
    let errors = '';

    pythonProcess.stdout.on('data', data => {
      output += data.toString();
    });

    pythonProcess.stderr.on('data', data => {
      errors += data.toString();
    });

    pythonProcess.on('close', code => {
      fs.unlinkSync(tempFilePath);

      if (code !== 0) {
        reject(`Python exited with code ${code}: ${errors}`);
        return;
      }

      try {
        const scores = JSON.parse(output.trim());
        resolve(scores);
      } catch (err) {
        reject(`Failed to parse Python output: ${err}`);
      }
    });
  });
}




// test test 

/*/
(async () => {
    const role = "Software Engineer";
    const location = "Toronto";
    const numPages = 2;  // scrape first 2 pages

    // ---- Parallel ----
    let startTime = Date.now();
    const parallelUrls = await scrapeIndeedJobs(role, location, numPages, true);
    let endTime = Date.now();
    console.log(`\nParallel scrape (${numPages} pages) completed in ${(endTime - startTime)/1000} seconds.`);
    console.log(parallelUrls);

    // ---- Sequential ----
    startTime = Date.now();
    const sequentialUrls = await scrapeIndeedJobs(role, location, numPages, false);
    endTime = Date.now();
    console.log(`\nSequential scrape (${numPages} pages) completed in ${(endTime - startTime)/1000} seconds.`);
    console.log(sequentialUrls);


    // enxt step would be is to actuall apply for these jobs using some automation
})();
/*/


export { scrapeIndeedJobs };
export { computeScores };
