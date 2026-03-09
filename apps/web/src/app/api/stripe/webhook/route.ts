import Stripe from "stripe";
import { processPayment } from "@/lib/db/queries";

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!);
}

export async function POST(req: Request) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    return Response.json({ error: "Missing stripe-signature header" }, { status: 400 });
  }

  const stripe = getStripe();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch {
    return Response.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.metadata?.user_id;
    const amountUsd = parseFloat(session.metadata?.amount_usd ?? "0");

    if (!userId || amountUsd <= 0) {
      console.error("Stripe webhook: missing metadata", { sessionId: session.id, userId, amountUsd });
      return Response.json({ error: "Missing payment metadata" }, { status: 400 });
    }

    try {
      await processPayment({
        userId,
        stripeSessionId: session.id,
        amountUsd,
      });
    } catch (err) {
      console.error("Stripe webhook: failed to process payment", err);
      return Response.json({ error: "Payment processing failed" }, { status: 500 });
    }
  }

  return Response.json({ received: true });
}
