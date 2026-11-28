# Prisma database setup

This project uses Prisma ORM 6.19 with MongoDB Atlas for the "Центр Отопления" catalog and leads database.

## 1. Configure MongoDB Atlas

Set `DATABASE_URL` in the local `.env` file using the MongoDB Atlas driver URI:

```env
DATABASE_URL="mongodb+srv://<db-user>:<password>@<cluster-host>/heatflow?retryWrites=true&w=majority&appName=Cluster0"
```

Keep the URI secret and do not commit `.env`.
The admin provisioning command prompts for the rotated URI without echoing it and writes it to the ignored `.env.local` file with restrictive file permissions.

## 2. Generate Prisma Client

```bash
npm run db:generate
```

## 3. Synchronize the MongoDB schema

```bash
npm run db:push
```

MongoDB uses `prisma db push`; Prisma Migrate SQL migrations are not used.
This only prepares the MongoDB schema; existing products and leads in Appwrite are not copied automatically. Export/import that data separately before retiring Appwrite Database.
The schema includes `CalculatorEstimate` documents in `calculator_estimates`; run `npm run db:push` after pulling schema changes to create or synchronize this collection.

Calculator submissions are persisted before Telegram notification is attempted. Their calculation inputs and itemized costs are stored with the estimate, while `telegramStatus` (`PENDING`, `SENT`, or `FAILED`) and `telegramError` track notification delivery. Admins can review them at `/admin/calculator-estimates`.

## 4. Create or update the administrator

Run this in an interactive terminal. If `DATABASE_URL` is unset, it asks for the rotated Atlas URI using hidden input, then asks twice for the admin password using hidden input. The password is stored only as a bcrypt hash, and any previous admin sessions are revoked.

```bash
npm run admin:create
```

By default this creates or updates `admin@heatflow.kg`. Set `ADMIN_EMAIL` in `.env.local` first if using another email. Do not send the URI or password in chat or commit `.env.local`.

## 5. Seed initial categories

```bash
npm run db:seed
```

The seed inserts or updates:

- `Котлы` / `Казандыктар`
- `Радиаторы` / `Радиаторлор`
- `Теплый пол` / `Жылуу пол`

## Useful commands

```bash
npx prisma validate
npx prisma studio
```

## Leads API

The Next.js API writes product and lead documents to MongoDB. Start the application with:

```bash
npm run dev
```

To verify a calculator submission end to end, synchronize the schema, configure `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID`, submit a quote from `/calculator`, then confirm the record and delivery status in `/admin/calculator-estimates`. To verify persistence when Telegram is unavailable, temporarily use invalid Telegram configuration, submit again, and confirm the estimate remains listed with a failed-notification status and error.

Appwrite Auth remains responsible for `/admin` sign-in, and Appwrite Storage continues to host product images.
The standalone Express service under `server/` uses `api_*` collection names to keep its separate legacy data model isolated from the Next.js collections.
