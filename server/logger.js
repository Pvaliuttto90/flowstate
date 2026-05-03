export function log({ level = 'info', ...fields }) {
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    ...fields,
  }))
}
