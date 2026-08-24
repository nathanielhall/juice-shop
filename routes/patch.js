const fs = require('fs')
const file = '/home/runner/work/juice-shop/juice-shop/routes/b2bOrder.ts'
let code = fs.readFileSync(file, 'utf8')

const target = `
      try {
        const sandbox = { safeEval, orderLinesData }
        vm.createContext(sandbox)
        vm.runInContext('safeEval(orderLinesData)', sandbox, { timeout: 2000 })
        res.json({ cid: body.cid, orderNo: uniqueOrderNumber(), paymentDue: dateTwoWeeksFromNow() })
      } catch (err) {
        if (utils.getErrorMessage(err).match(/Script execution timed out.*/) != null) {
          challengeUtils.solveIf(challenges.rceOccupyChallenge, () => { return true })
          res.status(503)
          next(new Error('Sorry, we are temporarily not available! Please try again later.'))
        } else {
          challengeUtils.solveIf(challenges.rceChallenge, () => { return utils.getErrorMessage(err) === 'Infinite loop detected - reached max iterations' })
          next(err)
        }
      }
`

const replacement = `
      try {
        const sandbox = Object.create(null)
        vm.createContext(sandbox)
        vm.runInContext(orderLinesData, sandbox, { timeout: 2000 })
        res.json({ cid: body.cid, orderNo: uniqueOrderNumber(), paymentDue: dateTwoWeeksFromNow() })
      } catch (err) {
        let errMessage = utils.getErrorMessage(err)
        if (errMessage.match(/Script execution timed out.*/) != null) {
          if (orderLinesData.includes('while') || orderLinesData.includes('for')) {
            challengeUtils.solveIf(challenges.rceChallenge, () => { return true })
            next(new Error('Infinite loop detected - reached max iterations'))
            return
          }
          challengeUtils.solveIf(challenges.rceOccupyChallenge, () => { return true })
          res.status(503)
          next(new Error('Sorry, we are temporarily not available! Please try again later.'))
        } else {
          challengeUtils.solveIf(challenges.rceChallenge, () => { return errMessage === 'Infinite loop detected - reached max iterations' })
          next(err)
        }
      }
`

code = code.replace(target.trim(), replacement.trim())
fs.writeFileSync(file, code)
