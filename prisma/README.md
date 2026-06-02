# Prisma database setup

This project uses Prisma ORM with PostgreSQL for the "Центр Отопления" catalog and leads database.

## 1. Configure PostgreSQL

Create a local `.env` file from the example:

```bash
cp .env.example .env
```

Update `DATABASE_URL` if your PostgreSQL user, password, host, port, or database name differs:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/heatflow?schema=public"
```

## 2. Generate Prisma Client

```bash
npm run db:generate
```

## 3. Create and apply the initial migration

```bash
npm run db:migrate -- --name init
```

This creates a migration under `prisma/migrations` and applies it to the configured PostgreSQL database.

## 4. Seed initial categories

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

Start the Express API server:

```bash
npm run api:dev
```

Create a lead:

```bash
curl -X POST http://localhost:5000/api/leads \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Азамат",
    "phone": "+996700123456",
    "projectDetails": "Нужен расчет котла для дома 120 м2",
    "type": "callback"
  }'
```

Accepted lead types are `callback` and `calculator`. Phone numbers are normalized to Kyrgyz E.164 format, for example `+996700123456`.
