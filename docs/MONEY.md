# Money and escrow rules

All amounts are **whole naira** (integers). Paystack amounts are converted to kobo only at the edge.

## Order states
```
pending_payment → paid → shipped → delivered → confirmed   (seller paid)
                    │         │         │
                    │         └─────────┴──► disputed ──► confirmed (admin: pay seller)
                    │                                 └─► refunded  (admin: refund buyer)
                    └──► refunded (cancelled by buyer or seller before shipping)
pending_payment ──► cancelled (abandoned for 30 min, or buyer cancels)
```
| Action | Who | Allowed from |
|---|---|---|
| Pay | buyer | pending_payment |
| Mark shipped | seller | paid |
| Mark delivered | seller | paid, shipped |
| Confirm receipt **with photo** | buyer | paid, shipped, delivered |
| Report a problem (freezes the money) | buyer | paid, shipped, delivered |
| Cancel and refund | buyer or seller | paid (not after shipping) |
| Auto-release | system | delivered, 3 days after delivery, never if disputed |
| Resolve dispute (pay seller / refund buyer) | admin | disputed |

## Who gets what
For an order with subtotal `S` and delivery fee `D`, at commission `C%` (default 6):

- Buyer pays `S + D`.
- Commission = `round(S × C / 100)`, credited to the platform account.
- Seller payout = `S − commission + D`, credited to the seller's wallet on release.
- `commission + payout = S + D`: nothing is created or lost (there is a test for it).

Delivery fee is ₦1,000 per seller for campus delivery, free for pickup. A cart with items from two sellers becomes two orders paid with one Paystack payment.

## Stock
Stock is **reserved at checkout** and returned if the order is cancelled, refunded, or the payment is abandoned. Two buyers can never both get the last item.

## The ledger
`users.wallet_balance` is only ever changed through `server/lib/ledger.js`. Each change writes one signed row to `ledger` (with the balance after it). Debits are conditional (`balance >= amount`), so a wallet can never go negative, even with parallel requests (tested).

## Wallet
- **Top-up:** Paystack payment, credited once (replays and double webhooks are ignored).
- **Send:** student to student by matric number, atomic (both sides or neither).
- **Withdraw:** money leaves the wallet immediately and a withdrawal request goes to the admin. Admin marks it paid (after sending the bank transfer) or rejects it (money returns to the wallet). Real automatic payouts via Paystack Transfers are a later step.
- Refunds go to the buyer's **wallet**, not back to the card.

## Vendor badge
₦5,000 per 90 days. Launch offer: the first 100 vendors pay ₦3,500 once and get 30 days of free boosting (their listings sort first). Renewals add 90 days on top of remaining time.

## Verification
`REQUIRE_VERIFICATION=true` (default): students must upload a student ID and be approved by an admin before they can sell, buy, or use the wallet. ID photos are stored privately and only admins can view them.
