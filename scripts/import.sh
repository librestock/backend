#!/bin/sh
set -eu

usage() {
  cat <<'USAGE' >&2
Usage:
  sh ./scripts/import.sh sortly <sortly-export.csv>
  sh ./scripts/import.sh products <normalized-products.csv>

Import types:
  sortly    Normalize a Sortly export, then import products/inventory
  products  Import an already-normalized product CSV
USAGE
}

if [ "$#" -lt 1 ]; then
  usage
  exit 1
fi

kind=$1
shift

case "$kind" in
  sortly)
    if [ "$#" -ne 1 ]; then
      usage
      exit 1
    fi

    input_path=$1
    tmp=${TMPDIR:-/tmp}/sortly-normalized.$$.csv
    trap 'rm -f "$tmp"' EXIT HUP INT TERM

    nu src/scripts/prepare-sortly-export.nu "$input_path" "$tmp"
    infisical run --env=dev -- tsx src/scripts/import-products.ts "$tmp"
    ;;

  products)
    if [ "$#" -ne 1 ]; then
      usage
      exit 1
    fi

    infisical run --env=dev -- tsx src/scripts/import-products.ts "$1"
    ;;

  -h|--help|help)
    usage
    ;;

  *)
    echo "Unknown import type: $kind" >&2
    usage
    exit 1
    ;;
esac
