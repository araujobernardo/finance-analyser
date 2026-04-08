import { useEffect, useRef, useState } from "react";
import { CATEGORIES } from "../services/categorisation";
import "./CategoryBadge.css";

interface Props {
  category: string;
  onCategoryChange: (newCategory: string) => void;
}

export function CategoryBadge({ category, onCategoryChange }: Props) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  function handleSelect(cat: string) {
    setOpen(false);
    if (cat !== category) onCategoryChange(cat);
  }

  return (
    <div className="category-badge-container" ref={containerRef}>
      <button
        className="category-badge"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        type="button"
      >
        {category || "Uncategorised"}
        <span className="category-badge-arrow" aria-hidden="true">
          ▾
        </span>
      </button>
      {open && (
        <ul
          className="category-dropdown"
          role="listbox"
          aria-label="Select category"
        >
          {CATEGORIES.map((cat) => (
            <li
              key={cat}
              role="option"
              aria-selected={cat === category}
              className={
                cat === category
                  ? "category-option selected"
                  : "category-option"
              }
              onMouseDown={() => handleSelect(cat)}
            >
              {cat}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
