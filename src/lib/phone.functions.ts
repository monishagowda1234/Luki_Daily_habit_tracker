import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

const When = { today: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), localTime: z.string().max(80) };

/** The only number Luki may reach: the signed-in account's own sign-in number. */
async function ownPhone(supabase: SupabaseClient<Database>, userId: string) {
  const { data } = await supabase.from("profiles").select("name, phone").eq("id", userId).maybeSingle();
  const phone = data?.phone ?? "";
  if (!/^\+[1-9]\d{7,14}$/.test(phone)) throw new Error("Your account has no valid phone number.");
  return { phone, name: data?.name ?? "" };
}

function friendly(e: unknown) {
  return { ok: false as const, error: e instanceof Error ? e.message : "Something went wrong" };
}

export const textMe = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ message: z.string().min(1).max(1200) }).parse(d))
  .handler(async ({ data, context }) => {
    try {
      const { sendSms } = await import("./phone.server");
      const { phone } = await ownPhone(context.supabase, context.userId);
      await sendSms(phone, data.message);
      return { ok: true as const, to: phone };
    } catch (e) { return friendly(e); }
  });

export const ringMyPhone = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ mode: z.enum(["morning", "night", "plan"]), ...When }).parse(d))
  .handler(async ({ data, context }) => {
    try {
      const ph = await import("./phone.server");
      const { phone, name } = await ownPhone(context.supabase, context.userId);
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const localTime = data.localTime.replace(/[\n\r`]/g, " ");
      const opening = await ph.phoneReply(
        { db: supabaseAdmin, userId: context.userId, name, today: data.today, localTime },
        [], ph.openingFor(data.mode, name),
      );
      const bytes = crypto.getRandomValues(new Uint8Array(24));
      const token = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
      const { data: row, error } = await supabaseAdmin.from("phone_calls").insert({
        user_id: context.userId, token, kind: data.mode, today: data.today,
        turns: [{ role: "assistant", content: opening.text, localTime }],
      }).select("id").single();
      if (error || !row) throw new Error("Couldn't start the call. Please try again.");
      const action = `${ph.publicOrigin(getRequest().url)}/api/public/phone/turn?call=${row.id}&t=${token}`;
      await ph.placeCall(phone, ph.listenTwiml(opening.text, action));
      return { ok: true as const, to: phone };
    } catch (e) { return friendly(e); }
  });
