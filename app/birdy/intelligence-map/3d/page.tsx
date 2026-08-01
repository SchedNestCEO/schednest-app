"use client";

import dynamic from "next/dynamic";

const Birdy3DScene = dynamic(
  () => import("./components/Birdy3DScene"),
  {
    ssr: false,
    loading: () => (
      <main
        style={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          background: "#020609",
          color: "#dffcff",
        }}
      >
        Loading Birdy 3D…
      </main>
    ),
  },
);

export default function Birdy3DPage() {
  return <Birdy3DScene />;
}
