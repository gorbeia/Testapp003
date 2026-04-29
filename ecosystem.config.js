module.exports = {
  apps: [
    {
      name: "tbai-api",
      script: "apps/api/dist/index.js",
      instances: 1,
      env: { NODE_ENV: "production" }
    },
    {
      name: "tbai-worker",
      script: "apps/worker/dist/index.js",
      instances: 1,
      env: { NODE_ENV: "production" }
    },
    {
      name: "tbai-dashboard",
      script: "apps/dashboard/dist/index.js",
      instances: 1,
      env: { NODE_ENV: "production" }
    }
  ]
};
