# TARX × Palantir AIP — Local Inference Connector

Run Palantir AIP Logic functions against a local LLM via TARX.
Zero cloud exposure. Full DDIL capability. One line change.

```typescript
// Before: cloud inference
const client = new OpenAI({ baseURL: "https://aip.palantir.com/v1" })

// After: TARX local — same API, data never leaves the device
const client = new OpenAI({ baseURL: "http://localhost:11435/v1", apiKey: "none" })
```

## The Gap

Palantir AIP is hub-and-spoke. Powerful when connected. 
Limited when:
- Connectivity is denied, degraded, intermittent, or limited (DDIL)
- Data classification prevents cloud transmission
- Edge hardware isn't available

TARX runs a local inference server on any device. 
It speaks the OpenAI API spec. AIP Logic calls it with one URL change.
Results sync to Foundry Ontology via OSDK subscriptions when connected.

## Architecture

```
PALANTIR FOUNDRY
  AIP Logic → Data Connection source "tarx-local"
                → localhost:11435 (TARX runtime)
                → inference on device, zero exfiltration
  OSDK Subscription → syncs results to Ontology when connected

TARX LOCAL RUNTIME  
  llama-server @ localhost:11435
  SQLite cache (Ontology mirror, offline)
  Sync queue (offline → online reconciliation)
  Mesh network (peer compute when needed)
```

## Setup

### 1. Install TARX

```bash
curl -fsSL tarx.com/install | sh
```

Verify:
```bash
curl http://localhost:11435/health
# {"status":"ok"}
```

### 2. Configure Palantir Data Connection

1. Foundry → Data Connection → Add Source → REST API
2. Base URL: `http://localhost:11435`
3. Name: `tarx-local`
4. See `config/data-connection-source.json` for full config

### 3. Call from AIP Logic

```typescript
const client = new OpenAI({
  baseURL: "http://localhost:11435/v1",
  apiKey: "none",
})

const response = await client.chat.completions.create({
  model: "tarx-qwen2.5-7b",
  messages: [{ role: "user", content: prompt }],
})
```

See `examples/` for complete patterns including error handling,
DDIL fallback, OSDK offline sync, and mesh augmentation.

## Use Cases

**Defense & Intelligence** — DDIL ops, air-gapped networks, 
classified data that cannot touch cloud LLMs.

**Financial Services** — PII, trading strategies, client data 
under GDPR/CCPA. Local inference, Foundry orchestration.

**Healthcare** — PHI under HIPAA. Clinical notes and records 
never leave the device.

**Critical Infrastructure** — Offline-capable operations with 
peer mesh fallback.

## DDIL Matrix

| Scenario | Palantir AIP (cloud) | TARX Local | TARX + Mesh |
|---|---|---|---|
| Full connectivity | ✅ | ✅ | ✅ |
| Degraded | ⚠️ | ✅ | ✅ |
| No connectivity | ❌ | ✅ | ✅ |
| Air-gapped | ❌ | ✅ | ✅ |
| Classified data | ❌ | ✅ | ✅ |

## License

Apache 2.0

## Disclaimer

Not affiliated with or endorsed by Palantir Technologies, Inc.
Integration uses Palantir's public Data Connection API and OSDK.
Palantir, AIP, Foundry, and OSDK are trademarks of 
Palantir Technologies, Inc.
