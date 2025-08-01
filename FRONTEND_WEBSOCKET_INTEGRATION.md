# Frontend WebSocket Integration Guide

## 🚨 Quick Win: Add ONE Line to Unblock Everything

After your WebSocket receives `connection_ready`, add this single line:

```javascript
socket.send(JSON.stringify({ type: "join_chat", data: { chat_id: currentChatId } }));
```

That's it. Everything else will start working immediately.

## Current Status: Backend Ready, Frontend Registration Missing

| Signal | Expected | Actual | Status |
|--------|----------|---------|---------|
| A. Unique client_id in connection_established | `client_id: "uuid"` | `client_id: undefined` | ❌ FE not capturing |
| B. Client sends join_chat | JSON frame after connection_ready | No join_chat sent | ❌ Critical Missing |
| C. Backend registers client | "Client X joined chat Y" | "No clients registered" | ❌ Never happens |
| D. WS delivers messages | response_start/chunk/complete | Only REST, no WS events | ❌ No delivery |
| E. Multi-chat isolation | User 1 sees only Chat 1 | Nothing visible (but isolated) | 🟡 Visually broken / Logically isolated |

**Note:** The `client_id: undefined` issue is NOT a blocker for implementing `join_chat`. 
You can send join_chat immediately without fixing client_id capture. The client_id is only 
needed for analytics and advanced features like targeted messaging.

## Critical Update: Chat Registration Required

Date: 2025-08-01

### What's Working

✅ **WebSocket connection IS working perfectly** - Proven by logs showing:
- Two simultaneous chat sessions work independently
- User 1 (chat_id: 8d1d5bfc...) sent "Hi" and received response
- User 2 (chat_id: 2c2bde20...) sent "Test" and received response
- Messages ARE being received by frontend (visible in console logs)
- Multi-session isolation IS working (each session has unique client_ids)

### The ONLY Missing Piece

The frontend is not sending `join_chat` messages, so the backend cannot deliver streaming events to the UI.

## Why This Is Happening

```
┌─────────────────────────────────────────────────────────────┐
│                    Tenant Level (miptech-company)           │
├─────────────────────────────────────────────────────────────┤
│  WebSocket Connection: wss://api.miptechnologies.tech       │
│                           ↓                                  │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    │
│  │   Chat A    │    │   Chat B    │    │   Chat C    │    │
│  │ (UUID-123)  │    │ (UUID-456)  │    │ (UUID-789)  │    │
│  └─────────────┘    └─────────────┘    └─────────────┘    │
│       ↑                    ↑                    ↑           │
│   join_chat            join_chat            join_chat       │
│                                                             │
│  Without join_chat: Messages go nowhere (discarded)         │
│  With join_chat: Messages delivered to correct chat only    │
└─────────────────────────────────────────────────────────────┘
```

1. WebSocket connects at tenant level (miptech-company)
2. Tenant can have many parallel chats
3. Backend uses `broadcast_to_chat` for isolation
4. Without `join_chat`, backend prints "No clients registered" and discards broadcasts
5. Messages ARE processed and stored, just never delivered to UI

## Complete Working Flow

From the logs, we can see the full sequence:
1. `connection_established` received ✓
2. `initialization_progress` phases (starting → services → complete) ✓
3. `connection_ready` received ✓
4. `typing_start`/`typing_stop` working ✓
5. Messages being sent and received successfully ✓
6. Ping/pong keepalive working ✓

## Required Frontend Changes

### The Fix

```javascript
// NOTE: If you wrap WebSocket in a manager class, call your wrapper's send method
// Example for raw WebSocket:
socket.send(JSON.stringify({
  type: "join_chat",
  data: { chat_id: currentChatId }
}));

// Example for wrapped WebSocket:
// this.wsManager.send({ type: "join_chat", data: { chat_id: currentChatId } });

// TypeScript example:
interface JoinChatMessage {
  type: "join_chat";
  data: {
    chat_id: string;
  };
}

const joinMessage: JoinChatMessage = {
  type: "join_chat",
  data: { chat_id: currentChatId }
};
socket.send(JSON.stringify(joinMessage));
```

### Implementation Priority

