import "server-only";
import { createHash } from "node:crypto";
import sharp from "sharp";

/* 블로그 사진 올리기(docs/plans/admin-backend/blog.md §8).
 * - 받는 것은 JPEG · PNG · WebP 뿐이다. 브라우저가 말하는 형식을 믿지 않고, 파일 앞 바이트로 먼저 거른다 —
 *   sharp(libvips)는 SVG · TIFF · HEIF 도 읽으므로, 거르기 전에 넘기면 그런 파일까지 한 번 해석된다.
 * - 화소 수에 한도를 둔다(sharp 기본값은 약 2억 6천만). 작은 파일이 거대한 그림으로 풀리는 공격을 막는다.
 * - 방향 정보대로 돌린 뒤 WebP 로 다시 굽는다. sharp 는 따로 시키지 않으면 메타데이터를 모두 버린다(위치 · 기종 등 EXIF).
 * - 이름은 결과의 sha256 앞 24자다. 같은 사진은 같은 이름이고, 이름이 같으면 내용도 같다(공개 쪽이 immutable 로 보낸다). */
export const UPLOAD_MAX_BYTES = 15 * 1024 * 1024;
const MAX_PIXELS = 40_000_000;
const MAX_WIDTH = 1600;

function sniff(b: Buffer) {
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "jpeg";
  if (b.length >= 8 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "png";
  if (b.length >= 12 && b.subarray(0, 4).toString("latin1") === "RIFF" && b.subarray(8, 12).toString("latin1") === "WEBP") return "webp";
  return null;
}

export type ProcessedImage = { ok: true; name: string; width: number; height: number; bytes: Buffer } | { ok: false; message: string };

export async function processImage(input: Buffer): Promise<ProcessedImage> {
  if (input.length > UPLOAD_MAX_BYTES) return { ok: false, message: "사진은 15MB 까지 올릴 수 있습니다." };
  const format = sniff(input);
  if (!format) return { ok: false, message: "JPG · PNG · WebP 사진만 올릴 수 있습니다." };
  try {
    const { data, info } = await sharp(input, { limitInputPixels: MAX_PIXELS, animated: false, failOn: "error" })
      .rotate()
      .resize({ width: MAX_WIDTH, withoutEnlargement: true })
      .webp({ quality: 82, effort: 4 })
      .toBuffer({ resolveWithObject: true });
    const name = `${createHash("sha256").update(data).digest("hex").slice(0, 24)}.webp`;
    return { ok: true, name, width: info.width, height: info.height, bytes: data };
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (/pixel limit/i.test(message)) return { ok: false, message: "사진이 너무 큽니다(4천만 화소까지). 줄여서 올려 주세요." };
    return { ok: false, message: "사진을 읽지 못했습니다. 손상되지 않은 다른 파일로 해 보세요." };
  }
}
