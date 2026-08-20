# Rabbit Web UI

Next.js frontend for the Rabbit e-commerce platform.

## Features

- Server-side rendering with Next.js
- React components with TypeScript
- OpenTelemetry instrumentation for observability
- Docker containerization

## Getting Started

```bash
npm install
npm run dev
```

Build for production:

```bash
npm run build
npm run start
```

Deploy:

```bash
make up
```

## Architecture

- **Next.js 14**: React framework with SSR
- **Instrumentation**: OTEL for tracing and metrics
- **Docker**: Containerized deployment
- **Kubernetes**: Deployed on kind cluster
