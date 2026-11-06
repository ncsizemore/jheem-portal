declare module 'react-simple-maps' {
  import type { ComponentType, ReactNode, SVGProps } from 'react';

  export interface GeographyObject {
    rsmKey: string;
    properties: Record<
      string,
      string | number | boolean | null | undefined
    >;
  }

  export interface ComposableMapProps extends SVGProps<SVGSVGElement> {
    projection?:
      | string
      | (((coordinates: [number, number]) => [number, number]) & {
          invert: (coordinates: [number, number]) => [number, number];
        });
    projectionConfig?: Record<string, unknown>;
    width?: number;
    height?: number;
  }

  export interface GeographiesProps {
    geography: string | Record<string, unknown>;
    children: (args: { geographies: GeographyObject[] }) => ReactNode;
  }

  type GeographyStyleState = Omit<SVGProps<SVGPathElement>, 'style'> & {
    outline?: string;
  };

  export interface GeographyProps
    extends Omit<SVGProps<SVGPathElement>, 'style'> {
    geography: GeographyObject;
    style?: {
      default?: GeographyStyleState;
      hover?: GeographyStyleState;
      pressed?: GeographyStyleState;
    };
  }

  export const ComposableMap: ComponentType<ComposableMapProps>;
  export const Geographies: ComponentType<GeographiesProps>;
  export const Geography: ComponentType<GeographyProps>;
  export interface MapPosition {
    coordinates: [number, number];
    zoom: number;
  }
  export const ZoomableGroup: ComponentType<
    SVGProps<SVGGElement> & {
      center?: [number, number];
      zoom?: number;
      minZoom?: number;
      maxZoom?: number;
      translateExtent?: [[number, number], [number, number]];
      onMoveStart?: () => void;
      onMoveEnd?: (position: MapPosition) => void;
    }
  >;
  export function useZoomPanContext(): { k: number };
}
