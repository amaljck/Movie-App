import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api, { API_ORIGIN } from '../api';
import Navbar from '../components/Navbar';

export default function WatchPage() {
  const { id } = useParams();
  const [movie, setMovie] = useState(null);
  const [ticket, setTicket] = useState('');
  const [error, setError] = useState('');
  const [playbackError, setPlaybackError] = useState('');

  useEffect(() => {
    let active = true;
    setPlaybackError('');
    Promise.all([api.get(`/movies/${id}`), api.get(`/movies/${id}/stream-ticket`)])
      .then(([movieResponse, ticketResponse]) => {
        if (active) {
          setMovie(movieResponse.data.movie);
          setTicket(ticketResponse.data.token);
        }
      })
      .catch((requestError) => {
        if (active) setError(requestError.response?.data?.message || 'Unable to load this movie.');
      });
    return () => { active = false; };
  }, [id]);

  const streamUrl = ticket
    ? `${API_ORIGIN}/api/movies/${id}/stream?token=${encodeURIComponent(ticket)}`
    : '';

  return (
    <div className="app-page">
      <Navbar />
      <main className="watch-page">
        <Link className="back-link" to="/browse">← Browse movies</Link>
        {error ? <div className="form-error">{error}</div> : movie ? (
          <>
            {streamUrl
              ? <video
                className="watch-player"
                controls
                autoPlay
                poster={`${API_ORIGIN}${movie.posterUrl}`}
                src={streamUrl}
                onError={() => setPlaybackError('The video could not be played. Check that the uploaded file is a valid MP4 or WebM video.')}
              >
                Your browser does not support video playback.
              </video>
              : <div className="player-placeholder">Preparing video…</div>}
            {playbackError && <div className="form-error" role="alert">{playbackError}</div>}
            <div className="watch-info">
              <p className="eyebrow">{movie.genre.join(' · ')} · {movie.releaseYear} · {movie.duration} min</p>
              <h1>{movie.title}</h1>
              <p>{movie.description}</p>
            </div>
          </>
        ) : <div className="page-loading">Loading movie…</div>}
      </main>
    </div>
  );
}
