# Ms Ngo Bla — Student Quiz App

A Next.js + Supabase app where students create an account, take quizzes (multiple
choice, true/false, fill-in-the-blank, sentence completion, matching), get
graded instantly with explanations, and can look back at their result history.

This was hand-written in an environment without package-manager access, so it
has **not** been run or compiled yet. The steps below get it running without
needing Node.js on your own computer at all — GitHub + Vercel do the
installing and building for you.

## 1. Push this folder to GitHub

Using **GitHub Desktop** (free, no command line):

1. Install GitHub Desktop and sign in with your GitHub account.
2. File → Add local repository → pick this folder.
3. If it asks to initialize a repository, say yes.
4. Write a commit summary (e.g. "Initial version") → **Commit to main**.
5. Click **Publish repository** (top bar). Choose a name (e.g.
   `ms-ngo-bla-lms`) and whether it's public or private — private is fine.

## 2. Create a Supabase project (the database + student accounts)

1. Go to supabase.com → sign up → **New project**. Pick a database password
   and a region close to Vietnam (Singapore is usually fastest).
2. Once it's ready, open **SQL Editor** → **New query**, paste the entire
   contents of `supabase/schema.sql`, and click **Run**.
3. Do the same with `supabase/seed.sql` — this adds one sample quiz
   ("Vocabulary Builders — Unit 1 Check") so there's something to test.
4. Go to **Project Settings → API** and copy two values: **Project URL** and
   the **anon public** key. You'll need both in the next step.

## 3. Deploy on Vercel

1. Go to vercel.com → sign up (choose "Continue with GitHub" so it can see
   your repositories).
2. **Add New → Project** → pick the `ms-ngo-bla-lms` repo you published.
3. Before clicking Deploy, open **Environment Variables** and add:
   - `NEXT_PUBLIC_SUPABASE_URL` = the Project URL from step 2.4
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = the anon public key from step 2.4
4. Click **Deploy**. After a minute or two you'll get a live link like
   `https://ms-ngo-bla-lms.vercel.app`.

That link is a real, working site: anyone can sign up, log in, take the
sample quiz, and see their score and history.

## 4. Adding more quizzes

There's no admin screen yet — for now, add quizzes and questions directly in
Supabase's **SQL Editor**, following the pattern in `supabase/seed.sql`:
one `insert into quizzes (...)`, then one `insert into questions (...)` per
question, with `type` set to one of `multiple_choice`, `true_false`,
`fill_blank`, `sentence_completion`, or `matching`, and `data` holding the
options / correct answer for that type (see the comment above the
`questions` table in `supabase/schema.sql` for the exact shape of `data`
per type). A proper "create quiz" screen for you to use without SQL is a
natural next step — ask and it can be built next.

## Known limitations (v1)

- **No local dev/test pass.** This code was written without npm access, so
  the very first `npm install` / build on Vercel may surface a small error.
  If the Vercel build fails, copy the error message back and it can be
  fixed immediately.
- **Answer keys are readable by a determined student.** To keep the schema
  simple, `questions.data` (which includes the correct answer) is
  select-able by any signed-in user at the database level, even though the
  app itself never sends that data to the browser while a quiz is in
  progress. Fine for a class of students using the app normally; if this
  ever needs to resist someone deliberately querying Supabase directly,
  split `data` into a public part and a service-role-only answer key.
- **Matching question partial credit.** A matching question's points are
  split evenly across its pairs (e.g. a 2-point, 4-pair question awards 0.5
  per correct pair).
- **Email confirmation.** By default Supabase requires confirming a new
  account's email before it can log in. For a class where that's
  unnecessary friction, turn it off in Supabase: Authentication → Providers
  → Email → toggle off "Confirm email".
- Not yet built: the marketing homepage (published separately as a Claude
  Artifact) isn't linked to this app yet, lesson pages, and a teacher/admin
  screen for creating content without SQL.

## Local development (optional)

If you ever do have Node.js installed and want to run it on your own
machine instead of only on Vercel:

```bash
cp .env.local.example .env.local   # then fill in your Supabase values
npm install
npm run dev
```

Then open http://localhost:3000.
