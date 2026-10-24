import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import multer from 'multer';
import { body, param, query, validationResult } from 'express-validator';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import User from './models/User.js';
import Movie from './models/Movie.js';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = path.join(__dirname, 'uploads');
const videosDir = path.join(uploadsDir, 'videos');
const postersDir = path.join(uploadsDir, 'posters');
fs.mkdirSync(videosDir, { recursive: true });
fs.mkdirSync(postersDir, { recursive: true });

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET;
const MONGO_URI = process.env.MONGO_URI;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';
const clientOrigin = new URL(CLIENT_URL);
const allowedOrigins = new Set([clientOrigin.origin]);
if (clientOrigin.hostname === 'localhost') {
  clientOrigin.hostname = '127.0.0.1';
  allowedOrigins.add(clientOrigin.origin);
} else if (clientOrigin.hostname === '127.0.0.1') {
  clientOrigin.hostname = 'localhost';
  allowedOrigins.add(clientOrigin.origin);
}

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({
  origin(origin, callback) {
    callback(null, !origin || allowedOrigins.has(origin));
  },
}));
app.use(express.json({ limit: '1mb' }));
app.use('/uploads/posters', express.static(postersDir, { fallthrough: false, maxAge: '1d' }));

const asyncHandler = (handler) => (req, res, next) => {
  Promise.resolve(handler(req, res, next)).catch(next);
};

const validateRequest = (req, res, next) => {
  const result = validationResult(req);
  if (!result.isEmpty()) {
    return res.status(400).json({
      message: 'Validation failed',
      errors: result.array().map(({ path: field, msg }) => ({ field, message: msg })),
    });
  }
  return next();
};

const validateUploadedRequest = (req, res, next) => {
  const result = validationResult(req);
  if (!result.isEmpty()) {
    return removeUploadedFiles(req)
      .then(() => res.status(400).json({
        message: 'Validation failed',
        errors: result.array().map(({ path: field, msg }) => ({ field, message: msg })),
      }))
      .catch(next);
  }
  return next();
};

const normalizeUser = (user) => ({
  id: user._id.toString(),
  name: user.name,
  email: user.email,
  role: user.role,
});

const normalizeMovie = (movie) => ({
  id: movie._id.toString(),
  title: movie.title,
  description: movie.description,
  genre: movie.genre,
  releaseYear: movie.releaseYear,
  duration: movie.duration,
  posterUrl: movie.posterUrl,
  videoUrl: `/api/movies/${movie._id}/stream`,
  addedBy: movie.addedBy?.toString(),
  createdAt: movie.createdAt,
  updatedAt: movie.updatedAt,
});

export const protect = asyncHandler(async (req, res, next) => {
  const [scheme, token] = (req.headers.authorization || '').split(' ');
  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  let decoded;
  try {
    decoded = jwt.verify(token, JWT_SECRET);
  } catch {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
  const currentUser = await User.findById(decoded.id);
  if (!currentUser) return res.status(401).json({ message: 'User account no longer exists' });
  req.user = { id: currentUser.id, email: currentUser.email, role: currentUser.role, name: currentUser.name };
  return next();
});

const protectStreamTicket = (req, res, next) => {
  try {
    const ticket = jwt.verify(req.query.token, JWT_SECRET);
    if (ticket.scope !== 'movie-stream' || ticket.movieId !== req.params.id) {
      return res.status(401).json({ message: 'Invalid stream ticket' });
    }
    req.user = ticket;
    return next();
  } catch {
    return res.status(401).json({ message: 'A valid stream ticket is required' });
  }
};

export const adminOnly = (req, res, next) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access only' });
  }
  return next();
};

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { message: 'Too many login attempts. Please try again later.' },
});

