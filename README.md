# PayVault Service API 🔒

## Overview
This is a robust and secure backend wallet service built with TypeScript, Node.js, and the NestJS framework, leveraging Prisma ORM for database interactions. It integrates Google OAuth for user authentication, Paystack for seamless payment processing, and supports API key management for secure service-to-service communication.

## Features
- **User Authentication**: Secure user login via Google OAuth.
- **Wallet Management**: Users can manage their digital wallets, including balance inquiries.
- **Fund Deposits**: Seamless integration with Paystack for secure fund deposits into user wallets.
- **Internal Transfers**: Capability to transfer funds between internal PayVault wallets using unique wallet numbers.
- **Transaction History**: Comprehensive logging and retrieval of all wallet transactions (deposits, transfers).
- **API Key Management**: Generate and manage API keys with granular permissions and controlled expiry for external service integrations.
- **Rate Limiting**: Built-in API rate limiting for enhanced security and stability.
- **Global Validation & Exception Handling**: Centralized DTO validation and error handling across the application.

## Getting Started
### Installation
To set up and run this project locally, follow these steps:

1.  **Clone the Repository**:
    ```bash
    git clone https://github.com/Aghaulor-Gift/wallet_service_with_Paystack_JWT_-_API-Keys.git
    cd wallet_service_with_Paystack_JWT_-_API-Keys
    ```

2.  **Install Dependencies**:
    ```bash
    npm install
    ```

3.  **Set up Database**:
    Ensure you have a PostgreSQL database instance running. This project uses Prisma for ORM.
    
    Apply database migrations:
    ```bash
    npm run prisma:migrate
    ```

    Generate Prisma client:
    ```bash
    npm run prisma:generate
    ```

4.  **Start the Application in Development Mode**:
    ```bash
    npm run start:dev
    ```
    The application will be accessible at `http://localhost:3000` (or your specified `PORT`).

### Environment Variables
The following environment variables are required to run the application:

| Variable                  | Description                                            | Example Value                                  |
| :------------------------ | :----------------------------------------------------- | :--------------------------------------------- |
| `DATABASE_URL`            | Connection string for the PostgreSQL database.         | `postgresql://user:password@host:port/database` |
| `GOOGLE_CLIENT_ID`        | Google OAuth Client ID for authentication.             | `your-google-client-id.apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET`    | Google OAuth Client Secret.                            | `YOUR_GOOGLE_CLIENT_SECRET`                    |
| `GOOGLE_REDIRECT_URI`     | Redirect URI configured in Google Cloud Console.       | `http://localhost:3000/auth/google/callback`   |
| `JWT_SECRET`              | Secret key for signing JWT tokens.                     | `supersecretjwtkey`                            |
| `JWT_EXPIRY`              | JWT token expiry duration (e.g., '1d', '1h', '30m').   | `1d`                                           |
| `PAYSTACK_SECRET_KEY`     | Your Paystack Secret Key for API calls.                | `sk_test_xxxxxxxxxxxxxxxxxxxxxxxxxx`           |
| `PAYSTACK_PUBLIC_KEY`     | Your Paystack Public Key (for frontend use, but often included in backend config). | `pk_test_xxxxxxxxxxxxxxxxxxxxxxxxxx`           |
| `PORT`                    | Port number for the application to listen on.          | `3000`                                         |

## API Documentation
### Base URL
`http://localhost:3000` (or your configured `PORT`)

### Endpoints
#### GET /health
**Overview**: Checks the health status of the API.
**Access**: Public

**Request**:
None

**Response**:
```json
{
  "status": "ok"
}
```

**Errors**:
- `500 Internal Server Error`: Server encountered an unexpected condition.

#### GET /auth/google
**Overview**: Initiates the Google OAuth authentication flow, redirecting the user to Google's login page.
**Access**: Public

**Request**:
None

**Response**:
`302 Redirect` to Google's OAuth consent screen.

**Errors**:
- `500 Internal Server Error`: Google OAuth URL generation failed due to missing configuration.

#### GET /auth/google/callback
**Overview**: Handles the callback from Google OAuth after user authentication. Exchanges the authorization code for tokens, upserts user data, and issues a JWT for the application.
**Access**: Public

**Request**:
**Query Parameters**:
- `code`: `string` - The authorization code provided by Google.

