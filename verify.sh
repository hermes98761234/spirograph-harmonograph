#!/usr/bin/env bash
R=$1; sleep 8
for i in 1 2 3 4 5 6; do ID=$(gh run list -R hermes98761234/$R --workflow deploy.yml --limit 1 --json databaseId --jq '.[0].databaseId'); [ -n "$ID" ] && break; sleep 5; done
gh run watch $ID -R hermes98761234/$R --exit-status >/dev/null 2>&1; echo "run $ID exit $?"
gh run view $ID -R hermes98761234/$R --json conclusion --jq .conclusion
U=https://hermes98761234.github.io/$R/
curl -sI $U | head -1
JS=$(curl -s $U | grep -o 'assets/[^"]*\.js' | head -1); curl -sI "$U$JS" | head -1
