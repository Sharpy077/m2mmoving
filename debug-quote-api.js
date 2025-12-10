// Native fetch is available in Node 22

async function debugApi() {
    try {
        const response = await fetch('http://localhost:3000/api/quote-assistant', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                messages: [
                    { role: 'user', content: 'Please lookup business Tesla in Sydney.' }
                ]
            }),
        });

        if (!response.ok) {
            console.error('Error status:', response.status);
            console.error('Error text:', await response.text());
            return;
        }

        console.log('Response status:', response.status);
        // The response is  // const reader = response.body.getReader();
        // while (true) {
        //   const { done, value } = await reader.read();
        //   if (done) break;
        //   console.log('Chunk:', value);
        // }

        const text = await response.text();
        console.log('Response text length:', text.length);
        try {
            const json = JSON.parse(text);
            console.log("JSON Response:", JSON.stringify(json, null, 2));
        } catch (e) {
            console.log("Not JSON. Raw stream content (first 2000 chars):");
            console.log(text.slice(0, 2000));
            console.log("... and LAST 2000 chars:");
            console.log(text.slice(-2000));
        }
    } catch (error) {
        console.error('Request failed:', error);
    }
}

debugApi();
