-- ISO/JCI hardening: controlled-document lifecycle, approval evidence and approved-version locking.
begin;

create or replace function public.validate_controlled_document_governance()
returns trigger language plpgsql set search_path=public as $$
declare old_snapshot jsonb;
begin
  if new.status not in ('Πρόχειρο','Προς έγκριση','Σε ισχύ','Προς αναθεώρηση','Καταργημένο') then
    raise exception 'Invalid controlled-document lifecycle state.';
  end if;

  if new.status in ('Προς έγκριση','Σε ισχύ') and jsonb_array_length(coalesce(new.attachments,'[]'::jsonb))=0 then
    raise exception 'Controlled document requires an attachment before review/approval.';
  end if;

  if new.status='Σε ισχύ' and (
    nullif(btrim(new.data->>'approvedBy'),'') is null or
    nullif(btrim(new.data->>'approvedAt'),'') is null or
    nullif(btrim(new.data->>'effectiveDate'),'') is null
  ) then raise exception 'In-force controlled document requires approval evidence.'; end if;

  -- An approved version cannot be silently overwritten. Content changes require a new
  -- version and preservation of the former approved version in the immutable history snapshot.
  if tg_op='UPDATE' and old.status='Σε ισχύ' and new.status<>'Καταργημένο' then
    if new.version=old.version and (
      new.title is distinct from old.title or new.code is distinct from old.code or
      new.category is distinct from old.category or new.owner is distinct from old.owner or
      new.attachments is distinct from old.attachments or new.data->>'description' is distinct from old.data->>'description'
    ) then raise exception 'Approved controlled-document version is locked. Create a new version.'; end if;

    if new.version is distinct from old.version then
      select x into old_snapshot from jsonb_array_elements(coalesce(new.versions,'[]'::jsonb)) x
       where x->>'version'=old.version limit 1;
      if old_snapshot is null then raise exception 'Previous approved version must be preserved before revision.'; end if;
      if new.status<>'Πρόχειρο' then raise exception 'A new controlled-document version must start as Draft.'; end if;
    end if;
  end if;
  return new;
end $$;

drop trigger if exists controlled_document_governance_guard on public.controlled_documents;
create trigger controlled_document_governance_guard
before insert or update on public.controlled_documents
for each row execute function public.validate_controlled_document_governance();

create or replace function public.prevent_non_draft_document_delete()
returns trigger language plpgsql set search_path=public as $$
begin
  if old.status<>'Πρόχειρο' then raise exception 'Only draft controlled documents can be deleted.'; end if;
  return old;
end $$;

drop trigger if exists controlled_document_delete_guard on public.controlled_documents;
create trigger controlled_document_delete_guard before delete on public.controlled_documents
for each row execute function public.prevent_non_draft_document_delete();

commit;
