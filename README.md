# CampusAI Student Portal

CampusAI is a static student portal built with HTML, CSS, and vanilla JavaScript. It uses the existing Supabase project for Auth, database reads and writes, and profile image uploads. Supabase's browser client is initialized once in `assets/js/supabase.js`; the browser contains only the project URL and publishable key in `assets/js/config.js`.

## Folder structure

```text
index.html, login.html, signup.html
dashboard.html, assistant.html, attendance.html, assignments.html
timetable.html, notices.html, syllabus.html, queries.html, profile.html
admin/                 admin dashboard and management pages
assets/css/             shared theme, layouts, responsive styles
assets/js/              Supabase client, auth, database helpers, page modules
assets/js/components/   shared navbar, sidebar, footer, and utilities
```

## Existing database schema

The frontend uses these existing public tables as supplied. It does not create or alter tables.

| Table | Frontend fields used |
| --- | --- |
| `students` | `id`, `full_name`, `email`, `branch`, `semester`, `profile_image`, `created_at` |
| `attendance` | `id`, `student_id`, `subject`, `attended_classes`, `total_classes`, `attendance_percentage`, `updated_at` |
| `assignments` | `id`, `student_id`, `title`, `description`, `subject`, `due_date`, `status`, `priority`, `created_at` |
| `timetable` | `id`, `student_id`, `day`, `subject`, `faculty`, `room`, `start_time`, `end_time` |
| `notices` | `id`, `title`, `description`, `category`, `is_pinned`, `created_at` |
| `syllabus` | `id`, `subject`, `unit`, `title`, `description`, `completed` |
| `queries` | `id`, `student_id`, `title`, `message`, `status`, `created_at` |
| `chat_history` | Reserved for future assistant integration; the assistant currently does not send or store chat messages. |

The app scopes student attendance, assignments, timetable, and queries by the authenticated `student_id`. Student profile rows use the Auth user UUID as `students.id`. Query create, edit, and delete requests also include the current student's ID.

### Row-level security

The supplied development policy is `USING (true)` / `WITH CHECK (true)`. That policy permits broad access to table rows when the API role has table grants. Keep it only for a controlled demo; before production, replace it with policies that scope student-owned records to `auth.uid()`, and limit admin actions to trusted roles. The frontend never uses a service-role key.

## Supabase setup

1. Confirm the existing tables and grants match the supplied schema; no table creation SQL is included.
2. In Supabase Auth, enable email/password sign-in and add the deployed site's URL plus its `/login.html` redirect to the allowed redirect URLs. For local development, serve the static files from an allowed origin; direct `file://` navigation may be blocked by browser origin rules.
3. Profile photos use the Storage bucket name configured as `profile-photos` in `assets/js/config.js`. Create or select that bucket in the Supabase dashboard and set its public/read and authenticated upload policies. Uploads are written under `<auth-user-id>/profile.<extension>`; the matching folder policy should restrict writes to that same user ID.
4. If you installed the earlier example `auth.users` trigger from a previous README, remove it. A failing custom trigger can abort Auth signup before frontend code runs and cause `Database error saving new user`:

   ```sql
   drop trigger if exists on_auth_user_created_student on auth.users;
   drop function if exists public.create_student_for_auth_user();
   ```

   If the message persists, inspect Supabase Auth and Postgres logs and review all custom triggers on `auth.users`; the browser cannot repair a server-side trigger failure. See [Supabase's troubleshooting guide](https://supabase.com/kb/troubleshooting/database-error-saving-new-user-RU_EwB).

## Authentication flow

- Signup sends the student's name, email, branch, and semester to Supabase Auth metadata. If signup returns a session, the student profile is upserted immediately with `id`, `full_name`, `email`, `branch`, `semester`, and `profile_image`. If email confirmation is enabled, the form shows a verification message; the profile is upserted on the first authenticated visit after confirmation.
- Existing accounts are detected from Supabase's duplicate-user error or its obfuscated empty-identities response and are directed to log in.
- Login uses email/password. The Supabase client persists and refreshes the session across page loads.
- Every non-public page checks for a session. Admin pages also require a trusted `app_metadata.role` value of `admin`; do not set admin roles from user-editable metadata.
- Logout calls Supabase `signOut` before redirecting to the login page.

## Data behavior

- Dashboard loads the profile, attendance, today's timetable, recent notices, pending assignments, and recent queries.
- Attendance calculates the overall percentage and subject cards from stored records.
- Assignments and notices are dynamically rendered and searchable. Notices sort pinned first, then newest first.
- Timetable, syllabus units, and student queries are loaded from their respective tables. Students can create, edit, and delete only their own queries.
- Profile details and profile images can be updated. Image upload requires the configured Storage bucket and matching policies.
- Each database and Storage request shows a shared loading indicator. Errors shown in the UI use friendly messages and do not expose internal Supabase details.
- The AI Assistant intentionally displays an under-development response. `chat.js`, `assistant-api.js`, and `voice.js` define the integration points; no AI provider or speech recognition is called.

## Run and deploy

This is a static site with no server or build step. Open `index.html` from a static file host or development web server. Configure the same origin and Auth redirect URL in Supabase. The SDK is loaded from jsDelivr.

## Known limitations and future scope

- Phone is not a field in the supplied `students` schema or existing signup form, so the frontend does not collect or persist it.
- The supplied schema has no settings table, assignment ownership workflow for staff, or historical attendance table. The corresponding admin settings form is informational only, and attendance charts use current subject records.
- The `chat_history` table is reserved; assistant prompts are not stored while the assistant integration remains under development.
- Before production, replace the supplied permissive development RLS policies, configure private Storage access if required, and verify admin role policies.

## Validation

The implementation is checked with JavaScript syntax validation, route/link audits, and mocked client-flow checks. Live Auth, database, and Storage operations require the existing Supabase project configuration and policies.
