import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { saveAs } from "file-saver";
import { Document, Packer, Paragraph, Table, TableCell, TableRow, WidthType, AlignmentType, HeadingLevel, TextRun } from "docx";
import { toPng } from "html-to-image";

interface ScheduleData {
  title: string;
  subtitle: string;
  viewType: string;
  timeBlocks: any[];
  assignments: any[];
}

export const exportToPDF = (data: ScheduleData) => {
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
  });

  // Header
  doc.setFontSize(20);
  doc.text("Oxford School - Santiago", 148.5, 20, { align: "center" });
  doc.setFontSize(16);
  doc.text(data.title, 148.5, 30, { align: "center" });
  doc.setFontSize(12);
  doc.text(data.subtitle, 148.5, 38, { align: "center" });

  const uniqueStartTimes = Array.from(new Set(data.timeBlocks.map((b) => b.startTime))).sort();
  const days = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"];
  
  const body = uniqueStartTimes.map((time) => {
    const row: any[] = [time];
    days.forEach((day, index) => {
      const dayValue = index + 1;
      const slotAssignments = data.assignments.filter(
        (a) => a.timeBlock.dayOfWeek === dayValue && a.timeBlock.startTime === time
      );
      
      if (slotAssignments.length > 0) {
        row.push(slotAssignments.map(a => 
          `${a.subject.name}\n${data.viewType !== 'teacher' ? 'P: ' + a.teacher.name : ''}\n${data.viewType !== 'grade' ? 'G: ' + a.grade.name + (a.grade.section || '') : ''}\n${data.viewType !== 'room' ? 'R: ' + a.room.name : ''}`
        ).join("\n---\n"));
      } else {
        const block = data.timeBlocks.find(b => b.startTime === time);
        row.push(block?.blockType !== 'CLASS' ? block?.blockType : "");
      }
    });
    return row;
  });

  autoTable(doc, {
    startY: 45,
    head: [["TIME", ...days]],
    body: body,
    theme: "grid",
    headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255] },
    styles: { fontSize: 8, cellPadding: 2, overflow: "linebreak" },
    columnStyles: { 0: { cellWidth: 25 } },
  });

  doc.save(`Horario_${data.title.replace(/\s+/g, "_")}.pdf`);
};

export const exportToWord = async (data: ScheduleData) => {
  const uniqueStartTimes = Array.from(new Set(data.timeBlocks.map((b) => b.startTime))).sort();
  const days = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"];

  const headerRow = new TableRow({
    children: ["TIME", ...days].map(text => new TableCell({
      children: [new Paragraph({ text, alignment: AlignmentType.CENTER })],
      shading: { fill: "0f172a", color: "ffffff" },
    })),
  });

  const tableRows = uniqueStartTimes.map(time => {
    const cells = [
      new TableCell({ children: [new Paragraph({ 
        children: [new TextRun({ text: time, bold: true })]
      })] })
    ];

    days.forEach((day, index) => {
      const dayValue = index + 1;
      const slotAssignments = data.assignments.filter(
        (a) => a.timeBlock.dayOfWeek === dayValue && a.timeBlock.startTime === time
      );

      let cellContent: Paragraph[] = [];
      if (slotAssignments.length > 0) {
        slotAssignments.forEach((a, i) => {
          if (i > 0) cellContent.push(new Paragraph({ text: "---" }));
          cellContent.push(new Paragraph({ children: [new TextRun({ text: a.subject.name, bold: true })] }));
          if (data.viewType !== 'teacher') {
            cellContent.push(new Paragraph({ 
              children: [new TextRun({ text: `P: ${a.teacher.name}`, size: 16 })] 
            }));
          }
          if (data.viewType !== 'grade') {
            cellContent.push(new Paragraph({ 
              children: [new TextRun({ text: `G: ${a.grade.name}${a.grade.section || ''}`, size: 16 })] 
            }));
          }
          if (data.viewType !== 'room') {
            cellContent.push(new Paragraph({ 
              children: [new TextRun({ text: `R: ${a.room.name}`, size: 16 })] 
            }));
          }
        });
      } else {
        const block = data.timeBlocks.find(b => b.startTime === time);
        cellContent.push(new Paragraph({ 
          children: [new TextRun({ 
            text: block?.blockType !== 'CLASS' ? block?.blockType : "", 
            color: "94a3b8"
          })],
          alignment: AlignmentType.CENTER,
        }));
      }

      cells.push(new TableCell({ children: cellContent }));
    });

    return new TableRow({ children: cells });
  });

  const doc = new Document({
    sections: [{
      properties: { page: { size: { orientation: "landscape" as any } } },
      children: [
        new Paragraph({ text: "Oxford School - Santiago", heading: HeadingLevel.HEADING_1, alignment: AlignmentType.CENTER }),
        new Paragraph({ text: data.title, heading: HeadingLevel.HEADING_2, alignment: AlignmentType.CENTER }),
        new Paragraph({ text: data.subtitle, alignment: AlignmentType.CENTER, spacing: { after: 400 } }),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [headerRow, ...tableRows],
        }),
      ],
    }],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `Horario_${data.title.replace(/\s+/g, "_")}.docx`);
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
