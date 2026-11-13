'use strict'

const crypto = require('crypto')
const { Client } = require('bedrock-protocol')

const CONFIG = {
  host: 'fr.hivebedrock.network',
  port: 19132,
  version: '1.26.60',
  username: 'MeinBot',
  profilesFolder: './auth',
  reconnect: true,
  reconnectDelayMs: 5000,
}

const clean = (text) => (text ?? '').replace(/§[0-9a-fk-or]/gi, '')

let client = null

function createHiveClient(options) {
  const c = new Client({
    ...options,
    transport: 'raknet',
    delayedInit: true,
    autoInitPlayer: false,
  })

  c.on('play_status', (packet) => {
    if (packet.status === 'login_success') {
      c.write('client_cache_status', { enabled: false })
    }
  })

  c.once('resource_packs_info', () => {
    c.write('resource_pack_client_response', {
      response_status: 'have_all_packs',
      response_status_name: 'downloadingfinished',
      resourcepackids: [],
    })
  })

  c.once('resource_pack_stack', () => {
    c.write('resource_pack_client_response', {
      response_status: 'completed',
      response_status_name: 'resourcepackstackfinished',
      resourcepackids: [],
    })
  })

  c.once('start_game', (packet) => {
    c.write('request_chunk_radius', { chunk_radius: 10, max_radius: 10 })
    c.write('set_local_player_as_initialized', { runtime_entity_id: packet.runtime_entity_id })
    c.write('serverbound_loading_screen', { type: 2 })
    c.status = 4
  })

  c.on('network_stack_latency', (packet) => {
    if (packet.needs_response) {
      c.queue('network_stack_latency', {
        timestamp: packet.timestamp,
        needs_response: false,
      })
    }
  })

  c.once('connect_allowed', () => c.connect())
  c.init()
  return c
}

function startBot(host = CONFIG.host, port = CONFIG.port) {
  console.log(`Connecting to ${host}:${port} ...`)

  client = createHiveClient({
    host,
    port,
    version: CONFIG.version,
    username: CONFIG.username,
    profilesFolder: CONFIG.profilesFolder,
    offline: false,
    deviceOS: 8,
    skinData: { DeviceModel: '  (Desktop)' },
    onMsaCode: (data) => {
      console.log('\nMicrosoft sign-in required:')
      console.log(`Open ${data.verification_uri} and enter code ${data.user_code}.\n`)
    },
  })

  client.on('loggingIn', () => console.log('Sending login'))
  client.on('join', () => console.log('Login accepted'))

  client.on('start_game', (packet) => {
    console.log(`World loaded (entity ID: ${packet.runtime_entity_id})`)
    console.log(`Spawned as ${client.username}`)
    onReady()
  })

  client.on('text', (packet) => {
    const sender = clean(packet.source_name) || 'Server'
    const message = clean(packet.message)
    if (message) console.log(`${sender}: ${message}`)
    onChat(sender, message, packet)
  })

  client.on('transfer', (packet) => {
    console.log(`Switching to ${packet.server_address}:${packet.port}`)
    client.removeAllListeners('close')
    client.close()
    setTimeout(() => startBot(packet.server_address, packet.port), 1000)
  })

  client.on('kick', (packet) => {
    const reason = clean(packet.message).trim()
    console.log(`Kicked: ${reason}`)
    if (/login was blocked|not allowed to join|banned/i.test(reason)) {
      console.log('Join not allowed, automatic reconnect disabled')
      CONFIG.reconnect = false
    }
  })

  client.on('error', (err) => {
    console.error('Error:', err.message ?? err)
    if (err?.partialReadError) {
      console.error('Could not fully read a packet, check the Minecraft version')
    }
  })

  client.on('close', () => {
    console.log('Connection closed')
    if (CONFIG.reconnect) {
      console.log(`Reconnecting in ${CONFIG.reconnectDelayMs / 1000} seconds ...`)
      setTimeout(() => startBot(), CONFIG.reconnectDelayMs)
    }
  })
}

function sendChat(message) {
  if (!client) return

  if (message.startsWith('/')) {
    client.queue('command_request', {
      command: message,
      origin: {
        type: 'player',
        uuid: crypto.randomUUID(),
        request_id: '',
        player_entity_id: 0n,
      },
      internal: false,
      version: 'latest',
    })
    return
  }

  client.queue('text', {
    type: 'chat',
    category: 'authored',
    needs_translation: false,
    source_name: client.username ?? '',
    xuid: '',
    platform_chat_id: '',
    filtered_message: '',
    message,
  })
}

function onReady() {
  console.log('Bot is ready')
}

function onChat(sender, message, packet) {}

process.on('SIGINT', () => {
  console.log('\nStopping bot ...')
  CONFIG.reconnect = false
  client?.close()
  process.exit(0)
})

startBot()
