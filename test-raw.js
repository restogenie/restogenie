const { format } = require("date-fns");
const iconv = require("iconv-lite");

const accessToken = "eyJhbGciOiJIUzI1NiJ9.eyJqdGkiOiJkZmEzZGI0ZC1iOWFmLTQxMmEtYmI5ZS03YzM0M2ZjNTViZWEiLCJpc3MiOiJwYXloZXJlLmluIiwiaWF0IjoxNzUxMjc3OTI1LCJuYmYiOjE3NTEyNzc5MjUsImV4cCI6MzMzMDgxODY3MjUsInRva2VuX3R5cGUiOiJhY2Nlc3MiLCJzaWQiOiJwaDE3NDQ2MzA3MTY0MzQ1NDA5NzkiLCJhcHBsaWNhdGlvbl9pZCI6ImNmYjRmMzEwLTFkYTAtNDI4MS1hMDQxLTMwYjg2MWY1YWRiMCIsImFwcGxpY2F0aW9uX3N0YXR1cyI6IkFDVElWQVRFRCIsInNjb3BlIjoiIn0.CN7WS-4kQf0xmuuSe3dHQsds00XkzmzO7nqZxt7GSgc";
const targetDate = format(new Date(), "yyyy-MM-dd");

async function run() {
    console.log("Testing token for date:", targetDate);
    const url = `https://openapi.payhere.in/api/v1/orders?start_date=${targetDate}&end_date=${targetDate}&page_number=1&page_size=100`;
    
    const response = await fetch(url, {
        headers: { "Authorization": accessToken }
    });
    
    console.log("Status:", response.status);
    
    if (response.ok) {
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const decodedText = iconv.decode(buffer, 'utf8');
        const json = JSON.parse(decodedText);
        console.log("Orders extracted:", json.data ? json.data.length : 0);
        if (json.data && json.data.length > 0) {
            console.log("First order example name:", json.data[0].order_name, "- status:", json.data[0].order_status);
        }
    } else {
        const text = await response.text();
        console.log("Error:", text);
    }
}
run();
