# Stripe Integration Notes

## Webhook Idempotency

It is crucial to make webhook handlers idempotent. Due to the nature of network communication, it's possible for your endpoint to receive the same webhook event multiple times. If your event processing is not idempotent, this could lead to duplicate actions, such as charging a customer twice or sending multiple subscription confirmation emails.

A common strategy to ensure idempotency is to record the `Stripe-Event-Id` of each incoming event. When a new event arrives, you first check if you have already processed an event with the same ID. If so, you can safely ignore it.

Alternatively, you can design your database operations to be inherently idempotent. For example, when handling a `customer.subscription.deleted` event, you could use a query like `UPDATE subscriptions SET status = 'canceled' WHERE stripe_subscription_id = ? AND status != 'canceled'`. This ensures that even if the event is processed multiple times, the status is only set to 'canceled' once.

## Webhook Replay

Stripe provides the ability to replay webhooks, which is an invaluable tool for testing and debugging. You can replay a specific event from the Stripe Dashboard, or use the Stripe CLI to resend events to your local development environment.

To replay a webhook from the dashboard:
1. Navigate to the "Events" page for a specific customer or subscription.
2. Find the event you want to replay.
3. Click the "..." menu and select "Resend webhook".

To replay a webhook using the Stripe CLI, you can use the `stripe events resend` command:

```bash
stripe events resend evt_xxxxxxxxxxxxxx
```

This allows you to test your webhook handling logic without having to repeatedly trigger the actions that generate the events (e.g., making payments).