import {
  Button,
  ClickAwayListener,
  FormControl,
  InputLabel,
  List,
  ListItemButton,
  ListItemText,
  MenuItem,
  Paper,
  Select,
  TextField,
  Typography,
} from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers";
import type { Dayjs } from "dayjs";
import { useMemo, useState } from "react";
import { useDebounce } from "../hooks/useDebounce";
import { useDevices } from "../service/useDevice";
import { useAccessListMutation } from "../service/useReport";
import { useUsers } from "../service/useUsers";
import { useWiegandGroups } from "../service/useWiegandGroup";
import type { Device } from "../types/deviceTypes";
import type { UserData } from "../types/userTypes";

type ReportType =
  | "user_report"
  | "device_report"
  | "access_log_report"
  | "group_report"
  | "user_wiegand_report";
type DownloadFormat = "csv" | "excel" | "pdf";

type WiegandGroup = {
  id?: string;
  group_id: string;
  sn?: string;
  del_flag?: number;
};

const sanitizeFileName = (name: unknown) =>
  String(name ?? "report")
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^\w.-]/g, "_");

const toTitleCase = (s: unknown) =>
  String(s ?? "")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());

const formatHeader = (key: unknown) => {
  const parts = String(key ?? "")
    .split(".")
    .map((p) =>
      p
        .replace(/_/g, " ")
        .replace(/([a-z])([A-Z])/g, "$1 $2")
        .trim()
    )
    .filter(Boolean);

  return toTitleCase(parts.join(" / "));
};

const shouldExcludeKey = (key: unknown) => {
  const k = String(key ?? "");
  if (k === "_id" || k === "__v") return true;
  if (k.endsWith("._id")) return true;
  return false;
};

const normalizeRows = (input: unknown): Array<Record<string, unknown>> => {
  if (Array.isArray(input)) return input as any;
  if (typeof Blob !== "undefined" && input instanceof Blob) return [];

  if (input && typeof input === "object") {
    const obj: any = input;
    if (Array.isArray(obj.data)) return obj.data;
    if (obj.data && typeof obj.data === "object") {
      const nested = normalizeRows(obj.data);
      if (nested.length) return nested;
    }
    if (Array.isArray(obj.rows)) return obj.rows;
    if (obj.rows && typeof obj.rows === "object") {
      const nested = normalizeRows(obj.rows);
      if (nested.length) return nested;
    }
    if (Array.isArray(obj.transactions)) return obj.transactions;
    if (obj.transactions && typeof obj.transactions === "object") {
      const nested = normalizeRows(obj.transactions);
      if (nested.length) return nested;
    }
    if (Array.isArray(obj.records)) return obj.records;
    if (Array.isArray(obj.results)) return obj.results;
    return [obj];
  }

  return [];
};

const flatten = (obj: Record<string, unknown>, prefix = ""): Record<string, unknown> => {
  const out: Record<string, unknown> = {};
  for (const k in obj) {
    const val: any = (obj as any)[k];
    const key = prefix ? `${prefix}.${k}` : k;
    if (val && typeof val === "object" && !Array.isArray(val)) {
      Object.assign(out, flatten(val as Record<string, unknown>, key));
    } else {
      out[key] = Array.isArray(val)
        ? val
            .map((v) => (v && typeof v === "object" ? JSON.stringify(v) : String(v ?? "")))
            .join(", ")
        : val ?? "";
    }
  }
  return out;
};

const formatDateTime = (value: unknown) => {
  if (value == null) return "";
  const s = String(value);
  if (s.includes("T")) {
    const d = new Date(s);
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleString(undefined, {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
    }
  }
  return s;
};

type SearchSuggestProps<T> = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  items: T[];
  loading?: boolean;
  getKey: (item: T) => string;
  getPrimary: (item: T) => string;
  getSecondary?: (item: T) => string;
  onSelect: (item: T) => void;
  emptyText?: string;
};

