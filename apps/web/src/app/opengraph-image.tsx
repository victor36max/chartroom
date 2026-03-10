import { ImageResponse } from "next/og";

export const alt = "Chartroom — AI-powered chart generation from CSV data";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#0a0a0a",
          color: "#fafafa",
          fontFamily: "sans-serif",
        }}
      >
        {/* Simple chart icon */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            gap: "12px",
            marginBottom: "40px",
          }}
        >
          {[120, 80, 160, 100, 140].map((h, i) => (
            <div
              key={i}
              style={{
                width: "36px",
                height: `${h}px`,
                borderRadius: "6px",
                background:
                  i === 2
                    ? "linear-gradient(to top, #3b82f6, #60a5fa)"
                    : "linear-gradient(to top, #1e3a5f, #2563eb)",
                opacity: i === 2 ? 1 : 0.6,
              }}
            />
          ))}
        </div>

        {/* Title */}
        <div
          style={{
            fontSize: "72px",
            fontWeight: 700,
            letterSpacing: "-2px",
            marginBottom: "16px",
          }}
        >
          Chartroom
        </div>

        {/* Tagline */}
        <div
          style={{
            fontSize: "28px",
            color: "#a1a1aa",
            maxWidth: "600px",
            textAlign: "center",
          }}
        >
          Create beautiful charts from CSV data with AI
        </div>
      </div>
    ),
    { ...size },
  );
}
