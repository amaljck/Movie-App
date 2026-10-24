import mongoose from 'mongoose';

const movieSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  genre: { type: [{ type: String, trim: true }], required: true },
  releaseYear: { type: Number, required: true },
  duration: { type: Number, required: true, min: 1 },
  posterUrl: { type: String, required: true, trim: true },
  videoUrl: { type: String, required: true, trim: true },
  addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

const Movie = mongoose.models.Movie || mongoose.model('Movie', movieSchema);

export default Movie;
