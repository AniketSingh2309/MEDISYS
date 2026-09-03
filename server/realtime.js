// Real-time push layer (Socket.IO) shared across the whole app.
//
// Every authenticated socket joins rooms derived from the exact same
// req.session.user that already scopes every REST route:
//   hospital:<hospitalId>  - tenant-scoped broadcast target (the vast
//                            majority of events go here; a socket can never
//                            receive another hospital's events)
//   user:<userId>          - for events aimed at one specific person
//   superadmin             - global room, only for superadmin sockets
//
// Event contract: a single `data:changed` event per room, shaped
//   { resource: "pharmacy_orders", action: "dispense", at: <ts>, ...extra }
// Clients subscribe by resource name and re-run their existing REST loader
// (see realtime-client.js) rather than the server pushing full payloads -
// this keeps the server-side footprint to one line per mutating route.

let io = null;

// Telemedicine calls no longer use this socket for signaling — they're
// embedded Jitsi Meet iframes (see telemedicine-jitsi.js), which handle their
// own media/signaling entirely on Jitsi's infrastructure. Access control for
// those calls is a random per-visit room token minted server-side (see
// POST /api/telemedicine/verify-payment and
// GET /api/opd/visits/:id/meeting-room in server.js), not anything socket-based.

function initRealtime(httpServer, sessionMiddleware) {
  const { Server } = require("socket.io");
  io = new Server(httpServer, {
    cors: { origin: true, credentials: true },
  });

  // Reuse the app's actual session middleware instance so the socket
  // handshake reads from the same (in-memory) session store as every REST
  // request - this is the standard express-session/Socket.IO sharing
  // pattern and needs no extra dependency.
  io.use((socket, next) => {
    sessionMiddleware(socket.request, {}, next);
  });

  io.on("connection", (socket) => {
    const user = socket.request.session && socket.request.session.user;
    if (!user) {
      socket.disconnect(true);
      return;
    }
    if (user.hospitalId) {
      socket.join(`hospital:${user.hospitalId}`);
    }
    if (user.userId) {
      socket.join(`user:${user.userId}`);
    }
    if (user.role === "superadmin") {
      socket.join("superadmin");
    }
  });

  return io;
}

// Broadcast to every socket in the same hospital as the request's session
// user. Safe no-op if realtime hasn't been initialized yet or the request
// has no hospital-scoped session (e.g. superadmin routes - use
// broadcastGlobal for those instead).
function broadcast(req, resource, extra) {
  if (!io) return;
  const user = req.session && req.session.user;
  const hospitalId = user && user.hospitalId;
  if (!hospitalId) return;
  io.to(`hospital:${hospitalId}`).emit("data:changed", {
    resource,
    action: req.method,
    at: Date.now(),
    ...(extra || {}),
  });
}

// Broadcast to every superadmin socket, regardless of hospital (used for
// hospital create/delete, which aren't scoped to a single hospital room).
function broadcastGlobal(resource, extra) {
  if (!io) return;
  io.to("superadmin").emit("data:changed", {
    resource,
    at: Date.now(),
    ...(extra || {}),
  });
}

// Broadcast to one specific person's own room, regardless of who else is in
// their hospital — for anything that's private to a single user rather than
// hospital-wide (currently just staff_messages: a hospital admin's message
// to one staff member shouldn't wake up every other socket in that hospital).
function broadcastToUser(userId, resource, extra) {
  if (!io || !userId) return;
  io.to(`user:${userId}`).emit("data:changed", {
    resource,
    at: Date.now(),
    ...(extra || {}),
  });
}

module.exports = { initRealtime, broadcast, broadcastGlobal, broadcastToUser };
