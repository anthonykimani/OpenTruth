import { Link } from 'react-router-dom';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';

export function HomePage() {
  return (
    <div className="">
      {/* Hero Section */}
      <div className="text-center space-y-6 py-12">
        <h1 className="text-5xl font-bold text-gray-900">
          OpenTruth
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          Decentralized AI Provenance Engine
        </p>
        <p className="text-lg text-gray-500 max-w-3xl mx-auto">
          Cryptographic proof of authenticity for AI-generated content and datasets,
          powered by Walrus, Seal, and Sui.
        </p>
        <div className="flex gap-4 justify-center pt-4">
          <Link to="/upload">
            <Button size="lg" className="text-lg px-8">
              Get Started →
            </Button>
          </Link>
          <Link to="/verify">
            <Button size="lg" variant="outline" className="text-lg px-8">
              Verify Certificate
            </Button>
          </Link>
        </div>
      </div>

      {/* Features */}
      <div className="grid md:grid-cols-3 gap-6">
        <Card className="p-6 hover:shadow-lg transition-shadow">
          <div className="text-4xl mb-4">🔒</div>
          <h3 className="text-xl font-semibold mb-2">Cryptographic Proof</h3>
          <p className="text-gray-600 text-sm">
            SHA-256 hashing and digital signatures ensure your content's authenticity
            and integrity.
          </p>
        </Card>

        <Card className="p-6 hover:shadow-lg transition-shadow">
          <div className="text-4xl mb-4">📦</div>
          <h3 className="text-xl font-semibold mb-2">Immutable Storage</h3>
          <p className="text-gray-600 text-sm">
            Certificates stored permanently on Walrus decentralized storage network.
          </p>
        </Card>

        <Card className="p-6 hover:shadow-lg transition-shadow">
          <div className="text-4xl mb-4">🔗</div>
          <h3 className="text-xl font-semibold mb-2">Full Provenance</h3>
          <p className="text-gray-600 text-sm">
            Track the complete chain from training dataset to model checkpoint to AI output.
          </p>
        </Card>
      </div>

      {/* How It Works */}
      <div className="space-y-6">
        <h2 className="text-3xl font-bold text-center">How It Works</h2>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                1
              </div>
              <div>
                <h4 className="font-semibold mb-1">Upload & Hash</h4>
                <p className="text-sm text-gray-600">
                  Upload your file. We compute its SHA-256 hash client-side.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                2
              </div>
              <div>
                <h4 className="font-semibold mb-1">Sign with Wallet</h4>
                <p className="text-sm text-gray-600">
                  Connect your Sui wallet and sign the certificate cryptographically.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                3
              </div>
              <div>
                <h4 className="font-semibold mb-1">Store on Walrus</h4>
                <p className="text-sm text-gray-600">
                  Certificate and file are uploaded to Walrus for permanent storage.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center font-bold">
                ✓
              </div>
              <div>
                <h4 className="font-semibold mb-1">Anyone Can Verify</h4>
                <p className="text-sm text-gray-600">
                  Share your certificate ID. Anyone can verify the file's authenticity.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center font-bold">
                🌳
              </div>
              <div>
                <h4 className="font-semibold mb-1">Dataset Provenance</h4>
                <p className="text-sm text-gray-600">
                  Use Merkle trees to prove dataset composition and link to AI models.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center font-bold">
                🔐
              </div>
              <div>
                <h4 className="font-semibold mb-1">Tamper-Proof</h4>
                <p className="text-sm text-gray-600">
                  Cryptographic guarantees ensure certificates cannot be forged or modified.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CTA */}
      <Card className="p-8 bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200">
        <div className="text-center space-y-4">
          <h3 className="text-2xl font-bold">Ready to Get Started?</h3>
          <p className="text-gray-600">
            Create your first provenance certificate in less than a minute.
          </p>
          <Link to="/upload">
            <Button size="lg" className="text-lg px-8">
              Upload Your First File →
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}
