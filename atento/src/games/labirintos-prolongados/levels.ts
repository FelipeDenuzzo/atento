import { MazeLevelConfig } from "./types";

export const defaultLongMazesLevels = (): MazeLevelConfig[] => [
  {
    id: 1,
    name: "Nível 1",
    width: 15,
    height: 15,
    timeLimitSec: 180,
    minSolutionLength: 20,
  },
  {
    id: 2,
    name: "Nível 2",
    width: 25,
    height: 25,
    timeLimitSec: 220,
    minSolutionLength: 45,
  },
  {
    id: 3,
    name: "Nível 3",
    width: 35,
    height: 35,
    timeLimitSec: 260,
    minSolutionLength: 80,
  },
  {
    id: 4,
    name: "Nível 4",
    width: 41,
    height: 41,
    timeLimitSec: 300,
    minSolutionLength: 110,
  },
];
