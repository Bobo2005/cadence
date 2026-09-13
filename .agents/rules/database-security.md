# SQL & Database Security Policy

## Core Directives

- **Always use an ORM or Parameterized Queries**:
    - Use established ORMs/ODMs (Prisma, Drizzle, SQLAlchemy, Mongoose, TypeORM) or parameterized statements (`$1, $2` / `?`).
    - **NEVER** construct queries via string concatenation or template literal interpolation with user data:
      ```typescript
      // ❌ INSECURE - Vulnerable to SQL Injection
      const query = `SELECT * FROM users WHERE email = '${req.body.email}'`;

      // ✅ SECURE - Parameterized query
      const user = await db.query("SELECT * FROM users WHERE email = $1", [req.body.email]);
      ```
- **Principle of Least Privilege**:
    - Ensure database connection credentials grant only the permissions necessary for the specific service (e.g. `SELECT`, `INSERT`, `UPDATE` instead of `SUPERUSER`, `DROP`, `GRANT`).
    - Separate read-only reporting/analytic roles from write roles.
- **Sanitize and Validate All Fields Before Any DB Write**:
    - Validate data types, string lengths, numerical ranges, regex constraints, and enum values using schema validators (e.g. Zod, Pydantic) before passing data to the persistence layer.
    - Sanitize text fields to strip control characters and unwanted markup.
- **Mask Raw Database and Persistence Errors**:
    - **NEVER** return raw database errors, schema definitions, or SQL statements in API responses. Raw errors disclose table structures, column names, database drivers, and file paths to attackers.
    - Catch all database errors, log details server-side with unique request/correlation IDs, and return generic client-safe HTTP errors (e.g., `400 Bad Request` or `500 Internal Server Error`).
