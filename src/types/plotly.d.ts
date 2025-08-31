// Type declarations for react-plotly.js
declare module 'react-plotly.js' {
  import { Component } from 'react';

  export interface PlotData {
    x?: number[] | string[];
    y?: number[] | string[];
    type?: string;
    mode?: string;
    name?: string;
    line?: {
      color?: string;
      width?: number;
    };
    marker?: {
      color?: string;
      size?: number;
    };
    [key: string]: any;
  }

  export interface PlotLayout {
    title?: string | { text: string; font?: any };
    xaxis?: {
      title?: string;
      type?: string;
      range?: [number, number];
    };
    yaxis?: {
      title?: string;
      type?: string;
      range?: [number, number];
    };
    width?: number;
    height?: number;
    margin?: {
      l?: number;
      r?: number;
      t?: number;
      b?: number;
    };
    showlegend?: boolean;
    [key: string]: any;
  }

  export interface PlotConfig {
    displayModeBar?: boolean;
    responsive?: boolean;
    toImageButtonOptions?: {
      format?: string;
      filename?: string;
      height?: number;
      width?: number;
      scale?: number;
    };
    [key: string]: any;
  }

  export interface PlotProps {
    data: PlotData[];
    layout?: Partial<PlotLayout>;
    config?: Partial<PlotConfig>;
    style?: React.CSSProperties;
    className?: string;
    onInitialized?: (figure: any, graphDiv: HTMLElement) => void;
    onUpdate?: (figure: any, graphDiv: HTMLElement) => void;
    onPurge?: (figure: any, graphDiv: HTMLElement) => void;
    onError?: (err: any) => void;
    [key: string]: any;
  }

  export default class Plot extends Component<PlotProps> {}
}