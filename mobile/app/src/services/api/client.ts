import { apiConfig } from "../../config/api";

type RequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  token?: string;
  body?: unknown;
  isMultipart?: boolean;
};

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

function extractErrorMessage(payload: unknown): string {
  if (typeof payload === "string" && payload.trim()) {
    return payload;
  }

  if (!payload || typeof payload !== "object") {
    return "Request failed.";
  }

  const record = payload as Record<string, unknown>;

  if (typeof record.detail === "string" && record.detail.trim()) {
    return record.detail;
  }

  if (Array.isArray(record.non_field_errors) && typeof record.non_field_errors[0] === "string") {
    return record.non_field_errors[0];
  }

  for (const [field, value] of Object.entries(record)) {
    if (Array.isArray(value) && typeof value[0] === "string") {
      return formatFieldError(field, value[0]);
    }
    if (typeof value === "string" && value.trim()) {
      return formatFieldError(field, value);
    }
  }

  if (typeof record.message === "string" && record.message.trim()) {
    return record.message;
  }

  return "Request failed.";
}

function formatFieldError(field: string, message: string): string {
  const label = field
    .replaceAll("_", " ")
    .replace(/\bid\b/gi, "ID")
    .replace(/\b\w/g, (character) => character.toUpperCase());

  if (message === "This field is required.") {
    return `${label} is required.`;
  }

  return `${label}: ${message}`;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {
    ...(options.token ? { Authorization: `Token ${options.token}` } : {}),
  };

  if (!options.isMultipart) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(`${apiConfig.baseUrl}${path}`, {
    method: options.method ?? "GET",
    headers,
    ...(options.body
      ? {
          body: options.isMultipart ? (options.body as FormData) : JSON.stringify(options.body),
        }
      : {}),
  });

  const isJson = response.headers.get("content-type")?.includes("application/json");
  const payload = isJson ? await response.json() : null;

  if (!response.ok) {
    const message = extractErrorMessage(payload);
    throw new ApiError(message, response.status);
  }

  return payload as T;
}
