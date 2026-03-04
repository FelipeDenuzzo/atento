export type MazeCell = 0 | 1;

export type Point = {
  x: number;
  y: number;
};

export type MazeLevelConfig = {
  id: number;
  name: string;
  width: number;
  height: number;
  timeLimitSec: number;
  minSolutionLength: number;
};

export type MazeData = {
  grid: MazeCell[][];
  start: Point;
  end: Point;
  shortestPathLength: number;
};

export type MazeDirection = "up" | "down" | "left" | "right";

export type MazeSessionResult = {
  success: boolean;
  levelId: number;
  levelName: string;
  elapsedMs: number;
  timeLimitSec: number;
  steps: number;
  revisits: number;
  shortestPathLength: number;
  efficiency: number | null;
};

export type MazeSessionLog = MazeSessionResult & {
  dateIso: string;
};
