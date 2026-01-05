// scraper.js
// Run: node scraper.js
// Make sure package.json has "type": "module"

import { chromium } from 'playwright';
import * as cheerio from 'cheerio';
import querystring from 'querystring';  
import { start } from 'repl';



// main difference is module import syntax as opposed to commonjs require othersie same



function buildIndeedUrls(role, location, numPages) {

    // kinda just building the indeed url using role ex  data nalyst and location ex toronto
    /*
    this function bascially builds the base url for a ROLE and LOCATION on indeed and returns a list 
    of urls for the number of pages specified
    bacially get url of pages related to "data analyst" in "toronto"  where each page has its own url
    */
    const baseUrl = "https://www.indeed.com/jobs?";
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

    let urls = []; // to store each job url from the page 

    const browser = await chromium.launch({ headless: false }); // when false it wokrs when true it doesnt
    // await allows to wait for the promise to resolve before moving on
    // the promise here is opening the browser instance and awaiting for it to be ready

    // chromium.launch : opens a Chromium browser instance (headless means without GUI)

    const page = await browser.newPage();
    // browser.newPage() : opens a new tab in the browser

    await page.goto(pageUrl);
    // page.goto(pageUrl) : navigates to the specified URL -> indeed job page

    const html = await page.content();
    // page.content() : gets the HTML content of the page

    await browser.close();
    // browser.close() : closes the browser

    const $ = cheerio.load(html);
    // create instance of Cheerio to parse the HTML content

    const jobLinks = $('a[data-jk]');  // all job links have 'data-jk'
    // could porlly also get jobs descr from here too somehow using tags 

    // indeed job links are stored in anchor tags with a 'data-jk' attribute
    // select all <a> tags (links) on the page that have the attribute data-jk.
    // bascailly imagine a literal html page and then we find all all <a> tags with data-jk attribute
    // ex: <a href="/job1" data-jk="12345">Software Engineer</a> and collext all that match 

    // $('a[data-jk]') returns a list of all <a> tags with 
    // data-jk attribute [<a/> dfdsf <a> , <a/> dfjskj <a> , ...]

    urls = [];
    jobLinks.each((i, link) => {
        const jobUrl = "https://www.indeed.com/viewjob?jk=" + $(link).attr('data-jk');
        urls.push(jobUrl);
    });

    return urls;
}


async function scrapeIndeedJobs(role, location, numPages, parallel = true) {

    let allJobUrls = [];
    const urlPages = buildIndeedUrls(role, location, numPages);  // ARRAY OF PAGES TO SCRAPE

    // in js. 'in' iterates over indices (0, 1, 2, ...) while 'of' iterates over values directly


    if (!parallel) {
    for (const pageUrl of urlPages) {
            const result = await scrapeJobUrls(pageUrl); // for each page we get the actual jobs urls

            // push(..) add the second list elements to the first list
            // ex : [1, 2]  push ([3, 4]) => [1, 2, 3, 4] instead of [ [1, 2], [3, 4] ]
            allJobUrls.push(...result);
        }
        return allJobUrls;
    }

    else {
        const allResults = await Promise.all(urlPages.map(url => scrapeJobUrls(url))
        // Promise.all runs all the promises in parallel 
        // urlPages.map(...) creates array where each element is a promise to scrape that page (the entire role page)
        // .map is a method avaible to all arrays that assigns each index to the function given -> for each url in urlPages we get assocoate jobs
        // we make the url array indices to its assocaited scrapeJobUrls promise


    );

    // we flatten the list of lists into a single list using flat() because each page (promise) returns a list of job urls
    return allResults.flat();
}
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

