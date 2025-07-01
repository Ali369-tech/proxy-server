const express = require('express');
const fetch = require('node-fetch');
const app = express();

const PORT = process.env.PORT || 3000;

app.get('/proxy', async (req, res) => {
  const url = req.query.url;
  const range = req.headers.range;

  if (!url) return res.status(400).send('Missing url parameter');

  try {
    const headRes = await fetch(url, { method: 'HEAD' });
    const contentLength = parseInt(headRes.headers.get('content-length'), 10);
    const contentType = headRes.headers.get('content-type') || 'audio/mpeg';

    if (range && !isNaN(contentLength)) {
      const [startStr, endStr] = range.replace(/bytes=/, '').split('-');
      const start = parseInt(startStr, 10);
      const end = endStr ? parseInt(endStr, 10) : contentLength - 1;

      const chunkSize = end - start + 1;
      const headers = {
        'Content-Range': `bytes ${start}-${end}/${contentLength}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize,
        'Content-Type': contentType
      };

      res.writeHead(206, headers);

      const streamRes = await fetch(url, {
        headers: { Range: `bytes=${start}-${end}` }
      });

      streamRes.body.pipe(res);
    } else {
      const headers = {
        'Content-Type': contentType,
        'Accept-Ranges': 'bytes'
      };
      if (!isNaN(contentLength)) headers['Content-Length'] = contentLength;

      res.writeHead(200, headers);

      const streamRes = await fetch(url);
      streamRes.body.pipe(res);
    }
  } catch (err) {
    console.error('Proxy error:', err);
    res.status(500).send('Proxy error: ' + err.message);
  }
});

app.listen(PORT, () => {
  console.log(`🎧 Dropbox MP3 proxy running at http://localhost:${PORT}`);
});
