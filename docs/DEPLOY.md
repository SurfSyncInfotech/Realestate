# Deploying Estate & Co.

One Node server runs everything: the API **and** the built website, on one
domain. You need Node 20+, MySQL 8 and (recommended) HTTPS in front of it.

## 1. Prepare the server

```bash
git clone <your repo> estate && cd estate
npm install
```

## 2. Database

Create the database and a dedicated user (replace the password), then load the
schema and starter data. Either use the one-command helper on the server:

```bash
npm run db:setup          # asks for the MySQL root password once
```

or do it by hand:

```bash
mysql -u root -p < database/realestate.sql     # schema + 15 starter properties
```

then create `database/.env`:

```env
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=realestate_app
DB_PASSWORD=<strong password>
DB_NAME=realestate_dev
```

Create your own administrator (use real addresses, then change the passwords):

```bash
ADMIN_EMAIL=you@yourcompany.com npm run db:accounts
```

Passwords are written to `database/.local-credentials.txt`. Keep that file
private and delete it after you have saved the passwords. Remove the sample
agent and customer accounts if you do not want them.

## 3. Backend settings

Create `backend/.env` (see `backend/.env.example`):

```env
NODE_ENV=production
PORT=4000
CORS_ORIGIN=https://your-domain.com
APP_URL=https://your-domain.com

# Optional: email replies to customers
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=you@gmail.com
SMTP_PASSWORD=<app password>
MAIL_FROM="Estate & Co. <you@gmail.com>"
```

With `NODE_ENV=production` the sign-in cookie is HTTPS-only, the server trusts
one proxy hop (nginx, Render, Railway…) and serves `frontend/dist`.

## 4. Business details

Edit `frontend/src/data/site.js` (phone, WhatsApp, address, hours) before
building. Empty fields are hidden.

## 5. Build and start

```bash
npm run build                 # builds the website into frontend/dist
npm run start:prod            # starts the server on PORT
```

Keep it running with a process manager, for example:

```bash
npm install -g pm2
pm2 start "npm run start:prod" --name estate
pm2 save && pm2 startup
```

Put nginx, Caddy or your host's HTTPS in front of port 4000. Example nginx:

```nginx
server {
  server_name your-domain.com;
  client_max_body_size 50m;          # agents upload up to 8 photos of 6 MB
  location / { proxy_pass http://127.0.0.1:4000; proxy_set_header Host $host;
               proxy_set_header X-Forwarded-For $remote_addr;
               proxy_set_header X-Forwarded-Proto $scheme; }
}
```

## 6. What to back up

- the MySQL database (`mysqldump realestate_dev > backup.sql`)
- `backend/uploads/` (photos agents uploaded)

## 7. Before you go live — checklist

- [ ] Real administrator created; sample accounts removed or passwords changed
- [ ] `backend/.env` has `NODE_ENV=production` and your real `CORS_ORIGIN`
- [ ] HTTPS enabled
- [ ] `frontend/src/data/site.js` has real contact details
- [ ] The 15 starter properties are replaced by real ones (or archived from the
      admin panel under *Listings*)
- [ ] SMTP set up if you want replies emailed
- [ ] Database and `backend/uploads/` backups scheduled

## Not included yet

Online payments and subscription plans, and OTP sign-in.

## Password reset

Users click **Forgot your password?** on any sign-in page. They get an emailed
link (valid 1 hour, works once, signs them out everywhere). This needs SMTP
(step 3). Without email, or if an admin is locked out, reset by hand:

```bash
npm run db:reset-password -- someone@example.com
```

The new random password is appended to `database/.local-credentials.txt`.
