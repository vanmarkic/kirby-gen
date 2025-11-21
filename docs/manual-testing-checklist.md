# Manual Testing Checklist - Simple Authentication Barrier

**Feature:** Simple Token-Based Authentication
**Date:** 2025-11-21
**Branch:** feature-simple-auth

## Prerequisites

Before testing, ensure:
- [ ] Backend `.env` has `AUTH_ENABLED=true` and `AUTH_TOKEN=test-password`
- [ ] Frontend `.env` has `VITE_AUTH_TOKEN=test-password`
- [ ] Both backend and frontend servers are running
- [ ] Browser localStorage is cleared (or use incognito mode)

## Test Scenarios

### 1. Initial Access Without Authentication

**Steps:**
1. Clear browser localStorage: `localStorage.clear()`
2. Navigate to `http://localhost:5173`

**Expected:**
- [ ] User is redirected to `/login` page
- [ ] Login page displays with password input field
- [ ] Login page has a submit button
- [ ] No error messages displayed initially

### 2. Login with Invalid Password

**Steps:**
1. On login page, enter wrong password: `wrong-password`
2. Click "Login" button

**Expected:**
- [ ] Error message displayed: "Invalid password" or similar
- [ ] User remains on login page
- [ ] No token stored in localStorage
- [ ] No navigation occurs

### 3. Login with Valid Password

**Steps:**
1. On login page, enter correct password: `test-password`
2. Click "Login" button

**Expected:**
- [ ] No error message displayed
- [ ] User is redirected to home page (`/`)
- [ ] Token is stored in localStorage (`localStorage.getItem('authToken')`)
- [ ] Application loads successfully

### 4. Navigation While Authenticated

**Steps:**
1. After successful login, navigate between pages:
   - Home page
   - Projects page (if exists)
   - Any other application pages

**Expected:**
- [ ] All pages load successfully
- [ ] No redirect to login page
- [ ] User stays authenticated
- [ ] Token remains in localStorage

### 5. Page Refresh While Authenticated

**Steps:**
1. After successful login, refresh the browser (`Cmd+R` or `F5`)

**Expected:**
- [ ] Page reloads successfully
- [ ] User remains authenticated (no redirect to login)
- [ ] Token persists in localStorage
- [ ] Application state restored

### 6. API Requests with Valid Token

**Steps:**
1. After successful login, perform actions that trigger API calls:
   - Create a project
   - Upload files
   - Any API interaction

**Expected:**
- [ ] API requests succeed (status 200 or appropriate)
- [ ] Token is included in request headers (`x-auth-token`)
- [ ] No 401 Unauthorized errors
- [ ] Application functionality works normally

### 7. Logout Functionality

**Steps:**
1. After successful login, click the logout button (if implemented)
2. Or manually clear localStorage: `localStorage.removeItem('authToken')`
3. Try to navigate to a protected page

**Expected:**
- [ ] Token is removed from localStorage
- [ ] User is redirected to login page
- [ ] Cannot access protected pages without logging in again

### 8. API Requests Without Token

**Steps:**
1. Logout or clear token from localStorage
2. Using browser DevTools or Postman, make an API request to a protected endpoint without token:
   ```bash
   curl http://localhost:3001/api/projects
   ```

**Expected:**
- [ ] API returns 401 Unauthorized status
- [ ] Error message: "No authentication token provided" or similar
- [ ] Request is rejected

### 9. API Requests With Invalid Token

**Steps:**
1. Using browser DevTools or Postman, make an API request with wrong token:
   ```bash
   curl -H "x-auth-token: invalid-token" http://localhost:3001/api/projects
   ```

**Expected:**
- [ ] API returns 401 Unauthorized status
- [ ] Error message: "Invalid authentication token" or similar
- [ ] Request is rejected

### 10. Authentication Disabled

