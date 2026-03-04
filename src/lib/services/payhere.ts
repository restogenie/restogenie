import { prisma } from "../db";
import { format, parseISO } from "date-fns";

export class PayhereSyncService {
    private baseUrl = "https://openapi.payhere.in/api/v1";
    private tokens: string[];

    constructor() {
        // Load tokens from env, supporting comma separated for multiple locations if needed
        const tokenString = process.env.PAYHERE_ACESS_TOKENS || "eyJhbGciOiJIUzI1NiJ9.eyJqdGkiOiJkZmEzZGI0ZC1iOWFmLTQxMmEtYmI5ZS03YzM0M2ZjNTViZWEiLCJpc3MiOiJwYXloZXJlLmluIiwiaWF0IjoxNzUxMjc3OTI1LCJuYmYiOjE3NTEyNzc5MjUsImV4cCI6MzMzMDgxODY3MjUsInRva2VuX3R5cGUiOiJhY2Nlc3MiLCJzaWQiOiJwaDE3NDQ2MzA3MTY0MzQ1NDA5NzkiLCJhcHBsaWNhdGlvbl9pZCI6ImNmYjRmMzEwLTFkYTAtNDI4MS1hMDQxLTMwYjg2MWY1YWRiMCIsImFwcGxpY2F0aW9uX3N0YXR1cyI6IkFDVElWQVRFRCIsInNjb3BlIjoiIn0.CN7WS-4kQf0xmuuSe3dHQsds00XkzmzO7nqZxt7GSgc";
        this.tokens = tokenString.split(",");
    }

    private async fetchWithAuth(url: string): Promise<any> {
        for (const token of this.tokens) {
            try {
                const response = await fetch(url, {
                    headers: { "Authorization": token.trim() }
                });
                if (response.ok) {
                    return await response.json();
                } else if (response.status === 401) {
                    continue; // Try next token
                }
            } catch (e) {
                console.error("Fetch error:", e);
            }
        }
        return null;
    }

    private async fetchOrders(dateStr: string): Promise<any[]> {
        const allOrders = [];
        let page = 1;
        const limit = 100;

        while (true) {
            const url = `${this.baseUrl}/orders?start_date=${dateStr}&end_date=${dateStr}&page_number=${page}&page_size=${limit}`;
            const res = await this.fetchWithAuth(url);

            if (!res || !res.data || res.data.length === 0) break;

            allOrders.push(...res.data);

            if (page >= (res.pagination?.total_page || 1)) break;
            page++;
        }
        return allOrders;
    }

    private async fetchPayments(dateStr: string): Promise<any[]> {
        const allPayments = [];
        let page = 1;
        const limit = 100;

        while (true) {
            const url = `${this.baseUrl}/payments?start_date=${dateStr}&end_date=${dateStr}&page_number=${page}&page_size=${limit}`;
            const res = await this.fetchWithAuth(url);

            if (!res || !res.data || res.data.length === 0) break;

            allPayments.push(...res.data);

            if (page >= (res.pagination?.total_page || 1)) break;
            page++;
        }
        return allPayments;
    }

    private parseDatetime(isoStr: string | null | undefined): Date | null {
        if (!isoStr) return null;
        try {
            return parseISO(isoStr.replace("Z", "+00:00"));
        } catch {
            return null;
        }
    }

