import { useState, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

/**
 * Custom hook for abbreviation expansion in text fields
 * Automatically expands abbreviations when user types a space after them
 */
export function useAbbreviationExpansion(currentUserId) {
  const [abbreviationMap, setAbbreviationMap] = useState({});

  // Fetch abbreviations from the database
  const { data: abbreviations } = useQuery({
    queryKey: ['abbreviations'],
    queryFn: async () => {
      // Backend already filters by user_id and is_global
      // Returns only abbreviations the user can access
      return await base44.entities.Abbreviation.list();
    },
    initialData: [],
    enabled: !!currentUserId,
  });

  // Build abbreviation map for quick lookup
  useEffect(() => {
    if (abbreviations) {
      const map = {};
      abbreviations.forEach(abbr => {
        // Store in lowercase for case-insensitive matching
        map[abbr.abbreviation.toLowerCase()] = abbr.full_text;
      });
      setAbbreviationMap(map);
    }
  }, [abbreviations]);

  /**
   * Process text input and expand abbreviations
   * @param {string} text - Current text value
   * @param {number} cursorPosition - Current cursor position
   * @returns {object} - { newText, newCursorPosition }
   */
  const processText = useCallback((text, cursorPosition) => {
    if (!text || cursorPosition === 0) {
      return { newText: text, newCursorPosition: cursorPosition };
    }

    // Get the text before the cursor
    const textBeforeCursor = text.substring(0, cursorPosition);
    
    // Find the last word before cursor (word boundary is space, newline, or start of string)
    const words = textBeforeCursor.match(/(\S+)(?:\s*)$/);
    
    if (!words || words.length === 0) {
      return { newText: text, newCursorPosition: cursorPosition };
    }

    const lastWord = words[1].toLowerCase();
    const lastWordStartPos = textBeforeCursor.lastIndexOf(words[1]);
    
    // Check if the last word is an abbreviation
    if (abbreviationMap[lastWord]) {
      const expansion = abbreviationMap[lastWord];
      
      // Replace the abbreviation with the full text
      const textBeforeAbbr = text.substring(0, lastWordStartPos);
      const textAfterCursor = text.substring(cursorPosition);
      const newText = textBeforeAbbr + expansion + textAfterCursor;
      
      // Calculate new cursor position (after the expanded text)
      const newCursorPosition = lastWordStartPos + expansion.length;
      
      return { newText, newCursorPosition };
    }

    return { newText: text, newCursorPosition: cursorPosition };
  }, [abbreviationMap]);

  /**
   * Handle key press event for abbreviation expansion
   * Expands abbreviations when user types a space or newline
   */
  const handleKeyPress = useCallback((e, currentValue, onValueChange) => {
    // Check if space or Enter was pressed
    if (e.key === ' ' || e.key === 'Enter') {
      const cursorPosition = e.target.selectionStart;
      const { newText, newCursorPosition } = processText(currentValue, cursorPosition);
      
      if (newText !== currentValue) {
        // Prevent default to avoid adding the space/newline before expansion
        e.preventDefault();
        
        // Update the value with expanded text
        onValueChange(newText + (e.key === ' ' ? ' ' : '\n'));
        
        // Set cursor position after a short delay to ensure DOM is updated
        setTimeout(() => {
          e.target.selectionStart = e.target.selectionEnd = 
            newCursorPosition + (e.key === ' ' ? 1 : 1);
        }, 0);
      }
    }
  }, [processText]);

  return {
    handleKeyPress,
    abbreviationMap,
    abbreviationsCount: Object.keys(abbreviationMap).length
  };
}
