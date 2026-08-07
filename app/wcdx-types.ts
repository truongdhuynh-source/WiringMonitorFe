export type Language = "vi" | "en" | "ja";

export type Terminal = {
  connectId: number;
  partId: number;
  termId: number;
  deviceNum: string;
  termNum: string;
  assyNum: string;
  circuitType: string;
  wireType: string;
  wireSize: string;
  wireColor: string;
  comment: string;
  partName: string;
  typeNum: string;
  termType: string;
  termSize: string;
  targetTorque: string;
  maxTorque: string;
  minTorque: string;
  x: number;
  y: number;
  termDirection: number;
  termHeight: number;
  termLevel: number;
};

export type Wire = {
  fromToId: number;
  displayOrder: number;
  lineNo: string;
  fromStatus: string;
  toStatus: string;
  wireType: string;
  wireSize: string;
  wireColor: string;
  cableNo: string;
  cableType: string;
  cableSize: string;
  cableColor: string;
  length: number;
  remarks: string;
  from: Terminal;
  to: Terminal;
};

export type Page = {
  pageId: number;
  pageNo: string;
  pageName: string;
  pageComment: string;
  displayOrder: number;
  left: number;
  right: number;
  top: number;
  bottom: number;
  mimeType: string;
  imageSize: number;
  imageWidth: number;
  imageHeight: number;
  imageDataUrl: string;
};

export type Part = {
  partId: number;
  pageId: number;
  deviceNum: string;
  assyNum: string;
  partName: string;
  typeNum: string;
  x: number;
  y: number;
  left: number;
  right: number;
  top: number;
  bottom: number;
};

export type RouteSegment = {
  fromToId: number | null;
  pageId: number;
  order: number;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  color: string;
};

export type WcdxResult = {
  fileName: string;
  pageCount: number;
  pages: Page[];
  parts: Part[];
  routeSegments: RouteSegment[];
  wires: Wire[];
};

export type LogEntry = {
  timestamp: string;
  action: string;
  wire?: Wire;
  status?: string;
};
