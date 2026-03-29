import { useRef, useState, DragEvent, ChangeEvent, KeyboardEvent } from "react";
import "./CsvUpload.css";

interface CsvUploadProps {
  onFileSelected: (file: File) => void;
}

export function CsvUpload({ onFileSelected }: CsvUploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function validateAndAccept(file: File): void {
    if (!file.name.toLowerCase().endsWith(".csv")) {
      setError(`"${file.name}" is not a CSV file. Please upload a .csv file.`);
      setSelectedFile(null);
      return;
    }
    setError(null);
    setSelectedFile(file);
    onFileSelected(file);
  }

  function handleInputChange(e: ChangeEvent<HTMLInputElement>): void {
    const file = e.target.files?.[0];
    if (file) validateAndAccept(file);
  }

  function handleDrop(e: DragEvent<HTMLDivElement>): void {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) validateAndAccept(file);
  }

  function handleDragOver(e: DragEvent<HTMLDivElement>): void {
    e.preventDefault();
    setIsDragOver(true);
  }

  function handleDragLeave(): void {
    setIsDragOver(false);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLDivElement>): void {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      inputRef.current?.click();
    }
  }

  return (
    <div className="csv-upload">
      <div
        className={`csv-upload__zone ${isDragOver ? "csv-upload__zone--drag-over" : ""}`}
        onClick={() => inputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onKeyDown={handleKeyDown}
        role="button"
        tabIndex={0}
        aria-label="Upload CSV file. Click or drag and drop a CSV file here."
      >
        <svg
          className="csv-upload__icon"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
          />
        </svg>

        <p className="csv-upload__prompt">
          Drag and drop your CSV here, or{" "}
          <span className="csv-upload__browse">browse</span>
        </p>
        <p className="csv-upload__hint">.csv files only</p>

        <input
          ref={inputRef}
          type="file"
          accept=".csv"
          className="csv-upload__input"
          onChange={handleInputChange}
          aria-hidden="true"
          tabIndex={-1}
        />
      </div>

      {error && (
        <p className="csv-upload__error" role="alert">
          {error}
        </p>
      )}

      {selectedFile && !error && (
        <p className="csv-upload__filename" aria-live="polite">
          Selected: <strong>{selectedFile.name}</strong>
        </p>
      )}
    </div>
  );
}
