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
  SshHostKeyScanFailedError,
  SshHostKeyTrustRequiredError,
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

    if (error instanceof SshHostKeyScanFailedError) {
      return response
        .status(502)
        .json(errorBody(safeErrorMessage(error), requestId));
    }

    if (error instanceof SshHostKeyTrustRequiredError) {
      return response.status(409).json({
        error: {
          message: safeErrorMessage(error),
          ...error.info,
        },
      });
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
      const responseBody =
        typeof payload === "object" && payload !== null
          ? (payload as Record<string, unknown>)
          : undefined;

      // Standard NestJS HttpException responses are
      // { statusCode, message, error } where `error` is the HTTP error name
      // (a plain string). Nested payloads are { error: { message } }.
      // Prefer the nested error.message when truly nested, otherwise use the
      // top-level message string. Array messages (validation detail lists)
      // and other non-string payloads intentionally fall through to the safe
      // generic response.
      let message: unknown;
      if (responseBody) {
        if (
          typeof responseBody.error === "object" &&
          responseBody.error !== null &&
          typeof (responseBody.error as { message?: unknown }).message ===
            "string"
        ) {
          message = (responseBody.error as { message: string }).message;
        } else if (typeof responseBody.message === "string") {
          message = responseBody.message;
        }
      } else {
        message = error.message;
      }

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
