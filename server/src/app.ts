import path from "path";
import { fileURLToPath } from "url";
import express, { type Express } from "express";
import cors from "cors";
import morgan from "morgan";
import { env } from "./config/env.js";
import { errorHandler } from "./middleware/errorHandler.js";
import routes from "./routes/index.js";

const app: Express = express();

const allowedOrigins = [
  ...env.CORS_ORIGIN.split(",").map((o) => o.trim()),
  // Capacitor dev: Android emulator reaches host via 10.0.2.2
  "http://10.0.2.2:5173",
  // Capacitor native shells
  "capacitor://localhost",
  "http://localhost",
];
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (native apps, server-to-server, curl)
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS not allowed for origin: ${origin}`));
      }
    },
    credentials: true,
  }),
);
app.use(express.json());
app.use(morgan("dev"));

app.use("/api", routes);

app.use(errorHandler);

// In production, serve the client build
if (process.env.NODE_ENV === "production") {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const clientDist = path.join(__dirname, "../../client/dist");
  app.use(express.static(clientDist));
  app.get("*", (_req, res) => {
    res.sendFile(path.join(clientDist, "index.html"));
  });
}

export default app;
