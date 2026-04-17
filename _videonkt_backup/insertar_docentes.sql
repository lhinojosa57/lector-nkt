-- ============================================================================
-- VIDEONKT - DOCENTES AUTORIZADOS
-- Emails de docentes del Colegio Nikola Tesla
-- ============================================================================

-- Insertar emails de docentes autorizados
INSERT INTO teachers (email) VALUES
('lhinojosa@nikolatesla.edu.mx'),
('iflores@nikolatesla.edu.mx'),
('aflores@nikolatesla.edu.mx'),
('jsamano@nikolatesla.edu.mx')
ON CONFLICT (email) DO NOTHING;

-- Verificar docentes insertados
SELECT * FROM teachers ORDER BY email;

-- ============================================================================
-- NOTA: Para agregar más docentes en el futuro
-- ============================================================================
-- INSERT INTO teachers (email) VALUES ('nuevo.docente@nikolatesla.edu.mx')
-- ON CONFLICT (email) DO NOTHING;
