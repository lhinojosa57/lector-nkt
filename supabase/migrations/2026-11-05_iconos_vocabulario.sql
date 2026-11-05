-- Íconos (emoji) para las palabras clave de las 6 lecturas existentes.
-- Agrega el campo "icon" a cada palabra del vocabulario, conservando el orden.

with iconos(palabra, icon) as (
  values
    ('homínido', '🧍'), ('digerir', '🍽️'), ('antepasado', '👴'), ('fogata', '🔥'),
    ('mandarín', '🏮'), ('carácter', '🀄'), ('lengua materna', '🤱'), ('hablante', '🗣️'),
    ('renovable', '☀️'), ('industrial', '🏭'), ('medio ambiente', '🌿'), ('centígrado', '🌡️'),
    ('innovación', '💡'), ('creatividad', '🎨'), ('penicilina', '🧫'), ('cobertizo', '🛖'),
    ('castellano', '🏰'), ('hispanohablante', '🌎'), ('latín', '🏛️'), ('novela', '📖'),
    ('consentimiento', '✍️'), ('antibiótico', '💊'), ('ética', '⚖️'), ('alternativo', '🔀')
),
nuevo as (
  select v.id,
         jsonb_agg(
           case when i.icon is not null then x.item || jsonb_build_object('icon', i.icon) else x.item end
           order by x.pos
         ) as vocab
  from public.lec_versions v
  cross join lateral jsonb_array_elements(v.vocabulary) with ordinality as x(item, pos)
  left join iconos i on i.palabra = x.item->>'word'
  where jsonb_array_length(v.vocabulary) > 0
  group by v.id
)
update public.lec_versions v
set vocabulary = n.vocab
from nuevo n
where n.id = v.id;

-- Verificación: debe dar 24 palabras con ícono.
select count(*) as con_icono
from public.lec_versions v
cross join jsonb_array_elements(v.vocabulary) x
where x ? 'icon';
