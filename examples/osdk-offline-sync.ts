/**
 * TARX × Palantir — Offline-first pattern
 * Uses Palantir's native @palantir/lohi-ts for Ontology sync.
 * TARX handles local inference. lohi-ts handles data sync.
 */

import { useState, useEffect } from "react"
import { SyncState, type Client } from "@palantir/lohi-ts"
import { useOsdkClient } from "@osdk/react"
import OpenAI from "openai"

const tarxLocal = new OpenAI({
  baseURL: "http://localhost:11435/v1",
  apiKey: "none",
})

export function useTarxOffline() {
  const client = useOsdkClient() as Client
  const [syncState, setSyncState] = useState<SyncState | null>(null)
  const [inferenceReady, setInferenceReady] = useState(false)

  // Check TARX local runtime
  useEffect(() => {
    fetch("http://localhost:11435/health", {
      signal: AbortSignal.timeout(2_000),
    })
      .then((r) => r.ok && setInferenceReady(true))
      .catch(() => setInferenceReady(false))
  }, [])

  // Sync Ontology via Palantir native library
  useEffect(() => {
    ;(async () => {
      const state = await client.syncState()
      setSyncState(state)
      if (state !== SyncState.Ready) {
        await client.sync()
        setSyncState(await client.syncState())
      }
    })()
  }, [client])

  // Local inference — data never leaves device
  const infer = async (prompt: string) => {
    if (!inferenceReady) throw new Error("TARX_DDIL: local runtime unavailable")
    const res = await tarxLocal.chat.completions.create({
      model: "tarx-qwen2.5-7b",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 1024,
    })
    return res.choices[0].message.content ?? ""
  }

  return { syncState, inferenceReady, infer }
}