#### P0 - Critical (blocks everything):
1. Send join_chat after connection_ready
2. Handle reconnection (re-send join_chat inside your WebSocket library's 'open' or 'reconnected' event handler)

#### P1 - Essential:
1. Chat switching with leave_chat/join_chat
2. Fix client_id capture (for analytics)

#### P2 - Complete:
1. Error handling
2. Loading states
3. Cross-tab synchronization

### 1. Send `join_chat` Message After Connection

When the WebSocket connection is established and ready:

```javascript
// After receiving 'connection_ready' event
websocket.send(JSON.stringify({
  type: "join_chat",
  data: {
    chat_id: currentChatId  // The active chat ID
  }
}));
```

### 2. Handle Chat Switching

When user switches between chats:

```javascript
// Leave previous chat (optional but recommended)
if (previousChatId) {
  websocket.send(JSON.stringify({
    type: "leave_chat",
    data: {
      chat_id: previousChatId
    }
  }));
}

// Join new chat
websocket.send(JSON.stringify({
  type: "join_chat",
  data: {
    chat_id: newChatId
  }
}));
```

### 3. Handle Reconnection

After WebSocket reconnection, re-join the current chat:

```javascript
// In reconnection success handler
if (currentChatId) {
  websocket.send(JSON.stringify({
    type: "join_chat",
    data: {
      chat_id: currentChatId
    }
  }));
}
```

## Message Flow

### Before Fix vs After Fix

| Aspect | Before Fix | After Fix |
|--------|------------|-----------|
| Backend behavior | Discards all broadcasts | Delivers to registered clients |
| Message visibility | Console logs only | Live in chat UI |
| CloudWatch logs | "No clients registered" | "Client X joined chat Y" |
| Multi-tab support | Broken | Works with re-registration |
| Cross-tab behavior | No sync | Each tab must join_chat independently |

### Required Flow (With Registration)
1. Client connects to WebSocket ✓
2. Client receives `connection_established` ✓
3. Client receives `initialization_progress` events ✓
4. Client receives `connection_ready` ✓
5. **Client sends `join_chat` message** ← THE MISSING STEP
6. Backend registers client to chat ✓
7. Client sends chat message ✓
8. Backend processes message ✓
9. Backend broadcasts to chat ✓
10. Registered clients receive `response_start`, `response_chunk`, `response_complete` ✓
11. UI displays streaming message ✓

## Backend Responses

### Successful Join
```json
{
  "type": "chat_joined",
  "data": {
    "chat_id": "uuid-here",
    "success": true
  },
  "message_id": "unique-message-id",
  "chat_id": "uuid-here",
  "tenant_id": "miptech-company",
  "event_ts": 1754045352545
}
```

### Successful Leave
```json
{
  "type": "chat_left",
  "data": {
    "chat_id": "uuid-here",
    "success": true
  },
  "message_id": "unique-message-id",
  "chat_id": "uuid-here",
  "tenant_id": "miptech-company",
  "event_ts": 1754045352545
}
```

## Complete Implementation Requirements

Beyond the critical `join_chat` fix, the frontend needs to:

### 1. Message Display in UI (not just console)
- Handle `response_start` - Show loading indicator in your ChatMessage component
- Handle `response_chunk` - Append streaming text to the message bubble
- Handle `response_complete` - Finalize message, hide loader, update message state

**Implementation location**: Look for your WebSocket event handlers (e.g., `useWebSocket` hook, `WebSocketService` class, or `ChatContainer` component)

### 2. Proper Error Handling
- Handle `error` messages
- Implement retry logic for failed connections
- Show user-friendly error messages

### 3. State Management
- Track connection state
- Maintain message history
- Handle offline/online transitions

### 4. Fix client_id Capture (optional)
```javascript
// In connection_established handler:
socket.clientId = data.client_id || data.data.client_id;
```

## Troubleshooting

### Option 1: Check Browser DevTools (No CloudWatch needed)
1. Open DevTools (F12) → Network tab → WS filter → Click on your WebSocket connection → Frames tab
2. Look for outbound frame: `{"type":"join_chat","data":{"chat_id":"..."}}`
3. **Confirm inbound frame: `{"type":"chat_joined","data":{"success":true}}`**
   - If you see `chat_joined`, registration worked! ✓
   - If missing, check the chat_id matches your current chat
4. Watch for streaming events: `response_start`, `response_chunk`, `response_complete`

### Option 2: CloudWatch Logs (if you have access)
- Look for: "Client X joined chat Y"
- Absence of: "No clients registered for specific chat"

## Quick Test Protocol

1. Open two incognito windows
2. Window A: Verify join_chat sent → Type "Hi"
3. CloudWatch shows "Client X joined chat A"
4. Window B: Should NOT see the message (isolation working)
5. Window B: Open different chat → Type "Test"
6. Verify isolation: Each window only sees its chat

## Auto-Registration Fallback

The backend includes an auto-registration fallback that will automatically register clients when they send a message to a chat they haven't joined. However, this is not recommended as the primary approach because:

1. The first message might be delayed
2. It doesn't handle chat switching cleanly
3. It's less explicit and harder to debug
4. **This fallback will be removed in a future release**

## Summary

The backend WebSocket implementation is **fully functional**:
- **Multi-session isolation**: ✓ Working perfectly
- **Message processing**: ✓ Working perfectly
- **Streaming events**: ✓ Ready to deliver

The **ONLY** missing piece is the frontend sending `join_chat` after `connection_ready`. Once this single line is added, all streaming events will flow to the UI and messages will appear instantly.

Without sending `join_chat`, messages will be processed but never displayed in the UI.

## Net Effect of Adding join_chat

### What users see:
- Messages finally stream into the chat panel the moment they're generated
- Real-time typing indicators from other users
- Smooth, responsive chat experience

### What we gain:
- Strict per-chat isolation (no cross-chat message leaks)
- Multi-tab support (each tab maintains its own chat context)
- Foundation for read receipts and typing indicators per chat
- Scalable architecture for future features

### What doesn't change:
- No login required (anonymous chat still works)
- Tenant-level WebSocket URL stays the same
- Database logic already works perfectly
- All existing message processing continues as-is