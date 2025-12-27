import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import pg from 'pg';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Database connection
const pool = new pg.Pool({
  host: process.env.DB_HOST || 'postgres',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'timesup',
  user: process.env.DB_USER || 'timesup',
  password: process.env.DB_PASSWORD || 'timesup123'
});

// Middleware
app.use(cors());
app.use(express.json());

// Init DB tables
async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS game_groups (
      id SERIAL PRIMARY KEY,
      code VARCHAR(10) UNIQUE NOT NULL,
      name VARCHAR(100),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);
  
  await pool.query(`
    CREATE TABLE IF NOT EXISTS cards (
      id SERIAL PRIMARY KEY,
      group_id INTEGER REFERENCES game_groups(id) ON DELETE CASCADE,
      text TEXT NOT NULL,
      created_by VARCHAR(100),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);
  
  console.log('Database initialized');
}

// REST API Routes

// Create a game group
app.post('/api/groups', async (req, res) => {
  try {
    const { code, name } = req.body;
    const result = await pool.query(
      'INSERT INTO game_groups (code, name) VALUES ($1, $2) RETURNING *',
      [code, name || 'Partie Times Up']
    );
    res.json(result.rows[0]);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get group by code
app.get('/api/groups/:code', async (req, res) => {
  try {
    const { code } = req.params;
    const result = await pool.query(
      'SELECT * FROM game_groups WHERE code = $1',
      [code]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Group not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add card to group
app.post('/api/cards', async (req, res) => {
  try {
    const { groupCode, text, createdBy } = req.body;
    
    // Get group id
    const groupResult = await pool.query(
      'SELECT id FROM game_groups WHERE code = $1',
      [groupCode]
    );
    
    if (groupResult.rows.length === 0) {
      return res.status(404).json({ error: 'Group not found' });
    }
    
    const groupId = groupResult.rows[0].id;
    
    const result = await pool.query(
      'INSERT INTO cards (group_id, text, created_by) VALUES ($1, $2, $3) RETURNING *',
      [groupId, text, createdBy]
    );
    
    // Notify all clients in this group
    io.to(groupCode).emit('newCard', result.rows[0]);
    
    res.json(result.rows[0]);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get all cards for a group
app.get('/api/cards/:groupCode', async (req, res) => {
  try {
    const { groupCode } = req.params;
    const result = await pool.query(
      `SELECT c.* FROM cards c
       JOIN game_groups g ON c.group_id = g.id
       WHERE g.code = $1
       ORDER BY c.created_at DESC`,
      [groupCode]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Socket.io for real-time
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  // Join a game group room
  socket.on('joinGroup', (groupCode) => {
    socket.join(groupCode);
    console.log(`Socket ${socket.id} joined group ${groupCode}`);
    io.to(groupCode).emit('playerJoined', { socketId: socket.id });
  });
  
  // Start game
  socket.on('startGame', (groupCode) => {
    io.to(groupCode).emit('gameStarted');
  });
  
  // Next card
  socket.on('nextCard', (groupCode) => {
    io.to(groupCode).emit('cardChanged');
  });
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Start server
const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, async () => {
  await initDB();
  console.log(`Server running on port ${PORT}`);
});
