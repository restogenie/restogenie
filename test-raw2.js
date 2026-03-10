const { format, subDays } = require("date-fns");
const iconv = require("iconv-lite");

const accessToken = "eyJhbGciOiJIUzI1NiJ9.eyJqdGkiOiJkZmEzZGI0ZC1iOWFmLTQxMmEtYmI5ZS03YzM0M2ZjNTViZWEiLCJpc3MiOiJwYXloZXJlLmluIiwiaWF0IjoxNzUxMjc3OTI1LCJuYmYiOjE3NTEyNzc5MjUsImV4cCI6MzMzMDgxODY3MjUsInRva2VuX3R5cGUiOiJhY2Nlc3MiLCJzaWQiOiJwaDE3NDQ2MzA3MTY0MzQ1NDA5NzkiLCJhcHBsaWNhdGlvbl9pZCI6ImNmYjRmMzEwLTFkYTAtNDI4MS1hMDQxLTMwYjg2MWY1YWRiMCIsImFwcGxpY2F0aW9uX3N0YXR1cyI6IkFDVElWQVRFRCIsInNjb3BlIjoiIn0.CN7WS-4kQf0xmuuSe3dHQsds00XkzmzO7nqZxt7GSgc";

async function run() {
    // Check past 10 days
    for (let i = 0; i < 10; i++) {
        const targetDateStr = format(subDays(new Date(), i), "yyyy-MM-dd");
        console.log("Testing date:", targetDateStr);
        const url = `https://openapi.payhere.in/api/v1/orders?start_date=${targetDateStr}&end_date=${targetDateStr}&page_number=1&page_size=100`;
        
        try {
            const response = await fetch(url, { headers: { "Authorization": accessToken } });
            if (response.ok) {
                const arrayBuffer = await response.arrayBuffer();
                const buffer = Buffer.from(arrayBuffer);
                const decodedText = iconv.decode(buffer, 'utf8');
                const json = JSON.parse(decodedText);
                
                if (json.data && json.data.length > 0) {
                    console.log(`FOUND ${json.data.length} orders on ${targetDateStr}!`);
                    console.log("First Order:", json.data[0].order_name, "- status:", json.data[0].order_status);
                    return; // exit early
                }
            }
        } catch(e) { console.error(e); }
    }
    console.log("No orders found in the last 10 days.");
}
run();
