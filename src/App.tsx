import { Routes, Route } from 'react-router-dom';
import '@mysten/dapp-kit/dist/index.css';
import { Navigation } from './components/Navigation';
import { HomePage } from './pages/HomePage';
import { UploadPage } from './pages/UploadPage';
import { VerifyPage } from './pages/VerifyPage';
import { DatasetPage } from './pages/DatasetPage';

function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />

      <main className="px-4 py-8">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/upload" element={<UploadPage />} />
          <Route path="/verify" element={<VerifyPage />} />
          <Route path="/dataset" element={<DatasetPage />} />
        </Routes>
      </main>

      <footer className="border-t mt-16 py-8 bg-white">
        <div className="max-w-7xl mx-auto px-4 text-center space-y-2">
          <p className="text-sm font-semibold text-gray-900">
            OpenTruth - Decentralized AI Provenance Engine
          </p>
          <p className="text-xs text-gray-600">
            Powered by Walrus, Seal, and Sui | Built for Walrus Haulout Hackathon
          </p>
          <div className="flex justify-center gap-4 text-xs text-gray-500">
            <a href="https://walrus.xyz" target="_blank" rel="noopener noreferrer" className="hover:text-blue-600">
              Walrus Docs
            </a>
            <a href="https://sui.io" target="_blank" rel="noopener noreferrer" className="hover:text-blue-600">
              Sui Docs
            </a>
            <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="hover:text-blue-600">
              GitHub
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
