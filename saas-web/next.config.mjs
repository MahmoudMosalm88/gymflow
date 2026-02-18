/** @type {import('next').NextConfig} */

const cspDirectives = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://apis.google.com https://www.gstatic.com https://www.google.com/recaptcha/ https://www.recaptcha.net/recaptcha/",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' https://fonts.gstatic.com",
  "connect-src 'self' https://*.googleapis.com https://*.firebaseio.com https://*.firebase.com https://securetoken.googleapis.com https://identitytoolkit.googleapis.com https://www.googleapis.com https://apis.google.com https://accounts.google.com https://recaptchaenterprise.googleapis.com https://www.google.com/recaptcha/ https://www.recaptcha.net/recaptcha/ https://www.google.com",
  "frame-src 'self' https://*.firebaseapp.com https://*.web.app https://accounts.google.com https://*.google.com https://www.recaptcha.net https://recaptcha.google.com",
  "worker-src 'self' blob:"
].join("; ");

// Async function to configure security headers for all routes
async function headers() {
  return [
    {
      source: "/:path*",
      headers: [
        {
          key: "Content-Security-Policy",
          value: cspDirectives
        },
        {
          key: "X-Frame-Options",
          value: "DENY"
        },
        {
          key: "X-Content-Type-Options",
          value: "nosniff"
        },
        {
          key: "Referrer-Policy",
          value: "strict-origin-when-cross-origin"
        },
        {
          key: "X-XSS-Protection",
          value: "1; mode=block"
        },
        {
          key: "Permissions-Policy",
          value: "camera=(), microphone=(), geolocation=()"
        }
      ]
    }
  ];
}

const nextConfig = {
  output: "standalone",
  poweredByHeader: false,
  headers,
  experimental: {
    serverComponentsExternalPackages: ["sql.js"]
  }
};

export default nextConfig;
