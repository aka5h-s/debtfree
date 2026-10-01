import fs from 'fs';

const filePath = '/home/akash/.gemini/antigravity/scratch/debtfree/mcp-server/index.js';
let content = fs.readFileSync(filePath, 'utf8');

// Replace handleMcpConnection and server setup so each SSE connection creates its own Protocol / McpServer instance
const oldMcpBlock = `  // MCP Transport for native MCP clients (ChatGPT Plugin Creator, Claude, Cursor, Antigravity)
  const handleMcpConnection = async (req, res) => {
    const proto = req.headers['x-forwarded-proto'] || req.protocol;
    const host = req.get('host');
    const messagesEndpoint = \`\${proto}://\${host}/messages\`;

    const transport = new SSEServerTransport(messagesEndpoint, res);
    transports.set(transport.sessionId, transport);

    transport.onclose = () => {
      transports.delete(transport.sessionId);
    };

    await server.connect(transport);
  };`;

const newMcpBlock = `  // MCP Transport for native MCP clients (ChatGPT Plugin Creator, Claude, Cursor, Antigravity)
  const handleMcpConnection = async (req, res) => {
    const proto = req.headers['x-forwarded-proto'] || req.protocol;
    const host = req.get('host');
    const messagesEndpoint = \`\${proto}://\${host}/messages\`;

    const transport = new SSEServerTransport(messagesEndpoint, res);
    transports.set(transport.sessionId, transport);

    transport.onclose = () => {
      transports.delete(transport.sessionId);
    };

    // Create a new instance per SSE connection as required by ModelContextProtocol SDK
    const clientServer = createMcpServer();
    await clientServer.connect(transport);
  };`;

// We need to wrap tool definitions into a factory: createMcpServer()
const serverDeclaration = `// Create the MCP server instance
const server = new McpServer({
  name: 'debtfree-mcp',
  version: '1.0.0',
});`;

// Let's replace serverDeclaration with a factory
const factoryStart = `function createMcpServer() {
  const s = new McpServer({
    name: 'debtfree-mcp',
    version: '1.0.0',
  });`;

content = content.replace(oldMcpBlock, newMcpBlock);
console.log('Replacing MCP connection logic...');
