const vm = require('vm');
const sandbox = Object.create(null);
vm.createContext(sandbox);
try {
  vm.runInContext('this.constructor.constructor("return process")()', sandbox);
  console.log('Vulnerable!');
} catch (e) {
  console.log('Error:', e.message);
}
