-- Adds update_portal_password RPC so PortalSettings can change passwords
-- with current-password verification on the client side first.
-- This is a thin wrapper around the existing set_portal_password function.
create or replace function update_portal_password(
  p_client_id uuid,
  p_new_password text
) returns void
language plpgsql
security definer
as $$
begin
  perform set_portal_password(p_client_id, p_new_password);
end;
$$;
