"use client";
import dynamic from "next/dynamic";

// ssr:false — the app uses browser APIs (vibration, file download, realtime)
const BarberApp = dynamic(() => import("../components/BarberApp"), { ssr: false });

export default function Page() {
  return <BarberApp />;
}
