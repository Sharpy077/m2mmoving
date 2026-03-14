# Reference SQL Scripts

These SQL files are **reference material only** — ad-hoc scripts used during initial table setup.

## Canonical Schema Source

The authoritative database schema lives in [`supabase/migrations/`](../../supabase/migrations/). Always use the Supabase migration files for schema changes:

```bash
# Run migrations via Supabase CLI
supabase db push

# Or use the TypeScript runner
npx ts-node scripts/run-migrations.ts
```

## Files

| File | Purpose |
|------|---------|
| `003-create-escalation-tables.sql` | Bridge agent escalation tables |
| `004-create-analytics-tables.sql` | Analytics/reporting tables |
| `004_create_support_tickets_table.sql` | Support ticket tracking |
| `004_create_vehicles_table.sql` | Fleet vehicle management |
| `005_create_hunter_prospects_table.sql` | Hunter agent prospect tracking |
| `006_create_phoenix_retention_tables.sql` | Phoenix agent retention data |
| `007_create_bridge_escalation_tables.sql` | Bridge agent escalation tracking |
| `008_create_oracle_analytics_tables.sql` | Oracle agent analytics tables |
| `009_create_nexus_operations_tables.sql` | Nexus agent operations tables |
| `016-create-pricing-config.sql` | Pricing configuration storage |
| `run_all_migrations.sql` | Convenience script to run all migrations |
| `run_remaining_migrations.sql` | Convenience script for partial migrations |

> **Note:** The numbering is non-sequential because scripts were added across separate development sessions. The `supabase/migrations/` files use timestamp-based naming and are the source of truth.
