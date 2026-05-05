import { useEffect, useState } from "react";

export default function Announcer() {
  const [message, setMessage] = useState("");

  useEffect(() => {
    const handler = (e: any) => {
      const detail = e?.detail || e;
      setMessage(detail?.message || String(detail));
      // clear after a short time
      setTimeout(() => setMessage(""), 3000);
    };
    window.addEventListener('a11y-announcement', handler as EventListener);
    return () => window.removeEventListener('a11y-announcement', handler as EventListener);
  }, []);

  return (
    <div aria-live="polite" aria-atomic="true" className="sr-only">
      {message}
    </div>
  );
}
