from urllib.parse import quote_plus
from playwright.sync_api import sync_playwright
from bs4 import BeautifulSoup


# run using venv   using python 3.12


def build_indeed_urls(role, location, num_pages):

    # kinda just building the indeed url using role ex  data nalyst and location ex toronto
    """
    this function bascially builds the base url for a ROLE and LOCATION on indeed and returns a list 
    of urls for the number of pages specified
    bacially get url of pages related to "data analyst" in "toronto"  where each page has its own url
    """
    base_url = "https://www.indeed.com/jobs?"
    q = quote_plus(role)
    l = quote_plus(location)

    urls = []
    for page in range(num_pages):
        start = page * 10    
        ## indeed sepreates pages by 10 ^^
        url = f"{base_url}q={q}&l={l}&start={start}&sort=date" 
        urls.append(url)   # each page has its own url therfroe we get num_pages number of urls
    return urls 


def scrape_job_urls(page_url):

    urls = [] # to store each job url from the page 

    with sync_playwright() as p: # browser automation tool that acts like a real user from playwright library

        browser = p.chromium.launch(headless=False) # when false it wokrs when true it doesnt

        # p.chromium.launch : opens a Chromium browser instance (headless means without GUI)

        page = browser.new_page()
        # browser.new_page() : opens a new tab in the browser

        page.goto(page_url)
        # page.goto(page_url) : navigates to the specified URL -> indeed job page
        
        html = page.content()
        # page.content() : gets the HTML content of the page

        browser.close()
        # browser.close() : closes the browser

        

        soup = BeautifulSoup(html, "html.parser")
        # create instance of BeautifulSoup to parse the HTML content


        job_links = soup.select("a[data-jk]")  # all job links have 'data-jk'
        
        # indeed job links are stored in anchor tags with a 'data-jk' attribute
        # select all <a> tags (links) on the page that have the attribute data-jk.
        # bascailly imagine a literal html page and then we find all all <a> tags with data-jk attribute
        # ex: <a href="/job1" data-jk="12345">Software Engineer</a> and collext all that match 

        # soup.selecyt("a[data-jk]") returns a list of all <a> tags with 
        # data-jk attribute [<a/> dfdsf <a> , <a/> dfjskj <a> , ...]


        urls = []
        for link in job_links:
            job_url = "https://www.indeed.com/viewjob?jk=" + link["data-jk"]
            urls.append(job_url)


    return urls


def scrape_indeed_jobs(role, location, num_pages, api_key=None):

    all_job_urls = []
    url_pages = build_indeed_urls(role, location, num_pages)  ## ARRAY OF PAGES TO SCRAPE

    for page_url in url_pages:
        print(f"Scraping: {page_url}") # just to know which page we are scraping SANTIY CHECKks

        result = scrape_job_urls(page_url, api_key)    # for each page we get the actual jobs urls
        
        all_job_urls.extend(result)
    
    return all_job_urls


## TEST USAGE
if __name__ == "__main__":
    role = "Software Engineer"
    location = "Toronto"
    num_pages = 2  # scrape first 2 pages

    job_urls = scrape_indeed_jobs(role, location, num_pages)

    print("\nAll scraped job URLs:")
    for url in job_urls:
        print(url)


# enxt step would be is to actuall apply for these jobs using some automation 