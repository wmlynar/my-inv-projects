"use strict";

function bashCompletionScript() {
  return `# bash completion for seal
_seal_find_root() {
  local dir="$PWD"
  local i=0
  while [[ "$dir" != "/" && $i -lt 25 ]]; do
    if [[ -f "$dir/seal.json5" || -d "$dir/seal-config/targets" || -f "$dir/seal-config/project.json5" ]]; then
      echo "$dir"
      return 0
    fi
    dir="$(dirname "$dir")"
    ((i++))
  done
  return 1
}

_seal_list_names() {
  local dir="$1"
  local suffix="$2"
  if [[ -d "$dir" ]]; then
    local names=""
    local f
    for f in "$dir"/*"$suffix"; do
      [[ -f "$f" ]] || continue
      names+="$(basename "$f" "$suffix") "
    done
    echo "$names"
  fi
}

_seal_targets() {
  local root=$(_seal_find_root)
  [[ -n "$root" ]] || return 0
  _seal_list_names "$root/seal-config/targets" ".json5"
}

_seal_configs() {
  local root=$(_seal_find_root)
  [[ -n "$root" ]] || return 0
  _seal_list_names "$root/seal-config/configs" ".json5"
}

_seal_complete() {
  local cur prev words cword
  if type _init_completion >/dev/null 2>&1; then
    _init_completion -n : || return
  else
    cur="\${COMP_WORDS[COMP_CWORD]}"
    prev="\${COMP_WORDS[COMP_CWORD-1]}"
    words=(\"\${COMP_WORDS[@]}\")
    cword=$COMP_CWORD
  fi

  local commands="init wizard completion check target config release run-local verify clean deploy ship rollback run uninstall remote"
  local global_opts="-h --help -V --version"

  if [[ "$prev" == "--packager" ]]; then
    COMPREPLY=( $(compgen -W "thin-split thin-single sea bundle none auto" -- "$cur") )
    return
  fi
  if [[ "$prev" == "--config" ]]; then
    COMPREPLY=( $(compgen -W "$(_seal_configs)" -- "$cur") )
    return
  fi
  if [[ "$prev" == "--cc" || "$prev" == "--check-cc" ]]; then
    COMPREPLY=( $(compgen -W "cc gcc clang" -- "$cur") )
    return
  fi

  if (( cword == 1 )); then
    COMPREPLY=( $(compgen -W "$commands $global_opts" -- "$cur") )
    return
  fi

  local cmd="\${words[1]}"
  case "$cmd" in
    target)
      if (( cword == 2 )); then
        COMPREPLY=( $(compgen -W "add" -- "$cur") )
        return
      fi
      ;;
    config)
      if (( cword == 2 )); then
        COMPREPLY=( $(compgen -W "add diff pull push" -- "$cur") )
        return
      fi
      if (( cword == 3 )); then
        if [[ "$cur" != -* ]]; then
          COMPREPLY=( $(compgen -W "$(_seal_configs) $(_seal_targets)" -- "$cur") )
          return
        fi
      fi
      ;;
    remote)
      if (( cword == 2 )); then
        COMPREPLY=( $(compgen -W "$(_seal_targets)" -- "$cur") )
        return
      elif (( cword == 3 )); then
        COMPREPLY=( $(compgen -W "up enable start restart stop disable down status logs" -- "$cur") )
        return
      fi
      ;;
    deploy|ship|rollback|run|uninstall|check|release)
      if (( cword == 2 )); then
        if [[ "$cur" != -* ]]; then
          COMPREPLY=( $(compgen -W "$(_seal_targets)" -- "$cur") )
          return
        fi
      fi
      ;;
  esac

  local opts=""
  case "$cmd" in
    init) opts="--force" ;;
    check) opts="--strict --verbose --cc" ;;
    release) opts="--config --skip-check --check-verbose --check-cc --packager" ;;
    run-local) opts="--sealed --config" ;;
    verify) opts="--explain" ;;
    deploy) opts="--bootstrap --push-config --restart --accept-drift --allow-drift --artifact --fast --fast-no-node-modules" ;;
    ship) opts="--bootstrap --push-config --accept-drift --allow-drift --skip-check --check-verbose --check-cc --packager --fast --fast-no-node-modules" ;;
    run) opts="--kill --sudo --accept-drift --allow-drift" ;;
    rollback) opts="--accept-drift --allow-drift" ;;
    remote) opts="--accept-drift --allow-drift" ;;
    completion) opts="bash" ;;
  esac
  if [[ "$cmd" == "config" && "${words[2]}" == "pull" ]]; then
    opts="--apply"
  fi
  if [[ -z "$opts" && "$cur" == -* ]]; then
    opts="$global_opts"
  fi

  if [[ -n "$opts" ]]; then
    COMPREPLY=( $(compgen -W "$opts $global_opts" -- "$cur") )
  fi
}

complete -F _seal_complete seal
`;
}

function cmdCompletion(shell) {
  const target = String(shell || "bash").toLowerCase();
  if (target !== "bash") {
    throw new Error(`Unsupported shell: ${target}. Supported: bash`);
  }
  process.stdout.write(bashCompletionScript());
}

module.exports = { cmdCompletion };