const storage = multer.diskStorage({
  destination: (req, file, callback) => {
    callback(null, file.fieldname === 'video' ? videosDir : postersDir);
  },
  filename: (req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();
    callback(null, `${randomUUID()}${extension}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 * 1024, files: 2 },
  fileFilter: (req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();
    const validVideo = file.fieldname === 'video'
      && ['.mp4', '.webm'].includes(extension)
      && ['video/mp4', 'video/webm'].includes(file.mimetype);
    const validPoster = file.fieldname === 'poster'
      && ['.jpg', '.jpeg', '.png', '.webp'].includes(extension)
      && ['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype);

    if (!validVideo && !validPoster) {
      return callback(new Error('Upload a video (mp4/webm) and a poster image (jpg/png/webp).'));
    }
    return callback(null, true);
  },
});

const removeFile = async (filePath) => {
  if (!filePath) return;
  try {
    await fs.promises.unlink(filePath);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
};

const removeUploadedFiles = async (req) => {
  const fileList = Object.values(req.files || {}).flat();
  await Promise.all(fileList.map((file) => removeFile(file.path)));
};

const diskPathFromVideoUrl = (videoUrl) => {
  const filename = path.basename(videoUrl || '');
  return filename ? path.join(videosDir, filename) : null;
};

const diskPathFromPosterUrl = (posterUrl) => {
  const filename = path.basename(posterUrl || '');
  return filename ? path.join(postersDir, filename) : null;
};

const movieFields = (body) => ({
  title: body.title?.trim(),
  description: body.description?.trim() || '',
  genre: Array.isArray(body.genre)
    ? body.genre.map((genre) => String(genre).trim()).filter(Boolean)
    : String(body.genre || '').split(',').map((genre) => genre.trim()).filter(Boolean),
  releaseYear: Number(body.releaseYear),
  duration: Number(body.duration),
});

const movieValidation = [
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('description').optional({ values: 'falsy' }).isString().withMessage('Description must be text'),
  body('genre').custom((genre) => {
    const values = Array.isArray(genre) ? genre : String(genre || '').split(',');
    if (!values.some((value) => String(value).trim())) throw new Error('At least one genre is required');
    return true;
  }),
  body('releaseYear').isInt({ min: 1888, max: new Date().getFullYear() + 10 }).withMessage('Release year is invalid'),
  body('duration').isInt({ min: 1 }).withMessage('Duration must be a positive number of minutes'),
];

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.post('/api/auth/login', loginLimiter, [
  body('email').isEmail().withMessage('A valid email is required').normalizeEmail(),
  body('password').isString().notEmpty().withMessage('Password is required'),
], validateRequest, asyncHandler(async (req, res) => {
  const userRecord = await User.findOne({ email: req.body.email }).select('+password');
  if (!userRecord || !(await bcrypt.compare(req.body.password, userRecord.password))) {
    return res.status(401).json({ message: 'Invalid email or password' });
  }

  const user = normalizeUser(userRecord);
  const token = jwt.sign({ id: user.id, email: user.email, role: user.role, name: user.name }, JWT_SECRET, {
    expiresIn: '7d',
  });
  return res.json({ token, user });
}));

app.post('/api/auth/signup', [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('A valid email is required').normalizeEmail(),
  body('password').isString().isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
], validateRequest, asyncHandler(async (req, res) => {
  const existingUser = await User.findOne({ email: req.body.email });
  if (existingUser) return res.status(409).json({ message: 'Email is already registered' });

  try {
    const createdUser = await User.create({
      name: req.body.name,
      email: req.body.email,
      password: req.body.password,
      role: 'user',
    });
    const user = normalizeUser(createdUser);
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role, name: user.name }, JWT_SECRET, {
      expiresIn: '7d',
    });
    return res.status(201).json({ token, user });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: 'Email is already registered' });
    throw error;
  }
}));

app.get('/api/auth/me', protect, asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) return res.status(404).json({ message: 'User not found' });
  return res.json({ user: normalizeUser(user) });
}));

app.get('/api/movies', protect, [
  query('search').optional().isString().withMessage('Search must be text'),
  query('genre').optional().isString().withMessage('Genre must be text'),
], validateRequest, asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.search) {
    const search = req.query.search.trim();
    filter.$or = [
      { title: { $regex: search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' } },
      { description: { $regex: search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' } },
    ];
  }
  if (req.query.genre) filter.genre = { $regex: `^${req.query.genre.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' };
  const movies = await Movie.find(filter).sort({ createdAt: -1 });
  return res.json({ movies: movies.map(normalizeMovie) });
}));

app.get('/api/movies/:id', protect, [
  param('id').isMongoId().withMessage('Invalid movie id'),
], validateRequest, asyncHandler(async (req, res) => {
  const movie = await Movie.findById(req.params.id);
  if (!movie) return res.status(404).json({ message: 'Movie not found' });
  return res.json({ movie: normalizeMovie(movie) });
}));

app.get('/api/movies/:id/stream-ticket', protect, [
  param('id').isMongoId().withMessage('Invalid movie id'),
], validateRequest, asyncHandler(async (req, res) => {
  const movie = await Movie.findById(req.params.id).select('_id');
  if (!movie) return res.status(404).json({ message: 'Movie not found' });
  const token = jwt.sign(
    { scope: 'movie-stream', movieId: movie._id.toString() },
    JWT_SECRET,
    { expiresIn: '12h' },
  );
  return res.json({ token });
}));

app.get('/api/movies/:id/stream', protectStreamTicket, [
  param('id').isMongoId().withMessage('Invalid movie id'),
], validateRequest, asyncHandler(async (req, res, next) => {
  const movie = await Movie.findById(req.params.id).select('videoUrl');
  if (!movie) return res.status(404).json({ message: 'Movie not found' });

  const videoPath = diskPathFromVideoUrl(movie.videoUrl);
  if (!videoPath || !videoPath.startsWith(`${videosDir}${path.sep}`)) {
    return res.status(404).json({ message: 'Video file not found' });
  }
  let stat;
  try {
    stat = await fs.promises.stat(videoPath);
  } catch (error) {
    if (error.code === 'ENOENT') return res.status(404).json({ message: 'Video file not found' });
    throw error;
  }

  const range = req.headers.range;
  const extension = path.extname(videoPath).toLowerCase();
  const contentType = extension === '.webm' ? 'video/webm' : 'video/mp4';
  if (!range) {
    res.writeHead(200, { 'Content-Length': stat.size, 'Content-Type': contentType, 'Accept-Ranges': 'bytes' });
    const stream = fs.createReadStream(videoPath);
    stream.on('error', next);
    return stream.pipe(res);
  }

  const match = /^bytes=(\d*)-(\d*)$/.exec(range);
  if (!match || (!match[1] && !match[2])) {
    res.set('Content-Range', `bytes */${stat.size}`);
    return res.status(416).end();
  }
  const start = match[1] ? Number(match[1]) : Math.max(0, stat.size - Number(match[2]));
  const end = match[2] && match[1] ? Math.min(Number(match[2]), stat.size - 1) : stat.size - 1;
  if (start >= stat.size || end < start) {
    res.set('Content-Range', `bytes */${stat.size}`);
    return res.status(416).end();
  }
  const contentLength = end - start + 1;
  res.writeHead(206, {
    'Content-Range': `bytes ${start}-${end}/${stat.size}`,
    'Accept-Ranges': 'bytes',
    'Content-Length': contentLength,
    'Content-Type': contentType,
  });
  const stream = fs.createReadStream(videoPath, { start, end });
  stream.on('error', next);
  return stream.pipe(res);
}));

app.post('/api/movies', protect, adminOnly, upload.fields([
  { name: 'video', maxCount: 1 },
  { name: 'poster', maxCount: 1 },
]), movieValidation, validateUploadedRequest, asyncHandler(async (req, res) => {
  if (!req.files?.video?.[0] || !req.files?.poster?.[0]) {
    await removeUploadedFiles(req);
    return res.status(400).json({ message: 'Both a video and poster file are required' });
  }
  try {
    const movie = await Movie.create({
      ...movieFields(req.body),
      videoUrl: `/uploads/videos/${req.files.video[0].filename}`,
      posterUrl: `/uploads/posters/${req.files.poster[0].filename}`,
      addedBy: req.user.id,
    });
    return res.status(201).json({ movie: normalizeMovie(movie) });
  } catch (error) {
    await removeUploadedFiles(req);
    throw error;
  }
}));

app.put('/api/movies/:id', protect, adminOnly, upload.fields([
  { name: 'video', maxCount: 1 },
  { name: 'poster', maxCount: 1 },
]), [
  param('id').isMongoId().withMessage('Invalid movie id'),
  ...movieValidation,
], validateUploadedRequest, asyncHandler(async (req, res) => {
  const movie = await Movie.findById(req.params.id);
  if (!movie) {
    await removeUploadedFiles(req);
    return res.status(404).json({ message: 'Movie not found' });
  }

  const previousVideo = diskPathFromVideoUrl(movie.videoUrl);
  const previousPoster = diskPathFromPosterUrl(movie.posterUrl);
  Object.assign(movie, movieFields(req.body));
  if (req.files?.video?.[0]) movie.videoUrl = `/uploads/videos/${req.files.video[0].filename}`;
  if (req.files?.poster?.[0]) movie.posterUrl = `/uploads/posters/${req.files.poster[0].filename}`;

  try {
    await movie.save();
  } catch (error) {
    await removeUploadedFiles(req);
    throw error;
  }
  if (req.files?.video?.[0]) await removeFile(previousVideo);
  if (req.files?.poster?.[0]) await removeFile(previousPoster);
  return res.json({ movie: normalizeMovie(movie) });
}));

app.delete('/api/movies/:id', protect, adminOnly, [
  param('id').isMongoId().withMessage('Invalid movie id'),
], validateRequest, asyncHandler(async (req, res) => {
  const movie = await Movie.findByIdAndDelete(req.params.id);
  if (!movie) return res.status(404).json({ message: 'Movie not found' });
  await Promise.all([
    removeFile(diskPathFromVideoUrl(movie.videoUrl)),
    removeFile(diskPathFromPosterUrl(movie.posterUrl)),
  ]);
  return res.json({ success: true, id: req.params.id });
}));

app.get('/api/users', protect, adminOnly, asyncHandler(async (req, res) => {
  const users = await User.find({}).sort({ createdAt: -1 });
  return res.json({ users: users.map(normalizeUser) });
}));

app.get('/api/users/:id', protect, adminOnly, [
  param('id').isMongoId().withMessage('Invalid user id'),
], validateRequest, asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ message: 'User not found' });
  return res.json({ user: normalizeUser(user) });
}));

