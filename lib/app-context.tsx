"use client";
import { createContext, ReactNode, useContext } from "react";
import type { Id } from "@/convex/_generated/dataModel";

export type OtherCaregiver = {
  id: Id<"caregivers">;
  name: string;
};

export type PatientCaregiver = {
  id: Id<"caregivers">;
  name: string;
};

export type AppContextValue = {
  caregiverId: Id<"caregivers">;
  caregiverName: string;
  patientId: Id<"patients">;
  patientName: string;
  patientInitials: string;
  otherCaregivers: OtherCaregiver[];
  patientCaregiver: PatientCaregiver | null;
};

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({
  value,
  children,
}: {
  value: AppContextValue;
  children: ReactNode;
}) {
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useAppContext fuera de AppProvider");
  return ctx;
}
