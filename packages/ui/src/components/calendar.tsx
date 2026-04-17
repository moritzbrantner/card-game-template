"use client"

import * as React from "react"
import {
  DayPicker,
  getDefaultClassNames,
  type DayButton,
  type Locale,
} from "react-day-picker"

import { cn } from "../lib/cn"
import { Button, buttonVariants } from "./button"
import { ChevronLeftIcon, ChevronRightIcon, ChevronDownIcon } from "lucide-react"

type CalendarIcsProperty = [
  name: string,
  parameters: Record<string, string | string[]>,
  valueType: string,
  value: unknown,
]

type CalendarIcsComponent = [
  name: string,
  properties: CalendarIcsProperty[],
  components: CalendarIcsComponent[],
]

type CalendarIcsData = CalendarIcsComponent

type CalendarEvent = {
  uid?: string
  summary?: string
  description?: string
  location?: string
  start: Date
  end?: Date
  isAllDay: boolean
}

type CalendarCellComponentProps = React.ComponentProps<typeof DayButton> & {
  locale?: Partial<Locale>
  events?: CalendarEvent[]
  maxEventsPerDay?: number
}

type CalendarProps = React.ComponentProps<typeof DayPicker> & {
  buttonVariant?: React.ComponentProps<typeof Button>["variant"]
  cellComponent?: React.ComponentType<CalendarCellComponentProps>
  icsData?: CalendarIcsData
  maxEventsPerDay?: number
}

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  captionLayout = "label",
  buttonVariant = "ghost",
  cellComponent: CellComponent,
  defaultMonth,
  month,
  icsData,
  maxEventsPerDay = 2,
  locale,
  formatters,
  components,
  ...props
}: CalendarProps) {
  const defaultClassNames = getDefaultClassNames()
  const calendarEvents = React.useMemo(() => getCalendarEventsFromIcsData(icsData), [icsData])
  const eventsByDay = React.useMemo(() => getEventsByDay(calendarEvents), [calendarEvents])
  const defaultDayButton = (dayButtonProps: React.ComponentProps<typeof DayButton>) => {
    const DayButtonComponent = CellComponent ?? CalendarDayButton
    const dayEvents = eventsByDay.get(getDayKey(dayButtonProps.day.date)) ?? []

    return (
      <DayButtonComponent
        locale={locale}
        events={dayEvents}
        maxEventsPerDay={maxEventsPerDay}
        {...dayButtonProps}
      />
    )
  }

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      defaultMonth={defaultMonth ?? month ?? calendarEvents[0]?.start}
      month={month}
      className={cn(
        "group/calendar bg-background p-2 [--cell-radius:var(--radius-md)] [--cell-size:--spacing(7)] in-data-[slot=card-content]:bg-transparent in-data-[slot=popover-content]:bg-transparent",
        String.raw`rtl:**:[.rdp-button\_next>svg]:rotate-180`,
        String.raw`rtl:**:[.rdp-button\_previous>svg]:rotate-180`,
        className
      )}
      captionLayout={captionLayout}
      locale={locale}
      formatters={{
        formatMonthDropdown: (date) =>
          date.toLocaleString(locale?.code, { month: "short" }),
        ...formatters,
      }}
      classNames={{
        root: cn("w-fit", defaultClassNames.root),
        months: cn(
          "relative flex flex-col gap-4 md:flex-row",
          defaultClassNames.months
        ),
        month: cn("flex w-full flex-col gap-4", defaultClassNames.month),
        nav: cn(
          "absolute inset-x-0 top-0 flex w-full items-center justify-between gap-1",
          defaultClassNames.nav
        ),
        button_previous: cn(
          buttonVariants({ variant: buttonVariant }),
          "size-(--cell-size) p-0 select-none aria-disabled:opacity-50",
          defaultClassNames.button_previous
        ),
        button_next: cn(
          buttonVariants({ variant: buttonVariant }),
          "size-(--cell-size) p-0 select-none aria-disabled:opacity-50",
          defaultClassNames.button_next
        ),
        month_caption: cn(
          "flex h-(--cell-size) w-full items-center justify-center px-(--cell-size)",
          defaultClassNames.month_caption
        ),
        dropdowns: cn(
          "flex h-(--cell-size) w-full items-center justify-center gap-1.5 text-sm font-medium",
          defaultClassNames.dropdowns
        ),
        dropdown_root: cn(
          "relative rounded-(--cell-radius)",
          defaultClassNames.dropdown_root
        ),
        dropdown: cn(
          "absolute inset-0 bg-popover opacity-0",
          defaultClassNames.dropdown
        ),
        caption_label: cn(
          "font-medium select-none",
          captionLayout === "label"
            ? "text-sm"
            : "flex items-center gap-1 rounded-(--cell-radius) text-sm [&>svg]:size-3.5 [&>svg]:text-muted-foreground",
          defaultClassNames.caption_label
        ),
        table: "w-full border-collapse",
        weekdays: cn("flex", defaultClassNames.weekdays),
        weekday: cn(
          "flex-1 rounded-(--cell-radius) text-[0.8rem] font-normal text-muted-foreground select-none",
          defaultClassNames.weekday
        ),
        week: cn("mt-2 flex w-full", defaultClassNames.week),
        week_number_header: cn(
          "w-(--cell-size) select-none",
          defaultClassNames.week_number_header
        ),
        week_number: cn(
          "text-[0.8rem] text-muted-foreground select-none",
          defaultClassNames.week_number
        ),
        day: cn(
          "group/day relative aspect-square h-full w-full rounded-(--cell-radius) p-0 text-center select-none [&:last-child[data-selected=true]_button]:rounded-r-(--cell-radius)",
          props.showWeekNumber
            ? "[&:nth-child(2)[data-selected=true]_button]:rounded-l-(--cell-radius)"
            : "[&:first-child[data-selected=true]_button]:rounded-l-(--cell-radius)",
          defaultClassNames.day
        ),
        range_start: cn(
          "relative isolate z-0 rounded-l-(--cell-radius) bg-muted after:absolute after:inset-y-0 after:right-0 after:w-4 after:bg-muted",
          defaultClassNames.range_start
        ),
        range_middle: cn("rounded-none", defaultClassNames.range_middle),
        range_end: cn(
          "relative isolate z-0 rounded-r-(--cell-radius) bg-muted after:absolute after:inset-y-0 after:left-0 after:w-4 after:bg-muted",
          defaultClassNames.range_end
        ),
        today: cn(
          "rounded-(--cell-radius) bg-muted text-foreground data-[selected=true]:rounded-none",
          defaultClassNames.today
        ),
        outside: cn(
          "text-muted-foreground aria-selected:text-muted-foreground",
          defaultClassNames.outside
        ),
        disabled: cn(
          "text-muted-foreground opacity-50",
          defaultClassNames.disabled
        ),
        hidden: cn("invisible", defaultClassNames.hidden),
        ...classNames,
      }}
      components={{
        Root: ({ className, rootRef, ...props }) => {
          return (
            <div
              data-slot="calendar"
              ref={rootRef}
              className={cn(className)}
              {...props}
            />
          )
        },
        Chevron: ({ className, orientation, ...props }) => {
          if (orientation === "left") {
            return (
              <ChevronLeftIcon className={cn("size-4", className)} {...props} />
            )
          }

          if (orientation === "right") {
            return (
              <ChevronRightIcon className={cn("size-4", className)} {...props} />
            )
          }

          return (
            <ChevronDownIcon className={cn("size-4", className)} {...props} />
          )
        },
        DayButton: defaultDayButton,
        WeekNumber: ({ children, ...props }) => {
          return (
            <td {...props}>
              <div className="flex size-(--cell-size) items-center justify-center text-center">
                {children}
              </div>
            </td>
          )
        },
        ...components,
      }}
      {...props}
    />
  )
}

