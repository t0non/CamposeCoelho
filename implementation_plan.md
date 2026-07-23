# Fix RLS Infinite Recursion and Improve Test Robustness

## User Review Required
N/A - Factual audit and corrective action based on accurate PostgreSQL RLS evaluation rules.

## Open Questions
N/A

## Proposed Changes

### Factual Audit Findings
The true cause of the infinite recursion risks was **NOT** the inlining of `SECURITY DEFINER` functions, but rather the presence of **indirect cyclical dependencies** caused by policies consulting tables directly in their `USING` clauses (which execute in `SECURITY INVOKER` context).

Specifically:
- `price_table_products` and `price_tables` policies execute a subquery: `SELECT c.price_table_id FROM (profiles p JOIN companies c...)`
- This subquery executes as the invoking user, triggering RLS on `profiles`.
- `profiles` policy contained: `EXISTS (SELECT 1 FROM companies c WHERE c.seller_id = auth.uid() AND c.id = profiles.company_id)`
- This executes as the invoking user, triggering RLS on `companies`.
- The cycle forms if any helper function involved (like `user_belongs_to_company`) loses its `SECURITY DEFINER` context or if another policy introduces a back-reference.

### supabase/migrations
#### [NEW] [20260723200000_fix_rls_infinite_recursion_final.sql](file:///c:/Users/eduar/OneDrive/Desktop/Site-Campos-e-Coelho/app-b2b/supabase/migrations/20260723200000_fix_rls_infinite_recursion_final.sql)
- Remove direct subqueries from policies to eliminate `SECURITY INVOKER` cycle risks.
- Introduce `get_effective_price_table_id()` and `is_seller_of_company(uuid)` as `SECURITY DEFINER` helpers.
- Revoke `EXECUTE` on all helpers from `PUBLIC` and grant only to `authenticated`.
- Simplify `profiles`, `price_table_products`, and `price_tables` policies to exclusively use the `SECURITY DEFINER` helpers.

### scripts
#### [MODIFY] [test-rls.mjs](file:///c:/Users/eduar/OneDrive/Desktop/Site-Campos-e-Coelho/app-b2b/scripts/test-rls.mjs)
- Update error handling to strictly FAIL if *any* unexpected SQL error occurs (e.g., infinite recursion, timeout).
- Ensure `FAIL` if the expected rows (control data) are missing when they should be present.

#### [MODIFY] [test-catalog-pricing.mjs](file:///c:/Users/eduar/OneDrive/Desktop/Site-Campos-e-Coelho/app-b2b/scripts/test-catalog-pricing.mjs)
- Ensure all API responses are validated for unexpected technical errors, throwing an exception if found.

#### [MODIFY] [test-auth.mjs](file:///c:/Users/eduar/OneDrive/Desktop/Site-Campos-e-Coelho/app-b2b/scripts/test-auth.mjs)
- Add safeguards against false-positive passes caused by suppressed errors.

## Verification Plan
### Automated Tests
- `node scripts/test-rls.mjs`
- `node scripts/test-catalog-pricing.mjs`
- `node scripts/test-http-catalog-auth.mjs`
- `node scripts/test-company-onboarding.mjs`
- `node scripts/test-auth.mjs`
- Execute dry-run of migrations and verify synchronization.
