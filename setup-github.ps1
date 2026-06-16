# setup-github.ps1
# Helper script to initialize Git and push Helaphant website to GitHub
# IMPORTANT: You must run this from INSIDE the project folder.
# Open PowerShell and first run:
#   cd "C:\Users\nikch\helaphant-website"
# Then run this script:
#   .\setup-github.ps1

Write-Host "=== Helaphant Website - GitHub Setup ===" -ForegroundColor Cyan
Write-Host "Make sure you are in the correct folder: C:\Users\nikch\helaphant-website" -ForegroundColor Yellow

# Check if Git is installed
try {
    git --version | Out-Null
    Write-Host "Git is installed." -ForegroundColor Green
} catch {
    Write-Host "Git is NOT installed or not in PATH." -ForegroundColor Red
    Write-Host "Please install Git for Windows from https://git-scm.com/download/win" -ForegroundColor Yellow
    Write-Host "Restart PowerShell after installing, then run this script again." -ForegroundColor Yellow
    exit 1
}

# Initialize Git if not already a repo
if (-not (Test-Path .git)) {
    Write-Host "Initializing Git repository..." -ForegroundColor Yellow
    git init
    git branch -M main
} else {
    Write-Host "Git repository already exists." -ForegroundColor Green
}

# Add all files
Write-Host "Adding all files (this may take a moment)..." -ForegroundColor Yellow
git add .

# Commit
$commitMessage = "Initial commit: Helaphant custom site with Supabase backend, logo, hero updates (Whimsical Menace, motto), cart with Netlify forms + Stripe placeholder, admin panel, hover effects, spinners, and code cleanup."
git commit -m $commitMessage

Write-Host ""
Write-Host "Local Git setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "NEXT STEPS - DO THESE IN ORDER:" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Open your browser and go to: https://github.com/new" -ForegroundColor White
Write-Host "2. Create a NEW repository with this exact name: helaphant-website" -ForegroundColor White
Write-Host "3. Leave all the 'Initialize this repository with...' boxes UNCHECKED." -ForegroundColor White
Write-Host "4. Click 'Create repository'." -ForegroundColor White
Write-Host "5. On the next page, copy the HTTPS URL (it will look like https://github.com/YOURUSERNAME/helaphant-website.git)" -ForegroundColor White
Write-Host ""
Write-Host "6. Back in this PowerShell window, run these two lines (replace YOURUSERNAME with your actual GitHub username):" -ForegroundColor White
Write-Host ""
Write-Host "   git remote add origin https://github.com/YOURUSERNAME/helaphant-website.git" -ForegroundColor Yellow
Write-Host "   git push -u origin main" -ForegroundColor Yellow
Write-Host ""
Write-Host "If it asks for a password, use a GitHub Personal Access Token (not your normal password)." -ForegroundColor Gray
Write-Host "   Create one here: https://github.com/settings/tokens (classic token with 'repo' scope)" -ForegroundColor Gray
Write-Host ""
Write-Host "After the push succeeds, your entire project will be on GitHub!" -ForegroundColor Green
Write-Host ""
Write-Host "Tip: In the future, to save new changes use:" -ForegroundColor Gray
Write-Host "   git add . ; git commit -m 'your short description' ; git push" -ForegroundColor Gray
