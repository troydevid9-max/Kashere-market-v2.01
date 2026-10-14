# API reference

Base: `/api`. JSON in, JSON out. Auth is an httpOnly cookie (`kt`) set by login/signup. Every non-GET request must send the header `X-Requested-With: kashere` (the website does this automatically). Errors look like `{ "error": "message", "code": "CODE" }`.

Common codes: `AUTH` (401), `FORBIDDEN` (403), `NOT_VERIFIED` (403), `NOT_FOUND` (404), `VALIDATION` (400), `STATE` (409, wrong status for this action), `STOCK`/`GONE` (409), `INSUFFICIENT` (400), `DUPLICATE` (409).

Uploads (`multipart/form-data`): JPG/PNG/WebP, max 5MB each, checked by file signature, not just the declared type.

## Auth
| | | |
|---|---|---|
| POST | `/auth/signup` | `{name, matric, email, phone, password, accountType: student|vendor, businessName?, storeCategory?, deliveryLocation?}` |
| POST | `/auth/login` | `{identifier (matric or email), password}`. Rate limited. |
| POST | `/auth/logout` | |
| GET | `/auth/me` | `{user}` or `{user:null}` |
| PATCH | `/auth/me` | update name, phone, business fields |
| POST | `/auth/change-password` | `{current, next}` |

## Catalog
| | | |
|---|---|---|
| GET | `/categories` | with live counts |
| GET | `/products` | `?q&category&sort=new|popular|low|high&max&seller&limit&offset` → `{items,total}`. Boosted vendors first. |
| GET | `/products/:id` | `{product, reviews, similar}` |
| POST | `/products` | multipart: `images` (1-5), `title, description, price, quantity, category, condition, delivery, deliveryLocation?`. Needs verified student. |
| PATCH | `/products/:id` | owner only |
| DELETE | `/products/:id` | owner or admin (soft delete) |
| GET | `/me/products` | my listings |
| GET/PUT/DELETE | `/favorites`, `/favorites/ids`, `/favorites/:id` | saved items |
| GET | `/stores/:id` | public store page (no email/phone/matric exposed) |

## Checkout and payments
| | | |
|---|---|---|
| POST | `/checkout` | `{items:[{productId,qty}], delivery: delivery|pickup, name, phone, place?, detail?, note?}` → `{reference, amount, orders:[codes], mock, authorizationUrl?}`. Reserves stock. |
| POST | `/payments/:reference/verify` | asks Paystack and settles. Safe to call repeatedly. |
| GET | `/payments/:reference` | `{status, kind, amount, orders}` |
| POST | `/payments/:reference/mock-pay` | **dev only** (404 when a Paystack key is set) |
| POST | `/paystack/webhook` | HMAC-SHA512 signature required; `charge.success` settles the payment |

## Orders (escrow)
| | | |
|---|---|---|
| GET | `/orders?role=buyer|seller` | |
| GET | `/orders/:id` | includes `actions` the viewer may take next |
| POST | `/orders/:id/ship` · `/deliver` | seller |
| POST | `/orders/:id/confirm` | buyer, multipart `photo` (required). Releases escrow. |
| GET | `/orders/:id/receipt` | the photo (buyer, seller, admin) |
| POST | `/orders/:id/cancel` | buyer/seller, only while `paid` |
| POST | `/orders/:id/complaint` | buyer `{type, description≥15 chars}` freezes the money |
| POST | `/orders/:id/review` | buyer, after confirmed `{rating 1-5, comment?}` |
| GET | `/complaints` · `/reviews/received` | mine |

## Wallet
| | | |
|---|---|---|
| GET | `/wallet` | balance, pending escrow, month change, ledger |
| POST | `/wallet/topup` | `{amount}` → payment (same shape as checkout) |
| POST | `/wallet/send` | `{matric, amount, note?}` |
| POST | `/wallet/withdraw` | `{amount≥1000, bankName, accountNumber (10 digits), accountName}` |
| GET | `/wallet/withdrawals` | |

## Account
| | | |
|---|---|---|
| POST | `/me/verification` | multipart `idPhoto` |
| GET | `/vendor/badge` | status, price, launch-offer slots, payments |
| POST | `/vendor/badge/checkout` | → payment |
| GET | `/vendor/stats` | dashboard numbers, 7-day series, recent orders |
| GET | `/notifications` · `/notifications/count` · POST `/notifications/read` `{ids?}` | |
| GET/POST | `/conversations` · GET `/conversations/:id` · POST `/conversations/:id/messages` | messaging |

## Admin (admin accounts only)
`GET /admin/stats` · `GET /admin/users?q` · `POST /admin/users/:id/ban {banned}` · `GET /admin/verifications?status` · `GET /admin/verifications/:id/photo` · `POST /admin/verifications/:id/decision {approve, note?}` · `GET /admin/listings` · `GET /admin/complaints` · `POST /admin/complaints/:id/resolve {resolution: release|refund, note?}` · `GET /admin/withdrawals` · `POST /admin/withdrawals/:id/decision {pay, note?}` · `GET /admin/vendors`

`GET /health` → `{ok, mockPayments}`.
