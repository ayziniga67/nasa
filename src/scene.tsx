import React from "react";

export function MissionScene({ mode, progressRef, failAt, design }: { mode: string; progressRef: React.MutableRefObject<number>; failAt: number | null; design: any }) {
  return (
    <div style={{ width: "100%", height: "100%", background: "#03040a", display: "grid", placeItems: "center" }}>
      <p style={{ opacity: 0.6 }}>3D Mission Scene ({mode})</p>
    </div>
  );
}

export function WorkshopScene({ design }: { design: any }) {
  return (
    <div style={{ width: "100%", height: "100%", background: "#070c1b", display: "grid", placeItems: "center" }}>
      <p style={{ opacity: 0.6 }}>3D Workshop Preview</p>
    </div>
  );
}
