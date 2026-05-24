"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/app/resumen", label: "Resumen" },
  { href: "/app/finanzas", label: "Finanzas" },
  { href: "/app/referencias", label: "Referencias de pago" },
  { href: "/app/medicamentos", label: "Medicamentos" },
  { href: "/app/citas", label: "Citas médicas" },
];

export function Tabs() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Secciones"
      className="-mx-4 mt-5 mb-5 overflow-x-auto border-b border-border [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      <div className="flex w-max gap-1 px-4">
        {TABS.map((t) => {
          const active = pathname === t.href || pathname.startsWith(t.href + "/");
          return (
            <Link
              key={t.href}
              href={t.href}
              aria-current={active ? "page" : undefined}
              className={`-mb-px shrink-0 whitespace-nowrap rounded-t-md px-3.5 py-2.5 text-sm font-medium transition-colors ${
                active
                  ? "border-b-2 border-text text-text"
                  : "border-b-2 border-transparent text-text-2 hover:bg-bg-2 active:bg-bg-2"
              }`}
            >
              {t.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
