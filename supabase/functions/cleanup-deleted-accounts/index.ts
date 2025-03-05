/// <reference types="deno" />
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

export async function cleanup() {
  try {
    // Get accounts ready for deletion
    const { data: pendingDeletions, error: fetchError } = await supabaseAdmin
      .from("pending_deletions")
      .select("*")
      .eq("status", "pending")
      .lt("scheduled_deletion_at", new Date().toISOString());

    if (fetchError) throw fetchError;

    for (const deletion of pendingDeletions) {
      // Delete all user data
      await Promise.all([
        supabaseAdmin
          .from("content_board")
          .delete()
          .eq("user_id", deletion.user_id),
        supabaseAdmin.from("prompts").delete().eq("user_id", deletion.user_id),
        supabaseAdmin
          .from("subscriptions")
          .delete()
          .eq("user_id", deletion.user_id),
        supabaseAdmin.from("profiles").delete().eq("id", deletion.user_id),
      ]);

      // Delete auth user
      await supabaseAdmin.auth.admin.deleteUser(deletion.user_id);

      // Update deletion status
      await supabaseAdmin
        .from("pending_deletions")
        .update({ status: "completed" })
        .eq("id", deletion.id);
    }
  } catch (error) {
    console.error("Error in cleanup:", error);
  }
}

// Run every day
Deno.cron("cleanup-deleted-accounts", "0 0 * * *", cleanup);
