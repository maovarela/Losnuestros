"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useDropContext } from "@/lib/drop-context";

function hasFiles(e: DragEvent): boolean {
  const types = e.dataTransfer?.types;
  if (!types) return false;
  for (let i = 0; i < types.length; i++) {
    if (types[i] === "Files") return true;
  }
  return false;
}

export function DragDropOverlay() {
  const router = useRouter();
  const { setPendingFile } = useDropContext();
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    let counter = 0;

    const onDragEnter = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      counter += 1;
      setDragging(true);
    };

    const onDragOver = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
    };

    const onDragLeave = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      counter -= 1;
      if (counter <= 0) {
        counter = 0;
        setDragging(false);
      }
    };

    const onDrop = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      counter = 0;
      setDragging(false);
      const file = e.dataTransfer?.files[0];
      if (file) {
        setPendingFile(file);
        router.push("/app/ingestar");
      }
    };

    window.addEventListener("dragenter", onDragEnter);
    window.addEventListener("dragover", onDragOver);
    window.addEventListener("dragleave", onDragLeave);
    window.addEventListener("drop", onDrop);
    return () => {
      window.removeEventListener("dragenter", onDragEnter);
      window.removeEventListener("dragover", onDragOver);
      window.removeEventListener("dragleave", onDragLeave);
      window.removeEventListener("drop", onDrop);
    };
  }, [router, setPendingFile]);

  if (!dragging) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-blue/20 p-6 backdrop-blur-sm">
      <div className="rounded-2xl border-2 border-dashed border-blue bg-bg px-8 py-10 text-center shadow-2xl">
        <div className="text-lg font-medium text-blue">
          Soltá la foto acá
        </div>
        <div className="mt-1 text-sm text-text-2">
          La app la abre en la pantalla de carga
        </div>
      </div>
    </div>
  );
}
