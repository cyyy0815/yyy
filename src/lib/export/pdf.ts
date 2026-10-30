import { toJpeg } from "html-to-image";
import { jsPDF } from "jspdf";

const A4 = { width: 210, height: 297 };

/**
 * 把预览里的纸张元素截成图片再按 A4 拼接成 PDF。
 *
 * 为什么用图片版：浏览器里没有可靠的矢量 PDF 生成方案（中文字体太大），
 * 而打印对话框虽然能出矢量 PDF，但需要用户手动另存。
 * 图片版一键下载、所见即所得；需要可选中文本或过 ATS 时用「打印 / PDF」或 ATS 导出。
 */
export async function exportElementToPdf(
  element: HTMLElement,
  filename: string,
): Promise<void> {
  // 用 JPEG 而不是 PNG：一张 A4 的 PNG 约 7 MB，JPEG 质量 0.92 只有 1 MB 左右
  const dataUrl = await toJpeg(element, {
    pixelRatio: 2,
    quality: 0.92,
    backgroundColor: "#ffffff",
    cacheBust: true,
  });

  const image = new Image();
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error("图片生成失败"));
    image.src = dataUrl;
  });

  const pdf = new jsPDF({
    unit: "mm",
    format: [A4.width, A4.height],
    orientation: "portrait",
  });

  const renderWidth = A4.width;
  const renderHeight = (image.height / image.width) * renderWidth;
  const pageHeight = A4.height;

  let heightLeft = renderHeight;
  let position = 0;

  pdf.addImage(dataUrl, "JPEG", 0, position, renderWidth, renderHeight);
  heightLeft -= pageHeight;

  while (heightLeft > 0) {
    position -= pageHeight;
    pdf.addPage();
    pdf.addImage(dataUrl, "JPEG", 0, position, renderWidth, renderHeight);
    heightLeft -= pageHeight;
  }

  pdf.save(filename);
}
