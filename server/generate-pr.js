import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

const SYSTEM_PROMPT = `You are a senior software engineer writing a GitHub pull request description. Given a feature intent, acceptance criteria, test stubs, and implementation code, output a JSON object with exactly this structure and no other text:
{
  "title": "concise PR title under 72 characters",
  "body": "markdown PR description with ## Summary, ## Changes, and ## Test plan sections"
}`

export async function generatePR(solution, acceptanceCriteria, testStubs, code) {
  const userMessage = [
    `Solution: ${solution}`,
    ``,
    `Acceptance criteria:`,
    ...acceptanceCriteria.map((c, i) => `${i + 1}. ${c}`),
    ``,
    `Tests:`,
    testStubs,
    ``,
    `Implementation:`,
    code,
  ].join('\n')

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userMessage }],
  })

  return JSON.parse(response.content[0].text)
}
