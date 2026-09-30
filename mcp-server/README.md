# DebtFree MCP Server

Model Context Protocol (MCP) server for the **DebtFree** mobile app. Allows any AI assistant (Antigravity, Claude Desktop, Cursor, etc.) to view balances, track repayments, and manage friends and transactions through conversational AI.

---

## 🛠 Available Tools

### 1. People Operations (Circle Management)
- `list_people`: Lists everyone in your circle with calculated net balances and statuses (`OWES_YOU_₹X` / `YOU_OWE_₹X` / `SETTLED`).
- `create_person`: Adds a new person/friend to your circle.
- `update_person`: Updates person details (name, phone, notes).
- `delete_person`: Removes a person and associated transactions.

### 2. Transaction Operations
- `list_transactions`: Lists all transactions with optional filters by `personId` or `direction` (`YOU_LENT` / `YOU_BORROWED`).
- `add_transaction`: Records a lending/borrowing transaction with amount, note, date, and optional `returnDate`.
- `update_transaction`: Updates amount, note, or return dates with automated historical audit logging.
- `delete_transaction`: Deletes a transaction by ID.

### 3. Financial Intelligence & Summaries
- `get_financial_summary`: Returns total lent, total borrowed, overall net balance, and breakdown of who owes you vs who you owe.
- `get_due_and_overdue`: Returns all repayments that are due today, due soon (within 2 days), or overdue.

---

## 🚀 Setup & Usage

### 1. Install Dependencies
```bash
cd mcp-server
npm install
```

### 2. Configure with Antigravity / Claude Desktop

Add this server to your MCP configuration (e.g. `claude_desktop_config.json` or `.agents/mcp_config.json`):

```json
{
  "mcpServers": {
    "debtfree": {
      "command": "node",
      "args": ["/home/akash/.gemini/antigravity/scratch/debtfree/mcp-server/index.js"],
      "env": {
        "EXPO_PUBLIC_FIREBASE_API_KEY": "your_api_key_here",
        "EXPO_PUBLIC_FIREBASE_PROJECT_ID": "debt-free-af02a"
      }
    }
  }
}
```

### 3. Example Natural Language Prompts
- *"Who owes me money right now?"*
- *"Show all repayments that are due or overdue this week."*
- *"Add ₹1,200 lent to Rahul for dinner, return date 2026-10-15."*
- *"Give me a full financial summary of my circle."*
