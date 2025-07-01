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
    const contentType = headRes.headers.get('content-type') || 'application/octet-stream';

    const contentLength = contentLengthHeader ? parseInt(contentLengthHeader, 10) : null;

    const headers = {
      'Content-Type': contentType,
      'Accept-Ranges': 'bytes',
    };

    if (range && contentLength !== null) {
      // Parse range safely
      const [start, end] = range.replace(/bytes=/, '').split('-');
      const startByte = parseInt(start, 10);
      const endByte = end ? parseInt(end, 10) : contentLength - 1;

      if (isNaN(startByte) || isNaN(endByte)) {
        return res.status(400).send('Invalid range values.');
      }

      const chunkSize = endByte - startByte + 1;

      headers['Content-Range'] = `bytes ${startByte}-${endByte}/${contentLength}`;
      headers['Content-Length'] = chunkSize;

      res.writeHead(206, headers);

      const streamRes = await fetch(url, {
        headers: { Range: `bytes=${startByte}-${endByte}` }
      });

      streamRes.body.pipe(res);
    } else {
      // Send full file
      if (contentLength !== null) {
        headers['Content-Length'] = contentLength;
      }

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
