# tarx-palantir-connector

Open-source connector: TARX local inference <> Palantir AIP Logic.
Routes AIP Logic webhook calls to local LLM via TARX daemon.
Zero cloud exposure. DDIL-capable.

## Status

- GitHub: https://github.com/tarx-ai/tarx-palantir-connector (public)
- License: Apache 2.0

## One line change

```typescript
// Before: cloud inference
const client = new OpenAI({ baseURL: "https://aip.palantir.com/v1" })

// After: TARX local — same API, data never leaves the device
const client = new OpenAI({ baseURL: "http://localhost:11435/v1", apiKey: "none" })
```

## Architecture

```
Palantir Foundry AIP Logic
    → Data Connection source "tarx-local"
    → localhost:11435/v1/chat/completions (OpenAI-compatible)
    → TARX daemon (inference on device, zero exfiltration)
    → Ontology sync via OSDK when connected
```

## Foundry instance

- Org: tarx.usw-3.palantirfoundry.com
- Ontology: TARX Ontology (ontology-6d7a3ca3-f4a1-4736-9a1d-34e3121fb530)
- Objects: 11 aviation example objects (ExampleAirport, ExampleFlight, etc.)

## Custom object types (pending)

- TarxInferenceJob — audit trail for every inference
- TarxMeshNode — mesh peer topology in Foundry workshop
- TarxRouteOptimization — QAOA results linked to ExampleRoute

## Key files

| File | Purpose |
|------|---------|
| examples/aip-logic-local-inference.ts | AIP Logic function with TARX |
| examples/osdk-offline-sync.ts | Offline-first sync via lohi-ts |
| config/data-connection-source.json | REST API source config |

## DDIL Matrix

| Scenario | Palantir AIP (cloud) | TARX Local | TARX + Mesh |
|----------|---------------------|------------|-------------|
| Full connectivity | Yes | Yes | Yes |
| Degraded | Partial | Yes | Yes |
| No connectivity | No | Yes | Yes |
| Air-gapped | No | Yes | Yes |

## Disclaimer

Not affiliated with or endorsed by Palantir Technologies.
Integration via Palantir's public Data Connection API and OSDK.
