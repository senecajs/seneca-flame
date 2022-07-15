import FlameDataQueue from './FlameDataQueue'
import FlameGraphStore from './FlameGraphStore'

/*
 * This is the Metadata from each FlameNode,
 * It's used internally to calculate some values.
*/
export interface FlameNodeMetadata {
  count: number
  ids: string[]
  sum: number
  mean: number
  layer: string
}

/*
 * This is the FlameNode that represents the tree-graph
*/
export interface FlameNode {
  name: string
  value: number
  children: FlameNode[]
  _inner: FlameNodeMetadata
}

/*
 * Seneca shared instances of FlameDataQueue and FlameGraphStore
*/
export interface SenecaSharedInstance {
  flameDataQueue: FlameDataQueue
  flameGraphStore: FlameGraphStore
}

/*
 * Spec Metadata Plugin field values
*/
export interface SpecMetadataPlugin {
  full: string
  name: string
  fullname: string
}

export type SpecMetadataParent = string[]

/*
 * Spec trace from Ordu
*/
export interface SpecMetadataTrace {
  desc: SpecMetadataParent[]
  trace: SpecMetadataTrace[]
}

/*
 * Spec Metadata from Ordu
*/
export interface SpecMetadata {
  start: number
  mi: string
  tx: string
  id: string
  version: string
  sync: boolean
  remote: boolean
  timeout: number
  instance: string
  tag: string
  seneca: string
  custom: object
  plugin: SpecMetadataPlugin
  prior?: string
  caller: string
  parents: SpecMetadataParent[]
  trace: SpecMetadataTrace[]
  err?: string
  error: boolean
  pattern: string
  action: string
  end: number
}

/*
 * Spec data from Ordu
*/
export interface SpecData {
  meta: SpecMetadata
  msg: object
  res: object
  has_callback: boolean
  err?: string
}

/*
 * This is the raw queue data
 * That ideally will be turned into FlameNode
*/
export type NodeQueueData = {
  id: string
  pattern: string
  action: string
  name: string
  executionTime: number
  parent?: string
  _limitCount?: number
}
