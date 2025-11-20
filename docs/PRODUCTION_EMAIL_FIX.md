# Production Email Configuration Fix

## Problem
Emails work locally but fail in production with 403 error:
```
"The jkkn.ac.in domain is not verified"
```

## Root Cause
- **Local**: Uses `noreply@mentor.jkkn.ai` (verified ✅)
- **Production**: Uses `noreply@jkkn.ac.in` (NOT verified ❌)

## Solution: Update Production Environment Variables

### Step 1: Check Current Configuration

1. Deploy the debug endpoint (already created in this commit)
2. Visit: `https://your-production-domain.com/api/debug/email-config`
3. Check if `from_email` is set to `noreply@mentor.jkkn.ai`

### Step 2: Update Production Environment Variables

Choose your deployment platform:

#### Option A: Vercel

1. Go to [Vercel Dashboard](https://vercel.com)
2. Select your project
3. Go to **Settings** → **Environment Variables**
4. Update or add these variables for **Production**:

   ```
   FROM_EMAIL=noreply@mentor.jkkn.ai
   FROM_NAME=JKKN Mentor System
   RESEND_API_KEY=re_YLQp7ERJ_GVY99Bon1jFsqpvPFtKBGqQ9
   EMAIL_SERVICE=resend
   ```

5. **Important**: Check if there's an existing `FROM_EMAIL` variable with `jkkn.ac.in` and UPDATE it
6. Click **Save**
7. **Redeploy** your application (Settings → Deployments → Click "..." → Redeploy)

**Using Vercel CLI:**
```bash
# Update existing environment variable
vercel env rm FROM_EMAIL production
vercel env add FROM_EMAIL production
# When prompted, enter: noreply@mentor.jkkn.ai

# Redeploy
vercel --prod
```

#### Option B: Netlify

1. Go to [Netlify Dashboard](https://app.netlify.com)
2. Select your site
3. Go to **Site Settings** → **Environment Variables**
4. Click **Edit variables**
5. Update or add:

   ```
   FROM_EMAIL=noreply@mentor.jkkn.ai
   FROM_NAME=JKKN Mentor System
   RESEND_API_KEY=re_YLQp7ERJ_GVY99Bon1jFsqpvPFtKBGqQ9
   EMAIL_SERVICE=resend
   ```

6. **Redeploy** the site (Deploys → Trigger deploy)

#### Option C: Custom Server / VPS

1. SSH into your server
2. Edit the environment file:
   ```bash
   nano /path/to/your/app/.env
   # or
   nano /path/to/your/app/.env.production
   ```

3. Update these lines:
   ```bash
   FROM_EMAIL=noreply@mentor.jkkn.ai
   FROM_NAME=JKKN Mentor System
   RESEND_API_KEY=re_YLQp7ERJ_GVY99Bon1jFsqpvPFtKBGqQ9
   EMAIL_SERVICE=resend
   ```

4. Restart your application:
   ```bash
   pm2 restart all
   # or
   systemctl restart your-app-name
   ```

#### Option D: Railway / Render / Other Platforms

1. Go to your project dashboard
2. Find **Environment Variables** or **Settings**
3. Update these variables:
   - `FROM_EMAIL` → `noreply@mentor.jkkn.ai`
   - `FROM_NAME` → `JKKN Mentor System`
   - `RESEND_API_KEY` → `re_YLQp7ERJ_GVY99Bon1jFsqpvPFtKBGqQ9`
   - `EMAIL_SERVICE` → `resend`
4. Save and redeploy

### Step 3: Verify the Fix

After redeploying:

1. Visit: `https://your-production-domain.com/api/debug/email-config`
2. Check that:
   - `from_email` shows `noreply@mentor.jkkn.ai`
   - `status` shows `✅ Correct`
   - `has_resend_key` is `true`

3. Test email sending:
   - Create a new counseling session
   - Check if the student receives the email
   - Check Resend logs: https://resend.com/emails

### Step 4: Clean Up (IMPORTANT)

**Remove the debug endpoint after verification:**

```bash
rm app/api/debug/email-config/route.ts
```

Or delete the file manually, then commit and deploy:
```bash
git rm app/api/debug/email-config/route.ts
git commit -m "Remove debug endpoint"
git push
```

## Expected Result

- ✅ Emails sent from production should now use `noreply@mentor.jkkn.ai`
- ✅ Resend logs should show **200 Success** status
- ✅ Students should receive session notifications and feedback requests

## Troubleshooting

### Issue: Still getting 403 error after update

**Check 1**: Verify environment variables were saved
```bash
# Visit the debug endpoint
https://your-domain.com/api/debug/email-config
```

**Check 2**: Did you redeploy after updating?
- Environment variable changes require a new deployment
- Most platforms don't auto-redeploy when env vars change

**Check 3**: Check Resend dashboard
- Go to https://resend.com/domains
- Ensure `mentor.jkkn.ai` shows as **Verified** (green checkmark)

### Issue: Environment variables not updating

Some platforms cache environment variables. Try:

1. **Clear build cache** and redeploy
2. **Delete and recreate** the environment variable
3. **Restart** the application/container

### Issue: Local .env.local vs Production

**Important**: `.env.local` is NOT used in production. It's only for local development.

Production uses:
- Environment variables set in your hosting platform dashboard
- OR `.env.production` file (if your deployment process includes it)

## Testing Checklist

After fixing production environment:

- [ ] Debug endpoint shows correct email: `noreply@mentor.jkkn.ai`
- [ ] Create a test counseling session
- [ ] Check student email inbox
- [ ] Verify Resend logs show 200 status
- [ ] Test feedback request email
- [ ] Remove debug endpoint
- [ ] Update documentation

## Environment Variables Summary

**Required for Email to Work:**

| Variable | Value | Required |
|----------|-------|----------|
| `EMAIL_SERVICE` | `resend` | Yes |
| `RESEND_API_KEY` | `re_YLQp7ERJ_GVY99Bon1jFsqpvPFtKBGqQ9` | Yes |
| `FROM_EMAIL` | `noreply@mentor.jkkn.ai` | **Yes - Must be verified domain** |
| `FROM_NAME` | `JKKN Mentor System` | Optional (has default) |
| `NEXT_PUBLIC_APP_URL` | Your production URL | Yes (for feedback links) |

## Security Note

⚠️ **Never commit `.env` files to git**

The values shown in this doc are for production setup. Keep them secure:
- Don't share API keys publicly
- Don't commit them to version control
- Use environment variables in your hosting platform
- Rotate keys if they're exposed

## Need Help?

If emails still don't work after following this guide:

1. Check the Resend logs: https://resend.com/emails
2. Check your application logs for `[Session Email]` or `[Email]` prefixes
3. Ensure your production URL is correct in `NEXT_PUBLIC_APP_URL`
4. Contact your hosting platform support if environment variables aren't persisting
