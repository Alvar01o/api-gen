import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { randomUUID } from 'crypto';

const basePath = process.env.SCHEMA_TMP_PATH || '/tmp/schemas';
fs.mkdirSync(basePath, { recursive: true });

const maxSizeRaw = Number(process.env.MAX_SCHEMA_FILE_SIZE ?? 0);
const maxSize = maxSizeRaw > 0 ? maxSizeRaw : undefined;

const storage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const tenantId = (req as any).params?.tenantId ?? (req as any).tenant?.id;
    const dest = tenantId ? path.join(basePath, tenantId) : basePath;
    fs.mkdirSync(dest, { recursive: true });
    cb(null, dest);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.sql';
    cb(null, `${randomUUID()}${ext}`);
  },
});

function isSqlUpload(file: Express.Multer.File) {
  const extOk = path.extname(file.originalname).toLowerCase() === '.sql';
  const mime = (file.mimetype || '').toLowerCase();
  const mimeOk = mime.includes('text') || mime.includes('sql') || mime === 'application/octet-stream';
  return extOk && mimeOk;
}

export const uploadSchema = multer({
  storage,
  limits: maxSize ? { fileSize: maxSize } : undefined,
  fileFilter: (_req, file, cb) => {
    if (!isSqlUpload(file)) return cb(new Error('Only .sql files are allowed'));
    cb(null, true);
  },
});
