FROM ubuntu:24.04

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y \
  ca-certificates \
  curl \
  bash \
  git \
  openssh-client \
  rsync \
  && rm -rf /var/lib/apt/lists/*

COPY tools/seal/seal/docker/e2e/builder-entrypoint.sh /usr/local/bin/seal-builder-entrypoint
RUN chmod 755 /usr/local/bin/seal-builder-entrypoint

ENTRYPOINT ["/usr/local/bin/seal-builder-entrypoint"]
WORKDIR /workspace
