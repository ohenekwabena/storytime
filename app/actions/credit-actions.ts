"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

/**
 * Add credits to the current user's account (for testing/development)
 */
export async function addCreditsAction(amount: number = 100) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { error: "Unauthorized" };
    }

    // Get current credits
    const { data: profile } = await supabase.from("user_profiles").select("credits").eq("user_id", user.id).single();

    if (!profile) {
      return { error: "Profile not found" };
    }

    const newCredits = profile.credits + amount;

    // Update credits
    const { error: updateError } = await supabase
      .from("user_profiles")
      .update({ credits: newCredits })
      .eq("user_id", user.id);

    if (updateError) {
      return { error: updateError.message };
    }

    revalidatePath("/protected");
    return { success: true, newCredits };
  } catch (error) {
    console.error("Error adding credits:", error);
    return { error: error instanceof Error ? error.message : "Failed to add credits" };
  }
}
