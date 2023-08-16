const express = require('express');
const axios = require('axios');
const app = express();
const cors = require('cors');
const cheerio = require('cheerio');
const { JSDOM } = require('jsdom');

const port = process.env.PORT || 3000;

const corsOptions = {
    origin: '*',
    optionSuccessStatus: 200,
};

app.use(cors(corsOptions));
app.use(express.json());

app.use(express.static('public'));

app.post('/api/search', async (req, res) => {
    const query = req.body.query;

    try {
        const response = await axios.get(`https://www.google.com/search?q=${encodeURIComponent(query)}`);
        const html = response.data;
        const $ = cheerio.load(html);

        // Extract featured snippet content
        let featuredSnippetContent = '';
        let blockComponentText = ''; // Added to store text of block-component

        $('block-component').each((i, block) => {
            const blockText = $(block).text().toLowerCase();
            if (blockText.includes('featured snippet')) {
                featuredSnippetContent = $(block).text();
            }

            // Added this part to extract text from block-component
            blockComponentText = $(block).text().trim();
        });

        const linkTags = $('a');

        let links = [];

        linkTags.each((i, link) => {
            const href = $(link).attr('href');

            if (href && href.startsWith('/url?q=')) {
                const cleanedHref = href.replace('/url?q=', '').split('&')[0];
                links.push(cleanedHref);
            }
        });

        const filteredLinks = links.filter((link, idx) => {
            const domain = new URL(link).hostname;

            const excludeList = ['google', 'facebook', 'twitter', 'instagram', 'youtube', 'tiktok'];
            return !excludeList.some((site) => domain.includes(site)) && links.findIndex((link) => new URL(link).hostname === domain) === idx;
        });

        const sourceCount = 5;
        const finalLinks = filteredLinks.slice(0, sourceCount);

        const sources = await Promise.all(finalLinks.map(async (link) => {
            try {
                const response = await axios.get(link);
                const html = response.data;
                const dom = new JSDOM(html);
                const doc = dom.window.document;
                const title = doc.title;
                const summary = $('meta[name="description"]').attr('content'); // Change this to target the correct meta tag

                return { url: link, title, summary };
            } catch (error) {
                console.error(error);
                return null;
            }
        }));

        const filteredSources = sources.filter((source) => source !== null);

        res.status(200).json({
            sources: filteredSources,
            featuredSnippet: featuredSnippetContent,
            blockComponentText // Added blockComponentText to the response JSON
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ sources: [], featuredSnippet: '', blockComponentText: '' });
    }
});

app.post('/api/search/details', async (req, res) => {
    const links = req.body.links;

    try {
        const detailedResults = await Promise.all(links.map(async (link) => {
            try {
                const response = await axios.get(link);
                const html = response.data;
                const $ = cheerio.load(html);

                // Extrayez la description de la page (ex : contenu de la balise <meta name="description">)
                const description = $('meta[name="description"]').attr('content');

                return { link, description };
            } catch (error) {
                console.error('Error scraping page:', error);
                return { link, description: 'No description available' };
            }
        }));

        res.status(200).json({ detailedResults });
    } catch (error) {
        console.error('Error fetching data:', error);
        res.status(500).json({ detailedResults: [] });
    }
});

app.listen(port, () => {
    console.log(`Proxy server listening on port ${port}`);
});
