const { PrismaClient } = require("@prisma/client");
const { format, parseISO } = require("date-fns");
const iconv = require("iconv-lite");

const prisma = new PrismaClient();

async function run() {
    const conn = await prisma.posConnection.findFirst({
        where: { store_id: 2, vendor: "payhere" }
    });
    
    if (!conn) {
        console.log("No connection found for store 3");
        return;
    }

    const accessToken = conn.auth_code_1;
    const targetDate = format(new Date(), "yyyy-MM-dd");
    
    console.log("Token:", accessToken);
    
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
        console.log("Orders count:", json.data ? json.data.length : 0);
        if (json.data && json.data.length > 0) {
            console.log("Sample order:", JSON.stringify(json.data[0], null, 2));
        } else {
             console.log("Response:", json);
        }
    } else {
        const text = await response.text();
        console.log("Error Payload:", text);
    }
}
run().finally(() => prisma.$disconnect());
