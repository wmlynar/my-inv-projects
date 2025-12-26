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

WORKDIR /workspace
