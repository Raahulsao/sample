# Auth0 Setup Guide

## Step 1: Create Auth0 Account and Application

1. Go to [Auth0 Dashboard](https://manage.auth0.com/)
2. Sign up for a free account or log in
3. Create a new application:
   - Click "Applications" in the sidebar
   - Click "Create Application"
   - Choose "Single Page Application"
   - Select "React" as the technology

## Step 2: Configure Application Settings

In your Auth0 application settings, configure the following:

### Allowed Callback URLs
```
http://localhost:3001, http://localhost:3000, https://yourdomain.com
```

### Allowed Logout URLs
```
http://localhost:3001, http://localhost:3000, https://yourdomain.com
```

### Allowed Web Origins
```
http://localhost:3001, http://localhost:3000, https://yourdomain.com
```

### Allowed Origins (CORS)
```
http://localhost:3001, http://localhost:3000, https://yourdomain.com
```

## Step 3: Enable Google OAuth

1. Go to "Authentication" > "Social" in the Auth0 dashboard
2. Click on "Google"
3. Enable the connection
4. Configure with your Google OAuth credentials:
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select existing one
   - Enable Google+ API
   - Create OAuth 2.0 credentials
   - Add Auth0's callback URL: `https://YOUR_AUTH0_DOMAIN/login/callback`

## Step 4: Update Environment Variables

Update your `.env.local` file with your Auth0 credentials:

```env
NEXT_PUBLIC_AUTH0_DOMAIN=your-auth0-domain.auth0.com
NEXT_PUBLIC_AUTH0_CLIENT_ID=your-auth0-client-id
NEXT_PUBLIC_AUTH0_REDIRECT_URI=http://localhost:3001
AUTH0_CLIENT_SECRET=your-auth0-client-secret
```

## Step 5: Test the Integration

1. Start your development server: `npm run dev`
2. Navigate to `http://localhost:3001`
3. Try signing up with email/password
4. Try signing in with Google
5. Check the Auth0 dashboard to see user registrations

## Features Included

✅ **Email/Password Authentication**
- Sign up with email and password
- Sign in with existing credentials
- Secure password handling via Auth0

✅ **Google OAuth Integration**
- "Continue with Google" button on both sign-in and sign-up
- Automatic account creation for new Google users
- Profile information from Google account

✅ **UI/UX Improvements**
- Fixed icon positioning in input fields
- Professional Google sign-in button styling
- Error handling and loading states
- Responsive design for mobile and desktop

✅ **Security Features**
- Secure token management
- Session persistence
- Automatic token refresh
- HTTPS enforcement

✅ **User Profile Integration**
- Display user name and email in header
- Profile picture from Google or Auth0 default
- Sign out functionality with proper cleanup

## Troubleshooting

### Common Issues

1. **Configuration Error**: Make sure all environment variables are set correctly
2. **CORS Issues**: Ensure your domain is added to Allowed Origins in Auth0
3. **Google OAuth Not Working**: Check Google Cloud Console configuration
4. **Redirect Issues**: Verify callback URLs match exactly

### Debug Mode

To enable debug logging, add this to your `.env.local`:
```env
AUTH0_DEBUG=true
```

## Next Steps

- Configure email templates in Auth0 dashboard
- Set up custom domains for production
- Add multi-factor authentication
- Configure user roles and permissions
- Set up webhooks for user events