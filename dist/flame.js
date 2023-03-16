"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const crypto_1 = require("crypto");
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
    // Doesn't do anything.
}
function outwardHandler(spec, options) {
    if (spec.err) {
        // TODO: Handle error cases.
    }
    const { meta } = spec;
    const { id, pattern, action, end, start, plugin } = meta;
    const { name } = plugin;
    if (name === 'debug' || name === 'flame') {
        return;
    }
    const executionTime = end - start;
    const parent = getParentFromMeta(meta);
    return {
        id,
        pattern,
        action,
        name,
        executionTime,
        parent,
    };
}
function flame(options) {
    const seneca = this;
    this.init(function (done) {
        const flameGraphStore = new FlameGraphStore_1.default();
        const flameDataQueue = new FlameDataQueue_1.default(flameGraphStore);
        seneca.shared = {
            flameDataQueue,
            flameGraphStore,
            frameRecordings: [],
        };
        done();
    });
    seneca.outward((ctxt, data) => {
        const finalData = ctxt.data || data;
        const nodeQueueData = outwardHandler(finalData, options);
        if (nodeQueueData) {
            if (options.capture) {
                seneca.shared.flameDataQueue.push(nodeQueueData);
            }
            seneca.shared.frameRecordings.forEach((frameRecord) => {
                if (frameRecord.state === 'on') {
                    frameRecord.flameDataQueue.push(nodeQueueData);
                }
            });
        }
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
                generateJson().then((response) => reply(response));
                return;
            case 'html':
                generateHtml().then((response) => reply(response));
                return;
            default:
                reply({ message: 'No format found.' });
        }
    });
    seneca.add('sys:flame,cmd:capture_status', function checkCaptureStatus(msg, reply) {
        reply({ status: options.capture });
    });
    seneca.add('sys:flame,cmd:create_frame', function createFlameFrame(msg, reply) {
        const flameGraphStore = new FlameGraphStore_1.default();
        const flameDataQueue = new FlameDataQueue_1.default(flameGraphStore);
        const id = (0, crypto_1.randomUUID)();
        const flameRecord = {
            id,
            state: 'on',
            flameDataQueue,
            flameGraphStore,
        };
        seneca.shared.frameRecordings.push(flameRecord);
        reply({ id });
    });
    seneca.add('sys:flame,cmd:toggle_frame', function pauseFlameFrame(msg, reply) {
        const { id, state } = msg;
        if (!id || !state || (state !== 'on' && state !== 'off')) {
            return reply({
                success: false,
                error: "Missing or incorrect parameter values, please provide 'id' and 'status' ('on'|'off') parameters",
            });
        }
        const frame = seneca.shared.frameRecordings.find((frameRecord) => frameRecord.id === id);
        if (!frame) {
            return reply({
                success: false,
                error: "No 'FrameRecord' was found for the given 'id' parameter",
            });
        }
        const oldFrames = seneca.shared.frameRecordings.filter((frameRecord) => frameRecord.id !== id);
        seneca.shared.frameRecordings = [
            ...oldFrames,
            { ...frame, state },
        ];
    });
    seneca.add('sys:flame,cmd:get_frame', function getFlameFrame(msg, reply) {
        const { id } = msg;
        if (!id) {
            return reply({
                success: false,
                error: "Missing or incorrect parameter values, please provide 'id' parameter",
            });
        }
        const frame = seneca.shared.frameRecordings.find((frameRecord) => frameRecord.id === id);
        if (!frame) {
            return reply({
                success: false,
                error: "No 'FrameRecord' was found for the given 'id' parameter",
            });
        }
        const data = frame.flameGraphStore.get();
        reply({ success: true, data });
    });
    seneca.add('sys:flame,cmd:destroy_flame', function destroyFlameFrame(msg, reply) {
        const { id } = msg;
        if (!id) {
            return reply({
                success: false,
                error: "Missing or incorrect parameter values, please provide 'id' parameter",
            });
        }
        const frame = seneca.shared.frameRecordings.find((frameRecord) => frameRecord.id === id);
        if (!frame) {
            return reply({
                success: false,
                error: "No 'FrameRecord' was found for the given 'id' parameter",
            });
        }
        const data = frame.flameGraphStore.get();
        const newFrameRecords = seneca.shared.frameRecordings.filter((frameRecord) => frameRecord.id !== id);
        seneca.shared.frameRecordings = newFrameRecords;
        reply({ success: true, data });
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