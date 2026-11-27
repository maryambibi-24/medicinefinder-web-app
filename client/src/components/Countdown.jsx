import { useEffect, useRef, useState } from "react";
import "./reserve.css";

// "mm:ss" or "h:mm:ss"
export function clock(totalSeconds) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

// Counts down to zero. secondsLeft is what the server said at loadedAt (a Date.now() value),
// so the time comes from the server's clock and not from the customer's device.
// It turns red in the last 5 minutes and calls onDone once at zero.
export default function Countdown({ secondsLeft, loadedAt, onDone }) {
  const end = loadedAt + secondsLeft * 1000;
  const [now, setNow] = useState(() => Date.now());
  const fired = useRef(false);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const left = Math.max(0, Math.ceil((end - now) / 1000));

  useEffect(() => {
    if (left === 0 && !fired.current) {
      fired.current = true;
      onDone?.();
    }
  }, [left, onDone]);

  return (
    <span className={`rsv-clock${left <= 300 ? " low" : ""}`} role="timer">
      {left === 0 ? "Time is up" : clock(left)}
    </span>
  );
}
