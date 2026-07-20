export interface Coordinate {
  x: number;
  y: number;
}

export interface GraphNode {
  id: string;
  coords: Coordinate;
}

export interface GraphEdge {
  from: string;
  to: string;
  weight: number; // طول مسیر
}