**Steps:**
1. Stop backend server
2. Set `AUTH_ENABLED=false` in backend `.env`
3. Restart backend server
4. Clear browser localStorage
5. Navigate to `http://localhost:5173`

**Expected:**
- [ ] User can access application without login
- [ ] No redirect to login page
- [ ] API requests work without token
- [ ] Application functions normally

### 11. Token Validation on Login Endpoint

**Steps:**
1. Ensure `AUTH_ENABLED=true`
2. Test login endpoint directly:
   ```bash
   # Valid password
   curl -X POST http://localhost:3001/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"password":"test-password"}'

   # Invalid password
   curl -X POST http://localhost:3001/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"password":"wrong"}'
   ```

**Expected:**
- [ ] Valid password returns 200 with token
- [ ] Invalid password returns 401 with error message
- [ ] Missing password returns 400 with validation error

### 12. Browser Session Persistence

**Steps:**
1. Login successfully
2. Close browser tab (not entire browser)
3. Open new tab and navigate to `http://localhost:5173`

**Expected:**
- [ ] User is still authenticated
- [ ] No redirect to login page
- [ ] Token persists in localStorage across tabs

### 13. Multiple Browser Tabs

**Steps:**
1. Login in first tab
2. Open second tab to `http://localhost:5173`
3. Logout from first tab
4. Try to access protected page in second tab

**Expected:**
- [ ] Second tab initially shows authenticated state
- [ ] After logout in first tab, second tab may need refresh to see logout
- [ ] After refresh, second tab redirects to login

### 14. Password Input Security

**Steps:**
1. On login page, observe password input field

**Expected:**
- [ ] Password field has `type="password"` (characters hidden)
- [ ] Password is not visible in browser DevTools Network tab
- [ ] Password is sent over HTTPS (in production)

### 15. Token Storage Security

**Steps:**
1. Login successfully
2. Open browser DevTools -> Application -> Local Storage
3. Inspect stored token

**Expected:**
- [ ] Token is stored under key `authToken`
- [ ] Token value is visible (expected for simple auth)
- [ ] No sensitive data besides token stored

## Browser Compatibility Testing

Test in the following browsers:
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)

## Performance Testing

**Steps:**
1. Login and logout multiple times quickly
2. Refresh page rapidly while authenticated
3. Make multiple API calls in quick succession

**Expected:**
- [ ] No race conditions or authentication errors
- [ ] Consistent authentication state
- [ ] No performance degradation

## Edge Cases

### Empty Password
**Steps:** Try to login with empty password

**Expected:**
- [ ] Validation error displayed
- [ ] Login button disabled or validation prevents submission

### Whitespace in Password
**Steps:** Try password with leading/trailing spaces

**Expected:**
- [ ] Password validated as-is (no trimming)
- [ ] Fails if spaces not in actual password

### Special Characters in Password
**Steps:** Set password with special characters and test

**Expected:**
- [ ] Special characters handled correctly
- [ ] Login succeeds with exact match

### Very Long Password
**Steps:** Try extremely long password string

**Expected:**
- [ ] System handles gracefully
- [ ] No crashes or errors

## Integration Testing

### WebSocket Connection
**Steps:**
1. Login successfully
2. Trigger workflow that uses WebSocket
3. Monitor WebSocket connection

**Expected:**
- [ ] WebSocket connects successfully
- [ ] Real-time updates work
- [ ] No authentication errors

### File Upload
**Steps:**
1. Login successfully
2. Upload files through the application

**Expected:**
- [ ] File upload succeeds
- [ ] Token included in multipart form requests
- [ ] No authentication errors

## Notes

- Document any issues found during testing
- Include screenshots for visual bugs
- Note any unexpected behavior
- Record steps to reproduce any problems

## Test Results

**Tester:** _______________
**Date:** _______________
**Overall Result:** PASS / FAIL / PARTIAL

**Issues Found:**
1.
2.
3.

**Recommendations:**
1.
2.
3.
