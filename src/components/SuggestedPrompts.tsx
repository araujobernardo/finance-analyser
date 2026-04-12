import { SUGGESTED_PROMPTS } from "../constants/suggestedPrompts";
import "./SuggestedPrompts.css";

interface SuggestedPromptsProps {
  onSelect: (prompt: string) => void;
}

export function SuggestedPrompts({ onSelect }: SuggestedPromptsProps) {
  return (
    <div
      className="suggested-prompts"
      role="list"
      aria-label="Suggested prompts"
    >
      {SUGGESTED_PROMPTS.map((prompt) => (
        <button
          key={prompt}
          className="suggested-prompts__chip"
          role="listitem"
          onClick={() => onSelect(prompt)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onSelect(prompt);
            }
          }}
        >
          {prompt}
        </button>
      ))}
    </div>
  );
}
