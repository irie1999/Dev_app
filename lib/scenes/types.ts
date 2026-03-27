export interface SceneParams {
  speed: number;      // 0-1  速さ
  intensity: number;  // 0-1  輝き・強さ
  density: number;    // 0-1  密度・数
  hue: number;        // 0-1  色相 (0-360にマッピング)
  brightness: number; // 0-1  明るさ
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type SceneState = Record<string, any>;

export interface SceneDefinition {
  id: string;
  name: string;
  icon: string;
  description: string;
  gradient: string;
  textColor: string;
  defaultParams: SceneParams;
  init: (w: number, h: number) => SceneState;
  render: (
    ctx: CanvasRenderingContext2D,
    state: SceneState,
    params: SceneParams,
    dt: number,
    w: number,
    h: number,
  ) => SceneState;
}
