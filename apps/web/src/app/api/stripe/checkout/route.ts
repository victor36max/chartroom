import Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!);
}

const ALLOWED_AMOUNTS = [500, 1000, 2500]; // cents

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { amount?: unknown };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const amount = typeof body.amount === "number" ? body.amount : NaN;

  if (!ALLOWED_AMOUNTS.includes(amount)) {
    return Response.json({ error: "Invalid amount" }, { status: 400 });
  }

  try {
    const session = await getStripe().checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: { name: `Chartroom Credits — $${amount / 100}` },
            unit_amount: amount,
          },
          quantity: 1,
        },
      ],
      metadata: {
        user_id: user.id,
        amount_usd: String(amount / 100),
      },
      success_url: `${req.headers.get("origin") ?? process.env.NEXT_PUBLIC_SITE_URL}/?topup=success`,
      cancel_url: `${req.headers.get("origin") ?? process.env.NEXT_PUBLIC_SITE_URL}/?topup=cancelled`,
    });

    return Response.json({ url: session.url });
  } catch (err) {
    console.error("Stripe checkout session creation failed:", err);
    return Response.json({ error: "Failed to create checkout session" }, { status: 500 });
  }
}
