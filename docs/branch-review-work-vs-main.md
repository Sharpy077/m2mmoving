# Branch Review: `work` vs `main`

> Note: this repository snapshot does not include a local `main` ref (`main`/`origin/main` are missing), so this review compares `work` HEAD to its direct parent commit (`HEAD^`) as the effective merge delta.

## Key Differences

`work` is ahead by **1 commit** containing **2 migration files** and no other code changes:

1. `supabase/migrations/20260309000001_create_blog_tables.sql`
   - Adds `blog_posts` table with SEO/content fields, `published` workflow columns, indexes, and RLS policies.
2. `supabase/migrations/20260309000002_add_followup_review_fields.sql`
   - Adds lead follow-up/review columns and two supporting indexes.

## Merge Readiness Findings

### What is already done

- DB schema changes for blog content storage are in place.
- DB schema changes for follow-up/review state tracking are in place.
- Indexes were added for expected lookup paths.

### Gaps to complete before merging

1. **Application integration for `blog_posts` is missing**
   - No API routes, server actions, admin UI, or public blog pages currently reference `blog_posts`.
   - Result: migration lands unused schema without end-user functionality.

2. **Application integration for new lead follow-up/review fields is missing**
   - No code references `last_follow_up_sent_at`, `follow_up_count`, `review_requested`, or `review_requested_at`.
   - Result: automation/CRM behavior implied by schema changes is not implemented.

3. **Supabase type regeneration appears pending**
   - If typed database interfaces are used in this repo, generated types should be refreshed to include new table/columns.

4. **Operational safeguards should be confirmed**
   - RLS policy currently allows all authenticated users to manage `blog_posts`; verify this matches intended privilege model (admin-only vs any authenticated user).
   - Consider `updated_at` trigger for `blog_posts` if write flows depend on audit freshness.

5. **Validation/testing for new DB behavior is missing**
   - Add tests (or at least smoke scripts) covering blog post visibility by auth state and follow-up/review query paths using new indexes/fields.

## Recommended Implementation Checklist

- [ ] Implement blog read path (public published posts) and write path (admin/editor).
- [ ] Implement lead follow-up/review logic that updates new fields.
- [ ] Regenerate and commit Supabase DB types.
- [ ] Verify/adjust RLS policies for least privilege.
- [ ] Add tests for new query and permission behavior.
- [ ] Run migration apply + rollback verification in staging.

## Quick Diff Commands Used

- `git rev-parse --verify main`
- `git rev-parse --verify origin/main`
- `git show --name-status --stat --pretty=fuller HEAD`
- `git diff --stat HEAD^..HEAD`
- `rg -n "blog_posts|follow_up_count|last_follow_up_sent_at|review_requested_at|review_requested" -S`
