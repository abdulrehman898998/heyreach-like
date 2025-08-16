import React, { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

interface VariableInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  suggestions?: string[];
  multiline?: boolean;
  className?: string;
}

interface Variable {
  start: number;
  end: number;
  name: string;
  fullText: string;
}

const VariableInput: React.FC<VariableInputProps> = ({
  value,
  onChange,
  placeholder = "Type / to select column",
  suggestions = [],
  multiline = false,
  className = ""
}) => {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestionIndex, setSuggestionIndex] = useState(0);
  const [cursorPosition, setCursorPosition] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Parse variables from the current value
  const parseVariables = (text: string): Variable[] => {
    const variables: Variable[] = [];
    const regex = /\/([a-zA-Z0-9_\s]+)/g;
    let match;

    while ((match = regex.exec(text)) !== null) {
      variables.push({
        start: match.index,
        end: match.index + match[0].length,
        name: match[1].trim(),
        fullText: match[0]
      });
    }

    return variables;
  };

  const variables = parseVariables(value);

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    onChange(newValue);

    // Check if we should show suggestions
    if (newValue.includes('/')) {
      const lastSlashIndex = newValue.lastIndexOf('/');
      const afterSlash = newValue.substring(lastSlashIndex + 1);
      
      // Only show suggestions if we're typing after a slash and haven't completed the variable
      if (afterSlash.length > 0 && !afterSlash.includes(' ')) {
        setShowSuggestions(true);
        setSuggestionIndex(0);
        setCursorPosition(e.target.selectionStart || 0);
      } else {
        setShowSuggestions(false);
      }
    } else {
      setShowSuggestions(false);
    }
  };

  // Insert suggestion
  const insertSuggestion = (suggestion: string) => {
    const input = multiline ? textareaRef.current : inputRef.current;
    if (!input) return;

    const beforeSlash = value.substring(0, value.lastIndexOf('/'));
    const afterCursor = value.substring(cursorPosition);
    const newValue = beforeSlash + '/' + suggestion + afterCursor;
    
    onChange(newValue);
    setShowSuggestions(false);

    // Set cursor position after the inserted variable
    const newCursorPosition = beforeSlash.length + suggestion.length + 1;
    
    setTimeout(() => {
      input.focus();
      input.setSelectionRange(newCursorPosition, newCursorPosition);
    }, 0);
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSuggestionIndex(prev => (prev + 1) % suggestions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSuggestionIndex(prev => (prev - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      if (suggestions[suggestionIndex]) {
        insertSuggestion(suggestions[suggestionIndex]);
      }
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  // Handle cursor position changes
  const handleCursorChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setCursorPosition(e.target.selectionStart || 0);
  };

  // Render the input with variable highlighting
  const renderInput = () => {
    if (multiline) {
      return (
        <Textarea
          ref={textareaRef}
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onSelect={handleCursorChange}
          placeholder={placeholder}
          className={className}
          rows={4}
        />
      );
    }

    return (
      <Input
        ref={inputRef}
        value={value}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onSelect={handleCursorChange}
        placeholder={placeholder}
        className={className}
      />
    );
  };

  // Render variable boxes overlay
  const renderVariableOverlay = () => {
    if (variables.length === 0) return null;

    return (
      <div className="absolute inset-0 pointer-events-none">
        {variables.map((variable, index) => (
          <div
            key={index}
            className="absolute inline-block"
            style={{
              left: `${(variable.start / value.length) * 100}%`,
              width: `${((variable.end - variable.start) / value.length) * 100}%`,
            }}
          >
            <span className="inline-block bg-gradient-to-r from-blue-100 to-purple-100 border border-blue-200 rounded px-1 py-0.5 text-xs font-medium text-blue-700 shadow-sm">
              /{variable.name}
            </span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="relative">
      {renderInput()}
      {renderVariableOverlay()}
      
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-40 overflow-y-auto">
          {suggestions.map((suggestion, index) => (
            <div
              key={suggestion}
              className={`px-3 py-2 cursor-pointer hover:bg-gray-100 ${
                index === suggestionIndex ? 'bg-blue-50' : ''
              }`}
              onClick={() => insertSuggestion(suggestion)}
            >
              <span className="text-blue-600">/{suggestion}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default VariableInput;
