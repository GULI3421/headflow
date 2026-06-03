"use client";

import dynamic from "next/dynamic";

const Header = dynamic(() => import("@/components/header").then((mod) => mod.Header), {
  ssr: false,
});

export function NavigationShell() {
  return (
    <>
      <Header />
    </>
  );
}
