/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  // experimental.instrumentationHook is gone in Next 15 — instrumentation.ts is
  // loaded by default now, and leaving the key in makes every build print an
  // "Unrecognized key" warning while doing nothing.
};

module.exports = nextConfig;
