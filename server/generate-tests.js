import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

const SYSTEM_PROMPT = `You are a test engineer. Given a numbered list of test scenarios, output a single Vitest test file as plain text — no markdown, no code fences. Use \`import { describe, it, expect } from 'vitest'\`. Write one \`it()\` stub per scenario with \`expect.fail('not implemented')\`. Output only the file content.`

export async function generateTests(suggestedTests) {
  const scenarioList = suggestedTests.map((s, i) => `${i + 1}. ${s}`).join('\n')
  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2048,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: scenarioList }],
  })
  return response.content[0].text
}