function SearchSuggest<T>({
  label,
  value,
  onChange,
  items,
  loading,
  getKey,
  getPrimary,
  getSecondary,
  onSelect,
  emptyText = "No results",
}: SearchSuggestProps<T>) {
  const [open, setOpen] = useState(false);
  const shouldShow = open && value.trim().length > 0;

  return (
    <ClickAwayListener onClickAway={() => setOpen(false)}>
      <div className="relative">
        <TextField
          label={label}
          size="small"
          value={value}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            onChange(e.target.value);
            setOpen(true);
          }}
          fullWidth
        />

        {shouldShow && (
          <Paper
            elevation={3}
            sx={{
              position: "absolute",
              zIndex: 20,
              width: "100%",
              mt: 0.5,
              maxHeight: 240,
              overflow: "auto",
            }}
          >
            {loading ? (
              <Typography variant="body2" className="px-3 py-2 text-gray-500">
                Loading...
              </Typography>
            ) : items.length === 0 ? (
              <Typography variant="body2" className="px-3 py-2 text-gray-500">
                {emptyText}
              </Typography>
            ) : (
              <List dense>
                {items.slice(0, 10).map((item) => (
                  <ListItemButton
                    key={getKey(item)}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      onSelect(item);
                      setOpen(false);
                    }}
                  >
                    <ListItemText
                      primary={getPrimary(item)}
                      secondary={getSecondary ? getSecondary(item) : undefined}
                    />
                  </ListItemButton>
                ))}
              </List>
            )}
          </Paper>
        )}
      </div>
    </ClickAwayListener>
  );
}

const reportTabs: Array<{ key: ReportType; label: string; hasSearch: boolean }> = [
  { key: "user_report", label: "User Report", hasSearch: true },
  { key: "device_report", label: "Device Report", hasSearch: true },
  { key: "group_report", label: "Group Report", hasSearch: true },
  { key: "user_wiegand_report", label: "User Remote/Time Report", hasSearch: true },
  { key: "access_log_report", label: "Access Log Report", hasSearch: true },
];

