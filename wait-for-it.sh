#!/bin/bash
# wait-for-it.sh

set -e

host="$1"
port="$2"
shift 2
cmd="$@"

until nc -z "$host" "$port"; do
  >&2 echo "Aguardando $host:$port estar disponível..."
  sleep 1
done

>&2 echo "$host:$port está disponível - executando comando"
exec $cmd 