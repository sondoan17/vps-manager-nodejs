import {
  Catch,
  HttpException,
  type ArgumentsHost,
  type ExceptionFilter,
} from "@nestjs/common";
import type { Request, Response } from "express";
import { ZodError } from "zod";
import {
  AgentAuthError,
  DemoMutationBlockedError,
  DemoSshDisabledError,
  DuplicateAgentInstallError,
  SshHostBlockedError,
  SshOperationError,
  VpsNotFoundError,
} from "../errors.js";
import { safeErrorMessage } from "../redaction.js";

function errorBody(message: string, _requestId?: string) {
  return { error: { message } };
}

export class ApiExceptionFilter implements ExceptionFilter {
  catch(error: unknown, host: ArgumentsHost) {
    const request = host.switchToHttp().getRequest<Request>();
    const response = host.switchToHttp().getResponse<Response>();
    const requestId = request.requestId;

    if (error instanceof ZodError) {
      return response.status(400).json(errorBody("Invalid request", requestId));
    }

    if (error instanceof VpsNotFoundError) {
      return response.status(404).json(errorBody("VPS not found", requestId));
    }

    if (
      error instanceof DemoMutationBlockedError ||
      error instanceof DemoSshDisabledError ||
      error instanceof SshHostBlockedError
    ) {
      return response
        .status(403)
        .json(errorBody(safeErrorMessage(error), requestId));
    }

    if (error instanceof SshOperationError) {
      return response
        .status(502)
        .json(errorBody(safeErrorMessage(error), requestId));
    }

    if (error instanceof AgentAuthError) {
      return response
        .status(401)
        .json(errorBody(safeErrorMessage(error), requestId));
    }

    if (error instanceof DuplicateAgentInstallError) {
      return response
        .status(409)
        .json(errorBody(safeErrorMessage(error), requestId));
    }

    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return response
        .status(404)
        .json(errorBody("Required resource not found", requestId));
    }

    if (error instanceof HttpException) {
      const payload = error.getResponse();
      const message =
        typeof payload === "object" && payload && "error" in payload
          ? (payload as { error?: { message?: unknown } }).error?.message
          : typeof payload === "object" && payload && "message" in payload
            ? (payload as { message?: unknown }).message
            : error.message;
      return response
        .status(error.getStatus())
        .json(
          errorBody(
            typeof message === "string"
              ? safeErrorMessage(message)
              : "Request failed",
            requestId,
          ),
        );
    }

    return response
      .status(500)
      .json(errorBody("Internal server error", requestId));
  }
}

Catch()(ApiExceptionFilter);
