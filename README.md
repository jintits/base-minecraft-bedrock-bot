# Base Minecraft Bedrock Bot

A small Node.js base for a Minecraft Bedrock bot on The Hive. The bot signs in with a Microsoft account, joins the lobby, and prints server chat to the console.

## Requirements

- [Node.js](https://nodejs.org/) 24 or newer
- A Microsoft account that owns Minecraft Bedrock

## Installation

```bash
git clone https://github.com/jintits/base-minecraft-bedrock-bot.git
cd base-minecraft-bedrock-bot
npm install --allow-remote=all
```

With npm 12 and newer, `--allow-remote=all` is required because `bedrock-protocol` downloads a dependency directly from GitHub. Older npm versions can use `npm install`.

## Usage

```bash
npm start
```

On the first start, a Microsoft sign-in code appears in the console. Open the displayed page, enter the code, and sign in. The session is stored in the `auth/` directory for subsequent starts.

> **Important:** `auth/` contains account credentials and must never be published. It is already excluded in `.gitignore`.

## Configuration

The configuration is located in `CONFIG` at the top of `index.js`:

| Option | Description |
| --- | --- |
| `host` | `fr.hivebedrock.network` (EU), `ca.hivebedrock.network` (NA), or `sg.hivebedrock.network` (Asia) |
| `port` | Defaults to `19132` |
| `version` | Minecraft version supported by `bedrock-protocol` |
| `username` | Login cache name; the in-game name comes from the Microsoft account |
| `reconnect` | Automatically reconnect after a connection loss |

## Adding your own code

Use `onReady()` for code that should run after joining and `onChat()` for incoming chat messages:

```js
function onReady() {
  sendChat('Hello Hive!')
}

function onChat(sender, message, packet) {
  if (message.includes('!ping')) sendChat('pong')
}
```

`sendChat()` sends chat messages and commands such as `sendChat('/hub')`.
