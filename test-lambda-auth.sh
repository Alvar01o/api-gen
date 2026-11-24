#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# test-lambda-auth.sh — Test Lambda JWT auth: login + protected CRUD query
#
# Usage:
#   ./test-lambda-auth.sh [OPTIONS]
#
# Options (all optional, overridable via env or flags):
#   --host        Lambda base URL         (default: http://localhost:4000)
#   --engine      DB engine               (default: postgres)
#   --db          Database name           (default: beta)
#   --prefix      Auth prefix             (default: auth-api-dyn)
#   --user        Login username          (default: user.prueba)
#   --pass        Login password          (default: user.prueba)
#   --table       Table to query          (default: users)
#   --limit       Page size for GET query (default: 5)
#
# Examples:
#   ./test-lambda-auth.sh
#   ./test-lambda-auth.sh --user admin --pass secret123 --table products
#   LAMBDA_HOST=http://myserver:4000 ./test-lambda-auth.sh --db mydb
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

# ── Defaults ─────────────────────────────────────────────────────────────────
HOST="${LAMBDA_HOST:-http://localhost:4000}"
ENGINE="postgres"
DB_NAME="beta"
AUTH_PREFIX="auth-api-dyn"
USERNAME="user.prueba"
PASSWORD="user.prueba"
TABLE="users"
LIMIT=5

# ── Parse flags ──────────────────────────────────────────────────────────────
while [[ $# -gt 0 ]]; do
  case "$1" in
    --host)    HOST="$2";        shift 2 ;;
    --engine)  ENGINE="$2";      shift 2 ;;
    --db)      DB_NAME="$2";     shift 2 ;;
    --prefix)  AUTH_PREFIX="$2"; shift 2 ;;
    --user)    USERNAME="$2";    shift 2 ;;
    --pass)    PASSWORD="$2";    shift 2 ;;
    --table)   TABLE="$2";       shift 2 ;;
    --limit)   LIMIT="$2";       shift 2 ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
done

# ── Helpers ───────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
RESET='\033[0m'

divider() { echo -e "${CYAN}────────────────────────────────────────────────────${RESET}"; }
ok()      { echo -e "${GREEN}✔  $*${RESET}"; }
fail()    { echo -e "${RED}✘  $*${RESET}"; }
info()    { echo -e "${YELLOW}ℹ  $*${RESET}"; }
header()  { echo; divider; echo -e "${BOLD}$*${RESET}"; divider; }

check_deps() {
  for cmd in curl jq; do
    if ! command -v "$cmd" &>/dev/null; then
      fail "Required tool '$cmd' is not installed."
      exit 1
    fi
  done
}

# ── Config summary ────────────────────────────────────────────────────────────
check_deps

header "Lambda JWT Auth Test"
echo -e "  Host      : ${BOLD}${HOST}${RESET}"
echo -e "  Engine    : ${BOLD}${ENGINE}${RESET}"
echo -e "  Database  : ${BOLD}${DB_NAME}${RESET}"
echo -e "  Prefix    : ${BOLD}${AUTH_PREFIX}${RESET}"
echo -e "  Username  : ${BOLD}${USERNAME}${RESET}"
echo -e "  Password  : ${BOLD}${PASSWORD}${RESET}"
echo -e "  Table     : ${BOLD}${TABLE}${RESET}"
echo -e "  Page size : ${BOLD}${LIMIT}${RESET}"

LOGIN_URL="${HOST}/${ENGINE}/${DB_NAME}/${AUTH_PREFIX}/login"
PROTECTED_URL="${HOST}/${ENGINE}/${DB_NAME}/${TABLE}?limit=${LIMIT}"

# ─────────────────────────────────────────────────────────────────────────────
# STEP 1 — Login
# ─────────────────────────────────────────────────────────────────────────────
header "STEP 1: Login  →  POST ${LOGIN_URL}"

HTTP_STATUS=""
RESPONSE_BODY=""

RESPONSE=$(curl -s -w "\n__STATUS__%{http_code}" \
  -X POST "${LOGIN_URL}" \
  -H "Content-Type: application/json" \
  -d "{\"username\": \"${USERNAME}\", \"password\": \"${PASSWORD}\"}")

HTTP_STATUS=$(echo "$RESPONSE" | tail -n1 | sed 's/__STATUS__//')
RESPONSE_BODY=$(echo "$RESPONSE" | sed '$d')

