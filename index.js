const express = require('express');
const fetch = require('node-fetch');
const app = express();

app.get('/proxy', async (req, res) => {
  const url = req.query.url;
  const range = req.headers.range;

  if (!url) return res.status(400).send('Missing url parameter');

  try {
    const headRes = await fetch(url, { method: 'HEAD' });

    const contentLengthHeader = headRes.headers.get('content-length');
    const contentType = headRes.headers.get('content-type') || 'audio/mpeg';
    const contentLength = contentLengthHeader ? parseInt(contentLengthHeader, 10) : null;

    if (range && contentLength !== null) {
      const [start, end] = range.replace(/bytes=/, '').split('-');
      const startByte = parseInt(start, 10);
      const endByte = end ? parseInt(end, 10) : contentLength - 1;
      const chunkSize = endByte - startByte + 1;

      const headers = {
        'Content-Range': `bytes ${startByte}-${endByte}/${contentLength}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize,
        'Content-Type': contentType
      };

      res.writeHead(206, headers);

      const streamRes = await fetch(url, {
        headers: { Range: `bytes=${startByte}-${endByte}` }
      });

      streamRes.body.pipe(res);

    } else {
      const headers = {
        'Content-Length': contentLength || undefined,
        'Content-Type': contentType,
        'Accept-Ranges': 'bytes'
      };

      res.writeHead(200, headers);

      const streamRes = await fetch(url);
      streamRes.body.pipe(res);
    }

  } catch (err) {
    console.error('Proxy error:', err);
    res.status(500).send('Proxy error: ' + err.message);
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Proxy server is running on port ${PORT}`);
});
