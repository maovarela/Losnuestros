"use client";
import { createContext, ReactNode, useContext, useRef } from "react";

type DropContextValue = {
  setPendingFile: (file: File | null) => void;
  consumePendingFile: () => File | null;
};

const DropContext = createContext<DropContextValue | null>(null);

export function DropProvider({ children }: { children: ReactNode }) {
  const ref = useRef<File | null>(null);

  return (
    <DropContext.Provider
      value={{
        setPendingFile: (file) => {
          ref.current = file;
        },
        consumePendingFile: () => {
          const file = ref.current;
          ref.current = null;
          return file;
        },
      }}
    >
      {children}
    </DropContext.Provider>
  );
}

export function useDropContext(): DropContextValue {
  const ctx = useContext(DropContext);
  if (!ctx) throw new Error("useDropContext fuera de DropProvider");
  return ctx;
}
