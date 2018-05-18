import * as R from 'ramda'
import * as ora from 'ora'

const createSpinner = R.curryN(2, (message, p) => {
  const spinner = ora(message)

  spinner.start()

  return p
    .then(R.nAry(0, R.bind(spinner.succeed, spinner)))
    .catch(R.nAry(0, R.bind(spinner.fail, spinner)))
})
export const fetching = createSpinner('fetching...')
export const writing = createSpinner('writing...')