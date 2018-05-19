import {initializer, logAllEvents, logGroups, logStreams} from './lib/cwlog-engine'
import * as meow from 'meow'
import * as R from 'ramda'
import * as fs from 'fs'
import * as filenamify from 'filenamify'
import {basename} from 'path'
import {promisify} from 'util'
import {list} from './lib/ui/question'
import {fetching, writing} from './lib/ui/spinner'
import * as clipboard from 'clipboardy'
import * as dayjs from 'dayjs'
import * as bytes from 'pretty-bytes'

const program = meow(`
	Usage
	  $ cwlog
	Example
	  $ ✨ cwlog
	  $ ✨ cwlog -r us-east-1
  Alias
	  aws-cwlog
	Options
	  --out, -o       log name (default: [group]_[stream].json)
	  --region, -r    default: ap-northeast-2
	  --tab, -t       JSON tab space (default: 2)
	  --profile, -p   🚫 AWS credential profile
	  --stdout, -s    flush stdout
`, {
  flags: {
    out    : {type: 'string', alias: 'o'},
    region : {type: 'string', alias: 'r', default: 'ap-northeast-2'},
    tab    : {type: 'string', alias: 't', default: '2'},
    profile: {type: 'string', alias: 'p'},
    stdout : {type: 'boolean', alias: 's'}
  }
})

const writer = promisify(fs.writeFile)
const filename = (...name: string[]) => basename(filenamify(name.join('_'))) + '.json'
const {out, profile, region, tab = 2} = program.flags

initializer(region)

async function main() {
  const humanDate = R.compose(R.invoker(1, 'format')('MM-DD.HH:mm:ss'), dayjs)
  const devider = '  '

  try {
    const {a: group} = await list('Select log group', R.pluck('logGroupName', await logGroups()))
    const {a: streamLine} = await list(
      'Select log stream',
      R.compose(
        R.map(
          R.compose(
            R.join(devider),
            R.values,
            R.evolve({
              firstEventTimestamp: humanDate,
              lastEventTimestamp : R.compose(R.concat('~  '), humanDate),
              storedBytes        : R.compose(R.invoker(2, 'padStart')(8, ' '), bytes),
              logStreamName      : R.identity
            }))),
        R.sortWith([R.descend(R.prop('firstEventTimestamp'))]),
        R.project(['storedBytes', 'firstEventTimestamp', 'lastEventTimestamp', 'logStreamName']),
        R.prop('logStreams')
      )(await logStreams(group)))

    const stream = R.head(R.takeLast(1, R.split(devider, streamLine)))
    const {events} = await R.tap(fetching, logAllEvents(group, stream))
    const output = JSON.stringify(events, null, parseInt(tab))

    if (program.flags.stdout) {
      console.log(output)
    } else {
      const file = filename(out || `${group}/${stream}`)
      await R.tap(writing, writer(file, output))

      console.log('✨ done. cat', file)
      await clipboard.write(file)
      console.log('🙌 Is the file name too long? file path has been copied. paste it. [Ctrl + V]')
    }
  } catch (e) {
    console.error('🚫', e.message)
  }
}

main()
