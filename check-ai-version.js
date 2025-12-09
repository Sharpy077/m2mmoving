(async () => {
    try {
        const ai = await import('ai');
        console.log('AI Package Exports:', Object.keys(ai));

        // Check streamText if available
        if (ai.streamText) {
            console.log('streamText is present');
            // Cannot easily verify instance methods without running it, 
            // and running it requires API keys/model setup.
            // But checking exports tells us version.
            // v3 has 'OpenAIStream', 'StreamingTextResponse' etc.
            // v5 has 'streamText', 'generateText', 'toDataStreamResponse' (maybe exported?)
            // Actually toDataStreamResponse is method on result.

            // Check if createDataStreamResponse is exported (v3.3+)
            console.log('createDataStreamResponse emitted?', !!ai.createDataStreamResponse);
            console.log('pipeDataStreamToResponse emitted?', !!ai.pipeDataStreamToResponse);

            // Check for legacy exports
            console.log('AIStream present?', !!ai.AIStream);
            console.log('OpenAIStream present?', !!ai.OpenAIStream);
        }
    } catch (error) {
        console.error('Error importing ai:', error);
    }
})();
