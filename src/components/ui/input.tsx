import * as React from "react";

import { cn } from "@/lib/utils";
import { isCompleteNumber, matchesNumericValue } from "@/lib/numeric-entry";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, value, onChange, onFocus, onBlur, ...props }, ref) => {
    const numeric = type === "number";
    const [draft, setDraft] = React.useState(() => String(value ?? props.defaultValue ?? ""));
    const focused = React.useRef(false);

    React.useEffect(() => {
      if (numeric && !focused.current) {
        setDraft((text) => matchesNumericValue(text, value) ? text : String(value ?? ""));
      }
    }, [numeric, value]);

    return (
      <input
        type={numeric ? "text" : type}
        inputMode={numeric ? "decimal" : props.inputMode}
        className={cn(
          "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className,
        )}
        ref={ref}
        {...props}
        value={numeric ? draft : value}
        onFocus={(event) => {
          focused.current = true;
          onFocus?.(event);
        }}
        onChange={(event) => {
          if (!numeric) {
            onChange?.(event);
            return;
          }
          const text = event.target.value;
          setDraft(text);
          if (text === "" || isCompleteNumber(text)) onChange?.(event);
        }}
        onBlur={(event) => {
          focused.current = false;
          if (numeric && value !== undefined && !matchesNumericValue(draft, value)) {
            setDraft(String(value ?? ""));
          }
          onBlur?.(event);
        }}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
