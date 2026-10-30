import { AlignmentType, Document, Packer, Paragraph, TextRun } from "docx";
import type { Resume } from "@/lib/types";

const FONT = "微软雅黑";

export function safeFileName(value: string, fallback = "简历"): string {
  const cleaned = value
    .replace(/[\\/:*?"<>|]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned || fallback;
}

function heading(text: string): Paragraph {
  return new Paragraph({
    spacing: { before: 240, after: 80 },
    border: {
      bottom: { color: "D4D4D8", space: 4, style: "single", size: 6 },
    },
    children: [
      new TextRun({ text, bold: true, size: 24, font: FONT, color: "18181B" }),
    ],
  });
}

function line(text: string, options: { bold?: boolean; size?: number; color?: string; after?: number } = {}) {
  return new Paragraph({
    spacing: { after: options.after ?? 40 },
    children: [
      new TextRun({
        text: text || " ",
        bold: options.bold,
        size: options.size ?? 21,
        color: options.color ?? "3F3F46",
        font: FONT,
      }),
    ],
  });
}

function bullet(text: string): Paragraph {
  return new Paragraph({
    bullet: { level: 0 },
    spacing: { after: 40 },
    children: [new TextRun({ text, size: 21, color: "3F3F46", font: FONT })],
  });
}

function dateRange(start: string, end: string): string {
  return [start, end].filter(Boolean).join(" — ");
}

/**
 * 生成 Word（.docx）。
 *
 * 只导出中文主字段：英文/双语是展示层覆盖，Word 里混排容易错位，
 * 需要英文版时用打印或 ATS 导出更稳。结构按「单列、无表格」组织，
 * ATS 解析器读到的顺序与屏幕一致。
 */
export async function buildResumeDocx(resume: Resume): Promise<Blob> {
  const children: Paragraph[] = [];

  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 60 },
      children: [
        new TextRun({
          text: resume.basic.name || "未命名",
          bold: true,
          size: 40,
          font: FONT,
        }),
      ],
    }),
  );

  const contact = [
    resume.basic.headline,
    resume.basic.phone,
    resume.basic.email,
    resume.basic.city,
    resume.basic.website,
    resume.basic.github,
  ].filter(Boolean);
  if (contact.length > 0) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 120 },
        children: [
          new TextRun({
            text: contact.join(" · "),
            size: 19,
            color: "52525B",
            font: FONT,
          }),
        ],
      }),
    );
  }

  if (resume.intent.targetRole.trim()) {
    children.push(
      line(
        `求职意向：${resume.intent.targetRole}${
          resume.intent.targetCity.trim() ? ` · ${resume.intent.targetCity}` : ""
        }${resume.intent.experience ? ` · ${resume.intent.experience}` : ""}`,
      ),
    );
  }

  if (resume.basic.summary.trim()) {
    children.push(heading("个人简介"));
    for (const paragraph of resume.basic.summary.split(/\n+/)) {
      if (paragraph.trim()) children.push(line(paragraph.trim()));
    }
  }

  if (resume.experiences.length > 0) {
    children.push(heading("工作经历"));
    for (const item of resume.experiences) {
      children.push(
        new Paragraph({
          spacing: { before: 80, after: 20 },
          children: [
            new TextRun({
              text: `${item.company || "公司"}${item.role ? ` · ${item.role}` : ""}`,
              bold: true,
              size: 22,
              font: FONT,
            }),
            new TextRun({
              text: dateRange(item.start, item.end) ? `　${dateRange(item.start, item.end)}` : "",
              size: 19,
              color: "71717A",
              font: FONT,
            }),
          ],
        }),
      );
      for (const row of item.description.split(/\n+/)) {
        if (row.trim()) children.push(bullet(row.replace(/^[-•·]\s*/, "").trim()));
      }
    }
  }

  if (resume.projects.length > 0) {
    children.push(heading("项目经历"));
    for (const item of resume.projects) {
      children.push(
        new Paragraph({
          spacing: { before: 80, after: 20 },
          children: [
            new TextRun({
              text: `${item.name || "项目"}${item.role ? ` · ${item.role}` : ""}`,
              bold: true,
              size: 22,
              font: FONT,
            }),
            new TextRun({
              text: dateRange(item.start, item.end) ? `　${dateRange(item.start, item.end)}` : "",
              size: 19,
              color: "71717A",
              font: FONT,
            }),
          ],
        }),
      );
      for (const row of item.description.split(/\n+/)) {
        if (row.trim()) children.push(bullet(row.replace(/^[-•·]\s*/, "").trim()));
      }
    }
  }

  if (resume.educations.length > 0) {
    children.push(heading("教育经历"));
    for (const item of resume.educations) {
      children.push(
        new Paragraph({
          spacing: { before: 60, after: 20 },
          children: [
            new TextRun({
              text: [item.school, item.major, item.degree].filter(Boolean).join(" · ") || "学校",
              bold: true,
              size: 22,
              font: FONT,
            }),
            new TextRun({
              text: dateRange(item.start, item.end) ? `　${dateRange(item.start, item.end)}` : "",
              size: 19,
              color: "71717A",
              font: FONT,
            }),
          ],
        }),
      );
      const extra = [item.gpa && `GPA ${item.gpa}`, item.ranking, item.honors]
        .filter(Boolean)
        .join(" · ");
      if (extra) children.push(line(extra, { size: 19, color: "71717A" }));
    }
  }

  if (resume.skills.length > 0) {
    children.push(heading("技能"));
    children.push(line(resume.skills.join("、")));
  }

  const document = new Document({
    styles: {
      default: {
        document: {
          run: { font: FONT, size: 21 },
        },
      },
    },
    sections: [
      {
        properties: {
          page: { margin: { top: 720, bottom: 720, left: 900, right: 900 } },
        },
        children,
      },
    ],
  });

  return Packer.toBlob(document);
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = "noopener";
  anchor.click();
  // 立刻 revoke 会让部分浏览器下载失败，留一拍
  window.setTimeout(() => URL.revokeObjectURL(url), 4000);
}
