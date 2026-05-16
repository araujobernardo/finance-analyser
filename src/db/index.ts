// Server-side only — do not import from React components or Vite browser code.
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

type Db = ReturnType<typeof drizzle<typeof schema>>;
let instance: Db | null = null;

function getInstance(): Db {
  if (!instance) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("[db] DATABASE_URL is not set");
    instance = drizzle(postgres(url), { schema });
  }
  return instance;
}

// Proxy defers postgres() call until first use, preventing module-load crashes
// when DATABASE_URL is not yet resolved at startup.
export const db = new Proxy<Db>({} as Db, {
  get(_target, prop, receiver) {
    return Reflect.get(getInstance(), prop, receiver);
  },
});
