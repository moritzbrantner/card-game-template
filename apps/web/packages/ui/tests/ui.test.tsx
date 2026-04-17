// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";

import {
  Button,
  Calendar,
  CalendarDayButton,
  type CalendarCellComponentProps,
  type CalendarIcsData,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  cn,
} from "../src";

const calendarIcsData = [
  "vcalendar",
  [
    ["version", {}, "text", "2.0"],
    ["prodid", {}, "text", "-//platform-packages//Calendar Test//EN"],
  ],
  [
    [
      "vevent",
      [
        ["uid", {}, "text", "design-sync"],
        ["summary", {}, "text", "Design sync"],
        ["dtstart", {}, "date-time", "2026-04-15T09:00:00Z"],
        ["dtend", {}, "date-time", "2026-04-15T09:30:00Z"],
      ],
      [],
    ],
    [
      "vevent",
      [
        ["uid", {}, "text", "release-window"],
        ["summary", {}, "text", "Release window"],
        ["dtstart", {}, "date", "2026-04-18"],
        ["dtend", {}, "date", "2026-04-20"],
      ],
      [],
    ],
  ],
] as const satisfies CalendarIcsData;

describe("@moritzbrantner/ui", () => {
  test("renders shared primitives in jsdom", () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Shared UI</CardTitle>
        </CardHeader>
        <CardContent>
          <Button>Press</Button>
        </CardContent>
      </Card>,
    );

    expect(screen.getByRole("button", { name: "Press" })).toBeTruthy();
    expect(screen.getByText("Shared UI")).toBeTruthy();
  });

  test("merges class names", () => {
    expect(cn("px-4", "px-2", "font-semibold")).toBe("px-2 font-semibold");
  });

  test("renders a custom calendar cell component", () => {
    function CustomCell({
      children,
      events = [],
      ...props
    }: CalendarCellComponentProps) {
      return (
        <CalendarDayButton {...props}>
          {children}
          <span data-testid={`cell-${props.day.date.getDate()}`}>marker</span>
          {events.some((event) => event.summary === "Design sync") ? (
            <span data-testid="design-sync-event">event</span>
          ) : null}
        </CalendarDayButton>
      );
    }

    render(
      <Calendar
        defaultMonth={new Date(2026, 3, 1)}
        mode="single"
        showOutsideDays={false}
        cellComponent={CustomCell}
        icsData={calendarIcsData}
      />,
    );

    expect(screen.getByTestId("cell-15")).toBeTruthy();
    expect(screen.getByTestId("design-sync-event")).toBeTruthy();
  });

  test("renders event summaries from jcal data", () => {
    render(
      <Calendar
        defaultMonth={new Date(2026, 3, 1)}
        mode="single"
        showOutsideDays={false}
        icsData={calendarIcsData}
      />,
    );

    expect(screen.getAllByText(/Design sync/).length).toBeGreaterThan(0);
    expect(screen.getAllByText("Release window").length).toBeGreaterThan(1);
  });
});
