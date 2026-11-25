"use client";
// Small bottom notice while the sleeping online server wakes up (see slowWatch in lib/api.ts).
import { useEffect, useState } from "react";

export default function WakeNotice() {
  const [slow, setSlow] = useState(0);
  useEffect(() => {
    const on = (e: Event) => setSlow((n) => Math.max(0, n + (e as CustomEvent<number>).detail));
    window.addEventListener("fn:slow", on);
    return () => window.removeEventListener("fn:slow", on);
  }, []);
  if (!slow) return null;
  return (
    <div className="wake-notice" role="status">
      <span className="wake-dot" aria-hidden="true" />
      Starting the server… this can take up to a minute the first time.
    </div>
  );
}
