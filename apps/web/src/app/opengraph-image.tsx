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
        {/* Logo emoji */}
        <div style={{ fontSize: "120px", marginBottom: "40px" }}>⛵</div>

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
