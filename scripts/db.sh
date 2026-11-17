#!/bin/zsh
# FreshNest local PostgreSQL: ./scripts/db.sh start | stop | status
BIN="$HOME/.local/pgpkg/node_modules/@embedded-postgres/darwin-arm64/native/bin"
DATA="$HOME/freshnest/.pgdata"
LOG="$HOME/freshnest/.pgdata.log"
if [ ! -d "$DATA" ]; then
  echo "freshnest" > /tmp/fn_pw.$$
  "$BIN/initdb" -D "$DATA" -U freshnest --pwfile=/tmp/fn_pw.$$ -A scram-sha-256 -E UTF8 --locale=C >/dev/null && echo "Database cluster created."
  rm -f /tmp/fn_pw.$$
fi
case "$1" in
  start)  "$BIN/pg_ctl" -D "$DATA" -l "$LOG" -o "-p 5432 -k /tmp" -w start ;;
  stop)   "$BIN/pg_ctl" -D "$DATA" -w stop ;;
  status) "$BIN/pg_ctl" -D "$DATA" status ;;
  *) echo "usage: db.sh start|stop|status" ;;
esac
