import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

const SYSTEM_PROMPT = `You are a product engineer applying the Torres Opportunity Solution Tree and Lean Startup hypothesis frameworks. Given an outcome, an opportunity, and a solution, output a JSON object with exactly this structure and no other text:
{
  "acceptanceCriteria": ["specific testable criterion", ...],
  "suggestedTests": ["concrete test scenario", ...]
}
acceptanceCriteria: 3-5 conditions that define when the solution is complete and the outcome is achieved.
suggestedTests: 3-5 test scenarios to verify correct behaviour.`

export async function generateSpec(outcome, opportunity, solution) {
  const userMessage = [
    `Outcome: ${outcome ?? 'Not specified'}`,
    `Opportunity: ${opportunity ?? 'Not specified'}`,
    `Solution: ${solution}`,
  ].join('\n')

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userMessage }],
  })

  return JSON.parse(response.content[0].text)
}
