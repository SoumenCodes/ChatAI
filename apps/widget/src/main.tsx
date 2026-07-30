import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import tailwindStyles from "./index.css?inline";

interface WidgetConfig {
  projectId: string;
  apiUrl?: string;
}

// Declare the global window type
declare global {
  interface Window {
    AIWidget?: {
      init: (config: WidgetConfig) => void;
    };
  }
}

const AIWidget = {
  init: (config: WidgetConfig) => {
    // Prevent duplicate widget initialization
    const existingHost = document.getElementById("ai-knowledge-widget-host");
    if (existingHost) {
      console.warn("AI Widget already initialized.");
      return;
    }

    // 1. Create wrapper container placed at bottom-right
    const host = document.createElement("div");
    host.id = "ai-knowledge-widget-host";
    
    // Style the outer container so it floats above all elements on the page
    host.style.position = "fixed";
    host.style.bottom = "20px";
    host.style.right = "20px";
    host.style.zIndex = "999999";
    host.style.display = "block";
    
    document.body.appendChild(host);

    // 2. Attach Shadow DOM (open mode) to isolate styles
    const shadowRoot = host.attachShadow({ mode: "open" });

    // 3. Inject compiled Tailwind styles directly inside the Shadow Root
    const styleElement = document.createElement("style");
    styleElement.textContent = tailwindStyles;
    shadowRoot.appendChild(styleElement);

    // 4. Create mount point for React app inside Shadow DOM
    const reactMountPoint = document.createElement("div");
    reactMountPoint.id = "ai-widget-root";
    shadowRoot.appendChild(reactMountPoint);

    // 5. Boot and render the React Widget App
    const root = ReactDOM.createRoot(reactMountPoint);
    root.render(
      <React.StrictMode>
        <App projectId={config.projectId} apiUrl={config.apiUrl} />
      </React.StrictMode>
    );
  }
};

// Bind to window object for embed script access
window.AIWidget = AIWidget;

export default AIWidget;