**Response**:
```json
{
  "user": {
    "id": "clt9t6z4w000000a0t6r2e8d3",
    "email": "user@example.com",
    "name": "Test User",
    "googleId": "100000000000000000000",
    "createdAt": "2023-10-27T08:00:00.000Z",
    "updatedAt": "2023-10-27T08:00:00.000Z"
  },
  "token": "google token"
}
```

**Errors**:
- `400 Bad Request`: Missing Google authorization `code`.
- `401 Unauthorized`: Failed to exchange Google OAuth token.
- `500 Internal Server Error`: An unexpected error occurred during the callback process.

#### POST /keys/create
**Overview**: Creates a new API key for the authenticated user with specified permissions and expiry.
**Access**: Authenticated (JWT or API Key)

**Request**:
```json
{
  "name": "My Payment Service Key",
  "permissions": ["deposit", "transfer", "read"],
  "expiry": "1D"
}
```
**Required Fields**: `name`, `permissions`, `expiry`

**Response**:
```json
{
  "api_key": "sk_live_ggjjhhjh",
  "expires_at": "2023-10-28T08:00:00.000Z"
}
```

**Errors**:
- `401 Unauthorized`: Missing or invalid authentication token.
- `403 Forbidden`: Maximum of 5 active API keys reached.
- `400 Bad Request`: Validation errors (e.g., invalid `permissions` values, invalid `expiry` format).

#### POST /keys/rollover
**Overview**: Generates a new API key based on an existing *expired* API key's details, essentially "rolling over" its configuration. The old key must be genuinely expired.
**Access**: Authenticated (JWT or API Key)

**Request**:
```json
{
  "expired_key_id": "clt9t6z4w000000a0t6r2e8d3",
  "expiry": "1M"
}
```
**Required Fields**: `expired_key_id`, `expiry`

**Response**:
```json
{
  "api_key": "sk_live_new_2gojihugtydrf4a5",
  "expires_at": "2023-11-27T08:00:00.000Z"
}
```

**Errors**:
- `401 Unauthorized`: Missing or invalid authentication token.
- `404 Not Found`: API key with `expired_key_id` not found for the user.
- `403 Forbidden`: The specified key is not yet expired.
- `400 Bad Request`: Validation errors (e.g., invalid `expiry` format).

#### POST /wallet/deposit
**Overview**: Initiates a fund deposit into the authenticated user's wallet via Paystack. Returns a Paystack authorization URL for payment completion.
**Access**: Authenticated (JWT or API Key with `DEPOSIT` permission)

**Request**:
```json
{
  "amount": 5000
}
```
**Required Fields**: `amount` (amount in Kobo, e.g., 5000 for NGN 50)

**Response**:
```json
{
  "reference": "T12345678909876",
  "authorization_url": "https://checkout.paystack.com/abcdef123456"
}
```

**Errors**:
- `401 Unauthorized`: Missing or invalid authentication token.
- `403 Forbidden`: Missing required API key permission (`DEPOSIT`).
- `400 Bad Request`: Amount must be greater than zero, or Paystack rejected the transaction request.
- `404 Not Found`: User not found.
- `502 Bad Gateway`: Request to Paystack timed out.
- `503 Service Unavailable`: Unable to reach Paystack (DNS error), or Paystack servers are currently unavailable.
- `500 Internal Server Error`: Paystack returned incomplete transaction data.

#### POST /wallet/paystack/webhook
**Overview**: Endpoint for Paystack to send webhook notifications regarding transaction status (e.g., `charge.success`, `charge.failed`). Validates the webhook signature.
**Access**: Public (Paystack service-to-service call; secured by `x-paystack-signature` header)

**Request**:
**Body**: Paystack webhook payload (e.g., a `charge.success` event)
```json
{
  "event": "charge.success",
  "data": {
    "reference": "T12345678909876",
    "amount": 5000,
    "status": "success",
    "paid_at": "2023-10-27T10:30:00.000Z",
    "customer": {
      "email": "user@example.com"
    }
    // ... other Paystack data
  }
}
```
**Headers**:
- `x-paystack-signature`: `string` - HMAC SHA512 signature computed with the Paystack Secret Key.

**Response**:
```json
{
  "status": true
}
```
Or, if event is ignored or already processed:
```json
{
  "received": true,
  "message": "Already processed"
}
```
Or, after processing:
```json
{
  "received": true,
  "status": "SUCCESS"
}
```

