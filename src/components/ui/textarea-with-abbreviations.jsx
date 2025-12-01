import * as React from "react"
import { useAbbreviationExpansion } from "@/hooks/useAbbreviationExpansion"
import { cn } from "@/lib/utils"

/**
 * Textarea component with automatic abbreviation expansion
 * Expands abbreviations when user types a space or newline after them
 */
const TextareaWithAbbreviations = React.forwardRef(
  ({ className, value, onChange, currentUserId, disabled, ...props }, ref) => {
    const { handleKeyPress } = useAbbreviationExpansion(currentUserId);
    const textareaRef = React.useRef(null);

    // Combine refs
    React.useImperativeHandle(ref, () => textareaRef.current);

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
      <textarea
        className={cn(
          "flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className
        )}
        ref={textareaRef}
        value={value}
        onChange={onChange}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        {...props}
      />
    );
  }
)
TextareaWithAbbreviations.displayName = "TextareaWithAbbreviations"

export { TextareaWithAbbreviations }
