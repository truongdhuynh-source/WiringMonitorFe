import type { Language } from "./wcdx-types";

export const translations = {
  en: {
    uploadFile: "Upload WCDX",
    loadFile: "Load file",
    emptyWorkspace: "Choose a WCDX file from the header to begin",
    navigation: "Navigation",
    currentTerminal: "Current terminal",
    logConfirmMessage: "Logging has not been started. Do you want to start logging?",
    yes: "Yes",
    no: "No",
    cancel: "Cancel",
    workInstruction: "Work instruction",
    temporaryTightening: "Temporary tightening",
    finalTightening: "Final tightening",
    mountingCoordinate: "Mounting coordinate",
    tighteningType: "Tightening type",
    terminalDiameter: "Terminal diameter",
    subtitle: "Wiring instruction viewer", sqliteStatus: "Direct SQLite", hero1: "WiringMonitor", hero2: "in your browser", heroDescription: "Open a WCDX file to view drawings, routes and parts, and update wiring progress.", dropTitle: "Drag and drop your file here", dropSubtitle: "or click to browse your computer", changeFile: "Click to choose another file", support: "Supports .WCDX · Maximum 25 MB", loading: "Reading data...", extract: "Open WiringMonitor", readError: "Unable to read the WCDX file.", connectError: "Unable to connect to the server.", openFile: "OPEN FILE", openAnother: "Open another", saveFile: "Save WCDX", saving: "Saving...", saved: "New WCDX file created", pageList: "Drawing pages", page: "Page", unnamed: "Unnamed", drawing: "Drawing", fit: "Fit", wheelHint: "Scroll to zoom · Drag to pan", terminalInfo: "Terminal information", from: "From", to: "To", wired: "Wiring complete", device: "Device", terminal: "Terminal", part: "Part", model: "Model", terminalType: "Terminal type", terminalSize: "Terminal size", torque: "Torque", comment: "Comment", noSelection: "Select a wire to view its information", wireList: "Wire list", openWireList: "Open wire list", close: "Close", status: "Status", lineNo: "Line", wire: "Wire", length: "Length", completeFrom: "Complete from", completeTo: "Complete to", completeBoth: "Complete both", skip: "Skip", next: "Next row", undo: "Undo", clearAll: "Clear all", log: "Log", logStart: "Start", logPause: "Pause", logResume: "Resume", logStop: "Stop", downloadLog: "Download CSV", logIdle: "Not recording", logRunning: "Recording", logPaused: "Paused", logStopped: "Stopped", noWires: "No wire data", imageAlt: "Drawing page", confirmClear: "Clear the status of every wire?", saveError: "Unable to save the WCDX file.", unsaved: "Unsaved changes", route: "wire segments", parts: "parts",
  },
  ja: {
    uploadFile: "WCDXをアップロード",
    loadFile: "ファイル",
    emptyWorkspace: "ヘッダーからWCDXファイルを選択してください",
    navigation: "ナビゲーション",
    currentTerminal: "カレント端子情報",
    logConfirmMessage: "ログの記録が開始されていません。開始しますか？",
    yes: "はい",
    no: "いいえ",
    cancel: "キャンセル",
    workInstruction: "作業指示",
    temporaryTightening: "仮締め",
    finalTightening: "本締め",
    mountingCoordinate: "取付座標",
    tighteningType: "締付タイプ",
    terminalDiameter: "端子径",
    subtitle: "配線作業支援ビューア", sqliteStatus: "SQLite直接読取", hero1: "WiringMonitorを", hero2: "ブラウザで使用", heroDescription: "WCDXファイルを開き、図面・配線経路・部品を表示して配線進捗を更新します。", dropTitle: "ファイルをドラッグ＆ドロップ", dropSubtitle: "またはクリックして選択", changeFile: "クリックして別のファイルを選択", support: ".WCDX対応 · 最大25 MB", loading: "データを読み取り中...", extract: "WiringMonitorを開く", readError: "WCDXファイルを読み取れません。", connectError: "サーバーに接続できません。", openFile: "開いているファイル", openAnother: "別のファイル", saveFile: "WCDXを保存", saving: "保存中...", saved: "新しいWCDXファイルを作成しました", pageList: "図面ページ", page: "ページ", unnamed: "名称なし", drawing: "図面", fit: "フィット", wheelHint: "スクロールで拡縮 · ドラッグで移動", terminalInfo: "端子情報", from: "元側", to: "先側", wired: "配線済み", device: "機器", terminal: "端子", part: "部品", model: "型式", terminalType: "端子タイプ", terminalSize: "端子サイズ", torque: "トルク", comment: "コメント", noSelection: "配線を選択してください", wireList: "配線一覧", openWireList: "配線一覧を開く", close: "閉じる", status: "状態", lineNo: "線番", wire: "電線", length: "長さ", completeFrom: "元側完了", completeTo: "先側完了", completeBoth: "両側完了", skip: "スキップ", next: "次行へ", undo: "完了解除", clearAll: "全解除", log: "ログ", logStart: "開始", logPause: "休止", logResume: "再開", logStop: "停止", downloadLog: "CSV保存", logIdle: "未記録", logRunning: "記録中", logPaused: "休止中", logStopped: "停止済み", noWires: "配線データがありません", imageAlt: "図面ページ", confirmClear: "すべての配線状態を解除しますか？", saveError: "WCDXファイルを保存できません。", unsaved: "未保存の変更", route: "配線区間", parts: "部品",
  },
} as const;

export type Translation = (typeof translations)[Language];
