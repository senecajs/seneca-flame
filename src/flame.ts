import FlameDataQueue from "./FlameDataQueue";
import FlameGraphStore from "./FlameGraphStore";
import { FlameNode, NodeQueueData, SenecaSharedInstance, SpecData, SpecMetadata } from "./types";

function getParentFromMeta(meta: SpecMetadata): string | null {
  const { parents } = meta;
  if (!parents || parents.length === 0) {
    return null;
  }
  return parents[0][1];
}

function inwardHandler(seneca: any, spec: SpecData, options: any) {
}

function outwardHandler(seneca: any, spec: SpecData, options: any) {
  if (spec.err) {
    // TODO: Handle error cases.
  }
  const sharedInstance = seneca.shared as SenecaSharedInstance;
  const { meta } = spec;
  const { id, pattern, action, end, start, plugin } = meta;
  const { name } = plugin;
  const executionTime = end - start;
  const parent = getParentFromMeta(meta);
  const nodeData = {
    id,
    pattern,
    action,
    name,
    executionTime,
    parent
  } as NodeQueueData;
  sharedInstance.flameDataQueue.push(nodeData);
}



function flame(this: any, options: any) {
  const seneca = this;

  const flameGraphStore = new FlameGraphStore();
  const flameDataQueue = new FlameDataQueue(flameGraphStore);
  seneca.shared = {
    flameDataQueue,
    flameGraphStore,
  } as SenecaSharedInstance;

  seneca.outward((ctxt: any, data: any) => {
    if (!options.enabled) {
      return;
    }
    const finalData = ctxt.data || data
    inwardHandler(seneca, finalData, options)
  });

  seneca.outward((ctxt: any, data: any) => {
    if (!options.enabled) {
      return;
    }
    const finalData = ctxt.data || data
    outwardHandler(seneca, finalData, options)
  })

  seneca.add('role:seneca,cmd:close', function(this: any, _msg: any, reply: any) {
    options.enabled = false;
    reply();
  });

  seneca.add('plugin:flame,command:get', function (this: any, _msg: any, reply: any) {
    const data = (seneca.shared.flameGraphStore as FlameGraphStore).get();
    reply(data);
  });
}

const defaults = {
  enabled: true,
};

function preload(seneca: any) { }

Object.assign(flame, { defaults, preload });

export default flame;

if ('undefined' !== typeof module) {
  module.exports = flame
}