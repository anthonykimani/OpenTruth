import { Link, useLocation } from 'react-router-dom';
import {
  ConnectButton,
  useCurrentAccount,
} from '@mysten/dapp-kit';
import { formatSuiAddress } from '../lib/sui';
import { Badge } from './ui/badge';
import { SUI_RPC_URL } from '../config/seal-config';

export function Navigation() {
  const location = useLocation();
  const account = useCurrentAccount();

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="bg-white shadow-sm border-b sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo and Links */}
          <div className="flex items-center space-x-8">
            <Link to="/" className="flex items-center gap-2">
              <span className="text-2xl">🔐</span>
              <span className="text-xl font-bold text-blue-600">
                OpenTruth
              </span>
            </Link>

            <div className="flex space-x-1">
              <Link
                to="/upload"
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive('/upload')
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                Upload
              </Link>

              <Link
                to="/verify"
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive('/verify')
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                Verify
              </Link>

              <Link
                to="/dataset"
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive('/dataset')
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                Dataset
              </Link>
            </div>
          </div>

          {/* Wallet Connection */}
          <div className="flex items-center gap-3">
            {account && (
              <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-green-50 rounded-md">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-xs font-medium text-green-800">
                  {formatSuiAddress(account.address)}
                </span>
              </div>
            )}

            <ConnectButton />
          </div>
        </div>
      </div>

      {/* Network Badge */}
      <div className="border-t bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 py-1 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <Badge variant="outline" className="text-xs">
              Walrus Local {/* ✅ Changed from "Walrus Testnet" */}
            </Badge>
            <span>•</span>
            <span>Sui Localnet</span> {/* ✅ Changed from "Sui Testnet" */}
          </div>

          {account && (
            <div className="flex items-center gap-4 text-xs text-gray-600">
              <a
                href={`${SUI_RPC_URL}/address/${account.address}`} 
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-blue-600 hover:underline"
              >
                View on Local Explorer → {/* ✅ Changed text */}
              </a>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}