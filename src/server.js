// express is a import that helps make web servers
import express from 'express';

// multer is a import that helps handle file uploads
import multer from 'multer';

// path is a import that helps work with paths (finesses os vs windows issues)
import path from 'path';

//create a server instance using express


// we have to use import becasue we aspecified "type": "module" in package.json otheswise use commin js
// common js has const var = require('module-name'); as opposed to import var from 'module-name';

import { scrapeIndeedJobs } from './scrapy/scraper.js';
import { computeScores } from './scrapy/scraper.js';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);



// create an express app instance that creates a web server)
const app = express();

// create a multer instance to handle file uploads -> basically sets where to store uploaded files
// multer takes the params dest which is the destination folder for uploaded files
const upload = multer({dest: path.join(__dirname, '../uploads')});


app.use(express.static(path.join(__dirname, '../public')));

// the server.js sends a get request to the root url ('/') and serves the pagey.html file to the person
// the get method sends the file when someone visits the root url ->
// get requests are for getting data from the server (from our code bascally)
// get(URL path, callback function: (req, res) => {...})
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/pagey.html'));
});



// post(URL path, middleware, callback function: (req, res) => {...})
// post requests are for sending data to the server (to our code bascally)
// bascially first we upload the file to the uplods folder using multer + the params 'resume' which is the name of the single file input field in the form
// then we have the callback function with req (request) and res (response)

app.post('/apply', upload.single('resume'), (req, res) => {
  const { name, role, age, location } = req.body;
  // can i do : YES I CAN what was done above is destrvuting which is like unpacking using names
  // name = req.body.name ? yes destructuring
  // role = req.body.role
  // age = req.body.age
  // location = req.body.location
  // Looks for <input type="file" name="resume">.
  // Saves the file in uploads/.
  const resume = req.file;

  console.log('New Application:');
  console.log({ name, role, age, location });
  console.log('Resume file:', resume.originalname);

  const num_pages = 5;   // THIS IS HARDCODED FOR NOW, CAN MAKE IT DYNAMIC LATER

  // IIFE to use async await inside a non-async function
  // runs immediately after being defined

  (async () => {
    let timeStart = Date.now();
    const { allJobUrls, allJobDescs, allJobTitles} = await scrapeIndeedJobs(role, location, num_pages, true);
    let timeEnd = Date.now();
    console.log(`Scraping completed in ${(timeEnd - timeStart)/1000} seconds.`);
    // this part takes the most time
    let timeStart2 = Date.now();
    const scores = await computeScores(allJobDescs, resume.path);
    let timeEnd2 = Date.now();
    console.log(`Scoring completed in ${(timeEnd2 - timeStart2)/1000} seconds.`);

    let resultTable = [];

    for (let i = 0; i < allJobUrls.length; i++) {
      if (!allJobTitles[i]) continue;  // skip if Title is empty or null
      resultTable.push({
        title: allJobTitles[i],
        url: allJobUrls[i],
        score: scores[i]
      });
    }
    resultTable.sort((a, b) => b.score - a.score);  // sort descending by score

    const seenUrls = new Set();
    const uniqueResultTable = resultTable.filter(job => {
      if (seenUrls.has(job.url)) {
        return false; // skip duplicates
      }
      seenUrls.add(job.url);
      return true; // keep first occurrence
    });

    console.log('Top Job Matches:');
    console.log(uniqueResultTable);  
    
    console.log('DONE!.');

    res.send(`<h1>Top Job Matches for ${name}</h1>
      <p>Here are the top job matches based on your resume:</p>
      <ol>
      ${resultTable.map((job) => `<li><a href="${job.url}">${job.title}</a> - Score: ${job.score}</li>`).join('')}
      </ol>
    </body>
  </html>`);
  })();
 
  
});


// make the server listen on port 3000 and log a message when it starts
// it takes the paams port number 3000 and the callback fucntion that logs the message
// first the server starts listening on port 3000 then the callback function runs loggins message
app.listen(3000, () => {
  console.log('Server running at http://localhost:3000');
});


// i think that after 61 they stop caring