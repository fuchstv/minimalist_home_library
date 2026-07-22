import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import AnnouncementBanner from './components/AnnouncementBanner';
import TopNavBar from './components/TopNavBar';
import ForcePasswordChangeModal from './components/ForcePasswordChangeModal';
import Katalog from './pages/Katalog';
import Login from './pages/Login';
import Register from './pages/Register';
import DynamicPage from './pages/DynamicPage';
import Admin from './pages/Admin';
import Profil from './pages/Profil';
import { AuthProvider } from './context/AuthContext';

function App() {
  return (
    <AuthProvider>
    <Router>
      <div className="flex flex-col min-h-screen">
        <AnnouncementBanner />
        <TopNavBar />
        <ForcePasswordChangeModal />
        <main className="flex-grow flex flex-col w-full">
          <Routes>
            <Route path="/" element={<Katalog />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/page/:slug" element={<DynamicPage />} />
            {/* Legacy route for regeln */}
            <Route path="/regeln" element={<DynamicPage />} />
            <Route path="/profil" element={<Profil />} />
            <Route path="/ausleihen" element={<Profil />} />
            <Route path="/admin" element={<Admin />} />
          </Routes>
        </main>
        
        <footer className="bg-surface-container-low w-full mt-auto border-t border-outline-variant/30">
          <div className="w-full py-8 px-margin-mobile md:px-margin-desktop flex flex-col md:flex-row justify-between items-center max-w-container-max-width mx-auto gap-gutter">
            <div className="flex flex-col items-center md:items-start gap-2">
              <img alt="SprachCafé Polnisch Logo" className="h-12 w-auto mb-2" src="https://lh3.googleusercontent.com/aida-public/AB6AXuC1tr_UrLa-6nVxJXC8Pdq_B7aQTIi15JttYzPHsKr-qF17H8OoX7Dcn4C2RbZaOgqPU9TZs-PuGrPpsltPL2rCQQdQbk86aaDrmKyUaGhpv8zwFj8vs7QzdfdsYEu5xLk4zw3wZ1TWc1DUT__-XAzaonhX-iljPPQzwySJaH4Bh0-7toNrMHUjAlea3PPsEUTAgC9MQ2VPm803FTkH97OX8zGzuDeh7O8CYtmoPzHaUqtVafAYoAuBLgjw-21t4DyQXhn8ul9q81w"/>
              <p className="font-label-sm text-label-sm text-secondary dark:text-secondary-fixed-dim">
                © 2026 SprachCafé Polnisch e.V. Digitale Hausbibliothek. Entwickelt von{' '}
                <a
                  href="https://github.com/fuchstv/minimalist_home_library"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-primary transition-colors duration-200"
                >
                  Philipp Fuchs
                </a>.
              </p>
            </div>
            <ul className="flex flex-wrap justify-center gap-6 mt-4 md:mt-0">
              <li><Link className="font-label-sm text-label-sm text-on-surface-variant hover:text-primary transition-colors duration-200" to="/page/regeln">Bibliotheksregeln</Link></li>
              <li><Link className="font-label-sm text-label-sm text-on-surface-variant hover:text-primary transition-colors duration-200" to="/page/datenschutz">Datenschutz</Link></li>
              <li><Link className="font-label-sm text-label-sm text-on-surface-variant hover:text-primary transition-colors duration-200" to="/page/impressum">Impressum</Link></li>
              <li><a className="font-label-sm text-label-sm text-on-surface-variant hover:text-primary transition-colors duration-200" href="mailto:kontakt@sprachcafe-polnisch.org">Kontakt</a></li>
            </ul>
          </div>
        </footer>
      </div>
    </Router>
    </AuthProvider>
  );
}

export default App;
