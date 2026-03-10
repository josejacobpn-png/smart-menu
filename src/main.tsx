import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Immediate Hard Reset Check
if (window.location.search.includes('clear=true')) {
    localStorage.clear();
    sessionStorage.clear();
    // Clear all cookies
    document.cookie.split(";").forEach((c) => {
        document.cookie = c
            .replace(/^ +/, "")
            .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
    });
    window.history.replaceState({}, document.title, window.location.pathname);
    window.location.reload();
}

createRoot(document.getElementById("root")!).render(<App />);