app.post('/api/users', protect, adminOnly, [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('A valid email is required').normalizeEmail(),
  body('password').isString().isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('role').isIn(['admin', 'user']).withMessage('Role must be admin or user'),
], validateRequest, asyncHandler(async (req, res) => {
  try {
    const user = await User.create({
      name: req.body.name,
      email: req.body.email,
      password: req.body.password,
      role: req.body.role,
    });
    return res.status(201).json({ user: normalizeUser(user) });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: 'Email is already registered' });
    throw error;
  }
}));

app.put('/api/users/:id', protect, adminOnly, [
  param('id').isMongoId().withMessage('Invalid user id'),
  body('name').optional().trim().notEmpty().withMessage('Name cannot be empty'),
  body('email').optional().isEmail().withMessage('A valid email is required').normalizeEmail(),
  body('role').optional().isIn(['admin', 'user']).withMessage('Role must be admin or user'),
  body('password').optional().isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
], validateRequest, asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).select('+password');
  if (!user) return res.status(404).json({ message: 'User not found' });
  for (const field of ['name', 'email', 'role']) {
    if (req.body[field] !== undefined) user[field] = req.body[field];
  }
  if (req.body.password) user.password = req.body.password;
  try {
    await user.save();
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: 'Email is already registered' });
    throw error;
  }
  return res.json({ user: normalizeUser(user) });
}));

