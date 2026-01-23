const fs = require('fs');
const https = require('https');
const file = fs.createWriteStream("public/ticket-banner.png");
const request = https.get("https://www.dropbox.com/scl/fi/4f518qa1ka7gcqkyz1s74/banner.png?rlkey=m6ax8ebyt3nfrkdqqmowgvi11&st=tqin8bbu&dl=1", function (response) {
    response.pipe(file);
    file.on('finish', () => {
        file.close();
        console.log("Download completed");
    });
});