function CalendarDayButton({
  className,
  children,
  day,
  events = [],
  maxEventsPerDay = 2,
  modifiers,
  locale,
  ...props
}: React.ComponentProps<typeof DayButton> & {
  locale?: Partial<Locale>
  events?: CalendarEvent[]
  maxEventsPerDay?: number
}) {
  const defaultClassNames = getDefaultClassNames()
  const visibleEvents = events.slice(0, maxEventsPerDay)
  const hiddenEventsCount = Math.max(events.length - visibleEvents.length, 0)

  const ref = React.useRef<HTMLButtonElement>(null)
  React.useEffect(() => {
    if (modifiers.focused) ref.current?.focus()
  }, [modifiers.focused])

  return (
    <Button
      ref={ref}
      variant="ghost"
      size="icon"
      data-day={day.date.toLocaleDateString(locale?.code)}
      data-selected-single={
        modifiers.selected &&
        !modifiers.range_start &&
        !modifiers.range_end &&
        !modifiers.range_middle
      }
      data-range-start={modifiers.range_start}
      data-range-end={modifiers.range_end}
      data-range-middle={modifiers.range_middle}
      data-has-events={events.length > 0 || undefined}
      className={cn(
        "relative isolate z-10 flex aspect-square size-auto w-full min-w-(--cell-size) flex-col items-start justify-start gap-1 overflow-hidden border-0 p-1.5 text-left leading-none font-normal group-data-[focused=true]/day:relative group-data-[focused=true]/day:z-10 group-data-[focused=true]/day:border-ring group-data-[focused=true]/day:ring-[3px] group-data-[focused=true]/day:ring-ring/50 data-[range-end=true]:rounded-(--cell-radius) data-[range-end=true]:rounded-r-(--cell-radius) data-[range-end=true]:bg-primary data-[range-end=true]:text-primary-foreground data-[range-middle=true]:rounded-none data-[range-middle=true]:bg-muted data-[range-middle=true]:text-foreground data-[range-start=true]:rounded-(--cell-radius) data-[range-start=true]:rounded-l-(--cell-radius) data-[range-start=true]:bg-primary data-[range-start=true]:text-primary-foreground data-[selected-single=true]:bg-primary data-[selected-single=true]:text-primary-foreground dark:hover:text-foreground",
        defaultClassNames.day,
        className
      )}
      {...props}
    >
      <div className="w-full text-left text-sm leading-none font-medium">
        {children}
      </div>
      {visibleEvents.length > 0 ? (
        <div className="flex w-full flex-col items-start gap-1 overflow-hidden">
          {visibleEvents.map((event) => (
            <span
              key={getCalendarEventKey(event)}
              className="w-full truncate rounded-sm bg-accent/70 px-1.5 py-0.5 text-[0.625rem] leading-tight text-foreground/80"
              title={getCalendarEventLabel(event, locale)}
            >
              {getCalendarEventLabel(event, locale)}
            </span>
          ))}
          {hiddenEventsCount > 0 ? (
            <span className="px-1 text-[0.625rem] leading-tight text-muted-foreground">
              +{hiddenEventsCount} more
            </span>
          ) : null}
        </div>
      ) : null}
    </Button>
  )
}

