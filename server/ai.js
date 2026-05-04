import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

const SYSTEM_PROMPT = `You are a software architect. Given a feature intent, output a JSON object with exactly this structure and no other text:
{
  "acceptanceCriteria": ["specific testable criterion", ...],
  "suggestedTests": ["concrete test scenario", ...]
}
acceptanceCriteria: 3-5 conditions that define when the feature is complete.
suggestedTests: 3-5 test scenarios to verify correct behaviour.`

export async function generateSpec(intent) {
  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: intent }],
  })

  return JSON.parse(response.content[0].text)
}
