import { Outlet } from 'react-router-dom';
import Navbar from '../../components/Navbar';

export default function AdminLayout() {
  return (
    <div className="app-page admin-page">
      <Navbar admin />
      <main className="admin-content"><Outlet /></main>
    </div>
  );
}
