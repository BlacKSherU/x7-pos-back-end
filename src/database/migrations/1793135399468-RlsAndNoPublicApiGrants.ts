import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Cierra el esquema public a la API REST de Supabase (PostgREST).
 *
 * El backend se conecta directo a Postgres como dueño de las tablas (en Supabase, postgres
 * con BYPASSRLS), así que nada de esto le afecta. Los roles anon y authenticated de la API
 * pública, en cambio, tenían todos los permisos sobre todas las tablas: con la URL del
 * proyecto y la clave anon cualquiera podía leer, editar o borrar las tablas sin RLS.
 *
 * - Activa RLS, sin políticas, en todas las tablas de public (incluida migrations): para
 *   anon y authenticated eso es denegar todo.
 * - Si existen anon y authenticated (solo en Supabase; la base e2e no los tiene), les quita
 *   los permisos sobre tablas, secuencias y funciones de public, también los que recibirían
 *   por defecto los objetos que cree en el futuro el rol que corre las migraciones.
 *
 * Las tablas que creen migraciones posteriores no reciben RLS solas: cada migración que
 * crea una tabla debe incluir su ALTER TABLE ... ENABLE ROW LEVEL SECURITY
 * (test/e2e/schema.e2e-spec.ts falla si falta).
 *
 * down(): no hace nada a propósito; deshacerla volvería a abrir la base a la API pública.
 */
export class RlsAndNoPublicApiGrants1793135399468 implements MigrationInterface {
  name = 'RlsAndNoPublicApiGrants1793135399468';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            DO $$
            DECLARE
                t record;
            BEGIN
                FOR t IN
                    SELECT c.relname
                    FROM pg_class c
                    JOIN pg_namespace n ON n.oid = c.relnamespace
                    WHERE n.nspname = 'public'
                      AND c.relkind IN ('r', 'p')
                      AND NOT c.relrowsecurity
                LOOP
                    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t.relname);
                END LOOP;
            END
            $$
        `);
    await queryRunner.query(`
            DO $$
            DECLARE
                r text;
            BEGIN
                FOREACH r IN ARRAY ARRAY['anon', 'authenticated'] LOOP
                    CONTINUE WHEN NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = r);
                    EXECUTE format('REVOKE ALL ON ALL TABLES IN SCHEMA public FROM %I', r);
                    EXECUTE format('REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM %I', r);
                    EXECUTE format('REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM %I', r);
                    EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM %I', r);
                    EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM %I', r);
                    EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM %I', r);
                END LOOP;
            END
            $$
        `);
  }

  public async down(): Promise<void> {
    // Intencionalmente vacío: ver el comentario de la clase.
  }
}
