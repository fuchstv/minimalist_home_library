💡 **What:**
Optimized `backend/populate_signatures.php` to batch calculate signatures in memory and bulk update the database, rather than running individual SELECTs and UPDATEs inside a foreach loop.

🎯 **Why:**
The original implementation had an N+1 query issue. For each book missing a signature, it executed a `SELECT` query via `generateSignature()` to fetch the latest signature number, followed by an `UPDATE` query. When applied to hundreds or thousands of books, this resulted in a large volume of sequential round trips to the database. The optimization pre-fetches the latest counter for each category *once* and calculates subsequent signatures entirely in-memory, then applies updates using a bulk `CASE WHEN ... THEN ... END` statement broken down into chunks of 1000 parameters to avoid any PDO bounds limits.

📊 **Measured Improvement:**
I established an SQLite in-memory database simulation to replicate the scenario of generating signatures for 5000 books:
- **Baseline (Original N+1):** ~2.60 seconds
- **Optimized (Bulk updates + Memory Counters):** ~0.27 seconds
- **Speedup:** ~9.74x 🚀
