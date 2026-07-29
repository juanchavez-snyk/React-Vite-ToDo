// Throwaway scratch file. Safe to delete.
// Uses lodash so the vulnerable dependency is actually reachable, not just declared.
const _ = require('lodash')

function add(a, b) {
  return a + b
}

function greet(name) {
  return `Hello, ${name}!`
}

// lodash 4.17.15 merge is the prototype-pollution sink Snyk flags.
function applyDefaults(input) {
  return _.merge({ greeting: 'Hello', times: 1 }, input)
}

const config = applyDefaults({ times: 3 })
console.log(greet('world'), add(2, 3), JSON.stringify(config))

module.exports = { add, greet, applyDefaults }
