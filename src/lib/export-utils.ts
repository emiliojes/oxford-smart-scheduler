import { toPng } from "html-to-image";
import { saveAs } from "file-saver";

interface ScheduleData {
  title: string;
  subtitle: string;
  viewType: string;
  timeBlocks: any[];
  assignments: any[];
}

function calcHours(data: ScheduleData) {
  const DUTY_KEYWORDS = ["Duty", "Resource Room Support", "Homeroom"];
  const teaching = data.assignments.filter(a =>
    a.timeBlock.blockType === "CLASS" && !DUTY_KEYWORDS.some(k => a.subject.name.includes(k))
  );
  const totalMins = teaching.reduce((sum: number, a: any) => sum + parseFloat(String(a.timeBlock.duration ?? 0)), 0);
  const h = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  const label = m > 0 ? `${h}h ${m}min` : `${h}h`;
  const dayNames = ["Lun", "Mar", "Mié", "Jue", "Vie"];
  const perDay = [1,2,3,4,5].map(d => {
    const mins = teaching.filter((a: any) => a.timeBlock.dayOfWeek === d)
      .reduce((s: number, a: any) => s + parseFloat(String(a.timeBlock.duration ?? 0)), 0);
    if (mins === 0) return "";
    const dh = Math.floor(mins / 60), dm = mins % 60;
    return `${dayNames[d-1]}: ${dm > 0 ? `${dh}h${dm}` : `${dh}h`}`;
  }).filter(Boolean).join(" &nbsp;|&nbsp; ");
  return { label, perDay };
}

