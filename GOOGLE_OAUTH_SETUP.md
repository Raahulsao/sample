# Complete Google OAuth Setup Guide for Auth0

## Part 1: Set up Google Cloud Console

### Step 1: Create/Access Google Cloud Project

1. **Go to Google Cloud Console**
   - Visit: https://console.cloud.google.com/
   - Sign in with your Google account

2. **Create a New Project (or select existing)**
   - Click on the project dropdown at the top
   - Click "NEW PROJECT"
   - Enter project name: `ChatAI Auth` (or any name you prefer)
   - Click "CREATE"
   - Wait for project creation and select it

### Step 2: Enable Google APIs

1. **Navigate to APIs & Services**
   - In the left sidebar, click "APIs & Services" > "Library"
   - Or use this direct link: https://console.cloud.google.com/apis/library

2. **Enable Google+ API (Legacy) or Google Identity Services**
   - Search for "Google+ API" in the search bar
   - Click on "Google+ API" 
   - Click "ENABLE"
   - **Note**: If Google+ API is deprecated, use "Google Identity Services" instead

3. **Alternative: Enable People API (Recommended)**
   - Search for "People API"
   - Click on "Google People API"
   - Click "ENABLE"

### Step 3: Create OAuth 2.0 Credentials

1. **Go to Credentials**
   - Click "APIs & Services" > "Credentials" in the left sidebar
   - Or visit: https://console.cloud.google.com/apis/credentials

2. **Create OAuth Client ID**
   - Click "CREATE CREDENTIALS" button
   - Select "OAuth client ID"

3. **Configure OAuth Consent Screen (if prompted)**
   - If you see "To create an OAuth client ID, you must first set up the consent screen"
   - Click "CONFIGURE CONSENT SCREEN"
   - Choose "External" (unless you have a Google Workspace account)
   - Click "CREATE"

4. **Fill OAuth Consent Screen Details**
   - **App name**: `ChatAI` (or your app name)
   - **User support email**: Your email address
   - **App logo**: (Optional) Upload your app logo
   - **App domain**: Leave blank for now
   - **Developer contact information**: Your email address
   - Click "SAVE AND CONTINUE"

5. **Scopes (Step 2)**
   - Click "ADD OR REMOVE SCOPES"
   - Add these scopes:
     - `../auth/userinfo.email`
     - `../auth/userinfo.profile`
     - `openid`
   - Click "UPDATE"
   - Click "SAVE AND CONTINUE"

6. **Test Users (Step 3)**
   - Add your email address as a test user
   - Click "SAVE AND CONTINUE"

7. **Summary (Step 4)**
   - Review and click "BACK TO DASHBOARD"

### Step 4: Create OAuth Client ID

1. **Return to Credentials**
   - Go back to "APIs & Services" > "Credentials"
   - Click "CREATE CREDENTIALS" > "OAuth client ID"

2. **Configure OAuth Client**
   - **Application type**: Select "Web application"
   - **Name**: `ChatAI Web Client` (or any name)

3. **Add Authorized Redirect URIs**
   - Click "ADD URI" under "Authorized redirect URIs"
   - Add: `https://YOUR_AUTH0_DOMAIN/login/callback`
   - **Important**: Replace `YOUR_AUTH0_DOMAIN` with your actual Auth0 domain
   - Example: `https://dev-abc123.us.auth0.com/login/callback`

4. **Add Authorized JavaScript Origins (Optional)**
   - Click "ADD URI" under "Authorized JavaScript origins"
   - Add: `http://localhost:3001` (for development)
   - Add: `https://yourdomain.com` (for production)

5. **Create the Client**
   - Click "CREATE"
   - **Save the credentials**: Copy the Client ID and Client Secret

## Part 2: Configure Auth0

### Step 5: Enable Google Connection in Auth0

1. **Access Auth0 Dashboard**
   - Go to: https://manage.auth0.com/
   - Log in to your Auth0 account

2. **Navigate to Social Connections**
   - In the left sidebar, click "Authentication"
   - Click "Social"

3. **Configure Google Connection**
   - Find "Google" in the list of social providers
   - Click on the Google tile
   - Toggle the switch to "ON" to enable it

4. **Enter Google Credentials**
   - **Client ID**: Paste the Client ID from Google Cloud Console
   - **Client Secret**: Paste the Client Secret from Google Cloud Console
   - **Attributes**: 
     - Check "Email address"
     - Check "Basic profile"
   - **Permissions**: Leave default or add:
     - `email`
     - `profile`

