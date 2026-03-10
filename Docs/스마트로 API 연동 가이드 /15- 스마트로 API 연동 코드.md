/**
 * ==========================================================================
 * 스마트로(Smilebiz) API -> Google Sheets 매출 적재 스크립트 (v1.0 최종)
 * 가맹점: 오므토토마토 강남점
 * ==========================================================================
 * * [완성 내역]
 * 1. 3개의 분할된 API(HEAD, DETAIL, ADDITIVE) 일괄 호출 및 자동 병합(Join) 로직 구현
 * 2. GET 요청 시 필수 Header(application/json) 강제 주입
 * 3. 대문자 파라미터(STORE_ID, SALE_DATE) 적용 완료
 * 4. 옵션명 "선택안함" 데이터 적재 제외 처리
 */

const CONFIG = {
  API_BASE_URL: "https://exttran.smilebiz.co.kr", 
  AUTH_TOKEN: "l7ikKsy78Y6580luXdW1TgS/bPVYZxuOLNGdNGjGp1g0BKT29oz4Gfioyv/CrCdu", 
  STORE_ID: "2173838", 

  ENDPOINTS: {
    HEAD: "/V1/sales/getSaleHeadInfo",
    DETAIL: "/V1/sales/getSaleDetailInfo",
    ADDITIVE: "/V1/sales/getSaleAdditiveInfo"
  },
  
  SPREADSHEET_ID: "1yAQFY9aQyn9ryvLY_BNBwDOfunqvR2OI8Hph4NQsIT4", 
  SHEET_NAMES: { 
    SALES_DB: "오므토강남점_SalesDB", 
    MENU_DB: "오므토강남점_MenuDB",
  },
  HEADER_ROWS: 2, 
  BACKFILL_START_DATE: "2025-12-01",

  // salesDB 스키마
  SALES_DB_SCHEMA: [
    { title: "영업일", apiKey: "business_date" }, 
    { title: "고유주문ID", apiKey: "unique_oid" }, 
    { title: "주문번호(oid)", apiKey: "order_no" }, 
    { title: "주문명", apiKey: "order_name" }, 
    { title: "주문 생성 일시", apiKey: "order_datetime" }, 
    { title: "주문 경로", apiKey: "order_channel" }, 
    { title: "주문 상태", apiKey: "order_status" }, 
    { title: "결제 금액", apiKey: "total_amt" }, 
    { title: "실 결제 금액", apiKey: "pay_amt" }, 
    { title: "할인", apiKey: "dc_amt" }, 
    { title: "환불", apiKey: "refund_amt" }, 
    { title: "고객 식별자", apiKey: "customer_id" }, 
    { title: "배달 앱", apiKey: "delivery_app" }, 
    { title: "배달 주문번호", apiKey: "delivery_order_no" } 
  ],

  // menuDB 스키마
  MENU_DB_SCHEMA: [
    { title: "고유주문ID", apiKey: "unique_oid" }, 
    { title: "주문 OID (매칭용)", apiKey: "order_no" }, 
    { title: "메인 메뉴 순번", apiKey: "item_seq" }, 
    { title: "주문 생성일시 (KST)", apiKey: "order_datetime" }, 
    { title: "상품명", apiKey: "item_name" }, 
    { title: "상품 단가", apiKey: "item_price" }, 
    { title: "상품 수량", apiKey: "qty" }, 
    { title: "상품 합계 금액", apiKey: "total_price" }, 
    { title: "옵션명", apiKey: "option_name" }, 
    { title: "옵션 가격", apiKey: "option_price" }, 
  ],
};

/**
 * ==========================================================================
 * 메인 실행 함수 (트리거 및 수동 실행용)
 * ==========================================================================
 */

function runHourlySync() {
  const now = new Date();
  const currentHour = now.getHours(); 
  
  if (currentHour >= 9 || currentHour === 0) { 
    const dateStr = formatDateKST(now, "yyyyMMdd"); 
    Logger.log(`[시간별 동기화 시작] ${dateStr} (오늘) 데이터 새로고침...`);
    fetchAndSaveDataByDate(dateStr);
    Logger.log(`[시간별 동기화 완료] ${dateStr} 데이터 적재 완료.`);
  } else {
    Logger.log(`[시간별 동기화] 현재 시간(${currentHour}시)은 동기화 시간이 아니므로 건너뜁니다.`);
  }
}

