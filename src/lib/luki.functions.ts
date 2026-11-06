import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const SYSTEM = `You are Luki, a warm, cheerful personal AI assistant (like Alexa) inside a habit & manifestation app.
You help the user plan their day, stay focused while studying, build habits, reflect and manifest dreams. Be concise, kind and practical. Use markdown.
You can manage the user's task list. To add a task, include a line exactly: [[ADD: task title @ HH:MM]] (time optional). To remove: [[REMOVE: task title]]. To mark done: [[DONE: task title]]. Only use these when the user asks or agrees.`;

const ChatInput = z.object({
  messages: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(4000) })).max(60),
  context: z.string().max(4000),
});

export const askLuki = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => ChatInput.parse(d))
  .handler(async ({ data }) => {
    const { generateResponse, GatewayError } = await import("@lovable.dev/ai-gateway");
    try {
      const res = await generateResponse({
        model: "openai/gpt-6-astra",
        instructions: `${SYSTEM}\n\nCurrent app context:\n${data.context}`,
        input: data.messages.map((m) => ({ role: m.role, content: m.content })),
      });
      let text = "";
      for (const item of res.output ?? []) {
        if (item.type === "message") for (const c of item.content) if (c.type === "output_text") text += c.text;
      }
      return { text: text || "Hmm, I couldn't think of a reply. Try again?" };
    } catch (e) {
      if (e instanceof GatewayError) return { text: `Luki is having trouble right now (${e.code}). Please try again shortly.` };
      throw e;
    }
  });

const GATEWAY = "https://connector-gateway.lovable.dev/twilio";
const Contact = z.object({
  kind: z.enum(["sms", "call"]),
  to: z.string().regex(/^\+[1-9]\d{6,14}$/, "Use international format like +919876543210"),
  message: z.string().min(1).max(1200),
});

export const contactUser = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => Contact.parse(d))
  .handler(async ({ data }) => {
    const key = process.env['LOVABLE_API_KEY'];
    const tw = process.env['TWILIO_API_KEY'];
    const from = process.env['TWILIO_FROM_NUMBER'];
    if (!key || !tw) return { ok: false, error: "Phone service isn't connected yet." };
    if (!from) return { ok: false, error: "Luki's sending phone number isn't set yet." };
    const body = new URLSearchParams({ To: data.to, From: from });
    let path = "/Messages.json";
    if (data.kind === "sms") body.set("Body", data.message);
    else {
      path = "/Calls.json";
      const safe = data.message.replace(/[<>&]/g, " ");
      body.set("Twiml", `<Response><Say voice="Polly.Joanna">${safe}</Say></Response>`);
    }
    const r = await fetch(`${GATEWAY}${path}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "X-Connection-Api-Key": tw, "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    if (!r.ok) { const t = await r.text(); console.error("Twilio", r.status, t); return { ok: false, error: `Phone service error (${r.status})` }; }
    return { ok: true };
  });
