
/**
 * Server-Sent Events (SSE) Manager for Real-Time Desk Synchronization
 */

let clients = [];

const addClient = (req, res) => {
  const headers = {
    'Content-Type': 'text/event-stream',
    'Connection': 'keep-alive',
    'Cache-Control': 'no-cache',
    'X-Accel-Buffering': 'no'
  };
  res.writeHead(200, headers);
  res.write(`data: ${JSON.stringify({ type: 'CONNECTED', timestamp: Date.now() })}\n\n`);

  const clientId = `${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  const client = { id: clientId, res };
  clients.push(client);

  req.on('close', () => {
    clients = clients.filter(c => c.id !== clientId);
  });
};

const broadcast = (eventType, payload = {}) => {
  const message = JSON.stringify({ type: eventType, payload, timestamp: Date.now() });
  clients.forEach(client => {
    try {
      client.res.write(`data: ${message}\n\n`);
    } catch (err) {
      // client disconnected
    }
  });
};

const getConnectedClientCount = () => clients.length;

module.exports = { addClient, broadcast, getConnectedClientCount };
