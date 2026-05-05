#!/bin/bash
# ══════════════════════════════════════
# QuizHub VM Setup Script
# Run once on a fresh VM
# Usage: bash setup-vm.sh
# ══════════════════════════════════════

set -e

echo "🚀 QuizHub VM Setup"
echo ""

# ── Docker ──
if ! command -v docker &> /dev/null; then
  echo "📦 Installing Docker..."
  curl -fsSL https://get.docker.com | sh
  usermod -aG docker $USER
  echo "✅ Docker installed"
else
  echo "✅ Docker already installed"
fi

# ── .NET SDK (for migrations) ──
if ! command -v dotnet &> /dev/null; then
  echo "📦 Installing .NET SDK 8..."
  apt-get update -q
  apt-get install -y dotnet-sdk-8.0
  echo "✅ .NET SDK installed"
else
  echo "✅ .NET SDK already installed"
fi

# ── EF Tools ──
if ! command -v dotnet-ef &> /dev/null; then
  echo "📦 Installing EF Core tools..."
  dotnet tool install --global dotnet-ef
  echo 'export PATH="$PATH:$HOME/.dotnet/tools"' >> ~/.bashrc
  export PATH="$PATH:$HOME/.dotnet/tools"
  echo "✅ EF tools installed"
else
  echo "✅ EF tools already installed"
fi

# ── Directory structure ──
echo "📁 Creating directory structure..."
mkdir -p /opt/quizhub/QuizHub
mkdir -p /opt/quizhub/backups

# ── .env files ──
if [ ! -f /opt/quizhub/QuizHub/.env ]; then
  echo ""
  echo "⚠️  Production .env not found!"
  echo "    Create /opt/quizhub/QuizHub/.env based on .env.prod.example"
fi

if [ ! -f /opt/quizhub/QuizHub/.env.staging ]; then
  echo "⚠️  Staging .env not found!"
  echo "    Create /opt/quizhub/QuizHub/.env.staging based on .env.staging.example"
fi

# ── SSH key for GitHub Actions ──
if [ ! -f ~/.ssh/github_actions ]; then
  echo ""
  echo "🔑 Generating SSH key for GitHub Actions..."
  ssh-keygen -t ed25519 -C "github-actions@quizhub" -f ~/.ssh/github_actions -N ""
  cat ~/.ssh/github_actions.pub >> ~/.ssh/authorized_keys
  echo ""
  echo "📋 Add this PRIVATE key to GitHub Secrets as VM_SSH_KEY:"
  echo "────────────────────────────────"
  cat ~/.ssh/github_actions
  echo "────────────────────────────────"
fi

echo ""
echo "✅ VM setup complete!"
echo ""
echo "Next steps:"
echo "  1. Create /opt/quizhub/QuizHub/.env (production)"
echo "  2. Create /opt/quizhub/QuizHub/.env.staging (staging)"
echo "  3. Add GitHub Secrets: VM_HOST, VM_USER, VM_SSH_KEY"
echo "  4. Push to 'staging' branch to trigger first deploy"
