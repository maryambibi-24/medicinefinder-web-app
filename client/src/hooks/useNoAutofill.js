import { useEffect, useRef } from "react";

// Keeps a form empty when the page opens, even if the browser tries to
// auto-fill saved logins. Once the person starts typing, it leaves the fields alone.
export default function useNoAutofill(formRef, onClear) {
  const touched = useRef(false);

  useEffect(() => {
    const form = formRef.current;
    if (!form) return undefined;

    const markTouched = () => { touched.current = true; };
    form.addEventListener("keydown", markTouched);
    form.addEventListener("pointerdown", markTouched);

    const clear = () => {
      if (touched.current) return;
      form
        .querySelectorAll('input[type="text"],input[type="email"],input[type="password"],input[type="tel"]')
        .forEach((input) => { input.value = ""; });
      if (onClear) onClear();
    };

    clear();
    // Browsers sometimes fill a moment after the page loads, so clear again
    const timers = [50, 300, 800, 1500].map((ms) => setTimeout(clear, ms));

    // Coming back with the browser's Back button
    const onShow = (e) => {
      if (e.persisted) { touched.current = false; clear(); }
    };
    window.addEventListener("pageshow", onShow);

    return () => {
      timers.forEach(clearTimeout);
      form.removeEventListener("keydown", markTouched);
      form.removeEventListener("pointerdown", markTouched);
      window.removeEventListener("pageshow", onShow);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
