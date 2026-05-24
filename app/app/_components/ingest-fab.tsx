"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function IngestFab() {
  const pathname = usePathname();
  if (pathname.startsWith("/app/ingestar")) return null;

  return (
    <Link
      href="/app/ingestar"
      className="fixed bottom-5 right-5 z-50 rounded-full bg-text px-5 py-3 text-sm font-medium text-bg shadow-lg active:opacity-80 hover:opacity-85"
    >
      Cargar foto o mensaje
    </Link>
  );
}
