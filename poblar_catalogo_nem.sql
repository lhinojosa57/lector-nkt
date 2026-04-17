-- ============================================================================
-- VIDEONKT - CATÁLOGO NEM COMPLETO
-- Contenidos oficiales de la Nueva Escuela Mexicana para Secundaria
-- Basado en documentación oficial SEP
-- ============================================================================

-- ============================================================================
-- LIMPIAR DATOS EXISTENTES (solo si re-ejecutas este script)
-- ============================================================================

TRUNCATE TABLE nem_aprendizajes CASCADE;
TRUNCATE TABLE nem_contenidos CASCADE;
TRUNCATE TABLE nem_campos_formativos CASCADE;

-- ============================================================================
-- PARTE 1: CAMPOS FORMATIVOS (4)
-- ============================================================================

INSERT INTO nem_campos_formativos (codigo, nombre, descripcion) VALUES
('LEN', 'Lenguajes', 'Desarrollo de habilidades comunicativas, expresión artística y comprensión de diversas formas de lenguaje'),
('SAB', 'Saberes y Pensamiento Científico', 'Desarrollo del pensamiento matemático, científico y tecnológico'),
('ETI', 'Ética, Naturaleza y Sociedades', 'Comprensión del entorno natural y social, formación ética y ciudadana'),
('HUM', 'De lo Humano y lo Comunitario', 'Desarrollo personal, social y comunitario');

-- ============================================================================
-- PARTE 2: CONTENIDOS POR MATERIA
-- ============================================================================

-- Variables para IDs de campos formativos
DO $$
DECLARE
    len_id UUID;
    sab_id UUID;
    eti_id UUID;
    hum_id UUID;
BEGIN
    SELECT id INTO len_id FROM nem_campos_formativos WHERE codigo = 'LEN';
    SELECT id INTO sab_id FROM nem_campos_formativos WHERE codigo = 'SAB';
    SELECT id INTO eti_id FROM nem_campos_formativos WHERE codigo = 'ETI';
    SELECT id INTO hum_id FROM nem_campos_formativos WHERE codigo = 'HUM';

-- ============================================================================
-- LENGUAJES → ESPAÑOL
-- ============================================================================

INSERT INTO nem_contenidos (campo_formativo_id, materia, codigo, nombre, orden) VALUES
(len_id, 'Español', 'L.E.C1', 'La diversidad de lenguas y su uso en la comunicación familiar, escolar y comunitaria', 1),
(len_id, 'Español', 'L.E.C2', 'La diversidad étnica, cultural y lingüística de México a favor de una sociedad intercultural', 2),
(len_id, 'Español', 'L.E.C3', 'Las lenguas como manifestación de la identidad y del sentido de pertenencia', 3),
(len_id, 'Español', 'L.E.C4', 'El dinamismo de las lenguas y su relevancia como patrimonio cultural', 4),
(len_id, 'Español', 'L.E.C5', 'La función creativa del español en la expresión de necesidades e intereses comunitarios', 5),
(len_id, 'Español', 'L.E.C6', 'Los elementos y los recursos estéticos de la lengua española en la literatura oral y escrita', 6),
(len_id, 'Español', 'L.E.C7', 'Textos literarios escritos en español o traducidos', 7),
(len_id, 'Español', 'L.E.C8', 'Creaciones literarias tradicionales y contemporáneas', 8),
(len_id, 'Español', 'L.E.C9', 'Recursos literarios en lengua española para expresar sensaciones, emociones, sentimientos e ideas', 9),
(len_id, 'Español', 'L.E.C10', 'Los géneros periodísticos y sus recursos para comunicar sucesos significativos', 10),
(len_id, 'Español', 'L.E.C11', 'Comunicación asertiva y dialógica para erradicar expresiones de violencia', 11),
(len_id, 'Español', 'L.E.C12', 'Mensajes para promover una vida saludable expresados en medios de comunicación', 12),
(len_id, 'Español', 'L.E.C13', 'Textos de divulgación científica', 13),
(len_id, 'Español', 'L.E.C14', 'Manifestaciones culturales y artísticas que favorecen una sociedad incluyente', 14);

