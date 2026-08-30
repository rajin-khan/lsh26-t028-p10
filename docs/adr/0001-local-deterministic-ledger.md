# Keep the meter ledger local and deterministic

P10 uses the supplied fixture in a client-side Next.js application and calculates every ledger entry with pure domain functions. A backend, Supabase, and an ML forecast were rejected because the judged work is deterministic, needs no shared accounts, and must remain deployable and auditable under a four-hour build window; adding network state would create failure modes without satisfying a requirement.
