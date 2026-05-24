"use client";
import Link from "next/link";
import { useAppContext } from "@/lib/app-context";

export default function AppHome() {
  const { patientName, patientInitials, caregiverName } = useAppContext();

  return (
    <div className="mx-auto w-full max-w-[720px] px-4 py-6">
      <div className="flex items-center gap-4 rounded-xl border border-border bg-bg-2 px-6 py-5">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-bg text-base font-medium text-blue">
          {patientInitials}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-lg font-medium">{patientName}</div>
          <div className="text-sm text-text-2">
            Sesión: <span className="font-medium text-text">{caregiverName}</span>
          </div>
        </div>
      </div>

      <div className="mt-6 space-y-3">
        <Link
          href="/app/medicamentos"
          className="block rounded-xl border border-border bg-bg p-5 transition-colors hover:bg-bg-2"
        >
          <div className="text-base font-medium">Medicamentos</div>
          <div className="mt-1 text-sm text-text-2">
            Lista, refills y alertas
          </div>
        </Link>

        <Link
          href="/app/citas"
          className="block rounded-xl border border-border bg-bg p-5 transition-colors hover:bg-bg-2"
        >
          <div className="text-base font-medium">Citas médicas</div>
          <div className="mt-1 text-sm text-text-2">
            Historial y próxima cita
          </div>
        </Link>

        <Link
          href="/app/referencias"
          className="block rounded-xl border border-border bg-bg p-5 transition-colors hover:bg-bg-2"
        >
          <div className="text-base font-medium">Referencias de pago</div>
          <div className="mt-1 text-sm text-text-2">
            Datos de servicios y gastos fijos
          </div>
        </Link>

        <Link
          href="/app/finanzas"
          className="block rounded-xl border border-border bg-bg p-5 transition-colors hover:bg-bg-2"
        >
          <div className="text-base font-medium">Finanzas mensuales</div>
          <div className="mt-1 text-sm text-text-2">
            Pensión, gastos y reconciliación bancaria
          </div>
        </Link>
      </div>
    </div>
  );
}
