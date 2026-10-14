# TrakCode: CS-499 Capstone Submission

TrakCode is a coding education web app. Learners work through short, ordered
lessons (Learn), solve practice assignments that are graded by running their
code against real test cases (Practice), and can ask an AI tutor named Trak for
help along the way.

- **ePortfolio:** [countrycoder44.github.io](https://countrycoder44.github.io),
  with the professional self-assessment, the code review video, and a page for
  each enhancement.
- **Capstone materials:** [`capstone/`](capstone/) holds the original code,
  the code as submitted for each enhancement, and the narratives.
- **Contributing:** see [`CONTRIBUTING.md`](CONTRIBUTING.md).

This copy was prepared for a college capstone. It runs entirely on your own
machine. Payments, social sign-in and other paid services are switched off, and
every private key from the live site has been removed.

## What's in this version

- **Learn:** the first five topics of the *Python: Beginner* course. The Java
  and C++ courses are still listed, marked "Coming soon".
- **Practice:** long-form practice assignments in Python, Java and C++, using a
  set of placeholder concept lists and sample problems.
- **Trak, the AI tutor:** needs an Anthropic API key (see
  [Optional: turning on the AI features](#optional-turning-on-the-ai-features)).
- **Admin dashboard:** usage, practice bank, users, safety review and feedback.
  Admins also get **Preview mode** on lesson pages, which opens any item and
  grades it without saving progress.

## Requirements

- **Node.js 20** or newer, with npm
- To run learners' code in Practice and Learn, the matching language tools on
  your `PATH`:
  - Python 3 (`python` or `python3`)
  - A C++ compiler (`g++` or `clang++`)
  - A Java JDK 17+ (`javac` and `java`)

  Any language whose tools are missing simply fails to run. The rest of the app
  still works.

## Running it

From the project folder, install once:

```bash
npm install
```

Then start the three parts, each in its own terminal:

```bash
npm run dev:sandbox   # code-execution service, http://localhost:4100
npm run dev:server    # API, http://localhost:4000
npm run dev:client    # web app, http://localhost:5173
```

Open **http://localhost:5173**.

The database needs no setup. It's a real MongoDB that starts with the server
and keeps its data in `server/.mongo-data/`.

## Admin account

| | |
|---|---|
| Email | `professor@example.edu` |
| Password | `kmN_0Xn6dxoLEgSG` |

This account only exists in this copy's local database. It has full access to
everything, including the **Admin** page and lesson **Preview mode**.

If you start from an empty database (for example, a fresh clone without
`server/.mongo-data/`), create an admin with the server **stopped**:

```bash
npm run create:admin -w server -- --email you@example.edu --name "Your Name"
```

Leave out `--password` and the script generates one and prints it.

## Trying it as a new learner

1. On the sign-up page, create an account with **email and password**. Google,
   GitHub and LinkedIn sign-in are turned off because their keys were removed.
2. Meet Trak, then go to the **Billing** page. Payments are off, so tick the
   terms box and press **Skip payment: start a 7-day free trial**. Your account
   gets the same free trial a paid checkout would give, and you continue to the
   dashboard.

Trial accounts have the trial's allowances: 20 Trak questions a day and 5 newly
generated practice assignments.

## Optional: turning on the AI features

Trak and newly generated practice assignments call Anthropic's Claude API.
Without a key they show a clear "not available" message, and everything else
works. To turn them on, add your own key to `server/.env.dev`:

```
AI_API_KEY=sk-ant-...
```

Then restart `dev:server`.

## Project layout

```
client/                       React + TypeScript web app (Vite)
server/                       Node.js + Express + TypeScript API, MongoDB via Mongoose
services/execution-sandbox/   Runs learner code against test cases (Python, TypeScript, C++, Java)
Sequential Curriculum/        Lesson content, written in Markdown and imported on server start
```

See [`server/README.md`](server/README.md) for how the API is organized
(routes, controllers, services, models) and how errors and tests are handled.

## Tests and checks

```bash
npm run typecheck:server
npm run typecheck:client
npm run typecheck:sandbox
npm run test:server
npm run test:sandbox
```
