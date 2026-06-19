# Helaphant Website

A beautiful, dark artistic e-commerce site for War Helaphant — hand-painted clothing, prints, patches, and more.

**Live concept**: Static frontend (HTML + Tailwind + vanilla JS) + Supabase backend for products.

## Current Features
- Public shop (index.html): Browse products by category, add to cart, view details.
- Admin panel (admin.html): Password-protected product management (add/edit/delete with image URLs).
- Real-time data via Supabase (products update live when changed in admin).
- Logo, custom tagline ("WHIMSICAL • MENACE"), motto ("WAGING WAR THROUGH ART.").
- Responsive, keyboard accessible, nice hover effects and loading states.
- Cart + Newsletter now use Netlify Forms (real submissions on deploy — orders and signups will email you).
- "Checkout" collects name, email, notes + cart details.

## How to Run Locally
1. Open `index.html` in a browser (double-click).
2. For admin: Open `admin.html` and use the password you set (it is stored in your browser only).
3. To test Supabase changes: Edit products in admin, refresh index.html.

**Note**: For best results (avoid file:// security issues with Supabase), run a local server:
- VS Code: Install "Live Server" extension and click "Go Live".
- Or PowerShell: `python -m http.server 8000` then visit http://localhost:8000

## Next Steps to Make It Fully Functional & Live

### 1. Deploy (Highest Priority)
The site is ready to go live today.

**Easiest option (no code changes needed)**:
- Go to https://app.netlify.com/drop
- Drag the entire `helaphant-website` folder onto the page.
- Netlify will give you a free URL like `https://your-name.netlify.app`

**Better long-term**:
- Create a free GitHub account.
- Push this folder to a new repo.
- Connect the repo to Netlify (or Vercel) for automatic deploys on every change.

After deploy, update the Supabase site URL in your Supabase project settings (Authentication → URL Configuration → Site URL) to your new Netlify URL.

### 2. Custom Domain (helaphant.com)
You mentioned the domain is currently managed through Shopify.

**Important**: You don't necessarily need to "transfer" the domain registration away from Shopify. You can just update the DNS records to point to your new site (Netlify in this case). The domain stays registered wherever it is.

Steps:

1. Deploy the site first (see above) and note your Netlify URL (e.g. `https://helaphant-site.netlify.app`).

2. In Netlify:
   - Go to your site → Domain management → Add custom domain → enter `helaphant.com` and `www.helaphant.com`.
   - Netlify will check DNS and give you specific records to add (usually a CNAME for www and instructions for apex).

3. Update DNS at Shopify (or your registrar):
   - Log into Shopify Admin → Online Store → Domains → Manage for helaphant.com.
   - Go to DNS settings (or "Edit DNS" / "Advanced").
   - Add/update records:
     - For `www`: CNAME record pointing to your Netlify subdomain (e.g. `your-site.netlify.app`).
     - For apex `helaphant.com`: If Shopify supports ALIAS/ANAME, use that pointing to Netlify. Otherwise, use A records to Netlify's IPs (they provide them, commonly 75.2.60.5 or check Netlify docs for current).
   - Remove or update any old Shopify forwarding/redirects for the root domain.
   - Shopify often proxies; you may need to disable "Shopify managed" for the domain or set it to "External".

4. Wait for DNS propagation (up to 48h, usually fast).
5. In Netlify, enable HTTPS and set the primary domain.

**Tip**: Test first with a subdomain like `new.helaphant.com` before changing the main one.

If the domain is registered directly with Shopify, you manage DNS there. If transferred to another registrar (GoDaddy etc.), manage there.

After pointing, update any links in the site if needed, and set the domain in Supabase (Auth settings → Site URL and Redirect URLs).

### 3. Secure the Admin
Current protection is a simple client-side password (easy to bypass by viewing source).

**Quick improvements**:
- Change the password using the "Set or change password" link inside the admin (after logging in).
- Better: Add Supabase Auth so only you can log in (email + password).
- Or move admin to a separate protected route (Netlify Identity or password page).

### 4. E-commerce & Payments (Current vs Recommendations)
Current setup (already functional for small scale):
- Cart is client-side.
- "Checkout" submits a Netlify Form with name, email, notes + full cart summary.
- On deploy, submissions appear in Netlify dashboard and can email you automatically.
- You manually fulfill (email customer for payment via PayPal, Venmo, Stripe invoice, etc.).
- This is zero/low fees, simple for an artist shop.

**Recommendations to level up:**

**Option A (Easiest upgrade - Recommended to start): Add Stripe Checkout**
- Sign up for Stripe (free).
- In the cart, instead of (or in addition to) the form, add a "Pay with Card" button that uses Stripe Checkout.
- We can integrate Stripe.js: On checkout, create a Stripe session (can be done client-side with Payment Links for simplicity, or serverless function).
- Customer pays via Stripe hosted page, you get notified.
- Pros: Real payments, low code.
- We can implement this quickly in the JS.

**Option B: Use Snipcart (Great for static sites)**
- Add Snipcart JS library.
- Mark products with data attributes.
- Full cart, checkout, payments (Stripe/PayPal), inventory, orders dashboard.
- Very little backend needed.
- Free for low volume.
- Would replace our custom cart but keep the beautiful custom design.

**Option C: Keep form-based + add manual payments**
- Enhance the current form to also generate a Stripe Payment Link or PayPal link.
- Or store orders in Supabase and have an "orders" view in admin.

**Option D (More advanced): Full backend**
- Add Supabase Edge Functions for order processing + Stripe.
- Or move to a headless commerce platform (Medusa, Commerce.js) while keeping the custom frontend.

**My recommendation for now**: Deploy first (see below), then enable the Stripe option in the cart (code is already partially there — just add your Stripe publishable key).

I've added:
- A "PAY WITH CARD (STRIPE)" button in the cart.
- Placeholder JS that explains setup.
- Orders are also saved to Supabase (create an "orders" table with columns: name, email, notes, cart_summary text, total numeric, status text, created_at timestamp).

To fully enable:
1. Stripe account → get pk_test_... key → paste in index.html (search STRIPE_PUBLISHABLE_KEY).
2. For real dynamic line items: Add a Netlify Function or Supabase Edge Function to create Checkout Session (I can implement the function if you want).
3. For simplest payments: In Stripe dashboard create "Payment Links" for common items and link them.

We can also store orders in Supabase for an order history view in the admin later.

### 5. Product Images (Currently URLs only)
In admin you enter image URLs.

To upload images directly:
- Enable Supabase Storage (create a public `product-images` bucket).
- Update admin to use file uploads + get public URLs.
- This makes the admin truly self-service.

### 5. Cart & Newsletter (Already Improved)
- Both now use proper forms with `data-netlify="true"`.
- On deploy, submissions will be emailed to you (or forwarded).
- You can view submissions in the Netlify dashboard.

### 6. Polish & Extras
- Add more real products from your original site.
- Favicon (use the logo).
- SEO: Update `<title>`, meta description, Open Graph tags.
- Error/loading states are already decent.
- Mobile testing.
- Analytics (optional: Plausible or Netlify Analytics).

## Tech Stack
- Pure static HTML + Tailwind (via CDN) + vanilla JS
- Supabase (PostgreSQL + Auth + Storage ready)
- No build step — easy to edit and deploy

## Files
- `index.html` — Public shop
- `admin.html` — Product management (password protected)
- `images/` — Assets (logo.png is the current one)
- `netlify.toml` — Deployment config

## Next Immediate Actions (to launch)
1. **Domain/SSL**: DNS updated in Shopify (A 75.2.60.5, CNAME www to Netlify subdomain). Wait for propagation (dnschecker.org). Netlify auto SSL. Test at https://helaphant.com.
2. **Enable Stripe payments** (TEST KEYS CONFIGURED):
   - Publishable key is set in `index.html`.
   - **Set the secret in Netlify**: Site settings → Environment variables → Add `STRIPE_SECRET_KEY` = your `sk_test_...`
   - `git add . ; git commit -m "Configure Stripe keys" ; git push`
   - Netlify redeploys. "PAY WITH CARD (STRIPE)" will now create real Checkout sessions.
   - Test card: 4242 4242 4242 4242 (any future date / any CVC). This is test mode only.
3. **Supabase**:
   - Create "orders" table for history (id, name, email, notes, cart_summary, total, status, created_at).
   - Set Site URL in Supabase to https://helaphant.com.
4. **Admin**: Log into the admin page, then use the "Set or change password" option to set a strong password. Do this before going live.
5. **Test**:
   - Browse, cart, submit form (Netlify Forms emails you).
   - Admin: manage products (live on shop).
6. **Polish**:
   - More products.
   - Mobile test.
   - Optional: Supabase Storage for admin image uploads.
   - Set Supabase Auth Site URL to https://helaphant.com in Supabase dashboard.

The site is now deployable and mostly launch-ready. Forms give basic e-commerce (order collection). Stripe adds payments.

## Saving Progress to GitHub (Recommended)

To version control your work and make deployment easier (auto-deploys on Netlify when you push):

### 1. Install Git (if not already)
- Download and install from https://git-scm.com/download/win
- Restart PowerShell after install.

### 2. Initialize and Commit Locally
Open PowerShell and run in the project folder:

```powershell
cd "C:\Users\nikch\helaphant-website"

git init
git add .
git commit -m "Initial commit: Helaphant custom site with Supabase backend, logo, hero updates, cart with Netlify forms + Stripe placeholder, admin panel, and all visual customizations (Whimsical Menace, motto, hover effects, etc.)"
git branch -M main
```

### 3. Create Repo on GitHub
- Go to https://github.com/new
- Repository name: `helaphant-website` (or your choice)
- Description: "Custom artistic website for War Helaphant with Supabase product management"
- Public or Private
- **Do not** initialize with README, .gitignore or license (we already have them)
- Click "Create repository"

### 4. Push to GitHub
Back in PowerShell:

```powershell
git remote add origin https://github.com/YOUR_GITHUB_USERNAME/helaphant-website.git
git push -u origin main
```

(Replace YOUR_GITHUB_USERNAME with your actual GitHub username.)

### 5. After Pushing
- Your code is now safely on GitHub with full history.
- Connect the repo to Netlify for automatic deployments: In Netlify, "New site from Git" > select your GitHub repo.
- Every time you push changes (git add . ; git commit -m "..." ; git push), Netlify will rebuild and update the live site.

**Pro tip**: After first push, you can use GitHub Desktop app for easier commits if you prefer GUI over command line.

## Questions / Next?
Tell me priorities:
- Deploy + domain pointing (I can refine the DNS steps)?
- Finish Stripe integration (add Netlify Function for secure Checkout Sessions)?
- Add Supabase Storage for image uploads in admin?
- Admin orders dashboard?
- Something else (more products, visual polish, etc.)?

We can knock these out one by one. I've already prepared the cart for Stripe and Netlify Forms.
