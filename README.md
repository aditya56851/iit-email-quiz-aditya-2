# IIT Computer Institute — Email Quiz

## Features
- Student registration: name, roll number, batch
- 10 email-related multiple-choice questions
- Automatic scoring and explanations
- Leaderboard ranked by score; earlier submission wins ties
- One recorded attempt per roll number + batch
- Results saved on the server in `results.json`
- Optional teacher CSV export endpoint

## Run in VS Code
1. Install Node.js from https://nodejs.org/
2. Open this folder in VS Code.
3. Select Terminal → New Terminal.
4. Run `npm install`
5. Run `npm start`
6. Open http://localhost:3000 in your browser.

Keep the terminal open while using the website. Do not open `public/index.html` directly or use Live Server for this Node.js version.

## Where is the data stored?
After the first student submits the quiz, the server creates `results.json` in the same main folder as `server.js`. It stores student details, marks, percentage, submission time and answer review. Back up this file regularly. Do not delete it if you want to retain results.

## Teacher CSV export (optional)
Set an `ADMIN_PIN` environment variable before starting the server. Use a strong private PIN and do not share it with students.

Windows PowerShell:
`$env:ADMIN_PIN="choose-a-strong-private-pin"`
`npm start`

macOS/Linux:
`ADMIN_PIN="choose-a-strong-private-pin" npm start`

Then send a GET request to `/api/admin/export` with an `x-admin-pin` header equal to your PIN to download a CSV. Do not put the PIN in frontend HTML or publish it.

## Important
- This local version stores data on the current computer only.
- For students on their own phones to access it, deploy it to a hosting service and configure persistent storage or a database. Local JSON files may not persist on some hosts.
- The leaderboard shows student names, roll numbers and batches. Tell students before collecting/displaying their details, or modify the code to display less identifying information.
- This starter project is for classroom use. It is not a hardened public exam platform; add authentication, rate limiting, and a database before public deployment.
