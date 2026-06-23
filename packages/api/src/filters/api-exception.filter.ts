import { Catch, HttpException, type ArgumentsHost, type ExceptionFilter } from "@nestjs/common";
import type { Response } from "express";
import { ZodError } from "zod";
import { VpsNotFoundError } from "../errors.js";

export class ApiExceptionFilter implements ExceptionFilter {
  catch(error: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();

    if (error instanceof ZodError) {
      return response.status(400).json({ error: { message: "Invalid request" } });
    }

    if (error instanceof VpsNotFoundError) {
      return response.status(404).json({ error: { message: "VPS not found" } });
    }

    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return response.status(404).json({ error: { message: "Required resource not found" } });
    }

    if (error instanceof HttpException) {
      return response.status(error.getStatus()).json(error.getResponse());
    }

    return response.status(500).json({ error: { message: "Internal server error" } });
  }
}

Catch()(ApiExceptionFilter);
