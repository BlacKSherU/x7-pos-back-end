-- Super admin: company + merchant + user
-- Rol: portal_admin | Scope: admin_portal (valores del enum en src/users/constants/)
-- Contraseña por defecto: Admin123!  (hash bcrypt rounds=10; genera otro con: node -e "require('bcrypt').hash('TU_CLAVE',10).then(console.log)")
-- Ejecutar una sola vez (merchant.name y users.email son únicos).

BEGIN;

WITH new_company AS (
  INSERT INTO company (name, email, phone, rut, address, city, state, country)
  VALUES (
    'Admin Company',
    'admin.company@local.dev',
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL
  )
  RETURNING id AS company_id
),
new_merchant AS (
  INSERT INTO merchant (name, email, phone, rut, address, city, state, country, "companyId")
  SELECT
    'Admin Merchant',
    'admin.merchant@local.dev',
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    new_company.company_id
  FROM new_company
  RETURNING id AS merchant_id
)
INSERT INTO users (username, email, password, role, scope, "merchantId", "resetToken", "refreshToken")
SELECT
  'superadmin',
  'superadmin@admin.local',
  '$2b$10$a3JEkBG0tEMsDbQRz.IdvOvJZjbiDCjVOSQWzf6bMxmQO6ft5p1cC',
  'portal_admin',
  'admin_portal',
  new_merchant.merchant_id,
  NULL,
  NULL
FROM new_merchant;

COMMIT;
