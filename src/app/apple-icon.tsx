import { ImageResponse } from "next/og";

/** iPhone braucht für „Zum Home-Bildschirm“ ein PNG – SVG wird dort ignoriert. */
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#212721" }}>
        <svg width="140" height="140" viewBox="96 84 320 320">
          <rect x="116" y="136" width="280" height="250" rx="36" fill="none" stroke="#b6a545" strokeWidth="32" />
          <path d="M116 212h280M188 104v64M324 104v64" stroke="#b6a545" strokeWidth="32" strokeLinecap="round" />
          <path d="M196 296l40 40 84-84" fill="none" stroke="#ffffff" strokeWidth="30" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    ),
    size,
  );
}
