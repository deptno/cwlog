import * as AWS from 'aws-sdk'
import * as R from 'ramda'

let cwlog

export const initializer = region => cwlog = new AWS.CloudWatchLogs({region})

export async function logGroups() {
  try {
    const response = await cwlog.describeLogGroups().promise()
    return response.logGroups
  } catch (ex) {
    console.error(ex)
    return []
  }
}

export function logStreams(logGroupName) {
  try {
    return cwlog.describeLogStreams({
      logGroupName,
      orderBy: 'LastEventTime',
      descending: true
    }).promise()
  } catch (ex) {
    return {logStreams: []} as AWS.CloudWatchLogs.Types.DescribeLogStreamsResponse
  }
}

export async function logEvents(logGroupName, logStreamName, nextToken?) {
  try {
    const params = {
      logGroupName,
      logStreamName,
      nextToken,
      startFromHead: R.not(nextToken)
    }
    return cwlog.getLogEvents(params).promise()
  } catch (ex) {
    return {} as AWS.CloudWatchLogs.Types.GetLogEventsResponse
  }
}

export async function logAllEvents(logGroupName: string, logStreamName: string, events = [], nextForwardToken?): ReturnType<typeof logEvents> {
  const result = await logEvents(logGroupName, logStreamName, nextForwardToken)

  if (result.events.length === 0) {
    return R.merge(result, {events})
  }

  //xxx: avoid rate limit(50/1m)
  //fixme: need to improvement
  await new Promise(resolve => setTimeout(resolve, 900))
  return logAllEvents(logGroupName, logStreamName, events.concat(result.events), result.nextForwardToken)
}
