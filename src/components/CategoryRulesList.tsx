import { deleteRule } from "../services/categoryRules";
import "./CategoryRulesList.css";

interface Props {
  rules: Record<string, string>;
  onRulesChange: (updated: Record<string, string>) => void;
}

export function CategoryRulesList({ rules, onRulesChange }: Props) {
  const entries = Object.entries(rules);

  function handleDelete(key: string) {
    deleteRule(key);
    const updated = { ...rules };
    delete updated[key];
    onRulesChange(updated);
  }

  return (
    <div className="rules-container">
      <h3 className="rules-title">Category rules</h3>
      {entries.length === 0 ? (
        <p className="rules-empty">
          No rules yet — override a category to create one.
        </p>
      ) : (
        <ul className="rules-list">
          {entries.map(([key, category]) => (
            <li key={key} className="rules-item">
              <span className="rules-description">{key}</span>
              <span className="rules-arrow">→</span>
              <span className="rules-category">{category}</span>
              <button
                className="rules-delete"
                onClick={() => handleDelete(key)}
                aria-label={`Delete rule for ${key}`}
                type="button"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
