# Project rules

- Every server function that touches Gmail, Google Calendar or the AI gateway uses `requireSupabaseAuth`; email only goes to registered profiles — prevents the shared Gmail account from becoming an open relay.
- Workflow notifications are written server-side with the service client after the caller is authorised — users' RLS only allows inserting their own notification rows.
