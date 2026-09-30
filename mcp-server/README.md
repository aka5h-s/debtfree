# DebtFree Universal AI & MCP Server

A unified AI integration server for **DebtFree**. Connects your DebtFree mobile transactions directly with **any AI agent or platform**:
- **MCP Native Clients**: Antigravity, Claude (Desktop & Web), Cursor, Cline, Windsurf.
- **OpenAI / ChatGPT**: Custom GPTs, ChatGPT mobile app via Actions (`openapi.json`).
- **Google Gemini**: Gemini Function Calling / Extensions.
- **Open Source / Local LLMs**: Llama 3, DeepSeek, Mistral (via LangChain, Ollama, or LiteLLM).

---

## 🚀 Running the Server

### Option A: Cloud Web Mode (For ChatGPT, Gemini, Llama, Remote MCP)
Runs an HTTP server with **Server-Sent Events (SSE)** for remote MCP and an **OpenAPI 3.1** specification:
```bash
cd mcp-server
PORT=3000 npm start -- --http
```
- **Live Healthcheck**: `http://localhost:3000/`
- **MCP SSE Endpoint**: `http://localhost:3000/sse`
- **OpenAPI Schema**: `http://localhost:3000/openapi.json`

### Option B: Local CLI / Stdio Mode (For Claude Desktop & Antigravity)
```bash
node /path/to/debtfree/mcp-server/index.js
```

---

## 🔌 Connecting to Different AI Platforms

### 1. Claude Desktop & Antigravity
Add to `claude_desktop_config.json` or `.agents/mcp_config.json`:
```json
{
  "mcpServers": {
    "debtfree": {
      "command": "node",
      "args": ["/home/akash/.gemini/antigravity/scratch/debtfree/mcp-server/index.js"]
    }
  }
}
```

### 2. ChatGPT (Mobile App & Web Custom GPTs)
1. Go to **ChatGPT > Explore GPTs > Create a GPT > Configure > Actions > Create new action**.
2. Paste your hosted server's URL + `/openapi.json` (or import the schema).
3. ChatGPT can now answer *"Who owes me money?"* or log transactions straight from your phone!

### 3. Google Gemini (Extensions / Function Calling)
Pass the function declarations from `/openapi.json` into Gemini's `tools` array:
```python
import google.generativeai as genai
# Register functions from DebtFree API
model = genai.GenerativeModel(model_name='gemini-1.5-pro', tools=[...])
```

### 4. Local Llama / Ollama (via LangChain)
```python
from langchain_community.agent_toolkits.openapi import create_openapi_agent
# Point agent to http://your-server:3000/openapi.json
```

---

## 🛠 Available Capabilities (Phase 1)
- `list_people`: Circle members, net balance, contact info.
- `create_person`: Add a new friend/contact.
- `update_person` / `delete_person`: Edit or remove contact with batched transaction cleanup.
- `list_transactions`: Query transactions with direction & person filters.
- `add_transaction`: Record money lent/borrowed with optional return date.
- `update_transaction`: Update entries with automatic historical audit logging.
- `get_financial_summary`: Total Lent, Total Borrowed, Net Balance, Top Debtors vs Creditors.
- `get_due_and_overdue`: Filter upcoming and overdue repayments.
