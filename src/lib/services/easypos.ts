import { prisma } from "../db";
import { format } from "date-fns";
import iconv from "iconv-lite";

export class EasyposSyncService {
    private kiccApiUrl = "https://poson.easypos.net/servlet/EasyPosJsonChannelSVL?cmd=TlxSyncEasyposSaleCMD";
    private storeId: number;
    private kiccHdCode: string;
    private kiccSpCode: string;

    constructor(storeId: number, hdCode: string, spCode: string) {
        this.storeId = storeId;
        this.kiccHdCode = hdCode;
        this.kiccSpCode = spCode;
    }

    private async fetchEasyposData(dateStr: string): Promise<any | null> {
        const kiccDate = dateStr.replace(/-/g, "");
        const payload = {
            s_code: "8",
            hd_code: this.kiccHdCode,
            sp_code: this.kiccSpCode,
            sale_date: kiccDate
        };

        try {
            // In Node.js environment, the default fetch does not natively support EUC-KR decode for JSON
            // But since this is a Next.js API, we can use fetch and parse standard JSON. 
            // If the API strictly returns non-UTF8 encoded bytes, we might need iconv-lite. 
            // Assuming it returns standard application/json UTF-8 for now.
            const response = await fetch(this.kiccApiUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                const arrayBuffer = await response.arrayBuffer();
                const buffer = Buffer.from(arrayBuffer);
                // Easypos/KICC legacy API often uses EUC-KR or CP949
                const decodedText = iconv.decode(buffer, 'euc-kr');
                const data = JSON.parse(decodedText);

                if (data.ret_code === "0000") {
                    return data;
                }
            }
        } catch (e) {
            console.error("Failed to fetch KICC Easypos data:", e);
        }
        return null;
    }

    private formatDatetime(kiccDt: string | null): Date {
        if (!kiccDt || kiccDt.length !== 14) return new Date();
        try {
            return new Date(
                parseInt(kiccDt.substring(0, 4)),
                parseInt(kiccDt.substring(4, 6)) - 1, // Month is 0-indexed in JS
                parseInt(kiccDt.substring(6, 8)),
                parseInt(kiccDt.substring(8, 10)),
                parseInt(kiccDt.substring(10, 12)),
                parseInt(kiccDt.substring(12, 14))
            );
        } catch {
            return new Date();
        }
    }

