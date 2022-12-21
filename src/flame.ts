import FlameDataQueue from './FlameDataQueue'
import FlameGraphStore from './FlameGraphStore'
import {
  NodeQueueData,
  SenecaSharedInstance,
  SpecData,
  SpecMetadata,
} from './types'
import isEqual from 'lodash/isEqual';
import cloneDeep from 'lodash/cloneDeep';
import { Snapshot } from './Snapshot/Snapshot';

function getParentFromMeta(meta: SpecMetadata): string | null {
  const { parents } = meta
  if (!parents || parents.length === 0) {
    return null
  }
  return parents[0][1]
}

function inwardHandler(seneca: any, spec: SpecData, options: any) {
  // Doesn't do anything, for now.
}

function outwardHandler(seneca: any, spec: SpecData, options: any) {
  if (spec.err) {
    // TODO: Handle error cases.
  }
  const sharedInstance = seneca.shared as SenecaSharedInstance
  const { meta } = spec
  const { id, pattern, action, end, start, plugin } = meta
  const { name } = plugin
  if (name === 'debug' || name === 'flame') {
    return;
  }
  const executionTime = end - start
  const parent = getParentFromMeta(meta)
  const nodeData = {
    id,
    pattern,
    action,
    name,
    executionTime,
    parent,
  } as NodeQueueData
  sharedInstance.flameDataQueue.push(nodeData)
}

function flame(this: any, options: any) {
  const seneca = this

  this.init(function(done: () => any) {
    const flameGraphStore = new FlameGraphStore()
    const flameDataQueue = new FlameDataQueue(flameGraphStore)
    seneca.shared = {
      flameDataQueue,
      flameGraphStore,
    } as SenecaSharedInstance
    done();
  })

  seneca.outward((ctxt: any, data: any) => {
    if (!options.capture) {
      return
    }
    const finalData = ctxt.data || data
    inwardHandler(seneca, finalData, options)
  })

  seneca.outward((ctxt: any, data: any) => {
    if (!options.capture) {
      return
    }
    const finalData = ctxt.data || data
    outwardHandler(seneca, finalData, options)
  })

  seneca.add(
    'role:seneca,cmd:close',
    function (this: any, _msg: any, reply: any) {
      options.capture = false
      reply()
    }
  )

  seneca.add(
    'sys:flame',
    function (this: any, msg: any, reply: any) {
      const { capture } = msg;
      options.capture = Boolean(capture);
      reply({ capture })
    }
  )

  seneca.add(
    'sys:flame,cmd:get',
    function (this: any, msg: any, reply: any) {
      const { cached } = msg;
      const data = (seneca.shared.flameGraphStore as FlameGraphStore).get()
      if (!cached) {
        reply(data)
      } else if (isEqual(data, seneca.shared.flameGraphSnapshot)) {
        reply({ data: false });
      } else {
        seneca.shared.flameGraphSnapshot = cloneDeep(data);
        reply(data);
      }
    }
  )

  seneca.add(
    'sys:flame,cmd:snapshot',
    function generateFlameSnapshot(this: any, msg: any, reply: any) {
      const validFormats = ['json', 'html'];
      const { format } = msg;
      if (!format || !validFormats.includes(format)) {
        reply({ message: 'No format found.'});
      }
      const { generateJson, generateHtml } = Snapshot(seneca);
      switch (format) {
        case 'json':
          generateJson()
            .then((response) => reply(response));
          return;
        case 'html':
          generateHtml()
            .then((response) => reply(response));
          return;
        default:
          reply({ message: 'No format found.'});
      }
    }
  )

  seneca.add(
    'sys:flame,cmd:capture_status',
    function checkCaptureStatus(this: any, msg: any, reply: any) {
      reply({ status: options.capture })
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
