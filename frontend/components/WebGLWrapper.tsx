"use client";

import dynamic from "next/dynamic";

const WebGLBackground = dynamic(
  () => import("@/components/WebGLBackground"),
  { ssr: false }
);

export default function WebGLWrapper() {
  return <WebGLBackground />;
}
