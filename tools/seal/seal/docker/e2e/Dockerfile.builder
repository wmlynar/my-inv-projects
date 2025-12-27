FROM ubuntu:24.04

ENV DEBIAN_FRONTEND=noninteractive
ARG NODE_MAJOR=24

RUN apt-get update && apt-get install -y \
  ca-certificates \
  curl \
  bash \
  git \
  openssh-client \
  rsync \
  build-essential \
  pkg-config \
  zstd \
  libzstd-dev \
  binutils \
  && rm -rf /var/lib/apt/lists/*

# Install Node.js (needed for E2E runner inside the builder container).
RUN curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | bash - \
  && apt-get install -y nodejs \
  && rm -rf /var/lib/apt/lists/*

# Install E2E anti-debug tools once in the builder image to avoid re-downloading per run.
COPY tools/seal/seal/scripts/install-e2e-tools.sh /tmp/install-e2e-tools.sh
RUN bash /tmp/install-e2e-tools.sh && rm -f /tmp/install-e2e-tools.sh

COPY tools/seal/seal/docker/e2e/builder-entrypoint.sh /usr/local/bin/seal-builder-entrypoint
RUN chmod 755 /usr/local/bin/seal-builder-entrypoint

ENTRYPOINT ["/usr/local/bin/seal-builder-entrypoint"]
WORKDIR /workspace
