"use client";

import * as React from "react";
import { format, subDays, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { DateRange } from "react-day-picker";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";

interface PresetDateRangePickerProps {
    date: DateRange | undefined;
    setDate: (date: DateRange | undefined) => void;
    className?: string;
}

export function PresetDateRangePicker({ date, setDate, className }: PresetDateRangePickerProps) {
    const presets = [
        { label: "오늘", getValue: () => ({ from: new Date(), to: new Date() }) },
        { label: "어제", getValue: () => ({ from: subDays(new Date(), 1), to: subDays(new Date(), 1) }) },
        { label: "최근 7일", getValue: () => ({ from: subDays(new Date(), 6), to: new Date() }) },
        { label: "최근 30일", getValue: () => ({ from: subDays(new Date(), 29), to: new Date() }) },
        { label: "이번 달", getValue: () => ({ from: startOfMonth(new Date()), to: new Date() }) },
        { label: "지난 달", getValue: () => ({ from: startOfMonth(subMonths(new Date(), 1)), to: endOfMonth(subMonths(new Date(), 1)) }) },
    ];

    const [isOpen, setIsOpen] = React.useState(false);

    return (
        <div className={cn("grid gap-2", className)}>
            <Popover open={isOpen} onOpenChange={setIsOpen}>
                <PopoverTrigger asChild>
                    <Button
                        id="date"
                        variant={"outline"}
                        className={cn(
                            "w-full sm:w-[300px] justify-start text-left font-medium bg-white border-[#E5E8EB] shadow-sm rounded-md px-4 py-2 hover:bg-[#F2F4F6] text-[#4E5968]",
                            !date && "text-muted-foreground"
                        )}
                    >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {date?.from ? (
                            date.to ? (
                                <>
                                    {format(date.from, "yyyy-MM-dd")} ~ {format(date.to, "yyyy-MM-dd")}
                                </>
                            ) : (
                                format(date.from, "yyyy-MM-dd")
                            )
                        ) : (
                            <span>날짜 선택</span>
                        )}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 rounded-md shadow-xl overflow-hidden" align="start">
                    <div className="flex flex-col sm:flex-row divide-y sm:divide-y-0 sm:divide-x divide-gray-100">
                        {/* Presets Sidebar */}
                        <div className="flex flex-col p-2 space-y-1 w-full sm:w-[150px] bg-gray-50/50">
                            <div className="text-xs font-bold text-gray-500 uppercase tracking-wider px-3 py-2">기간 선택</div>
                            {presets.map((preset) => (
                                <Button
                                    key={preset.label}
                                    variant="ghost"
                                    className="justify-start px-3 py-2 h-9 text-sm text-gray-700 hover:bg-gray-100/80 rounded-md whitespace-nowrap"
                                    onClick={() => {
                                        setDate(preset.getValue());
                                        setIsOpen(false);
                                    }}
                                >
                                    {preset.label}
                                </Button>
                            ))}
                        </div>

                        {/* Calendar Region */}
                        <div className="p-3 bg-white">
                            <Calendar
                                initialFocus
                                mode="range"
                                defaultMonth={date?.from}
                                selected={date}
                                onSelect={setDate}
                                numberOfMonths={2}
                                className="rounded-md border-0"
                            />

                            {/* Action Buttons */}
                            <div className="flex justify-end gap-2 pt-3 mt-3 border-t border-gray-100 pb-1 pr-2">
                                <Button variant="ghost" size="sm" onClick={() => setIsOpen(false)} className="rounded-md text-gray-500 hover:text-gray-900">
                                    취소
                                </Button>
                                <Button size="sm" onClick={() => setIsOpen(false)} className="rounded-md bg-[#3182F6] hover:bg-[#1B64DA]">
                                    적용
                                </Button>
                            </div>
                        </div>
                    </div>
                </PopoverContent>
            </Popover>
        </div>
    );
}
