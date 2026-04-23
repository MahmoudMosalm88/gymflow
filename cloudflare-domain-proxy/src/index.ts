const ORIGIN = "https://gymflow-web-app-wa77b4slkq-ew.a.run.app";
const CANONICAL_HOST = "gymflowsystem.com";
const HSTS_VALUE = "max-age=31536000; includeSubDomains; preload";

function canonicalUrl(url: URL): string {
  return `https://${CANONICAL_HOST}${url.pathname}${url.search}`;
}

function rewriteLocation(location: string, host: string): string {
  try {
    const url = new URL(location);
    if (url.host === new URL(ORIGIN).host) {
      url.protocol = "https:";
      url.host = host;
      return url.toString();
    }
    return location;
  } catch {
    return location;
  }
}

export default {
  async fetch(request: Request): Promise<Response> {
    const incoming = new URL(request.url);

    if (incoming.protocol !== "https:" || incoming.host !== CANONICAL_HOST) {
      return Response.redirect(canonicalUrl(incoming), 308);
    }

    const upstream = new URL(incoming.pathname + incoming.search, ORIGIN);

    const headers = new Headers(request.headers);
    headers.set("host", new URL(ORIGIN).host);
    headers.set("x-forwarded-host", CANONICAL_HOST);
    headers.set("x-forwarded-proto", "https");

    const init: RequestInit = {
      method: request.method,
      headers,
      redirect: "manual"
    };

    if (request.method !== "GET" && request.method !== "HEAD") {
      init.body = request.body;
    }

    const response = await fetch(upstream.toString(), init);
    const responseHeaders = new Headers(response.headers);

    const location = responseHeaders.get("location");
    if (location) {
      responseHeaders.set("location", rewriteLocation(location, CANONICAL_HOST));
    }
    responseHeaders.set("strict-transport-security", HSTS_VALUE);

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders
    });
  }
};
