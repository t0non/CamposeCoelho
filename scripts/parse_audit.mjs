import fs from 'fs'

const raw = fs.readFileSync('audit_results.json', 'utf8')
const startMarker = '{'
const startIndex = raw.indexOf(startMarker)
if (startIndex !== -1) {
  try {
    const jsonStr = raw.substring(startIndex)
    const data = JSON.parse(jsonStr)
    const funcs = data.rows[0]['?column?'].functions
    console.log(funcs.filter(f => f.function_name === 'is_admin').length, 'is_admin overloads')
    const policies = data.rows[0]['?column?'].policies
    console.log(policies.length, 'policies')
  } catch (e) {
    console.error(e.message)
  }
}
