> This is a fork of [3KniGHtcZ/codebeamer-mcp](https://github.com/3KniGHtcZ/codebeamer-mcp), I modified some tools and added some tools.

# codebeamer-mcp-wiki

An MCP (Model Context Protocol) server for Codebeamer ALM. Allows Claude and other MCP clients to read and write projects, trackers, and items in Codebeamer using natural language.

## Tools (24)

### Original tools

#### Read

| Tool | Description |
| ---- | ----------- |
| `list_projects` | List all projects |
| `get_project` | Get project details |
| `list_trackers` | List trackers in a project |
| `get_tracker` | Get tracker details |
| `list_tracker_items` | List items in a tracker |
| `search_items` | Full-text / cbQL search |
| `get_item` | Get item summary: ID, name, tracker, status and description. Lightweight — use when you only need to identify the item and read its content |
| `get_item_details` | Get full structured detail of an item: project, priority, assignees, timestamps, story points, custom fields and test steps. Description omitted — fetch it via `get_item` |
| `get_item_relations` | Get outgoing/incoming associations (depends on, blocks, …) |
| `get_item_references` | Get upstream/downstream traceability references (derived from, covers, …) |
| `get_item_comments` | Get item comments |
| `get_item_reviews` | Get Review Hub reviews for an item (result, reviewers, votes) |
| `get_user` | Get user details |

#### Write

| Tool | Description |
| ---- | ----------- |
| `add_comment` | Add a comment to an item |
| `create_association` | Create an association between two items (e.g. depends on, blocks) |
| `create_reference` | Add a downstream traceability reference between two items |
| `create_harm` | Create a harm entry in an RM Harms List tracker with IMDRF code and severity (1–5) |

### Tools modified or added in this fork

| Tool | Change | Description |
| ---- | ------ | ----------- |
| `create_item` | Modified | Create a new item in a tracker. Supports folders, item type, parent nesting, and `descriptionFormat` for Wiki markup |
| `update_item` | Modified | Update an existing item (name, description, status, priority, assignee, custom fields). Supports `descriptionFormat` for Wiki markup |
| `list_item_attachments` | Added | List attachments for an item |
| `get_item_attachment` | Added | Get attachment details |
| `download_item_attachment` | Added | Download attachment content |
| `upload_item_attachment` | Added | Upload attachment to an item |
| `update_item_attachment` | Added | Update attachment content for an item |

## Installation

### Requirements
- Node.js 20+
- Access to a Codebeamer instance (URL, username, password)

### Claude Code (CLI)

The fastest way — run this command in your terminal:

```bash
claude mcp add CodeBeamer -e CB_URL=https://your-instance.example.com/cb/api \
  -e CB_USERNAME=your_username -e CB_PASSWORD=your_password \
  -- npx -y codebeamer-mcp-wiki
```

Or add it manually to `.mcp.json` in the project root (or `~/.claude/mcp.json` for global scope):

```json
{
  "mcpServers": {
    "CodeBeamer": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "codebeamer-mcp-wiki"],
      "env": {
        "CB_URL": "https://your-instance.example.com/cb/api",
        "CB_USERNAME": "your_username",
        "CB_PASSWORD": "your_password"
      }
    }
  }
}
```

### Claude Desktop

Edit the config file for your platform:

| Platform | Path |
| -------- | ---- |
| macOS | `~/Library/Application Support/Claude/claude_desktop_config.json` |
| Windows | `%APPDATA%\Claude\claude_desktop_config.json` |
| Linux | `~/.config/Claude/claude_desktop_config.json` |

```json
{
  "mcpServers": {
    "CodeBeamer": {
      "command": "npx",
      "args": ["-y", "codebeamer-mcp-wiki"],
      "env": {
        "CB_URL": "https://your-instance.example.com/cb/api",
        "CB_USERNAME": "your_username",
        "CB_PASSWORD": "your_password"
      }
    }
  }
}
```

Restart Claude Desktop after saving.

### Cursor

Add to `.cursor/mcp.json` in the project root (project scope) or `~/.cursor/mcp.json` (global):

```json
{
  "mcpServers": {
    "CodeBeamer": {
      "command": "npx",
      "args": ["-y", "codebeamer-mcp-wiki"],
      "env": {
        "CB_URL": "https://your-instance.example.com/cb/api",
        "CB_USERNAME": "your_username",
        "CB_PASSWORD": "your_password"
      }
    }
  }
}
```

### Windsurf

Add to `~/.codeium/windsurf/mcp_config.json`:

```json
{
  "mcpServers": {
    "CodeBeamer": {
      "command": "npx",
      "args": ["-y", "codebeamer-mcp-wiki"],
      "env": {
        "CB_URL": "https://your-instance.example.com/cb/api",
        "CB_USERNAME": "your_username",
        "CB_PASSWORD": "your_password"
      }
    }
  }
}
```

### VS Code (Copilot)

Add to `.vscode/mcp.json` in the project root:

```json
{
  "servers": {
    "CodeBeamer": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "codebeamer-mcp-wiki"],
      "env": {
        "CB_URL": "https://your-instance.example.com/cb/api",
        "CB_USERNAME": "your_username",
        "CB_PASSWORD": "your_password"
      }
    }
  }
}
```

### Gemini CLI

Add to `~/.gemini/settings.json`:

```json
{
  "mcpServers": {
    "CodeBeamer": {
      "command": "npx",
      "args": ["-y", "codebeamer-mcp-wiki"],
      "env": {
        "CB_URL": "https://your-instance.example.com/cb/api",
        "CB_USERNAME": "your_username",
        "CB_PASSWORD": "your_password"
      }
    }
  }
}
```

### Alternative: global install

```bash
npm install -g codebeamer-mcp-wiki
```

Then use `"command": "codebeamer-mcp-wiki"` (no `args`) instead of `npx` in any config above.

### Pinning a specific version

```json
"args": ["-y", "codebeamer-mcp-wiki@0.5.5"]
```

### Updates

| Method | Update behavior |
| ------ | --------------- |
| `npx -y codebeamer-mcp-wiki` | Always fetches the latest version |
| `npm install -g codebeamer-mcp-wiki` | Stays on installed version. Run `npm update -g codebeamer-mcp-wiki` to update |
| Pinned version (`@0.5.5`) | Never auto-updates; change the version string manually |

> ⚠️ **Never commit `.mcp.json` with real credentials** — it is listed in `.gitignore`.

### From source (development)

```bash
git clone https://github.com/1933173207/CodeBeamer-mcp.git
cd CodeBeamer-mcp
npm install
npm run build
```

Then use `"command": "node"` with `"args": ["dist/index.js"]` in your `.mcp.json`.

## Development & Testing

```bash
# Run tests (no real Codebeamer instance needed)
npm test

# Start the mock API server (port 3001)
node mock-server.mjs

# Interactive testing via MCP Inspector
CB_URL=http://localhost:3001 CB_USERNAME=mock CB_PASSWORD=mock \
  npx @modelcontextprotocol/inspector node dist/index.js
```

## Configuration

| Variable | Description | Default |
| -------- | ----------- | ------- |
| `CB_URL` | Codebeamer API URL, e.g. `https://your-instance.example.com/cb/api` (the server appends `/v3` automatically) | _(required)_ |
| `CB_USERNAME` | Login username | _(required)_ |
| `CB_PASSWORD` | Password | _(required)_ |
| `CB_UNSAFE_SSL` | Set to `true` to allow connections to servers with unverified/self-signed certificates | `false` |