    public async runSync(targetDate: Date) {
        const dateStr = format(targetDate, "yyyy-MM-dd");

        // 0. Fetch Mappings
        const mappings: Record<string, string> = {};
        try {
            const result = await prisma.menuMapping.findMany({
                where: { provider: "payhere" }
            });
            for (const m of result) {
                mappings[m.original_name] = m.normalized_name;
            }
        } catch (e) {
            console.error("Failed to fetch menu mappings", e);
        }

        // 1. Fetch Orders and Payments
        const orders = await this.fetchOrders(dateStr);
        const payments = await this.fetchPayments(dateStr);

        // 2. Build Payment Map
        const paymentMap: Record<string, any> = {};
        for (const p of payments) {
            const payObj = p.payment || {};
            const oid = payObj.oid;
            if (!oid) continue;

            const status = payObj.status;
            if (status !== "CAPTURE" && status !== "REFUND") continue;

            if (!paymentMap[oid]) {
                paymentMap[oid] = {
                    discount_amount: 0, refunded_amount: 0, point_used_amount: 0,
                    prepaid_used_amount: 0, paid_amount: 0, customer: null
                };
            }

            const pMap = paymentMap[oid];
            if (status === "CAPTURE") {
                pMap.discount_amount += (payObj.discount_amount || 0);
                pMap.paid_amount += (payObj.captured_amount || 0);
                pMap.point_used_amount += (payObj.point_amount || 0);
            }

            pMap.refunded_amount += (payObj.refunded_amount || 0);

            if (payObj.payment_method === "PREPAID") {
                pMap.prepaid_used_amount += (payObj.captured_amount || 0);
            }

            if (p.customer) {
                pMap.customer = p.customer;
            }
        }

        // 3. Filter PAID orders
        const paidOrders = orders.filter((o: any) => o.order_status === "PAID");

        const salesToSave: any[] = [];
        const menuToSave: any[] = [];

        for (const order of paidOrders) {
            const oid = order.oid;
            const pmt = paymentMap[oid] || {};

            let deliveryApp = null;
            let deliveryOrderNo = null;

            if (order.channel) {
                const ch = order.channel;
                deliveryApp = ch.name || ch.channel_name || ch.app_name;
                deliveryOrderNo = ch.order_no || ch.order_number;
            } else if (order.delivery) {
                const dl = order.delivery;
                deliveryApp = dl.platform || dl.app_name || dl.name;
                deliveryOrderNo = dl.platform_order_code || dl.order_no || dl.order_number;
            }

            const customerData = pmt.customer || {};
            const origCustomerData = order.customer || {};

            const createdAt = this.parseDatetime(order.created_at) || new Date();

            salesToSave.push({
                oid: oid,
                provider: "payhere",
                business_date: targetDate, // Will be cast to Date in DB
                created_at: createdAt,
                order_name: order.order_name || null,
                order_from: order.order_from || null,
                order_status: order.order_status || null,
                ordered_amount: order.ordered_amount || 0,
                paid_amount: pmt.paid_amount || 0,
                point_used_amount: pmt.point_used_amount || 0,
                customer_point_earned: origCustomerData.point_earned || 0,
                prepaid_used_amount: pmt.prepaid_used_amount || 0,
                discount_amount: pmt.discount_amount || 0,
                refunded_amount: pmt.refunded_amount || 0,
                customer_uid: customerData.uid || null,
                customer_mobile: customerData.mobile_phone_number || null,
                delivery_app: deliveryApp || null,
                delivery_order_no: deliveryOrderNo || null,
            });

            const orderItems = order.order_items || [];
            for (let idx = 0; idx < orderItems.length; idx++) {
                const item = orderItems[idx];
                const mainSeq = idx + 1;
                const rawProdName = item.product_name || "";
                const normProdName = mappings[rawProdName] || rawProdName;

                const options = item.options || [];
                if (options.length > 0) {
                    for (const opt of options) {
                        menuToSave.push({
                            oid: oid,
                            main_item_seq: mainSeq,
                            created_at: createdAt,
                            product_name: normProdName,
                            product_price: item.product_price || 0,
                            quantity: item.quantity || 0,
                            total_price: item.total_price || 0,
                            option_external_key: opt.option_external_key || null,
                            option_name: opt.option_name || null,
                            option_price: opt.option_price || 0
                        });
                    }
                } else {
                    menuToSave.push({
                        oid: oid,
                        main_item_seq: mainSeq,
                        created_at: createdAt,
                        product_name: normProdName,
                        product_price: item.product_price || 0,
                        quantity: item.quantity || 0,
                        total_price: item.total_price || 0,
                        option_external_key: null,
                        option_name: null,
                        option_price: null
                    });
                }
            }
        }

        // 4. DB Transactions via Prisma
        try {
            await prisma.$transaction(async (tx) => {
                // Delete existing data for the target date to ensure idempotency
                await tx.menuLineItem.deleteMany({
                    where: {
                        sale: {
                            provider: "payhere",
                            business_date: targetDate
                        }
                    }
                });

                await tx.sale.deleteMany({
                    where: {
                        provider: "payhere",
                        business_date: targetDate
                    }
                });

                // Insert Sales
                if (salesToSave.length > 0) {
                    await tx.sale.createMany({
                        data: salesToSave,
                        skipDuplicates: true, // Safety in case of manual inserts
                    });
                }

                // Insert Menus
                if (menuToSave.length > 0) {
                    await tx.menuLineItem.createMany({
                        data: menuToSave,
                    });
                }

                // Log System Event
                await tx.systemLog.create({
                    data: {
                        level: "INFO",
                        source: "PayhereSync",
                        message: `Synced ${salesToSave.length} sales and ${menuToSave.length} menu items for ${dateStr}`
                    }
                });
            });

            return {
                date: dateStr,
                provider: "payhere",
                sales_count: salesToSave.length,
                menu_items_count: menuToSave.length
            };
        } catch (error: any) {
            console.error("Prisma Transaction Failed: ", error);
            await prisma.systemLog.create({
                data: {
                    level: "ERROR",
                    source: "PayhereSync",
                    message: `Database sync failed for ${dateStr}: ${error.message}`
                }
            });
            throw error;
        }
    }
}
