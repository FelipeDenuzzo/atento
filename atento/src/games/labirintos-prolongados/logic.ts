import {
  MazeCell,
  MazeData,
  MazeDirection,
  MazeLevelConfig,
  MazeSessionLog,
  MazeSessionResult,
  Point,
} from "./types";

export const LONG_MAZES_LOG_KEY = "atento.longMazes.logs";

function randomItem<T>(items: T[], rng: () => number): T {
  return items[Math.floor(rng() * items.length)];
}

function keyOf(point: Point): string {
  return `${point.x},${point.y}`;
}

function makeOdd(value: number): number {
  return value % 2 === 0 ? value - 1 : value;
}

function createFilledGrid(width: number, height: number, fill: MazeCell): MazeCell[][] {
  return Array.from({ length: height }, () => Array.from({ length: width }, () => fill));
}

function bfsDistances(grid: MazeCell[][], start: Point): number[][] {
  const height = grid.length;
  const width = grid[0]?.length ?? 0;
  const dist = createFilledGrid(width, height, -1 as unknown as MazeCell).map((row) =>
    row.map(() => -1),
  );

  const queue: Point[] = [start];
  dist[start.y][start.x] = 0;

  for (let head = 0; head < queue.length; head += 1) {
    const current = queue[head];
    const nextDist = dist[current.y][current.x] + 1;

    const neighbors = [
      { x: current.x + 1, y: current.y },
      { x: current.x - 1, y: current.y },
      { x: current.x, y: current.y + 1 },
      { x: current.x, y: current.y - 1 },
    ];

    neighbors.forEach((neighbor) => {
      if (
        neighbor.x < 0 ||
        neighbor.y < 0 ||
        neighbor.x >= width ||
        neighbor.y >= height ||
        grid[neighbor.y][neighbor.x] === 1 ||
        dist[neighbor.y][neighbor.x] !== -1
      ) {
        return;
      }

      dist[neighbor.y][neighbor.x] = nextDist;
      queue.push(neighbor);
    });
  }

  return dist;
}

export function shortestPathLength(grid: MazeCell[][], start: Point, end: Point): number {
  const dist = bfsDistances(grid, start);
  return dist[end.y][end.x];
}

export function isMazeSolvable(grid: MazeCell[][], start: Point, end: Point): boolean {
  return shortestPathLength(grid, start, end) >= 0;
}

function farthestReachable(grid: MazeCell[][], start: Point): Point {
  const dist = bfsDistances(grid, start);
  let farthest = start;
  let best = -1;

  for (let y = 0; y < dist.length; y += 1) {
    for (let x = 0; x < dist[0].length; x += 1) {
      if (dist[y][x] > best) {
        best = dist[y][x];
        farthest = { x, y };
      }
    }
  }

  return farthest;
}

function generatePerfectMaze(width: number, height: number, rng: () => number): MazeCell[][] {
  const grid = createFilledGrid(width, height, 1);
  const stack: Point[] = [{ x: 1, y: 1 }];
  grid[1][1] = 0;

  const directions = [
    { x: 2, y: 0 },
    { x: -2, y: 0 },
    { x: 0, y: 2 },
    { x: 0, y: -2 },
  ];

  while (stack.length > 0) {
    const current = stack[stack.length - 1];

    const candidates = directions
      .map((direction) => ({ x: current.x + direction.x, y: current.y + direction.y }))
      .filter(
        (next) =>
          next.x > 0 &&
          next.y > 0 &&
          next.x < width - 1 &&
          next.y < height - 1 &&
          grid[next.y][next.x] === 1,
      );

    if (candidates.length === 0) {
      stack.pop();
      continue;
    }

    const chosen = randomItem(candidates, rng);
    const wallX = (current.x + chosen.x) / 2;
    const wallY = (current.y + chosen.y) / 2;

    grid[wallY][wallX] = 0;
    grid[chosen.y][chosen.x] = 0;
    stack.push(chosen);
  }

  return grid;
}

export function generateMaze(
  level: MazeLevelConfig,
  rng: () => number = Math.random,
): MazeData {
  const width = makeOdd(level.width);
  const height = makeOdd(level.height);
  const start: Point = { x: 1, y: 1 };

  for (let attempt = 0; attempt < 20; attempt += 1) {
    const grid = generatePerfectMaze(width, height, rng);
    const end = farthestReachable(grid, start);
    const pathLength = shortestPathLength(grid, start, end);

    if (pathLength >= level.minSolutionLength) {
      return {
        grid,
        start,
        end,
        shortestPathLength: pathLength,
      };
    }
  }

  const fallbackGrid = generatePerfectMaze(width, height, rng);
  const fallbackEnd = farthestReachable(fallbackGrid, start);
  const fallbackLength = shortestPathLength(fallbackGrid, start, fallbackEnd);

  return {
    grid: fallbackGrid,
    start,
    end: fallbackEnd,
    shortestPathLength: fallbackLength,
  };
}

export function movePlayer(
  grid: MazeCell[][],
  player: Point,
  direction: MazeDirection,
): { position: Point; blocked: boolean } {
  const delta =
    direction === "up"
      ? { x: 0, y: -1 }
      : direction === "down"
        ? { x: 0, y: 1 }
        : direction === "left"
          ? { x: -1, y: 0 }
          : { x: 1, y: 0 };

  const next = { x: player.x + delta.x, y: player.y + delta.y };

  if (
    next.x < 0 ||
    next.y < 0 ||
    next.y >= grid.length ||
    next.x >= grid[0].length ||
    grid[next.y][next.x] === 1
  ) {
    return { position: player, blocked: true };
  }

  return { position: next, blocked: false };
}

export function hasReachedEnd(player: Point, end: Point): boolean {
  return player.x === end.x && player.y === end.y;
}

export function isTimeExpired(elapsedMs: number, timeLimitSec: number): boolean {
  return elapsedMs >= timeLimitSec * 1000;
}

export function buildResult(input: {
  success: boolean;
  level: MazeLevelConfig;
  elapsedMs: number;
  steps: number;
  revisits: number;
  shortestPathLength: number;
}): MazeSessionResult {
  const efficiency =
    input.shortestPathLength > 0 ? input.steps / input.shortestPathLength : null;

  return {
    success: input.success,
    levelId: input.level.id,
    levelName: input.level.name,
    elapsedMs: input.elapsedMs,
    timeLimitSec: input.level.timeLimitSec,
    steps: input.steps,
    revisits: input.revisits,
    shortestPathLength: input.shortestPathLength,
    efficiency,
  };
}

export function registerVisit(visitedKeys: Set<string>, point: Point): boolean {
  const key = keyOf(point);
  if (visitedKeys.has(key)) {
    return true;
  }
  visitedKeys.add(key);
  return false;
}

export function buildSessionLog(result: MazeSessionResult): MazeSessionLog {
  return {
    ...result,
    dateIso: new Date().toISOString(),
  };
}

export function saveSessionLog(log: MazeSessionLog): void {
  if (typeof window === "undefined") return;

  try {
    const raw = localStorage.getItem(LONG_MAZES_LOG_KEY);
    const items: MazeSessionLog[] = raw ? JSON.parse(raw) : [];
    items.push(log);
    localStorage.setItem(LONG_MAZES_LOG_KEY, JSON.stringify(items));
  } catch (error) {
    console.error("Failed to save long mazes log:", error);
  }
}