5. **Save Configuration**
   - Click "SAVE CHANGES"

### Step 6: Connect to Your Application

1. **Go to Applications**
   - Click "Applications" > "Applications" in the Auth0 sidebar
   - Click on your application name

2. **Enable Google Connection**
   - Scroll down to "Connections" tab
   - Under "Social", make sure "google-oauth2" is enabled
   - If not, click the toggle to enable it

## Part 3: Update Your Application

### Step 7: Get Your Auth0 Credentials

1. **In your Auth0 Application Settings**
   - Copy the **Domain** (e.g., `dev-abc123.us.auth0.com`)
   - Copy the **Client ID**
   - Copy the **Client Secret** (from Settings > Advanced Settings)

2. **Update .env.local file**
   ```env
   NEXT_PUBLIC_AUTH0_DOMAIN=dev-abc123.us.auth0.com
   NEXT_PUBLIC_AUTH0_CLIENT_ID=your-client-id-here
   NEXT_PUBLIC_AUTH0_REDIRECT_URI=http://localhost:3001
   AUTH0_CLIENT_SECRET=your-client-secret-here
   ```

### Step 8: Configure Application URLs in Auth0

1. **In Auth0 Application Settings**
   - **Allowed Callback URLs**: 
     ```
     http://localhost:3001, http://localhost:3000
     ```
   - **Allowed Logout URLs**: 
     ```
     http://localhost:3001, http://localhost:3000
     ```
   - **Allowed Web Origins**: 
     ```
     http://localhost:3001, http://localhost:3000
     ```
   - **Allowed Origins (CORS)**: 
     ```
     http://localhost:3001, http://localhost:3000
     ```

2. **Save Changes**
   - Scroll down and click "SAVE CHANGES"

## Part 4: Test the Integration

### Step 9: Test Your Setup

1. **Restart your development server**
   ```bash
   npm run dev
   ```

2. **Visit your application**
   - Go to: http://localhost:3001
   - You should see the landing page

3. **Test Google OAuth**
   - Click "Sign In" or "Get Started"
   - Click "Continue with Google"
   - You should be redirected to Google's consent screen
   - Authorize the application
   - You should be redirected back and logged in

## Troubleshooting

### Common Issues and Solutions

1. **"Error: redirect_uri_mismatch"**
   - Make sure the redirect URI in Google Cloud Console exactly matches your Auth0 domain
   - Format: `https://YOUR_AUTH0_DOMAIN/login/callback`

2. **"This app isn't verified"**
   - This is normal for development
   - Click "Advanced" > "Go to ChatAI (unsafe)" to continue
   - For production, you'll need to verify your app with Google

3. **"Access blocked: This app's request is invalid"**
   - Check that you've enabled the correct APIs in Google Cloud Console
   - Verify your OAuth consent screen is properly configured

4. **Auth0 Configuration Error**
   - Double-check your environment variables
   - Make sure there are no extra spaces or quotes
   - Restart your development server after changes

5. **Google Connection Not Working**
   - Verify the Google connection is enabled in Auth0
   - Check that your application has the Google connection enabled
   - Ensure Client ID and Secret are correctly entered in Auth0

### Verification Checklist

- [ ] Google Cloud project created
- [ ] APIs enabled (People API or Google+ API)
- [ ] OAuth consent screen configured
- [ ] OAuth client ID created with correct redirect URI
- [ ] Google connection enabled in Auth0
- [ ] Google credentials added to Auth0
- [ ] Application URLs configured in Auth0
- [ ] Environment variables updated
- [ ] Development server restarted

## Next Steps

Once everything is working:

1. **For Production**:
   - Add your production domain to all URL configurations
   - Submit your app for Google verification
   - Configure custom domains in Auth0

2. **Additional Security**:
   - Enable MFA in Auth0
   - Configure user roles and permissions
   - Set up email verification

3. **Monitoring**:
   - Set up Auth0 logs monitoring
   - Configure webhooks for user events
   - Add analytics tracking

## Support

If you encounter issues:
- Check Auth0 logs: Dashboard > Monitoring > Logs
- Check browser console for JavaScript errors
- Verify network requests in browser dev tools
- Contact Auth0 support or check their documentation