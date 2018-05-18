import * as inquirer from 'inquirer'
import * as R from 'ramda'

export const list = (message, choices): Promise<{ a: string }> => R.ifElse(
  R.complement(R.isEmpty),
  _ => inquirer.prompt([{
    type: 'list',
    name: 'a',
    pageSize: 20,
    message,
    choices,
  }]),
  _ => {
    throw new Error('empty list')
  }
)(choices)
