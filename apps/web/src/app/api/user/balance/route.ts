import { createClient } from "@/lib/supabase/server";
import { getBalance } from "@/lib/db/queries";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const balance = await getBalance(user.id);
    return Response.json({ balance_usd: balance });
  } catch (err) {
    console.error("Failed to fetch balance:", err);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
