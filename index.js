const express = require('express');
const fetch = require('node-fetch');
const app = express();

const PORT = process.env.PORT || 3000;

app.get('/proxy', async (req, res) => {
  const url = req.query.url;
  const range = req.headers.range;

  if (!url) return res.status(400).send('Missing url parameter');

  try {
    // Fetch only headers to get content info
    const head = await fetch(url, { method: 'HEAD' });
    const contentLength = parseInt(head.headers.get('content-length'), 10);
    const contentType = head.headers.get('content-type') || 'audio/mpeg';

    const headers = {
      'Content-Type': contentType,
      'Accept-Ranges': 'bytes'
    };

    if (range && contentLength) {
      // Handle range requests
      const [startStr, endStr] = range.replace(/bytes=/, '').split('-');
      const start = parseInt(startStr, 10);
      const end = endStr ? parseInt(endStr, 10) : contentLength - 1;
      const chunkSize = end - start + 1;

      headers['Content-Range'] = `bytes ${start}-${end}/${contentLength}`;
      headers['Content-Length'] = chunkSize;

      res.writeHead(206, headers);

      const stream = await fetch(url, {
        headers: { Range: `bytes=${start}-${end}` }
      });

      stream.body.pipe(res);
    } else {
      // No range: stream entire file
      if (contentLength) headers['Content-Length'] = contentLength;
      res.writeHead(200, headers);

      const stream = await fetch(url);
      stream.body.pipe(res);
    }
  } catch (err) {
    console.error('Proxy error:', err.message);
    res.status(500).send('Proxy error: ' + err.message);
  }
});

app.listen(PORT, () => {
  console.log(`✅ MP3 Proxy Server is running at http://localhost:${PORT}`);
});
