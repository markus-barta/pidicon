/// <reference types="vite/client" />

declare module '@pidicon/lib/*' {
  export const getSimplePerformanceColor: (frametime: number) => number[];
  export default any;
}
