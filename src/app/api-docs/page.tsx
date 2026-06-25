"use client";

import { useEffect } from "react";

// Swagger UI is loaded from a CDN (no npm dependency, no SSR involvement).
// Everything touching `window`/`document` runs inside useEffect on the client.
declare global {
  interface Window {
    SwaggerUIBundle?: (config: Record<string, unknown>) => unknown;
  }
}

const CSS_URL = "https://unpkg.com/swagger-ui-dist/swagger-ui.css";
const JS_URL = "https://unpkg.com/swagger-ui-dist/swagger-ui-bundle.js";

export default function ApiDocsPage() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Inject the stylesheet once.
    if (!document.querySelector(`link[href="${CSS_URL}"]`)) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = CSS_URL;
      document.head.appendChild(link);
    }

    const render = () => {
      if (window.SwaggerUIBundle) {
        window.SwaggerUIBundle({ url: "/api/openapi", dom_id: "#swagger" });
      }
    };

    // Load the bundle once, then render. If it's already present, render now.
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${JS_URL}"]`
    );
    if (existing) {
      if (window.SwaggerUIBundle) {
        render();
      } else {
        existing.addEventListener("load", render, { once: true });
      }
      return;
    }

    const script = document.createElement("script");
    script.src = JS_URL;
    script.crossOrigin = "anonymous";
    script.addEventListener("load", render, { once: true });
    document.body.appendChild(script);
  }, []);

  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold text-slate-800">
        API Documentation
      </h1>
      <div id="swagger" />
    </div>
  );
}
