export { rainScene } from "./rain";
export { fireScene } from "./fire";
export { snowScene } from "./snow";
export { starsScene } from "./stars";
export { auroraScene } from "./aurora";
export { firefliesScene } from "./fireflies";
export { oceanScene } from "./ocean";
export { bubblesScene } from "./bubbles";
export type { SceneDefinition, SceneParams, SceneState } from "./types";

import { rainScene } from "./rain";
import { fireScene } from "./fire";
import { snowScene } from "./snow";
import { starsScene } from "./stars";
import { auroraScene } from "./aurora";
import { firefliesScene } from "./fireflies";
import { oceanScene } from "./ocean";
import { bubblesScene } from "./bubbles";
import type { SceneDefinition } from "./types";

export const scenes: SceneDefinition[] = [
  rainScene,
  fireScene,
  snowScene,
  starsScene,
  auroraScene,
  firefliesScene,
  oceanScene,
  bubblesScene,
];
