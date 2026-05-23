export default async function EntrarPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  return (
    <div className="mx-auto w-full max-w-[720px] px-4 py-10">
      <div className="rounded-xl border border-border bg-bg p-6">
        <div className="text-lg font-medium">Validando invitación</div>
        <div className="mt-2 text-sm text-text-2">
          Token recibido. La validación se conectará en la próxima fase.
        </div>
        <div className="mt-4 inline-block rounded-md bg-bg-2 px-2 py-1 font-mono text-xs text-text-2">
          {token}
        </div>
      </div>
    </div>
  );
}
