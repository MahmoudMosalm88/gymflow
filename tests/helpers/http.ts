import { NextRequest } from "next/server";

type NextRequestLikeInit = Omit<RequestInit, "signal"> & {
  signal?: AbortSignal;
};

export function createJsonRequest(
  path: string,
  body?: unknown,
  init: Omit<RequestInit, "body"> & { body?: BodyInit | null } = {}
) {
  const { signal, ...restInit } = init;
  const headers = new Headers(init.headers);
  const hasJsonBody = body !== undefined;

  if (hasJsonBody && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }

  const requestInit: NextRequestLikeInit = {
    ...restInit,
    headers,
    method: init.method || (hasJsonBody ? "POST" : "GET"),
    body: hasJsonBody ? JSON.stringify(body) : init.body,
    ...(signal ? { signal } : {}),
  };

  return new NextRequest(`http://localhost${path}`, requestInit);
}

export async function readJson<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}
