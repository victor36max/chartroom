import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { upsertProfile } from "@/lib/db/queries";

const FREE_CREDITS_USD = parseFloat(process.env.FREE_CREDITS_USD ?? "1.00");

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const cookieStore = await cookies();
    const redirectTo = NextResponse.redirect(origin);

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
              redirectTo.cookies.set(name, value, options);
            });
          },
        },
      }
    );

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

      return redirectTo;
    }
  }

  return NextResponse.redirect(`${origin}?error=auth`);
}
