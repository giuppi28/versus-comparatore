import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";

export const alt = "VERSUS — comparatore luce e gas";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpengraphImage() {
  const svg = await readFile(path.join(process.cwd(), "public/brand/versus_icona.svg"));
  const logo = `data:image/svg+xml;base64,${svg.toString("base64")}`;
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
          gap: 40,
          background: "#ffffff",
        }}
      >
        <img src={logo} width={260} height={260} alt="" />
        <div style={{ fontSize: 72, fontWeight: 700, color: "#0a8045" }}>Comparatore luce e gas</div>
      </div>
    ),
    size,
  );
}
