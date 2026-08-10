"use client";
/* eslint-disable @next/next/no-img-element */

import {
  memo,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type PointerEvent,
  type WheelEvent,
} from "react";
import { translations } from "./i18n";
import styles from "./page.module.css";
import type {
  Language,
  LogEntry,
  Page,
  Part,
  RouteSegment,
  Terminal,
  WcdxResult,
  Wire,
} from "./wcdx-types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:9888";
type CompletionCommand = "from" | "to" | "both";
type CompletionStatus = "1" | "2";

function isFinalStatus(status: string) {
  return status === "1";
}

function isPerformedStatus(status: string) {
  return status === "1" || status === "2";
}

function FileIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" /><path d="M14 2v6h6M8 13h8M8 17h5" /></svg>;
}

function statusSymbol(from: string, to: string) {
  const key = `${from || "0"}-${to || "0"}`;
  return ({
    "0-0": "",
    "1-0": "\u25cb",
    "0-1": "\u25cf",
    "1-2": "\u25b3",
    "2-1": "\u25b2",
    "2-0": "\u25c7",
    "0-2": "\u25c6",
    "1-1": "\u25ce",
    "2-2": "\u25a1",
  } as Record<string, string>)[key] ?? "";
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

function drawingPoint(page: Page, x: number, y: number) {
  return {
    x: ((x - page.left) / (page.right - page.left)) * 100,
    y: ((page.top - y) / (page.top - page.bottom)) * 100,
  };
}

const DrawingOverlay = memo(function DrawingOverlay({ page, segments, parts, selectedWireId }: { page: Page; segments: RouteSegment[]; parts: Part[]; selectedWireId: number | null }) {
  return <svg className={styles.overlay} viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
    {segments.map((segment, index) => { const a = drawingPoint(page, segment.startX, segment.startY), b = drawingPoint(page, segment.endX, segment.endY), selected = segment.fromToId === selectedWireId; return <line key={`${segment.fromToId}-${segment.order}-${index}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={selected ? "#ef233c" : segment.color} className={selected ? styles.selectedRoute : segment.fromToId == null ? styles.baseRoute : styles.wireRoute} />; })}
    {parts.map((part) => { const a = drawingPoint(page, part.left, part.top), b = drawingPoint(page, part.right, part.bottom); return <g key={part.partId}><rect x={a.x} y={a.y} width={b.x - a.x} height={b.y - a.y} className={styles.partBox} /><text x={a.x + .3} y={a.y + 1.4}>{part.deviceNum}</text></g>; })}
  </svg>;
});

export default function Home() {
  const inputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const navigationRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const resultRef = useRef<WcdxResult | null>(null);
  const panRef = useRef({ x: 0, y: 0, left: 0, top: 0 });
  const wheelFrameRef = useRef<number | null>(null);
  const wheelDeltaRef = useRef(0);
  const zoomAnchorRef = useRef<{ x: number; y: number; mouseX: number; mouseY: number } | null>(null);
  const scrollFrameRef = useRef<number | null>(null);
  const [language, setLanguage] = useState<Language>("en");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [result, setResult] = useState<WcdxResult | null>(null);
  const [activePageId, setActivePageId] = useState<number | null>(null);
  const [selectedWireId, setSelectedWireId] = useState<number | null>(null);
  const [currentSide, setCurrentSide] = useState<"from" | "to">("from");
  const [isPanning, setIsPanning] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [zoom, setZoom] = useState(100);
  const [canvasSize, setCanvasSize] = useState({ width: 900, height: 600 });
  const [navigationSize, setNavigationSize] = useState({ width: 240, height: 320 });
  const [viewport, setViewport] = useState({ left: 0, top: 0, width: 100, height: 100 });
  const [logState, setLogState] = useState<"idle" | "running" | "paused" | "stopped">("idle");
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loggingEverStarted, setLoggingEverStarted] = useState(false);
  const [logPromptSuppressed, setLogPromptSuppressed] = useState(false);
  const [pendingCompletion, setPendingCompletion] = useState<CompletionCommand | null>(null);
  const t = translations[language];
  const logControls = {
    vi: { start: "Bắt đầu", pause: "Tạm dừng", stop: "Kết thúc" },
    en: { start: "Start", pause: "Pause", stop: "Stop" },
    ja: { start: "開始", pause: "休止", stop: "停止" },
  }[language];

  const activePage = result?.pages.find((page) => page.pageId === activePageId) ?? result?.pages[0];
  const selectedWire = result?.wires.find((wire) => wire.fromToId === selectedWireId);
  const currentTerminal = selectedWire?.[currentSide];
  const currentCompletionStatus: CompletionStatus | null =
    selectedWire
      ? getCompletionStatus(selectedWire, currentSide)
      : null;
  const pageParts = useMemo(() => result?.parts.filter((part) => part.pageId === activePage?.pageId) ?? [], [result?.parts, activePage?.pageId]);
  const pageSegments = useMemo(() => result?.routeSegments.filter((segment) => segment.pageId === activePage?.pageId) ?? [], [result?.routeSegments, activePage?.pageId]);
  const availableWidth = Math.max(120, canvasSize.width - 64);
  const availableHeight = Math.max(120, canvasSize.height - 64);
  const fitScale = activePage ? Math.min(availableWidth / activePage.imageWidth, availableHeight / activePage.imageHeight) : 1;
  const stageWidth = activePage ? Math.max(1, activePage.imageWidth * fitScale * zoom / 100) : 1;
  const stageHeight = activePage ? Math.max(1, activePage.imageHeight * fitScale * zoom / 100) : 1;
  const contentWidth = Math.max(availableWidth, stageWidth);
  const contentHeight = Math.max(availableHeight, stageHeight);
  const navigationScale = activePage
    ? Math.min(
      Math.max(1, navigationSize.width - 20) / activePage.imageWidth,
      Math.max(1, navigationSize.height - 20) / activePage.imageHeight,
    )
    : 1;
  const navigationWidth = activePage ? activePage.imageWidth * navigationScale : 1;
  const navigationHeight = activePage ? activePage.imageHeight * navigationScale : 1;

  useEffect(() => {
    resultRef.current = result;
  }, [result]);

  useEffect(() => {
    const navigation = navigationRef.current;
    if (!navigation) return;
    const observer = new ResizeObserver(([entry]) => {
      setNavigationSize({
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      });
    });
    observer.observe(navigation);
    return () => observer.disconnect();
  }, [result]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const observer = new ResizeObserver(([entry]) => {
      setCanvasSize({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [result]);

  useEffect(() => {
    const data = resultRef.current;
    const page = data?.pages.find((item) => item.pageId === activePageId);
    if (!selectedWireId || !page || !canvasRef.current || !stageRef.current) return;
    const segments = data?.routeSegments.filter(
      (segment) => segment.pageId === page.pageId && segment.fromToId === selectedWireId,
    ) ?? [];
    if (!segments.length) return;
    const x = segments.reduce((sum, item) => sum + item.startX + item.endX, 0) / (segments.length * 2);
    const y = segments.reduce((sum, item) => sum + item.startY + item.endY, 0) / (segments.length * 2);
    const px = (x - page.left) / (page.right - page.left);
    const py = (page.top - y) / (page.top - page.bottom);
    requestAnimationFrame(() => {
      const canvas = canvasRef.current;
      const stage = stageRef.current;
      if (!canvas || !stage) return;
      const canvasRect = canvas.getBoundingClientRect();
      const stageRect = stage.getBoundingClientRect();
      const stageLeft = stageRect.left - canvasRect.left + canvas.scrollLeft;
      const stageTop = stageRect.top - canvasRect.top + canvas.scrollTop;
      canvas.scrollTo({
        left: stageLeft + stage.clientWidth * px - canvas.clientWidth / 2,
        top: stageTop + stage.clientHeight * py - canvas.clientHeight / 2,
      });
    });
  }, [selectedWireId, activePageId]);

  useLayoutEffect(() => {
    const anchor = zoomAnchorRef.current;
    const canvas = canvasRef.current;
    const stage = stageRef.current;
    if (!anchor || !canvas || !stage) return;
    const canvasRect = canvas.getBoundingClientRect();
    const stageRect = stage.getBoundingClientRect();
    const stageLeft = stageRect.left - canvasRect.left + canvas.scrollLeft;
    const stageTop = stageRect.top - canvasRect.top + canvas.scrollTop;
    canvas.scrollLeft = stageLeft + anchor.x * stageRect.width - anchor.mouseX;
    canvas.scrollTop = stageTop + anchor.y * stageRect.height - anchor.mouseY;
    zoomAnchorRef.current = null;
  }, [zoom, stageWidth, stageHeight]);

  useEffect(() => () => {
    if (wheelFrameRef.current != null) cancelAnimationFrame(wheelFrameRef.current);
    if (scrollFrameRef.current != null) cancelAnimationFrame(scrollFrameRef.current);
  }, []);

  function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) void openWcdx(file);
  }

  async function openWcdx(file: File) {
    setSelectedFile(file); setResult(null); setDirty(false); setZoom(100);
    setIsLoading(true); setError(""); setNotice("");
    const body = new FormData(); body.append("file", file);
    try {
      const response = await fetch(`${API_URL}/api/wcdx/pages`, { method: "POST", body });
      if (!response.ok) throw new Error(t.readError);
      const data = (await response.json()) as WcdxResult;
      const firstWire = data.wires.find((wire) => !isFinalStatus(wire.fromStatus) || !isFinalStatus(wire.toStatus)) ?? data.wires[0];
      setResult(data); setActivePageId(data.pages[0]?.pageId ?? null); setSelectedWireId(firstWire?.fromToId ?? null);
      setCurrentSide(isFinalStatus(firstWire?.fromStatus ?? "") ? "to" : "from"); setLogs([]); setLogState("idle");
      setLoggingEverStarted(false); setLogPromptSuppressed(false); setPendingCompletion(null);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : t.connectError);
    } finally { setIsLoading(false); }
  }

  function resetViewer() {
    setSelectedFile(null); setResult(null); setActivePageId(null); setSelectedWireId(null); setError(""); setNotice(""); setZoom(100);
    setLogs([]); setLogState("idle"); setLoggingEverStarted(false); setLogPromptSuppressed(false); setPendingCompletion(null);
  }

  function getCompletionStatus(
    wire: Wire,
    side: "from" | "to",
  ): CompletionStatus {
    if (!result) return "1";

    const terminal = wire[side];
    const endpoints = result.wires.flatMap((item) => [
      { wire: item, side: "from" as const, terminal: item.from, status: item.fromStatus },
      { wire: item, side: "to" as const, terminal: item.to, status: item.toStatus },
    ]);
    const isSameTerminal = (candidate: Terminal) =>
      terminal.partId && terminal.termId && candidate.partId && candidate.termId
        ? candidate.partId === terminal.partId && candidate.termId === terminal.termId
        : candidate.deviceNum === terminal.deviceNum && candidate.termNum === terminal.termNum;
    const sameTerminalConnections = endpoints.filter((endpoint) => isSameTerminal(endpoint.terminal));

    // A shared terminal is only finally tightened after every other wire has
    // at least been inserted. Status 2 counts as performed, but not final.
    if (sameTerminalConnections.length > 1) {
      const hasOtherUnperformedConnection = sameTerminalConnections.some((endpoint) => {
        if (endpoint.wire.fromToId === wire.fromToId && endpoint.side === side) return false;
        return !isPerformedStatus(endpoint.status);
      });
      if (hasOtherUnperformedConnection) return "2";
    }

    // Slide 13: same device, same entry direction and within 5 mm horizontally.
    // If a physically lower terminal in that column is not finally tightened,
    // the current terminal remains temporarily tightened.
    const sameColumn = endpoints.filter((endpoint) =>
      endpoint.terminal.partId === terminal.partId &&
      endpoint.terminal.termDirection === terminal.termDirection &&
      Math.abs(endpoint.terminal.x - terminal.x) <= 5,
    );
    const terminalLevel = terminal.termLevel || terminal.termHeight;
    const lowerTerminalIds = new Set(
      sameColumn
        .filter((endpoint) =>
          endpoint.terminal.termId !== terminal.termId &&
          terminalLevel > 0 &&
          (endpoint.terminal.termLevel || endpoint.terminal.termHeight) < terminalLevel,
        )
        .map((endpoint) => endpoint.terminal.termId),
    );
    for (const termId of lowerTerminalIds) {
      const lowerConnections = sameColumn.filter((endpoint) => endpoint.terminal.termId === termId);
      if (!lowerConnections.some((endpoint) => isFinalStatus(endpoint.status))) return "2";
    }

    return "1";
  }

  function selectWire(wire: Wire) {
    setSelectedWireId(wire.fromToId);

    setCurrentSide(
      !isFinalStatus(wire.fromStatus)
        ? "from"
        : "to"
    );

    setZoom(180);

    const route = result?.routeSegments.find(
      (segment) => segment.fromToId === wire.fromToId
    );

    if (route) {
      setActivePageId(route.pageId);
    }
  }

  function addLog(action: string, wire?: Wire, status?: string, force = false) {
    if (!force && logState !== "running" && !["Start", "Resume", "Push", "Stop"].includes(action)) return;
    setLogs((items) => [...items, { timestamp: new Date().toISOString(), action, wire, status }]);
  }

  function replaceWire(id: number, fromStatus: string, toStatus: string, action: string, forceLog = false) {
    const wire = result?.wires.find((item) => item.fromToId === id);
    if (!result || !wire) return;
    const updated = { ...wire, fromStatus, toStatus };
    setResult((current) => current ? {
      ...current,
      wires: current.wires.map((item) => item.fromToId === id ? { ...item, fromStatus, toStatus } : item),
    } : current);
    setDirty(true); setNotice(""); addLog(action, updated, statusSymbol(fromStatus, toStatus), forceLog);
  }

  function selectNext() {
    if (!result?.wires.length) return;
    const index = result.wires.findIndex((wire) => wire.fromToId === selectedWireId);
    selectWire(result.wires[Math.min(result.wires.length - 1, Math.max(0, index + 1))]);
  }

  function requestCompletion(command: CompletionCommand) {
    if (!selectedWire) return;
    if (!loggingEverStarted && !logPromptSuppressed) {
      setPendingCompletion(command);
      return;
    }
    performCompletion(command);
  }

  function performCompletion(
    command: CompletionCommand,
    forceLog = false,
  ) {
    if (!selectedWire) return;

    const fromCompletionStatus = getCompletionStatus(
      selectedWire,
      "from"
    );

    const toCompletionStatus = getCompletionStatus(
      selectedWire,
      "to"
    );

    if (command === "from") {
      replaceWire(
        selectedWire.fromToId,
        fromCompletionStatus,
        selectedWire.toStatus,
        "CompleteFrom",
        forceLog
      );

      setCurrentSide("to");
      return;
    }

    if (command === "to") {
      replaceWire(
        selectedWire.fromToId,
        selectedWire.fromStatus,
        toCompletionStatus,
        "CompleteTo",
        forceLog
      );

      selectNext();
      return;
    }

    replaceWire(
      selectedWire.fromToId,
      fromCompletionStatus,
      toCompletionStatus,
      "CompleteBoth",
      forceLog
    );

    selectNext();
  }

  function resolveLogConfirmation(choice: "yes" | "no" | "cancel") {
    const command = pendingCompletion;
    setPendingCompletion(null);
    if (!command || choice === "cancel") return;
    setLogPromptSuppressed(true);
    if (choice === "yes") {
      setLoggingEverStarted(true);
      setLogState("running");
      addLog("Start", undefined, undefined, true);
      performCompletion(command, true);
    } else {
      performCompletion(command);
    }
  }

  function skipCurrent() {
    if (currentSide === "from") setCurrentSide("to"); else selectNext();
    addLog("Skip", selectedWire);
  }

  function undoCurrent() {
    if (selectedWire) replaceWire(selectedWire.fromToId, "", "", "Undo");
  }

  function clearAll() {
    if (!result || !window.confirm(t.confirmClear)) return;
    setResult({ ...result, wires: result.wires.map((wire) => ({ ...wire, fromStatus: "", toStatus: "" })) });
    setDirty(true); addLog("ClearAll");
  }

  function startLog() {
    if (logState === "running") return;
    const action = logState === "paused" ? "Resume" : "Start";
    setLoggingEverStarted(true);
    setLogPromptSuppressed(true);
    setLogState("running");
    addLog(action, undefined, undefined, true);
  }

  function pauseLog() {
    if (logState !== "running") return;
    addLog("Pause", undefined, undefined, true);
    setLogState("paused");
  }

  function stopLog() {
    if (logState !== "running" && logState !== "paused") return;
    addLog("Stop", undefined, undefined, true);
    setLogState("stopped");
  }

  async function saveWcdx() {
    if (!selectedFile || !result) return;
    setIsSaving(true); setError(""); setNotice("");
    const body = new FormData();
    body.append("file", selectedFile);
    body.append("updates", JSON.stringify(result.wires.map((wire) => ({ fromToId: wire.fromToId, fromStatus: wire.fromStatus, toStatus: wire.toStatus }))));
    try {
      const response = await fetch(`${API_URL}/api/wcdx/save`, { method: "POST", body });
      if (!response.ok) throw new Error(t.saveError);
      downloadBlob(await response.blob(), result.fileName);
      setDirty(false); setNotice(t.saved);
    } catch (saveError) { setError(saveError instanceof Error ? saveError.message : t.saveError); }
    finally { setIsSaving(false); }
  }

  function downloadLog() {
    const escape = (value: unknown) => `"${String(value ?? "").replaceAll('"', '""')}"`;
    const header = ["Timestamp", "Action", "LineNo", "FromDevice", "FromTerminal", "FromTorque", "ToDevice", "ToTerminal", "ToTorque", "Status"];
    const rows = logs.map((entry) => [entry.timestamp, entry.action, entry.wire?.lineNo, entry.wire?.from.deviceNum, entry.wire?.from.termNum, entry.wire?.from.targetTorque, entry.wire?.to.deviceNum, entry.wire?.to.termNum, entry.wire?.to.targetTorque, entry.status].map(escape).join(","));
    downloadBlob(new Blob(["\uFEFF", header.join(","), "\r\n", rows.join("\r\n")], { type: "text/csv;charset=utf-8" }), `wiring-log-${new Date().toISOString().slice(0, 10)}.csv`);
  }

  function zoomWithWheel(event: WheelEvent<HTMLDivElement>) {
    event.preventDefault();
    const canvas = canvasRef.current;
    const stage = stageRef.current;
    if (canvas && stage) {
      const canvasRect = canvas.getBoundingClientRect();
      const stageRect = stage.getBoundingClientRect();
      zoomAnchorRef.current = {
        x: Math.max(0, Math.min(1, (event.clientX - stageRect.left) / stageRect.width)),
        y: Math.max(0, Math.min(1, (event.clientY - stageRect.top) / stageRect.height)),
        mouseX: event.clientX - canvasRect.left,
        mouseY: event.clientY - canvasRect.top,
      };
    }
    wheelDeltaRef.current += event.deltaY;
    if (wheelFrameRef.current != null) return;
    wheelFrameRef.current = requestAnimationFrame(() => {
      const delta = wheelDeltaRef.current;
      wheelDeltaRef.current = 0;
      wheelFrameRef.current = null;
      setZoom((value) => Math.min(400, Math.max(30, value + (delta < 0 ? 10 : -10))));
    });
  }

  function beginPan(event: PointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return;
    const canvas = canvasRef.current; if (!canvas) return;
    panRef.current = { x: event.clientX, y: event.clientY, left: canvas.scrollLeft, top: canvas.scrollTop };
    canvas.setPointerCapture(event.pointerId); setIsPanning(true);
  }

  function pan(event: PointerEvent<HTMLDivElement>) {
    if (!isPanning || !canvasRef.current) return;
    canvasRef.current.scrollLeft = panRef.current.left - (event.clientX - panRef.current.x);
    canvasRef.current.scrollTop = panRef.current.top - (event.clientY - panRef.current.y);
  }

  function updateViewport() {
    if (scrollFrameRef.current != null) return;
    scrollFrameRef.current = requestAnimationFrame(() => {
      scrollFrameRef.current = null;
      const canvas = canvasRef.current, stage = stageRef.current;
      if (!canvas || !stage) return;
      const canvasRect = canvas.getBoundingClientRect();
      const stageRect = stage.getBoundingClientRect();
      const stageLeft = stageRect.left - canvasRect.left + canvas.scrollLeft;
      const stageTop = stageRect.top - canvasRect.top + canvas.scrollTop;
      setViewport({
        left: Math.max(0, Math.min(100, (canvas.scrollLeft - stageLeft) / stage.clientWidth * 100)),
        top: Math.max(0, Math.min(100, (canvas.scrollTop - stageTop) / stage.clientHeight * 100)),
        width: Math.min(100, canvas.clientWidth / stage.clientWidth * 100),
        height: Math.min(100, canvas.clientHeight / stage.clientHeight * 100),
      });
    });
  }

  return (
    <main className={styles.appShell} lang={language}>
      <header className={styles.header}>
        <button className={styles.brand} onClick={resetViewer} type="button"><span className={styles.brandMark}><FileIcon /></span><span><strong>WiringMonitor</strong><small>{t.subtitle}</small></span></button>
        <div className={styles.headerActions}>{result && <span className={styles.headerFileName} title={result.fileName}>{result.fileName}{dirty && " •"}</span>}{notice && <span className={styles.successText}>{notice}</span>}<input ref={inputRef} type="file" accept=".wcdx,.sqlite,.db" onChange={onFileChange} hidden /><div className={styles.languagePicker} aria-label="Language">{(["en", "ja"] as const).map((code) => <button type="button" key={code} className={language === code ? styles.activeLanguage : ""} onClick={() => setLanguage(code)}>{code.toUpperCase()}</button>)}</div></div>
      </header>

      {!result ? (
        <section className={styles.viewer}>
          {error && <div className={styles.viewerError}>{error}</div>}
          <div className={styles.slideLayout}>
            <aside className={styles.commandRail}>
              <button type="button" className={styles.fileCommand} onClick={() => inputRef.current?.click()} disabled={isLoading}>{isLoading ? t.loading : t.loadFile}</button>
              <button type="button" className={styles.saveCommand} disabled>{t.saveFile}</button>
              <span className={styles.railDivider} />
              <button type="button" disabled>{t.completeFrom}</button><button type="button" disabled>{t.completeTo}</button><button type="button" disabled>{t.completeBoth}</button><button type="button" disabled>{t.skip}</button><button type="button" disabled>{t.next}</button><button type="button" disabled>{t.undo}</button><button type="button" disabled>{t.clearAll}</button>
              <button type="button" disabled>{logControls.start}</button>
              <button type="button" disabled>{logControls.pause}</button>
              <button type="button" disabled>{logControls.stop}</button>
              <span className={styles.railSpacer} />
              <div className={styles.railLogTitle}><strong>{t.log}</strong><span>0</span></div>
              <button type="button" disabled>{t.downloadLog} (0)</button>
            </aside>
            <div className={styles.monitorArea}>
              <nav className={styles.pageTabs} aria-label={t.pageList} />
              <div className={styles.monitorGrid}>
                <section className={styles.drawingPanel}><div className={styles.canvasToolbar}><div><strong>{t.drawing}</strong><span>—</span></div><div className={styles.zoomControls}><button type="button" className={styles.zoomValue} disabled>100%</button></div></div><div className={`${styles.canvasWrap} ${styles.blankDrawing}`}><span>{isLoading ? t.loading : t.emptyWorkspace}</span></div></section>
                <section className={styles.navigationPanel}><div className={styles.regionTitle}>{t.navigation}</div><div className={styles.navigationDrawing} /></section>
                <section className={styles.currentTerminalPanel}><div className={styles.regionTitle}>{t.currentTerminal}</div><p className={styles.emptyPanel}>{t.noSelection}</p></section>
                <section className={styles.wireListPanel}><div className={styles.regionTitle}>{t.wireList} <span>0</span></div><div className={styles.emptyTable}>—</div></section>
              </div>
            </div>
          </div>
        </section>
      ) : (
        <section className={styles.viewer}>
          {error && <div className={styles.viewerError}>{error}</div>}
          <div className={styles.slideLayout}>
            <aside className={styles.commandRail}>
              <button type="button" className={styles.fileCommand} onClick={() => inputRef.current?.click()}>{t.loadFile}</button>
              <button type="button" className={styles.saveCommand} onClick={saveWcdx} disabled={isSaving}>{isSaving ? t.saving : t.saveFile}</button>
              <span className={styles.railDivider} />
              <button type="button" onClick={() => requestCompletion("from")} disabled={!selectedWire}>{t.completeFrom}</button>
              <button type="button" onClick={() => requestCompletion("to")} disabled={!selectedWire}>{t.completeTo}</button>
              <button type="button" className={styles.primaryRailCommand} onClick={() => requestCompletion("both")} disabled={!selectedWire}>{t.completeBoth}</button>
              <button type="button" onClick={skipCurrent} disabled={!selectedWire}>{t.skip}</button>
              <button type="button" onClick={selectNext} disabled={!selectedWire}>{t.next}</button>
              <button type="button" onClick={undoCurrent} disabled={!selectedWire}>{t.undo}</button>
              <button type="button" onClick={clearAll}>{t.clearAll}</button>
              <button type="button" onClick={startLog} disabled={logState === "running"}>{logControls.start}</button>
              <button type="button" onClick={pauseLog} disabled={logState !== "running"}>{logControls.pause}</button>
              <button type="button" onClick={stopLog} disabled={logState !== "running" && logState !== "paused"}>{logControls.stop}</button>
              <span className={styles.railSpacer} />
              <div className={styles.railLogTitle}><strong>{t.log}</strong><span>{logs.length}</span></div>
              <button type="button" onClick={downloadLog} disabled={!logs.length}>{t.downloadLog} ({logs.length})</button>
            </aside>

            <div className={styles.monitorArea}>
              <nav className={styles.pageTabs} aria-label={t.pageList}>{result.pages.map((page) => <button type="button" key={page.pageId} className={page.pageId === activePage?.pageId ? styles.activePageTab : ""} onClick={() => { setActivePageId(page.pageId); setZoom(100); }}><span>{t.page} {page.pageNo}</span><small>{page.pageName || t.unnamed}</small></button>)}</nav>
              <div className={styles.monitorGrid}>
                <section className={styles.drawingPanel}>
                  <div className={styles.canvasToolbar}><div><strong>{t.drawing} · {t.page} {activePage?.pageNo}</strong><span>{activePage?.pageName || t.unnamed} · {pageSegments.length} {t.route}</span></div><div className={styles.zoomControls}><span className={styles.wheelHint}>{t.wheelHint}</span><button type="button" className={styles.zoomValue} onClick={() => setZoom(100)}>{zoom}%</button></div></div>
                  <div className={styles.canvasWrap}>
                    <div ref={canvasRef} className={`${styles.canvas} ${isPanning ? styles.panning : ""}`} onWheel={zoomWithWheel} onPointerDown={beginPan} onPointerMove={pan} onPointerUp={() => setIsPanning(false)} onPointerCancel={() => setIsPanning(false)} onScroll={updateViewport}>
                      <div className={styles.canvasContent} style={{ width: contentWidth, height: contentHeight }}>
                        {activePage && <div ref={stageRef} className={styles.imageStage} style={{ width: stageWidth, height: stageHeight }}><img src={activePage.imageDataUrl} alt={`${t.imageAlt} ${activePage.pageNo}`} draggable={false} /><DrawingOverlay page={activePage} segments={pageSegments} parts={pageParts} selectedWireId={selectedWireId} /></div>}
                      </div>
                    </div>
                  </div>
                </section>

                <section className={styles.navigationPanel}><div className={styles.regionTitle}>{t.navigation}</div><div ref={navigationRef} className={styles.navigationDrawing}>{activePage && <div className={styles.navigationStage} style={{ width: navigationWidth, height: navigationHeight }}><img src={activePage.imageDataUrl} alt="" /><span style={{ left: `${viewport.left}%`, top: `${viewport.top}%`, width: `${viewport.width}%`, height: `${viewport.height}%` }} /></div>}</div></section>

                <section className={styles.currentTerminalPanel}>
                  <div className={styles.regionTitle}>
                    {t.currentTerminal}
                  </div>

                  {selectedWire && currentTerminal ? (
                    <>
                      <TerminalDetails
                        terminal={currentTerminal}
                        labels={t}
                        tighteningStatus={currentCompletionStatus}
                      />
                    </>
                  ) : (
                    <p className={styles.emptyPanel}>
                      {t.noSelection}
                    </p>
                  )}
                </section>
                <section className={styles.wireListPanel}><div className={styles.regionTitle}>{t.wireList} <span>{result.wires.length}</span></div><div className={styles.wireTableWrap}><table className={styles.wireTable}><thead><tr><th>#</th><th>{t.status}</th><th>{t.from} {t.status}</th><th>{t.to} {t.status}</th><th>{t.lineNo}</th><th>{t.wire}</th><th>{t.from}</th><th>{t.to}</th><th>{t.length}</th></tr></thead><tbody>{result.wires.map((wire) => <tr key={wire.fromToId} className={wire.fromToId === selectedWireId ? styles.selectedRow : ""} onClick={() => selectWire(wire)}><td>{wire.displayOrder}</td><td className={styles.statusSymbol}>{statusSymbol(wire.fromStatus, wire.toStatus)}</td><td className={styles.endpointStatus} title={wire.fromStatus === "1" ? t.finalTightening : wire.fromStatus === "2" ? t.temporaryTightening : "—"}>{wire.fromStatus || "—"}</td><td className={styles.endpointStatus} title={wire.toStatus === "1" ? t.finalTightening : wire.toStatus === "2" ? t.temporaryTightening : "—"}>{wire.toStatus || "—"}</td><td>{wire.lineNo || "—"}</td><td>{[wire.wireType, wire.wireSize, wire.wireColor].filter(Boolean).join(" · ") || "—"}</td><td><b>{wire.from.deviceNum}</b> / {wire.from.termNum}</td><td><b>{wire.to.deviceNum}</b> / {wire.to.termNum}</td><td>{wire.length || "—"}</td></tr>)}</tbody></table></div></section>
              </div>
            </div>
          </div>
          {pendingCompletion && <div className={styles.modalBackdrop}><section className={styles.confirmDialog} role="alertdialog" aria-modal="true" aria-labelledby="log-confirm-title"><div className={styles.confirmIcon}>LOG</div><h2 id="log-confirm-title">{t.log}</h2><p>{t.logConfirmMessage}</p><div className={styles.confirmActions}><button type="button" className={styles.confirmCancel} onClick={() => resolveLogConfirmation("cancel")}>{t.cancel}</button><button type="button" className={styles.confirmNo} onClick={() => resolveLogConfirmation("no")}>{t.no}</button><button type="button" className={styles.confirmYes} onClick={() => resolveLogConfirmation("yes")}>{t.yes}</button></div></section></div>}
        </section>
      )}
    </main>
  );
}

function TerminalDetails({ terminal, labels, tighteningStatus }: { terminal: Terminal; labels: (typeof translations)[Language]; tighteningStatus: CompletionStatus | null }) {
  const tighteningLabel = tighteningStatus === "2" ? labels.temporaryTightening : labels.finalTightening;
  const items = [
    [labels.device, terminal.deviceNum],
    [labels.mountingCoordinate, terminal.assyNum],
    [labels.terminal, terminal.termNum],
    [labels.tighteningType, tighteningLabel],
    [labels.torque, terminal.targetTorque || [terminal.minTorque, terminal.maxTorque].filter(Boolean).join(" – ")],
    [labels.terminalDiameter, terminal.termSize],
  ];
  return <dl className={styles.terminalDetails}>{items.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value || "—"}</dd></div>)}</dl>;
}
