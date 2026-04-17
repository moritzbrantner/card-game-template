import type { HTMLAttributes, ReactNode } from "react";

type CardProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
};

export function Card({ children, className, ...props }: CardProps) {
  return (
    <div
      className={[
        "rounded-xl border border-zinc-200 bg-white text-zinc-900 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className, ...props }: CardProps) {
  return (
    <div className={["flex flex-col space-y-1.5 p-6", className].filter(Boolean).join(" ")} {...props}>
      {children}
    </div>
  );
}

export function CardTitle({ children, className, ...props }: CardProps) {
  return (
    <h2 className={["text-2xl font-semibold leading-none tracking-tight", className].filter(Boolean).join(" ")} {...props}>
      {children}
    </h2>
  );
}

export function CardDescription({ children, className, ...props }: CardProps) {
  return (
    <p className={["text-sm text-zinc-600 dark:text-zinc-400", className].filter(Boolean).join(" ")} {...props}>
      {children}
    </p>
  );
}

export function CardContent({ children, className, ...props }: CardProps) {
  return (
    <div className={["p-6 pt-0", className].filter(Boolean).join(" ")} {...props}>
      {children}
    </div>
  );
}
