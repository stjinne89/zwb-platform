import { createRoot } from "react-dom/client";
import { KopmanApp } from "../../../src/kopman/ui/kopman-app";
import "./reset.css";

createRoot(document.getElementById("root")!).render(<KopmanApp />);
