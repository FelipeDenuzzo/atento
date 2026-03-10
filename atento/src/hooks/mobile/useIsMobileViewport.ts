"use client";

import { useEffect, useState } from "react";

export function useIsMobileViewport(maxWidth = 768): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia(`(max-width: ${maxWidth}px)`);

    const sync = () => {
      setIsMobile(mediaQuery.matches);
    };

    sync();
    mediaQuery.addEventListener("change", sync);

    return () => {
      mediaQuery.removeEventListener("change", sync);
    };
  }, [maxWidth]);

  return isMobile;
}