app.delete('/api/users/:id', protect, adminOnly, [
  param('id').isMongoId().withMessage('Invalid user id'),
], validateRequest, asyncHandler(async (req, res) => {
  if (req.params.id === req.user.id) {
    return res.status(400).json({ message: 'You cannot delete your own account' });
  }
  const user = await User.findByIdAndDelete(req.params.id);
  if (!user) return res.status(404).json({ message: 'User not found' });
  return res.json({ success: true, id: req.params.id });
}));

app.get('/api/admin/stats', protect, adminOnly, asyncHandler(async (req, res) => {
  const [totalUsers, totalMovies] = await Promise.all([User.countDocuments(), Movie.countDocuments()]);
  return res.json({ totalUsers, totalMovies });
}));

app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

app.use((error, req, res, next) => {
  console.error(error);
  if (res.headersSent) return next(error);
  if (error instanceof multer.MulterError) {
    return res.status(400).json({ message: error.message });
  }
  if (error.name === 'ValidationError' || error.name === 'CastError') {
    return res.status(400).json({ message: error.message });
  }
  if (error.message?.startsWith('Upload a video')) {
    return res.status(400).json({ message: error.message });
  }
  const status = error.status || error.statusCode;
  return res.status(status >= 400 && status < 600 ? status : 500).json({
    message: status === 400 ? 'Invalid request body' : status === 404 ? 'File not found' : 'Internal server error',
  });
});

const startServer = async () => {
  if (!MONGO_URI) throw new Error('MONGO_URI is required. Set it in server/.env before starting the server.');
  if (!JWT_SECRET) throw new Error('JWT_SECRET is required. Set it in server/.env before starting the server.');
  try {
    await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 5000, connectTimeoutMS: 5000 });
    await Promise.all([User.init(), Movie.init()]);
  } catch (error) {
    throw new Error(`MongoDB connection failed: ${error.message}`);
  }
  app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
};

startServer().catch((error) => {
  console.error(`Server startup failed: ${error.message}`);
  process.exit(1);
});

export default app;
