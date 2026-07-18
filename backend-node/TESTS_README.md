Automated test runner for backend-node

How to run locally:

1. From project root, open a terminal and run:

   cd backend-node
   bash run-full-tests.sh

This will install dependencies, start the server, run the full test suite (as described in copilot.md), and produce backend-node/test-report.md with a markdown table summary.

Environment variables available:
  BASE_URL - base URL of API (default http://localhost:3333)
  VENDOR_EMAIL - vendor email for initial login (default kayque@gmail.com)
  VENDOR_PASSWORD - vendor password (default MudarDepois123!)

Notes:
- The script uses node-fetch when running under Node <18. Install with: npm i node-fetch
- If you prefer to run the Node-only runner without helper script: node run-full-tests.js
