import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import {
  ExpressAdapter,
  type NestExpressApplication,
} from "@nestjs/platform-express";
import express, { type Express } from "express";
import helmet from "helmet";
import { join } from "node:path";
import {
  AppModule,
  createAppModule,
  type AppDependencies,
} from "./app.module.js";
import { createMutationRateLimit } from "./common/rate-limit.middleware.js";
import { requestIdMiddleware } from "./common/request-id.middleware.js";
import { ApiExceptionFilter } from "./filters/api-exception.filter.js";
import { loadAppConfig } from "./config/app-config.js";

export type Dependencies = AppDependencies;

export async function createNestApp(
  deps: Dependencies = {},
  server: Express = express(),
): Promise<NestExpressApplication> {
  const config = deps.config ?? loadAppConfig();
  server.disable("x-powered-by");
  server.use(requestIdMiddleware);
  server.use(helmet({ contentSecurityPolicy: false }));
  server.use(createMutationRateLimit(config));
  server.use(
    express.static(join(process.cwd(), "public"), { index: "index.html" }),
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
