import { FlameNode, NodeQueueData } from './types';
export default class FlameGraphStore {
    private flameGraph;
    constructor();
    private buildFlameNode;
    private updateFlameNode;
    private updateBasePluginFlameNode;
    private findParentById;
    private findParentByName;
    private handlePluginBaseInsertion;
    private handleActionInsertion;
    get(): FlameNode;
    handle(data: NodeQueueData): boolean | NodeQueueData;
}
