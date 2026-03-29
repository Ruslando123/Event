"use strict";

const bcrypt = require("bcryptjs");

const pwd = process.argv.slice(2).join(" ").trim();
if (!pwd) {
  console.error("Usage: npm run studio:hash -- <your-password>");
  process.exit(1);
}
const hash = bcrypt.hashSync(pwd, 10);
console.log(hash);
console.error(
  "\nВ .env для Next.js экранируйте каждый $ как \\$ , например:\nSTUDIO_PASSWORD_HASH=\"" +
    hash.replace(/\$/g, "\\$") +
    '"',
);
