-- Opciones de respuesta de longitud pareja (la correcta ya no es la más larga).
-- Solo cambia el texto de cada opción; la letra correcta y las explicaciones se conservan.
with nuevas(titulo, pos, opcion, texto) as (
  values
    ('El fuego que lo cambió todo', 0, 'a', 'Hace aproximadamente diez mil años'),
    ('El fuego que lo cambió todo', 0, 'b', 'Hace aproximadamente un millón de años'),
    ('El fuego que lo cambió todo', 0, 'c', 'Hace aproximadamente doscientos mil años'),
    ('El fuego que lo cambió todo', 0, 'd', 'Hace aproximadamente cinco millones de años'),
    ('El fuego que lo cambió todo', 1, 'a', 'Porque el calor del fuego estimulaba directamente el crecimiento del cerebro'),
    ('El fuego que lo cambió todo', 1, 'b', 'Porque la comida cocida daba más energía, y eso ayudó a crecer al cerebro'),
    ('El fuego que lo cambió todo', 1, 'c', 'Porque al cocinar los humanos aprendieron a medir, mezclar y observar cambios'),
    ('El fuego que lo cambió todo', 1, 'd', 'Porque cocinar exigía tanta concentración que entrenaba la memoria'),
    ('El fuego que lo cambió todo', 2, 'a', 'Que alrededor del fuego los humanos aprendían a contar y a hacer cuentas'),
    ('El fuego que lo cambió todo', 2, 'b', 'Que el fuego era peligroso y todos debían aprender las reglas para usarlo'),
    ('El fuego que lo cambió todo', 2, 'c', 'Que alrededor del fuego se compartían historias y conocimientos'),
    ('El fuego que lo cambió todo', 2, 'd', 'Que el fuego sustituyó a los mayores como guías de la comunidad'),
    ('El fuego que lo cambió todo', 3, 'a', 'El fuego es peligroso y los primeros humanos aprendieron a respetarlo'),
    ('El fuego que lo cambió todo', 3, 'b', 'El fuego transformó tanto el cuerpo como la vida social de los humanos'),
    ('El fuego que lo cambió todo', 3, 'c', 'Nadie sabe con certeza cómo se descubrió el fuego hace un millón de años'),
    ('El fuego que lo cambió todo', 3, 'd', 'Cocinar los alimentos es más saludable que comerlos crudos, como antes'),
    ('El idioma que hablan más personas en el mundo', 1, 'a', 'Porque los demás caracteres solo aparecen en textos antiguos y ya no se enseñan'),
    ('El idioma que hablan más personas en el mundo', 1, 'b', 'Porque los periódicos chinos usan una versión simplificada hecha solo para ellos'),
    ('El idioma que hablan más personas en el mundo', 1, 'c', 'Porque las palabras de uso diario se forman con un grupo reducido de caracteres'),
    ('El idioma que hablan más personas en el mundo', 1, 'd', 'Porque el gobierno chino prohibió usar los demás caracteres en la prensa escrita'),
    ('El idioma que hablan más personas en el mundo', 2, 'a', 'El chino es casi imposible de aprender porque tiene demasiados caracteres'),
    ('El idioma que hablan más personas en el mundo', 2, 'b', 'El mandarín destaca por sus muchos hablantes, su escritura y su larga historia'),
    ('El idioma que hablan más personas en el mundo', 2, 'c', 'La ONU debería declarar el chino como el idioma universal de todo el planeta'),
    ('El idioma que hablan más personas en el mundo', 2, 'd', 'El español y el chino son los dos idiomas más importantes y antiguos del mundo'),
    ('El planeta que nos presta su casa', 0, 'a', 'En 1972 en Estocolmo, Suecia'),
    ('El planeta que nos presta su casa', 0, 'b', 'En 1970 en Estados Unidos'),
    ('El planeta que nos presta su casa', 0, 'c', 'En 1992 en Río de Janeiro, Brasil'),
    ('El planeta que nos presta su casa', 0, 'd', 'En 2002 en la sede de la ONU'),
    ('El planeta que nos presta su casa', 1, 'a', 'Que los humanos somos prisioneros del planeta y no podemos salir de él'),
    ('El planeta que nos presta su casa', 1, 'b', 'Que dependemos de la Tierra para vivir, y no ella de nosotros'),
    ('El planeta que nos presta su casa', 1, 'c', 'Que la Tierra tiene vida propia y puede defenderse de los humanos'),
    ('El planeta que nos presta su casa', 1, 'd', 'Que todo lo que hay en la Tierra es propiedad de los gobiernos'),
    ('El planeta que nos presta su casa', 2, 'a', 'El cambio climático ya es un problema sin solución y no podemos hacer nada al respecto'),
    ('El planeta que nos presta su casa', 2, 'b', 'El Día de la Tierra es una celebración importante, pero en realidad casi no cambia nada'),
    ('El planeta que nos presta su casa', 2, 'c', 'Debemos cuidar el planeta del que dependemos, y aún hay motivos de esperanza'),
    ('El planeta que nos presta su casa', 2, 'd', 'Solo los jóvenes que exigen un futuro diferente pueden salvar al planeta'),
    ('La habilidad que los robots no pueden copiar', 0, 'a', 'El Día Mundial de la Ciencia y la Tecnología'),
    ('La habilidad que los robots no pueden copiar', 0, 'b', 'El Día Mundial de la Creatividad y la Innovación'),
    ('La habilidad que los robots no pueden copiar', 0, 'c', 'El Día Mundial de la Educación y la Cultura'),
    ('La habilidad que los robots no pueden copiar', 0, 'd', 'El Día Mundial del Pensamiento Crítico y la Ciencia'),
    ('La habilidad que los robots no pueden copiar', 1, 'a', 'Los tres trabajaron juntos en el mismo laboratorio europeo'),
    ('La habilidad que los robots no pueden copiar', 1, 'b', 'Los tres ganaron el Premio Nobel por el mismo descubrimiento'),
    ('La habilidad que los robots no pueden copiar', 1, 'c', 'Sus descubrimientos surgieron en momentos inesperados'),
    ('La habilidad que los robots no pueden copiar', 1, 'd', 'Los tres estudiaron en universidades famosas de Europa'),
    ('La habilidad que los robots no pueden copiar', 2, 'a', 'Los robots no pueden ser creativos porque no tienen un cerebro humano'),
    ('La habilidad que los robots no pueden copiar', 2, 'b', 'La creatividad es un talento innato: o se nace con ella o nunca se llega a tener'),
    ('La habilidad que los robots no pueden copiar', 2, 'c', 'La creatividad es humana y universal, y crece con curiosidad y práctica'),
    ('La habilidad que los robots no pueden copiar', 2, 'd', 'La innovación solo ocurre en laboratorios con científicos muy famosos'),
    ('La lengua que nació en un pequeño reino del norte de España', 0, 'a', 'Latín vulgar'),
    ('La lengua que nació en un pequeño reino del norte de España', 0, 'b', 'Romance'),
    ('La lengua que nació en un pequeño reino del norte de España', 0, 'c', 'Castellano'),
    ('La lengua que nació en un pequeño reino del norte de España', 0, 'd', 'Hispánico'),
    ('La lengua que nació en un pequeño reino del norte de España', 1, 'a', 'Porque ese día nació Miguel de Cervantes, autor del Quijote'),
    ('La lengua que nació en un pequeño reino del norte de España', 1, 'b', 'Porque ese día se publicó por primera vez Don Quijote de la Mancha'),
    ('La lengua que nació en un pequeño reino del norte de España', 1, 'c', 'Porque ese día murió Cervantes, cuya obra marcó al idioma'),
    ('La lengua que nació en un pequeño reino del norte de España', 1, 'd', 'Porque ese día España declaró el español como idioma oficial'),
    ('La lengua que nació en un pequeño reino del norte de España', 2, 'a', 'El español es superior al chino porque se habla en más países del mundo'),
    ('La lengua que nació en un pequeño reino del norte de España', 2, 'b', 'El español nació del latín y hoy es uno de los idiomas más hablados del mundo'),
    ('La lengua que nació en un pequeño reino del norte de España', 2, 'c', 'Miguel de Cervantes inventó el español moderno cuando escribió Don Quijote de la Mancha'),
    ('La lengua que nació en un pequeño reino del norte de España', 2, 'd', 'El latín fue el idioma más importante de toda la historia de la humanidad'),
    ('Los científicos que nunca firmaron un consentimiento', 1, 'a', 'Que los científicos trabajan sin firmar contratos ni recibir un sueldo'),
    ('Los científicos que nunca firmaron un consentimiento', 1, 'b', 'Que los animales participan en experimentos sin poder dar su permiso'),
    ('Los científicos que nunca firmaron un consentimiento', 1, 'c', 'Que los experimentos con animales son ilegales en la mayoría de los países'),
    ('Los científicos que nunca firmaron un consentimiento', 1, 'd', 'Que los animales de laboratorio son mejores científicos que los humanos'),
    ('Los científicos que nunca firmaron un consentimiento', 2, 'a', 'Los experimentos con animales deben prohibirse de inmediato en todo el mundo'),
    ('Los científicos que nunca firmaron un consentimiento', 2, 'b', 'Los animales de laboratorio han salvado más vidas que todos los médicos'),
    ('Los científicos que nunca firmaron un consentimiento', 2, 'c', 'La ciencia con animales ha traído beneficios, pero exige responsabilidad ética'),
    ('Los científicos que nunca firmaron un consentimiento', 2, 'd', 'La ciencia moderna ya no necesita usar animales gracias a las nuevas tecnologías')
),
afectadas as (
  select q.id,
         jsonb_agg(
           case when n.texto is not null then o || jsonb_build_object('text', n.texto) else o end
           order by x.ord
         ) as opciones
  from public.lec_questions q
  join public.lec_versions v on v.id = q.version_id
  join public.lec_readings r on r.id = v.reading_id
  cross join lateral jsonb_array_elements(q.options) with ordinality as x(o, ord)
  left join nuevas n on n.titulo = r.title and n.pos = q.position and n.opcion = x.o->>'id'
  where exists (select 1 from nuevas n2 where n2.titulo = r.title and n2.pos = q.position)
  group by q.id
)
update public.lec_questions q
set options = a.opciones
from afectadas a
where a.id = q.id;

