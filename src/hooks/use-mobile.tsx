import * as React from "react";

const MOBILE_BREAKPOINT = 768;

/**
 * useIsMobile Hook
 * 
 * A responsive utility hook that listens to window resize events mapping against
 * a predefined mobile breakpoint (768px). Used to dynamically adjust UI layouts
 * such as toggling sidebars or transforming menus for mobile devices.
 * 
 * @hook
 * @returns {boolean} True if the current viewport width is less than the mobile breakpoint.
 */
export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined);

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };
    mql.addEventListener("change", onChange);
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return !!isMobile;
}
