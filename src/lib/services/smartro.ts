import { prisma } from "../db";
import { format, parse } from "date-fns";

export class SmartroSyncService {
    private apiBaseUrl = "https://t-exttran.smilebiz.co.kr/V1/sales";
    private storeId: number;
    private authKey: string;
    private compNo: string;
    private storeCode: string;

    constructor(storeId: number, authKey: string, compNo: string, storeCode: string) {
        this.storeId = storeId;
        this.authKey = authKey;
        this.compNo = compNo;
        this.storeCode = storeCode;
    }

    private async fetchSmartroApi(endpoint: string, dateStr: string): Promise<any | null> {
        const url = `${this.apiBaseUrl}${endpoint}?COMP_NO=${this.compNo}&SHOP_CD=${this.storeCode}&SALE_DATE=${dateStr}`;
        const headers = {
            "Accept": "application/json",
            "Authorization": `Bearer ${this.authKey}`
        };

        try {
            const response = await fetch(url, { headers });
            if (response.ok) {
                return await response.json();
            }
        } catch (e) {
            console.error("Failed to fetch Smartro API: ", e);
        }
        return null;
    }

    private safeDate(dateStr: string): string {
        if (!dateStr) return "";
        if (dateStr.includes("-")) return dateStr.split(" ")[0];
        if (dateStr.length === 8) return `${dateStr.substring(0, 4)}-${dateStr.substring(4, 6)}-${dateStr.substring(6, 8)}`;
        return dateStr;
    }

    private parseDatetime(dateStr: string | null, formats: string[]): Date | null {
        if (!dateStr) return null;
        for (const fmt of formats) {
            try {
                const parsed = parse(dateStr, fmt, new Date());
                if (!isNaN(parsed.getTime())) return parsed;
            } catch {
                // Ignore and try next format
            }
        }
        return null;
    }

