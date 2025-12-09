// const fetch = require('node-fetch');
// Using global fetch

(async () => {
    try {
        const res = await fetch('http://localhost:3000/api/debug-env');
        const data = await res.json();
        console.log("Env Debug:", data);
    } catch (e) {
        console.error("Error:", e);
    }
})();
