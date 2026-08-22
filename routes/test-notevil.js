const safeEval = require('notevil').eval;
try {
  safeEval('this.constructor.constructor("return process")()', Object.create(null));
  console.log("Success");
} catch (e) {
  console.log("Error:", e.message);
}
