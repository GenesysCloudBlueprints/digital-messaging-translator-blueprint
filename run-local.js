const https = require('https');
const fs = require('fs');
const express = require('express');
const { Translate } = require('@aws-sdk/client-translate');
const platformClient = require('purecloud-platform-client-v2');
require('dotenv').config();
const cors = require('cors');

// Configure the AWS Translate client
const translateService = new Translate({ 
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
});
const app = express();

// Genesys Cloud OAuth credentials, keyed by region
const regions = (process.env.GENESYS_REGIONS || '').split(',').map(r => r.trim()).filter(Boolean);

// Turns a region like "mypurecloud.com" into the env var suffix "MYPURECLOUD_COM"
const regionEnvKey = region => region.toUpperCase().replace(/[^A-Z0-9]/g, '_');

const credentialsByRegion = regions.reduce((acc, region) => {
    const key = regionEnvKey(region);
    acc[region] = {
        clientId: process.env[`GENESYS_CLIENT_ID_${key}`],
        clientSecret: process.env[`GENESYS_CLIENT_SECRET_${key}`]
    };
    return acc;
}, {});

// Allow Genesys Cloud to frame this app, for every configured region
app.use((req, res, next) => {
    const frameAncestors = regions.map(region => `https://apps.${region}`).join(' ');
    res.setHeader(
        'Content-Security-Policy',
        `frame-ancestors 'self' ${frameAncestors}`
    );
    next();
});

// Local ssl certificates
const privateKey = fs.readFileSync('ssl/_localhost.key', 'utf8');
const certificate = fs.readFileSync('ssl/_localhost.crt', 'utf8');
const credentials = {key: privateKey, cert: certificate};

app.use(cors());
app.use(express.static('docs'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const httpsServer = https.createServer(credentials, app);

// Returns the (non-secret) OAuth client ID configured for a given region,
// so the frontend can build the authorize URL for the org it's embedded in.
app.get('/oauth/client-id', (req, res) => {
    const region = req.query.region;
    const credentials = credentialsByRegion[region];

    if (!credentials || !credentials.clientId) {
        return res.status(404).send(`No OAuth client configured for region: ${region}`);
    }

    res.json({ clientId: credentials.clientId });
});

// OAuth callback route - exchanges auth code for token
app.get('/oauth/callback', (req, res) => {
    const authCode = req.query.code;
    const state = req.query.state || '{}';

    if (!authCode) {
        return res.status(400).send('Missing authorization code');
    }

    let region;
    try { region = JSON.parse(state).region; } catch (e) {}

    const credentials = credentialsByRegion[region];
    if (!credentials || !credentials.clientSecret) {
        return res.status(400).send(`No OAuth client configured for region: ${region}`);
    }

    const client = platformClient.ApiClient.instance;
    client.setEnvironment(region);

    client.loginCodeAuthorizationGrant(credentials.clientId, credentials.clientSecret, authCode, `https://localhost:${PORT}/oauth/callback`)
    .then((authData) => {
        const token = authData.accessToken;
        res.redirect(`/?token=${encodeURIComponent(token)}&state=${encodeURIComponent(state)}`);
    })
    .catch((err) => {
        console.error('Auth code exchange failed:', err);
        res.status(500).send('Authentication failed');
    });
});

app.post('/translate', (req, res) => {
    const body = req.body;
    const params = {
        Text: body.raw_text,
        SourceLanguageCode: body.source_language,
        TargetLanguageCode: body.target_language
    };

    // Use the translate service
    translateService.translateText(params)
    .then((data) =>{
        let statusCode = data['$metadata'].httpStatusCode;
        let translatedText = data.TranslatedText;

        res.status(statusCode).json({ 
            source_language: data.SourceLanguageCode,
            translated_text: translatedText
        });
    })
    .catch(err => {
        console.error(err);
        res.status(400);
    });
});


const PORT = process.env.PORT || 8443;
httpsServer.listen(PORT);
console.log(`HTTPS listening on: ${PORT}`);
