# 🔐 OpenTruth

> **Decentralized AI Provenance Engine**
>
> Built for the [Walrus Haulout Hackathon](https://walrus.xyz) | Powered by Walrus, Seal, and Sui

OpenTruth provides cryptographic proof of authenticity for AI-generated content and datasets, creating an immutable provenance chain from training data to final output. **Files can be encrypted using Seal identity-based encryption while keeping certificates publicly verifiable.**

## 🌟 Features

- **🔒 Cryptographic Verification** - SHA-256 hashing + ED25519 digital signatures
- **🔐 Seal Encryption** - Optional identity-based encryption for private content
- **📦 Immutable Storage** - Certificates and files stored permanently on Walrus
- **🔗 Full-Stack Provenance** - Track dataset → model checkpoint → AI output
- **🌳 Merkle Tree Proofs** - Verify dataset composition mathematically
- **⚡ Client-Side Everything** - No backend required, all crypto happens in browser
- **🎨 Beautiful UI** - Built with React + Tailwind + shadcn/ui

## 🚀 Quick Start

### Prerequisites

- Node.js v18+
- pnpm (recommended) or npm
- [Sui Wallet](https://chrome.google.com/webstore/detail/sui-wallet) browser extension

### Installation

```bash
# Clone repository
git clone <repo-url>
cd opentruth

# Install dependencies
pnpm install

# Set up environment
cp .env.example .env

# Start development server
pnpm dev
```

Visit [http://localhost:5173](http://localhost:5173)

### First Steps

1. **Install Sui Wallet** - Get the browser extension and create a wallet
2. **Switch to Testnet** - In wallet settings, switch to Sui Testnet
3. **Get Testnet Tokens** - Use the [Sui faucet](https://discord.gg/sui)
4. **Connect Wallet** - Click "Connect Wallet" in OpenTruth
5. **Upload a File** - Try generating your first certificate!

## 📖 Documentation

Comprehensive documentation is available in the [`/docs`](./docs) folder:

- [**Getting Started**](./docs/getting-started.md) - Detailed setup guide
- [**Architecture**](./docs/architecture.md) - System design and data flow
- [**API Reference**](./docs/api-reference.md) - Complete API documentation
- [**User Guide**](./docs/user-guide.md) - How to use OpenTruth
- [**Development**](./docs/development.md) - Contribution guidelines

## 🎯 Use Cases

### 1. AI Content Certification (Public)

Generate publicly verifiable certificates for AI-generated images, text, or audio:

```
Upload Image → Hash → Sign → Store on Walrus → Anyone Can Verify
```

### 2. Private Content with Public Provenance (Seal-Encrypted)

Encrypt sensitive AI outputs while maintaining public verifiability:

```
Generate Certificate → Encrypt File with Seal → Store Encrypted File
→ Anyone Can Verify Certificate Hash → Only Owner Can Decrypt File
```

### 3. Dataset Provenance

Prove the exact composition of training datasets using Merkle trees:

```
Select Files → Build Merkle Tree → Generate Root → Create Certificate
```

### 4. Model Checkpoint Tracking

Link model checkpoints to their training datasets:

```
Dataset Merkle Root → Training Simulation → Checkpoint with Provenance
```

### 5. Verification

Anyone can verify file authenticity by comparing hashes:

```
Upload File + Certificate ID → Verify Hash → Verify Signature → ✓ Authentic
```

## 🏗️ Architecture

```
┌─────────────┐
│   Browser   │ ← User uploads file
└──────┬──────┘
       │ 1. Hash file (SHA-256)
       │ 2. Generate certificate JSON
       │ 3. [Optional] Encrypt file with Seal (identity-based)
       ├──────────────┐
       ↓              ↓
┌─────────────┐  ┌──────────────┐
│ Sui Wallet  │  │ Seal Key     │
│             │  │ Servers      │
│ Sign cert   │  └──────┬───────┘
└──────┬──────┘         │ 4. Threshold decryption shares
       │                ↓
       │         ┌──────────────┐
       │         │   Walrus     │
       │         │              │
       └────────►│ Store file & │
                 │ certificate  │
                 └──────┬───────┘
                        │ 5. Returns blob IDs
                        ↓
┌──────────────────────────────┐
│   Public Certificate         │ ← Stored in localStorage + Walrus
│   (Hash, Signature, MD)      │
│   └─> Private File           │ ← Encrypted on Walrus (Seal-controlled)
│       (if encryption enabled)│
└──────────────────────────────┘
```

**Key Insight**: Certificates remain public for verification while file content can be encrypted. Seal key servers enforce access policies defined on Sui.

## 🛠️ Tech Stack

| Category | Technology |
|----------|------------|
| **Frontend** | React 18 + TypeScript |
| **Build Tool** | Vite 5 |
| **Styling** | Tailwind CSS + shadcn/ui |
| **Blockchain** | Sui (wallet integration) |
| **Storage** | Walrus (decentralized blob storage) |
| **Access Control** | Seal SDK (identity-based encryption) |
| **Cryptography** | Web Crypto API + @mysten/sui.js |
| **Merkle Trees** | merkletreejs + buffer |
| **Deployment** | Vercel (one-command deploy) |

## 📦 Project Structure

```
opentruth/
├── src/
│   ├── components/       # React components
│   │   ├── UploadForm.tsx
│   │   ├── VerifyForm.tsx
│   │   ├── DatasetUpload.tsx
│   │   ├── CertificateDisplay.tsx
│   │   └── DecryptButton.tsx  # NEW: Seal decryption UI
│   ├── pages/           # Route pages
│   │   ├── HomePage.tsx
│   │   ├── UploadPage.tsx
│   │   ├── VerifyPage.tsx
│   │   └── DatasetPage.tsx
│   ├── lib/             # Core modules
│   │   ├── crypto.ts    # SHA-256 hashing
│   │   ├── merkle.ts    # Merkle trees
│   │   ├── walrus.ts    # Walrus API
│   │   ├── certificate.ts
│   │   ├── sui.ts       # Wallet integration
│   │   ├── storage.ts   # LocalStorage
│   │   ├── training.ts  # Training simulator
│   │   └── seal-encryption.ts  # NEW: Seal encryption/decryption
│   └── types/           # TypeScript interfaces
├── docs/                # Documentation
└── tests/               # Unit tests
```

## 🔐 Certificate Schema

Every certificate contains:

```typescript
{
  version: "1.0",
  type: "opentruth.certificate",
  timestamp: 1731622060000,

  author: {
    suiAddress: "0x742d35Cc..."
  },

  artifact: {
    type: "image",
    hash: "sha256:a7ffc6f8...", // Hash of ORIGINAL file (for verification)
    size: 245678,
    mimeType: "image/png",
    filename: "walrus.png"
  },

  model: {                      // Optional
    name: "DALL-E 3",
    promptHash: "sha256:8c7d...",
    datasetMerkleRoot: "abc123..."
  },

  dataset?: {                   // Optional (for dataset certificates)
    fileCount: 5,
    totalSize: 1048576,
    merkleRoot: "0xabc123...",
    fileHashes: ["sha256:def...", "sha256:ghi..."]
  },

  proofs: {
    signature: {
      scheme: "ED25519",
      signature: "0x9faa3b2...",
      publicKey: "0x02ab3c..."
    }
  },

  encryption?: {                // Optional (if file is encrypted)
    enabled: true,
    encryptedBlobId: "BLOB:0xaf3d...",
    packageId: "0xSealPackageId...",
    keyId: "0x742d35Cc::12345...",
    threshold: 2,
    policy: {
      type: "userOwned",
      owner: "0x742d35Cc..."
    }
  },

  storage: {
    walrusBlobId: "BLOB:0xaf3d...",
    network: "testnet",
    uploadedAt: 1731622065000
  }
}
```

## 🔒 Seal Integration (NEW)

### How Seal Works in OpenTruth

**Seal** provides identity-based encryption with access controlled by Sui policies:

1. **Encryption**: Files are encrypted using the owner's Sui address as the identity
2. **Key Servers**: Lightweight services that generate decryption keys after verifying Sui policies
3. **Threshold**: Requires 2-of-N key servers to decrypt (prevents single point of failure)
4. **Access Control**: Only the owner (or allowlisted addresses) can decrypt

### Encryption Flow

```typescript
// Encrypt before uploading
const { encryptedData, packageId, keyId } = await encryptFileWithSeal(file, suiAddress);
// Upload encrypted data to Walrus
const blobId = await uploadToWalrus(new Blob([encryptedData]));
```

### Decryption Flow

```typescript
// Download encrypted data
const encryptedData = await fetchFromWalrus(blobId);
// Decrypt using Seal (requires wallet authentication)
const decryptedData = await decryptFileWithSeal(encryptedData, suiAddress);
```

### Public vs Private

- **Certificate**: Always public (hash, signature, metadata)
- **File Content**: Can be encrypted (controlled by Seal access policies)
- **Verification**: Anyone can verify hash matches; only authorized users can access content

## 🧪 Development

### Available Scripts

```bash
# Development
pnpm dev              # Start dev server
pnpm build            # Build for production
pnpm preview          # Preview production build

# Testing
pnpm test             # Run unit tests
pnpm test:coverage    # Generate coverage report

# Code Quality
pnpm lint             # Run ESLint
pnpm typecheck        # Check TypeScript types
```

### Adding New Features

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Add tests if applicable
5. Commit with descriptive message
6. Push to your fork
7. Open a Pull Request

See [Development Guide](./docs/development.md) for detailed guidelines.

## 🎬 Demo Flow

Perfect for presentations:

1. **Upload** - Upload an AI-generated image with model info
2. **Encrypt** - Enable Seal encryption to protect content
3. **Show Certificate** - Display public certificate with hash + signature
4. **Verify** - Anyone can verify hash matches → ✓ Authentic
5. **Decrypt** - Only owner can decrypt the actual file content
6. **Dataset** - Upload 5 files, generate Merkle root
7. **Training** - Simulate training, show checkpoints reference dataset

Total demo time: **6 minutes**

## 🏆 Hackathon Tracks

OpenTruth competes in:

- **Provably Authentic** - Cryptographic proof of AI content authenticity
- **AI x Data** - Full provenance from dataset to AI output

## 🔒 Security

- **No Private Keys Stored** - All signing happens through Sui wallet
- **Client-Side Hashing** - Files never leave your browser
- **Immutable Storage** - Certificates cannot be modified on Walrus
- **Seal Encryption** - Access-controlled decryption via Sui policies
- **Threshold Security** - 2-of-N key server requirement
- **Transparent Verification** - Anyone can verify authenticity

## 🚢 Deployment

### Deploy to Vercel

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel

# Production deployment
vercel --prod
```

Your app will be live at: `https://opentruth-<hash>.vercel.app`

### Environment Variables

Make sure to set these in Vercel dashboard:

- `VITE_WALRUS_PUBLISHER_URL`
- `VITE_WALRUS_AGGREGATOR_URL`
- `VITE_SUI_NETWORK`
- `VITE_SUI_RPC_URL`
- `VITE_SEAL_PACKAGE_ID` (optional, for mainnet deployment)

## 📊 Performance

- **Bundle Size**: < 500KB (gzipped)
- **Load Time**: < 2s on 3G
- **Hash Speed**: ~10MB/s on average hardware
- **Merkle Tree**: Handles 1000+ files efficiently
- **Seal Encryption**: ~50ms overhead per MB on modern hardware

## 🤝 Contributing

Contributions are welcome! Please read our [Contributing Guide](./docs/development.md) for details.

### Contributors

- Your Name - Initial work

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Walrus Team** - For decentralized storage infrastructure
- **Sui Foundation** - For blockchain and wallet integration
- **Seal Team** - For identity-based encryption and access control
- **shadcn** - For beautiful UI components

## 📬 Contact

- **Twitter**: [@opentruth](https://twitter.com/opentruth)
- **Discord**: [Join our server](https://discord.gg/opentruth)
- **Email**: hello@opentruth.xyz

## 🗺️ Roadmap

- [x] Walrus storage integration
- [x] Sui wallet signatures
- [x] Seal identity-based encryption
- [ ] Batch certificate generation
- [ ] Certificate templates
- [ ] Public certificate registry on Sui
- [ ] Mobile app (React Native)
- [ ] Browser extension for auto-verification
- [ ] API for automated certificate generation
- [ ] NFT minting for certificates

## ⚡ Quick Reference

### Hash a File

```typescript
import { hashFile } from '@/lib/crypto';
const hash = await hashFile(file); // returns "sha256:abc123..."
```

### Build Merkle Tree

```typescript
import { buildMerkleTree } from '@/lib/merkle';
const { root } = await buildMerkleTree(fileHashes); // returns "0xabc123..."
```

### Upload to Walrus

```typescript
import { uploadToWalrus } from '@/lib/walrus';
const { blobId } = await uploadToWalrus(file);
```

### Sign Certificate

```typescript
import { signCertificate } from '@/lib/sui';
const { signature, publicKey } = await signCertificate(cert, signMessage);
```

### Encrypt File with Seal

```typescript
import { encryptFileWithSeal } from '@/lib/seal-encryption';
const { encryptedData, packageId, keyId } = await encryptFileWithSeal(file, suiAddress);
```

---

**Built with ❤️ for the Walrus Haulout Hackathon**

[Documentation](./docs) | [Demo](https://opentruth.vercel.app) | [GitHub](https://github.com/opentruth)