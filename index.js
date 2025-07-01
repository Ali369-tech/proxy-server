const express = require('express');
const fetch = require('node-fetch');
const app = express();

app.get('/proxy', async (req, res) => {
  const url = req.query.url;
  const range = req.headers.range;

  if (!url) return res.status(400).send('Missing url parameter');

  try {
    // Get content info from HEAD request
    const headRes = await fetch(url, { method: 'HEAD' });
    const contentLength = headRes.headers.get('content-length');
    const contentType = headRes.headers.get('content-type');

    const headers = {
      'Content-Type': contentType || 'audio/mpeg',
      'Accept-Ranges': 'bytes',
    };

    if (range) {
      // Parse Range header
      const [start, end] = range.replace(/bytes=/, '').split('-');
      const startByte = parseInt(start, 10);
      const endByte = end ? parseInt(end, 10) : contentLength - 1;
      const chunkSize = (endByte - startByte) + 1;

      headers['Content-Range'] = `bytes ${startByte}-${endByte}/${contentLength}`;
      headers['Content-Length'] = chunkSize;

      res.writeHead(206, headers);

      const streamRes = await fetch(url, {
        headers: { Range: `bytes=${startByte}-${endByte}` }
      });

      streamRes.body.pipe(res);
    } else {
      // No Range — send full file
      headers['Content-Length'] = contentLength;
      res.writeHead(200, headers);

      const streamRes = await fetch(url);
      streamRes.body.pipe(res);
    }
  } catch (err) {
    console.error(err);
    res.status(500).send('Proxy error: ' + err.message);
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Proxy server is running on port ${PORT}`);
});
