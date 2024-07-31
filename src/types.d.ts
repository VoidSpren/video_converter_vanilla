export type ConvertionConfig = {
  width?: number;
  height?: number;
  bitrate?: number;
  fps?: number;
  minorSideRes: boolean;
  cbr: boolean;
  trail?: string;
}

export type AppConfig = {
  width?: number;
  height?: number;
  bitrate?: number;
  fps?: number;
  minorSideRes?: boolean;
  cbr?: boolean;
  directory?: string;
  trail?: string;
}

export type AppInfo = {
  filename: string;
  dirname: string;
  configInfo: AppConfig;
}

declare global {
  interface Window {
    electron:{
      selectDir: () => Promise<string>,
      processVideos: (info: {paths: string[], config: ConvertionConfig[]}) => void,
      cancelProcess: () => void,
      onProcessInfo: (callback: (info: string) => void) => void,
      onProcessEnd: (callback: () => void) => void,
      app: () => Promise<AppInfo>
    }
  }
}