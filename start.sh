#!/bin/bash
set -e

# Write the Firebase credentials JSON to a temporary file
echo "$FIREBASE_CREDS_JSON" > /tmp/firebase-adminsdk.json
export FIREBASE_SERVICE_ACCOUNT_PATH=/tmp/firebase-adminsdk.json

# Start the Node.js server
exec node dist/src/index.js