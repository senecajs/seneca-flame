"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const FlameDataQueue_1 = __importDefault(require("./FlameDataQueue"));
const FlameGraphStore_1 = __importDefault(require("./FlameGraphStore"));
const isEqual_1 = __importDefault(require("lodash/isEqual"));
const cloneDeep_1 = __importDefault(require("lodash/cloneDeep"));
const Snapshot_1 = require("./Snapshot/Snapshot");
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
    if (name === 'debug' || name === 'flame') {
        return;
    }
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
        if (!options.capture) {
            return;
        }
        const finalData = ctxt.data || data;
        inwardHandler(seneca, finalData, options);
    });
    seneca.outward((ctxt, data) => {
        if (!options.capture) {
            return;
        }
        const finalData = ctxt.data || data;
        outwardHandler(seneca, finalData, options);
    });
    seneca.add('role:seneca,cmd:close', function (_msg, reply) {
        options.capture = false;
        reply();
    });
    seneca.add('sys:flame', function (msg, reply) {
        const { capture } = msg;
        options.capture = Boolean(capture);
        reply({ capture });
    });
    seneca.add('sys:flame,cmd:get', function (msg, reply) {
        const { cached } = msg;
        const data = seneca.shared.flameGraphStore.get();
        if (!cached) {
            reply(data);
        }
        else if ((0, isEqual_1.default)(data, seneca.shared.flameGraphSnapshot)) {
            reply({ data: false });
        }
        else {
            seneca.shared.flameGraphSnapshot = (0, cloneDeep_1.default)(data);
            reply(data);
        }
    });
    seneca.add('sys:flame,cmd:snapshot', function generateFlameSnapshot(msg, reply) {
        const validFormats = ['json', 'html'];
        const { format } = msg;
        if (!format || !validFormats.includes(format)) {
            reply({ message: 'No format found.' });
        }
        const { generateJson, generateHtml } = (0, Snapshot_1.Snapshot)(seneca);
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
                reply({ message: 'No format found.' });
        }
    });
    seneca.add('sys:flame,cmd:capture_status', function checkCaptureStatus(msg, reply) {
        console.log('aqui', options);
        reply({ status: options.capture });
    });
}
const defaults = {
    capture: false,
};
function preload(seneca) { }
Object.assign(flame, { defaults, preload });
exports.default = flame;
if ('undefined' !== typeof module) {
    module.exports = flame;
}
//# sourceMappingURL=flame.js.map