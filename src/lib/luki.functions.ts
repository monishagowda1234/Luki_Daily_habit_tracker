import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const SYSTEM = `You are Luki, a warm, cheerful personal AI assistant (like Alexa) inside a habit & manifestation app.
You help the user plan their day, stay focused while studying, build habits, reflect and manifest dreams. Be concise, kind and practical. Use markdown.
You can manage the user's task list. To add a task, include a line exactly: [[ADD: task title @ HH:MM]] (time optional). To remove: [[REMOVE: task title]]. To mark done: [[DONE: task title]]. Only use these when the user asks or agrees.`;

const ChatInput = z.object({
  messages: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(4000) })).max(60),
  context: z.string().max(4000),
});

export const askLuki = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
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
