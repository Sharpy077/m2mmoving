
async function debugApi() {
    try {
        const response = await fetch('http://localhost:3000/api/quote-assistant', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                messages: [{ role: 'user', content: 'Please lookup business Tesla in Sydney.' }]
            }),
        });
        const text = await response.text();
        const lines = text.split('\n');
        for (const line of lines) {
            if (line.startsWith('3:')) {
                console.log("FOUND ERROR CHUNK:");
                try {
                    const json = JSON.parse(line.substring(2));
                    console.log(JSON.stringify(json, null, 2));
                } catch (e) {
                    console.log(line);
                }
            } else if (line.startsWith('0:')) {
                // print text delta briefly
                process.stdout.write(JSON.parse(line.substring(2)));
            }
        }
    } catch (error) {
        console.error('Request failed:', error);
    }
}
debugApi();
