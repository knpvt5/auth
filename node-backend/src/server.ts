import dotenv from "dotenv";
dotenv.config();
import express, { Request, Response } from "express";
import cookieParser from "cookie-parser";

import cors from "cors";
import { authRouter } from "./routes/auth.route.js";

const app = express();
const port = process.env.PORT || 8000;

/* const dynamicCorsOptions = function (
  req: Request,
  callback: (err: any, options?: cors.CorsOptions) => void,
) {
  let corsOptions;
  if (req.path.startsWith("/auth/")) {
    corsOptions = {
      origin: process.env.CLIENT_URL,
      credentials: true,
    };
  } else {
    corsOptions = { origin: process.env.CLIENT_URL };
  }
  callback(null, corsOptions);
};
 */
const allowedOrigins = [process.env.CLIENT_URL as string, "http://localhost:4173"];

if (process.env.NODE_ENV === "prod") {
  allowedOrigins.push("https://auth-client-eo75.onrender.com");
}

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));

app.use("/auth", authRouter);

app.get("/", (_: Request, res: Response) => {
  res.send("Hello World!");
});

app.get("/health", (_: Request, res: Response) => {
  const health = {
    status: "OK",
    timestamp: new Date().toISOString(),
    services: {
      localDB: "connected",
    },
  };

  res.status(200).json(health);
});

app.use((req: Request, res: Response) => {
  const { method, path, originalUrl, query } = req;
  res.json({ method, path, originalUrl, query });
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