    public async runSync(targetDate: Date) {
        const dateStr = format(targetDate, "yyyyMMdd");

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

        const headData = await this.fetchSmartroApi("/getSaleHeadInfo", dateStr);
        const detailData = await this.fetchSmartroApi("/getSaleDetailInfo", dateStr);

        if (!headData || !headData.SALE_INFO || headData.SALE_INFO.length === 0) {
            return {
                date: format(targetDate, "yyyy-MM-dd"),
                provider: "smartro",
                sales_count: 0,
                menu_items_count: 0
            };
        }

        const rawHeads = headData.SALE_INFO || [];
        const rawDetails = (detailData && detailData.SALE_INFO) ? detailData.SALE_INFO : [];

        const salesToSave: any[] = [];
        const menuToSave: any[] = [];

        for (const head of rawHeads) {
            const oid = String(head.INV_SEQ || "");
            if (!oid) continue;

            const grandTotal = parseFloat(head.GRAND_TOTAL || "0");
            const isRefund = grandTotal < 0;
            const orderStatus = isRefund ? "REFUND" : "PAID";
            const orderDateStr = head.ORDER_DATE || head.CR_DATE || "";

            const orderDetails = rawDetails.filter((d: any) => String(d.INV_SEQ || "") === oid);

            let orderName = "주문명 미상";
            if (orderDetails.length > 0) {
                const mainItems = orderDetails.filter((d: any) => String(d.YN_SET_OPTION || "") !== "Y");
                const firstItemName = mainItems.length > 0
                    ? (mainItems[0].ID_DESC || "메뉴")
                    : (orderDetails[0].ID_DESC || "메뉴");
                const extraCount = mainItems.length > 1 ? mainItems.length - 1 : 0;
                orderName = extraCount > 0 ? `${firstItemName} 외 ${extraCount}건` : firstItemName;
            }

            const bDateStr = this.safeDate(head.SALE_DATE || dateStr);
            let bDate = targetDate;
            const parsedBDate = this.parseDatetime(bDateStr, ["yyyy-MM-dd", "yyyyMMdd"]);
            if (parsedBDate) bDate = parsedBDate;

            let createdAtDt = targetDate; // Default fallback
            if (orderDateStr) {
                const parsed = this.parseDatetime(orderDateStr, ["yyyy-MM-dd HH:mm:ss", "yyyy-MM-dd", "yyyyMMdd"]);
                if (parsed) createdAtDt = parsed;
            }

            salesToSave.push({
                store_id: this.storeId,
                oid: oid,
                provider: "smartro",
                business_date: bDate,
                created_at: createdAtDt,
                order_name: orderName,
                order_from: "POS",
                order_status: orderStatus,
                ordered_amount: Math.abs(parseFloat(head.GROSS_AMT || "0")),
                paid_amount: Math.abs(grandTotal),
                point_used_amount: Math.abs(parseFloat(head.AX_POINT || "0")),
                customer_point_earned: 0,
                prepaid_used_amount: 0,
                discount_amount: Math.abs(parseFloat(head.DC_AMT || "0")),
                refunded_amount: isRefund ? Math.abs(grandTotal) : 0,
                customer_uid: String(head.PNTASP_CUSTID || ""),
                customer_mobile_phone_number: null,
                delivery_app: "NONE",
                delivery_order_no: null
            });

            let mainSeq = 0;
            let currentOptSeq = 1;
            for (let idx = 0; idx < orderDetails.length; idx++) {
                const detail = orderDetails[idx];
                const isOption = String(detail.YN_SET_OPTION || "") === "Y";
                if (!isOption) {
                    mainSeq += 1;
                    currentOptSeq = 1;
                }

                let cDt = createdAtDt;
                const detailDateStr = detail.CR_DATE || orderDateStr;
                if (detailDateStr) {
                    const parsed = this.parseDatetime(detailDateStr, ["yyyy-MM-dd HH:mm:ss"]);
                    if (parsed) cDt = parsed;
                }

                if (!isOption) {
                    const rawProdName = detail.ID_DESC || "";
                    const normProdName = mappings[rawProdName] || rawProdName;

                    menuToSave.push({
                        store_id: this.storeId,
                        oid: oid,
                        main_item_seq: mainSeq,
                        created_at: cDt,
                        product_name: normProdName,
                        product_price: Math.abs(parseFloat(detail.POSPRICE || detail.QTYPRICE || "0")),
                        quantity: parseInt(detail.QTY || "1", 10),
                        total_price: Math.abs(parseFloat(detail.SUMPRICE || "0")),
                        option_name: null,
                        option_seq: null,
                        option_id: null,
                        option_price: null
                    });
                } else {
                    // Find parent
                    let parentItem = null;
                    for (let pIdx = idx - 1; pIdx >= 0; pIdx--) {
                        if (String(orderDetails[pIdx].YN_SET_OPTION || "") !== "Y") {
                            parentItem = orderDetails[pIdx];
                            break;
                        }
                    }

                    const pNameRaw = parentItem ? (parentItem.ID_DESC || "") : "";
                    const pNameNorm = mappings[pNameRaw] || pNameRaw;
                    const pPrice = parentItem ? Math.abs(parseFloat(parentItem.POSPRICE || parentItem.QTYPRICE || "0")) : 0;
                    const pTotal = parentItem ? Math.abs(parseFloat(parentItem.SUMPRICE || "0")) : 0;

                    menuToSave.push({
                        store_id: this.storeId,
                        oid: oid,
                        main_item_seq: mainSeq,
                        created_at: cDt,
                        product_name: pNameNorm,
                        product_price: pPrice,
                        quantity: parseInt(detail.QTY || "1", 10),
                        total_price: pTotal,
                        option_name: detail.ID_DESC || "",
                        option_seq: currentOptSeq++,
                        option_id: detail.ID_CODE || "",
                        option_price: Math.abs(parseFloat(detail.POSPRICE || detail.QTYPRICE || "0"))
                    });
                }
            }
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
                        message: `Synced ${salesToSave.length} sales and ${menuToSave.length} menu items for ${dateStr}`
                    }
                });
            });

            return {
                date: format(targetDate, "yyyy-MM-dd"),
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
                    message: `Database sync failed for ${dateStr}: ${error.message}`
                }
            });
            throw error;
        }
    }
}