-- ============================================================================
-- LENGUAJES → INGLÉS
-- ============================================================================

INSERT INTO nem_contenidos (campo_formativo_id, materia, codigo, nombre, orden) VALUES
(len_id, 'Inglés', 'L.I.C1', 'La diversidad lingüística y sus formas de expresión en México y el mundo', 1),
(len_id, 'Inglés', 'L.I.C2', 'La identidad y cultura de pueblos de habla inglesa', 2),
(len_id, 'Inglés', 'L.I.C3', 'Las manifestaciones culturales, lingüísticas y artísticas en inglés a favor de la interculturalidad', 3),
(len_id, 'Inglés', 'L.I.C4', 'Uso de diversos textos en inglés que promueven la preservación y conservación de las lenguas', 4),
(len_id, 'Inglés', 'L.I.C5', 'El uso del inglés para expresar necesidades, intereses y problemas de la comunidad', 5),
(len_id, 'Inglés', 'L.I.C6', 'Elementos y recursos estéticos del inglés', 6),
(len_id, 'Inglés', 'L.I.C7', 'Manifestaciones artísticas y culturales del inglés', 7),
(len_id, 'Inglés', 'L.I.C8', 'Creaciones literarias tradicionales y contemporáneas en inglés', 8),
(len_id, 'Inglés', 'L.I.C9', 'El inglés para expresar sensaciones, emociones, sentimientos e ideas', 9),
(len_id, 'Inglés', 'L.I.C10', 'Relatos en inglés para expresar sucesos significativos', 10),
(len_id, 'Inglés', 'L.I.C11', 'Comunicación asertiva y dialógica en inglés para erradicar expresiones de violencia', 11),
(len_id, 'Inglés', 'L.I.C12', 'Mensajes en inglés que promueven una vida saludable', 12),
(len_id, 'Inglés', 'L.I.C13', 'El uso del inglés en la construcción de mensajes a favor de la inclusión', 13),
(len_id, 'Inglés', 'L.I.C14', 'El uso del inglés en manifestaciones culturales y artísticas que favorecen la inclusión', 14);

-- ============================================================================
-- LENGUAJES → ARTES
-- ============================================================================

INSERT INTO nem_contenidos (campo_formativo_id, materia, codigo, nombre, orden) VALUES
(len_id, 'Artes', 'L.A.C1', 'Diversidad de lenguajes artísticos en la riqueza pluricultural de México y del mundo', 1),
(len_id, 'Artes', 'L.A.C2', 'Manifestaciones culturales y artísticas que conforman la diversidad étnica, cultural y lingüística', 2),
(len_id, 'Artes', 'L.A.C3', 'Identidad y sentido de pertenencia en manifestaciones artísticas', 3),
(len_id, 'Artes', 'L.A.C4', 'Patrimonio cultural de la comunidad en manifestaciones artísticas', 4),
(len_id, 'Artes', 'L.A.C5', 'Los lenguajes artísticos en la expresión de problemas de la comunidad', 5),
(len_id, 'Artes', 'L.A.C6', 'Elementos de las artes y recursos estéticos', 6),
(len_id, 'Artes', 'L.A.C7', 'Valor estético de la naturaleza, vida cotidiana y manifestaciones culturales', 7),
(len_id, 'Artes', 'L.A.C8', 'Creaciones artísticas que tienen su origen en textos literarios', 8),
(len_id, 'Artes', 'L.A.C9', 'Expresión artística de sensaciones, emociones, sentimientos e ideas', 9),
(len_id, 'Artes', 'L.A.C10', 'Memoria colectiva representada por medios artísticos', 10),
(len_id, 'Artes', 'L.A.C11', 'Procesos creativos que ponen en práctica la comunicación dialógica', 11),
(len_id, 'Artes', 'L.A.C12', 'Vida saludable expresada a través de mensajes construidos con elementos de las artes', 12),
(len_id, 'Artes', 'L.A.C13', 'Sistemas alternativos y aumentativos de comunicación como herramientas creativas', 13),
(len_id, 'Artes', 'L.A.C14', 'Manifestaciones artísticas que emplean sistemas alternativos y aumentativos', 14);

