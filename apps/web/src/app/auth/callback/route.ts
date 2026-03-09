import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { upsertProfile } from "@/lib/db/queries";

const FREE_CREDITS_USD = parseFloat(process.env.FREE_CREDITS_USD ?? "1.00");

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createClient();

    const { error, data: { session } } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && session) {
      const user = session.user;

      await upsertProfile({
        id: user.id,
        email: user.email,
        displayName:
          user.user_metadata.full_name ?? user.user_metadata.name ?? null,
        avatarUrl: user.user_metadata.avatar_url ?? null,
        freeCredits: FREE_CREDITS_USD,
      });

      return NextResponse.redirect(origin);
    }
  }

  return NextResponse.redirect(`${origin}?error=auth`);
}
