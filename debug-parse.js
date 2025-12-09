const fs = require('fs');
try {
    const t = fs.readFileSync('debug_output_4.txt', 'utf16le');

    // Try to find the JSON error object explicitly
    const startMarker = '3:{"name":"AI_APICallError"';
    const start = t.lastIndexOf(startMarker);

    if (start !== -1) {
        const jsonStr = t.slice(start + 2); // skip "3:"
        // It is likely truncated, so we can't JSON.parse.
        // Regex extract fields.
        const matchMsg = jsonStr.match(/"message":\s*"(.*?)"/);
        const matchCode = jsonStr.match(/"code":\s*"(.*?)"/);
        const matchCause = jsonStr.match(/"cause":\s*"(.*?)"/);

        console.log('Extracted Message:', matchMsg ? matchMsg[1] : 'Not found');
        console.log('Extracted Code:', matchCode ? matchCode[1] : 'Not found');
        console.log('Extracted Cause:', matchCause ? matchCause[1] : 'Not found');
    } else {
        debugger; // Breakpoint mock
        // fallback: grep for message
        const matchMsg = t.match(/"message":\s*"(.*?)"/);
        console.log("Fallback Message:", matchMsg ? matchMsg[1] : "Not found in file");
    }

} catch (e) {
    console.error(e);
}
