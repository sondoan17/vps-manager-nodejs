import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import {
  ExpressAdapter,
  type NestExpressApplication,
} from "@nestjs/platform-express";
import express, { type Express } from "express";
import helmet from "helmet";
import { join } from "node:path";
import serveStatic from "serve-static";
import {
  AppModule,
  createAppModule,
  type AppDependencies,
} from "./app.module.js";
import { createLoginRateLimit } from "./common/login-rate-limit.middleware.js";
import { createMutationRateLimit } from "./common/rate-limit.middleware.js";
import { requestIdMiddleware } from "./common/request-id.middleware.js";
import { ApiExceptionFilter } from "./common/filters/api-exception.filter.js";
import { loadAppConfig } from "./config/app-config.js";

export type Dependencies = AppDependencies;

export async function createNestApp(
  deps: Dependencies = {},
  server: Express = express(),
): Promise<NestExpressApplication> {
  const config = deps.config ?? loadAppConfig();
  server.disable("x-powered-by");
  // Express 5 uses a strict query parser by default.
  // Preserve Express 4 nested query object parsing for compatibility.
  server.set("query parser", "extended");
  // Trust reverse proxy for correct client IP when behind nginx/haproxy.
  // Set TRUST_PROXY_HOPS=N to trust the N most recent proxy hops.
  // Default 0 (no trust) is safe for direct exposure. In production behind
  // a reverse proxy, set TRUST_PROXY_HOPS=1 (or more if chained).
  if (config.trustProxyHops > 0) {
    server.set("trust proxy", config.trustProxyHops);
  }
  server.use(requestIdMiddleware);
  server.use(
    helmet({
      contentSecurityPolicy: {
        useDefaults: false,
        directives: {
          "default-src": ["'self'"],
          "script-src": ["'self'"],
          "style-src": ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
          "font-src": ["'self'", "https://fonts.gstatic.com", "data:"],
          "img-src": ["'self'", "data:"],
          "connect-src": ["'self'", "https://fonts.googleapis.com", "https://fonts.gstatic.com"],
          "object-src": ["'none'"],
          "base-uri": ["'self'"],
          "frame-ancestors": ["'none'"],
        },
      },
    }),
  );
  server.use(createMutationRateLimit(config));
  server.use(createLoginRateLimit());
  server.use(
    serveStatic(join(process.cwd(), "public"), { index: "index.html" }),
  );

  const nestApp = await NestFactory.create<NestExpressApplication>(
    createAppModule({ ...deps, config }),
    new ExpressAdapter(server),
    {
      logger: false,
    },
  );
  nestApp.useGlobalFilters(new ApiExceptionFilter());
  await nestApp.init();
  server.get(
    /^\/(overview|servers|jobs|metrics|audit|terminal|settings)$/,
    (_req, res) => {
      res.sendFile(join(process.cwd(), "public", "index.html"));
    },
  );
  return nestApp;
}

export function createApp(deps: Dependencies = {}) {
  const server = express();
  let ready = false;
  let initError: unknown;
  const init = createNestApp(deps, server)
    .then(() => {
      ready = true;
    })
    .catch((error: unknown) => {
      initError = error;
    });

  server.use(async (_req, _res, next) => {
    if (!ready && !initError) await init;
    if (initError) return next(initError);
    next();
  });

  return server;
}

export { AppModule };
