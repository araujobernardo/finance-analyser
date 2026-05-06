import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

const client = postgres(process.env.DATABASE_URL!, { max: 1 });
const db = drizzle(client);

console.log("Applying migrations...");
await migrate(db, { migrationsFolder: "./src/db/migrations" });
console.log("Done.");
await client.end();
