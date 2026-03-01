import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

/**
 * Application Entry Point
 * 
 * Initializes the React DOM tree and attaches it to the root HTML element.
 * Imports global CSS resets and design system utilities.
 */
createRoot(document.getElementById("root")!).render(<App />);
