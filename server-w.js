console.log("DEBUG: process.env.PORT =", process.env.PORT);

import express from 'express';
import multer from 'multer';
import fetch from 'node-fetch';
import FormData from 'form-data';        // WICHTIG: FormData aus Paket, nicht native!
import dotenv from 'dotenv';
dotenv.config();

const app = express();
const upload = multer({ storage: multer.memoryStorage() });
const PORT = process.env.PORT || 8080;

app.post('/whisper', upload.single('file'), async (req, res) => {
  try {
    const formData = new FormData();
    // KEIN Blob, nur Buffer!
    formData.append('file', req.file.buffer, req.file.originalname);
    formData.append('model', 'whisper-1');
    formData.append('language', req.body.language || 'de');

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        ...formData.getHeaders()   // <<< WICHTIG FÜR RICHTIGES multipart/form-data!
      },
      body: formData
    });

    if (!response.ok) {
      const error = await response.text();
      return res.status(500).json({ error });
    }
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/', (req, res) => {
  res.send('Whisper-Proxy läuft!');
});

app.listen(PORT, () => {
  console.log(`Whisper-Proxy läuft auf Port ${PORT}`);
});