export { Calendar, CalendarDayButton }
export type {
  CalendarProps,
  CalendarCellComponentProps,
  CalendarEvent,
  CalendarIcsComponent,
  CalendarIcsData,
  CalendarIcsProperty,
}

function getCalendarEventsFromIcsData(icsData?: CalendarIcsData): CalendarEvent[] {
  if (!icsData || icsData[0].toLowerCase() !== "vcalendar") {
    return []
  }

  return icsData[2]
    .flatMap((component) => {
      if (component[0].toLowerCase() !== "vevent") {
        return []
      }

      const event = parseCalendarEvent(component[1])
      return event ? [event] : []
    })
    .sort((left, right) => left.start.getTime() - right.start.getTime())
}

function parseCalendarEvent(properties: CalendarIcsProperty[]): CalendarEvent | null {
  const startProperty = getCalendarProperty(properties, "dtstart")
  const start = parseCalendarDate(startProperty)

  if (!start) {
    return null
  }

  const endProperty = getCalendarProperty(properties, "dtend")
  const end = parseCalendarDate(endProperty)

  return {
    uid: getCalendarTextProperty(properties, "uid"),
    summary: getCalendarTextProperty(properties, "summary"),
    description: getCalendarTextProperty(properties, "description"),
    location: getCalendarTextProperty(properties, "location"),
    start: start.value,
    end: end?.value,
    isAllDay: start.isAllDay,
  }
}

