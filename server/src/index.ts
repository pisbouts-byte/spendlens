import app from "./app.js";
import { env } from "./config/env.js";
import { syncAllActiveItems } from "./services/plaid.service.js";

const SYNC_INTERVAL_MS = 4 * 60 * 60 * 1000; // 4 hours

app.listen(env.PORT, () => {
  console.log(`SpendLens API running on http://localhost:${env.PORT}`);

  // Auto-sync: run once on startup (after 30s delay), then every 4 hours
  setTimeout(async () => {
    try {
      console.log("[Auto-sync] Running initial sync...");
      const result = await syncAllActiveItems();
      console.log(`[Auto-sync] Done: ${result.items} items, +${result.totalAdded} added, ~${result.totalModified} modified, -${result.totalRemoved} removed, ${result.errors} errors`);
    } catch (error) {
      console.error("[Auto-sync] Failed:", error);
    }
  }, 30_000);

  setInterval(async () => {
    try {
      console.log("[Auto-sync] Running scheduled sync...");
      const result = await syncAllActiveItems();
      console.log(`[Auto-sync] Done: ${result.items} items, +${result.totalAdded} added, ~${result.totalModified} modified, -${result.totalRemoved} removed, ${result.errors} errors`);
    } catch (error) {
      console.error("[Auto-sync] Failed:", error);
    }
  }, SYNC_INTERVAL_MS);
});
