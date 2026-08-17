-- ISO/JCI hardening: indicator definition and measurement governance.
-- Governance metadata remains inside settings/data JSON to preserve the simple indicator UI.
begin;

create or replace function public.validate_indicator_settings_governance()
returns trigger
language plpgsql
security invoker
set search_path=public
as $$
declare
  threshold_text text;
begin
  if jsonb_typeof(coalesce(new.settings,'{}'::jsonb)) <> 'object' then
    raise exception 'Indicator settings must be a JSON object.';
  end if;

  if new.settings ? 'governanceVersion'
     and nullif(btrim(coalesce(new.settings->>'governanceVersion','')),'') is null then
    raise exception 'Indicator definition version cannot be blank.';
  end if;

  threshold_text := nullif(btrim(coalesce(new.settings->>'warningThreshold','')),'');
  if threshold_text is not null and threshold_text !~ '^-?[0-9]+([.,][0-9]+)?$' then
    raise exception 'Indicator warning threshold must be numeric.';
  end if;

  return new;
end
$$;

drop trigger if exists indicator_settings_governance_guard on public.indicator_settings;
create trigger indicator_settings_governance_guard
before insert or update of settings
on public.indicator_settings
for each row execute function public.validate_indicator_settings_governance();

create or replace function public.validate_custom_indicator_governance()
returns trigger
language plpgsql
security invoker
set search_path=public
as $$
begin
  if nullif(btrim(coalesce(new.data->>'name','')),'') is null then
    raise exception 'Custom indicator requires a name.';
  end if;
  if new.data ? 'governanceVersion'
     and nullif(btrim(coalesce(new.data->>'governanceVersion','')),'') is null then
    raise exception 'Indicator definition version cannot be blank.';
  end if;
  return new;
end
$$;

drop trigger if exists custom_indicator_governance_guard on public.custom_indicators;
create trigger custom_indicator_governance_guard
before insert or update of data
on public.custom_indicators
for each row execute function public.validate_custom_indicator_governance();

commit;