echo -e "  HTTP status : ${BOLD}${HTTP_STATUS}${RESET}"
echo    "  Response body:"
echo "$RESPONSE_BODY" | jq '.' 2>/dev/null || echo "$RESPONSE_BODY"

if [[ "$HTTP_STATUS" != "200" ]]; then
  fail "Login failed (HTTP ${HTTP_STATUS}). Aborting."
  exit 1
fi

TOKEN=$(echo "$RESPONSE_BODY" | jq -r '.token // empty')
if [[ -z "$TOKEN" ]]; then
  fail "No 'token' field in login response. Aborting."
  exit 1
fi

ok "Login successful. JWT obtained."
echo -e "  Token (first 60 chars): ${YELLOW}${TOKEN:0:60}...${RESET}"

# ─────────────────────────────────────────────────────────────────────────────
# STEP 2 — Protected route WITHOUT token (expect 401)
# ─────────────────────────────────────────────────────────────────────────────
header "STEP 2: Protected route WITHOUT token  →  GET ${PROTECTED_URL}"
info "Expecting HTTP 401"

RESPONSE=$(curl -s -w "\n__STATUS__%{http_code}" \
  -X GET "${PROTECTED_URL}")

HTTP_STATUS=$(echo "$RESPONSE" | tail -n1 | sed 's/__STATUS__//')
RESPONSE_BODY=$(echo "$RESPONSE" | sed '$d')

echo -e "  HTTP status : ${BOLD}${HTTP_STATUS}${RESET}"
echo    "  Response body:"
echo "$RESPONSE_BODY" | jq '.' 2>/dev/null || echo "$RESPONSE_BODY"

if [[ "$HTTP_STATUS" == "401" ]]; then
  ok "Correctly rejected unauthenticated request (401)."
else
  fail "Expected 401 but got ${HTTP_STATUS} — JWT middleware may not be active."
fi

# ─────────────────────────────────────────────────────────────────────────────
# STEP 3 — Protected route WITH token (expect 200)
# ─────────────────────────────────────────────────────────────────────────────
header "STEP 3: Protected route WITH token  →  GET ${PROTECTED_URL}"
info "Expecting HTTP 200"

RESPONSE=$(curl -s -w "\n__STATUS__%{http_code}" \
  -X GET "${PROTECTED_URL}" \
  -H "Authorization: Bearer ${TOKEN}")

HTTP_STATUS=$(echo "$RESPONSE" | tail -n1 | sed 's/__STATUS__//')
RESPONSE_BODY=$(echo "$RESPONSE" | sed '$d')

echo -e "  HTTP status : ${BOLD}${HTTP_STATUS}${RESET}"
echo    "  Response body:"
echo "$RESPONSE_BODY" | jq '.' 2>/dev/null || echo "$RESPONSE_BODY"

if [[ "$HTTP_STATUS" == "200" ]]; then
  ok "Authenticated request succeeded (200)."
else
  fail "Expected 200 but got ${HTTP_STATUS}."
fi

# ─────────────────────────────────────────────────────────────────────────────
# STEP 4 — Token with wrong secret (expect 401)
# ─────────────────────────────────────────────────────────────────────────────
header "STEP 4: Tampered token  →  GET ${PROTECTED_URL}"
info "Expecting HTTP 401"

FAKE_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJmYWtlIiwiaWF0IjoxNjAwMDAwMDAwfQ.invalidsignature"

RESPONSE=$(curl -s -w "\n__STATUS__%{http_code}" \
  -X GET "${PROTECTED_URL}" \
  -H "Authorization: Bearer ${FAKE_TOKEN}")

HTTP_STATUS=$(echo "$RESPONSE" | tail -n1 | sed 's/__STATUS__//')
RESPONSE_BODY=$(echo "$RESPONSE" | sed '$d')

echo -e "  HTTP status : ${BOLD}${HTTP_STATUS}${RESET}"
echo    "  Response body:"
echo "$RESPONSE_BODY" | jq '.' 2>/dev/null || echo "$RESPONSE_BODY"

if [[ "$HTTP_STATUS" == "401" ]]; then
  ok "Correctly rejected tampered token (401)."
else
  fail "Expected 401 but got ${HTTP_STATUS} — JWT verification may be broken."
fi

# ─────────────────────────────────────────────────────────────────────────────
# Summary
# ─────────────────────────────────────────────────────────────────────────────
header "Test Complete"
ok "All steps finished. Review output above for any failures."
echo
