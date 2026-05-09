import { useToast } from "../hooks/useToast";
import "./Toast.css";

export function Toast() {
  const { toasts } = useToast();

  return (
    <div className="toast-container">
      {toasts.map((t) => (
        <div key={t.id} className="toast-item">
          {t.message}
        </div>
      ))}
    </div>
  );
}
