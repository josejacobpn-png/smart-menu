import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Basic reset check to ensure we don't proceed with corrupt state
if (window.location.search.includes('clear=true') || window.location.search.includes('reset=')) {
    console.log('[Main] Reset detected, proceeding with clean start');
}

createRoot(document.getElementById("root")!).render(<App />);
