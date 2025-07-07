// Simple Node.js server as alternative to Electron for testing
import http from 'http';
import fs from 'fs';
import path from 'path';
import { runAutomation } from './automation/index.js';
import { createServer } from 'net';

// Function to find an available port
function findAvailablePort(startPort = 5001) {
    return new Promise((resolve, reject) => {
        const server = createServer();
        server.listen(startPort, () => {
            const port = server.address().port;
            server.close(() => resolve(port));
        });
        server.on('error', (err) => {
            if (err.code === 'EADDRINUSE') {
                findAvailablePort(startPort + 1).then(resolve).catch(reject);
            } else {
                reject(err);
            }
        });
    });
}

async function startServer() {
    const PORT = process.env.PORT || await findAvailablePort();

    const mimeTypes = {
        '.html': 'text/html',
        '.css': 'text/css',
        '.js': 'application/javascript'
    };

    const server = http.createServer((req, res) => {
    if (req.method === 'POST' && req.url === '/start-automation') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', async () => {
            try {
                const config = JSON.parse(body);
                console.log('Starting automation with config:', config);
                
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true }));
                
                // Start automation
                runAutomation(config, (logMsg) => {
                    console.log('[AUTOMATION]:', logMsg);
                }).catch(err => {
                    console.error('Automation error:', err);
                });
                
            } catch (error) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: error.message }));
            }
        });
        return;
    }
    
    // Serve static files
    let filePath = req.url === '/' ? './ui/index.html' : `./ui${req.url}`;
    
    fs.readFile(filePath, (err, content) => {
        if (err) {
            res.writeHead(404);
            res.end('File not found');
            return;
        }
        
        const ext = path.extname(filePath);
        const contentType = mimeTypes[ext] || 'text/plain';
        
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(content);
    });
    });

    server.listen(PORT, () => {
        console.log(`Instagram Automation UI running at http://localhost:${PORT}`);
        console.log('Open this URL in your browser to use the application');
    });
}

// Start the server
startServer().catch(console.error);