-- ============================================================================
-- SABERES → MATEMÁTICAS
-- ============================================================================

INSERT INTO nem_contenidos (campo_formativo_id, materia, codigo, nombre, orden) VALUES
(sab_id, 'Matemáticas', 'S.M.C1', 'Expresión de fracciones como decimales y decimales como fracciones', 1),
(sab_id, 'Matemáticas', 'S.M.C2', 'Extensión de los números a positivos y negativos y su orden', 2),
(sab_id, 'Matemáticas', 'S.M.C3', 'Extensión del significado de las operaciones y sus relaciones inversas', 3),
(sab_id, 'Matemáticas', 'S.M.C4', 'Regularidades y patrones', 4),
(sab_id, 'Matemáticas', 'S.M.C5', 'Introducción al álgebra', 5),
(sab_id, 'Matemáticas', 'S.M.C6', 'Ecuaciones lineales y cuadráticas', 6),
(sab_id, 'Matemáticas', 'S.M.C7', 'Funciones', 7),
(sab_id, 'Matemáticas', 'S.M.C8', 'Rectas y ángulos', 8),
(sab_id, 'Matemáticas', 'S.M.C9', 'Construcción y propiedades de las figuras planas y cuerpos', 9),
(sab_id, 'Matemáticas', 'S.M.C10', 'Circunferencia, círculo y esfera', 10),
(sab_id, 'Matemáticas', 'S.M.C11', 'Medición y cálculo en diferentes contextos', 11),
(sab_id, 'Matemáticas', 'S.M.C12', 'Obtención y representación de información', 12),
(sab_id, 'Matemáticas', 'S.M.C13', 'Interpretación de la información a través de medidas de tendencia central y dispersión', 13),
(sab_id, 'Matemáticas', 'S.M.C14', 'Azar y probabilidad', 14);

-- ============================================================================
-- SABERES → BIOLOGÍA
-- ============================================================================

INSERT INTO nem_contenidos (campo_formativo_id, materia, codigo, nombre, orden) VALUES
(sab_id, 'Biología', 'S.B.C1', 'Funcionamiento del cuerpo humano coordinado por los sistemas nervioso y endocrino', 1),
(sab_id, 'Biología', 'S.B.C2', 'Salud sexual y reproductiva: prevención de infecciones y del embarazo en adolescentes', 2),
(sab_id, 'Biología', 'S.B.C3', 'Prevención de enfermedades relacionadas con la alimentación y alimentos ultraprocesados', 3),
(sab_id, 'Biología', 'S.B.C4', 'Diversidad de saberes e intercambio de conocimientos acerca de los seres vivos', 4),
(sab_id, 'Biología', 'S.B.C5', 'Procesos vitales de los seres vivos: nutrición, relación con el medio y reproducción', 5),
(sab_id, 'Biología', 'S.B.C6', 'La biodiversidad como expresión del cambio de los seres vivos en el tiempo', 6),
(sab_id, 'Biología', 'S.B.C7', 'El calentamiento global como consecuencia de la alteración de los ciclos biogeoquímicos', 7),
(sab_id, 'Biología', 'S.B.C8', 'Importancia del microscopio para el conocimiento de la unidad y diversidad de los seres vivos', 8),
(sab_id, 'Biología', 'S.B.C9', 'Las vacunas: su relevancia en el control de algunas enfermedades infecciosas', 9);

-- ============================================================================
-- SABERES → FÍSICA
-- ============================================================================

INSERT INTO nem_contenidos (campo_formativo_id, materia, codigo, nombre, orden) VALUES
(sab_id, 'Física', 'S.F.C1', 'El pensamiento científico, una forma de plantear y solucionar problemas', 1),
(sab_id, 'Física', 'S.F.C2', 'Unidades y medidas utilizadas en Física', 2),
(sab_id, 'Física', 'S.F.C3', 'Estructura, propiedades y características de la materia', 3),
(sab_id, 'Física', 'S.F.C4', 'Estados de agregación de la materia', 4),
(sab_id, 'Física', 'S.F.C5', 'Interacciones en fenómenos relacionados con la fuerza y el movimiento', 5),
(sab_id, 'Física', 'S.F.C6', 'Principios de Pascal y de Arquímedes', 6),
(sab_id, 'Física', 'S.F.C7', 'Saberes y prácticas para aprovechamiento de energías y la sostenibilidad', 7),
(sab_id, 'Física', 'S.F.C8', 'Interacciones de la electricidad y el magnetismo', 8),
(sab_id, 'Física', 'S.F.C9', 'Composición del Universo y Sistema Solar', 9),
(sab_id, 'Física', 'S.F.C10', 'Fenómenos, procesos y factores asociados al cambio climático', 10);

