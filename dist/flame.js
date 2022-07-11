"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const FlameDataQueue_1 = __importDefault(require("./FlameDataQueue"));
const FlameGraphStore_1 = __importDefault(require("./FlameGraphStore"));
function getParentFromMeta(meta) {
    const { parents } = meta;
    if (!parents || parents.length === 0) {
        return null;
    }
    return parents[0][1];
}
function inwardHandler(seneca, spec, options) {
    // Doesn't do anything, for now.
}
function outwardHandler(seneca, spec, options) {
    if (spec.err) {
        // TODO: Handle error cases.
    }
    const sharedInstance = seneca.shared;
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
        parent,
    };
    sharedInstance.flameDataQueue.push(nodeData);
}
function flame(options) {
    const seneca = this;
    this.init(function (done) {
        const flameGraphStore = new FlameGraphStore_1.default();
        const flameDataQueue = new FlameDataQueue_1.default(flameGraphStore);
        seneca.shared = {
            flameDataQueue,
            flameGraphStore,
        };
        done();
    });
    seneca.outward((ctxt, data) => {
        if (!options.enabled) {
            return;
        }
        const finalData = ctxt.data || data;
        inwardHandler(seneca, finalData, options);
    });
    seneca.outward((ctxt, data) => {
        if (!options.enabled) {
            return;
        }
        const finalData = ctxt.data || data;
        outwardHandler(seneca, finalData, options);
    });
    seneca.add('role:seneca,cmd:close', function (_msg, reply) {
        options.enabled = false;
        reply();
    });
    seneca.add('role:seneca,plugin:flame,cmd:toggle', function (_msg, reply) {
        options.enabled = !options.enabled;
        reply();
    });
    seneca.add('plugin:flame,command:get', function (_msg, reply) {
        const data = seneca.shared.flameGraphStore.get();
        reply(data);
    });
}
const defaults = {
    enabled: true,
};
function preload(seneca) { }
Object.assign(flame, { defaults, preload });
exports.default = flame;
if ('undefined' !== typeof module) {
    module.exports = flame;
}
//# sourceMappingURL=flame.js.map