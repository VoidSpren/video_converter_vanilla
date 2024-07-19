export interface ConvertionConfig{
  width?: number;
  height?: number;
  bitrate?: number;
  fps?: number;
  minorSideRes: boolean;
  cbr: boolean;
}

declare global {
  interface Window {
    electron:{
      selectDir: () => Promise<string>,
      processVideos: (info: {paths: string[], config: ConvertionConfig}) => void,
      cancelProcess: () => void,
      onProcessInfo: (callback: (info: string) => void) => void,
      onProcessEnd: (callback: () => void) => void,
      app: () => Promise<{
        filename: string;
        dirname: string;
      }>
    }
  }
}