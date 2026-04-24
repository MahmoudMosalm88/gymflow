Object.assign(process.env, {
  NODE_ENV: "test",
  RELEASE_ID: process.env.RELEASE_ID || "test-release",
  APP_BASE_URL: process.env.APP_BASE_URL || "http://127.0.0.1:3000",
});
