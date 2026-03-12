"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useStore } from "@/lib/StoreContext";
import { Loader2, Database, TableProperties } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import toast from "react-hot-toast";

interface StepTwoProps {
    onNext: () => void;
    onPrev: () => void;
    vendor: string;
}

export function StepTwoMapping({ onNext, onPrev, vendor }: StepTwoProps) {
    const { currentStore } = useStore();
    const [salesDetails, setSalesDetails] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const targetSalesSchemaOptions = [
        { field: "business_date", label: "영업일 (날짜)" },
        { field: "oid", label: "주문번호(oid)" },
        { field: "created_at", label: "주문 생성 일시" },
        { field: "order_name", label: "주문명" },
        { field: "order_from", label: "주문 경로" },
        { field: "order_status", label: "주문 상태" },
        { field: "ordered_amount", label: "결제 금액" },
        { field: "paid_amount", label: "실 결제 금액" },
        { field: "point_used_amount", label: "포인트 사용" },
        { field: "customer_point_earned", label: "포인트 적립" },
        { field: "prepaid_used_amount", label: "선불권 사용" },
        { field: "discount_amount", label: "할인" },
        { field: "refunded_amount", label: "환불" },
        { field: "customer_uid", label: "고객 id" },
        { field: "customer_mobile_phone_number", label: "고객 전화번호" },
        { field: "delivery_app", label: "배달 앱" },
        { field: "delivery_order_no", label: "배달 주문번호" },
    ];

    const targetMenuSchemaOptions = [
        { field: "unique_oid", label: "고유주문ID" },
        { field: "oid", label: "주문 OID (매칭용)" },
        { field: "main_item_seq", label: "메인 메뉴 순번" },
        { field: "created_at", label: "주문 생성일시" },
        { field: "product_name", label: "상품명" },
        { field: "product_price", label: "상품 단가" },
        { field: "quantity", label: "상품 수량" },
        { field: "total_price", label: "상품 합계 금액" },
        { field: "option_name", label: "옵션명" },
        { field: "option_seq", label: "옵션 순번" },
        { field: "option_id", label: "옵션 ID" },
        { field: "option_price", label: "옵션 가격" },
    ];

    const [salesMappings, setSalesMappings] = useState<Record<string, string>>({});
    const [menuMappings, setMenuMappings] = useState<Record<string, string>>({});

    useEffect(() => {
        // Init default mapping mappings directly logic Map(Field, Field)
        const initSales: Record<string, string> = {};
        targetSalesSchemaOptions.forEach(opt => initSales[opt.field] = opt.field);
        setSalesMappings(initSales);

        const initMenus: Record<string, string> = {};
        targetMenuSchemaOptions.forEach(opt => initMenus[opt.field] = opt.field);
        setMenuMappings(initMenus);
    }, []);

    useEffect(() => {
        if (!currentStore?.id) return;

        const fetchData = async () => {
            setLoading(true);
            try {
                // Fetch the 5 most recently synchronized orders for this specific vendor
                const url = `/api/v1/sales?store_id=${currentStore.id}&limit=5${vendor ? `&provider=${vendor}` : ''}`;
                const response = await fetch(url);
                const result = await response.json();
                if (result.status === "success" && result.data) {
                    setSalesDetails(result.data);
                }
            } catch (error) {
                console.error("Failed to fetch recent sales", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [currentStore?.id]);

    const getDisplayValue = (val: any) => {
        if (val === null || val === undefined) return <span className="text-muted-foreground italic">null</span>;
        if (typeof val === "boolean") return val ? "true" : "false";
        if (typeof val === "string" && val.includes("T") && val.includes("Z")) {
            try {
                return format(new Date(val), "yyyy-MM-dd HH:mm:ss");
            } catch {
                return val;
            }
        }
        return String(val);
    };

    const handleSalesMappingChange = (schemaRowKey: string, newlySelectedTargetKey: string) => {
        // Prevent selection of a target key that is already mapped elsewhere
        if (Object.values(salesMappings).includes(newlySelectedTargetKey)) {
            toast.error("이 컬럼은 이미 다른 속성에 매핑되어 있습니다. 먼저 다른 항목의 매핑을 해제해주세요.");
            return;
        }

        setSalesMappings(prev => ({
            ...prev,
            [schemaRowKey]: newlySelectedTargetKey
        }));
    };

    const handleMenuMappingChange = (schemaRowKey: string, newlySelectedTargetKey: string) => {
        if (Object.values(menuMappings).includes(newlySelectedTargetKey)) {
            toast.error("이 컬럼은 이미 다른 속성에 매핑되어 있습니다. 먼저 다른 항목의 매핑을 해제해주세요.");
            return;
        }

        setMenuMappings(prev => ({
            ...prev,
            [schemaRowKey]: newlySelectedTargetKey
        }));
    };


    const displaySales = salesDetails.slice(0, 3);
    const displayMenus = salesDetails.flatMap(s => s.menu_items || []).slice(0, 3);

    return (
        <Card className="w-full max-w-5xl mx-auto border-border shadow-sm">
            <CardHeader>
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle className="text-2xl text-foreground font-bold flex items-center gap-2">
                            <Database className="h-6 w-6 text-primary" />
                            2단계: 실시간 데이터 스키마 매핑 증명
                        </CardTitle>
                        <CardDescription className="text-muted-foreground mt-1">
                            이전 단계에서 동기화된 <strong>실제 결제 데이터</strong>가 RestoGenie 표준 스키마 테이블에 어떻게 적재되었는지 실시간으로 확인합니다. 우측 데이터셋에 맞춰 항목을 커스텀 변경할 수 있습니다.
                        </CardDescription>
                    </div>
                    {loading ? (
                        <Badge variant="outline" className="bg-muted text-muted-foreground">데이터 로딩 중...</Badge>
                    ) : (
                        <Badge variant="secondary" className="bg-green-500/10 text-green-600 border-green-500/20 px-3 py-1">
                            실 데이터 {salesDetails.length}건 감지됨
                        </Badge>
                    )}
                </div>
            </CardHeader>
            <CardContent>
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20">
                        <Loader2 className="h-10 w-10 text-primary animate-spin mb-4" />
                        <p className="text-sm text-muted-foreground">데이터베이스에서 방금 연동된 주문 데이터를 실시간으로 가져오는 중입니다...</p>
                    </div>
                ) : salesDetails.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 border rounded-md bg-muted/20">
                        <TableProperties className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
                        <p className="font-semibold text-lg text-foreground mb-1">최근 동기화된 데이터가 없습니다.</p>
                        <p className="text-sm text-muted-foreground">이전 단계에서 POS 연결을 테스트하거나 오늘 날짜에 매출이 있는지 확인하세요.</p>
                    </div>
                ) : (
                    <Tabs defaultValue="sales" className="w-full">
                        <TabsList className="grid w-full grid-cols-2 mb-6">
                            <TabsTrigger value="sales" className="font-semibold">주문 (결제) 데이터베이스</TabsTrigger>
                            <TabsTrigger value="menus" className="font-semibold">주문 상세 데이터베이스</TabsTrigger>
                        </TabsList>

                        <TabsContent value="sales">
                            <div className="rounded-md border border-border overflow-x-auto">
                                <Table className="whitespace-nowrap">
                                    <TableHeader className="bg-secondary/50">
                                        <TableRow>
                                            <TableHead className="font-semibold text-foreground w-[20%]">DB 스키마 컬럼</TableHead>
                                            <TableHead className="font-semibold text-foreground w-[20%]">항목 매핑 (수정 가능)</TableHead>
                                            {displaySales.map((_, idx) => (
                                                <TableHead key={idx} className="font-semibold text-primary">Preview 데이터 #{idx + 1}</TableHead>
                                            ))}
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {targetSalesSchemaOptions.map((schema, idx) => (
                                            <TableRow key={idx} className="transition-colors hover:bg-muted/30">
                                                <TableCell className="font-medium font-mono text-sm">{schema.field}</TableCell>
                                                <TableCell className="text-muted-foreground text-sm">
                                                    <Select
                                                        value={salesMappings[schema.field] || schema.field}
                                                        onValueChange={(val) => handleSalesMappingChange(schema.field, val)}
                                                    >
                                                        <SelectTrigger className="w-[180px] h-8 text-xs bg-white">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {targetSalesSchemaOptions.map(opt => (
                                                                <SelectItem key={opt.field} value={opt.field} disabled={Object.values(salesMappings).includes(opt.field) && salesMappings[schema.field] !== opt.field}>
                                                                    {opt.label} ({opt.field})
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </TableCell>
                                                {displaySales.map((sale, saleIdx) => (
                                                    <TableCell key={saleIdx} className="font-mono text-sm max-w-[180px] truncate" title={String(sale[salesMappings[schema.field] || schema.field] || "")}>
                                                        {getDisplayValue(sale[salesMappings[schema.field] || schema.field])}
                                                    </TableCell>
                                                ))}
                                                {Array.from({ length: Math.max(0, 3 - displaySales.length) }).map((_, emptyIdx) => (
                                                    <TableCell key={`empty-${emptyIdx}`}>-</TableCell>
                                                ))}
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </TabsContent>

                        <TabsContent value="menus">
                            <div className="rounded-md border border-border overflow-x-auto">
                                <Table className="whitespace-nowrap">
                                    <TableHeader className="bg-secondary/50">
                                        <TableRow>
                                            <TableHead className="font-semibold text-foreground w-[20%]">DB 스키마 컬럼</TableHead>
                                            <TableHead className="font-semibold text-foreground w-[20%]">항목 매핑 (수정 가능)</TableHead>
                                            {displayMenus.map((_, idx) => (
                                                <TableHead key={idx} className="font-semibold text-primary">Detail 데이터 #{idx + 1}</TableHead>
                                            ))}
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {targetMenuSchemaOptions.map((schema, idx) => (
                                            <TableRow key={idx} className="transition-colors hover:bg-muted/30">
                                                <TableCell className="font-medium font-mono text-sm">{schema.field}</TableCell>
                                                <TableCell className="text-muted-foreground text-sm">
                                                    <Select
                                                        value={menuMappings[schema.field] || schema.field}
                                                        onValueChange={(val) => handleMenuMappingChange(schema.field, val)}
                                                    >
                                                        <SelectTrigger className="w-[180px] h-8 text-xs bg-white">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {targetMenuSchemaOptions.map(opt => (
                                                                <SelectItem key={opt.field} value={opt.field} disabled={Object.values(menuMappings).includes(opt.field) && menuMappings[schema.field] !== opt.field}>
                                                                    {opt.label} ({opt.field})
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </TableCell>
                                                {displayMenus.map((menu, menuIdx) => (
                                                    <TableCell key={menuIdx} className="font-mono text-sm max-w-[180px] truncate" title={String(menu[menuMappings[schema.field] || schema.field] || "")}>
                                                        {getDisplayValue(menu[menuMappings[schema.field] || schema.field])}
                                                    </TableCell>
                                                ))}
                                                {Array.from({ length: Math.max(0, 3 - displayMenus.length) }).map((_, emptyIdx) => (
                                                    <TableCell key={`empty-${emptyIdx}`}>-</TableCell>
                                                ))}
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </TabsContent>
                    </Tabs>
                )}
            </CardContent>
            <CardFooter className="flex justify-between pt-4 border-t border-secondary mt-4">
                <Button variant="outline" onClick={onPrev}>이전 단계</Button>
                <Button onClick={onNext} className="bg-primary hover:bg-primary/90 text-white" disabled={loading}>검증 완료 및 자동화 스케줄 가동</Button>
            </CardFooter>
        </Card>
    );
}

