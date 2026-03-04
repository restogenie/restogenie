"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { AlertTriangle, ChevronLeft, ChevronRight, Info } from "lucide-react";

interface StepTwoProps {
    onNext: () => void;
    onPrev: () => void;
}

const mockDataPaths = [
    {
        path: "payment.txId",
        samples: ["TOSS_12345", "TOSS_67890", "TOSS_11223"],
        recommendedTarget: "transaction_id",
        warning: false,
    },
    {
        path: "payment.date",
        samples: ["2026-02-25T14:30:00Z", "2026-02-25T14:35:00Z"],
        recommendedTarget: "transaction_timestamp",
        warning: false,
    },
    {
        path: "payment.card.amount",
        samples: ["5000", 12500, "20000"], // Mixed types simulate warning
        recommendedTarget: "net_sales_amount",
        warning: true,
    },
    {
        path: "order.channel",
        samples: ["배달의민족", "현장결제", "요기요"],
        recommendedTarget: "sales_channel",
        warning: false,
    },
];

const targetSchemas = [
    { value: "transaction_id", label: "transaction_id (영수증 고유 식별자)" },
    { value: "transaction_timestamp", label: "transaction_timestamp (결제 일시)" },
    { value: "location_code", label: "location_code (매장 코드)" },
    { value: "gross_sales_amount", label: "gross_sales_amount (총 매출 금액)" },
    { value: "net_sales_amount", label: "net_sales_amount (실제 결제 금액)" },
    { value: "discount_amount", label: "discount_amount (할인 금액)" },
    { value: "tax_amount", label: "tax_amount (부가세)" },
    { value: "tender_type", label: "tender_type (결제 수단)" },
    { value: "transaction_status", label: "transaction_status (결제 상태)" },
    { value: "delivery_fee_amount", label: "delivery_fee_amount (배달 팁)" },
    { value: "sales_channel", label: "sales_channel (주문 채널)" },
    { value: "ignore", label: "-- 무시 (Ignore) --" },
];

export function StepTwoMapping({ onNext, onPrev }: StepTwoProps) {
    const [sampleIndex, setSampleIndex] = useState(0);

    const nextSample = () => setSampleIndex(prev => prev + 1);
    const prevSample = () => setSampleIndex(prev => Math.max(0, prev - 1));

    return (
        <Card className="w-full max-w-5xl mx-auto border-border shadow-sm">
            <CardHeader>
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle className="text-2xl text-foreground font-bold">2단계: 데이터 매칭 (Schema Discovery)</CardTitle>
                        <CardDescription className="text-muted-foreground mt-1">
                            최근 50건의 트랜잭션을 분석하여 컬럼을 추출했습니다. 자동 추천된 매핑을 확인하고 수정하세요.
                        </CardDescription>
                    </div>
                    <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">분석 완료 (Sample: {sampleIndex + 1})</Badge>
                </div>
            </CardHeader>
            <CardContent>
                <div className="flex justify-end mb-4 gap-2">
                    <Button variant="outline" size="sm" onClick={prevSample} disabled={sampleIndex === 0}>
                        <ChevronLeft className="h-4 w-4 mr-1" /> 이전 샘플
                    </Button>
                    <Button variant="outline" size="sm" onClick={nextSample} disabled={sampleIndex >= 2}>
                        다음 샘플 <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                </div>

                <div className="rounded-md border border-border overflow-hidden">
                    <Table>
                        <TableHeader className="bg-secondary/50">
                            <TableRow>
                                <TableHead className="font-semibold text-foreground w-[30%]">POS 원천 데이터 경로</TableHead>
                                <TableHead className="font-semibold text-foreground w-[35%]">실제 데이터 샘플 (미리보기)</TableHead>
                                <TableHead className="font-semibold text-foreground w-[35%]">레스토지니 표준 항목 (타겟)</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {mockDataPaths.map((row, idx) => (
                                <TableRow key={idx} className="transition-colors hover:bg-muted/50">
                                    <TableCell className="font-medium">
                                        <TooltipProvider>
                                            <Tooltip>
                                                <TooltipTrigger className="flex items-center gap-1.5 cursor-help text-primary hover:underline">
                                                    <code className="bg-muted px-1.5 py-0.5 rounded text-sm text-foreground">{row.path}</code>
                                                    <Info className="h-3.5 w-3.5 text-muted-foreground" />
                                                </TooltipTrigger>
                                                <TooltipContent side="right">
                                                    <p>Original JSON path in payload</p>
                                                </TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <span className="font-mono text-sm bg-background border px-2 py-1 rounded-md min-w-[120px] inline-block">
                                                {String(row.samples[Math.min(sampleIndex, row.samples.length - 1)])}
                                            </span>
                                            {row.warning && (
                                                <TooltipProvider>
                                                    <Tooltip>
                                                        <TooltipTrigger>
                                                            <AlertTriangle className="h-4 w-4 text-amber-500" />
                                                        </TooltipTrigger>
                                                        <TooltipContent>
                                                            <p>샘플 중 문자열과 숫자가 혼재되어 있습니다. 문자열로 강제 캐스팅 됩니다.</p>
                                                        </TooltipContent>
                                                    </Tooltip>
                                                </TooltipProvider>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Select defaultValue={row.recommendedTarget}>
                                            <SelectTrigger className="w-full">
                                                <SelectValue placeholder="타겟 컬럼 선택" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {targetSchemas.map(schema => (
                                                    <SelectItem key={schema.value} value={schema.value}>
                                                        {schema.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
            <CardFooter className="flex justify-between pt-4 border-t border-secondary mt-4">
                <Button variant="outline" onClick={onPrev}>이전 단계</Button>
                <Button onClick={onNext} className="bg-primary hover:bg-primary/90 text-white">매핑 확정 및 다음</Button>
            </CardFooter>
        </Card>
    );
}
