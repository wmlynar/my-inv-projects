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

# Install E2E anti-debug deps/tools once in the builder image to avoid re-downloading per run.
# Keep the most stable steps early for faster cache hits.
COPY tools/seal/seal/scripts/install-e2e-antidebug-deps.sh /tmp/install-e2e-antidebug-deps.sh
RUN bash /tmp/install-e2e-antidebug-deps.sh \
  && rm -f /tmp/install-e2e-antidebug-deps.sh

COPY tools/seal/seal/scripts/install-e2e-tools.sh /tmp/install-e2e-tools.sh
COPY tools/seal/seal/scripts/install-criu.sh /tmp/install-criu.sh
RUN bash /tmp/install-e2e-tools.sh \
  && rm -f /tmp/install-e2e-tools.sh /tmp/install-criu.sh

COPY backup/third-party/backup-third-party.sh /usr/local/bin/seal-backup-third-party
RUN chmod 755 /usr/local/bin/seal-backup-third-party

COPY tools/seal/seal/docker/e2e/builder-entrypoint.sh /usr/local/bin/seal-builder-entrypoint
RUN chmod 755 /usr/local/bin/seal-builder-entrypoint

ENTRYPOINT ["/usr/local/bin/seal-builder-entrypoint"]
WORKDIR /workspace
