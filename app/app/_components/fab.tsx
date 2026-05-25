"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "./icon";

type Props = {
  href: string;
  icon?: string;
  ariaLabel: string;
};

export function Fab({ href, icon = "add", ariaLabel }: Props) {
  const pathname = usePathname();
  if (pathname === href || pathname.startsWith(href + "/")) return null;
  return (
    <Link
      href={href}
      aria-label={ariaLabel}
      className="fixed right-5 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-blue text-bg shadow-lg active:scale-95 hover:opacity-90 transition-transform"
      style={{ bottom: "calc(env(safe-area-inset-bottom) + 88px)" }}
    >
      <Icon name={icon} className="text-3xl" />
    </Link>
  );
}
