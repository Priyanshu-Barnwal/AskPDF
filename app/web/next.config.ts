import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["amqplib", "pino", "pino-pretty", "thread-stream"],
};

export default nextConfig;