-- ============================================================================
-- SABERES → QUÍMICA
-- ============================================================================

INSERT INTO nem_contenidos (campo_formativo_id, materia, codigo, nombre, orden) VALUES
(sab_id, 'Química', 'S.Q.C1', 'Los hitos que contribuyeron al avance del conocimiento científico y tecnológico', 1),
(sab_id, 'Química', 'S.Q.C2', 'Las propiedades extensivas e intensivas como forma de identificar sustancias', 2),
(sab_id, 'Química', 'S.Q.C3', 'Composición de las mezclas y métodos de separación', 3),
(sab_id, 'Química', 'S.Q.C4', 'Importancia de la concentración de sustancias en mezclas de productos de uso cotidiano', 4),
(sab_id, 'Química', 'S.Q.C5', 'Presencia de contaminantes y su concentración relacionada con la degradación ambiental', 5),
(sab_id, 'Química', 'S.Q.C6', 'Mezclas, compuestos y elementos representados con el modelo corpuscular de la materia', 6),
(sab_id, 'Química', 'S.Q.C7', 'La tabla periódica: criterios de clasificación de los elementos químicos', 7),
(sab_id, 'Química', 'S.Q.C8', 'Los compuestos iónicos y moleculares: propiedades y estructura', 8),
(sab_id, 'Química', 'S.Q.C9', 'Los alimentos como fuente de energía química: carbohidratos, proteínas y lípidos', 9),
(sab_id, 'Química', 'S.Q.C10', 'Las reacciones químicas: manifestaciones, transformaciones y representaciones', 10),
(sab_id, 'Química', 'S.Q.C11', 'Propiedades de ácidos y bases, reacciones de neutralización y modelo de Arrhenius', 11),
(sab_id, 'Química', 'S.Q.C12', 'Las reacciones de óxido-reducción: identificación del número de oxidación', 12);

-- ============================================================================
-- ÉTICA → GEOGRAFÍA
-- ============================================================================

INSERT INTO nem_contenidos (campo_formativo_id, materia, codigo, nombre, orden) VALUES
(eti_id, 'Geografía', 'E.G.C1', 'El espacio geográfico como una construcción social y colectiva', 1),
(eti_id, 'Geografía', 'E.G.C2', 'Las categorías de análisis espacial y representaciones del espacio geográfico', 2),
(eti_id, 'Geografía', 'E.G.C3', 'La distribución y dinámica de las aguas continentales y oceánicas en la Tierra', 3),
(eti_id, 'Geografía', 'E.G.C4', 'La relación de las placas tectónicas con el relieve, sismicidad y vulcanismo', 4),
(eti_id, 'Geografía', 'E.G.C5', 'Los riesgos de desastre, su relación con los procesos naturales y la vulnerabilidad', 5),
(eti_id, 'Geografía', 'E.G.C6', 'Crecimiento, distribución, composición y migración de la población', 6),
(eti_id, 'Geografía', 'E.G.C7', 'Los procesos productivos y sus consecuencias ambientales y sociales', 7),
(eti_id, 'Geografía', 'E.G.C8', 'Prácticas de producción, distribución y consumo sustentables', 8),
(eti_id, 'Geografía', 'E.G.C9', 'Las desigualdades socioeconómicas y sus efectos en la calidad de vida', 9),
(eti_id, 'Geografía', 'E.G.C10', 'Los conflictos territoriales actuales y sus implicaciones ambientales y sociales', 10),
(eti_id, 'Geografía', 'E.G.C11', 'Los retos sociales y ambientales en la comunidad, México y el mundo', 11),
(eti_id, 'Geografía', 'E.G.C12', 'La diversidad de grupos sociales y culturales en México', 12),
(eti_id, 'Geografía', 'E.G.C13', 'El suelo, recurso estratégico para la seguridad alimentaria y la vida en el planeta', 13),
(eti_id, 'Geografía', 'E.G.C14', 'El reto del cambio climático', 14);

