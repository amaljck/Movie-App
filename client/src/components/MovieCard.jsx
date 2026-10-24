import { Link } from 'react-router-dom';
import { API_ORIGIN } from '../api';

export default function MovieCard({ movie }) {
  return (
    <Link className="poster-card" to={`/watch/${movie.id}`} title={movie.title}>
      <img src={`${API_ORIGIN}${movie.posterUrl}`} alt={movie.title} loading="lazy" />
      <span>{movie.title}</span>
    </Link>
  );
}
