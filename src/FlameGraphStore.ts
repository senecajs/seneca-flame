import { FlameNode, NodeQueueData } from './types'

/*
 * Each instance of `FlameGraphStore` represents a FlameNode.
*/
export default class FlameGraphStore {
  private flameGraph: FlameNode

  constructor() {
    this.flameGraph = {
      name: 'root',
      value: 0,
      children: [],
      _inner: {
        count: 0,
        ids: [],
        layer: 'root',
        mean: 0,
        sum: 0,
      },
    }
  }

  private buildFlameNode(name: string, value: number, id: string): FlameNode {
    return {
      name: name.toLowerCase(),
      value,
      children: [],
      _inner: {
        count: 1,
        sum: value,
        mean: value,
        layer: 'action',
        ids: [id],
      },
    }
  }

  private updateFlameNode(node: FlameNode, value: number, id: string) {
    node._inner.count += 1
    node._inner.ids.push(id)
    node._inner.sum += value
    node._inner.mean = node._inner.sum / node._inner.count
    node.value = node._inner.mean
  }

  private updateBasePluginFlameNode(node: FlameNode) {
    node.value = node.children.reduce((p, c) => p + c.value, 0)
  }

  private findParentById(node: FlameNode, parentId: string): FlameNode | null {
    const stack: FlameNode[] = []
    let currentNode
    stack.push(node)
    while (stack.length) {
      currentNode = stack.pop()
      if (!currentNode) {
        return null
      }
      if (currentNode._inner.ids.includes(parentId)) {
        return currentNode
      } else if (currentNode.children && currentNode.children.length) {
        currentNode.children.forEach((c) => stack.push(c))
      }
    }
    return null
  }

  private findParentByName(node: FlameNode, name: string): FlameNode | null {
    const stack: FlameNode[] = []
    let currentNode
    stack.push(node)
    while (stack.length) {
      currentNode = stack.pop()
      if (!currentNode) {
        return null
      }
      if (currentNode.name.toLowerCase() === name.toLowerCase()) {
        return currentNode
      } else if (currentNode.children && currentNode.children.length) {
        currentNode.children.forEach((c) => stack.push(c))
      }
    }
    return null
  }

  private handlePluginBaseInsertion(name: string, value: number): FlameNode {
    const pluginIsChildrenAlready = this.flameGraph.children.find(
      (c) => c.name.toLowerCase() === name.toLowerCase()
    )
    if (!pluginIsChildrenAlready) {
      const basePluginFlameNode: FlameNode = {
        name: name.toLowerCase(),
        value,
        children: [],
        _inner: {
          count: 1,
          sum: value,
          mean: value,
          layer: 'plugin',
          ids: [],
        },
      }
      this.flameGraph.children.push(basePluginFlameNode)
      return basePluginFlameNode
    }
    return pluginIsChildrenAlready
  }

  private handleActionInsertion(
    pluginNode: FlameNode,
    pattern: string,
    id: string,
    value: number,
    parentId?: string
  ) {
    if (parentId) {
      const parentNode = this.findParentById(pluginNode, parentId)
      if (!parentNode) {
        throw new Error("Caught a bug in FlameGraphStore.ts\nParent not found, even tough child has parent ID");
      }
      const actionNode = this.findParentByName(parentNode, pattern)
      if (actionNode) {
        this.updateFlameNode(actionNode, value, id)
      } else {
        parentNode.children.push(this.buildFlameNode(pattern, value, id))
      }
    } else {
      const parentNode = this.findParentByName(pluginNode, pattern)
      if (parentNode) {
        this.updateFlameNode(parentNode, value, id)
      } else {
        pluginNode.children.push(this.buildFlameNode(pattern, value, id))
      }
    }
    this.updateBasePluginFlameNode(pluginNode)
  }

  get() {
    return this.flameGraph
  }

  handle(data: NodeQueueData): boolean | NodeQueueData {
    const { pattern, action, executionTime, name, id, parent } = data
    const patternActionName = `${action} : ${pattern}`
    const flameRootNode = this.handlePluginBaseInsertion(name, executionTime)
    if (parent) {
      const parentNode = this.findParentById(flameRootNode, parent)
      if (!parentNode) {
        if (!data._limitCount) {
          data._limitCount = 1
        } else {
          data._limitCount += 1
        }
        return data
      }
      this.handleActionInsertion(
        flameRootNode,
        patternActionName,
        id,
        executionTime,
        parent
      )
    } else {
      this.handleActionInsertion(
        flameRootNode,
        patternActionName,
        id,
        executionTime
      )
    }
    return true
  }
}
