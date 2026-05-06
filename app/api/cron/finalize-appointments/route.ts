import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isCronAuthorized } from "@/lib/cron/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Cron · every 15 min
 *
 * Flips `confirmed` → `completed` for any appointment whose `slot_end`
 * is more than 4 hours in the past. The 4-hour buffer absorbs
 * minor schedule overrun and gives clinics time to mark `no_show`
 * manually before we lock the record into `completed`.
 *
 * Idempotent — re-running the same minute does nothing because the
 * filter already excludes `completed` rows.
 */
export async function GET(req: Request) {
  if (!isCronAuthorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const cutoff = new Date(Date.now() - 4 * 3600_000).toISOString();
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("appointments")
    .update({ status: "completed" } as never)
    .lt("slot_end", cutoff)
    .eq("status", "confirmed")
    .select("id");

  if (error) {
    console.error("[cron/finalize] update failed:", error);
    return NextResponse.json(
      { error: "server_error", message: error.message },
      { status: 500 }
    );
  }

  const updated = data?.length ?? 0;
  console.log(`[cron/finalize] flipped ${updated} appointment(s) to completed`);
  return NextResponse.json({ ok: true, updated });
}
