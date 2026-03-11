import { prisma } from "../db";
import { format, parse } from "date-fns";
import iconv from "iconv-lite";

export class SmartroSyncService {
    private apiBaseUrl = "https://exttran.smilebiz.co.kr/V1/sales";
    private storeId: number;
    private authKey: string;
    private compNo: string;
    private storeCode: string;

    constructor(storeId: number, authKey: string, compNo: string, storeCode: string) {
        this.storeId = storeId;
        this.authKey = authKey;
        this.compNo = compNo;
        this.storeCode = storeCode; // Used as STORE_ID in the new API format
    }

    private async fetchSmartroApi(endpoint: string, dateStr: string): Promise<any[]> {
        // According to GAS: ?STORE_ID=${CONFIG.STORE_ID}&SALE_DATE=${dateStr}
        const url = `${this.apiBaseUrl}${endpoint}?STORE_ID=${this.storeCode}&SALE_DATE=${dateStr}`;
        const headers = {
            "Accept": "application/json",
            "Content-Type": "application/json; charset=UTF-8",
            "Authorization": `Bearer ${this.authKey}`
        };

        try {
            const response = await fetch(url, { method: "get", headers });
            if (response.ok) {
                // Since UTF-8 content-type is specified in GAS, try normal JSON parsing first
                // If the response encoding is broken, we will fallback to iconv-lite. 
                // But modern smilebiz APIs use utf-8 as per the new headers.
                const json = await response.json();
                if (json.CODE === "0000" && json.SALE_INFO) {
                    return json.SALE_INFO;
                }
            } else {
                console.warn(`Smartro API returned ${response.status} for ${endpoint}`);
            }
        } catch (e) {
            console.error(`Failed to fetch Smartro API [${endpoint}]: `, e);
        }
        return [];
    }

    private safeDate(dateStr: string): string {
        if (!dateStr) return "";
        if (dateStr.includes("-")) return dateStr.split(" ")[0];
        if (dateStr.length >= 8) return `${dateStr.substring(0, 4)}-${dateStr.substring(4, 6)}-${dateStr.substring(6, 8)}`;
        return dateStr;
    }

