// Type definitions for trace + state shapes.
//
// All "wire-format" types are GENERATED from the Rust source of truth via
// `frontend/scripts/sync-types.sh` (driven by `trace explain <type> --output
// jsonschema`). Schema drift between backend and frontend is impossible:
// any Rust schema edit + `npm run build` regenerates these and every
// consumer that's now mistyped will fail TypeScript compilation.

export type { Trace } from '@/generated/trace'
