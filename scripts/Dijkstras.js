/**
 * Weighted Dijkstra's algorithm implementation for MBTA-SDK.
 * 
 * This implementation considers:
 * - STOP_COST: The cost of traveling between two adjacent stops.
 * - TRANSFER_COST: An additional penalty for switching between different transit lines.
 */

class PriorityQueue {
  constructor() {
    this.heap = [];
  }

  push(element, priority) {
    const node = { element, priority };
    this.heap.push(node);
    this.bubbleUp();
  }

  pop() {
    if (this.isEmpty()) return null;
    if (this.heap.length === 1) return this.heap.pop();

    const top = this.heap[0];
    this.heap[0] = this.heap.pop();
    this.bubbleDown();
    return top;
  }

  isEmpty() {
    return this.heap.length === 0;
  }

  bubbleUp() {
    let index = this.heap.length - 1;
    while (index > 0) {
      let parentIndex = Math.floor((index - 1) / 2);
      if (this.heap[parentIndex].priority <= this.heap[index].priority) break;
      [this.heap[parentIndex], this.heap[index]] = [this.heap[index], this.heap[parentIndex]];
      index = parentIndex;
    }
  }

  bubbleDown() {
    let index = 0;
    while (true) {
      let leftChildIndex = 2 * index + 1;
      let rightChildIndex = 2 * index + 2;
      let smallestIndex = index;

      if (
        leftChildIndex < this.heap.length &&
        this.heap[leftChildIndex].priority < this.heap[smallestIndex].priority
      ) {
        smallestIndex = leftChildIndex;
      }

      if (
        rightChildIndex < this.heap.length &&
        this.heap[rightChildIndex].priority < this.heap[smallestIndex].priority
      ) {
        smallestIndex = rightChildIndex;
      }

      if (smallestIndex === index) break;

      [this.heap[smallestIndex], this.heap[index]] = [this.heap[index], this.heap[smallestIndex]];
      index = smallestIndex;
    }
  }
}

const STOP_COST = 1;
const TRANSFER_COST = 3;

/**
 * Weighted Dijkstra where:
 * - each hop costs STOP_COST
 * - switching lines mid-journey costs an additional TRANSFER_COST
 * 
 * @param {Object} graph - stop_id -> Array of { neighbor_id, route_id }
 * @param {Object} stop_routes - stop_id -> Set of route_ids
 * @param {string} start_id - Starting stop ID
 * @param {string} end_id - Destination stop ID
 * @returns {Object} { cost: number, path: Array<string> }
 */
function dijkstra(graph, stop_routes, start_id, end_id) {
  const pq = new PriorityQueue();
  // element: { node, arrived_route, path }, priority: cost
  pq.push({ node: start_id, arrived_route: null, path: [start_id] }, 0);

  const visited = new Map(); // stop_id:route_id -> cost

  while (!pq.isEmpty()) {
    const { element, priority: cost } = pq.pop();
    const { node, arrived_route, path } = element;

    const stateKey = `${node}:${arrived_route}`;
    if (visited.has(stateKey) && visited.get(stateKey) <= cost) {
      continue;
    }
    visited.set(stateKey, cost);

    if (node === end_id) {
      return { cost, path };
    }

    const neighbors = graph[node] || [];
    for (const { neighbor_id: neighbor, route_id: edge_route } of neighbors) {
      let transfer_penalty = 0;
      if (arrived_route !== null && edge_route !== arrived_route) {
        // Check if this stop is an interchange for both lines
        if (
          stop_routes[node]?.has(arrived_route) &&
          stop_routes[node]?.has(edge_route)
        ) {
          transfer_penalty = TRANSFER_COST;
        }
      }

      const new_cost = cost + STOP_COST + transfer_penalty;
      pq.push(
        {
          node: neighbor,
          arrived_route: edge_route,
          path: [...path, neighbor],
        },
        new_cost
      );
    }
  }

  return { cost: Infinity, path: [] };
}

export { dijkstra, PriorityQueue, STOP_COST, TRANSFER_COST };