-- ============================================================================
-- ÉTICA → HISTORIA
-- ============================================================================

INSERT INTO nem_contenidos (campo_formativo_id, materia, codigo, nombre, orden) VALUES
(eti_id, 'Historia', 'E.H.C1', 'Los albores de la humanidad: los pueblos antiguos del mundo y su devenir', 1),
(eti_id, 'Historia', 'E.H.C2', 'La conformación de las metrópolis y los sistemas de dominación', 2),
(eti_id, 'Historia', 'E.H.C3', 'Las gestas de resistencia y los movimientos independentistas', 3),
(eti_id, 'Historia', 'E.H.C4', 'Las revoluciones modernas y sus tendencias', 4),
(eti_id, 'Historia', 'E.H.C5', 'Las tensiones en el Siglo XX', 5),
(eti_id, 'Historia', 'E.H.C6', 'La construcción histórica de las ideas sobre las juventudes e infancias', 6),
(eti_id, 'Historia', 'E.H.C7', 'Las mujeres y sus historias', 7),
(eti_id, 'Historia', 'E.H.C8', 'Las luchas de las mujeres por sus derechos', 8),
(eti_id, 'Historia', 'E.H.C9', 'Relaciones de poder y lucha por los derechos de grupos históricamente discriminados', 9),
(eti_id, 'Historia', 'E.H.C10', 'Discriminación, racismo, sexismo y prejuicios como construcciones históricas', 10),
(eti_id, 'Historia', 'E.H.C11', 'Movilidades humanas, migraciones y nuevos escenarios para la vida', 11),
(eti_id, 'Historia', 'E.H.C12', 'Amor, amistad, familias y relaciones entre las personas en la historia', 12);

-- ============================================================================
-- ÉTICA → FORMACIÓN CÍVICA Y ÉTICA
-- ============================================================================

INSERT INTO nem_contenidos (campo_formativo_id, materia, codigo, nombre, orden) VALUES
(eti_id, 'Formación Cívica y Ética', 'E.FCYE.C1', 'Grupos sociales y culturales en la conformación de las identidades juveniles', 1),
(eti_id, 'Formación Cívica y Ética', 'E.FCYE.C2', 'Los derechos humanos en México y en el mundo como valores compartidos', 2),
(eti_id, 'Formación Cívica y Ética', 'E.FCYE.C3', 'Movimientos sociales y políticos por los derechos humanos', 3),
(eti_id, 'Formación Cívica y Ética', 'E.FCYE.C4', 'Consecuencias de la desigualdad en la calidad de vida de las personas y comunidades', 4),
(eti_id, 'Formación Cívica y Ética', 'E.FCYE.C5', 'Normas, leyes, instituciones y organizaciones encargadas de proteger los derechos humanos', 5),
(eti_id, 'Formación Cívica y Ética', 'E.FCYE.C6', 'El conflicto en la convivencia humana desde la cultura de paz', 6),
(eti_id, 'Formación Cívica y Ética', 'E.FCYE.C7', 'La cultura de paz y la creación de ambientes que garanticen el respeto a la dignidad', 7),
(eti_id, 'Formación Cívica y Ética', 'E.FCYE.C8', 'Personas, grupos y organizaciones a favor de la cultura de paz', 8),
(eti_id, 'Formación Cívica y Ética', 'E.FCYE.C9', 'Principios éticos como referentes para un desarrollo sustentable', 9),
(eti_id, 'Formación Cívica y Ética', 'E.FCYE.C10', 'Igualdad sustantiva en el marco de la interculturalidad, inclusión y perspectiva de género', 10),
(eti_id, 'Formación Cívica y Ética', 'E.FCYE.C11', 'Medidas de protección y mecanismos de denuncia en el rechazo a la violencia', 11),
(eti_id, 'Formación Cívica y Ética', 'E.FCYE.C12', 'Principios y valores de la cultura democrática como forma de gobierno y de vida', 12),
(eti_id, 'Formación Cívica y Ética', 'E.FCYE.C13', 'Proyectos como recurso para atender problemáticas de la comunidad', 13),
(eti_id, 'Formación Cívica y Ética', 'E.FCYE.C14', 'Instituciones, organizaciones y mecanismos de representación democrática', 14),
(eti_id, 'Formación Cívica y Ética', 'E.FCYE.C15', 'Defensa del derecho al acceso a la protección de datos personales', 15),
(eti_id, 'Formación Cívica y Ética', 'E.FCYE.C16', 'El derecho a la salud y la prevención en el consumo de drogas', 16);