function buildScheduleHTML(data: ScheduleData): string {
  const uniqueStartTimes = Array.from(new Set(data.timeBlocks.map((b) => b.startTime))).sort();
  const days = ["LUNES", "MARTES", "MIÉRCOLES", "JUEVES", "VIERNES"];
  const dayValues = [1, 2, 3, 4, 5];
  const { label: hoursLabel, perDay: hoursPerDay } = calcHours(data);

  // Grade color palette (same as web)
  const GRADE_COLORS: Record<string, string> = {
    "PK": "#fbbf24", "K": "#fb923c", "1": "#f87171", "2": "#fb7185",
    "3": "#c084fc", "4": "#a78bfa", "5": "#818cf8", "6": "#60a5fa",
    "7": "#38bdf8", "8": "#22d3ee", "9": "#2dd4bf", "10": "#10b981",
    "11": "#84cc16", "12": "#eab308"
  };
  const getGradeColor = (gradeNum?: string | null) => {
    if (!gradeNum) return "#94a3b8";
    return GRADE_COLORS[gradeNum] || "#94a3b8";
  };

  const headerCells = ["HORA", ...days].map(d =>
    `<th style="background:#1e3a5f;color:white;padding:3px 4px;font-size:8px;text-align:center;border:1px solid #ccc;font-weight:bold;">${d}</th>`
  ).join("");

  const rows = uniqueStartTimes.map(time => {
    const block = data.timeBlocks.find(b => b.startTime === time);
    const endTime = block?.endTime ?? "";
    const label = endTime ? `${time} - ${endTime}` : time;
    const isSpecial = block?.blockType === "BREAK" || block?.blockType === "LUNCH";
    const rowBg = block?.blockType === "BREAK" ? "#f1f5f9" : block?.blockType === "LUNCH" ? "#fef9c3" : "white";

    const cells = dayValues.map(dayValue => {
      const slotA = data.assignments.filter(
        a => a.timeBlock.dayOfWeek === dayValue && a.timeBlock.startTime === time
      );
      if (slotA.length === 0 && isSpecial) {
        return `<td style="background:${rowBg};text-align:center;font-weight:bold;font-size:7px;color:#666;border:1px solid #ddd;vertical-align:middle;">${block?.blockType}</td>`;
      }
      if (slotA.length === 0) return `<td style="background:${rowBg};border:1px solid #ddd;"></td>`;

      const content = slotA.map(a => {
        const grade = a.grade ? `${a.grade.name}${a.grade.section || ""}` : "";
        const room = a.room ? a.room.name : "";
        const teacher = data.viewType !== "teacher" ? a.teacher.name : "";
        const gradeNum = a.grade?.name;
        const gradeColor = getGradeColor(gradeNum);
        const bgColor = gradeNum ? gradeColor : "#e2e8f0";
        const textColor = gradeNum ? "white" : "#334155";
        const isDuty = ["Duty", "Resource Room Support", "Homeroom"].some(k => a.subject.name.includes(k));
        const dutyBg = isDuty ? "#fed7aa" : bgColor;
        const dutyText = isDuty ? "#7c2d12" : textColor;
        return [
          `<div style="background:${dutyBg};color:${dutyText};padding:2px 3px;border-radius:2px;margin-bottom:1px;">`,
          `<div style="font-weight:bold;font-size:7px;line-height:1.1;">${a.subject.name}</div>`,
          grade ? `<div style="font-size:6px;line-height:1.1;">${grade}</div>` : "",
          teacher ? `<div style="font-size:6px;line-height:1.1;">${teacher}</div>` : "",
          room ? `<div style="font-size:6px;line-height:1.1;">${room}</div>` : "",
          a.note ? `<div style="font-size:6px;line-height:1.1;">(${a.note})</div>` : "",
          `</div>`
        ].join("");
      }).join("");

      return `<td style="background:${rowBg};padding:1px 2px;border:1px solid #ddd;vertical-align:top;">${content}</td>`;
    }).join("");

    return `<tr>
      <td style="font-weight:bold;font-size:8px;white-space:nowrap;padding:2px 4px;background:#f8fafc;border:1px solid #ccc;">${label}</td>
      ${cells}
    </tr>`;
  }).join("");

  return `<!DOCTYPE html><html><head><meta charset="UTF-8">
    <style>
      body { font-family: Arial, sans-serif; margin: 0; padding: 6px; font-size: 8px; }
      table { border-collapse: collapse; width: 100%; table-layout: fixed; }
      h2,h3,p { text-align: center; margin: 2px 0; }
      td, th { border: 1px solid #ddd; }
      th { background: #1e3a5f; color: white; font-weight: bold; }
      td { vertical-align: top; }
      @media print {
        body { padding: 4px; }
        table { font-size: 7px; }
      }
    </style>
  </head><body>
    <h2 style="font-size:12px;">Oxford School - Santiago</h2>
    <h3 style="font-size:10px;">${data.title}</h3>
    <p style="font-size:8px;color:#666;">${data.subtitle}</p>
    <br>
    <table>
      <thead><tr>${headerCells}</tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div style="margin-top:8px;padding:4px 6px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:3px;font-family:Arial,sans-serif;">
      <span style="font-weight:bold;font-size:8px;color:#1e3a5f;">⏰ Total semanal de clases: </span>
      <span style="font-weight:bold;font-size:9px;color:#1d4ed8;">${hoursLabel}</span>
      <span style="font-size:7px;color:#64748b;margin-left:8px;">${hoursPerDay}</span>
    </div>
  </body></html>`;
}

export const exportToPDF = (data: ScheduleData) => {
  const html = buildScheduleHTML(data);
  const win = window.open("", "_blank");
  if (!win) { alert("Permite ventanas emergentes para exportar PDF"); return; }
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => { win.print(); }, 500);
};

export const exportToWord = async (data: ScheduleData) => {
  const html = buildScheduleHTML(data);
  const blob = new Blob([html], { type: "application/msword;charset=utf-8" });
  saveAs(blob, `Horario_${data.title.replace(/\s+/g, "_")}.doc`);
};

export const exportToImage = async (elementId: string, filename: string) => {
  const element = document.getElementById(elementId);
  if (!element) return;

  try {
    const dataUrl = await toPng(element, { backgroundColor: "#ffffff", cacheBust: true });
    saveAs(dataUrl, `${filename}.png`);
  } catch (error) {
    console.error("Error exporting to image:", error);
  }
};
