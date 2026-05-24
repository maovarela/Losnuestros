import { redirect } from "next/navigation";
import { getSession } from "@/lib/session-server";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/");
  return <>{children}</>;
}
