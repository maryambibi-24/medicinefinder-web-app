import { useEffect, useRef } from "react";

// Runs fn now and then every "ms" milliseconds. It skips a round while the tab is hidden.
export default function usePoll(fn, ms) {
  const latest = useRef(fn);
  useEffect(() => { latest.current = fn; });
  useEffect(() => {
    latest.current();
    const t = setInterval(() => { if (!document.hidden) latest.current(); }, ms);
    return () => clearInterval(t);
  }, [ms]);
}