function runBackfill() {
  const scriptProperties = PropertiesService.getScriptProperties();
  let currentDateStr = scriptProperties.getProperty('SMARTRO_BACKFILL_CURRENT_DATE');
  
  if (!currentDateStr) {
    const parts = CONFIG.BACKFILL_START_DATE.split('-');
    currentDateStr = parts.join(''); 
  }

  const y = currentDateStr.substring(0,4);
  const m = parseInt(currentDateStr.substring(4,6)) - 1;
  const d = currentDateStr.substring(6,8);
  let currentDate = new Date(y, m, d);
  
  const today = new Date();
  const yesterday = new Date(new Date().setDate(today.getDate() - 1));
  
  const startTime = new Date().getTime();
  const maxExecutionTime = 5 * 60 * 1000; 

  while (currentDate <= yesterday) {
    const currentTime = new Date().getTime();
    if (currentTime - startTime > maxExecutionTime) {
      Logger.log(`[백필 중단] 5분 시간제한 임박. 다음 실행 시 이어갑니다.`);
      return; 
    }
    
    currentDateStr = formatDateKST(currentDate, "yyyyMMdd");
    Logger.log(`[백필 작업] ${currentDateStr} 데이터 적재 중...`);
    
    try {
      fetchAndSaveDataByDate(currentDateStr);
      
      const nextDay = new Date(currentDate.setDate(currentDate.getDate() + 1));
      const nextDateStr = formatDateKST(nextDay, "yyyyMMdd");
      scriptProperties.setProperty('SMARTRO_BACKFILL_CURRENT_DATE', nextDateStr);
      
      Logger.log(`[백필 작업] ${currentDateStr} 완료. 다음: ${nextDateStr}`);
    } catch (e) {
      Logger.log(`[백필 오류] ${currentDateStr} 작업 중 오류: ${e}.`);
      Logger.log(e.stack);
      return; 
    }
  } 

  Logger.log(`[백필 완료] 모든 데이터 적재 완료.`);
  scriptProperties.deleteProperty('SMARTRO_BACKFILL_CURRENT_DATE');
}

function resetAllSheets() {
  Logger.log(`[시트 초기화 시작] 오므토토마토 시트를 초기화합니다...`);
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    const sheetNames = [CONFIG.SHEET_NAMES.SALES_DB, CONFIG.SHEET_NAMES.MENU_DB];
    const schemas = [CONFIG.SALES_DB_SCHEMA, CONFIG.MENU_DB_SCHEMA];

    sheetNames.forEach((name, index) => {
      let sheet = ss.getSheetByName(name);
      if (sheet) {
        sheet.clear();
      } else {
        sheet = ss.insertSheet(name);
      }
      SpreadsheetApp.flush(); 
      if (schemas[index] && schemas[index].length > 0) { 
        const titles = schemas[index].map(col => col.title); 
        const apiKeys = schemas[index].map(col => col.apiKey); 
        sheet.getRange(1, 1, 2, titles.length).setValues([titles, apiKeys]);
      }
    });

    const scriptProperties = PropertiesService.getScriptProperties();
    scriptProperties.deleteProperty('SMARTRO_BACKFILL_CURRENT_DATE');
    Logger.log(`[시트 초기화 완료] 헤더 작성 및 백필 상태 초기화 완료.`);
  } catch (e) {
    Logger.log(`[시트 초기화 오류] ${e}`);
  }
}

/**
 * ==========================================================================
 * 핵심 엔진 함수
 * ==========================================================================
 */

