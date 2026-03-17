import { prisma } from "../db";
import { DateTime } from "luxon";

export class MayiSyncService {
    private static async getAuthToken(email: string, password: string): Promise<string | null> {
        try {
            const response = await fetch("https://api.mash-board.io/api/token/", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password })
            });

            if (response.ok) {
                const data = await response.json();
                return data.access;
            }
            console.error("May-I Auth failed:", await response.text());
            return null;
        } catch (e) {
            console.error("May-I Auth Exception:", e);
            return null;
        }
    }

    public static async runSync(email: string, password: string, dashboardId: string, mayiStoreId: string, systemStoreId: number, startDate: Date, endDate: Date) {
        const token = await this.getAuthToken(email, password);
        if (!token) throw new Error("메이아이(CCTV) 인증 토큰 발급에 실패했습니다.");

        const startStr = DateTime.fromJSDate(startDate).toFormat("yyyy-MM-dd");
        const endStr = DateTime.fromJSDate(endDate).toFormat("yyyy-MM-dd");

        console.log(`[May-I Sync] Fetching data from ${startStr} to ${endStr}...`);

        let currentPage = 1;
        let hasNext = true;
        const pageSize = 1000;
        let previousPageSignature = "";

        const allRecordsByWidget: Record<string, any> = {};

        while (hasNext) {
            const url = `https://api.mash-board.io/dashboards/${dashboardId}/data?start_date=${startStr}&end_date=${endStr}&output_type=RAW_JSON&page=${currentPage}&page_size=${pageSize}`;
            
            try {
                const response = await fetch(url, {
                    method: "GET",
                    headers: { "Authorization": `Bearer ${token}` }
                });

                if (!response.ok) break;

                const body = await response.json();
                if (!body.widgets || Object.keys(body.widgets).length === 0) {
                    hasNext = false;
                    break;
                }

                let currentPageSignature = "";
                let hasRecords = false;

                for (const wId in body.widgets) {
                    const w = body.widgets[wId];
                    if (w.data && w.data.records && w.data.records.length > 0) {
                        hasRecords = true;
                        if (!currentPageSignature) {
                            currentPageSignature = JSON.stringify(w.data.records[0]);
                        }
                    }
                }

                if (!hasRecords || (previousPageSignature && currentPageSignature === previousPageSignature)) {
                    hasNext = false;
                    break;
                }

                for (const wId in body.widgets) {
                    const w = body.widgets[wId];
                    if (w.data && w.data.records && w.data.records.length > 0) {
                        if (!allRecordsByWidget[wId]) {
                            allRecordsByWidget[wId] = { name: w.name, data: { records: [], metadata: w.data.metadata } };
                        }
                        allRecordsByWidget[wId].data.records = allRecordsByWidget[wId].data.records.concat(w.data.records);
                    }
                }

                previousPageSignature = currentPageSignature;
                currentPage++;
                
                if (currentPage > 30) hasNext = false; // hard limit
            } catch (e) {
                console.error("Pagination error:", e);
                break;
            }
        }

        // Deduplication & Parsing
        const finalTrafficLines: any[] = [];
        const allowedWidgets = ["매장 방문", "유동인구"];
        const uniqueSet = new Set<string>();

        for (const wId in allRecordsByWidget) {
            const widget = allRecordsByWidget[wId];
            if (!allowedWidgets.includes(widget.name)) continue;

            const records = widget.data.records;
            const metadata = widget.data.metadata || {};
            
            const localMap: Record<string, string> = {};
            for (const k in metadata) {
                localMap[metadata[k].label] = k;
            }

            for (const record of records) {
                const strRep = JSON.stringify(record);
                if (uniqueSet.has(strRep)) continue;
                uniqueSet.add(strRep);

                // Extraction logic: match the record values against the provided mayiStoreId UUID.
                let belongsToStore = false;
                let hasPlaceField = false;

                const storeKey = localMap['매장'] || 'place';
                
                if (storeKey && record[storeKey] !== undefined) {
                    hasPlaceField = true;
                    if (String(record[storeKey]).toLowerCase() === mayiStoreId.toLowerCase()) {
                        belongsToStore = true;
                    }
                } else {
                    // Fallback check: look through all values just in case
                    for (const val of Object.values(record)) {
                        if (String(val).toLowerCase() === mayiStoreId.toLowerCase()) {
                            belongsToStore = true;
                            break;
                        }
                    }
                }

                // If the widget doesn't return store specific IDs, assume it belongs to the whole dashboard (and therefore this store)
                if (!hasPlaceField && !belongsToStore) {
                    belongsToStore = true; 
                }

                if (!belongsToStore) continue;

                const dateKey = localMap['매장 방문 일자'] || localMap['매장 입장 날짜'] || localMap['구역 방문 일자'] || 'place_enter_daily' || 'event_source_enter_daily';
                const timeKey = localMap['매장 방문 시각'] || localMap['매장 입장 시각'] || localMap['구역 방문 시각'] || 'place_enter_hour' || 'event_source_enter_hour';
                const dateTimeKey = localMap['매장 입장 시각'] || localMap['구역 입장 시각'] || 'place_enter_time' || 'event_source_enter_time';

                let visitDateStr = "";
                if (dateKey && record[dateKey]) visitDateStr = record[dateKey];
                else if (record['place_enter_daily']) visitDateStr = record['place_enter_daily'];
                else if (dateTimeKey && record[dateTimeKey]) visitDateStr = record[dateTimeKey].substring(0, 10);

                let visitTimeStr = "";
                if (timeKey && record[timeKey]) visitTimeStr = record[timeKey];
                else if (record['place_enter_hour']) visitTimeStr = record['place_enter_hour'];
                else if (dateTimeKey && record[dateTimeKey] && record[dateTimeKey].includes('T')) visitTimeStr = record[dateTimeKey].split('T')[1].split('.')[0];
                
                // Fallbacks
                if (!visitDateStr) visitDateStr = startStr;
                if (!visitTimeStr) visitTimeStr = "00:00:00";

                const parsedDate = DateTime.fromISO(visitDateStr, { zone: 'Asia/Seoul' }).toJSDate();
                if (isNaN(parsedDate.getTime())) continue;

                const countKey = localMap['방문 횟수'] || 'total_count';
                const visitCount = (countKey && record[countKey] !== undefined) ? parseInt(record[countKey], 10) : 1;

                const ageKey = localMap['연령대'];
                const genderKey = localMap['성별'];

                finalTrafficLines.push({
                    store_id: systemStoreId,
                    widget_name: widget.name,
                    age_group: (ageKey && record[ageKey]) ? String(record[ageKey]) : null,
                    gender: (genderKey && record[genderKey]) ? String(record[genderKey]) : null,
                    visit_date: parsedDate,
                    visit_time: visitTimeStr,
                    visit_count: visitCount,
                    sync_timestamp: new Date()
                });
            }
        }

        if (finalTrafficLines.length > 0) {
            // Transaction: Delete overlapping date range and insert new
            await prisma.$transaction(async (tx) => {
                await tx.footTraffic.deleteMany({
                    where: {
                        store_id: systemStoreId,
                        visit_date: {
                            gte: DateTime.fromISO(startStr).toJSDate(),
                            lte: DateTime.fromISO(endStr).toJSDate()
                        }
                    }
                });

                await tx.footTraffic.createMany({
                    data: finalTrafficLines
                });
            });

            console.log(`[May-I Sync] Successfully upserted ${finalTrafficLines.length} foot traffic records.`);
        } else {
            console.log(`[May-I Sync] No new foot traffic records found for the period.`);
        }
    }
}
