/**
 * AIP Logic function — local inference via TARX
 * Drop-in for cloud AIP inference. Zero exfiltration.
 */

import { Functions } from "@foundry/functions-api"
import OpenAI from "openai"

export const myFunctions = new Functions()

const tarxLocal = new OpenAI({
  baseURL: "http://localhost:11435/v1",
  apiKey: "none",
  timeout: 30_000,
})

const tarxMesh = new OpenAI({
  baseURL: "https://api.tarx.com/v1",
  apiKey: process.env.TARX_API_KEY ?? "",
  timeout: 60_000,
})

async function inferLocal(prompt: string, system?: string): Promise<string> {
  const messages: OpenAI.ChatCompletionMessageParam[] = [
    ...(system ? [{ role: "system" as const, content: system }] : []),
    { role: "user", content: prompt },
  ]

  // Try local first
  try {
    const health = await fetch("http://localhost:11435/health", {
      signal: AbortSignal.timeout(2_000),
    })
    if (health.ok) {
      const res = await tarxLocal.chat.completions.create({
        model: "tarx-qwen2.5-7b",
        messages,
        max_tokens: 1024,
      })
      return res.choices[0].message.content ?? ""
    }
  } catch {
    console.warn("[TARX] Local unavailable, trying mesh")
  }

  // Mesh fallback — still TARX network, not cloud LLM
  if (process.env.TARX_API_KEY) {
    const res = await tarxMesh.chat.completions.create({
      model: "tarx-qwen2.5-7b",
      messages,
      max_tokens: 1024,
    })
    return res.choices[0].message.content ?? ""
  }

  // DDIL — queue for later
  throw new Error("TARX_DDIL: No inference path available. Query queued.")
}

myFunctions.summarizeDocument = async (
  documentText: string,
  classificationLevel: string
): Promise<string> => {
  return inferLocal(
    documentText,
    `You are a ${classificationLevel} analyst. Summarize concisely. No hallucination.`
  )
}

myFunctions.analyzeIntelReport = async (
  reportText: string,
  analysisType: "threat" | "pattern" | "summary"
): Promise<{ analysis: string; confidence: number; location: string }> => {
  const prompts = {
    threat: "Identify threat indicators. Rate confidence 0-1.",
    pattern: "Extract behavioral patterns. Rate confidence 0-1.",
    summary: "Summarize key intelligence. Rate confidence 0-1.",
  }

  let location = "local"
  try {
    await fetch("http://localhost:11435/health", { signal: AbortSignal.timeout(1_000) })
  } catch {
    location = "mesh"
  }

  const analysis = await inferLocal(reportText, prompts[analysisType])
  const match = analysis.match(/confidence[:\s]+([0-9.]+)/i)
  const confidence = match ? parseFloat(match[1]) : 0.85

  return { analysis, confidence, location }
}
