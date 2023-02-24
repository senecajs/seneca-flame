import { randomUUID } from 'crypto'
import FlameDataQueue from './FlameDataQueue'
import FlameGraphStore from './FlameGraphStore'
import {
  NodeQueueData,
  SenecaSharedInstance,
  SpecData,
  SpecMetadata,
  FlameRecord,
} from './types'
import isEqual from 'lodash/isEqual'
import cloneDeep from 'lodash/cloneDeep'
import { Snapshot } from './Snapshot/Snapshot'

function getParentFromMeta(meta: SpecMetadata): string | null {
  const { parents } = meta
  if (!parents || parents.length === 0) {
    return null
  }
  return parents[0][1]
}

function inwardHandler(seneca: any, spec: SpecData, options: any) {
  // Doesn't do anything.
}

function outwardHandler(spec: SpecData, options: any) {
  if (spec.err) {
    // TODO: Handle error cases.
  }
  const { meta } = spec
  const { id, pattern, action, end, start, plugin } = meta
  const { name } = plugin
  if (name === 'debug' || name === 'flame') {
    return
  }
  const executionTime = end - start
  const parent = getParentFromMeta(meta)
  return {
    id,
    pattern,
    action,
    name,
    executionTime,
    parent,
  } as NodeQueueData
}

function flame(this: any, options: any) {
  const seneca = this

  this.init(function (done: () => any) {
    const flameGraphStore = new FlameGraphStore()
    const flameDataQueue = new FlameDataQueue(flameGraphStore)
    seneca.shared = {
      flameDataQueue,
      flameGraphStore,
      frameRecordings: [],
    } as SenecaSharedInstance
    done()
  })

  seneca.outward((ctxt: any, data: any) => {
    if (options.capture) {
      const length = (
        seneca.shared as SenecaSharedInstance
      ).frameRecordings.filter(
        (frameRecord) => frameRecord.state === 'on'
      ).length
      if (!length) return
    }
    const finalData = ctxt.data || data
    const nodeQueueData = outwardHandler(finalData, options)
    if (nodeQueueData) {
      if (options.capture) {
        ;(seneca.shared as SenecaSharedInstance).flameDataQueue.push(
          nodeQueueData
        )
      }
      ;(seneca.shared as SenecaSharedInstance).frameRecordings.forEach(
        (frameRecord) => {
          if (frameRecord.state === 'on') {
            frameRecord.flameDataQueue.push(nodeQueueData)
          }
        }
      )
    }
  })

  seneca.add(
    'role:seneca,cmd:close',
    function (this: any, _msg: any, reply: any) {
      options.capture = false
      reply()
    }
  )

  seneca.add('sys:flame', function (this: any, msg: any, reply: any) {
    const { capture } = msg
    options.capture = Boolean(capture)
    reply({ capture })
  })

  seneca.add('sys:flame,cmd:get', function (this: any, msg: any, reply: any) {
    const { cached } = msg
    const data = (seneca.shared.flameGraphStore as FlameGraphStore).get()
    if (!cached) {
      reply(data)
    } else if (isEqual(data, seneca.shared.flameGraphSnapshot)) {
      reply({ data: false })
    } else {
      seneca.shared.flameGraphSnapshot = cloneDeep(data)
      reply(data)
    }
  })

  seneca.add(
    'sys:flame,cmd:snapshot',
    function generateFlameSnapshot(this: any, msg: any, reply: any) {
      const validFormats = ['json', 'html']
      const { format } = msg
      if (!format || !validFormats.includes(format)) {
        reply({ message: 'No format found.' })
      }
      const { generateJson, generateHtml } = Snapshot(seneca)
      switch (format) {
        case 'json':
          generateJson().then((response) => reply(response))
          return
        case 'html':
          generateHtml().then((response) => reply(response))
          return
        default:
          reply({ message: 'No format found.' })
      }
    }
  )

  seneca.add(
    'sys:flame,cmd:capture_status',
    function checkCaptureStatus(this: any, msg: any, reply: any) {
      reply({ status: options.capture })
    }
  )

  seneca.add(
    'sys:flame,cmd:create_frame',
    function createFlameFrame(this: any, msg: any, reply: any) {
      const flameGraphStore = new FlameGraphStore()
      const flameDataQueue = new FlameDataQueue(flameGraphStore)
      const id = randomUUID()
      const flameRecord: FlameRecord = {
        id,
        state: 'on',
        flameDataQueue,
        flameGraphStore,
      }
      ;(seneca.shared as SenecaSharedInstance).frameRecordings.push(flameRecord)
      reply({ id })
    }
  )

  seneca.add(
    'sys:flame,cmd:toggle_frame',
    function pauseFlameFrame(this: any, msg: any, reply: any) {
      const { id, state } = msg
      if (!id || !state || (state !== 'on' && state !== 'off')) {
        return reply({
          success: false,
          error:
            "Missing or incorrect parameter values, please provide 'id' and 'status' ('on'|'off') parameters",
        })
      }
      const frame = (
        seneca.shared as SenecaSharedInstance
      ).frameRecordings.find((frameRecord) => frameRecord.id === id)
      if (!frame) {
        return reply({
          success: false,
          error: "No 'FrameRecord' was found for the given 'id' parameter",
        })
      }
      const oldFrames = (
        seneca.shared as SenecaSharedInstance
      ).frameRecordings.filter((frameRecord) => frameRecord.id !== id)
      ;(seneca.shared as SenecaSharedInstance).frameRecordings = [
        ...oldFrames,
        { ...frame, state },
      ]
    }
  )

  seneca.add(
    'sys:flame,cmd:get_frame',
    function getFlameFrame(this: any, msg: any, reply: any) {
      const { id } = msg
      if (!id) {
        return reply({
          success: false,
          error:
            "Missing or incorrect parameter values, please provide 'id' parameter",
        })
      }
      const frame = (
        seneca.shared as SenecaSharedInstance
      ).frameRecordings.find((frameRecord) => frameRecord.id === id)
      if (!frame) {
        return reply({
          success: false,
          error: "No 'FrameRecord' was found for the given 'id' parameter",
        })
      }
      const data = frame.flameGraphStore.get()
      reply({ success: true, data })
    }
  )

  seneca.add(
    'sys:flame,cmd:destroy_flame',
    function destroyFlameFrame(this: any, msg: any, reply: any) {
      const { id } = msg
      if (!id) {
        return reply({
          success: false,
          error:
            "Missing or incorrect parameter values, please provide 'id' parameter",
        })
      }
      const frame = (
        seneca.shared as SenecaSharedInstance
      ).frameRecordings.find((frameRecord) => frameRecord.id === id)
      if (!frame) {
        return reply({
          success: false,
          error: "No 'FrameRecord' was found for the given 'id' parameter",
        })
      }
      const data = frame.flameGraphStore.get()
      const newFrameRecords = (
        seneca.shared as SenecaSharedInstance
      ).frameRecordings.filter((frameRecord) => frameRecord.id !== id)
      ;(seneca.shared as SenecaSharedInstance).frameRecordings = newFrameRecords
      reply({ success: true, data })
    }
  )
}

const defaults = {
  capture: false,
}

function preload(seneca: any) {}

Object.assign(flame, { defaults, preload })

export default flame

if ('undefined' !== typeof module) {
  module.exports = flame
}