    public async runSync(targetDate: Date) {
        const dateStr = format(targetDate, "yyyyMMdd");
        const formattedDate = format(targetDate, "yyyy-MM-dd");

        // 0. Fetch Mappings
        const mappings: Record<string, string> = {};
        try {
            const result = await prisma.menuMapping.findMany({
                where: { store_id: this.storeId, provider: "smartro" }
            });
            for (const m of result) {
                mappings[m.original_name] = m.normalized_name;
            }
        } catch (e) {
            console.error("Failed to fetch menu mappings for smartro", e);
        }

        // 1. Fetch 3 APIs
        const heads = await this.fetchSmartroApi("/getSaleHeadInfo", dateStr);
        const details = await this.fetchSmartroApi("/getSaleDetailInfo", dateStr);
        const additives = await this.fetchSmartroApi("/getSaleAdditiveInfo", dateStr);

        if (heads.length === 0) {
            return {
                date: formattedDate,
                provider: "smartro",
                sales_count: 0,
                menu_items_count: 0
            };
        }

        const salesToSave: any[] = [];
        const menuToSave: any[] = [];

        // 2. Data Processing and Mapping (Join)
        // Additive map by OrderKey + ItemCode
        const addMap: Record<string, any[]> = {};
        for (const add of additives) {
            const orderKey = add.INV_SEQ || (`${add.POS_NO}_${add.CR_DATE}`);
            const key = `${orderKey}_${add.ID_CODE}`;
            if (!addMap[key]) addMap[key] = [];
            addMap[key].push(add);
        }

        // Detail map by OrderKey
        const detailMap: Record<string, any[]> = {};
        for (const det of details) {
            const orderKey = det.INV_SEQ || (`${det.POS_NO}_${det.CR_DATE}`);
            if (!detailMap[orderKey]) detailMap[orderKey] = [];
            detailMap[orderKey].push(det);
        }

        for (const head of heads) {
            // "N" is Normal (Paid), C/R are returns depending on the system. GAS script only stores N.
            const isRefund = head.SALE_STAT !== 'N';

            const orderKey = head.INV_SEQ || (`${head.POS_NO}_${head.ORDER_DATE || head.CR_DATE}`);
            const orderDetails = detailMap[orderKey] || [];

            let orderName = "주문명 미상";
            if (orderDetails.length > 0) {
                const firstItemName = orderDetails[0].ID_DESC || orderDetails[0].ID_MENUNAME || "메뉴";
                if (orderDetails.length > 1) {
                    orderName = `${firstItemName} 외 ${orderDetails.length - 1}건`;
                } else {
                    orderName = firstItemName;
                }
            }

            const orderNo = String(head.INV_PRTNUM || head.INV_SEQ || "UNKNOWN");
            const orderTimeStr = head.ORDER_DATE || head.CR_DATE || "";
            
            let cDt = targetDate;
            if (orderTimeStr) {
                try {
                    cDt = parse(orderTimeStr, "yyyy-MM-dd HH:mm:ss", new Date());
                    if (isNaN(cDt.getTime())) cDt = parse(orderTimeStr, "yyyyMMddHHmmss", new Date());
                    
                    if (isNaN(cDt.getTime())) {
                        cDt = targetDate;
                    } else {
                        // Vercel parses the KST string as UTC, effectively pushing it 9 hours into the future.
                        cDt = new Date(cDt.getTime() - 9 * 60 * 60 * 1000);
                    }
                } catch { cDt = targetDate; }
            }

            const grossAmt = parseFloat(head.GROSS_AMT || head.AX_AMT || "0");
            const netAmt = parseFloat(head.NET_AMT || head.AX_AMT || "0");
            const dcAmt = parseFloat(head.DC_AMT || "0");
            
            // Delivery extraction logic
            let deliveryApp = "NONE";
            let deliveryOrderNo = null;
            if (head.INV_USERNAME) {
                const uName = head.INV_USERNAME;
                if (uName.includes('테이블오더')) deliveryApp = '테이블오더';
                else if (uName.includes('배달')) deliveryApp = '배달';
                else if (uName.includes('요기요')) deliveryApp = '요기요';
                else if (uName.includes('쿠팡')) deliveryApp = '쿠팡이츠';
                else if (uName.includes('배민') || uName.includes('배달의민족')) deliveryApp = '배달의민족';
            }
            if (head.CNT_CALL_ID) deliveryOrderNo = head.CNT_CALL_ID;

            const customerUid = String(head.PNTASP_CUSTID || head.PNTASP_CUSTNM || "");

            // In our system, we store refunds as negative values or mark order_status=REFUND
            salesToSave.push({
                store_id: this.storeId,
                oid: orderNo, // Unique ID per store/provider
                provider: "smartro",
                business_date: targetDate,
                created_at: cDt,
                order_name: orderName,
                order_from: head.INV_USERNAME || head.POS_NO || "POS",
                order_status: isRefund ? "REFUND" : "PAID",
                ordered_amount: Math.abs(grossAmt),
                paid_amount: Math.abs(netAmt),
                discount_amount: Math.abs(dcAmt),
                refunded_amount: isRefund ? Math.abs(grossAmt) : 0,
                customer_uid: customerUid,
                customer_mobile_phone_number: null,
                delivery_app: deliveryApp,
                delivery_order_no: deliveryOrderNo
            });

            // Process Details & Additives
            orderDetails.forEach((det: any, index: number) => {
                const detKey = `${orderKey}_${det.ID_CODE}`;
                const detAdditives = addMap[detKey] || [];
                
                const rawItemName = det.ID_DESC || det.ID_MENUNAME || "알수없는 상품";
                const itemName = mappings[rawItemName] || rawItemName;
                
                const qty = parseFloat(det.QTY || "1");
                const sumPrice = parseFloat(det.SUMPRICE || "0");
                const itemPrice = qty > 0 ? (sumPrice / qty) : 0;

                // Main Item Row
                menuToSave.push({
                    store_id: this.storeId,
                    provider: "smartro",
                    oid: orderNo,
                    main_item_seq: index + 1,
                    created_at: cDt,
                    product_name: itemName,
                    product_price: Math.abs(itemPrice),
                    quantity: Math.abs(qty),
                    total_price: Math.abs(sumPrice),
                    option_name: null,
                    option_seq: null,
                    option_id: null,
                    option_price: null
                });

                // Option (Additive) Rows
                if (detAdditives.length > 0) {
                    let optSeq = 1;
                    for (const add of detAdditives) {
                        const optNameRaw = add.ADDITIVE_DESC || add.RULE_DESC || "";
                        
                        // Ignore "선택안함"
                        if (optNameRaw && optNameRaw.replace(/\s+/g, '') === "선택안함") continue;

                        const normOptName = mappings[optNameRaw] || optNameRaw;
                        const addQty = parseFloat(add.QTY || "1");
                        const addPrice = parseFloat(add.ADD_PRICE || add.ADDITIVE_AMT || "0");

                        menuToSave.push({
                            store_id: this.storeId,
                            provider: "smartro",
                            oid: orderNo,
                            main_item_seq: index + 1,
                            created_at: cDt,
                            product_name: itemName, // keep parent name for grouping
                            product_price: 0, // Option row, so main price is 0
                            quantity: Math.abs(addQty),
                            total_price: Math.abs(addPrice),
                            option_name: normOptName,
                            option_seq: optSeq++,
                            option_id: add.ID_CODE || "",
                            option_price: Math.abs(addPrice)
                        });
                    }
                }
            });
        }

        // DB operations
        try {
            await prisma.$transaction(async (tx) => {
                await tx.menuLineItem.deleteMany({
                    where: { store_id: this.storeId, sale: { provider: "smartro", business_date: targetDate } }
                });

                await tx.sale.deleteMany({
                    where: { store_id: this.storeId, provider: "smartro", business_date: targetDate }
                });

                if (salesToSave.length > 0) {
                    await tx.sale.createMany({ data: salesToSave, skipDuplicates: true });
                }

                if (menuToSave.length > 0) {
                    await tx.menuLineItem.createMany({ data: menuToSave });
                }

                await tx.systemLog.create({
                    data: {
                        store_id: this.storeId,
                        level: "INFO",
                        source: "SmartroSync",
                        message: `Synced ${salesToSave.length} sales and ${menuToSave.length} menu/option items for ${formattedDate}`
                    }
                });
            });

            return {
                date: formattedDate,
                provider: "smartro",
                sales_count: salesToSave.length,
                menu_items_count: menuToSave.length
            };
        } catch (error: any) {
            console.error("Prisma Transaction Failed: ", error);
            await prisma.systemLog.create({
                data: {
                    store_id: this.storeId,
                    level: "ERROR",
                    source: "SmartroSync",
                    message: `Database sync failed for ${formattedDate}: ${error.message}`
                }
            });
            throw error;
        }
    }
}
