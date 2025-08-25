const express = require("express");
const multer = require("multer");
const cors = require("cors");
const axios = require("axios");
const fs = require("fs");
const os = require("os");
require("dotenv").config();

const app = express();
const port = 3001;

app.use(cors());

// temporary storage for uploaded files
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, os.tmpdir()),
  filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname),
});

function fileFilter(req, file, cb) {
  const allowed = [
    "application/acad",
    "application/x-acad",
    "application/dwg",
    "image/vnd.dwg",
    "application/octet-stream",
  ];
  if (allowed.includes(file.mimetype) || file.originalname.endsWith(".dwg")) {
    cb(null, true);
  } else {
    cb(new Error("Недопустимый MIME тип"));
  }
}

const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter,
}); // 100 MB limit

const { APS_CLIENT_ID, APS_CLIENT_SECRET, APS_BUCKET } = process.env;

if (!APS_CLIENT_ID || !APS_CLIENT_SECRET || !APS_BUCKET) {
  console.warn("APS credentials are not fully defined in environment variables.");
}

async function authenticate() {
  const params = new URLSearchParams();
  params.append("client_id", APS_CLIENT_ID);
  params.append("client_secret", APS_CLIENT_SECRET);
  params.append("grant_type", "client_credentials");
  params.append("scope", "data:read data:write bucket:create bucket:read");
  const { data } = await axios.post(
    "https://developer.api.autodesk.com/authentication/v1/authenticate",
    params,
    { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
  );
  return data.access_token;
}

async function ensureBucket(token) {
  const bucketKey = APS_BUCKET.toLowerCase();
  try {
    await axios.get(
      `https://developer.api.autodesk.com/oss/v2/buckets/${bucketKey}/details`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
  } catch (err) {
    if (err.response && err.response.status === 404) {
      await axios.post(
        "https://developer.api.autodesk.com/oss/v2/buckets",
        { bucketKey, policyKey: "transient" },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );
    } else {
      throw err;
    }
  }
  return bucketKey;
}

async function uploadObject(token, bucketKey, file) {
  const objectKey = file.originalname;
  const data = fs.readFileSync(file.path);
  await axios.put(
    `https://developer.api.autodesk.com/oss/v2/buckets/${bucketKey}/objects/${encodeURIComponent(
      objectKey
    )}`,
    data,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/octet-stream",
      },
    }
  );
  return Buffer.from(`${bucketKey}/${objectKey}`)
    .toString("base64")
    .replace(/=/g, "");
}

async function translateToSTL(token, urn, format, unit) {
  await axios.post(
    "https://developer.api.autodesk.com/modelderivative/v2/designdata/job",
    {
      input: { urn },
      output: {
        formats: [
          {
            type: "stl",
            advanced: { format, unit },
          },
        ],
      },
    },
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    }
  );
}

async function pollManifest(token, urn) {
  const encodedUrn = encodeURIComponent(urn);
  while (true) {
    const { data } = await axios.get(
      `https://developer.api.autodesk.com/modelderivative/v2/designdata/${encodedUrn}/manifest`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (data.status === "success") {
      const derivative = data.derivatives.find((d) => d.outputType === "stl");
      if (derivative) {
        if (derivative.children && derivative.children.length) {
          return derivative.children[0].urn;
        }
        throw new Error("Пустая модель");
      }
      throw new Error("2D-чертёж");
    } else if (data.status === "failed") {
      throw new Error("Translation failed");
    }
    await new Promise((r) => setTimeout(r, 5000));
  }
}

async function scanForViruses(filePath) {
  // В этом месте следует вызвать ClamAV для проверки файла
}

// POST /api/convert
app.post("/api/convert", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Файл не загружен" });
    }
    const format = req.body.format === "ascii" ? "ascii" : "binary";
    const unit = ["mm", "cm", "m"].includes(req.body.unit) ? req.body.unit : "mm";

    await scanForViruses(req.file.path);

    const token = await authenticate();
    const bucketKey = await ensureBucket(token);
    const urn = await uploadObject(token, bucketKey, req.file);
    await translateToSTL(token, urn, format, unit);
    const derivativeUrn = await pollManifest(token, urn);

    const url = `/api/download/${encodeURIComponent(urn)}/${encodeURIComponent(
      derivativeUrn
    )}`;

    fs.unlink(req.file.path, () => {}); // автоудаление
    return res.json({ status: "ok", url });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message || "Ошибка конвертации" });
  }
});

app.get("/api/download/:urn/:derivativeUrn", async (req, res) => {
  try {
    const token = await authenticate();
    const url = `https://developer.api.autodesk.com/modelderivative/v2/designdata/${req.params.urn}/manifest/${req.params.derivativeUrn}`;
    const response = await axios.get(url, {
      headers: { Authorization: `Bearer ${token}` },
      responseType: "stream",
    });
    res.setHeader("Content-Disposition", "attachment; filename=result.stl");
    response.data.pipe(res);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Ошибка скачивания" });
  }
});

// GET /api/status
app.get("/api/status", (req, res) => {
  res.json({ status: "running" });
});

app.use((err, req, res, next) => {
  if (err.code === "LIMIT_FILE_SIZE") {
    return res.status(413).json({ error: "Файл больше 100 МБ" });
  }
  if (err.message) {
    return res.status(400).json({ error: err.message });
  }
  next(err);
});

if (require.main === module) {
  app.listen(port, () => {
    console.log(`Backend listening on http://localhost:${port}`);
  });
}

module.exports = app;
