"use client";

import { useEffect, useState } from "react";

type BootstrapState = "checking" | "ready" | "redirecting" | "error";

const SESSION_TOKEN_KEY = "session_token";
const BRANCH_ID_KEY = "branch_id";

function clearSession() {
  try {
    localStorage.removeItem(SESSION_TOKEN_KEY);
    localStorage.removeItem(BRANCH_ID_KEY);
  } catch {
    // ignore storage failures
  }
}

export default function DashboardPage() {
  const [state, setState] = useState<BootstrapState>("checking");

  useEffect(() => {
    const boot = async () => {
      const token = localStorage.getItem(SESSION_TOKEN_KEY);
      const branchId = localStorage.getItem(BRANCH_ID_KEY);

      if (!token || !branchId) {
        setState("redirecting");
        window.location.replace("/login");
        return;
      }

      try {
        const response = await fetch("/api/reports/overview", {
          headers: {
            authorization: `Bearer ${token}`,
            "x-branch-id": branchId
          }
        });

        if (!response.ok) {
          clearSession();
          setState("redirecting");
          window.location.replace("/login");
          return;
        }

        setState("ready");
      } catch {
        setState("error");
      }
    };

    void boot();
  }, []);

  useEffect(() => {
    if (state !== "ready") return;

    const style = document.createElement("link");
    style.rel = "stylesheet";
    style.href = "/desktop/renderer.css";

    const scrollbarOverride = document.createElement("style");
    scrollbarOverride.textContent = `
      html, body, #root, * {
        scrollbar-width: none !important;
        -ms-overflow-style: none !important;
      }
      *::-webkit-scrollbar {
        width: 0 !important;
        height: 0 !important;
        display: none !important;
      }
    `;

    const shim = document.createElement("script");
    shim.src = "/desktop/web-api-shim.js";

    const bundle = document.createElement("script");
    bundle.src = "/desktop/index-CMT8ezEE.js";
    bundle.type = "module";

    let bundleInserted = false;

    shim.onload = () => {
      if (bundleInserted) return;
      document.body.appendChild(bundle);
      bundleInserted = true;
    };

    document.head.appendChild(style);
    document.head.appendChild(scrollbarOverride);
    document.body.appendChild(shim);

    return () => {
      style.remove();
      scrollbarOverride.remove();
      shim.remove();
      if (bundleInserted) {
        bundle.remove();
      }
    };
  }, [state]);

  // Loading state ("checking" or "redirecting")
  if (state !== "ready" && state !== "error") {
    return (
      <main
        style={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          padding: 24,
          background: "#090f1f",
          color: "#f3f6ff"
        }}
      >
        <div style={{ textAlign: "center" }}>
          {/* Rotating spinner */}
          <div
            style={{
              width: 48,
              height: 48,
              margin: "0 auto 16px",
              border: "4px solid rgba(255, 140, 0, 0.2)",
              borderTop: "4px solid #FF8C00",
              borderRadius: "50%",
              animation: "spin 1s linear infinite"
            }}
          />
          <p style={{ margin: 0, fontSize: 16 }}>Loading dashboard...</p>

          {/* Inline keyframe animation */}
          <style>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      </main>
    );
  }

  // Error state
  if (state === "error") {
    return (
      <main
        style={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          padding: 24,
          background: "#090f1f",
          color: "#f3f6ff"
        }}
      >
        <div
          style={{
            maxWidth: 440,
            width: "100%",
            borderRadius: 16,
            border: "1px solid rgba(255, 255, 255, 0.11)",
            background: "rgba(9, 14, 31, 0.73)",
            backdropFilter: "blur(8px)",
            boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.08), 0 24px 44px rgba(2, 4, 12, 0.4)",
            padding: "32px 24px",
            textAlign: "center"
          }}
        >
          {/* Error icon */}
          <div
            style={{
              width: 64,
              height: 64,
              margin: "0 auto 20px",
              borderRadius: "50%",
              border: "2px solid rgba(255, 142, 130, 0.74)",
              background: "rgba(102, 35, 29, 0.42)",
              display: "grid",
              placeItems: "center",
              fontSize: 32,
              color: "#ffd9d3"
            }}
          >
            ✕
          </div>

          {/* Error message */}
          <h2 style={{ margin: "0 0 12px", fontSize: 20, fontWeight: 700 }}>
            Could not load dashboard
          </h2>
          <p style={{ margin: "0 0 24px", color: "rgba(218, 226, 251, 0.86)", fontSize: 14, lineHeight: 1.6 }}>
            We encountered an error while trying to load your dashboard. Please try again or return to login.
          </p>

          {/* Try again button */}
          <button
            onClick={() => window.location.reload()}
            style={{
              width: "100%",
              border: 0,
              borderRadius: 12,
              padding: "12px 16px",
              fontSize: 15,
              fontWeight: 800,
              color: "#26170f",
              background: "linear-gradient(140deg, #FF8C00 0%, #E67E00 100%)",
              boxShadow: "0 14px 24px rgba(230, 126, 0, 0.28)",
              cursor: "pointer",
              marginBottom: 12,
              transition: "transform 150ms ease, filter 150ms ease"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-1px)";
              e.currentTarget.style.filter = "saturate(1.08)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.filter = "saturate(1)";
            }}
          >
            Try again
          </button>

          {/* Back to login link */}
          <a
            href="/login"
            style={{
              display: "inline-block",
              color: "#FFCC80",
              textDecoration: "none",
              fontSize: 14
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.textDecoration = "underline";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.textDecoration = "none";
            }}
          >
            Back to login
          </a>
        </div>
      </main>
    );
  }

  return <div id="root" />;
}
