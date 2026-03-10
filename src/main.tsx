import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

console.log("🚀 Aplicativo inicializando (main.tsx)...");

createRoot(document.getElementById("root")!).render(<App />);
