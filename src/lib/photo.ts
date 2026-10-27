/** 证件照输出尺寸：400px 约等于 34mm @ 300dpi，足够 A4 打印 */
export const PHOTO_SIZE = 400;

/** 单张照片（base64）的字符上限，避免 localStorage / JSON 备份失控 */
export const MAX_PHOTO_CHARS = 600_000;

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const PHOTO_DATA_URL = /^data:image\/(?:jpeg|png|webp);base64,[a-z0-9+/=]+$/i;

/** 只接受本工具生成的图片 Data URL，旧数据或恶意字符串会被丢弃。 */
export function isPhotoDataUrl(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length <= MAX_PHOTO_CHARS &&
    PHOTO_DATA_URL.test(value)
  );
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      if (!image.naturalWidth || !image.naturalHeight) {
        reject(new Error("图片尺寸无效，请换一张试试"));
        return;
      }
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("图片读取失败，请换一张试试"));
    };
    image.src = url;
  });
}

/**
 * 居中裁成正方形并压缩为 JPEG。
 * 400×400 / 0.82 通常只有 30–80KB，能安全放进 localStorage。
 */
export async function fileToPhoto(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("请选择 JPG、PNG 或 WebP 图片");
  }
  if (file.size > MAX_FILE_BYTES) {
    throw new Error("图片不能超过 10MB，请先压缩后再上传");
  }

  const image = await loadImage(file);
  const canvas = document.createElement("canvas");
  canvas.width = PHOTO_SIZE;
  canvas.height = PHOTO_SIZE;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("当前浏览器无法处理图片");

  // JPEG 不支持透明，先铺白底，避免 PNG 透明区域变黑
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, PHOTO_SIZE, PHOTO_SIZE);

  const scale = Math.max(
    PHOTO_SIZE / image.naturalWidth,
    PHOTO_SIZE / image.naturalHeight,
  );
  const width = image.naturalWidth * scale;
  const height = image.naturalHeight * scale;
  context.drawImage(
    image,
    (PHOTO_SIZE - width) / 2,
    (PHOTO_SIZE - height) / 2,
    width,
    height,
  );

  let data = canvas.toDataURL("image/jpeg", 0.82);
  if (data.length > MAX_PHOTO_CHARS) {
    data = canvas.toDataURL("image/jpeg", 0.62);
  }
  if (data.length > MAX_PHOTO_CHARS) {
    throw new Error("图片压缩后仍然过大，请换一张更小的照片");
  }
  return data;
}
