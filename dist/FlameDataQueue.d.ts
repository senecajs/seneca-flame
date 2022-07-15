import FlameGraphStore from './FlameGraphStore';
import { NodeQueueData } from './types';
export default class FlameDataQueue {
    private queue;
    private flameGraphStore;
    constructor(flameGraphStore: FlameGraphStore);
    private act;
    push(nodeQueueData: NodeQueueData): void;
}
