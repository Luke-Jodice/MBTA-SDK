import requests
import heapq

MBTA_BASE = "https://api-v3.mbta.com"
HEADERS = {}  # {"x-api-key": "YOUR_KEY"}

SUBWAY_ROUTES = ["Red", "Orange", "Blue", "Green-B", "Green-C", "Green-D", "Green-E"]

STOP_COST = 1       # cost per stop travelled
TRANSFER_COST = 5   # extra penalty for switching lines

def build_graph():
    """
    Build a weighted graph where each edge carries:
      - the travel cost (STOP_COST)
      - the route it belongs to (for transfer detection)
    """
    # graph[stop_id] = list of (neighbor_id, route_id)
    graph = {}
    stop_names = {}
    stop_routes = {}

    for route_id in SUBWAY_ROUTES:
        url = f"{MBTA_BASE}/stops?filter[route]={route_id}"
        response = requests.get(url, headers=HEADERS)
        stops = response.json().get("data", [])

        stop_ids = []
        for stop in stops:
            sid = stop["id"]
            stop_names[sid] = stop["attributes"]["name"]
            stop_routes.setdefault(sid, set()).add(route_id)
            stop_ids.append(sid)
            graph.setdefault(sid, [])

        for i, sid in enumerate(stop_ids):
            if i > 0:
                prev = stop_ids[i - 1]
                graph[sid].append((prev, route_id))
                graph[prev].append((sid, route_id))

    return graph, stop_names, stop_routes


def dijkstra(graph, stop_routes, start_id, end_id):
    """
    Weighted Dijkstra where:
      - each hop costs STOP_COST
      - switching lines mid-journey costs an additional TRANSFER_COST
    
    State: (cost, stop_id, route_we_arrived_on)
    """
    # (cost, stop_id, arrived_via_route, path)
    heap = [(0, start_id, None, [start_id])]
    visited = {}  # stop_id -> (best_cost, best_route)

    while heap:
        cost, node, arrived_route, path = heapq.heappop(heap)

        # If we've visited this node on the same (or any) route cheaper, skip
        if node in visited and visited[node] <= cost:
            continue
        visited[node] = cost

        if node == end_id:
            return cost, path

        for neighbor, edge_route in graph.get(node, []):
            transfer_penalty = 0
            if arrived_route is not None and edge_route != arrived_route:
                # Check if this stop is a true interchange (serves both lines)
                if arrived_route in stop_routes.get(node, set()) and \
                   edge_route in stop_routes.get(node, set()):
                    transfer_penalty = TRANSFER_COST

            new_cost = cost + STOP_COST + transfer_penalty
            heapq.heappush(heap, (new_cost, neighbor, edge_route, path + [neighbor]))

    return float("inf"), []


def find_stop_id(query, stop_names):
    query = query.lower()
    return [(sid, name) for sid, name in stop_names.items() if query in name.lower()]


def describe_path(path, cost, stop_names, stop_routes):
    print(f"\nRoute: {len(path) - 1} hops — weighted cost: {cost}\n")
    prev_route = None
    current_line = None

    # Reconstruct which route was used at each step by checking shared routes
    for i, sid in enumerate(path):
        name = stop_names.get(sid, sid)
        routes = stop_routes.get(sid, set())

        tag = ""
        if i < len(path) - 1:
            next_sid = path[i + 1]
            next_routes = stop_routes.get(next_sid, set())
            shared = routes & next_routes
            if shared:
                next_line = sorted(shared)[0]
                if current_line and next_line != current_line:
                    tag = f"  ← TRANSFER to {next_line}"
                current_line = next_line

        prefix = " " if i == 0 else "→"
        print(f"  {prefix} {name}{tag}")


# --- Run it ---
graph, stop_names, stop_routes = build_graph()

origin = "Alewife"
destination = "Boylston"

start_matches = find_stop_id(origin, stop_names)
end_matches = find_stop_id(destination, stop_names)

if not start_matches:
    print(f"Could not find stop: {origin}")
elif not end_matches:
    print(f"Could not find stop: {destination}")
else:
    start_id = start_matches[0][0]
    end_id = end_matches[0][0]

    print(f"Finding route: {stop_names[start_id]} → {stop_names[end_id]}")
    cost, path = dijkstra(graph, stop_routes, start_id, end_id)

    if not path:
        print("No route found.")
    else:
        describe_path(path, cost, stop_names, stop_routes)