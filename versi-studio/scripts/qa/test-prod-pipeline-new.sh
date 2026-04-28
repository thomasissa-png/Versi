#!/usr/bin/env bash
# Test pipeline NEW en mode build prod Next.js (= conditions Replit Autoscale).
#
# Reproduction locale du SSR Next.js bundle pour détecter les bugs spécifiques
# à la prod (bug 5102 path/cmaps, etc.) AVANT push. À utiliser comme pre-push
# hook ou en CI GitHub Actions.
#
# USAGE :
#   bash scripts/qa/test-prod-pipeline-new.sh
#
# Exit code :
#   0 = pipeline NEW marche en SSR sur PDF Muguets RDC
#   1 = échec (build, boot, ou diagnostic)

set -euo pipefail

PORT=3199
LOG=/tmp/vs-prod-test.log
PID_FILE=/tmp/vs-prod-test.pid

cleanup() {
  if [ -f "$PID_FILE" ]; then
    kill "$(cat "$PID_FILE")" 2>/dev/null || true
    rm -f "$PID_FILE"
  fi
}
trap cleanup EXIT

cd "$(dirname "${BASH_SOURCE[0]}")/../.."

echo "▶ 1/4 Build Next.js prod"
npm run build > "$LOG" 2>&1 || { echo "FAIL build, voir $LOG"; tail -20 "$LOG"; exit 1; }

echo "▶ 2/4 Démarrage serveur prod sur port $PORT"
VS_DIAGNOSTICS_ENABLED=true PORT=$PORT npm start >> "$LOG" 2>&1 &
echo $! > "$PID_FILE"

# Attendre que le serveur boot (max 30s)
for i in $(seq 1 30); do
  if curl -s --max-time 1 "http://localhost:$PORT" > /dev/null 2>&1; then
    break
  fi
  sleep 1
done

if ! curl -s --max-time 2 "http://localhost:$PORT" > /dev/null 2>&1; then
  echo "FAIL serveur n'a pas démarré en 30s. Logs :"
  tail -30 "$LOG"
  exit 1
fi

echo "▶ 3/4 Hit /api/vs/diagnostics/pipeline-new"
RESP=$(curl -s -w "\n%{http_code}" --max-time 30 "http://localhost:$PORT/api/vs/diagnostics/pipeline-new")
HTTP_CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | sed '$ d')

if [ "$HTTP_CODE" != "200" ]; then
  echo "FAIL HTTP $HTTP_CODE"
  echo "$BODY" | head -50
  echo "---server log---"
  tail -30 "$LOG"
  exit 1
fi

echo "▶ 4/4 Validation assertions"
ASSERTS_OK=$(echo "$BODY" | node -e "
let s = '';
process.stdin.on('data', c => s += c);
process.stdin.on('end', () => {
  const r = JSON.parse(s);
  console.log(JSON.stringify(r.assertions));
  const allOk = Object.values(r.assertions).every(v => v === true);
  process.exit(allOk ? 0 : 1);
});
")

if [ $? -ne 0 ]; then
  echo "FAIL assertions :"
  echo "$ASSERTS_OK"
  echo "$BODY" | node -e "let s=''; process.stdin.on('data',c=>s+=c); process.stdin.on('end',()=>{ const r=JSON.parse(s); console.log(JSON.stringify(r,null,2)); });"
  exit 1
fi

echo ""
echo "✓ Pipeline NEW fonctionnel en SSR Next.js prod"
echo "$BODY" | node -e "
let s=''; process.stdin.on('data',c=>s+=c);
process.stdin.on('end',()=>{
  const r=JSON.parse(s);
  console.log('  M1:', r.m1.type, 'paths='+r.m1.vectorPathCount);
  console.log('  M2:', r.m2.total_segments, '→', r.m2.filtered_walls, 'murs');
  console.log('  M4:', r.m4.rooms, 'espaces ('+r.m4.nodes+' nodes)');
  console.log('  M5:', r.m5.lots, 'lots,', r.m5.communs, 'communs');
  console.log('  Durée:', r.duration_ms+'ms');
});
"
