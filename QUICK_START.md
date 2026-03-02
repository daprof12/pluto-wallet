# 🚀 Pluto Wallet Migration - Quick Start

## ✅ All Errors Fixed!

Both errors have been resolved:
- ✅ `process is not defined` - FIXED
- ✅ `Cannot read properties of undefined` - FIXED

---

## 🎯 Quick Setup (3 Steps)

### Step 1: Install Dependencies
```bash
npm install @supabase/supabase-js
```

### Step 2: Configure Environment
Create `.env` file in project root:
```bash
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
VITE_COINGECKO_API_KEY=your-coingecko-api-key
VITE_DEFAULT_ADMIN_PASSWORD=admin123
```

### Step 3: Restart Dev Server
```bash
npm run dev
```

**That's it!** The migration feature is now ready to use.

---

## 🎮 How to Use Migration

1. **Open Wallet** → Create or unlock your wallet
2. **Go to Settings** → Click gear icon
3. **Click Sync Tab** → Look for database icon
4. **Start Migration** → Click the button
5. **Wait for Completion** → Usually 10-30 seconds
6. **Done!** → Your data is now in Supabase

---

## 📋 What Was Fixed

| Error | Fix Applied |
|-------|------------|
| `process is not defined` | Changed to `import.meta.env` |
| `Cannot read undefined` | Added null safety with `?.` |
| Eager initialization | Implemented lazy loading |
| No error handling | Added helpful error messages |

---

## 🆘 Still Having Issues?

### Issue: "Supabase credentials not configured"
**Fix:** Add credentials to `.env` and restart server

### Issue: Can't find `.env` file
**Fix:** Create it in project root (same level as `package.json`)

### Issue: Variables not loading
**Fix:** Must start with `VITE_` prefix and restart server

### Issue: Migration button doesn't appear
**Fix:** Make sure you have local wallet data to migrate

---

## 📚 Documentation

- **Setup Guide:** `/supabase/SETUP_GUIDE.md`
- **Migration Guide:** `/docs/MIGRATION_GUIDE.md`
- **Status Checklist:** `/supabase/SETUP_STATUS_CHECKLIST.md`
- **Fix Details:** `/SUPABASE_FIX_COMPLETE.md`

---

## ✅ Ready to Go!

Your Pluto Wallet now has a working Supabase migration system. Just configure your credentials and you're ready to sync data to the cloud! 🎉
