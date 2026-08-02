import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { createServer } from "http";
import { Server } from "socket.io";

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
    },
  });

  const PORT = 3000;

  // Socket.io logic
  io.on("connection", (socket) => {
    socket.on("join-roadmap", (roadmapId) => {
      socket.join(roadmapId);
    });

    socket.on("roadmap-update", (data) => {
      socket.to(data.roadmapId).emit("roadmap-updated", data.roadmap);
    });

    socket.on("cursor-move", (data) => {
      socket.to(data.roadmapId).emit("cursor-moved", {
        userId: socket.id,
        userName: data.userName,
        x: data.x,
        y: data.y
      });
    });

    socket.on("disconnect", () => {
      io.emit("user-left", socket.id);
    });
  });

  // API routes FIRST
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.get("/api/config", (req, res) => {
    // Return either the injected header key OR the environment variable key
    res.json({ geminiKey: req.headers['x-gemini-api-key'] || process.env.GEMINI_API_KEY });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    
    // Add custom middleware to forward gemini api key from request headers
    app.use((req, res, next) => {
      // We look at 'x-gemini-api-key' which is commonly injected by parent iFrames or proxies
      if (req.headers['x-gemini-api-key']) {
         process.env.GEMINI_API_KEY = req.headers['x-gemini-api-key'] as string;
      }
      next();
    });

    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
