import * as React from "react"

import { cn } from "../lib/cn"

function TypographyH1({
  className,
  ...props
}: React.ComponentProps<"h1">) {
  return (
    <h1
      className={cn(
        "scroll-m-20 text-4xl font-extrabold tracking-tight text-balance",
        className
      )}
      {...props}
    />
  )
}

function TypographyH2({
  className,
  ...props
}: React.ComponentProps<"h2">) {
  return (
    <h2
      className={cn(
        "scroll-m-20 border-b pb-2 text-3xl font-semibold tracking-tight first:mt-0",
        className
      )}
      {...props}
    />
  )
}

function TypographyH3({
  className,
  ...props
}: React.ComponentProps<"h3">) {
  return (
    <h3
      className={cn("scroll-m-20 text-2xl font-semibold tracking-tight", className)}
      {...props}
    />
  )
}

function TypographyH4({
  className,
  ...props
}: React.ComponentProps<"h4">) {
  return (
    <h4
      className={cn("scroll-m-20 text-xl font-semibold tracking-tight", className)}
      {...props}
    />
  )
}

function TypographyP({
  className,
  ...props
}: React.ComponentProps<"p">) {
  return (
    <p
      className={cn("leading-7 [&:not(:first-child)]:mt-6", className)}
      {...props}
    />
  )
}

function TypographyBlockquote({
  className,
  ...props
}: React.ComponentProps<"blockquote">) {
  return (
    <blockquote
      className={cn("mt-6 border-l-2 pl-6 italic", className)}
      {...props}
    />
  )
}

function TypographyList({
  className,
  ...props
}: React.ComponentProps<"ul">) {
  return (
    <ul
      className={cn("my-6 ml-6 list-disc [&>li]:mt-2", className)}
      {...props}
    />
  )
}

function TypographyInlineCode({
  className,
  ...props
}: React.ComponentProps<"code">) {
  return (
    <code
      className={cn(
        "relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold",
        className
      )}
      {...props}
    />
  )
}

function TypographyLead({
  className,
  ...props
}: React.ComponentProps<"p">) {
  return (
    <p className={cn("text-xl text-muted-foreground", className)} {...props} />
  )
}

function TypographyLarge({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return <div className={cn("text-lg font-semibold", className)} {...props} />
}

function TypographySmall({
  className,
  ...props
}: React.ComponentProps<"small">) {
  return (
    <small
      className={cn("text-sm leading-none font-medium", className)}
      {...props}
    />
  )
}

function TypographyMuted({
  className,
  ...props
}: React.ComponentProps<"p">) {
  return <p className={cn("text-sm text-muted-foreground", className)} {...props} />
}

function TypographyTable({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div className={cn("my-6 w-full overflow-y-auto", className)} {...props} />
  )
}

function TypographyTableElement({
  className,
  ...props
}: React.ComponentProps<"table">) {
  return (
    <table className={cn("w-full", className)} {...props} />
  )
}

function TypographyTableHeader({
  className,
  ...props
}: React.ComponentProps<"thead">) {
  return <thead className={cn("[&_tr]:border-b", className)} {...props} />
}

function TypographyTableBody({
  className,
  ...props
}: React.ComponentProps<"tbody">) {
  return <tbody className={cn("[&_tr:last-child]:border-0", className)} {...props} />
}

function TypographyTableRow({
  className,
  ...props
}: React.ComponentProps<"tr">) {
  return (
    <tr
      className={cn("m-0 border-t p-0 even:bg-muted", className)}
      {...props}
    />
  )
}

function TypographyTableHead({
  className,
  ...props
}: React.ComponentProps<"th">) {
  return (
    <th
      className={cn(
        "border px-4 py-2 text-left font-bold [&[align=center]]:text-center [&[align=right]]:text-right",
        className
      )}
      {...props}
    />
  )
}

function TypographyTableCell({
  className,
  ...props
}: React.ComponentProps<"td">) {
  return (
    <td
      className={cn(
        "border px-4 py-2 text-left [&[align=center]]:text-center [&[align=right]]:text-right",
        className
      )}
      {...props}
    />
  )
}

export {
  TypographyH1,
  TypographyH2,
  TypographyH3,
  TypographyH4,
  TypographyP,
  TypographyBlockquote,
  TypographyList,
  TypographyInlineCode,
  TypographyLead,
  TypographyLarge,
  TypographySmall,
  TypographyMuted,
  TypographyTable,
  TypographyTableElement,
  TypographyTableHeader,
  TypographyTableBody,
  TypographyTableRow,
  TypographyTableHead,
  TypographyTableCell,
}
