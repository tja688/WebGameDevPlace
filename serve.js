/**
 * 简易静态文件服务器
 * 
 * 用法: node serve.js [端口]
 * 默认端口: 8080
 */

import http from 'http';
import fs from 'fs';
import path from 'path';

const PORT = process.argv[2] || 8080;
const HOST = '127.0.0.1';

const MIME_TYPES = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    let filePath = '.' + decodeURIComponent(url.pathname);
    if (filePath === './') filePath = './index.html';

    const extname = String(path.extname(filePath)).toLowerCase();
    const contentType = MIME_TYPES[extname] || 'application/octet-stream';

    fs.readFile(filePath, (error, content) => {
        if (error) {
            if (error.code === 'ENOENT') {
                res.writeHead(404, { 'Content-Type': 'text/html' });
                res.end('<h1>404 Not Found</h1>', 'utf-8');
            } else {
                res.writeHead(500);
                res.end('Server Error: ' + error.code + ' ..\n');
            }
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
        }
    });
});

server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
        console.error(`Port ${PORT} is already in use. If the game is already open, visit http://localhost:${PORT}/`);
        process.exit(1);
    }

    console.error(`Server failed to start: ${error.code || error.message}`);
    process.exit(1);
});

server.listen(PORT, HOST, () => {
    console.log(`Server running at http://localhost:${PORT}/`);
});
