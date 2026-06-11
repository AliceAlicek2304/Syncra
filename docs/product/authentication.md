# Syncra Authentication

Syncra uses JSON Web Token (JWT) based authentication for securing API communication.

## Endpoints

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/v1/auth/register` | Register a new user |
| POST | `/api/v1/auth/login` | Authenticate credentials and return tokens |
| POST | `/api/v1/auth/refresh` | Obtain a new access token using a refresh token |
| GET | `/api/v1/auth/me` | Fetch detailed information of the logged-in user |

## Token Flow

1. **Login/Register**:
   The user sends credentials (`email`, `password`) to `/auth/login`. On success, the backend returns:
   - `accessToken`: JWT token (typically short-lived, e.g., 60 minutes).
   - `refreshToken`: Cryptographically secure token used to fetch a new access token (typically 7 days).
   - `expiresAtUtc`: Expiration timestamp of the access token.

2. **Storage**:
   The frontend client stores both tokens in local storage (`localStorage` or cookie).

3. **Authorized API Calls**:
   Every authorized API call must supply the header:
   ```http
   Authorization: Bearer <accessToken>
   ```

4. **Token Expiration & Interceptor**:
   - If an API request returns `401 Unauthorized`, the frontend Axios interceptor intercepts the failure.
   - It suspends outgoing requests and calls `/api/v1/auth/refresh` with the saved `refreshToken`.
   - On refresh success, the client updates the stored tokens, retries all queued requests with the new `accessToken`, and continues normal operation.
   - On refresh failure (e.g. refresh token expired or revoked), the client clears all tokens and redirects the user to the login screen.
