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

## Update: "Featured courses" on the homepage

The homepage now shows three course cards — **Vocabulary Builder**,
**IELTS Preparation**, **Writing Courses** — matching what was planned at the
start. Since your Supabase project and Vercel site are already set up, do
these two things to pick up the update (order matters — do the database step
first):

1. **Database:** In Supabase → **SQL Editor** → **New query**, paste the
   contents of `supabase/migration_002_add_category.sql` and click **Run**.
   This adds the new `category` column and tags the existing sample quiz as
   "vocabulary" so it shows up under the Vocabulary Builder card.
   (Skip this step only if you are setting up Supabase for the very first
   time — `schema.sql` and `seed.sql` already include this for a fresh
   project.)
2. **Code:** In GitHub Desktop, you'll see the changed files listed. Write a
   commit summary (e.g. "Add featured courses to homepage") → **Commit to
   main** → **Push origin**. Vercel picks this up automatically and
   redeploys in a minute or two.

Once both are done, signed-in students who click a course card go to
`/quizzes` filtered to that course. **IELTS Preparation** and **Writing
Courses** will show "Coming soon" until quizzes are added under those
categories (see the next section) — only Vocabulary Builder has a quiz so
far.

## Update: Admin area

There's now an **admin area** at `/admin` (there's also an "Admin" link in the
top nav once you're signed in as an admin) where you can create/edit/delete
quizzes and questions through a normal web form instead of writing SQL, see
every student's results, and promote other accounts to admin. Since your
project is already live, do these in order:

1. **Database:** In Supabase → **SQL Editor** → **New query**, paste the
   contents of `supabase/migration_003_admin.sql` and click **Run**. (Skip
   this only on a brand-new project — `schema.sql` already includes it.)
2. **Code:** In GitHub Desktop: write a commit summary (e.g. "Add admin
   area") → **Commit to main** → **Push origin**. Vercel redeploys
   automatically.
3. **Make yourself admin.** First sign up / log in on the live site with
   your own email if you haven't already. Then, back in Supabase's SQL
   Editor, run (with your real email):
   ```sql
   update public.profiles set role = 'admin' where email = 'you@example.com';
   ```
4. Refresh the site and log in with that account — you'll see an **Admin**
   link in the top nav. From there:
   - **Quizzes** — create a quiz (title, description, level, which homepage
     course it belongs to, published or draft), then add its questions one
     at a time with a form that adapts to the question type (options for
     multiple choice, accepted answers for fill-in-the-blank, pairs for
     matching, etc). Edit or delete either at any time.
   - **Results** — every student's attempts across every quiz, most recent
     first.
   - **Students** — everyone who has signed up, with a dropdown to change
     their role (student / teacher / admin). Promote a co-teacher the same
     way you promoted yourself in step 3, just from the browser this time.

The old way — inserting rows directly in Supabase's SQL Editor, following
the pattern in `supabase/seed.sql` — still works too and `schema.sql` still
documents the exact shape of `questions.data` per question type, in case
you ever want to bulk-load quizzes that way instead.

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
  (Only actually *editing* quizzes/questions is restricted to admins — see
  the admin RLS policies added in `migration_003_admin.sql`.)
- **Matching question partial credit.** A matching question's points are
  split evenly across its pairs (e.g. a 2-point, 4-pair question awards 0.5
  per correct pair).
- **Email confirmation.** By default Supabase requires confirming a new
  account's email before it can log in. For a class where that's
  unnecessary friction, turn it off in Supabase: Authentication → Providers
  → Email → toggle off "Confirm email".
- **The first admin has to be set by hand, once**, via SQL (see "Update:
  Admin area" above) — there's no self-serve way to become an admin, by
  design, so a student can't just grant themselves access.
- Not yet built: the marketing homepage (published separately as a Claude
  Artifact) isn't linked to this app yet, and lesson pages.

## Local development (optional)

If you ever do have Node.js installed and want to run it on your own
machine instead of only on Vercel:

```bash
cp env.local.example.txt .env.local   # then fill in your Supabase values
npm install
npm run dev
```

Then open http://localhost:3000.

(The env example file is named `env.local.example.txt` instead of the usual
`.env.local.example` only because the tool that copied these files onto your
computer won't write dotfiles that look like `.env*`. Functionally it's the
same file — copy it to `.env.local` and fill in your two Supabase values.)