-- Verificación: cuántas preguntas tienen la correcta como opción más larga (debe dar 0 o casi 0).
select count(*) filter (where es_mas_larga) as correcta_mas_larga, count(*) as total
from (
  select q.id,
         length(q.options -> (select (i - 1)::int from jsonb_array_elements(q.options) with ordinality e(x, i) where x->>'id' = q.correct_option) ->> 'text')
           >= (select max(length(x->>'text')) from jsonb_array_elements(q.options) x)
         as es_mas_larga
  from public.lec_questions q
) t;

-- Ajuste final (empates detectados al verificar)
update public.lec_questions q
set options = (
  select jsonb_agg(
    case
      when r.title = 'El idioma que hablan más personas en el mundo' and q.position = 2 and o->>'id' = 'b'
        then o || jsonb_build_object('text', 'El mandarín destaca por sus hablantes, su escritura y su larga historia')
      when r.title = 'Los científicos que nunca firmaron un consentimiento' and q.position = 0 and o->>'id' = 'c'
        then o || jsonb_build_object('text', 'Entre 200 y 500 millones')
      else o
    end order by ord)
  from jsonb_array_elements(q.options) with ordinality as x(o, ord)
)
from public.lec_versions v
join public.lec_readings r on r.id = v.reading_id
where v.id = q.version_id
  and ((r.title = 'El idioma que hablan más personas en el mundo' and q.position = 2)
    or (r.title = 'Los científicos que nunca firmaron un consentimiento' and q.position = 0));
