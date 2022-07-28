import FlameGraphStore from './FlameGraphStore'
import { NodeQueueData } from './types'

/*
 * The `FlameDataQueue` class is responsible for managing
 * the queue, wich is the data that will be processed and
 * inserted into the `FlameGraphStore` class.
*/

export default class FlameDataQueue {
  private queue: NodeQueueData[]
  private flameGraphStore: FlameGraphStore

  constructor(flameGraphStore: FlameGraphStore) {
    this.flameGraphStore = flameGraphStore
    this.queue = []
  }

  /*
   * This is a bit tricky,
   * In seneca we have an action like
   * A => B => C
   * But Ordu handles them in reverse order.
   * So the `setTimeOut` function is actually to watch if more actions are coming, before
   * handling them.
   * When the queue is "filled", it gets sorted and then gets processed.
   */
  private act(): any {
    if (this.queue.length === 0) {
      return
    }
    const currentQueueSize = this.queue.length
    this.queue = this.queue.sort((a, b) => (a.parent ? -1 : 1))
    const processQueue = () => {
      while (this.queue.length) {
        const current = this.queue.pop()
        if (current) {
          const response = this.flameGraphStore.handle(current)
          if (typeof response !== 'boolean') {
            if (response._limitCount && response._limitCount !== 5) {
              this.queue.unshift(response)
            }
          }
        }
      }
      return this.act()
    }
    setTimeout(() => {
      if (this.queue.length !== currentQueueSize) {
        return this.act()
      }
      return processQueue()
    }, 50)
  }

  push(nodeQueueData: NodeQueueData) {
    this.queue.push(nodeQueueData)
    this.act()
  }
}
