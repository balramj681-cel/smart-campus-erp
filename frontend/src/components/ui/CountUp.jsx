import { useEffect, useRef, useState } from "react";
import { useInView, animate } from "framer-motion";

/**
 * Number ko 0 se target value tak animate karta hai jab component
 * viewport mein aata hai — dashboards ko "alive" feel deta hai.
 * Non-numeric values (jaise "₹54,700" ya "10.0%") ko bhi handle karta hai —
 * sirf digits animate hote hain, baaki formatting (prefix/suffix) preserve rehti hai.
 */
export default function CountUp({ value, duration = 1.2 }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-10px" });
  const [display, setDisplay] = useState("0");

  const str = String(value);
  const match = str.match(/^([^\d]*)([\d,]+\.?\d*)([^\d]*)$/);

  useEffect(() => {
    if (!isInView) return;
    if (!match) { setDisplay(str); return; }

    const [, prefix, numStr, suffix] = match;
    const target = parseFloat(numStr.replace(/,/g, ""));
    const hasDecimal = numStr.includes(".");

    const controls = animate(0, target, {
      duration,
      ease: [0.22, 1, 0.36, 1],
      onUpdate(v) {
        const formatted = hasDecimal
          ? v.toFixed(1)
          : Math.round(v).toLocaleString("en-IN");
        setDisplay(`${prefix}${formatted}${suffix}`);
      },
    });
    return () => controls.stop();
  }, [isInView]);

  return <span ref={ref}>{display}</span>;
}