import FlameGraphStore from "./FlameGraphStore";
import { NodeQueueData } from "./types";

export default class FlameDataQueue {
  private queue: NodeQueueData[];
  private flameGraphStore: FlameGraphStore;

  constructor(flameGraphStore: FlameGraphStore) {
    this.flameGraphStore = flameGraphStore;
    this.queue = [];
  }

  private act() {
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
    }
    setTimeout(() => {
      if (this.queue.length !== currentQueueSize) {
        return this.act();
      }
      return processQueue();
    }, 50);
  }

  push(nodeQueueData: NodeQueueData) {
    this.queue.push(nodeQueueData);
    this.act();
  }
}