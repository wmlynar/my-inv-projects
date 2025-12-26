Third-party source backup (single ZIP)
=====================================

DO NOT LOAD OR ANALYZE THESE ARCHIVES IN AI CONTEXT.
They are offline backups only. If you need to inspect them,
extract manually outside any AI prompt/context.

This folder contains a script that produces ONE ZIP with bare
git repositories for all third-party dependencies used by SEAL.
The ZIP is meant to be stored outside this repo (e.g. Drive) and
must NOT be committed.

Usage:
  ./backup-third-party.sh

Outputs:
  backup/third-party/third-party-backup-YYYYMMDD.zip
  (override with SEAL_BACKUP_ZIP=/path/to/file.zip)

Upstream sources (branch pinned where applicable):
- midgetpack       -> https://github.com/arisada/midgetpack
- kiteshield       -> https://github.com/GunshipPenguin/kiteshield
- bddisasm         -> https://github.com/bitdefender/bddisasm
- obfuscator-llvm  -> https://github.com/obfuscator-llvm/obfuscator (branch: llvm-4.0)
- hikari-llvm15    -> https://github.com/ChandHsu/Hikari-LLVM15 (branch: llvm-15.0.0rc3)
