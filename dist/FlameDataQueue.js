"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class FlameDataQueue {
    constructor(flameGraphStore) {
        this.flameGraphStore = flameGraphStore;
        this.queue = [];
    }
    act() {
        if (this.queue.length === 0) {
            return;
        }
        const currentQueueSize = this.queue.length;
        this.queue = this.queue.sort((a, b) => a.parent ? -1 : 1);
        const processQueue = () => {
            while (this.queue.length) {
                const current = this.queue.pop();
                if (current) {
                    const response = this.flameGraphStore.handle(current);
                    if (typeof response !== "boolean") {
                        this.queue.push(response);
                    }
                }
            }
            return this.act();
        };
        setTimeout(() => {
            if (this.queue.length !== currentQueueSize) {
                return this.act();
            }
            return processQueue();
        }, 50);
    }
    push(nodeQueueData) {
        this.queue.push(nodeQueueData);
        this.act();
    }
}
exports.default = FlameDataQueue;
//# sourceMappingURL=FlameDataQueue.js.map