# DEMO: this Dockerfile is intentionally insecure.
# Snyk Container flags the base image CVEs; `snyk iac test Dockerfile` flags the
# configuration issues (root user, no healthcheck, etc.).

# DEMO VULN (Snyk Container): node:14 is end-of-life and carries hundreds of
# known OS and runtime CVEs. Also unpinned by digest, so builds are not reproducible.
FROM node:14

# DEMO VULN (Snyk Container): installs extra tooling into the runtime image and
# never cleans the apt lists, widening the attack surface and image size.
RUN apt-get update && apt-get install -y curl wget netcat vim git

WORKDIR /app

# DEMO VULN (Snyk Container): copies the entire build context, including .env
# files, .git history and local node_modules, into the image.
COPY . .

RUN npm install && npm run build
RUN npm --prefix server install

# DEMO VULN (Snyk Container): secret baked into an image layer as an env var.
ENV DATABASE_URL="postgres://todo_admin:S3cretP4ssw0rd@db.internal:5432/todos"
ENV NODE_ENV=development

EXPOSE 3001

# DEMO VULN (Snyk Container): no USER instruction, so the container runs as root.
# DEMO VULN (Snyk Container): no HEALTHCHECK instruction.
CMD ["node", "server/index.js"]
