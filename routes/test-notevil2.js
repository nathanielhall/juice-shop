const vm = require('vm');
const safeEval = require('notevil').eval;
try {
  safeEval('("").constructor.constructor("return process")()', {});
  console.log("Success");
} catch (e) {
  console.log("Error:", e.message);
}