function fetchAndSaveDataByDate(dateStr) {
  Logger.log(`[데이터 적재 시작] ${dateStr} 기준...`);

  try {
    // 1. 3가지 분할된 API 동시 호출
    Logger.log(`-> API 3종(요약, 상세, 옵션) 호출 중...`);
    const heads = fetchSmartroApi(CONFIG.ENDPOINTS.HEAD, dateStr);
    const details = fetchSmartroApi(CONFIG.ENDPOINTS.DETAIL, dateStr);
    const additives = fetchSmartroApi(CONFIG.ENDPOINTS.ADDITIVE, dateStr);
    
    if (heads.length === 0) {
      Logger.log(`[알림] ${dateStr} 날짜에 주문 데이터가 0건입니다.`);
      return;
    }
    
    Logger.log(`[조회 완료] 영수증: ${heads.length}건, 상품: ${details.length}건, 옵션: ${additives.length}건`);

    // 2. 데이터 가공 및 병합 (Join)
    const { salesDataToSave, menuDataToSave } = processSmartroData(heads, details, additives, dateStr);
    
    if (salesDataToSave.length === 0) {
        Logger.log(`[알림] 필터링 결과 적재할 정상(PAID) 주문 데이터가 없습니다.`);
        return;
    }

    // 3. 시트 가져오기
    const salesSheet = getSheet(CONFIG.SHEET_NAMES.SALES_DB, CONFIG.SALES_DB_SCHEMA);
    const menuSheet = getSheet(CONFIG.SHEET_NAMES.MENU_DB, CONFIG.MENU_DB_SCHEMA); 
    if (!salesSheet || !menuSheet) return;

    // 4. 기존 데이터 삭제 (YYYY-MM-DD 형식 비교)
    const formattedDate = `${dateStr.substring(0,4)}-${dateStr.substring(4,6)}-${dateStr.substring(6,8)}`;
    deleteDataByDate(salesSheet, formattedDate, 1); 
    deleteDataByDate(menuSheet, formattedDate, 4); 

    // 5. 시트 저장
    if (salesDataToSave.length > 0) {
      saveToSheet(salesSheet, salesDataToSave);
      Logger.log(`[${CONFIG.SHEET_NAMES.SALES_DB}] ${salesDataToSave.length}건 주문 적재 완료.`);
    }
    if (menuDataToSave.length > 0) {
      saveToSheet(menuSheet, menuDataToSave);
      Logger.log(`[${CONFIG.SHEET_NAMES.MENU_DB}] ${menuDataToSave.length}건 상품 적재 완료.`);
    }

    Logger.log(`[데이터 적재 완료] ${dateStr} 작업 완료!`);

  } catch (e) {
    Logger.log(`[치명적 오류] ${dateStr} 데이터 적재 중 예외 발생: ${e}`);
    Logger.log(e.stack); 
    throw e;
  }
}

/**
 * 분할된 3개의 API 데이터를 하나로 합치고 시트 스키마에 맞게 가공합니다.
 */
