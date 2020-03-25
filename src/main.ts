import * as core from '@actions/core'

import * as fs from 'fs'
import * as path from 'path'
import * as _ from 'underscore'
import {FileAttributes} from './typings/response'
import gitP, {SimpleGit, LogOptions} from 'simple-git/promise'
import {ListLogSummary} from 'simple-git/typings/response'

const ignoredDirectoryList = ['.git', '.github']

async function getFileList(
  directory: string,
  fileFilter: RegExp,
  recursive: Boolean,
  callback: Function
): Promise<void> {
  const childList = fs.readdirSync(directory).filter(file => file.match(fileFilter))
  for (const child of childList) {
    const childPath = path.join(directory, child)
    if (fs.statSync(childPath).isFile() || !ignoredDirectoryList.includes(child))
      fs.statSync(childPath).isDirectory() && recursive
        ? await getFileList(childPath, fileFilter, recursive, callback)
        : await callback(childPath)
  }
}

async function main(): Promise<void> {
  try {
    const folderPath = core.getInput('Path')
    const filter = new RegExp(core.getInput('Filter'))
    const recurse = new Boolean(core.getInput('Recurse'))
    const top = parseInt(core.getInput('Top'))
    const bottom = parseInt(core.getInput('Bottom'))
    const outputToConsole = new Boolean(core.getInput('OutputFormat'))

    console.debug(`Path :  ${folderPath}`)
    console.debug(`Filter :  ${filter}`)
    console.debug(`Recurse :  ${recurse}`)
    console.debug(`Top :  ${top}`)
    console.debug(`Bottom :  ${bottom}`)

    const simpleGit: SimpleGit = gitP(process.cwd())
    console.debug(`CWD : ${process.cwd()}`)
    let leaderBoardOutput: FileAttributes[] = []
    await getFileList(folderPath, filter, recurse, async function(filePath: string) {
      const logOptions: LogOptions = {splitter: '||||', file: filePath}
      const logSummary: ListLogSummary = await simpleGit.log(logOptions)
      const leaderBoardFile: FileAttributes = {
        filePath,
        commitCount: logSummary.total
      }

      leaderBoardOutput.push(leaderBoardFile)
    })

    leaderBoardOutput = _.sortBy(leaderBoardOutput, 'commitCount').reverse()

    if (top > 0) {
      leaderBoardOutput = leaderBoardOutput.slice(0, top)
    } else if (bottom > 0) {
      leaderBoardOutput = leaderBoardOutput.slice(leaderBoardOutput.length - bottom, leaderBoardOutput.length)
    }

    if (outputToConsole) {
      console.info('File Path\tCommit Count')
      leaderBoardOutput.forEach(file => console.log(`${file.filePath}\t${file.commitCount}`))
    }
    core.setOutput('LeaderBoardOutput', JSON.stringify(leaderBoardOutput))
  } catch (error) {
    console.log(error)
    core.setFailed(error.message)
  }
}

main()
