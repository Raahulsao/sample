# Quick Setup Checklist

## 🚀 Follow these steps in order:

### 1. Google Cloud Console Setup
- [ ] Go to https://console.cloud.google.com/
- [ ] Create new project or select existing one
- [ ] Enable "People API" (APIs & Services > Library)
- [ ] Create OAuth 2.0 credentials (APIs & Services > Credentials)
- [ ] Configure OAuth consent screen
- [ ] Add redirect URI: `https://YOUR_AUTH0_DOMAIN/login/callback`
- [ ] Save Client ID and Client Secret

### 2. Auth0 Dashboard Setup
- [ ] Go to https://manage.auth0.com/
- [ ] Create Single Page Application
- [ ] Go to Authentication > Social
- [ ] Enable Google connection
- [ ] Enter Google Client ID and Client Secret
- [ ] Configure application URLs:
  - Callback: `http://localhost:3001`
  - Logout: `http://localhost:3001`
  - Web Origins: `http://localhost:3001`

### 3. Update Environment Variables
- [ ] Open `.env.local` file
- [ ] Replace placeholder values with real Auth0 credentials:
  ```env
  NEXT_PUBLIC_AUTH0_DOMAIN=your-actual-domain.auth0.com
  NEXT_PUBLIC_AUTH0_CLIENT_ID=your-actual-client-id
  NEXT_PUBLIC_AUTH0_REDIRECT_URI=http://localhost:3001
  AUTH0_CLIENT_SECRET=your-actual-client-secret
  ```

### 4. Test the Application
- [ ] Run `npm run dev`
- [ ] Visit http://localhost:3001
- [ ] Try "Continue with Google" button
- [ ] Verify user data appears in Auth0 dashboard

## 🆘 Need Help?

1. **Detailed Guide**: Check `GOOGLE_OAUTH_SETUP.md` for step-by-step instructions
2. **Common Issues**: See troubleshooting section in the detailed guide
3. **Auth0 Logs**: Check Dashboard > Monitoring > Logs for errors

## ✅ Success Indicators

When everything works correctly:
- No configuration error on app startup
- Google sign-in button appears in auth modal
- Clicking Google button redirects to Google consent screen
- After authorization, user is logged into the app
- User profile appears in app header
- User data is visible in Auth0 dashboard under Users

## 📝 What You'll Need

Before starting, have these ready:
- Google account
- Auth0 account (free tier is fine)
- Your Auth0 domain (from Auth0 dashboard)
- Text editor to update `.env.local`