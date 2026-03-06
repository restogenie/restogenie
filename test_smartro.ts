import { SmartroSyncService } from './src/lib/services/smartro';
import iconv from 'iconv-lite';

async function main() {
    console.log("Starting Smartro API fetch test...");
    const url = "https://t-exttran.smilebiz.co.kr/V1/sales/getSaleDetailInfo?COMP_NO=2208115014&SHOP_CD=3900145&SALE_DATE=20260305";
    const headers = {
        "Accept": "application/json",
        "Authorization": `Bearer iKR4uGQu0HzoMujRlny3w/lSJxWAR4xjq9ST6xJuhezCQ2RmK52YDaHaIvm/b6Dj`
    };

    const response = await fetch(url, { headers });
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Test different encodings
    console.log("UTF-8 Decode:");
    console.log(buffer.toString('utf8').substring(0, 500));

    console.log("\nEUC-KR Decode:");
    console.log(iconv.decode(buffer, 'euc-kr').substring(0, 500));
}

main().catch(console.error);
