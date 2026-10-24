import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api, { API_ORIGIN } from '../api';
import Navbar from '../components/Navbar';
import MovieCard from '../components/MovieCard';

function MovieRow({ title, movies }) {
  if (!movies.length) return null;
  return (
    <section className="browse-row">
      <h2>{title}</h2>
      <div className="poster-row">{movies.map((movie) => <MovieCard key={movie.id} movie={movie} />)}</div>
    </section>
  );
}

export default function BrowsePage() {
  const [searchParams] = useSearchParams();
  const search = searchParams.get('search') || '';
  const [movies, setMovies] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    api.get('/movies', { params: search ? { search } : {} })
      .then(({ data }) => {
        if (active) {
          setMovies(data.movies);
          setError('');
        }
      })
      .catch((requestError) => {
        if (active) setError(requestError.response?.data?.message || 'Unable to load movies.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [search]);

  const genres = useMemo(() => [...new Set(movies.flatMap((movie) => movie.genre))].sort(), [movies]);
  const hero = movies[0];

  return (
    <div className="app-page">
      <Navbar />
      {search ? (
        <main className="browse-content search-results">
          <h1>Search results for “{search}”</h1>
          {error && <div className="form-error">{error}</div>}
          {loading ? <div className="page-loading">Loading movies…</div> : movies.length
            ? <div className="poster-grid">{movies.map((movie) => <MovieCard key={movie.id} movie={movie} />)}</div>
            : <p className="empty-message">No movies match your search.</p>}
        </main>
      ) : (
        <>
          <section
            className="browse-hero"
            style={hero ? { backgroundImage: `linear-gradient(90deg, rgba(0,0,0,.88) 0%, rgba(0,0,0,.45) 55%, rgba(0,0,0,.12) 100%), linear-gradient(0deg, #111 0%, transparent 44%), url("${API_ORIGIN}${hero.posterUrl}")` } : undefined}
          >
            <div className="browse-hero-copy">
              <p className="eyebrow">{hero ? 'Featured title' : 'Your movie library'}</p>
              <h1>{hero?.title || 'Your collection starts here'}</h1>
              <p>{hero?.description || 'Movies you add will appear here. Check back soon.'}</p>
              {hero && <Link className="button button-primary" to={`/watch/${hero.id}`}>▶ Play</Link>}
            </div>
          </section>
          <main className="browse-content">
            {error && <div className="form-error">{error}</div>}
            {loading ? <div className="page-loading">Loading movies…</div> : movies.length ? (
              <>
                <MovieRow title="Recently Added" movies={movies.slice(0, 12)} />
                {genres.map((genre) => (
                  <MovieRow key={genre} title={genre} movies={movies.filter((movie) => movie.genre.includes(genre))} />
                ))}
              </>
            ) : <p className="empty-message">No movies have been added yet.</p>}
          </main>
        </>
      )}
    </div>
  );
}
