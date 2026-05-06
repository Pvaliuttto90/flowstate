import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

const SYSTEM_PROMPT = `You are a senior software engineer. Given a feature intent, acceptance criteria, and failing Vitest tests, write the minimal implementation code that makes those tests pass. Output only the code — no markdown fences, no explanation.`

export async function generateCode(solution, acceptanceCriteria, testStubs) {
  const userMessage = [
    `Solution: ${solution}`,
    ``,
    `Acceptance criteria:`,
    ...acceptanceCriteria.map((c, i) => `${i + 1}. ${c}`),
    ``,
    `Failing tests:`,
    testStubs,
  ].join('\n')

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userMessage }],
  })

  return response.content[0].text
}
