export default {
    redirectUri: 'https://localhost:8443/oauth/callback',

    genesysCloud: {
        // Fallback region, used only when the app isn't embedded in a Genesys
        // Cloud iframe (so there's no gcHostOrigin to detect the region from),
        // e.g. when testing this page directly in a browser.
        // eg. 'mypurecloud.ie', 'euw2.pure.cloud', etc...
        defaultRegion: 'mypurecloud.com'
    },

    translateServiceURI: 'https://localhost:8443/translate'
}