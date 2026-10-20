# Going live

The API serves the built website too, so you deploy **one** Node service plus a Postgres database.

## 1. Accounts you need
- **Paystack** (paystack.com): get a *test* secret key first (`sk_test_...`), switch to live after testing.
- **Postgres**: Neon or Supabase free tier works. Copy the connection string.
- **Hosting** that runs Node 20+ and supports a **persistent disk** (Render with a disk, Railway with a volume, Fly.io with a volume, or a VPS).

## 2. Environment variables
| Variable | Value |
|---|---|
| `NODE_ENV` | `production` |
| `JWT_SECRET` | long random string: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
| `DATABASE_URL` | your Postgres URL |
| `PAYSTACK_SECRET_KEY` | `sk_test_...` then `sk_live_...` |
| `APP_URL` | your public URL, e.g. `https://kashere.example.com` |
| `UPLOAD_DIR` | a path on the persistent disk, e.g. `/data/uploads` |

The server refuses to start in production without `JWT_SECRET`. Mock payments are impossible in production.

### Render product-photo storage
Uploaded photos must be stored on a persistent disk; the service's temporary filesystem can be cleared when Render restarts or redeploys it. In the Render web service settings:

1. Add a persistent disk with mount path `/data` (if your plan supports disks).
2. Set `UPLOAD_DIR` to `/data/uploads`.
3. Redeploy the service and upload a test photo, then confirm its `/uploads/...` URL still works after a restart.

Changing `UPLOAD_DIR` does not move existing files. Copy available files from the old upload directory to the disk's `public` and `private` folders, preserving filenames. If the old files are already gone, the database cannot recreate the photo bytes; affected listings need their photos uploaded again.

## 3. Build and start
```
npm install && npm run build
npm start
```
Create the first admin: `ADMIN_EMAIL=you@example.com ADMIN_PASSWORD='a-long-password' npm run create-admin`. **Do not run `npm run seed` in production** (it refuses, but don't try).

## 4. Paystack settings
- Webhook URL: `https://YOUR-DOMAIN/api/paystack/webhook`
- Callback URL is set per payment by the server (`/payment/return`).
- Test with Paystack test cards, confirm an order moves to `paid`, then switch keys.

## 5. Before real money moves (checklist)
- [ ] Test the whole journey with `sk_test_` keys, including a failed payment and an abandoned checkout.
- [ ] Put the site behind HTTPS (Render/Railway/Fly do this automatically).
- [ ] Back up the database (Neon/Supabase have point-in-time backups; turn them on).
- [ ] Decide who is the admin and who does withdrawals. Withdrawals are paid **manually** by the admin (send the bank transfer, then press "Mark paid").
- [ ] Have a real Terms of Use and Privacy Policy. The signup links currently say "coming soon". Collecting student ID photos and phone numbers falls under the Nigeria Data Protection Act, so get proper advice.
- [ ] Uploads live on disk. If you can't have a persistent disk, move `server/lib/uploads.js` to Cloudinary/S3 (it's the only file that touches storage).
- [ ] Email is not set up, so there is no "forgot password" yet. Add an email provider (Resend, Brevo...) before launch.
- [ ] Consider holding the launch to a small group first (one hostel / one faculty) and watching real orders closely.

## Known limits
- Paystack live payments and webhooks are implemented to Paystack's documented API but were tested only with simulated requests (the build environment can't reach Paystack). Test with your own test keys.
- Refunds go to the wallet, not the card.
- Single server process (jobs run in-process every minute). Fine for a campus; use a worker if you ever run several instances.
