declare module 'react-plotly.js' {
  import { Component } from 'react';
  
  interface PlotParams {
    data: Record<string, unknown>[];
    layout?: Record<string, unknown>;
    config?: Record<string, unknown>;
    style?: React.CSSProperties;
    className?: string;
    useResizeHandler?: boolean;
    [key: string]: unknown;
  }
  
  export default class Plot extends Component<PlotParams> {}
}