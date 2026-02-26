# =============================================================================
# Mifos X React Web App — Multi-stage Docker Build
# =============================================================================
# Stage 1: Build the React/Vite app (Node Alpine)
# Stage 2: Serve with Nginx (Alpine slim, non-root)
#
# Follows the same pattern as the Angular openmf/web-app Dockerfile:
#   - Plain HTTP on port 80
#   - envsubst for runtime environment injection
#   - No SSL (handle TLS at reverse-proxy / load balancer level)
# =============================================================================

# ---------- OCI Image Labels ----------
ARG BUILD_DATE
ARG VCS_REF
ARG VERSION=dev

###############
### STAGE 1: Build app
###############
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies first (better layer caching)
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

# Copy source code and build configuration
COPY index.html vite.config.ts tsconfig.json tsconfig.app.json tsconfig.node.json ./
COPY components.json ./
COPY fineract.yaml ./
COPY public/ ./public/
COPY src/ ./src/

# Build the application using the project's build script
# NOTE: SDK is pre-generated in src/fineract-api/ — no Java needed
RUN npm run build

###############
### STAGE 2: Serve app with nginx (non-root)
###############
FROM nginx:1.27-alpine-slim

# OCI Image metadata
LABEL org.opencontainers.image.title="Mifos X React Web App" \
      org.opencontainers.image.description="React frontend for Apache Fineract" \
      org.opencontainers.image.url="https://github.com/openMF/mifos-x-web-app-react" \
      org.opencontainers.image.source="https://github.com/openMF/mifos-x-web-app-react" \
      org.opencontainers.image.version="${VERSION}" \
      org.opencontainers.image.created="${BUILD_DATE}" \
      org.opencontainers.image.revision="${VCS_REF}" \
      org.opencontainers.image.licenses="MPL-2.0" \
      org.opencontainers.image.vendor="Mifos Initiative"

# Remove default nginx config
RUN rm -rf /etc/nginx/conf.d/*

# Prepare directories with correct ownership for non-root nginx
RUN mkdir -p /var/cache/nginx /var/run /tmp/nginx && \
    chown -R nginx:nginx /var/cache/nginx /var/run /tmp/nginx /usr/share/nginx/html

# Copy custom nginx configuration
COPY --chown=nginx:nginx docker/nginx.conf /etc/nginx/conf.d/default.conf

# Copy built React app with correct ownership
COPY --from=builder --chown=nginx:nginx /app/dist /usr/share/nginx/html

# Health check: verify nginx is responding
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -q --spider http://localhost:80/ || exit 1

EXPOSE 80

# Run as non-root user
USER nginx

# At container start: replace env.template.js placeholders with real env values → env.js, then start nginx
CMD ["/bin/sh", "-c", "envsubst < /usr/share/nginx/html/assets/env.template.js > /usr/share/nginx/html/assets/env.js && exec nginx -g 'daemon off;'"]