function processSmartroData(heads, details, additives, dateStr) {
  const salesDataToSave = [];
  const menuDataToSave = [];
  const formattedDate = `${dateStr.substring(0,4)}-${dateStr.substring(4,6)}-${dateStr.substring(6,8)}`;

  // 1. 첨가물(옵션)을 [영수증키 + 상품ID] 기준으로 맵핑
  const addMap = {};
  additives.forEach(add => {
      // 결제키: INV_SEQ 가 없을 경우 POS번호_결제시간 으로 매칭
      const orderKey = add.INV_SEQ || (`${add.POS_NO}_${add.CR_DATE}`);
      const key = `${orderKey}_${add.ID_CODE}`;
      
      if (!addMap[key]) addMap[key] = [];
      addMap[key].push(add);
  });

  // 2. 상품(상세)을 [영수증키] 기준으로 맵핑
  const detailMap = {};
  details.forEach(det => {
      const orderKey = det.INV_SEQ || (`${det.POS_NO}_${det.CR_DATE}`);
      if (!detailMap[orderKey]) detailMap[orderKey] = [];
      detailMap[orderKey].push(det);
  });

  // 3. 주문 요약(HEAD)을 순회하며 데이터 조립
  heads.forEach(head => {
    // "N"은 정상 결제 (취소 아님)
    if (head.SALE_STAT !== 'N') return; 

    // 매칭용 키 찾기
    const orderKey = head.INV_SEQ || (`${head.POS_NO}_${head.ORDER_DATE}`);
    const orderDetails = detailMap[orderKey] || [];

    // 주문명 조합 ("메인상품명 외 N건")
    let orderName = "주문명 없음";
    if (orderDetails.length > 0) {
        const firstItemName = orderDetails[0].ID_DESC || orderDetails[0].ID_MENUNAME;
        if (orderDetails.length > 1) {
            orderName = `${firstItemName} 외 ${orderDetails.length - 1}건`;
        } else {
            orderName = firstItemName;
        }
    }

    const orderNo = head.INV_PRTNUM || head.INV_SEQ || "UNKNOWN";
    const orderTime = head.ORDER_DATE || "NO_TIME";
    const unique_oid = `${formattedDate}_${head.POS_NO}_${orderNo}`;

    // === [SalesDB 처리] ===
    const salesRow = CONFIG.SALES_DB_SCHEMA.map(col => {
      switch (col.apiKey) {
        case 'business_date': return formattedDate;
        case 'unique_oid': return unique_oid;
        case 'order_no': return `'${orderNo}`; 
        case 'order_name': return orderName;
        case 'order_datetime': return orderTime;
        case 'order_channel': return head.INV_USERNAME || head.POS_NO;
        case 'order_status': return "PAID";
        case 'total_amt': return parseFloat(head.GROSS_AMT || head.AX_AMT || 0);
        case 'pay_amt': return parseFloat(head.NET_AMT || head.AX_AMT || 0);
        case 'dc_amt': return parseFloat(head.DC_AMT || 0);
        case 'refund_amt': return 0;
        case 'customer_id': return head.PNTASP_CUSTID || head.PNTASP_CUSTNM || null;
        case 'delivery_app': 
            if(head.INV_USERNAME && (head.INV_USERNAME.includes('테이블오더') || head.INV_USERNAME.includes('배달') || head.INV_USERNAME.includes('요기요') || head.INV_USERNAME.includes('쿠팡'))) {
                return head.INV_USERNAME;
            }
            return null;
        case 'delivery_order_no': return head.CNT_CALL_ID || null;
        default: return null;
      }
    });
    salesDataToSave.push(salesRow);

    // === [MenuDB 처리] ===
    orderDetails.forEach((det, index) => {
        const detKey = `${orderKey}_${det.ID_CODE}`;
        const detAdditives = addMap[detKey] || [];
        
        const itemName = det.ID_DESC || det.ID_MENUNAME;
        const qty = parseFloat(det.QTY || 1);
        const sumPrice = parseFloat(det.SUMPRICE || 0);
        const itemPrice = qty > 0 ? (sumPrice / qty) : 0;

        // 1) 메인 메뉴 행
        const mainMenuRow = CONFIG.MENU_DB_SCHEMA.map(col => {
            switch (col.apiKey) {
                case 'unique_oid': return unique_oid;
                case 'order_no': return `'${orderNo}`;
                case 'item_seq': return index + 1;
                case 'order_datetime': return orderTime;
                case 'item_name': return itemName;
                case 'item_price': return itemPrice;
                case 'qty': return qty;
                case 'total_price': return sumPrice;
                case 'option_name': return null;
                case 'option_price': return null;
                default: return null;
            }
        });
        menuDataToSave.push(mainMenuRow);

        // 2) 옵션(첨가물) 행
        if (detAdditives.length > 0) {
            detAdditives.forEach(add => {
                const addName = add.ADDITIVE_DESC || add.RULE_DESC;
                
                // 요청사항: "선택안함" 옵션은 적재 제외
                if (addName && addName.replace(/\s+/g, '') === "선택안함") return;

                const optionRow = CONFIG.MENU_DB_SCHEMA.map(col => {
                    switch (col.apiKey) {
                        case 'unique_oid': return unique_oid;
                        case 'order_no': return `'${orderNo}`;
                        case 'item_seq': return index + 1; // 부모 메뉴의 시퀀스와 통일
                        case 'order_datetime': return orderTime;
                        case 'item_name': return itemName; // 그룹핑을 위해 메인메뉴 이름 유지
                        case 'item_price': return 0; // 옵션 행이므로 메인 단가는 0
                        case 'qty': return parseFloat(add.QTY || 1);
                        case 'total_price': return parseFloat(add.ADD_PRICE || 0);
                        case 'option_name': return addName;
                        case 'option_price': return parseFloat(add.ADD_PRICE || 0);
                        default: return null;
                    }
                });
                menuDataToSave.push(optionRow);
            });
        }
    });
  });

  return { salesDataToSave, menuDataToSave };
}

