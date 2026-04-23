import { useState, useRef, type ReactNode } from "react";

interface TooltipProps {
  children: ReactNode;
  text: string;
  position?: "top" | "bottom";
  align?: "center" | "right";
}

export function Tooltip({ children, text, position = "top", align = "right" }: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  function show() {
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setVisible(true), 300);
  }

  function hide() {
    clearTimeout(timeoutRef.current);
    setVisible(false);
  }

  const alignClass =
    align === "right"
      ? "right-0"
      : "left-1/2 -translate-x-1/2";

  const arrowAlignClass =
    align === "right"
      ? "right-2"
      : "left-1/2 -translate-x-1/2";

  return (
    <div
      className="relative inline-flex"
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      {children}
      {visible && (
        <div
          className={`absolute z-50 w-52 rounded-lg bg-gray-900 px-3 py-2 text-xs leading-relaxed text-white shadow-lg pointer-events-none ${alignClass} ${
            position === "top" ? "bottom-full mb-2" : "top-full mt-2"
          }`}
        >
          {text}
          <div
            className={`absolute ${arrowAlignClass} border-[5px] border-transparent ${
              position === "top"
                ? "top-full border-t-gray-900"
                : "bottom-full border-b-gray-900"
            }`}
          />
        </div>
      )}
    </div>
  );
}
