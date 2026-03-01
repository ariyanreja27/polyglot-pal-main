import { NavLink as RouterNavLink, NavLinkProps } from "react-router-dom";
import { forwardRef } from "react";
import { cn } from "@/lib/utils";

interface NavLinkCompatProps extends Omit<NavLinkProps, "className"> {
  className?: string;
  activeClassName?: string;
  pendingClassName?: string;
}

/**
 * NavLink Component
 * 
 * A customized wrapper around React Router's `NavLink` component that allows
 * for explicit `activeClassName` and `pendingClassName` properties to simplify
 * styling of links based on their current active routing state.
 * 
 * @component
 * @param {NavLinkCompatProps} props - Properties including active/pending specific classes.
 * @returns {JSX.Element} The styled navigation anchor.
 */
const NavLink = forwardRef<HTMLAnchorElement, NavLinkCompatProps>(
  ({ className, activeClassName, pendingClassName, to, ...props }, ref) => {
    return (
      <RouterNavLink
        ref={ref}
        to={to}
        className={({ isActive, isPending }) =>
          cn(className, isActive && activeClassName, isPending && pendingClassName)
        }
        {...props}
      />
    );
  },
);

NavLink.displayName = "NavLink";

export { NavLink };
