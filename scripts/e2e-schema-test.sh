#!/usr/bin/env bash

set -e

API_URL="http://localhost:3000"
ENGINE=$1
SCHEMA_PATH=$2
DB_NAME="e2e_$(date +%s)"

if [ -z "$ENGINE" ] || [ -z "$SCHEMA_PATH" ]; then
  echo "Usage:"
  echo "  ./scripts/e2e-schema-test.sh <mysql|postgres> <schema-file>"
  exit 1
fi

echo "🔎 Waiting for API to be ready..."

until curl -s "$API_URL/health" > /dev/null 2>&1; do
  sleep 1
done

echo "🚀 Uploading schema..."
RESPONSE=$(curl -s -X POST "$API_URL/schema/upload" \
  -F "engine=$ENGINE" \
  -F "name=$DB_NAME" \
  -F "schema=@$SCHEMA_PATH")

echo "📦 Response: $RESPONSE"

JOB_ID=$(echo "$RESPONSE" | grep -o '"jobId":"[^"]*' | cut -d':' -f2 | tr -d '"')

if [ -z "$JOB_ID" ]; then
  echo "❌ Failed to obtain jobId"
  exit 1
fi

echo "🆔 Job ID: $JOB_ID"

echo "⏳ Waiting for job to finish..."

while true; do
  STATUS_RESPONSE=$(curl -s "$API_URL/schema/job/$JOB_ID")
  STATUS=$(echo "$STATUS_RESPONSE" | grep -o '"status":"[^"]*' | cut -d':' -f2 | tr -d '"')

  echo "📊 Status: $STATUS"

  if [ "$STATUS" = "success" ]; then
    echo "✅ Schema applied successfully!"
    break
  fi

  if [ "$STATUS" = "failed" ]; then
    echo "❌ Schema failed!"
    echo "$STATUS_RESPONSE"
    exit 1
  fi

  sleep 2
done

echo "🎉 E2E test completed successfully."