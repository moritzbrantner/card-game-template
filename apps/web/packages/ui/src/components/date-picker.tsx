"use client"

import * as React from "react"
import { format } from "date-fns"
import { CalendarIcon } from "lucide-react"
import type { DateRange } from "react-day-picker"

import { Button } from "./button"
import { Calendar } from "./calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "./popover"
import { cn } from "../lib/cn"

type SharedDatePickerProps = {
  className?: string
  placeholder?: React.ReactNode
  formatString?: string
  align?: React.ComponentProps<typeof PopoverContent>["align"]
  disabled?: boolean
}

type DatePickerProps = SharedDatePickerProps &
  Omit<
    React.ComponentProps<typeof Calendar>,
    "mode" | "selected" | "onSelect" | "disabled"
  > & {
    value?: Date
    defaultValue?: Date
    onChange?: (value: Date | undefined) => void
  }

type DateRangePickerProps = SharedDatePickerProps &
  Omit<
    React.ComponentProps<typeof Calendar>,
    "mode" | "selected" | "onSelect" | "numberOfMonths" | "disabled"
  > & {
    value?: DateRange
    defaultValue?: DateRange
    onChange?: (value: DateRange | undefined) => void
  }

function DatePicker({
  value,
  defaultValue,
  onChange,
  className,
  placeholder = "Pick a date",
  formatString = "PPP",
  align = "start",
  disabled,
  ...calendarProps
}: DatePickerProps) {
  const [internalValue, setInternalValue] = React.useState<Date | undefined>(
    defaultValue
  )
  const selected = value ?? internalValue

  const handleSelect = React.useCallback(
    (nextValue: Date | undefined) => {
      if (value === undefined) {
        setInternalValue(nextValue)
      }

      onChange?.(nextValue)
    },
    [onChange, value]
  )

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          data-empty={!selected}
          disabled={disabled}
          className={cn(
            "w-[280px] justify-start text-left font-normal data-[empty=true]:text-muted-foreground",
            className
          )}
        >
          <CalendarIcon />
          {selected ? format(selected, formatString) : <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent align={align} className="w-auto p-0">
        <Calendar
          mode="single"
          selected={selected}
          onSelect={handleSelect}
          disabled={disabled}
          {...calendarProps}
        />
      </PopoverContent>
    </Popover>
  )
}

function DateRangePicker({
  value,
  defaultValue,
  onChange,
  className,
  placeholder = "Pick a date range",
  formatString = "LLL dd, y",
  align = "start",
  disabled,
  ...calendarProps
}: DateRangePickerProps) {
  const [internalValue, setInternalValue] = React.useState<DateRange | undefined>(
    defaultValue
  )
  const selected = value ?? internalValue

  const handleSelect = React.useCallback(
    (nextValue: DateRange | undefined) => {
      if (value === undefined) {
        setInternalValue(nextValue)
      }

      onChange?.(nextValue)
    },
    [onChange, value]
  )

  const label =
    selected?.from && selected?.to
      ? `${format(selected.from, formatString)} - ${format(selected.to, formatString)}`
      : selected?.from
        ? format(selected.from, formatString)
        : null

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          data-empty={!label}
          disabled={disabled}
          className={cn(
            "w-[300px] justify-start text-left font-normal data-[empty=true]:text-muted-foreground",
            className
          )}
        >
          <CalendarIcon />
          {label ? <span>{label}</span> : <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent align={align} className="w-auto p-0">
        <Calendar
          mode="range"
          numberOfMonths={2}
          selected={selected}
          onSelect={handleSelect}
          disabled={disabled}
          {...calendarProps}
        />
      </PopoverContent>
    </Popover>
  )
}

export { DatePicker, DateRangePicker }
export type { DatePickerProps, DateRangePickerProps }