const MainReport = () => {
  const [reportType, setReportType] = useState<ReportType>("user_report");

  const [searchText, setSearchText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebounce(searchQuery, 350);

  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [selectedWiegandGroup, setSelectedWiegandGroup] = useState<WiegandGroup | null>(null);

  const [startDate, setStartDate] = useState<Dayjs | null>(null);
  const [endDate, setEndDate] = useState<Dayjs | null>(null);

  const [downloadFormat, setDownloadFormat] = useState<DownloadFormat>("csv");

  const downloadMutation = useAccessListMutation();

  const shouldFetchUsers =
    (reportType === "user_report" ||
      reportType === "user_wiegand_report" ||
      reportType === "access_log_report") &&
    debouncedSearchQuery.trim().length > 0;
  const shouldFetchDevices = reportType === "device_report" && debouncedSearchQuery.trim().length > 0;
  const shouldFetchGroups = reportType === "group_report" && debouncedSearchQuery.trim().length > 0;

  const { data: usersData, isFetching: isUsersFetching } = useUsers(1, 10, debouncedSearchQuery, shouldFetchUsers);
  const { data: devicesData, isFetching: isDevicesFetching } = useDevices(1, debouncedSearchQuery, shouldFetchDevices);
  const { data: wiegandGroupsData, isFetching: isWiegandGroupsFetching } = useWiegandGroups(0, shouldFetchGroups);

  const filteredWiegandGroups = useMemo(() => {
    const list: WiegandGroup[] = (wiegandGroupsData?.data ?? wiegandGroupsData ?? []) as any;
    const q = debouncedSearchQuery.trim().toLowerCase();
    if (!q) return list;
    return list.filter((g) => {
      const groupId = String(g?.group_id ?? "").toLowerCase();
      const sn = String(g?.sn ?? "").toLowerCase();
      return groupId.includes(q) || sn.includes(q);
    });
  }, [wiegandGroupsData, debouncedSearchQuery]);

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  const downloadTextFile = (content: string, filename: string, mime = "text/plain;charset=utf-8") => {
    downloadBlob(new Blob([content], { type: mime }), filename);
  };

  const pdfSafeAscii = (value: unknown) =>
    String(value ?? "")
      .replaceAll("…", "...")
      .replaceAll(/[^\x09\x0A\x0D\x20-\x7E]/g, "?");

  const pdfEscape = (value: unknown) =>
    pdfSafeAscii(value)
      .replaceAll("\\", "\\\\")
      .replaceAll("(", "\\(")
      .replaceAll(")", "\\)")
      .replaceAll("\r", " ")
      .replaceAll("\n", " ");

  const escapeHtml = (value: unknown) =>
    String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");

  const toCsv = (rows: Array<Record<string, unknown>>) => {
    const keys = Array.from(
      rows.reduce((set, row) => {
        Object.keys(row ?? {}).forEach((k) => set.add(k));
        return set;
      }, new Set<string>())
    );

    const esc = (v: unknown) => {
      const s = String(v ?? "");
      const needsQuotes = /[",\n]/.test(s);
      const escaped = s.replaceAll('"', '""');
      return needsQuotes ? `"${escaped}"` : escaped;
    };

    const header = keys.join(",");
    const lines = rows.map((r) => keys.map((k) => esc(r?.[k])).join(","));
    return [header, ...lines, ""].join("\n");
  };

  const toXlsHtmlTable = (rows: Array<Record<string, unknown>>) => {
    const keys = Array.from(
      rows.reduce((set, row) => {
        Object.keys(row ?? {}).forEach((k) => set.add(k));
        return set;
      }, new Set<string>())
    );

    const header = `<tr>${keys.map((k) => `<th>${escapeHtml(k)}</th>`).join("")}</tr>`;
    const body = rows
      .map((r) => `<tr>${keys.map((k) => `<td>${escapeHtml(r?.[k])}</td>`).join("")}</tr>`)
      .join("");

    return `<table>${header}${body}</table>`;
  };

  const buildSimplePdf = (lines: string[]) => {
    const safeLines = lines.filter(Boolean).slice(0, 80);
    const contentStream =
      [
        "BT",
        "/F1 10 Tf",
        "12 TL",
        "50 780 Td",
        ...safeLines.map((l) => `(${pdfEscape(l)}) Tj T*`),
        "ET",
      ].join("\n") + "\n";

    const encoder = new TextEncoder();

    const objects: string[] = [];
    objects[1] = "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n";
    objects[2] = "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n";
    objects[3] =
      "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\nendobj\n";
    objects[4] = "4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n";
    objects[5] =
      `5 0 obj\n<< /Length ${encoder.encode(contentStream).length} >>\nstream\n` +
      contentStream +
      "endstream\nendobj\n";

    const header = "%PDF-1.4\n";
    const chunks: Uint8Array[] = [encoder.encode(header)];

    const offsets: number[] = [];
    offsets[0] = 0;

    let cursor = chunks[0].length;
    for (let i = 1; i <= 5; i++) {
      offsets[i] = cursor;
      const bytes = encoder.encode(objects[i]);
      chunks.push(bytes);
      cursor += bytes.length;
    }

    const xrefStart = cursor;
    const pad10 = (n: number) => String(n).padStart(10, "0");
    const xrefLines = [
      "xref",
      "0 6",
      `${pad10(0)} 65535 f `,
      ...[1, 2, 3, 4, 5].map((i) => `${pad10(offsets[i])} 00000 n `),
      "trailer",
      "<< /Size 6 /Root 1 0 R >>",
      "startxref",
      String(xrefStart),
      "%%EOF\n",
    ].join("\n");

    chunks.push(encoder.encode(xrefLines));

    const total = chunks.reduce((sum, b) => sum + b.length, 0);
    const out = new Uint8Array(total);
    let o = 0;
    for (const b of chunks) {
      out.set(b, o);
      o += b.length;
    }
    return new Blob([out], { type: "application/pdf" });
  };

  const toPdfTableLines = (rows: Array<Record<string, unknown>>) => {
    const keys = Array.from(
      rows.reduce((set, row) => {
        Object.keys(row ?? {}).forEach((k) => set.add(k));
        return set;
      }, new Set<string>())
    );

    const cols = keys.slice(0, 6);
    const colHeaders = cols.map((c) => formatHeader(c));
    const colCount = Math.max(colHeaders.length, 1);

    // Approx. safe character width per line with margins using Courier @ 10pt
    const totalChars = 95;
    const colChars = Math.max(8, Math.floor((totalChars - (colCount - 1) * 3) / colCount));

    const trunc = (v: unknown) => {
      const s = String(v ?? "");
      if (s.length <= colChars) return s;
      return s.slice(0, Math.max(0, colChars - 1)) + "…";
    };

    const pad = (s: string) => (s.length >= colChars ? s.slice(0, colChars) : s.padEnd(colChars, " "));

    const header = colHeaders.map((c) => pad(trunc(c))).join(" | ");
    const sep = colHeaders.map(() => "-".repeat(colChars)).join("-+-");

    const body = rows.slice(0, 20).map((r) => cols.map((c) => pad(trunc(r?.[c]))).join(" | "));

    return { header, sep, body, note: keys.length > cols.length ? `Showing ${cols.length}/${keys.length} columns` : null };
  };
  void toPdfTableLines;

  const buildTablePdf = ({
    title,
    rows,
    columns,
    subTitle,
  }: {
    title: string;
    rows: string[][];
    columns: string[];
    subTitle?: string;
  }) => {
    const pageW = 842; // A4 landscape (pt)
    const pageH = 595;
    const margin = 28;

    const tableLeftX = margin;
    const tableW = pageW - margin * 2;

    const fontSize = 6.8;
    const lineH = 10;
    const cellPad = 4;
    const maxLinesPerCell = 2;

    const encoder = new TextEncoder();
    const charW = fontSize * 0.52; // Helvetica approx

    const cols = ["S.No", ...columns];
    const data = rows.map((r, idx) => [String(idx + 1), ...r]);

    const maxCols = 9; // S.No + 8 columns max
    const visibleCols = cols.slice(0, maxCols);
    const visibleData = data.map((r) => r.slice(0, maxCols));

    const colCount = visibleCols.length;
    const colW = Array.from({ length: colCount }, (_, i) => (i === 0 ? 34 : (tableW - 34) / (colCount - 1)));
    const xAt = (colIndex: number) => colW.slice(0, colIndex).reduce((a, b) => a + b, tableLeftX);

    const maxCharsForCol = (w: number) => Math.max(4, Math.floor((w - cellPad * 2) / charW));
    const wrapCell = (value: string, w: number) => {
      const s = pdfSafeAscii(value);
      const maxChars = maxCharsForCol(w);
      if (s.length <= maxChars) return [s];
      const chunks: string[] = [];
      for (let i = 0; i < s.length && chunks.length < maxLinesPerCell; i += maxChars) {
        chunks.push(s.slice(i, i + maxChars));
      }
      if (chunks.length && s.length > maxChars * maxLinesPerCell) {
        const last = chunks[chunks.length - 1];
        chunks[chunks.length - 1] = last.slice(0, Math.max(0, last.length - 3)) + "...";
      }
      return chunks;
    };

    const drawLine = (x1: number, y1: number, x2: number, y2: number) =>
      `${x1.toFixed(2)} ${y1.toFixed(2)} m ${x2.toFixed(2)} ${y2.toFixed(2)} l S`;

    const rgb = (r: number, g: number, b: number) =>
      `${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)}`;

    const primaryRgb = rgb(28 / 255, 77 / 255, 141 / 255); // --color-primary (#1C4D8D)
    const whiteRgb = rgb(1, 1, 1);
    const blackRgb = rgb(0, 0, 0);

    const drawText = (
      x: number,
      y: number,
      text: string,
      size = fontSize,
      fillRgb = blackRgb,
      fontRef: "F1" | "F2" = "F1"
    ) =>
      `${fillRgb} rg\nBT /${fontRef} ${size} Tf 1 0 0 1 ${x.toFixed(2)} ${y.toFixed(2)} Tm (${pdfEscape(text)}) Tj ET`;

    const pages: string[] = [];
    let y = 0;

    const startNewPage = (pageIndex: number) => {
      const headerY = pageH - margin - 18;
      const headerLines = [
        drawText(margin, headerY, title, 16, primaryRgb, "F2"),
        subTitle ? drawText(margin, headerY - 16, subTitle, 10, blackRgb, "F1") : "",
        drawText(margin, headerY - (subTitle ? 32 : 16), `Rows: ${rows.length}`, 9, blackRgb, "F1"),
        drawText(pageW - margin - 120, headerY, `Page: ${pageIndex + 1}`, 9, blackRgb, "F1"),
      ]
        .filter(Boolean)
        .join("\n");

      y = pageH - margin - 70;

      const headerRowH = cellPad * 2 + lineH;
      const top = y;
      const bottom = y - headerRowH;

      const grid: string[] = [];

      // Header background (primary)
      grid.push("q");
      grid.push(`${primaryRgb} rg`);
      grid.push(`${tableLeftX.toFixed(2)} ${bottom.toFixed(2)} ${tableW.toFixed(2)} ${headerRowH.toFixed(2)} re f`);
      grid.push("Q");

      grid.push("q");
      grid.push("0.3 w");
      grid.push(`${primaryRgb} RG`);
      grid.push(drawLine(tableLeftX, top, tableLeftX + tableW, top));
      grid.push(drawLine(tableLeftX, bottom, tableLeftX + tableW, bottom));
      for (let i = 0; i <= colCount; i++) {
        const x = i === colCount ? tableLeftX + tableW : xAt(i);
        grid.push(drawLine(x, top, x, bottom));
      }
      grid.push("Q");

      const headerTexts: string[] = [];
      for (let i = 0; i < colCount; i++) {
        const cellX = xAt(i) + cellPad;
        const cellY = top - cellPad - 8;
        headerTexts.push(drawText(cellX, cellY, visibleCols[i], 8, whiteRgb, "F2"));
      }

      pages.push([headerLines, grid.join("\n"), headerTexts.join("\n")].join("\n"));
      y = bottom;
    };

    const renderRow = (row: string[], rowIndex: number) => {
      const cellLines = row.map((v, i) => wrapCell(String(v ?? ""), colW[i]));
      const rowLinesCount = Math.max(1, ...cellLines.map((l) => l.length));
      const rowH = cellPad * 2 + lineH * Math.min(rowLinesCount, maxLinesPerCell);

      if (y - rowH < margin + 20) return false;

      const top = y;
      const bottom = y - rowH;

      const grid: string[] = [];

      // Zebra stripes for readability (very light)
      if (rowIndex % 2 === 1) {
        grid.push("q");
        grid.push(`${rgb(0.965, 0.973, 0.985)} rg`);
        grid.push(`${tableLeftX.toFixed(2)} ${bottom.toFixed(2)} ${tableW.toFixed(2)} ${rowH.toFixed(2)} re f`);
        grid.push("Q");
      }

      grid.push("q");
      grid.push("0.25 w");
      grid.push(`${rgb(0.82, 0.84, 0.87)} RG`);
      grid.push(drawLine(tableLeftX, top, tableLeftX + tableW, top));
      grid.push(drawLine(tableLeftX, bottom, tableLeftX + tableW, bottom));
      for (let i = 0; i <= colCount; i++) {
        const x = i === colCount ? tableLeftX + tableW : xAt(i);
        grid.push(drawLine(x, top, x, bottom));
      }
      grid.push("Q");

      const texts: string[] = [];
      for (let i = 0; i < colCount; i++) {
        const cellX = xAt(i) + cellPad;
        let cellY = top - cellPad - fontSize;
        const lines = cellLines[i].slice(0, maxLinesPerCell);
        for (const line of lines) {
          texts.push(drawText(cellX, cellY, line));
          cellY -= lineH;
        }
      }

      pages[pages.length - 1] += `\n${grid.join("\n")}\n${texts.join("\n")}`;
      y = bottom;
      return true;
    };

    startNewPage(0);
    let pageIndex = 0;
    for (let rowIndex = 0; rowIndex < visibleData.length; rowIndex++) {
      const row = visibleData[rowIndex];
      if (!renderRow(row, rowIndex)) {
        pageIndex += 1;
        startNewPage(pageIndex);
        if (!renderRow(row, rowIndex)) break;
      }
    }

    const objects: Record<number, string> = {};
    const makeObj = (n: number, body: string) => `${n} 0 obj\n${body}\nendobj\n`;

    const fontRegularObjNum = 3 + pages.length;
    const fontBoldObjNum = fontRegularObjNum + 1;
    let nextObj = fontBoldObjNum + 1;

    const pageRefs: number[] = [];
    for (let i = 0; i < pages.length; i++) {
      const contentObjNum = nextObj++;
      const content = pages[i] + "\n";
      objects[contentObjNum] = makeObj(
        contentObjNum,
        `<< /Length ${encoder.encode(content).length} >>\nstream\n${content}endstream`
      );

      const pageObjNum = 3 + i;
      pageRefs.push(pageObjNum);
      objects[pageObjNum] = makeObj(
        pageObjNum,
        `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageW} ${pageH}] /Resources << /Font << /F1 ${fontRegularObjNum} 0 R /F2 ${fontBoldObjNum} 0 R >> >> /Contents ${contentObjNum} 0 R >>`
      );
    }

    objects[fontRegularObjNum] = makeObj(fontRegularObjNum, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
    objects[fontBoldObjNum] = makeObj(fontBoldObjNum, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>");
    objects[2] = makeObj(
      2,
      `<< /Type /Pages /Kids [${pageRefs.map((r) => `${r} 0 R`).join(" ")}] /Count ${pageRefs.length} >>`
    );
    objects[1] = makeObj(1, "<< /Type /Catalog /Pages 2 0 R >>");

    const header = "%PDF-1.4\n";
    const chunks: Uint8Array[] = [encoder.encode(header)];
    const offsets: number[] = [];
    offsets[0] = 0;

    const maxObjNum = Math.max(...Object.keys(objects).map((k) => Number(k)));
    let cursor = chunks[0].length;
    for (let i = 1; i <= maxObjNum; i++) {
      const obj = objects[i];
      offsets[i] = cursor;
      const bytes = encoder.encode(obj);
      chunks.push(bytes);
      cursor += bytes.length;
    }

    const xrefStart = cursor;
    const pad10 = (n: number) => String(n).padStart(10, "0");
    const xrefEntries: string[] = [];
    xrefEntries.push(`${pad10(0)} 65535 f `);
    for (let i = 1; i <= maxObjNum; i++) {
      xrefEntries.push(`${pad10(offsets[i])} 00000 n `);
    }

    const xref = [
      "xref",
      `0 ${maxObjNum + 1}`,
      ...xrefEntries,
      "trailer",
      `<< /Size ${maxObjNum + 1} /Root 1 0 R >>`,
      "startxref",
      String(xrefStart),
      "%%EOF\n",
    ].join("\n");

    chunks.push(encoder.encode(xref));

    const total = chunks.reduce((sum, b) => sum + b.length, 0);
    const out = new Uint8Array(total);
    let o = 0;
    for (const b of chunks) {
      out.set(b, o);
      o += b.length;
    }

    return new Blob([out], { type: "application/pdf" });
  };

  const handleDownload = () => {
    if (reportType === "group_report" && !selectedWiegandGroup?.id) {
      return;
    }

    const accessLogSearch = searchQuery.trim();

    const payload = {
      report_type: reportType,
      page: 1,
      limit: "all" as const,
      sortField: "created_at",
      sortOrder: "desc" as const,
      format: downloadFormat,
      start_date: startDate ? startDate.format("YYYY-MM-DD") : undefined,
      end_date: endDate ? endDate.format("YYYY-MM-DD") : undefined,
      id:
        reportType === "device_report"
          ? selectedDevice?.id
          : reportType === "group_report"
            ? selectedWiegandGroup?.id
            : undefined,
      user_id:
        reportType === "user_report" || reportType === "user_wiegand_report"
          ? selectedUser?.user_id ?? undefined
          : reportType === "access_log_report"
            ? selectedUser?.user_id ?? (accessLogSearch ? accessLogSearch : undefined)
          : undefined,
      name:
        reportType === "access_log_report"
          ? selectedUser?.name ?? (accessLogSearch ? accessLogSearch : undefined)
          : undefined,
    };

    downloadMutation.mutate(payload, {
      onSuccess: async (data: any) => {
        const ext = downloadFormat === "excel" ? "xls" : downloadFormat;
        const filename = `${sanitizeFileName(reportType)}.${ext}`;

        if (data instanceof Blob) {
          const isJson = data.type?.includes("application/json");
          if (!isJson) {
            downloadBlob(data, filename);
            return;
          }

          const jsonText = await data.text();
          const json = JSON.parse(jsonText);

          const rows = Array.isArray(json?.data) ? (json.data as Array<Record<string, unknown>>) : [];

          if (downloadFormat === "csv") {
            downloadTextFile(toCsv(rows), `${sanitizeFileName(reportType)}.csv`, "text/csv;charset=utf-8");
            return;
          }

          if (downloadFormat === "excel") {
            downloadTextFile(
              toXlsHtmlTable(rows),
              `${sanitizeFileName(reportType)}.xls`,
              "application/vnd.ms-excel"
            );
            return;
          }

          if (downloadFormat === "pdf") {
            const normalized = normalizeRows(json);
            const materialized = normalized.map((r) => {
              if (!r || typeof r !== "object") return { value: r ?? "" } as any;
              try {
                return JSON.parse(JSON.stringify(r));
              } catch {
                return r;
              }
            });

            const flatRows = materialized.map((r) => flatten(r as any));

            const colSet = new Set<string>();
            const cols: string[] = [];
            for (const r of flatRows) {
              for (const c of Object.keys(r)) {
                if (shouldExcludeKey(c)) continue;
                if (!colSet.has(c)) {
                  colSet.add(c);
                  cols.push(c);
                }
              }
            }

            const maxCols = 8;
            const visibleCols = cols.slice(0, maxCols);
            const headerLabels = visibleCols.map((c) => formatHeader(c));
            const body = flatRows.map((r) =>
              visibleCols.map((c) => {
                const v = (r as any)[c];
                const lc = c.toLowerCase();
                if (lc.includes("created") || lc.includes("updated") || lc.includes("date")) return formatDateTime(v);
                return String(v ?? "");
              })
            );

            const title = toTitleCase(String(json?.report_type ?? reportType).replaceAll("_", " "));
            const subTitle = `Date: ${payload.start_date ?? "-"} to ${payload.end_date ?? "-"}`;

            if (body.length === 0) {
              downloadBlob(buildSimplePdf([`Report: ${title}`, subTitle, "No data"]), `${sanitizeFileName(reportType)}.pdf`);
              return;
            }

            try {
              downloadBlob(
                buildTablePdf({ title, subTitle, columns: headerLabels, rows: body }),
                `${sanitizeFileName(reportType)}.pdf`
              );
            } catch (e) {
              downloadTextFile(
                JSON.stringify(json, null, 2),
                `${sanitizeFileName(reportType)}.json`,
                "application/json;charset=utf-8"
              );
            }
            return;
          }

          // Fallback: download JSON
          downloadTextFile(
            JSON.stringify(json, null, 2),
            `${sanitizeFileName(reportType)}.json`,
            "application/json;charset=utf-8"
          );
          return;
        }

        // If the API actually returns JSON directly
        downloadTextFile(
          JSON.stringify(data, null, 2),
          `${sanitizeFileName(reportType)}.json`,
          "application/json;charset=utf-8"
        );
      },
    });
  };

  const onSelectReportType = (next: ReportType) => {
    setReportType(next);
    setSearchText("");
    setSearchQuery("");
    setSelectedUser(null);
    setSelectedDevice(null);
    setSelectedWiegandGroup(null);
  };

  return (
    <div className="p-4">
      <h1 className="text-primary font-extrabold text-4xl mb-2">Reports</h1>

      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6 mt-4">
        <Paper className="p-3 border border-primary" elevation={1}>
          <Typography variant="h6" className="text-primary! font-bold! mb-2">
            Report Types
          </Typography>
          <List dense>
            {reportTabs.map((t) => {
              const selected = t.key === reportType;
              return (
                <ListItemButton
                  key={t.key}
                  selected={selected}
                  onClick={() => onSelectReportType(t.key)}
                  className={selected ? "text-primary! font-semibold border-l-4 border-primary bg-primary/10!" : ""}
                >
                  <ListItemText primary={t.label} />
                </ListItemButton>
              );
            })}
          </List>
        </Paper>

        <Paper className="p-4 border border-primary" elevation={1}>
          <Typography variant="h6" className="text-primary! font-bold! mb-3">
            Filters
          </Typography>

          <div className="grid grid-cols-1 gap-4">
            {(reportType === "user_report" || reportType === "user_wiegand_report") && (
              <SearchSuggest<UserData>
                label="Search User"
                value={searchText}
                onChange={(v) => {
                  setSearchText(v);
                  setSearchQuery(v);
                  setSelectedUser(null);
                }}
                items={usersData?.data ?? []}
                loading={isUsersFetching}
                getKey={(u) => u.id}
                getPrimary={(u) => u.name}
                getSecondary={(u) => u.user_id}
                onSelect={(u) => {
                  setSelectedUser(u);
                  setSearchText(`${u.name}`);
                  setSearchQuery("");
                }}
                emptyText="No users"
              />
            )}

            {reportType === "device_report" && (
              <SearchSuggest<Device>
                label="Search Device"
                value={searchText}
                onChange={(v) => {
                  setSearchText(v);
                  setSearchQuery(v);
                  setSelectedDevice(null);
                }}
                items={devicesData?.data ?? []}
                loading={isDevicesFetching}
                getKey={(d) => d.id}
                getPrimary={(d) => d.device_name ?? "Unnamed"}
                getSecondary={(d) => d.sn}
                onSelect={(d) => {
                  setSelectedDevice(d);
                  setSearchText(`${d.device_name ?? "Unnamed"} (${d.sn})`);
                  setSearchQuery("");
                }}
                emptyText="No devices"
              />
            )}

            {reportType === "group_report" && (
              <SearchSuggest<WiegandGroup>
                label="Search Group"
                value={searchText}
                onChange={(v) => {
                  setSearchText(v);
                  setSearchQuery(v);
                  setSelectedWiegandGroup(null);
                }}
                items={filteredWiegandGroups}
                loading={isWiegandGroupsFetching}
                getKey={(g) => `${g.id ?? g.group_id}:${g.sn ?? ""}`}
                getPrimary={(g) => g.group_id}
                getSecondary={(g) => g.sn ?? ""}
                onSelect={(g) => {
                  setSelectedWiegandGroup(g);
                  setSearchText(g.group_id);
                  setSearchQuery("");
                }}
                emptyText="No groups"
              />
            )}

            {reportType === "access_log_report" && (
              <SearchSuggest<UserData>
                label="Search User (Access Log)"
                value={searchText}
                onChange={(v) => {
                  setSearchText(v);
                  setSearchQuery(v);
                  setSelectedUser(null);
                }}
                items={usersData?.data ?? []}
                loading={isUsersFetching}
                getKey={(u) => u.id}
                getPrimary={(u) => u.name}
                getSecondary={(u) => u.user_id}
                onSelect={(u) => {
                  setSelectedUser(u);
                  setSearchText(`${u.name}`);
                  setSearchQuery("");
                }}
                emptyText="No users"
              />
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <DatePicker
                label="Start Date"
                value={startDate}
                onChange={(value) => setStartDate(value)}
                slotProps={{ textField: { size: "small", fullWidth: true } }}
              />
              <DatePicker
                label="End Date"
                value={endDate}
                minDate={startDate ?? undefined}
                onChange={(value) => setEndDate(value)}
                slotProps={{ textField: { size: "small", fullWidth: true } }}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
              <FormControl size="small" fullWidth>
                <InputLabel id="download-format-label">Download</InputLabel>
                <Select
                  labelId="download-format-label"
                  label="Download"
                  value={downloadFormat}
                  onChange={(e) => setDownloadFormat(e.target.value as DownloadFormat)}
                >
                  <MenuItem value="csv">CSV</MenuItem>
                  <MenuItem value="excel">Excel</MenuItem>
                  <MenuItem value="pdf">PDF</MenuItem>
                </Select>
              </FormControl>

              <Button
                variant="contained"
                className="bg-primary! md:col-span-2"
                onClick={handleDownload}
                disabled={downloadMutation.isPending}
              >
                {downloadMutation.isPending ? "Downloading..." : "Download"}
              </Button>
            </div>

            {/* {(apiNote || apiPreview) && (
              <div className="rounded border p-3">
                <Typography variant="subtitle1" className="font-semibold! mb-2">
                  Export Note
                </Typography>
                {apiNote && (
                  <Typography variant="body2" className="text-gray-600!">
                    {apiNote}
                  </Typography>
                )}
                {!!apiPreview && (
                  <Typography variant="body2" sx={{ fontFamily: "monospace", whiteSpace: "pre-wrap", mt: 1 }}>
                    {JSON.stringify(apiPreview, null, 2)}
                  </Typography>
                )}
              </div>
            )} */}

            {downloadMutation.isError && (
              <Typography variant="body2" className="text-red-600!">
                Download failed.
              </Typography>
            )}
          </div>
        </Paper>
      </div>
    </div>
  );
};

export default MainReport;
