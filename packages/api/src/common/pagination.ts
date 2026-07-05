import { BadRequestException } from "@nestjs/common";

/**
 * Pagination query params accepted by list endpoints.
 */
export type PaginationQuery = {
  limit?: unknown;
  offset?: unknown;
};

/**
 * Page metadata returned in list responses alongside `data`.
 */
export type PageMeta = {
  limit: number;
  offset: number;
  nextOffset?: number;
};

/**
 * Parsed, validated pagination parameters.
 */
export type PaginationParams = {
  limit: number;
  offset: number;
};

/**
 * Default and max limits per resource type.
 */
const LIMITS = {
  jobs: { default: 100, max: 500 },
  audit: { default: 100, max: 500 },
  metrics: { default: 100, max: 500 },
} as const;

export type ResourceType = keyof typeof LIMITS;

/**
 * Parse and validate pagination query parameters.
 *
 * Rejects:
 *  - zero / negative limit
 *  - negative offset
 *  - non-integer / float values
 *  - array / multiple values
 *  - limit above the resource max
 *
 * Returns safe defaults when params are omitted.
 */
export function parsePagination(
  query: PaginationQuery,
  resource: ResourceType,
): PaginationParams {
  const cfg = LIMITS[resource];

  const limit = parseIntegerParam(query.limit, "limit") ?? cfg.default;
  if (limit <= 0) {
    throw new BadRequestException("limit must be a positive integer");
  }
  if (limit > cfg.max) {
    throw new BadRequestException(
      `limit must not exceed ${cfg.max} for ${resource}`,
    );
  }

  const offset = parseIntegerParam(query.offset, "offset") ?? 0;
  if (offset < 0) {
    throw new BadRequestException("offset must be a non-negative integer");
  }

  return { limit, offset };
}

/**
 * Build the `page` metadata object for a response.
 */
export function buildPageMeta(
  { limit, offset }: PaginationParams,
  dataLength: number,
): PageMeta {
  const meta: PageMeta = { limit, offset };
  if (dataLength === limit) {
    meta.nextOffset = offset + limit;
  }
  return meta;
}

function parseIntegerParam(
  value: unknown,
  name: string,
): number | undefined {
  if (value === undefined) return undefined;

  // Reject arrays / multiple values
  if (Array.isArray(value)) {
    throw new BadRequestException(`${name} must not be an array`);
  }

  if (typeof value !== "string") {
    throw new BadRequestException(`${name} must be an integer`);
  }

  const str = value.trim();
  if (str === "") {
    throw new BadRequestException(`${name} must be an integer`);
  }

  // Reject floats
  if (!/^-?\d+$/.test(str)) {
    throw new BadRequestException(`${name} must be an integer`);
  }

  const num = Number(str);

  if (!Number.isSafeInteger(num)) {
    throw new BadRequestException(`${name} must be a safe integer`);
  }

  return num;
}
