import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI, Type } from "@google/genai";
import { getSession } from "@/lib/session-server";

export const runtime = "nodejs";

const SYSTEM_PROMPT = `Eres un asistente que extrae información estructurada de fotos y mensajes para una app que gestiona el cuidado de Ana María Ortega Salcedo (84 años, vive en Bogotá, tiene Alzheimer). Sus dos cuidadoras (Ingrid y Sandra) suben recetarios, mensajes con citas o recibos de pago.

Extraes una de estas tres categorías:

1. medication — recetario médico
   - name: nombre completo del medicamento con dosis (ej "Atorvastatina 40mg tableta recubierta")
   - dosage: intervalo y vía (ej "1 tableta cada 24 horas · vía oral")
   - doctor: médico que prescribe + especialidad (ej "Dr. Bastidas Mejía, Medicina Familiar · Compensar")
   - last_refill: fecha en la que se hizo el último refill, formato YYYY-MM-DD (usualmente la fecha del recetario)
   - next_refill: fecha estimada del próximo refill, formato YYYY-MM-DD. Calcula sumando "tiempo de tratamiento" en días al last_refill. Si dice "175 días", suma 175.
   - notes: notas adicionales (ej "Indicación: eutirox") si aparecen

2. appointment — cita médica (texto o foto)
   - date: fecha de la cita, formato YYYY-MM-DD. Si dice "martes 26 de mayo" interpretá año actual (HOY).
   - doctor: especialidad y/o médico (ej "Reumatología", "Neurología · Dra. Medina")
   - location: lugar y hora juntos (ej "Sede 98 con 11 · 11:00 AM", "Piso 11 Consultorio 22 · 10:30 AM")
   - reason: motivo si se menciona
   - notes: extras

3. payment — recibo de pago de un servicio
   - service: uno de [compensar, enel, gas, agua, internet, celular, alarma]
   - amount: monto en pesos colombianos, solo dígitos sin separador
   - month: mes del pago, formato YYYY-MM

Reglas:
- Las fechas SIEMPRE YYYY-MM-DD, los meses YYYY-MM. Hoy es ${new Date().toISOString().slice(0, 10)}.
- Los montos en pesos SIN separadores ni símbolos.
- Si no estás seguro de un campo, OMITILO. No inventes.
- Si la entrada tiene varios items (ej un recetario con 3 medicamentos, o un mensaje con 3 citas), devuelve un array con todos.
- Si no puedes extraer nada con confianza, devuelve un array vacío [].`;

const responseSchema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      type: {
        type: Type.STRING,
        enum: ["medication", "appointment", "payment"],
      },
      name: { type: Type.STRING },
      dosage: { type: Type.STRING },
      doctor: { type: Type.STRING },
      last_refill: { type: Type.STRING },
      next_refill: { type: Type.STRING },
      notes: { type: Type.STRING },
      date: { type: Type.STRING },
      location: { type: Type.STRING },
      reason: { type: Type.STRING },
      service: { type: Type.STRING },
      amount: { type: Type.NUMBER },
      month: { type: Type.STRING },
    },
    required: ["type"],
  },
};

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      {
        error: "no_api_key",
        message: "Falta configurar GEMINI_API_KEY en el servidor",
      },
      { status: 503 },
    );
  }

  const form = await req.formData();
  const text = (form.get("text") as string | null)?.trim() ?? "";
  const file = form.get("file") as File | null;

  if (!text && !file) {
    return NextResponse.json(
      { error: "empty", message: "Falta texto o archivo para analizar" },
      { status: 400 },
    );
  }

  const parts: Array<{ text: string } | { inlineData: { data: string; mimeType: string } }> =
    [];
  if (text) {
    parts.push({ text });
  }
  if (file) {
    const bytes = await file.arrayBuffer();
    const base64 = Buffer.from(bytes).toString("base64");
    parts.push({
      inlineData: {
        data: base64,
        mimeType: file.type || "image/jpeg",
      },
    });
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const result = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: [{ role: "user", parts }],
      config: {
        systemInstruction: SYSTEM_PROMPT,
        responseMimeType: "application/json",
        responseSchema,
        temperature: 0.1,
      },
    });

    const raw = result.text ?? "[]";
    let proposals: unknown;
    try {
      proposals = JSON.parse(raw);
    } catch {
      return NextResponse.json(
        {
          error: "parse_failed",
          message:
            "El modelo no devolvió JSON válido. Edita los campos a mano abajo o ingresa los datos directamente en la pestaña correspondiente.",
          raw,
          proposals: [],
        },
        { status: 200 },
      );
    }

    return NextResponse.json({ proposals });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown error";
    return NextResponse.json(
      {
        error: "api_failed",
        message: `Gemini falló: ${message}. Puedes ingresar los datos a mano en la pestaña correspondiente.`,
        proposals: [],
      },
      { status: 200 },
    );
  }
}
