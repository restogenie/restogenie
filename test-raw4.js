const { format, subDays } = require("date-fns");
const iconv = require("iconv-lite");
const accessToken = "eyJhbGciOiJIUzI1NiJ9.eyJqdGkiOiJkZmEzZGI0ZC1iOWFmLTQxMmEtYmI5ZS03YzM0M2ZjNTViZWEiLCJpc3MiOiJwYXloZXJlLmluIiwiaWF0IjoxNzUxMjc3OTI1LCJuYmYiOjE3NTEyNzc5MjUsImV4cCI6MzMzMDgxODY3MjUsInRva2VuX3R5cGUiOiJhY2Nlc3MiLCJzaWQiOiJwaDE3NDQ2MzA3MTY0MzQ1NDA5NzkiLCJhcHBsaWNhdGlvbl9pZCI6ImNmYjRmMzEwLTFkYTAtNDI4MS1hMDQxLTMwYjg2MWY1YWRiMCIsImFwcGxpY2F0aW9uX3N0YXR1cyI6IkFDVElWQVRFRCIsInNjb3BlIjoiIn0.CN7WS-4kQf0xmuuSe3dHQsds00XkzmzO7nqZxt7GSgc";
async function run() {
    for (let i = 95; i < 300; i+=10) {
        const targetDateStr = format(subDays(new Date(), i), "yyyy-MM-dd");
        const url = `https://openapi.payhere.in/api/v1/orders?start_date=${targetDateStr}&end_date=${targetDateStr}&page_number=1&page_size=100`;
        try {
            const res = await fetch(url, { headers: { "Authorization": accessToken } });
            if (res.ok) {
                const buffer = Buffer.from(await res.arrayBuffer());
                const json = JSON.parse(iconv.decode(buffer, 'utf8'));
                if (json.data && json.data.length > 0) {
                    console.log(`FOUND data on ${targetDateStr}!`);
                    return;
                }
            }
        } catch(e) {}
    }
    console.log("No data found up to 300 days ago.");
}
run();
