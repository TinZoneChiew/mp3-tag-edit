import { createRoot } from "react-dom/client";
import { Buffer } from "buffer";
import process from "process";
import "./index.css";
import App from "./App.tsx";
import { AppWrapper } from "./components/common/PageMeta.tsx";

// Polyfill Buffer and process for music-metadata-browser and other node-centric libs
if (typeof window !== 'undefined') {
  window.Buffer = Buffer;
  (window as any).global = window;
  (window as any).process = process;
}

createRoot(document.getElementById("root")!).render(
  <AppWrapper>
    <App />
  </AppWrapper>
);
