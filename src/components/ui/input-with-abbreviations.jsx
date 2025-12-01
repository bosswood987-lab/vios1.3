import * as React from "react"
import { useAbbreviationExpansion } from "@/hooks/useAbbreviationExpansion"
import { cn } from "@/lib/utils"

/**
 * Input component with automatic abbreviation expansion
 * Expands abbreviations when user types a space after them
 */
const InputWithAbbreviations = React.forwardRef(
  ({ className, type, value, onChange, currentUserId, disabled, ...props }, ref) => {
    const { handleKeyPress } = useAbbreviationExpansion(currentUserId);
    const inputRef = React.useRef(null);

    // Combine refs
    React.useImperativeHandle(ref, () => inputRef.current);

    const handleKeyDown = (e) => {
      if (!disabled && currentUserId) {
        handleKeyPress(e, value || '', (newValue) => {
          if (onChange) {
            // Create a synthetic event for compatibility
            const syntheticEvent = {
              target: { value: newValue },
              currentTarget: { value: newValue }
            };
            onChange(syntheticEvent);
          }
        });
      }
      
      // Call original onKeyDown if provided
      if (props.onKeyDown) {
        props.onKeyDown(e);
      }
    };

    return (
      <input
        type={type}
        className={cn(
          "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className
        )}
        ref={inputRef}
        value={value}
        onChange={onChange}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        {...props}
      />
    );
  }
)
InputWithAbbreviations.displayName = "InputWithAbbreviations"

export { InputWithAbbreviations }