    public async runSync(targetDate: Date) {
        const dateStr = format(targetDate, "yyyy-MM-dd");

        // 0. Fetch Mappings
        const mappings: Record<string, string> = {};
        try {
            const result = await prisma.menuMapping.findMany({
                where: { store_id: this.storeId, provider: "easypos" }
            });
            for (const m of result) {
                mappings[m.original_name] = m.normalized_name;
            }
        } catch (e) {
            console.error("Failed to fetch menu mappings for easypos", e);
        }

        // 1. Fetch from KICC
        const kiccData = await this.fetchEasyposData(dateStr);
        if (!kiccData) {
            return { date: dateStr, provider: "easypos", sales_count: 0, menu_items_count: 0 };
        }

        const headers = kiccData.sale_header || [];
        const details = kiccData.sale_detail || [];

        // 2. Process Details
        const saleYBillNos = new Set<string>();
        const mainItemsByBill: Record<string, any[]> = {};
        const optionsByParent: Record<string, any[]> = {};

        // 1st Pass
        for (const item of details) {
            const saleFlag = (item.sale_flag || "").trim();
            if (saleFlag === 'Y') {
                const key = `${item.bill_no}_${item.pos_no}`;
                saleYBillNos.add(key);

                const subMenuFlag = (item.sub_menu_flag || "").trim();
                if (subMenuFlag === 'N') {
                    if (!mainItemsByBill[key]) mainItemsByBill[key] = [];
                    mainItemsByBill[key].push(item);
                } else if (subMenuFlag === 'Y') {
                    const parentDetailNo = parseInt(item.parent_detail_no || "0", 10);
                    const parentKey = `${key}_${parentDetailNo}`;
                    if (!optionsByParent[parentKey]) optionsByParent[parentKey] = [];
                    optionsByParent[parentKey].push(item);
                }
            }
        }

        const menuToSave: any[] = [];
        const orderNameMap: Record<string, string> = {};
        const orderTimeMap: Record<string, { formatted: Date, raw: string }> = {};

        // 2nd Pass (Build Menu Line Items and compute composite OID)
        for (const key of Object.keys(mainItemsByBill)) {
            const mainItemsList = mainItemsByBill[key];
            let firstItemRawTime = 'NO_TIME';
            let firstItemPosNo = 'NO_POS';
            let firstItemBillNo = 'NO_BILL';
            let createdAtDt = new Date();

            if (mainItemsList && mainItemsList.length > 0) {
                const firstItem = mainItemsList[0];
                const firstItemName = firstItem.item_name || "";
                const otherItemsCount = mainItemsList.length - 1;

                const orderName = otherItemsCount > 0 ? `${firstItemName} 외 ${otherItemsCount}건` : firstItemName;
                orderNameMap[key] = orderName;

                createdAtDt = this.formatDatetime(firstItem.order_datetime);
                firstItemRawTime = firstItem.order_datetime || "NO_TIME";
                firstItemPosNo = firstItem.pos_no || "NO_POS";
                firstItemBillNo = firstItem.bill_no || "NO_BILL";

                orderTimeMap[key] = { formatted: createdAtDt, raw: firstItemRawTime };
            }

            for (let idx = 0; idx < mainItemsList.length; idx++) {
                const mainItem = mainItemsList[idx];
                const mainSeq = idx + 1;
                const currDt = this.formatDatetime(mainItem.order_datetime);

                // Composite Unique OID
                const datePart = firstItemRawTime.length >= 8 ? firstItemRawTime.substring(0, 8) : firstItemRawTime;
                const uniqueOid = `${datePart}_${firstItemPosNo}_${firstItemBillNo}`;

                // Add main menu
                const rawProdName = mainItem.item_name || "";
                const normProdName = mappings[rawProdName] || rawProdName;

                menuToSave.push({
                    store_id: this.storeId,
                    provider: "easypos",
                    oid: uniqueOid,
                    main_item_seq: mainSeq,
                    created_at: currDt,
                    product_name: normProdName,
                    product_price: parseFloat(mainItem.item_price || "0"),
                    quantity: parseInt(mainItem.qty || "0", 10),
                    total_price: parseFloat(mainItem.total_amt || "0"),
                    option_name: null,
                    option_seq: null,
                    option_id: null,
                    option_price: null
                });

                // Add options
                const currentDetailNo = parseInt(mainItem.detail_no || "0", 10);
                const parentKey = `${key}_${currentDetailNo}`;
                const childOptions = optionsByParent[parentKey] || [];

                let optSeq = 1;
                for (const option of childOptions) {
                    const optName = (option.item_name || "").trim();
                    if (optName === "선택안함") continue;

                    menuToSave.push({
                        store_id: this.storeId,
                        provider: "easypos",
                        oid: uniqueOid,
                        main_item_seq: mainSeq,
                        created_at: currDt,
                        product_name: normProdName,
                        product_price: 0,
                        quantity: parseInt(option.qty || "0", 10),
                        total_price: parseFloat(option.total_amt || "0"),
                        option_name: optName,
                        option_seq: optSeq++,
                        option_id: option.item_code || null,
                        option_price: parseFloat(option.item_price || "0")
                    });
                }
            }
        }

        // 3. Process Headers to Sales DB Items
        const salesToSave: any[] = [];
        const kiccDateStr = dateStr.replace(/-/g, "");

        for (const header of headers) {
            const billNo = header.bill_no || "";
            const posNo = header.pos_no || "";
            const key = `${billNo}_${posNo}`;

            if (!saleYBillNos.has(key)) continue;

            const saleFlag = (header.sale_flag || "").trim();
            const cancelFlag = (header.cancel_flag || "").trim();

            if (saleFlag !== "Y" || cancelFlag !== "N") continue;

            const orderTimeInfo = orderTimeMap[key] || { raw: "NO_TIME", formatted: new Date() };
            const rawOrderTime = orderTimeInfo.raw;
            const datePart = rawOrderTime.length >= 8 ? rawOrderTime.substring(0, 8) : kiccDateStr;
            const uniqueOid = `${datePart}_${posNo}_${billNo}`;

            // Phone extraction
            const rawName = header.cust_name || "";
            const rawHp = header.hp_no || "";
            const rawTel = header.tel_no || "";
            const rawCard = header.cust_card_no || "";

            let isNamePhone = false;
            let cardPhone = null;

            if (rawName) {
                const cleaned = rawName.replace(/[^0-9]/g, '');
                if (cleaned.length >= 9 && cleaned.startsWith('0')) isNamePhone = true;
            }
            if (rawCard) {
                const cleaned = rawCard.replace(/[^0-9]/g, '');
                if (cleaned.length >= 9 && cleaned.startsWith('0')) cardPhone = cleaned;
            }

            const bestPhone = rawHp || rawTel || cardPhone || (isNamePhone ? rawName : null);

            salesToSave.push({
                store_id: this.storeId,
                oid: uniqueOid,
                provider: "easypos",
                business_date: targetDate,
                created_at: orderTimeInfo.formatted,
                order_name: orderNameMap[key] || "주문명 없음",
                order_from: posNo,
                order_status: "PAID",
                ordered_amount: parseFloat(header.total_amt || "0"),
                paid_amount: parseFloat(header.sale_amt || "0"),
                point_used_amount: parseFloat(header.cust_use_point || "0"),
                customer_point_earned: parseFloat(header.cust_accum_point || "0"),
                prepaid_used_amount: parseFloat(header.prepaid_card_amt || "0"),
                discount_amount: parseFloat(header.total_dc_amt || "0"),
                refunded_amount: 0,
                customer_uid: header.cust_card_no || null,
                customer_mobile_phone_number: bestPhone,
                delivery_app: null,
                delivery_order_no: null
            });
        }

        const oids = new Set(salesToSave.map(s => s.oid));
        const validMenuToSave = menuToSave.filter(m => oids.has(m.oid));

        // DB operations
        try {
            await prisma.$transaction(async (tx) => {
                await tx.menuLineItem.deleteMany({
                    where: { store_id: this.storeId, sale: { provider: "easypos", business_date: targetDate } }
                });

                await tx.sale.deleteMany({
                    where: { store_id: this.storeId, provider: "easypos", business_date: targetDate }
                });

                if (salesToSave.length > 0) {
                    await tx.sale.createMany({ data: salesToSave, skipDuplicates: true });
                }

                if (validMenuToSave.length > 0) {
                    await tx.menuLineItem.createMany({ data: validMenuToSave });
                }

                await tx.systemLog.create({
                    data: {
                        store_id: this.storeId,
                        level: "INFO",
                        source: "EasyposSync",
                        message: `Synced ${salesToSave.length} sales and ${validMenuToSave.length} menu items for ${dateStr}`
                    }
                });
            });

            return {
                date: dateStr,
                provider: "easypos",
                sales_count: salesToSave.length,
                menu_items_count: validMenuToSave.length
            };
        } catch (error: any) {
            console.error("Prisma Transaction Failed: ", error);
            await prisma.systemLog.create({
                data: {
                    store_id: this.storeId,
                    level: "ERROR",
                    source: "EasyposSync",
                    message: `Database sync failed for ${dateStr}: ${error.message}`
                }
            });
            throw error;
        }
    }
}