function getCalendarProperty(
  properties: CalendarIcsProperty[],
  propertyName: string
) {
  return properties.find(([name]) => name.toLowerCase() === propertyName)
}

function getCalendarTextProperty(
  properties: CalendarIcsProperty[],
  propertyName: string
) {
  const property = getCalendarProperty(properties, propertyName)

  return typeof property?.[3] === "string" ? property[3] : undefined
}

function parseCalendarDate(property?: CalendarIcsProperty) {
  if (!property) {
    return null
  }

  const [, , valueType, value] = property

  if (typeof value !== "string") {
    return null
  }

  const normalizedType = valueType.toLowerCase()
  const isAllDay = normalizedType === "date"
  const parsedValue = isAllDay ? parseCalendarDateOnly(value) : parseCalendarDateTime(value)

  if (!parsedValue) {
    return null
  }

  return {
    isAllDay,
    value: parsedValue,
  }
}

function parseCalendarDateOnly(value: string) {
  const hyphenatedMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  const compactMatch = value.match(/^(\d{4})(\d{2})(\d{2})$/)
  const match = hyphenatedMatch ?? compactMatch

  if (!match) {
    return null
  }

  const [, year, month, day] = match
  return new Date(Number(year), Number(month) - 1, Number(day))
}

function parseCalendarDateTime(value: string) {
  const nativeDate = new Date(value)

  if (!Number.isNaN(nativeDate.getTime())) {
    return nativeDate
  }

  const match = value.match(
    /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z)?$/
  )

  if (!match) {
    return null
  }

  const [, year, month, day, hours, minutes, seconds, utc] = match

  if (utc) {
    return new Date(
      Date.UTC(
        Number(year),
        Number(month) - 1,
        Number(day),
        Number(hours),
        Number(minutes),
        Number(seconds)
      )
    )
  }

  return new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hours),
    Number(minutes),
    Number(seconds)
  )
}

function getEventsByDay(events: CalendarEvent[]) {
  const eventMap = new Map<string, CalendarEvent[]>()

  for (const event of events) {
    const firstDay = startOfDay(event.start)
    const lastDay = startOfDay(getEventDisplayEnd(event))

    for (
      let day = firstDay;
      day.getTime() <= lastDay.getTime();
      day = addDays(day, 1)
    ) {
      const dayKey = getDayKey(day)
      const dayEvents = eventMap.get(dayKey) ?? []
      dayEvents.push(event)
      eventMap.set(dayKey, dayEvents)
    }
  }

  for (const dayEvents of eventMap.values()) {
    dayEvents.sort((left, right) => left.start.getTime() - right.start.getTime())
  }

  return eventMap
}

function getEventDisplayEnd(event: CalendarEvent) {
  if (!event.end || event.end.getTime() <= event.start.getTime()) {
    return event.start
  }

  return new Date(event.end.getTime() - 1)
}

function getDayKey(date: Date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-")
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function addDays(date: Date, amount: number) {
  const nextDate = new Date(date)
  nextDate.setDate(nextDate.getDate() + amount)
  return nextDate
}

function getCalendarEventKey(event: CalendarEvent) {
  return `${event.uid ?? event.summary ?? "event"}-${event.start.toISOString()}`
}

function getCalendarEventLabel(event: CalendarEvent, locale?: Partial<Locale>) {
  const summary = event.summary ?? "Untitled event"

  if (event.isAllDay) {
    return summary
  }

  return `${event.start.toLocaleTimeString(locale?.code, {
    hour: "numeric",
    minute: "2-digit",
  })} ${summary}`
}
