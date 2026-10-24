import { useCallback, useEffect, useState } from 'react';
import api, { API_ORIGIN } from '../../api';

const initialForm = {
  title: '',
  description: '',
  genre: '',
  releaseYear: new Date().getFullYear(),
  duration: '',
  video: null,
  poster: null,
};

export default function AdminMovies() {
  const [movies, setMovies] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState('');
  const [progress, setProgress] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const loadMovies = useCallback(async () => {
    try {
      const { data } = await api.get('/movies');
      setMovies(data.movies);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to load movies.');
    }
  }, []);

  useEffect(() => { loadMovies(); }, [loadMovies]);

  const resetForm = () => {
    setForm(initialForm);
    setEditingId('');
    setProgress(0);
  };

  const editMovie = (movie) => {
    setEditingId(movie.id);
    setForm({
      title: movie.title,
      description: movie.description || '',
      genre: movie.genre.join(', '),
      releaseYear: movie.releaseYear,
      duration: movie.duration,
      video: null,
      poster: null,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const saveMovie = async (event) => {
    event.preventDefault();
    const formElement = event.currentTarget;
    setSaving(true);
    setProgress(0);
    setError('');
    const payload = new FormData();
    payload.append('title', form.title);
    payload.append('description', form.description);
    payload.append('genre', form.genre);
    payload.append('releaseYear', String(form.releaseYear));
    payload.append('duration', String(form.duration));
    if (form.video) payload.append('video', form.video);
    if (form.poster) payload.append('poster', form.poster);

    try {
      const config = {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (event) => {
          if (event.total) setProgress(Math.round((event.loaded * 100) / event.total));
        },
      };
      if (editingId) await api.put(`/movies/${editingId}`, payload, config);
      else await api.post('/movies', payload, config);
      formElement.reset();
      resetForm();
      await loadMovies();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to save movie.');
    } finally {
      setSaving(false);
    }
  };

  const deleteMovie = async (movie) => {
    if (!window.confirm(`Delete "${movie.title}" and its uploaded files?`)) return;
    setError('');
    try {
      await api.delete(`/movies/${movie.id}`);
      await loadMovies();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to delete movie.');
    }
  };

  return (
    <>
      <div className="admin-heading">
        <div><p className="eyebrow">Catalog</p><h1>Manage movies</h1></div>
      </div>
      <section className="admin-form-card">
        <h2>{editingId ? 'Edit movie' : 'Add a movie'}</h2>
        <form className="admin-form-grid" onSubmit={saveMovie}>
          <label>Title<input required value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} /></label>
          <label>Genres, comma-separated<input required placeholder="Drama, Thriller" value={form.genre} onChange={(event) => setForm({ ...form, genre: event.target.value })} /></label>
          <label>Release year<input required type="number" min="1888" max={new Date().getFullYear() + 10} value={form.releaseYear} onChange={(event) => setForm({ ...form, releaseYear: event.target.value })} /></label>
          <label>Duration (minutes)<input required type="number" min="1" value={form.duration} onChange={(event) => setForm({ ...form, duration: event.target.value })} /></label>
          <label className="span-all">Description<textarea rows="3" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label>
          <label>Video file {editingId && <small>(optional replacement)</small>}<input required={!editingId} type="file" accept="video/mp4,video/webm,.mp4,.webm" onChange={(event) => setForm({ ...form, video: event.target.files?.[0] || null })} /></label>
          <label>Poster image {editingId && <small>(optional replacement)</small>}<input required={!editingId} type="file" accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp" onChange={(event) => setForm({ ...form, poster: event.target.files?.[0] || null })} /></label>
          {saving && <div className="upload-progress span-all"><i style={{ width: `${progress}%` }} /><span>Uploading {progress}%</span></div>}
          {error && <div className="form-error span-all" role="alert">{error}</div>}
          <div className="form-actions span-all">
            <button className="button button-primary" disabled={saving}>{saving ? 'Saving…' : editingId ? 'Save changes' : 'Upload movie'}</button>
            {editingId && <button type="button" className="button button-muted" onClick={resetForm}>Cancel</button>}
          </div>
        </form>
      </section>
      <div className="table-wrap">
        <table className="admin-table">
          <thead><tr><th>Movie</th><th>Genres</th><th>Year</th><th>Duration</th><th>Actions</th></tr></thead>
          <tbody>
            {movies.map((movie) => (
              <tr key={movie.id}>
                <td className="movie-cell"><img src={`${API_ORIGIN}${movie.posterUrl}`} alt="" /><strong>{movie.title}</strong></td>
                <td>{movie.genre.join(', ')}</td><td>{movie.releaseYear}</td><td>{movie.duration} min</td>
                <td className="table-actions"><button className="button button-muted" onClick={() => editMovie(movie)}>Edit</button><button className="button button-danger" onClick={() => deleteMovie(movie)}>Delete</button></td>
              </tr>
            ))}
            {!movies.length && <tr><td colSpan="5" className="table-empty">No movies uploaded yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
