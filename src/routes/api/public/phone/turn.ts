import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

// Twilio calls this after each thing the user says on a "Ring my phone" call.
// Public by necessity; each call has its own secret token, checked before anything is read or changed.
const Query = z.object({
  call: z.string().uuid(),
  t: z.string().regex(/^[0-9a-f]{48}$/),
  quiet: z.enum(["1"]).optional(),
});

const xml = (body: string) => new Response(body, { headers: { "content-type": "text/xml; charset=utf-8" } });

export const Route = createFileRoute("/api/public/phone/turn")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const ph = await import("@/lib/phone.server");
        const url = new URL(request.url);
        const q = Query.safeParse(Object.fromEntries(url.searchParams));
        if (!q.success) return new Response("Bad request", { status: 400 });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: call } = await supabaseAdmin.from("phone_calls").select("*").eq("id", q.data.call).maybeSingle();
        if (!call || !ph.safeEqual(call.token, q.data.t)) return new Response("Not found", { status: 404 });
        const ageMin = (Date.now() - new Date(call.created_at).getTime()) / 60000;
        const turns = (Array.isArray(call.turns) ? call.turns : []) as Array<ph.Turn & { localTime?: string }>;
        if (call.status !== "active" || ageMin > ph.CALL_MAX_MINUTES + 2 || turns.length > ph.CALL_MAX_TURNS * 2) {
          return xml(ph.goodbyeTwiml("This call has ended. Talk soon!"));
        }

        const form = await request.formData().catch(() => null);
        const speech = String(form?.get("SpeechResult") ?? "").trim().slice(0, 1000);
        const base = `${url.origin}${url.pathname}?call=${call.id}&t=${call.token}`;

        if (!speech) {
          if (q.data.quiet) {
            await supabaseAdmin.from("phone_calls").update({ status: "ended" }).eq("id", call.id);
            return xml(ph.goodbyeTwiml("I'll let you go now. Have a lovely day!"));
          }
          return xml(ph.listenTwiml("Are you still there? Tell me what you'd like to plan.", `${base}&quiet=1`));
        }

        const { data: profile } = await supabaseAdmin.from("profiles").select("name").eq("id", call.user_id).maybeSingle();
        const localTime = turns[0]?.localTime ?? new Date().toUTCString();
        const history: ph.Turn[] = [...turns.map(({ role, content }) => ({ role, content })), { role: "user", content: speech }];
        let reply: { text: string; end: boolean };
        try {
          reply = await ph.phoneReply({ db: supabaseAdmin, userId: call.user_id, name: profile?.name ?? "", today: call.today, localTime }, history);
        } catch (e) {
          console.error("Phone turn failed", e);
          reply = { text: "Sorry, my brain hiccupped. Could you say that again?", end: false };
        }
        await supabaseAdmin.from("phone_calls").update({
          turns: [...turns, { role: "user", content: speech }, { role: "assistant", content: reply.text }],
          ...(reply.end ? { status: "ended" } : {}),
        }).eq("id", call.id);
        return xml(reply.end ? ph.goodbyeTwiml(reply.text) : ph.listenTwiml(reply.text, base));
      },
    },
  },
});