**Errors**:
- `401 Unauthorized`: Missing or invalid Paystack signature.
- `400 Bad Request`: Missing `reference` in webhook payload, or amount mismatch.
- `404 Not Found`: Transaction or wallet not found.

#### POST /wallet/transfer
**Overview**: Transfers funds from the authenticated user's wallet to another internal PayVault wallet.
**Access**: Authenticated (JWT or API Key with `TRANSFER` permission)

**Request**:
```json
{
  "wallet_number": "4123456789012",
  "amount": 3000
}
```
**Required Fields**: `wallet_number`, `amount` (amount in Kobo)

**Response**:
```json
{
  "status": "success",
  "message": "Transfer completed"
}
```

**Errors**:
- `401 Unauthorized`: Missing or invalid authentication token.
- `403 Forbidden`: Missing required API key permission (`TRANSFER`).
- `400 Bad Request`: Amount must be positive, or insufficient balance in sender's wallet.
- `404 Not Found`: Sender wallet not found, or recipient wallet not found.

#### GET /wallet/balance
**Overview**: Retrieves the current balance of the authenticated user's wallet.
**Access**: Authenticated (JWT or API Key with `READ` permission)

**Request**:
None

**Response**:
```json
{
  "balance": 15000
}
```
(Balance in Kobo)

**Errors**:
- `401 Unauthorized`: Missing or invalid authentication token.
- `403 Forbidden`: Missing required API key permission (`READ`).
- `404 Not Found`: User's wallet not found (though a wallet is typically created on first access).

#### GET /wallet/transactions
**Overview**: Retrieves a list of recent transactions for the authenticated user's wallet.
**Access**: Authenticated (JWT or API Key with `READ` permission)

**Request**:
None

**Response**:
```json
[
  {
    "type": "deposit",
    "amount": 5000,
    "status": "success"
  },
  {
    "type": "transfer",
    "amount": 2000,
    "status": "success"
  },
  {
    "type": "deposit",
    "amount": 10000,
    "status": "pending"
  }
]
```

**Errors**:
- `401 Unauthorized`: Missing or invalid authentication token.
- `403 Forbidden`: Missing required API key permission (`READ`).

## Technologies Used
| Technology       | Description                                  |
| :--------------- | :------------------------------------------- |
| **Node.js**      | JavaScript runtime environment               |
| **TypeScript**   | Statically typed superset of JavaScript      |
| **NestJS**       | Progressive Node.js framework                |
| **Prisma**       | Next-generation ORM for Node.js & TypeScript |
| **PostgreSQL**   | Robust open-source relational database       |
| **JWT**          | JSON Web Tokens for secure authentication    |
| **Passport.js**  | Authentication middleware for Node.js        |
| **Paystack**     | Payment gateway for deposits                 |
| **Swagger**      | API documentation                           |
| **Class-validator**| Validation decorators                       |
| **Axios**        | Promise-based HTTP client                    |

## Contributing
We welcome contributions to the PayVault Service! To contribute, please follow these steps:

1.  Fork the repository.
2.  Create a new branch for your feature or bug fix (`git checkout -b feature/your-feature-name`).
3.  Implement your changes and ensure all tests pass.
4.  Commit your changes (`git commit -m 'feat: Add new feature'`).
5.  Push to your fork (`git push origin feature/your-feature-name`).
6.  Open a pull request to the `main` branch of this repository.

Please ensure your code adheres to the project's coding standards and includes appropriate tests.

## License
This project is licensed under the [MIT License](https://opensource.org/licenses/MIT).

## Author Info
**Gift Aghaulor**
- LinkedIn: [https://linkedin.com/in/aghaulor-gift](https://www.linkedin.com/in/aghaulor-gift)
- Twitter: [https://twitter.com/your_twitter_handle](https://twitter.com/your_twitter_handle)
- Portfolio: [https://your-portfolio.com](https://your-portfolio.com)

---
[![NestJS](https://img.shields.io/badge/NestJS-black?style=for-the-badge&logo=nestjs&logoColor=white)](https://nestjs.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Prisma](https://img.shields.io/badge/Prisma-3982CE?style=for-the-badge&logo=prisma&logoColor=white)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![MIT License](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)

[![Readme was generated by Dokugen](https://img.shields.io/badge/Readme%20was%20generated%20by-Dokugen-brightgreen)](https://www.npmjs.com/package/dokugen)