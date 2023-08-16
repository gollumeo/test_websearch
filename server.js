const express = require('express');
const axios = require('axios');
const app = express();
const cors = require('cors');
const port = process.env.PORT || 3000;

const corsOptions = {
    origin: '*',
    optionSuccessStatus: 200,
};

app.use(cors(corsOptions));
app.use(express.json());

// Servir des fichiers statiques depuis le dossier "public"
app.use(express.static('public'));

app.post('/api/search', async (req, res) => {
    const query = req.body.query;
    
    try {
        const response = await axios.get(`https://www.google.com/search?q=${encodeURIComponent(query)}`);
        const html = response.data;
        const $ = cheerio.load(html);

        // Extract featured snippet content
        const featuredSnippet = $('div.s[data-hveid="CAIQAA"]');
        let featuredSnippetContent = '';

        if (featuredSnippet.length > 0) {
            featuredSnippetContent = featuredSnippet.text();
        }

        const linkTags = $('a');
        res.send(response.data);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

app.listen(port, () => {
    console.log(`Proxy server listening on port ${port}`);
});
