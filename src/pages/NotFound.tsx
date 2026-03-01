import { useLocation } from "react-router-dom";
import { useEffect } from "react";

/**
 * NotFound Component
 * 
 * A catch-all route component displayed when a user attempts to 
 * navigate to a URL that does not exist within the application's
 * defined React Router routes. Automatically logs the 404 attempt.
 * 
 * @component
 * @example
 * <Route path="*" element={<NotFound />} />
 * 
 * @returns {JSX.Element} The rendered 404 error page.
 */
const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted">
      <div className="text-center">
        <h1 className="mb-4 text-4xl font-bold">404</h1>
        <p className="mb-4 text-xl text-muted-foreground">Oops! Page not found</p>
        <a href="/" className="text-primary underline hover:text-primary/90">
          Return to Home
        </a>
      </div>
    </div>
  );
};

export default NotFound;