-- ============================================================================
-- HUMANO → TECNOLOGÍA
-- ============================================================================

INSERT INTO nem_contenidos (campo_formativo_id, materia, codigo, nombre, orden) VALUES
(hum_id, 'Tecnología', 'H.TEC.C1', 'Herramientas, máquinas e instrumentos como extensión corporal', 1),
(hum_id, 'Tecnología', 'H.TEC.C2', 'Materiales, procesos técnicos y comunidad', 2),
(hum_id, 'Tecnología', 'H.TEC.C3', 'Usos e implicaciones de la energía en los procesos técnicos', 3),
(hum_id, 'Tecnología', 'H.TEC.C4', 'Factores que inciden en los procesos técnicos', 4),
(hum_id, 'Tecnología', 'H.TEC.C5', 'Procesos técnicos', 5),
(hum_id, 'Tecnología', 'H.TEC.C6', 'Comunicación y representación técnica', 6),
(hum_id, 'Tecnología', 'H.TEC.C7', 'Pensamiento estratégico y creativo en la resolución de problemas', 7),
(hum_id, 'Tecnología', 'H.TEC.C8', 'Evaluación de sistemas tecnológicos', 8);

-- ============================================================================
-- HUMANO → EDUCACIÓN SOCIOEMOCIONAL / TUTORÍA
-- ============================================================================

INSERT INTO nem_contenidos (campo_formativo_id, materia, codigo, nombre, orden) VALUES
(hum_id, 'Educación Socioemocional', 'H.ESE.C1', 'Formas de ser, pensar, actuar y relacionarse', 1),
(hum_id, 'Educación Socioemocional', 'H.ESE.C2', 'Los sentimientos y su influencia en la toma de decisiones', 2),
(hum_id, 'Educación Socioemocional', 'H.ESE.C3', 'Construcción del proyecto de vida', 3),
(hum_id, 'Educación Socioemocional', 'H.ESE.C4', 'Prevención de situaciones de riesgo', 4),
(hum_id, 'Educación Socioemocional', 'H.ESE.C5', 'Educación integral en sexualidad', 5);

-- ============================================================================
-- HUMANO → EDUCACIÓN FÍSICA
-- ============================================================================

INSERT INTO nem_contenidos (campo_formativo_id, materia, codigo, nombre, orden) VALUES
(hum_id, 'Educación Física', 'H.EF.C1', 'Capacidades, habilidades y destrezas motrices', 1),
(hum_id, 'Educación Física', 'H.EF.C2', 'Potencialidades cognitivas, expresivas, motrices, creativas y de relación', 2),
(hum_id, 'Educación Física', 'H.EF.C3', 'Estilos de vida activos y saludables', 3),
(hum_id, 'Educación Física', 'H.EF.C4', 'Pensamiento lúdico, estratégico y creativo', 4);

END $$;

-- ============================================================================
-- VERIFICACIÓN
-- ============================================================================

SELECT 
    'Campos Formativos' as tabla, 
    COUNT(*) as registros 
FROM nem_campos_formativos
UNION ALL
SELECT 
    'Contenidos', 
    COUNT(*) 
FROM nem_contenidos
UNION ALL
SELECT 
    'Por Materia: ' || materia, 
    COUNT(*) 
FROM nem_contenidos 
GROUP BY materia
ORDER BY tabla;

-- ============================================================================
-- FIN DEL CATÁLOGO
-- ============================================================================
