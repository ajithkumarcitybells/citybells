# Database Indexes

This repository includes helper code to create and ensure database indexes used by the search/autocomplete and recommendation subsystems.

Quick usage (development):

1. Ensure `MONGODB_URI` (and optionally `MONGODB_DB`) are set in your environment.
2. Run the script below from project root:

```bash
MONGODB_URI="mongodb://user:pass@host:27017" node server/scripts/create_indexes.js
```

What the script does:
- Creates common indexes used by product and orders queries.
- Creates hotel-related indexes: `name`, `city`, `address`, `isActive` and a compound text index `hotels_text_idx` (weights: name > city > address) which speeds up tokenized/autocomplete searches.

Notes for production:
- Index creation can be I/O intensive; run during maintenance windows for large datasets.
- If you use managed MongoDB (Atlas), prefer creating indexes via the Atlas UI or automation once per deployment.
- The code also calls `ensureIndexes()` at server startup (`server/db.ts`) so the app attempts to create missing indexes on connect.
