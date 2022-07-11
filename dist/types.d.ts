import FlameDataQueue from './FlameDataQueue';
import FlameGraphStore from './FlameGraphStore';
export interface FlameNodeMetadata {
    count: number;
    ids: string[];
    sum: number;
    mean: number;
    layer: string;
}
export interface FlameNode {
    name: string;
    value: number;
    children: FlameNode[];
    _inner: FlameNodeMetadata;
}
export interface SenecaSharedInstance {
    flameDataQueue: FlameDataQueue;
    flameGraphStore: FlameGraphStore;
}
export interface SpecMetadataPlugin {
    full: string;
    name: string;
    fullname: string;
}
export declare type SpecMetadataParent = string[];
export interface SpecMetadataTrace {
    desc: SpecMetadataParent[];
    trace: SpecMetadataTrace[];
}
export interface SpecMetadata {
    start: number;
    mi: string;
    tx: string;
    id: string;
    version: string;
    sync: boolean;
    remote: boolean;
    timeout: number;
    instance: string;
    tag: string;
    seneca: string;
    custom: object;
    plugin: SpecMetadataPlugin;
    prior?: string;
    caller: string;
    parents: SpecMetadataParent[];
    trace: SpecMetadataTrace[];
    err?: string;
    error: boolean;
    pattern: string;
    action: string;
    end: number;
}
export interface SpecData {
    meta: SpecMetadata;
    msg: object;
    res: object;
    has_callback: boolean;
    err?: string;
}
export declare type NodeQueueData = {
    id: string;
    pattern: string;
    action: string;
    name: string;
    executionTime: number;
    parent?: string;
    _limitCount?: number;
};
