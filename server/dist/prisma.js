"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
const dotenv_1 = require("dotenv");
const client_1 = require("@prisma/client");
(0, dotenv_1.config)({ path: ["../.env.local", "../.env", ".env"] });
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
    throw new Error("DATABASE_URL is required.");
}
exports.prisma = new client_1.PrismaClient();
