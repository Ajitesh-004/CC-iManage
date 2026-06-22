"use client";

import { useEffect, useState } from "react";
import { ThemeToggle } from "@/components/ThemeProvider";
import { ProgressBar } from "@/components/ProgressBar";
import { OPERATION_META, getProgressMeta } from "@/lib/operations";
import { getSampleCsv, getSampleCsvFilename } from "@/lib/operations/sampleHeaders";
import { parseCsv } from "@/lib/csv/parse";
import type { OperationLogEntry, OperationProgress, OperationStreamEvent } from "@/types";

function clearOperationState(setters: {
  setCsvContent: (v: string) => void;
  setExportDb: (v: string) => void;
  setExportName: (v: string) => void;
  setLogs: (v: OperationLogEntry[]) => void;
  setExportCsv: (v: string | null) => void;
  setError: (v: string) => void;
  setFileKey: (fn: (k: number) => number) => void;
  setProgress: (v: OperationProgress | null) => void;
}) {
  setters.setCsvContent("");
  setters.setExportDb("");
  setters.setExportName("");
  setters.setLogs([]);
  setters.setExportCsv(null);
  setters.setError("");
  setters.setProgress(null);
  setters.setFileKey((k) => k + 1);
}

export default function HomePage() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [user, setUser] = useState("");
  const [tenant, setTenant] = useState("");
  const [custId, setCustId] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [view, setView] = useState<"main" | "template">("main");
  const [selectedOp, setSelectedOp] = useState<(typeof OPERATION_META)[0] | null>(null);
  const [csvContent, setCsvContent] = useState("");
  const [exportDb, setExportDb] = useState("");
  const [exportName, setExportName] = useState("");
  const [logs, setLogs] = useState<OperationLogEntry[]>([]);
  const [exportCsv, setExportCsv] = useState<string | null>(null);
  const [exportFilename, setExportFilename] = useState("export.csv");
  const [fileKey, setFileKey] = useState(0);
  const [progress, setProgress] = useState<OperationProgress | null>(null);

  const resetFields = () =>
    clearOperationState({
      setCsvContent,
      setExportDb,
      setExportName,
      setLogs,
      setExportCsv,
      setError,
      setFileKey,
      setProgress,
    });

  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((d) => {
        if (d.isLoggedIn) {
          setLoggedIn(true);
          setUser(d.username);
          setTenant(d.tenant);
          setCustId(d.custId);
        }
      });
  }, []);

  async function login(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tenant, custId, username, password }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Login failed");
      return;
    }
    setLoggedIn(true);
    setUser(data.username);
    setPassword("");
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setLoggedIn(false);
    setSelectedOp(null);
    resetFields();
  }

  function selectOperation(op: (typeof OPERATION_META)[0]) {
    resetFields();
    setSelectedOp(op);
  }

  function goBack() {
    resetFields();
    setSelectedOp(null);
  }

  function switchView(next: "main" | "template") {
    resetFields();
    setView(next);
    setSelectedOp(null);
  }

  async function runOperation() {
    if (!selectedOp) return;
    setLoading(true);
    setLogs([]);
    setExportCsv(null);
    setError("");

    const meta = getProgressMeta(selectedOp.id);
    const rowTotal =
      selectedOp.id === "templates-export"
        ? 1
        : selectedOp.needsCsv
          ? parseCsv(csvContent).rows.length
          : 0;
    setProgress({
      current: 0,
      total: rowTotal,
      unit: meta.unit,
      verb: meta.verb,
      percent: 0,
    });

    const body: Record<string, unknown> = { operationId: selectedOp.id };
    if (selectedOp.needsCsv) body.csvContent = csvContent;
    if (selectedOp.id === "templates-export") {
      body.params = { database: exportDb, templateName: exportName };
    }

    try {
      const res = await fetch("/api/operations/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok && !res.body) {
        setError("Operation failed");
        setLoading(false);
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) {
        setError("Operation failed");
        setLoading(false);
        return;
      }

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.trim()) continue;
          const event = JSON.parse(line) as OperationStreamEvent;

          if (event.type === "progress") {
            setProgress({
              current: event.current,
              total: event.total,
              unit: event.unit,
              verb: event.verb,
              label: event.label,
              percent: event.percent,
            });
          } else if (event.type === "log") {
            setLogs((prev) => [...prev, event.entry]);
          } else if (event.type === "done") {
            setLogs(event.result.logs);
            if (event.result.exportCsv) {
              setExportCsv(event.result.exportCsv);
              setExportFilename(event.result.exportFilename || "export.csv");
            }
            setProgress((prev) =>
              prev
                ? { ...prev, current: prev.total, percent: 100 }
                : null
            );
          } else if (event.type === "error") {
            setError(event.error || "Operation failed");
          }
        }
      }
    } catch {
      setError("Operation failed");
    } finally {
      setLoading(false);
    }
  }

  function downloadExport() {
    if (!exportCsv) return;
    const blob = new Blob([exportCsv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = exportFilename;
    a.click();
    URL.revokeObjectURL(url);
  }

  function downloadSample() {
    if (!selectedOp) return;
    const sample = getSampleCsv(selectedOp.id);
    if (!sample) return;
    const blob = new Blob([sample], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = getSampleCsvFilename(selectedOp.id);
    a.click();
    URL.revokeObjectURL(url);
  }

  if (!loggedIn) {
    return (
      <div className="login-wrap">
        <div className="brand">
          <h1>iManage Data Loader</h1>
          <p className="brand-tagline">Sign in to your iManage tenant</p>
        </div>
        <div className="top-actions" style={{ position: "fixed", top: "1rem", right: "1.5rem" }}>
          <ThemeToggle />
        </div>
        <form className="card card-glass" onSubmit={login}>
          <div className="form-row">
            <label>Tenant</label>
            <input
              value={tenant}
              onChange={(e) => setTenant(e.target.value)}
              required
            />
          </div>
          <div className="form-row">
            <label>Customer ID</label>
            <input value={custId} onChange={(e) => setCustId(e.target.value)} required />
          </div>
          <div className="form-row">
            <label>Username</label>
            <input value={username} onChange={(e) => setUsername(e.target.value)} required />
          </div>
          <div className="form-row">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error && <div className="error-banner">{error}</div>}
          <button type="submit" className="btn-primary" disabled={loading} style={{ width: "100%" }}>
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    );
  }

  const ops = OPERATION_META.filter((o) =>
    view === "template" ? o.category === "template" : o.category === "main"
  );

  return (
    <>
      <header className="top-bar">
        <div className="top-bar-inner">
          <div className="brand">
            <h1>iManage Data Loader</h1>
            <span className="brand-tagline">
              {user} · {tenant}
            </span>
          </div>
          <div className="top-actions">
            <ThemeToggle />
            <button type="button" className="btn-secondary" onClick={logout}>
              Sign out
            </button>
          </div>
        </div>
      </header>

      <div className="container">
        <div className="tab-bar">
          <button
            type="button"
            className={view === "main" ? "active" : ""}
            onClick={() => switchView("main")}
          >
            Main operations
          </button>
          <button
            type="button"
            className={view === "template" ? "active" : ""}
            onClick={() => switchView("template")}
          >
            Template operations
          </button>
        </div>

        {!selectedOp ? (
          <div className="grid">
            {ops.map((op) => (
              <button
                key={op.id}
                type="button"
                className="op-card"
                onClick={() => selectOperation(op)}
              >
                <h3>{op.label}</h3>
                <p className="muted">{op.description}</p>
              </button>
            ))}
          </div>
        ) : (
          <div className="card">
            <button type="button" className="btn-secondary back-link" onClick={goBack}>
              ← Back to operations
            </button>
            <h2>{selectedOp.label}</h2>
            <p className="muted">{selectedOp.description}</p>

            {selectedOp.id === "templates-export" ? (
              <>
                <div className="form-row">
                  <label>Database / library</label>
                  <input
                    value={exportDb}
                    onChange={(e) => setExportDb(e.target.value)}
                    placeholder="Enter library name"
                  />
                </div>
                <div className="form-row">
                  <label>Template name</label>
                  <input
                    value={exportName}
                    onChange={(e) => setExportName(e.target.value)}
                    placeholder="Enter template name"
                  />
                </div>
              </>
            ) : selectedOp.needsCsv ? (
              <div className="form-row">
                <div className="label-row">
                  <label>CSV content (paste or upload)</label>
                  {getSampleCsv(selectedOp.id) && (
                    <button
                      type="button"
                      className="btn-sample"
                      onClick={downloadSample}
                      title="Download a sample CSV with the required headers"
                    >
                      ↓ Download sample CSV
                    </button>
                  )}
                </div>
                <input
                  key={fileKey}
                  className="file-input"
                  type="file"
                  accept=".csv,text/csv"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) f.text().then(setCsvContent);
                  }}
                />
                <textarea
                  rows={12}
                  value={csvContent}
                  onChange={(e) => setCsvContent(e.target.value)}
                  placeholder="Paste CSV here…"
                  style={{ width: "100%", resize: "vertical" }}
                />
              </div>
            ) : null}

            {error && <div className="error-banner">{error}</div>}

            <div className="action-row">
              <button type="button" className="btn-primary" onClick={runOperation} disabled={loading}>
                {loading ? "Running…" : "Run operation"}
              </button>
              <ProgressBar progress={progress} active={loading} />
              {exportCsv && (
                <button type="button" className="btn-secondary" onClick={downloadExport}>
                  Download {exportFilename}
                </button>
              )}
            </div>

            {logs.length > 0 && (
              <div className="log-panel">
                {logs.map((l, i) => (
                  <div key={i} className={`log-line log-${l.level}`}>
                    {l.action === "item"
                      ? `>> ${l.message}`
                      : `${l.level.toUpperCase()} | ${l.action}${l.http ? ` | HTTP ${l.http}` : ""}${l.message ? ` · ${l.message}` : ""}`}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
