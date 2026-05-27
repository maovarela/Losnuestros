"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "./icon";

const ITEMS = [
  { href: "/app/resumen", label: "Inicio", icon: "home" },
  { href: "/app/medicamentos", label: "Meds", icon: "medication" },
  { href: "/app/citas", label: "Citas", icon: "event" },
  { href: "/app/finanzas", label: "Finanzas", icon: "payments" },
  {
    href: "/app/referencias",
    label: "Referencias de pago",
    icon: "receipt_long",
  },
];

export function Tabs() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Secciones"
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-bg"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="mx-auto flex max-w-[720px] items-center justify-around px-2 py-1.5">
        {ITEMS.map((t) => {
          const active =
            pathname === t.href || pathname.startsWith(t.href + "/");
          return (
            <li key={t.href} className="min-w-0 flex-1">
              <Link
                href={t.href}
                aria-current={active ? "page" : undefined}
                className={`mx-auto flex w-full min-h-12 max-w-[88px] flex-col items-center justify-center gap-0.5 rounded-2xl px-2 py-1 text-[10px] font-medium leading-tight transition-colors ${
                  active
                    ? "bg-green-bg text-green"
                    : "text-text-2 active:bg-bg-2"
                }`}
              >
                <Icon
                  name={t.icon}
                  filled={active}
                  className="text-2xl"
                />
                <span className="line-clamp-2 text-center">{t.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