/**
 * ==========================================================================
 * API 호출 및 유틸리티 함수
 * ==========================================================================
 */

function fetchSmartroApi(endpoint, dateStr) {
  const url = `${CONFIG.API_BASE_URL}${endpoint}?STORE_ID=${CONFIG.STORE_ID}&SALE_DATE=${dateStr}`;
  
  const options = {
    method: "get", 
    contentType: "application/json",
    headers: { 
        "Accept": "application/json",
        "Content-Type": "application/json; charset=UTF-8",
        "Authorization": `Bearer ${CONFIG.AUTH_TOKEN}` 
    },
    muteHttpExceptions: true
  };

  try {
    const response = UrlFetchApp.fetch(url, options);
    if (response.getResponseCode() === 200) {
      const json = JSON.parse(response.getContentText());
      if (json.CODE === "0000" && json.SALE_INFO) {
         return json.SALE_INFO;
      }
    }
  } catch (e) {
    Logger.log(`[API 예외] ${endpoint} 호출 실패: ${e}`);
  }
  return [];
}

function getSheet(sheetName, schema) {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    let sheet = ss.getSheetByName(sheetName);
    
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
    }
    if (sheet.getLastRow() === 0 && schema && schema.length > 0) {
      const titles = schema.map(col => col.title); 
      const apiKeys = schema.map(col => col.apiKey); 
      sheet.getRange(1, 1, 2, titles.length).setValues([titles, apiKeys]);
    }
    return sheet;
  } catch (e) {
    Logger.log(`[시트 오류] ${e}`);
    return null;
  }
}

function deleteDataByDate(sheet, targetDateFormatted, dateColumnIndex) {
  try {
    const data = sheet.getDataRange().getValues();
    const rowsToDelete = [];
    
    for (let i = CONFIG.HEADER_ROWS; i < data.length; i++) {
      const rowDateValue = data[i][dateColumnIndex - 1]; 
      let rowDateStr = "";
      
      if (rowDateValue instanceof Date) {
        rowDateStr = formatDateKST(rowDateValue, "yyyy-MM-dd");
      } else if (typeof rowDateValue === 'string' && rowDateValue.length >= 10) {
        rowDateStr = rowDateValue.substring(0, 10); 
      }
      
      if (rowDateStr === targetDateFormatted) {
        rowsToDelete.push(i + 1); 
      }
    }
    
    for (let i = rowsToDelete.length - 1; i >= 0; i--) {
      sheet.deleteRow(rowsToDelete[i]);
    }
  } catch (e) {
    Logger.log(`[데이터 삭제 오류] ${e}`);
  }
}

function saveToSheet(sheet, data) {
  if (!data || data.length === 0) return;
  sheet.getRange(sheet.getLastRow() + 1, 1, data.length, data[0].length).setValues(data);
}

function formatDateKST(date, format) {
  return Utilities.formatDate(date, "Asia/Seoul", format);
}

/**
 * 수동 실행을 위한 테스트 함수 (날짜를 직접 입력하여 테스트 가능)
 */
function checkManualSync() {
  // 오늘 날짜 데이터를 강제 동기화 (원하는 날짜로 변경 가능 예: "20260310")
  const targetDate = Utilities.formatDate(new Date(), "Asia/Seoul", "yyyyMMdd"); 
  fetchAndSaveDataByDate(targetDate);
}