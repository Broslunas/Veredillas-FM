const fs = require('fs');
const path = require('path');

const inputFile = path.join(__dirname, 'transcript_raw.txt');

try {
    if (!fs.existsSync(inputFile)) {
        console.error(`Error: File ${inputFile} not found.`);
        console.log("Please create 'transcript_raw.txt' in the scripts folder with your content.");
        process.exit(1);
    }

    const raw = fs.readFileSync(inputFile, 'utf8');
    const lines = raw.split('\n');
    const transcription = [];

    // Regex to capture timestamp and text, stripping out the "Speaker: " prefix
    // Matches: [00:00] Speaker Name: Actual Text
    // Captures: 00:00 and Actual Text
    const regex = /^\[(\d{1,2}:\d{2})\]\s*(?:[^:]+:\s*)?(.*)/;

    lines.forEach(line => {
        const cleanLine = line.trim();
        if (!cleanLine) return;

        const match = cleanLine.match(regex);
        if (match) {
            const time = match[1];
            // match[2] corresponds to the (.*) group which is the content AFTER the speaker prefix
            const textContent = match[2] ? match[2].trim() : "";

            transcription.push({
                time: time,
                text: textContent.replace(/"/g, '\\"') // Escape quotes
            });
        }
    });

    console.log('\nCopy the following block into your .md file:\n');
    console.log('transcription:');
    transcription.forEach(t => {
        console.log(`  - time: "${t.time}"`);
        console.log(`    text: "${t.text}"`);
    });
    console.log('\n');

} catch (e) {
    console.error("An error occurred:", e);
}
