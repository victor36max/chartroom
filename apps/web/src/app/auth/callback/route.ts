import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { upsertProfile } from "@/lib/db/queries";

const FREE_CREDITS_USD = parseFloat(process.env.FREE_CREDITS_USD ?? "1.00");

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    try {
    const { error, data: { session } } = await supabase.auth.exchangeCodeForSession(code);
    console.log("session", session); 
    console.log("error", error);
    console.log("code", code);

    if (!error && session) {
      const user = session.user;

      console.log("user", user);



      try {
      await upsertProfile({
        id: user.id,
        email: user.email,
        displayName:
          user.user_metadata.full_name ?? user.user_metadata.name ?? null,
        avatarUrl: user.user_metadata.avatar_url ?? null,
        freeCredits: FREE_CREDITS_USD,
      });
      } catch (error) {
        console.error("Error upserting profile:", error);
        return NextResponse.redirect(`${origin}?error=auth`);
      }
        return NextResponse.redirect(origin);
      }
    } catch (error) {
      console.error("Error exchanging code for session:", error);
      return NextResponse.redirect(`${origin}?error=auth`);
    }
  }

  return NextResponse.redirect(`${origin}?error=auth`);
}
