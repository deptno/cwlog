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
    return cwlog.describeLogStreams({logGroupName}).promise()
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
    return {...result, events}
  }

  //xxx: avoid rate limit(50/1m)
  await new Promise(resolve => setTimeout(resolve, 900))
  return logAllEvents(logGroupName, logStreamName, result.events, result.nextForwardToken)
}
