import app from "./app.js";
import { env } from "./config/env.js";
import { syncAllActiveItems } from "./services/plaid.service.js";

const SYNC_INTERVAL_MS = 4 * 60 * 60 * 1000; // 4 hours
const KEEP_ALIVE_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes

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

  // Render's free web-service tier sleeps after ~15 min of inactivity, which kills the
  // interval above and can cause Plaid webhooks to arrive too late for a cold dyno.
  // Self-pinging keeps the dyno awake so auto-sync and webhooks stay reliable.
  if (process.env.RENDER === "true") {
    setInterval(() => {
      fetch(`http://localhost:${env.PORT}/health`).catch(() => {});
    }, KEEP_ALIVE_INTERVAL_MS);
  }
});
